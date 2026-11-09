export const ACCOUNT_TYPE_OPTIONS = [
  { value: 'corrente', label: 'Corrente' },
  { value: 'poupanca', label: 'Poupança' },
  { value: 'investimento', label: 'Investimento' },
  { value: 'caixa', label: 'Caixa' },
];

export const CARD_TYPE_OPTIONS = [
  { value: 'credito', label: 'Crédito' },
  { value: 'debito', label: 'Débito' },
];

export const CARD_BRAND_OPTIONS = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'elo', label: 'Elo' },
  { value: 'amex', label: 'American Express' },
  { value: 'hipercard', label: 'Hipercard' },
  { value: 'outra', label: 'Outra' },
];

export const TX_TYPE_OPTIONS = [
  { value: 'despesa', label: 'Despesa' },
  { value: 'receita', label: 'Receita' },
  { value: 'transferencia', label: 'Transferência' },
];

export const TX_STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'pago', label: 'Pago' },
  { value: 'recebido', label: 'Recebido' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'atrasado', label: 'Atrasado' },
];

export const TX_STATUS_TONE = {
  pendente: 'warn',
  pago: 'ok',
  recebido: 'ok',
  cancelado: 'neutral',
  atrasado: 'danger',
  transferido: 'ok',
};

export const MODALITY_OPTIONS = [
  { value: 'unico', label: 'Único' },
  { value: 'recorrente', label: 'Recorrente' },
  { value: 'parcelado', label: 'Parcelado' },
];

export const RECURRENCE_OPTIONS = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'anual', label: 'Anual' },
];

export const INVOICE_STATUS_OPTIONS = [
  { value: 'aberta', label: 'Aberta' },
  { value: 'fechada', label: 'Fechada' },
  { value: 'paga', label: 'Paga' },
];

export const INVOICE_STATUS_TONE = {
  aberta: 'warn',
  fechada: 'neutral',
  paga: 'ok',
};

export function moneyBr(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function dateBr(iso) {
  const raw = String(iso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
  const [y, m, d] = raw.split('-');
  return `${d}/${m}/${y}`;
}

export function labelOf(options, value) {
  return options.find((item) => item.value === value)?.label || value || '';
}
