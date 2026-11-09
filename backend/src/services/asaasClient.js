import { OrganizationProfile } from '../models/OrganizationProfile.js';

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function baseUrl(envName) {
  return envName === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';
}

export async function getOrgAsaasConfig(organizationId) {
  const profile = await OrganizationProfile.findOne({ where: { organizationId } });
  if (!profile?.asaasApiKey) {
    throw httpError('Configure a API key do Asaas nas configurações da empresa', 400);
  }
  return {
    profile,
    apiKey: profile.asaasApiKey,
    env: profile.asaasEnv || 'sandbox',
    base: baseUrl(profile.asaasEnv || 'sandbox'),
  };
}

export async function asaasRequest(organizationId, method, path, body) {
  const { apiKey, base } = await getOrgAsaasConfig(organizationId);
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      access_token: apiKey,
      'User-Agent': 'ezern-admin/1.0',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const message =
      data?.errors?.[0]?.description ||
      data?.error?.message ||
      data?.message ||
      `Erro Asaas HTTP ${res.status}`;
    throw httpError(message, res.status >= 400 && res.status < 600 ? res.status : 502);
  }
  return data;
}

export function mapPartyToAsaasCustomer(party, { disableNotifications = true } = {}) {
  const personType = party.personType === 'PJ' ? 'JURIDICA' : 'FISICA';
  const name =
    party.personType === 'PJ'
      ? party.legalName || party.tradeName || party.displayName
      : party.legalName || party.tradeName || party.displayName;
  const payload = {
    name: String(name || '').trim() || 'Cliente',
    cpfCnpj: String(party.document || '').replace(/\D/g, ''),
    email: party.email || party.billingEmail || undefined,
    phone: party.phone || undefined,
    mobilePhone: party.phone || undefined,
    personType,
    company: party.personType === 'PJ' ? party.legalName || party.tradeName : undefined,
    postalCode: String(party.addressZip || '').replace(/\D/g, '') || undefined,
    address: party.addressStreet || undefined,
    addressNumber: party.addressNumber || undefined,
    complement: party.addressComplement || undefined,
    province: party.addressNeighborhood || undefined,
    externalReference: party.id,
  };
  if (disableNotifications) {
    payload.notificationDisabled = true;
  }
  return payload;
}
