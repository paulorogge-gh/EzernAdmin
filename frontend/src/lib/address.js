export function emptyAddress() {
  return {
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
  };
}

export function normalizeAddress(input) {
  const src = input && typeof input === 'object' ? input : {};
  return {
    ...emptyAddress(),
    street: String(src.street || ''),
    number: String(src.number || ''),
    complement: String(src.complement || ''),
    neighborhood: String(src.neighborhood || ''),
    district: String(src.district || ''),
    city: String(src.city || ''),
    state: String(src.state || ''),
    country: String(src.country || ''),
    zip: String(src.zip || ''),
    placeId: String(src.placeId || ''),
    formatted: String(src.formatted || ''),
  };
}

export function addressSearchLabel(address) {
  const a = normalizeAddress(address);
  if (a.formatted) return a.formatted;
  const street = [a.street, a.number].filter(Boolean).join(', ');
  return [street, a.neighborhood, a.district, a.city, a.state, a.country]
    .filter(Boolean)
    .join(', ');
}

export { formatPhoneBr } from './masks';
