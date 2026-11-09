import { onlyDigits } from '../lib/brazilianDocument.js';

async function fetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, data };
  } finally {
    clearTimeout(timer);
  }
}

function formatCep(raw) {
  const d = onlyDigits(raw).slice(0, 8);
  if (d.length !== 8) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function formatPhone(raw) {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length < 10) return d;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function normalizePersonName(raw) {
  const name = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!name) return '';
  return name
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|[\s'-])(\S)/g, (_, sep, ch) => sep + ch.toLocaleUpperCase('pt-BR'));
}

/** Endereço do CNPJ: só a primeira letra de cada palavra em maiúscula. */
function formatAddressText(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|[\s/'-])(\S)/g, (_, sep, ch) => sep + ch.toLocaleUpperCase('pt-BR'));
}

const RESPONSIBLE_ROLE_PRIORITY = [
  /administrador|admin/i,
  /s[oó]cio[- ]?administrador/i,
  /diretor/i,
  /presidente/i,
  /s[oó]cio[- ]?gerente/i,
  /gerente/i,
  /titular/i,
  /empres[aá]rio/i,
];

function extractResponsibleName(qsa) {
  if (!Array.isArray(qsa) || !qsa.length) return '';
  const people = qsa
    .map((item) => ({
      name: normalizePersonName(item?.nome_socio || item?.nome || item?.name || ''),
      role: String(item?.qualificacao_socio || item?.qual || item?.qualification || ''),
      legalRep: normalizePersonName(item?.nome_representante_legal || ''),
    }))
    .filter((p) => p.name);
  if (!people.length) return '';
  for (const pattern of RESPONSIBLE_ROLE_PRIORITY) {
    const match = people.find((p) => pattern.test(p.role));
    if (match) return match.legalRep || match.name;
  }
  return people[0].legalRep || people[0].name;
}

function buildFormatted(parts) {
  const street = [parts.street, parts.number].filter(Boolean).join(', ');
  return [street, parts.neighborhood, parts.city, parts.state, parts.zip]
    .filter(Boolean)
    .join(' - ');
}

function mapCnpjAddress({ street, number, complement, neighborhood, city, state, zip }) {
  const address = {
    street: formatAddressText(street),
    number: number && String(number).toUpperCase() !== 'S/N' ? String(number).trim() : '',
    complement: formatAddressText(complement),
    neighborhood: formatAddressText(neighborhood),
    district: '',
    city: formatAddressText(city),
    state: String(state || '')
      .trim()
      .toLocaleUpperCase('pt-BR'),
    country: 'Brasil',
    zip: formatCep(zip),
    placeId: '',
    formatted: '',
  };
  address.formatted = buildFormatted(address);
  return address;
}

function mapBrasilApi(data) {
  return {
    legalName: data.razao_social || '',
    tradeName: data.nome_fantasia || '',
    contactName: extractResponsibleName(data.qsa),
    email: data.email || '',
    phone: formatPhone(data.ddd_telefone_1 || data.telefone || ''),
    address: mapCnpjAddress({
      street: data.logradouro || '',
      number: data.numero,
      complement: data.complemento || '',
      neighborhood: data.bairro || '',
      city: data.municipio || '',
      state: data.uf || '',
      zip: data.cep,
    }),
  };
}

function mapReceitaWs(data) {
  return {
    legalName: data.nome || '',
    tradeName: data.fantasia || '',
    contactName: extractResponsibleName(data.qsa),
    email: data.email || '',
    phone: formatPhone(data.telefone),
    address: mapCnpjAddress({
      street: data.logradouro || '',
      number: data.numero,
      complement: data.complemento || '',
      neighborhood: data.bairro || '',
      city: data.municipio || '',
      state: data.uf || '',
      zip: data.cep,
    }),
  };
}

/**
 * Consulta pública de CNPJ (BrasilAPI → ReceitaWS).
 * @returns {Promise<object>}
 */
export async function lookupCnpj(rawCnpj) {
  const cnpj = onlyDigits(rawCnpj);
  if (cnpj.length !== 14) {
    const err = new Error('Informe um CNPJ completo');
    err.status = 400;
    throw err;
  }

  const brasil = await fetchJson(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
  if (brasil.ok && brasil.data?.cnpj) {
    return mapBrasilApi(brasil.data);
  }

  const receita = await fetchJson(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`);
  if (receita.ok && receita.data?.status === 'OK') {
    return mapReceitaWs(receita.data);
  }

  const err = new Error('Não foi possível consultar este CNPJ');
  err.status = 404;
  throw err;
}
