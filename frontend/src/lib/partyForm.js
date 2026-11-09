import { emptyAddress, normalizeAddress } from './address';
import {
  formatBankAccount,
  formatBankAgency,
  formatDocument,
  formatPhoneBr,
  formatUppercase,
  formatWhatsappUsername,
  isValidCpf,
  isValidCnpj,
  isValidCpfOrCnpj,
  onlyDigits,
  personTypeFromDocument,
} from './masks';
import {
  ACCOUNT_HOLDER_KIND,
  ACCOUNT_TYPE,
  billingContactsPayload,
  blankFinanceForm,
  financeFromParty,
} from './partyFinance';
import { validateAddressForm } from './userForm';

export const PARTY_KIND = {
  CUSTOMER: 'CUSTOMER',
  SUPPLIER: 'SUPPLIER',
  BOTH: 'BOTH',
};

export const PARTY_KIND_LABEL = {
  CUSTOMER: 'Cliente',
  SUPPLIER: 'Fornecedor',
  BOTH: 'Cliente e fornecedor',
};

export const PARTY_KIND_OPTIONS = [
  { value: PARTY_KIND.CUSTOMER, label: 'Cliente' },
  { value: PARTY_KIND.SUPPLIER, label: 'Fornecedor' },
  { value: PARTY_KIND.BOTH, label: 'Ambos' },
];

export const PERSON_TYPE_LABEL = {
  PF: 'Pessoa física',
  PJ: 'Pessoa jurídica',
};

export function kindFromFlags(isCustomer, isSupplier) {
  if (isCustomer && isSupplier) return PARTY_KIND.BOTH;
  if (isSupplier) return PARTY_KIND.SUPPLIER;
  return PARTY_KIND.CUSTOMER;
}

export function blankPartyForm() {
  return {
    document: '',
    personType: '',
    kind: PARTY_KIND.CUSTOMER,
    legalName: '',
    tradeName: '',
    contactName: '',
    birthDate: '',
    email: '',
    phone: '',
    whatsappUsername: '',
    notes: '',
    status: 'ACTIVE',
    address: emptyAddress(),
    ...blankFinanceForm(),
  };
}

export function partyToForm(party) {
  const personType = party.personType || personTypeFromDocument(party.document) || 'PF';
  return {
    document: formatDocument(personType, party.document || ''),
    personType,
    kind: party.kind || kindFromFlags(party.isCustomer, party.isSupplier),
    legalName: formatUppercase(party.legalName || ''),
    tradeName: formatUppercase(party.tradeName || ''),
    contactName: party.contactName || '',
    birthDate: party.birthDate || '',
    email: party.email || '',
    phone: formatPhoneBr(party.phone || ''),
    whatsappUsername: formatWhatsappUsername(party.whatsappUsername || ''),
    notes: party.notes || '',
    status: party.status || 'ACTIVE',
    address: normalizeAddress(party.address || emptyAddress()),
    ...financeFromParty(party),
    bankAgency: formatBankAgency(party?.bankAgency || ''),
    bankAccount: formatBankAccount(party?.bankAccount || ''),
  };
}

/** Validação de endereço de parceiro (Places ou postal completo). */
export function validatePartyAddressForm(address) {
  const a = normalizeAddress(address);
  const hasAny = Boolean(
    a.placeId || a.street || a.formatted || a.number || a.city || a.zip,
  );
  if (!hasAny) return '';
  if (a.placeId && a.street) {
    return a.number.trim() ? '' : 'Informe o número do endereço';
  }
  if (a.street && a.city && a.state && a.zip) {
    return a.number.trim() ? '' : 'Informe o número do endereço';
  }
  return validateAddressForm(address) || 'Informe o endereço completo ou selecione nas sugestões';
}

function hasAnyFinance(form) {
  const hasBilling = (Array.isArray(form.billingContacts) ? form.billingContacts : []).some(
    (item) => String(item?.name || '').trim() || String(item?.email || '').trim(),
  );
  return Boolean(
    hasBilling ||
      String(form.bankCode || '').trim() ||
      String(form.bankAgency || '').trim() ||
      String(form.bankAccount || '').trim() ||
      String(form.bankAccountType || '').trim() ||
      String(form.pixKey || '').trim() ||
      String(form.bankHolderKind || '').trim() ||
      String(form.bankHolderName || '').trim(),
  );
}

export function validatePartyForm(form) {
  const document = onlyDigits(form.document);
  const detected = personTypeFromDocument(document);
  const personType =
    detected ||
    (form.personType === 'PF' || form.personType === 'PJ' ? form.personType : '');
  if (!document) {
    return { field: 'document', message: 'Informe um CPF ou CNPJ' };
  }
  if (document.length === 11 && !isValidCpf(document)) {
    return {
      field: 'document',
      message: 'CPF inválido. Continue digitando se for CNPJ.',
    };
  }
  if (!personType) {
    return { field: 'document', message: 'Informe um CPF ou CNPJ válido' };
  }
  if (personType === 'PF' && !isValidCpf(document)) {
    return { field: 'document', message: 'Informe um CPF válido' };
  }
  if (personType === 'PJ' && !isValidCnpj(document)) {
    return { field: 'document', message: 'Informe um CNPJ válido' };
  }
  if (!isValidCpfOrCnpj(document)) {
    return {
      field: 'document',
      message: personType === 'PJ' ? 'Informe um CNPJ válido' : 'Informe um CPF válido',
    };
  }
  if (!String(form.legalName || '').trim()) {
    return {
      field: 'legalName',
      message: personType === 'PJ' ? 'Informe a razão social' : 'Informe o nome completo',
    };
  }
  if (personType === 'PF' && form.birthDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(form.birthDate))) {
      return { field: 'birthDate', message: 'Informe uma data de nascimento válida' };
    }
  }
  if (![PARTY_KIND.CUSTOMER, PARTY_KIND.SUPPLIER, PARTY_KIND.BOTH].includes(form.kind)) {
    return { field: 'kind', message: 'Selecione cliente, fornecedor ou ambos' };
  }
  const addressError = validatePartyAddressForm(form.address);
  if (addressError) return { field: 'address', message: addressError };

  if (hasAnyFinance(form)) {
    const contacts = Array.isArray(form.billingContacts) ? form.billingContacts : [];
    for (const contact of contacts) {
      const name = String(contact?.name || '').trim();
      const email = String(contact?.email || '').trim();
      if (!name && !email) continue;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { field: 'billingContacts', message: 'Informe um e-mail de cobrança válido' };
      }
      if (contact?.emailActive !== false && !email) {
        return {
          field: 'billingContacts',
          message: 'Informe o e-mail dos contatos ativos para cobrança',
        };
      }
    }
    if (
      form.bankAccountType &&
      ![ACCOUNT_TYPE.CHECKING, ACCOUNT_TYPE.SAVINGS].includes(form.bankAccountType)
    ) {
      return { field: 'bankAccountType', message: 'Tipo de conta inválido' };
    }
    if (
      form.bankHolderKind &&
      ![ACCOUNT_HOLDER_KIND.OWN, ACCOUNT_HOLDER_KIND.OTHER].includes(form.bankHolderKind)
    ) {
      return { field: 'bankHolderKind', message: 'Titularidade inválida' };
    }
    if (form.bankHolderKind === ACCOUNT_HOLDER_KIND.OTHER && !String(form.bankHolderName || '').trim()) {
      return { field: 'bankHolderName', message: 'Informe o nome do titular' };
    }
  }

  return null;
}

export function partyPayloadFromForm(form) {
  const document = onlyDigits(form.document);
  const personType =
    personTypeFromDocument(document) ||
    (form.personType === 'PJ' ? 'PJ' : form.personType === 'PF' ? 'PF' : '');
  const holderKind = form.bankHolderKind || null;
  const ownHolderName = formatUppercase(String(form.legalName || '').trim());

  return {
    document,
    personType,
    kind: form.kind,
    legalName: formatUppercase(String(form.legalName || '').trim()),
    tradeName: personType === 'PJ' ? formatUppercase(String(form.tradeName || '').trim()) : '',
    contactName: String(form.contactName || '').trim(),
    birthDate: personType === 'PF' ? form.birthDate || null : null,
    email: String(form.email || '').trim(),
    phone: form.phone,
    whatsappUsername: formatWhatsappUsername(form.whatsappUsername),
    notes: String(form.notes || '').trim(),
    status: form.status,
    address: normalizeAddress(form.address),
    billingContacts: billingContactsPayload(form.billingContacts).map((item) => ({
      ...item,
      name: formatUppercase(item.name),
    })),
    bankCode: String(form.bankCode || '').trim(),
    bankAgency: formatBankAgency(form.bankAgency || ''),
    bankAccount: formatBankAccount(form.bankAccount || ''),
    bankAccountType: form.bankAccountType || null,
    pixKey: String(form.pixKey || '').trim(),
    bankHolderKind: holderKind,
    bankHolderName:
      holderKind === ACCOUNT_HOLDER_KIND.OWN
        ? ownHolderName
        : formatUppercase(String(form.bankHolderName || '').trim()),
  };
}

export function displayPartyName(party) {
  if (party.personType === 'PJ' && party.tradeName) {
    return party.tradeName;
  }
  return party.legalName || '';
}
