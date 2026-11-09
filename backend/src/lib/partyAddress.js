import { emptyAddress, normalizeAddress } from './address.js';

/**
 * Endereço de parceiro: aceita Places OU endereço completo (ex.: CNPJ).
 */
export function validatePartyAddress(address, { required = false } = {}) {
  const a = normalizeAddress(address);
  const hasAny = Boolean(
    a.street || a.number || a.city || a.state || a.placeId || a.formatted || a.zip,
  );
  if (!required && !hasAny) return { ok: true, address: emptyAddress() };

  if (a.placeId && a.street) {
    if (!a.number) {
      return { ok: false, message: 'Informe o número do endereço' };
    }
    return { ok: true, address: a };
  }

  if (a.street && a.city && a.state && a.zip) {
    if (!a.number) {
      return { ok: false, message: 'Informe o número do endereço' };
    }
    return { ok: true, address: a };
  }

  return {
    ok: false,
    message: 'Informe o endereço completo ou selecione nas sugestões do Google',
  };
}

export function addressToPartyFields(address) {
  const a = normalizeAddress(address);
  return {
    addressStreet: a.street || null,
    addressNumber: a.number || null,
    addressComplement: a.complement || null,
    addressNeighborhood: a.neighborhood || null,
    addressDistrict: a.district || null,
    addressCity: a.city || null,
    addressState: a.state || null,
    addressCountry: a.country || null,
    addressZip: a.zip || null,
    addressPlaceId: a.placeId || null,
    addressFormatted: a.formatted || null,
  };
}

export function applyAddressToParty(party, address) {
  Object.assign(party, addressToPartyFields(address || emptyAddress()));
}
