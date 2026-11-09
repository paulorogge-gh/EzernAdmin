import { Op } from 'sequelize';
import {
  BillingCharge,
  BillingContract,
  BillingService,
  FinanceTransaction,
  OrganizationProfile,
  SimplesTaxLedger,
  SimplesTaxPeriod,
} from '../models/index.js';
import {
  computeFatorR,
  estimateTax,
} from '../lib/simplesNacionalTables.js';
import { todayDateOnly } from '../lib/financeDates.js';
import { ensureOrganizationProfile } from './organizationProfileService.js';

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export function competenceFromDate(dateLike) {
  const raw = String(dateLike || todayDateOnly()).slice(0, 10);
  return raw.slice(0, 7);
}

export function dasDueDateForCompetence(competence) {
  const [year, month] = String(competence).split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-20`;
}

function previousCompetenceMonths(competence, count = 12) {
  const [y, m] = String(competence).split('-').map(Number);
  const months = [];
  let year = y;
  let month = m;
  for (let i = 0; i < count; i += 1) {
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    months.push(`${year}-${String(month).padStart(2, '0')}`);
  }
  return months;
}

export async function computeRbt12(organizationId, competence) {
  const profile = await ensureOrganizationProfile(organizationId);
  const months = previousCompetenceMonths(competence, 12);
  const ledgerSum = await SimplesTaxLedger.sum('baseAmount', {
    where: {
      organizationId,
      status: 'active',
      competence: { [Op.in]: months },
    },
  });
  let adjustments = 0;
  const list = Array.isArray(profile.revenueAdjustments) ? profile.revenueAdjustments : [];
  for (const item of list) {
    if (months.includes(item?.competence)) {
      adjustments += Number(item.amount || 0);
    }
  }
  return Math.round((Number(ledgerSum || 0) + adjustments) * 100) / 100;
}

export async function recordAuthorizedInvoiceTax(organizationId, chargeId) {
  const charge = await BillingCharge.findOne({
    where: { id: chargeId, organizationId },
  });
  if (!charge) throw httpError('Cobrança não encontrada', 404);
  if (charge.nfStatus !== 'authorized') return null;

  const existing = await SimplesTaxLedger.findOne({
    where: { organizationId, chargeId, status: 'active' },
  });
  if (existing) return existing.toSafeJSON();

  const contract = await BillingContract.findByPk(charge.contractId);
  const service = contract
    ? await BillingService.findByPk(contract.fiscalServiceId)
    : null;
  const profile = await ensureOrganizationProfile(organizationId);
  const competence =
    charge.competence ||
    competenceFromDate(charge.nfAuthorizedAt || charge.paidAt || charge.dueDate);
  const rbt12 = await computeRbt12(organizationId, competence);
  const fatorR = computeFatorR(profile.payroll12m, rbt12);
  const estimated = estimateTax({
    base: charge.amount,
    anexo: service?.simplesAnexo || profile.simplesAnexoDefault || 'V',
    rbt12,
    fatorREligible: service?.fatorREligible !== false,
    fatorR,
  });

  const row = await SimplesTaxLedger.create({
    organizationId,
    chargeId,
    asaasInvoiceId: charge.asaasInvoiceId,
    competence,
    baseAmount: charge.amount,
    baseAnexo: service?.simplesAnexo || profile.simplesAnexoDefault || 'V',
    effectiveAnexo: estimated.effectiveAnexo,
    rbt12,
    fatorR,
    effectiveAliquot: estimated.effectiveAliquot,
    taxAmount: estimated.taxAmount,
    status: 'active',
  });

  await ensureOpenPeriod(organizationId, competence);
  return row.toSafeJSON();
}

export async function ensureOpenPeriod(organizationId, competence) {
  const [period] = await SimplesTaxPeriod.findOrCreate({
    where: { organizationId, competence },
    defaults: {
      organizationId,
      competence,
      status: 'open',
      dueDate: dasDueDateForCompetence(competence),
    },
  });
  return period;
}

export async function listTaxPeriods(organizationId) {
  const rows = await SimplesTaxPeriod.findAll({
    where: { organizationId },
    order: [['competence', 'DESC']],
    limit: 36,
  });
  return rows.map((row) => row.toSafeJSON());
}

export async function listTaxLedger(organizationId, competence) {
  const where = { organizationId, status: 'active' };
  if (competence) where.competence = competence;
  const rows = await SimplesTaxLedger.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: 500,
  });
  return rows.map((row) => row.toSafeJSON());
}

export async function closeTaxPeriod(organizationId, competence) {
  const profile = await ensureOrganizationProfile(organizationId);
  const period = await ensureOpenPeriod(organizationId, competence);
  if (period.status === 'closed' && period.financePayableId) {
    return period.toSafeJSON();
  }

  const rows = await SimplesTaxLedger.findAll({
    where: { organizationId, competence, status: 'active' },
  });
  const totalBase = rows.reduce((sum, row) => sum + Number(row.baseAmount || 0), 0);
  const totalTax = rows.reduce((sum, row) => sum + Number(row.taxAmount || 0), 0);
  const rbt12 = await computeRbt12(organizationId, competence);
  const fatorR = computeFatorR(profile.payroll12m, rbt12);
  const dueDate = dasDueDateForCompetence(competence);

  period.rbt12 = rbt12;
  period.fatorR = fatorR;
  period.payroll12m = profile.payroll12m;
  period.totalBase = Math.round(totalBase * 100) / 100;
  period.totalTax = Math.round(totalTax * 100) / 100;
  period.dueDate = dueDate;

  if (period.totalTax > 0) {
    if (period.financePayableId) {
      const tx = await FinanceTransaction.findByPk(period.financePayableId);
      if (tx && tx.status === 'pendente') {
        tx.amount = period.totalTax;
        tx.dueDate = dueDate;
        tx.description = `DAS Simples Nacional ${competence}`;
        await tx.save();
      }
    } else {
      if (!profile.defaultAccountId || !profile.defaultTaxCategoryId || !profile.defaultCostCenterId) {
        throw httpError(
          'Configure conta, categoria de impostos e centro de custo padrão para gerar o DAS',
        );
      }
      const tx = await FinanceTransaction.create({
        organizationId,
        type: 'despesa',
        description: `DAS Simples Nacional ${competence}`,
        amount: period.totalTax,
        dueDate,
        status: 'pendente',
        modality: 'unico',
        accountId: profile.defaultAccountId,
        categoryId: profile.defaultTaxCategoryId,
        costCenterId: profile.defaultCostCenterId,
        partyId: null,
        notes: `Provisão automática RBT12 ${rbt12} · Fator R ${(fatorR * 100).toFixed(2)}%`,
      });
      period.financePayableId = tx.id;
    }
  }

  period.status = 'closed';
  period.closedAt = new Date();
  await period.save();
  return period.toSafeJSON();
}

export async function taxPreview(organizationId) {
  const profile = await ensureOrganizationProfile(organizationId);
  const competence = competenceFromDate(todayDateOnly());
  const rbt12 = await computeRbt12(organizationId, competence);
  const fatorR = computeFatorR(profile.payroll12m, rbt12);
  return {
    competence,
    rbt12,
    fatorR,
    payroll12m: Number(profile.payroll12m || 0),
    dasDueDate: dasDueDateForCompetence(competence),
  };
}
