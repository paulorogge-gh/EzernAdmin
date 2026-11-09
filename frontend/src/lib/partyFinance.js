export const ACCOUNT_TYPE = {
  CHECKING: 'CHECKING',
  SAVINGS: 'SAVINGS',
};

export const ACCOUNT_TYPE_OPTIONS = [
  { value: ACCOUNT_TYPE.CHECKING, label: 'Corrente' },
  { value: ACCOUNT_TYPE.SAVINGS, label: 'Poupança' },
];

export const ACCOUNT_HOLDER_KIND = {
  OWN: 'OWN',
  OTHER: 'OTHER',
};

export const ACCOUNT_HOLDER_OPTIONS = [
  { value: ACCOUNT_HOLDER_KIND.OWN, label: 'Própria' },
  { value: ACCOUNT_HOLDER_KIND.OTHER, label: 'Outra' },
];

let billingContactSeq = 0;

export function blankBillingContact(overrides = {}) {
  billingContactSeq += 1;
  return {
    key: `billing-${billingContactSeq}-${Date.now()}`,
    name: '',
    email: '',
    emailActive: true,
    ...overrides,
  };
}

export function normalizeBillingContactsForm(raw, party) {
  const list = Array.isArray(raw)
    ? raw
    : party?.billingContacts && Array.isArray(party.billingContacts)
      ? party.billingContacts
      : null;

  if (list?.length) {
    return list.map((item) =>
      blankBillingContact({
        name: String(item?.name || '').trim(),
        email: String(item?.email || '').trim(),
        emailActive: item?.emailActive !== false,
      }),
    );
  }

  const name = String(party?.billingContactName || '').trim();
  const email = String(party?.billingEmail || '').trim();
  if (name || email) {
    return [blankBillingContact({ name, email, emailActive: true })];
  }

  return [blankBillingContact()];
}

export function blankFinanceForm() {
  return {
    billingContacts: [blankBillingContact()],
    bankCode: '',
    bankAgency: '',
    bankAccount: '',
    bankAccountType: '',
    pixKey: '',
    bankHolderKind: '',
    bankHolderName: '',
  };
}

export function financeFromParty(party) {
  return {
    billingContacts: normalizeBillingContactsForm(party?.billingContacts, party),
    bankCode: party?.bankCode || '',
    bankAgency: party?.bankAgency || '',
    bankAccount: party?.bankAccount || '',
    bankAccountType: party?.bankAccountType || '',
    pixKey: party?.pixKey || '',
    bankHolderKind: party?.bankHolderKind || '',
    bankHolderName: party?.bankHolderName || '',
  };
}

export function billingContactsPayload(contacts) {
  return (Array.isArray(contacts) ? contacts : [])
    .map((item) => ({
      name: String(item?.name || '').trim(),
      email: String(item?.email || '').trim().toLowerCase(),
      emailActive: item?.emailActive !== false,
    }))
    .filter((item) => item.name || item.email);
}
