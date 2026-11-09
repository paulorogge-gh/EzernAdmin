/**
 * Espelho da superfície HTTP pública do backend.
 * Manter alinhado com backend/src/config/httpSurface.js
 */
const root = '/g';

function join(base, ...parts) {
  const tail = parts
    .filter((p) => p !== undefined && p !== null && p !== '')
    .map((p) => String(p).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
  if (!tail) return base;
  return `${base}/${tail}`;
}

export const surface = {
  root,
  auth: join(root, 'a'),
  members: join(root, 'm'),
  parties: join(root, 'c'),
  finance: join(root, 'n'),
  billing: join(root, 'f'),
  hooks: join(root, 'h'),
  query: join(root, 'q'),
  blob: join(root, 'b'),
};

/** Endpoints absolutos (a partir da origem do browser). */
export const API = {
  login: join(surface.auth, 'i'),
  refresh: join(surface.auth, 't'),
  logout: join(surface.auth, 'x'),
  me: join(surface.auth, 'p'),
  publicConfig: join(surface.auth, 'c'),
  passwordForgot: join(surface.auth, 'w/f'),
  passwordReset: join(surface.auth, 'w/r'),
  inviteAccept: join(surface.auth, 'v/a'),
  members: surface.members,
  member: (id) => join(surface.members, id),
  memberResend: (id) => join(surface.members, id, 'n'),
  parties: surface.parties,
  party: (id) => join(surface.parties, id),
  partyAttachments: (id) => join(surface.parties, id, 'f'),
  partyAttachment: (partyId, fileId) => join(surface.parties, partyId, 'f', fileId),
  partyAttachmentDownload: (partyId, fileId) =>
    join(surface.parties, partyId, 'f', fileId, 'y'),
  financeAccounts: join(surface.finance, 'a'),
  financeAccount: (id) => join(surface.finance, 'a', id),
  financeCards: join(surface.finance, 'k'),
  financeCard: (id) => join(surface.finance, 'k', id),
  financeCategories: join(surface.finance, 'g'),
  financeCategory: (id) => join(surface.finance, 'g', id),
  financeCostCenters: join(surface.finance, 'o'),
  financeCostCenter: (id) => join(surface.finance, 'o', id),
  financeTransactions: join(surface.finance, 't'),
  financeTransaction: (id) => join(surface.finance, 't', id),
  financeTransactionSettle: (id) => join(surface.finance, 't', id, 's'),
  financeTransactionUnsettle: (id) => join(surface.finance, 't', id, 'u'),
  financeTransactionCancel: (id) => join(surface.finance, 't', id, 'x'),
  financeTransactionAttachments: (id) => join(surface.finance, 't', id, 'f'),
  financeTransactionAttachment: (txId, fileId) =>
    join(surface.finance, 't', txId, 'f', fileId),
  financeTransactionAttachmentDownload: (txId, fileId) =>
    join(surface.finance, 't', txId, 'f', fileId, 'y'),
  financeInvoices: join(surface.finance, 'i'),
  financeInvoice: (id) => join(surface.finance, 'i', id),
  financeInvoicePay: (id) => join(surface.finance, 'i', id, 'p'),
  financeInvoiceUnpay: (id) => join(surface.finance, 'i', id, 'q'),
  financeInvoiceClose: (id) => join(surface.finance, 'i', id, 'c'),
  financeInvoiceReopen: (id) => join(surface.finance, 'i', id, 'r'),
  financeInvoiceMaintain: join(surface.finance, 'i', 'm'),
  orgProfile: join(surface.billing, 'p'),
  asaasMunicipalServices: join(surface.billing, 'p/a/services'),
  asaasFiscalInfo: join(surface.billing, 'p/a/fiscal'),
  billingServices: join(surface.billing, 's'),
  billingService: (id) => join(surface.billing, 's', id),
  billingContracts: join(surface.billing, 'c'),
  billingContract: (id) => join(surface.billing, 'c', id),
  billingContractActivate: (id) => join(surface.billing, 'c', id, 'a'),
  billingContractCancel: (id) => join(surface.billing, 'c', id, 'x'),
  billingCharges: join(surface.billing, 'h'),
  billingCharge: (id) => join(surface.billing, 'h', id),
  billingTaxPeriods: join(surface.billing, 't'),
  billingTaxPreview: join(surface.billing, 't/preview'),
  billingTaxLedger: (competence) => join(surface.billing, 't', competence, 'ledger'),
  billingTaxClose: (competence) => join(surface.billing, 't', competence, 'close'),
  addressLookup: (q) => `${join(surface.query, 'e')}?q=${encodeURIComponent(q)}`,
  placeDetails: (placeId) => join(surface.query, 'e', placeId),
  cnpjLookup: (cnpj) => join(surface.query, 'j', cnpj),
  files: surface.blob,
  fileDownload: (name) => `${join(surface.blob, 'y')}?name=${encodeURIComponent(name)}`,
};

/** Rotas da SPA (UI). */
export const APP = {
  home: '/',
  login: '/i',
  forgotPassword: '/w',
  resetPassword: '/w/n',
  acceptInvite: '/v',
  members: '/m',
  parties: '/c',
  profile: '/p',
  transactions: '/n',
  invoices: '/n/i',
  billing: '/f',
  billingContracts: '/f/c',
  billingCharges: '/f/h',
  billingServices: '/f/s',
  billingTaxes: '/f/t',
  settings: '/s',
  settingsAccounts: '/s/a',
  settingsCards: '/s/k',
  settingsCategories: '/s/g',
  settingsCostCenters: '/s/o',
  settingsCompany: '/s/e',
  settingsAsaas: '/s/n',
};
