/**
 * Máscaras e validação de documentos/contatos (uso global no frontend).
 */

export function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

/** Texto em maiúsculas (pt-BR), uso global em nomes cadastrais. */
export function formatUppercase(value) {
  return String(value || '').toLocaleUpperCase('pt-BR');
}

/**
 * Primeira letra de cada palavra em maiúscula (pt-BR).
 * Útil para endereços vindos de CNPJ em caixa alta.
 */
export function formatTitleCase(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|[\s/'-])(\S)/g, (_, sep, ch) => sep + ch.toLocaleUpperCase('pt-BR'));
}

function allSameDigits(d) {
  return /^(\d)\1+$/.test(d);
}

export function isValidCpf(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || allSameDigits(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(cpf[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(cpf[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === Number(cpf[10]);
}

export function isValidCnpj(value) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || allSameDigits(cnpj)) return false;
  const calc = (base, factors) => {
    let sum = 0;
    for (let i = 0; i < factors.length; i += 1) sum += Number(base[i]) * factors[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const d1 = calc(cnpj, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (d1 !== Number(cnpj[12])) return false;
  const d2 = calc(cnpj, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d2 === Number(cnpj[13]);
}

export function isValidCpfOrCnpj(value) {
  const d = onlyDigits(value);
  if (d.length === 11) return isValidCpf(d);
  if (d.length === 14) return isValidCnpj(d);
  return false;
}

/**
 * Detecta PF/PJ em tempo real pela digitação:
 * - < 11 dígitos: indefinido
 * - 11 dígitos: PF só se CPF válido; se inválido, permanece indefinido (permite seguir para CNPJ)
 * - 12+ dígitos: PJ
 */
export function personTypeFromDocument(value) {
  const d = onlyDigits(value);
  if (!d.length || d.length < 11) return '';
  if (d.length === 11) return isValidCpf(d) ? 'PF' : '';
  return 'PJ';
}

export function formatCpf(value) {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function formatCnpj(value) {
  const d = onlyDigits(value).slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/** Máscara progressiva CPF → CNPJ conforme a digitação. */
export function formatCpfCnpj(value) {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 11) return formatCpf(d);
  return formatCnpj(d);
}

export function formatDocument(personType, value) {
  return personType === 'PF' ? formatCpf(value) : formatCnpj(value);
}

export function formatPhoneBr(value) {
  const d = onlyDigits(value).slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function formatCep(value) {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function formatWhatsappUsername(value) {
  return String(value || '')
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 30);
}

/** Conta bancária com dígito final separado por hífen (ex.: 12345-6). */
export function formatBankAccount(value) {
  const d = onlyDigits(value).slice(0, 20);
  if (!d) return '';
  if (d.length === 1) return d;
  return `${d.slice(0, -1)}-${d.slice(-1)}`;
}

export function formatBankAgency(value) {
  const d = onlyDigits(value).slice(0, 6);
  if (!d) return '';
  if (d.length <= 4) return d;
  return `${d.slice(0, 4)}-${d.slice(4)}`;
}

export const MASKS = {
  cpf: formatCpf,
  cnpj: formatCnpj,
  cpfCnpj: formatCpfCnpj,
  phone: formatPhoneBr,
  cep: formatCep,
  uppercase: formatUppercase,
  bankAccount: formatBankAccount,
  bankAgency: formatBankAgency,
};
