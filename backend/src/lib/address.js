export const emptyAddress = () => ({
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  district: '',
  city: '',
  state: '',
  country: '',
  zip: '',
  placeId: '',
  formatted: '',
});

export function normalizeAddress(input) {
  const src = input && typeof input === 'object' ? input : {};
  return {
    street: String(src.street || '').trim(),
    number: String(src.number || '').trim(),
    complement: String(src.complement || '').trim(),
    neighborhood: String(src.neighborhood || '').trim(),
    district: String(src.district || '').trim(),
    city: String(src.city || '').trim(),
    state: String(src.state || '').trim(),
    country: String(src.country || '').trim() || 'Brasil',
    zip: String(src.zip || '').trim(),
    placeId: String(src.placeId || '').trim(),
    formatted: String(src.formatted || '').trim(),
  };
}

export function addressToUserFields(address) {
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

export function applyAddressToUser(user, address) {
  const fields = addressToUserFields(address);
  Object.assign(user, fields);
}

export function validateAddress(address, { required = false } = {}) {
  const a = normalizeAddress(address);
  const hasAny = Boolean(
    a.street || a.number || a.city || a.state || a.placeId || a.formatted,
  );
  if (!required && !hasAny) return { ok: true, address: emptyAddress() };
  if (!a.placeId || !a.street) {
    return { ok: false, message: 'Selecione um endereço nas sugestões do Google' };
  }
  if (!a.number) {
    return { ok: false, message: 'Informe o número do endereço' };
  }
  return { ok: true, address: a };
}
