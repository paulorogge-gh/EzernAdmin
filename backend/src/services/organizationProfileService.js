import { randomBytes } from 'node:crypto';
import { OrganizationProfile } from '../models/OrganizationProfile.js';
import { todayDateOnly } from '../lib/financeDates.js';

const PAULOROGGE_DEFAULTS = {
  legalName: 'PAULOROGGE TECH LTDA',
  tradeName: 'ARFAM SOLUCOES',
  document: '37010664000141',
  phone: '7332810569',
  addressStreet: 'Ruy Barbosa',
  addressNumber: '855',
  addressNeighborhood: 'Centro',
  addressCity: 'Eunapolis',
  addressState: 'BA',
  addressZip: '45820281',
  addressCountry: 'Brasil',
  cnaePrimary: '9511800',
  cnaeSecondary: [
    '4321500',
    '5912099',
    '6190699',
    '6201501',
    '6204000',
    '6311900',
    '7420001',
    '7420002',
    '8230001',
    '8599603',
    '9512600',
  ],
  taxRegime: 'simples_nacional',
  simplesAnexoDefault: 'V',
  nfDescriptionDefault: 'Serviços de suporte técnico',
};

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export async function ensureOrganizationProfile(organizationId) {
  let row = await OrganizationProfile.findOne({ where: { organizationId } });
  if (row) return row;
  row = await OrganizationProfile.create({
    organizationId,
    ...PAULOROGGE_DEFAULTS,
    webhookToken: randomBytes(24).toString('hex'),
  });
  return row;
}

export async function getOrganizationProfile(organizationId) {
  const row = await ensureOrganizationProfile(organizationId);
  return row.toSafeJSON();
}

export async function updateOrganizationProfile(organizationId, body = {}) {
  const row = await ensureOrganizationProfile(organizationId);
  const fields = [
    'legalName',
    'tradeName',
    'document',
    'stateRegistration',
    'municipalInscription',
    'email',
    'phone',
    'addressStreet',
    'addressNumber',
    'addressComplement',
    'addressNeighborhood',
    'addressCity',
    'addressState',
    'addressZip',
    'addressCountry',
    'cnaePrimary',
    'taxRegime',
    'simplesAnexoDefault',
    'asaasEnv',
    'asaasWalletId',
    'nfMunicipalServiceId',
    'nfMunicipalServiceCode',
    'nfMunicipalServiceName',
    'nfDescriptionDefault',
    'defaultAccountId',
    'defaultReceivableCategoryId',
    'defaultPayableCategoryId',
    'defaultTaxCategoryId',
    'defaultCostCenterId',
  ];

  for (const key of fields) {
    if (body[key] !== undefined) row[key] = body[key] || null;
  }

  if (body.cnaeSecondary !== undefined) {
    row.cnaeSecondary = Array.isArray(body.cnaeSecondary) ? body.cnaeSecondary : [];
  }
  if (body.nfTaxes !== undefined) row.nfTaxes = body.nfTaxes || null;
  if (body.revenueAdjustments !== undefined) {
    row.revenueAdjustments = Array.isArray(body.revenueAdjustments)
      ? body.revenueAdjustments
      : [];
  }

  if (body.payroll12m !== undefined) {
    const value = Number(body.payroll12m);
    if (!Number.isFinite(value) || value < 0) throw httpError('Folha 12 meses inválida');
    row.payroll12m = value;
    row.payroll12mUpdatedAt = todayDateOnly();
  }

  if (body.asaasApiKey !== undefined) {
    const key = String(body.asaasApiKey || '').trim();
    if (key) row.asaasApiKey = key;
  }
  if (body.clearAsaasApiKey) row.asaasApiKey = null;

  if (body.rotateWebhookToken) {
    row.webhookToken = randomBytes(24).toString('hex');
  }

  if (row.document) {
    row.document = String(row.document).replace(/\D/g, '');
  }

  await row.save();
  return row.toSafeJSON();
}

export async function getProfileForWebhookToken(token) {
  if (!token) return null;
  return OrganizationProfile.findOne({ where: { webhookToken: token } });
}
