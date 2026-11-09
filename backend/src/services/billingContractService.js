import { Op } from 'sequelize';
import {
  BillingCharge,
  BillingChargeItem,
  BillingContract,
  BillingContractItem,
  BillingService,
  FinanceTransaction,
  Party,
} from '../models/index.js';
import { normalizeBillingContacts } from '../lib/billingContacts.js';
import { todayDateOnly, toDateOnly } from '../lib/financeDates.js';
import { asaasRequest, mapPartyToAsaasCustomer } from './asaasClient.js';
import { ensureOrganizationProfile } from './organizationProfileService.js';
import { competenceFromDate } from './simplesTaxService.js';

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const CONTRACT_INCLUDE = [
  { model: BillingContractItem, as: 'items' },
  { model: Party, as: 'party' },
  { model: BillingService, as: 'fiscalService' },
];

function sumItems(items) {
  const total = items.reduce(
    (sum, item) => sum + Number(item.amount || 0) * Number(item.quantity || 1),
    0,
  );
  return Math.round(total * 100) / 100;
}

function normalizeItems(rawItems = []) {
  if (!Array.isArray(rawItems) || !rawItems.length) {
    throw httpError('Informe ao menos um item na fatura');
  }
  return rawItems.map((item, index) => {
    const description = String(item.description || '').trim();
    if (!description) throw httpError('Informe a descrição de cada item');
    const quantity = Number(item.quantity ?? 1);
    const amount = Number(item.amount ?? 0);
    if (!Number.isFinite(quantity) || quantity <= 0) throw httpError('Quantidade inválida');
    if (!Number.isFinite(amount) || amount < 0) throw httpError('Valor de item inválido');
    const passThrough = Boolean(item.passThrough) || item.itemType === 'reembolso';
    const costAmount = Number(item.costAmount ?? 0);
    if (passThrough && (!Number.isFinite(costAmount) || costAmount < 0)) {
      throw httpError('Custo do reembolso inválido');
    }
    return {
      itemType: ['servico', 'reembolso', 'taxa', 'outro'].includes(item.itemType)
        ? item.itemType
        : 'servico',
      description,
      quantity,
      amount,
      costAmount: passThrough ? costAmount : 0,
      supplierPartyId: passThrough ? item.supplierPartyId || null : null,
      passThrough,
      passThroughFrequency: item.passThroughFrequency === 'once' ? 'once' : 'each_cycle',
      sortOrder: index,
    };
  });
}

async function replaceItems(organizationId, contractId, items) {
  await BillingContractItem.destroy({ where: { organizationId, contractId } });
  if (!items.length) return [];
  return BillingContractItem.bulkCreate(
    items.map((item) => ({ ...item, organizationId, contractId })),
  );
}

export async function listContracts(organizationId, query = {}) {
  const where = { organizationId };
  if (query.status) where.status = query.status;
  if (query.partyId) where.partyId = query.partyId;
  const rows = await BillingContract.findAll({
    where,
    include: CONTRACT_INCLUDE,
    order: [['updatedAt', 'DESC']],
    limit: 200,
  });
  return rows.map((row) => row.toSafeJSON());
}

export async function getContract(organizationId, id) {
  const row = await BillingContract.findOne({
    where: { id, organizationId },
    include: CONTRACT_INCLUDE,
  });
  if (!row) throw httpError('Contrato não encontrado', 404);
  return row.toSafeJSON();
}

export async function createContract(organizationId, body = {}) {
  await ensureOrganizationProfile(organizationId);
  const party = await Party.findOne({ where: { id: body.partyId, organizationId } });
  if (!party || !party.isCustomer) throw httpError('Selecione um cliente válido');
  const service = await BillingService.findOne({
    where: { id: body.fiscalServiceId, organizationId, status: 'ativo' },
  });
  if (!service) throw httpError('Selecione o serviço fiscal do contrato');

  const kind = body.kind === 'one_shot' ? 'one_shot' : 'recurring';
  const cycle =
    kind === 'recurring'
      ? ['WEEKLY', 'MONTHLY', 'YEARLY'].includes(body.cycle)
        ? body.cycle
        : 'MONTHLY'
      : null;
  const items = normalizeItems(body.items);
  const totalAmount = sumItems(items);

  const row = await BillingContract.create({
    organizationId,
    partyId: party.id,
    fiscalServiceId: service.id,
    kind,
    cycle,
    nextDueDate: body.nextDueDate ? toDateOnly(body.nextDueDate) : todayDateOnly(),
    status: 'draft',
    nfDescription:
      String(body.nfDescription || '').trim() ||
      service.nfDescription ||
      'Serviços de suporte técnico',
    emitNfse: body.emitNfse !== false,
    totalAmount,
    notes: String(body.notes || '').trim() || null,
  });
  await replaceItems(organizationId, row.id, items);
  return getContract(organizationId, row.id);
}

export async function updateContract(organizationId, id, body = {}) {
  const row = await BillingContract.findOne({ where: { id, organizationId } });
  if (!row) throw httpError('Contrato não encontrado', 404);
  if (row.status === 'cancelled') throw httpError('Contrato cancelado');

  if (body.fiscalServiceId) {
    const service = await BillingService.findOne({
      where: { id: body.fiscalServiceId, organizationId, status: 'ativo' },
    });
    if (!service) throw httpError('Serviço fiscal inválido');
    row.fiscalServiceId = service.id;
  }
  if (body.cycle && row.kind === 'recurring') {
    if (!['WEEKLY', 'MONTHLY', 'YEARLY'].includes(body.cycle)) {
      throw httpError('Periodicidade inválida');
    }
    row.cycle = body.cycle;
  }
  if (body.nextDueDate) row.nextDueDate = toDateOnly(body.nextDueDate);
  if (body.nfDescription !== undefined) {
    row.nfDescription = String(body.nfDescription || '').trim() || null;
  }
  if (body.emitNfse !== undefined) row.emitNfse = Boolean(body.emitNfse);
  if (body.notes !== undefined) row.notes = String(body.notes || '').trim() || null;

  if (body.items) {
    const items = normalizeItems(body.items);
    row.totalAmount = sumItems(items);
    await replaceItems(organizationId, row.id, items);
  }

  await row.save();

  if (row.status === 'active' && row.asaasSubscriptionId && body.items) {
    await asaasRequest(organizationId, 'PUT', `/subscriptions/${row.asaasSubscriptionId}`, {
      value: Number(row.totalAmount),
      cycle: row.cycle,
      nextDueDate: row.nextDueDate,
      description: row.nfDescription,
      updatePendingPayments: true,
    });
  }

  return getContract(organizationId, row.id);
}

function assertActivationGates(profile, party, contract, items) {
  if (!profile.asaasApiKey) throw httpError('Configure a API key do Asaas');
  if (!party.document) throw httpError('Cliente sem CPF/CNPJ');
  if (!party.addressStreet || !party.addressZip || !party.addressCity) {
    throw httpError('Cliente precisa de endereço completo para boleto/NF');
  }
  const contacts = normalizeBillingContacts(party.billingContacts, {
    legacyName: party.billingContactName,
    legacyEmail: party.billingEmail,
  });
  if (!contacts.some((c) => c.email && c.emailActive)) {
    throw httpError('Cliente precisa de e-mail de cobrança ativo');
  }
  if (!items.length) throw httpError('Contrato sem itens');
  if (!contract.fiscalServiceId) throw httpError('Contrato sem serviço fiscal');
  if (Number(contract.totalAmount) <= 0) throw httpError('Valor total deve ser maior que zero');
  if (!profile.defaultAccountId || !profile.defaultReceivableCategoryId || !profile.defaultCostCenterId) {
    throw httpError('Configure conta, categoria de receita e centro de custo padrão');
  }
}

export async function syncAsaasCustomer(organizationId, party) {
  const payload = mapPartyToAsaasCustomer(party, { disableNotifications: true });
  const found = await asaasRequest(
    organizationId,
    'GET',
    `/customers?cpfCnpj=${encodeURIComponent(payload.cpfCnpj)}&limit=1`,
  );
  const existing = found?.data?.[0];
  if (existing?.id) {
    await asaasRequest(organizationId, 'PUT', `/customers/${existing.id}`, payload);
    return existing.id;
  }
  const created = await asaasRequest(organizationId, 'POST', '/customers', payload);
  return created.id;
}

export async function activateContract(organizationId, id) {
  const profile = await ensureOrganizationProfile(organizationId);
  const row = await BillingContract.findOne({
    where: { id, organizationId },
    include: CONTRACT_INCLUDE,
  });
  if (!row) throw httpError('Contrato não encontrado', 404);
  if (row.status === 'active') return row.toSafeJSON();
  if (row.status === 'cancelled') throw httpError('Contrato cancelado');

  const items = row.items || [];
  assertActivationGates(profile, row.party, row, items);

  const customerId = await syncAsaasCustomer(organizationId, row.party);
  row.asaasCustomerId = customerId;

  const service = row.fiscalService;
  const description = row.nfDescription || service?.nfDescription || profile.nfDescriptionDefault;

  if (row.kind === 'recurring') {
    const sub = await asaasRequest(organizationId, 'POST', '/subscriptions', {
      customer: customerId,
      billingType: 'BOLETO',
      value: Number(row.totalAmount),
      nextDueDate: row.nextDueDate || todayDateOnly(),
      cycle: row.cycle || 'MONTHLY',
      description,
      externalReference: row.id,
    });
    row.asaasSubscriptionId = sub.id;

    if (row.emitNfse) {
      const taxes = service?.taxes || profile.nfTaxes || { retainIss: false };
      await asaasRequest(
        organizationId,
        'POST',
        `/subscriptions/${sub.id}/invoiceSettings`,
        {
          municipalServiceId:
            service?.municipalServiceId || profile.nfMunicipalServiceId || undefined,
          municipalServiceCode:
            service?.municipalServiceCode || profile.nfMunicipalServiceCode || undefined,
          municipalServiceName:
            service?.municipalServiceName ||
            profile.nfMunicipalServiceName ||
            description,
          taxes,
          effectiveDatePeriod: 'ON_PAYMENT_CONFIRMATION',
          observations: description,
        },
      );
    }
  } else {
    const payment = await asaasRequest(organizationId, 'POST', '/payments', {
      customer: customerId,
      billingType: 'BOLETO',
      value: Number(row.totalAmount),
      dueDate: row.nextDueDate || todayDateOnly(),
      description,
      externalReference: row.id,
    });
    await upsertChargeFromAsaasPayment(organizationId, payment, row);
  }

  row.status = 'active';
  row.activatedAt = new Date();
  await row.save();
  return getContract(organizationId, row.id);
}

export async function cancelContract(organizationId, id) {
  const row = await BillingContract.findOne({ where: { id, organizationId } });
  if (!row) throw httpError('Contrato não encontrado', 404);
  if (row.asaasSubscriptionId) {
    try {
      await asaasRequest(
        organizationId,
        'DELETE',
        `/subscriptions/${row.asaasSubscriptionId}`,
      );
    } catch {
      /* assinatura pode já estar inativa */
    }
  }
  row.status = 'cancelled';
  row.cancelledAt = new Date();
  await row.save();
  return getContract(organizationId, row.id);
}

export async function listCharges(organizationId, query = {}) {
  const where = { organizationId };
  if (query.status) where.status = query.status;
  if (query.contractId) where.contractId = query.contractId;
  if (query.partyId) where.partyId = query.partyId;
  const rows = await BillingCharge.findAll({
    where,
    include: [
      { model: BillingChargeItem, as: 'items' },
      { model: Party, as: 'party' },
    ],
    order: [['dueDate', 'DESC']],
    limit: 300,
  });
  return rows.map((row) => row.toSafeJSON());
}

export async function getCharge(organizationId, id) {
  const row = await BillingCharge.findOne({
    where: { id, organizationId },
    include: [
      { model: BillingChargeItem, as: 'items' },
      { model: Party, as: 'party' },
    ],
  });
  if (!row) throw httpError('Cobrança não encontrada', 404);
  return row.toSafeJSON();
}

function mapAsaasPaymentStatus(status) {
  const value = String(status || '').toUpperCase();
  if (value === 'RECEIVED' || value === 'RECEIVED_IN_CASH') return 'received';
  if (value === 'CONFIRMED') return 'confirmed';
  if (value === 'OVERDUE') return 'overdue';
  if (value === 'REFUNDED') return 'refunded';
  if (value === 'DELETED') return 'deleted';
  return 'pending';
}

export async function upsertChargeFromAsaasPayment(organizationId, payment, contract) {
  const profile = await ensureOrganizationProfile(organizationId);
  let charge = await BillingCharge.findOne({
    where: { organizationId, asaasPaymentId: payment.id },
  });

  const contractRow =
    contract ||
    (await BillingContract.findOne({
      where: {
        organizationId,
        [Op.or]: [
          { id: payment.externalReference || null },
          { asaasSubscriptionId: payment.subscription || null },
        ],
      },
      include: [{ model: BillingContractItem, as: 'items' }],
    }));

  if (!contractRow) {
    throw httpError('Contrato local não encontrado para a cobrança Asaas', 404);
  }

  const amount = Number(payment.value || contractRow.totalAmount || 0);
  const dueDate = payment.dueDate || contractRow.nextDueDate || todayDateOnly();
  const status = mapAsaasPaymentStatus(payment.status);

  if (!charge) {
    charge = await BillingCharge.create({
      organizationId,
      contractId: contractRow.id,
      partyId: contractRow.partyId,
      dueDate,
      amount,
      status,
      description: payment.description || contractRow.nfDescription,
      asaasPaymentId: payment.id,
      asaasSubscriptionId: payment.subscription || contractRow.asaasSubscriptionId,
      bankSlipUrl: payment.bankSlipUrl || null,
      invoiceUrl: payment.invoiceUrl || null,
      competence: competenceFromDate(dueDate),
    });

    const sourceItems = contractRow.items || [];
    const chargeItems = [];
    for (const item of sourceItems) {
      const created = await BillingChargeItem.create({
        organizationId,
        chargeId: charge.id,
        itemType: item.itemType,
        description: item.description,
        quantity: item.quantity,
        amount: item.amount,
        costAmount: item.costAmount,
        supplierPartyId: item.supplierPartyId,
        passThrough: item.passThrough,
        sortOrder: item.sortOrder,
      });
      chargeItems.push(created);

      if (item.passThrough && Number(item.costAmount) > 0 && profile.defaultPayableCategoryId) {
        const chargeCount = await BillingCharge.count({
          where: { organizationId, contractId: contractRow.id },
        });
        const skipOnce = item.passThroughFrequency === 'once' && chargeCount > 1;
        if (!skipOnce) {
          const payable = await FinanceTransaction.create({
            organizationId,
            type: 'despesa',
            description: `Custo: ${item.description}`,
            amount: Number(item.costAmount),
            dueDate,
            status: 'pendente',
            modality: 'unico',
            accountId: profile.defaultAccountId,
            categoryId: profile.defaultPayableCategoryId,
            costCenterId: profile.defaultCostCenterId,
            partyId: item.supplierPartyId || null,
            notes: `Pass-through contrato ${contractRow.id}`,
          });
          created.financePayableId = payable.id;
          await created.save();
        }
      }
    }

    if (!charge.financeReceivableId && profile.defaultReceivableCategoryId) {
      const receivable = await FinanceTransaction.create({
        organizationId,
        type: 'receita',
        description: charge.description || contractRow.nfDescription || 'Faturamento',
        amount,
        dueDate,
        status: 'pendente',
        modality: 'unico',
        accountId: profile.defaultAccountId,
        categoryId: profile.defaultReceivableCategoryId,
        costCenterId: profile.defaultCostCenterId,
        partyId: contractRow.partyId,
        notes: `Cobrança Asaas ${payment.id}`,
      });
      charge.financeReceivableId = receivable.id;
      await charge.save();
    }
  } else {
    charge.status = status;
    charge.amount = amount;
    charge.dueDate = dueDate;
    charge.bankSlipUrl = payment.bankSlipUrl || charge.bankSlipUrl;
    charge.invoiceUrl = payment.invoiceUrl || charge.invoiceUrl;
    if (payment.confirmedDate || payment.paymentDate) {
      charge.paidAt = payment.paymentDate || payment.confirmedDate;
    }
    await charge.save();
  }

  try {
    const digitable = await asaasRequest(
      organizationId,
      'GET',
      `/payments/${payment.id}/identificationField`,
    );
    if (digitable?.identificationField) {
      charge.identificationField = digitable.identificationField;
      await charge.save();
    }
  } catch {
    /* boleto pode ainda não ter linha digitável */
  }

  return charge;
}

export async function settleChargeReceivable(organizationId, charge) {
  if (!charge.financeReceivableId) return;
  const tx = await FinanceTransaction.findByPk(charge.financeReceivableId);
  if (!tx || tx.status === 'recebido' || tx.status === 'pago') return;
  tx.status = 'recebido';
  tx.paidAt = charge.paidAt || todayDateOnly();
  tx.paidAmount = Number(charge.amount);
  await tx.save();
}
