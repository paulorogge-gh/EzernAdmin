import { Router } from 'express';
import { requireAuth, requireRole, loadUser } from '../middleware/auth.js';
import { asaasRequest } from '../services/asaasClient.js';
import {
  activateContract,
  cancelContract,
  createContract,
  getCharge,
  getContract,
  listCharges,
  listContracts,
  updateContract,
} from '../services/billingContractService.js';
import {
  createBillingService,
  getBillingService,
  listBillingServices,
  updateBillingService,
} from '../services/billingServiceCatalog.js';
import { handleAsaasWebhook } from '../services/billingWebhookService.js';
import {
  getOrganizationProfile,
  updateOrganizationProfile,
} from '../services/organizationProfileService.js';
import {
  closeTaxPeriod,
  listTaxLedger,
  listTaxPeriods,
  taxPreview,
} from '../services/simplesTaxService.js';

export const billingRouter = Router();
export const billingWebhookRouter = Router();

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function orgId(req) {
  return req.auth.organizationId;
}

billingWebhookRouter.post(
  '/a',
  asyncHandler(async (req, res) => {
    const token =
      req.get('x-billing-webhook-token') ||
      req.query.token ||
      req.body?.token ||
      '';
    const result = await handleAsaasWebhook(String(token), req.body || {});
    res.json({ data: result });
  }),
);

billingRouter.use(requireAuth, loadUser, requireRole('OWNER', 'ADMIN'));

/* Perfil da organização */
billingRouter.get(
  '/p',
  asyncHandler(async (req, res) => {
    res.json({ data: await getOrganizationProfile(orgId(req)) });
  }),
);

billingRouter.put(
  '/p',
  asyncHandler(async (req, res) => {
    res.json({ data: await updateOrganizationProfile(orgId(req), req.body || {}) });
  }),
);

billingRouter.get(
  '/p/a/services',
  asyncHandler(async (req, res) => {
    const data = await asaasRequest(orgId(req), 'GET', '/fiscalInfo/services');
    res.json({ data: data?.data || data || [] });
  }),
);

billingRouter.post(
  '/p/a/fiscal',
  asyncHandler(async (req, res) => {
    const profile = await getOrganizationProfile(orgId(req));
    const payload = {
      email: profile.email || undefined,
      municipalInscription: profile.municipalInscription || undefined,
      simplesNacional: profile.taxRegime === 'simples_nacional',
      cnae: profile.cnaePrimary || undefined,
      ...((req.body && typeof req.body === 'object') ? req.body : {}),
    };
    const data = await asaasRequest(orgId(req), 'POST', '/fiscalInfo', payload);
    res.json({ data });
  }),
);

/* Serviços */
billingRouter.get(
  '/s',
  asyncHandler(async (req, res) => {
    res.json({ data: await listBillingServices(orgId(req), req.query) });
  }),
);

billingRouter.post(
  '/s',
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await createBillingService(orgId(req), req.body || {}) });
  }),
);

billingRouter.get(
  '/s/:id',
  asyncHandler(async (req, res) => {
    res.json({ data: await getBillingService(orgId(req), req.params.id) });
  }),
);

billingRouter.put(
  '/s/:id',
  asyncHandler(async (req, res) => {
    res.json({
      data: await updateBillingService(orgId(req), req.params.id, req.body || {}),
    });
  }),
);

/* Contratos */
billingRouter.get(
  '/c',
  asyncHandler(async (req, res) => {
    res.json({ data: await listContracts(orgId(req), req.query) });
  }),
);

billingRouter.post(
  '/c',
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await createContract(orgId(req), req.body || {}) });
  }),
);

billingRouter.get(
  '/c/:id',
  asyncHandler(async (req, res) => {
    res.json({ data: await getContract(orgId(req), req.params.id) });
  }),
);

billingRouter.put(
  '/c/:id',
  asyncHandler(async (req, res) => {
    res.json({ data: await updateContract(orgId(req), req.params.id, req.body || {}) });
  }),
);

billingRouter.post(
  '/c/:id/a',
  asyncHandler(async (req, res) => {
    res.json({ data: await activateContract(orgId(req), req.params.id) });
  }),
);

billingRouter.post(
  '/c/:id/x',
  asyncHandler(async (req, res) => {
    res.json({ data: await cancelContract(orgId(req), req.params.id) });
  }),
);

/* Cobranças */
billingRouter.get(
  '/h',
  asyncHandler(async (req, res) => {
    res.json({ data: await listCharges(orgId(req), req.query) });
  }),
);

billingRouter.get(
  '/h/:id',
  asyncHandler(async (req, res) => {
    res.json({ data: await getCharge(orgId(req), req.params.id) });
  }),
);

/* Impostos Simples */
billingRouter.get(
  '/t',
  asyncHandler(async (req, res) => {
    res.json({ data: await listTaxPeriods(orgId(req)) });
  }),
);

billingRouter.get(
  '/t/preview',
  asyncHandler(async (req, res) => {
    res.json({ data: await taxPreview(orgId(req)) });
  }),
);

billingRouter.get(
  '/t/:competence/ledger',
  asyncHandler(async (req, res) => {
    res.json({ data: await listTaxLedger(orgId(req), req.params.competence) });
  }),
);

billingRouter.post(
  '/t/:competence/close',
  asyncHandler(async (req, res) => {
    res.json({ data: await closeTaxPeriod(orgId(req), req.params.competence) });
  }),
);
