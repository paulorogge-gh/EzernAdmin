import { emptyAddress, normalizeAddress } from './address';

export const ROLE_LABEL = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
};

export const STATUS_LABEL = {
  ACTIVE: 'Ativo',
  INVITED: 'Convidado',
  DISABLED: 'Desativado',
};

export const STATUS_TONE = {
  ACTIVE: 'ok',
  INVITED: 'warn',
  DISABLED: 'neutral',
};

export function roleLabel(role) {
  return ROLE_LABEL[role] || role || '';
}

/** Valida endereço parcial/completo. Retorna mensagem de erro ou ''. */
export function validateAddressForm(address) {
  const a = normalizeAddress(address);
  const hasAny = Boolean(a.placeId || a.street || a.formatted || a.number || a.city);
  if (!hasAny) return '';
  if (!a.placeId || !a.street) return 'Selecione um endereço nas sugestões do Google';
  if (!a.number.trim()) return 'Informe o número do endereço';
  return '';
}

export function blankInviteForm() {
  return {
    name: '',
    email: '',
    phone: '',
    whatsappUsername: '',
    address: emptyAddress(),
    role: 'MEMBER',
    ssoRequired: false,
  };
}
