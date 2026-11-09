const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asBool(value, fallback = true) {
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  return fallback;
}

export function normalizeBillingContacts(raw, { legacyName = '', legacyEmail = '' } = {}) {
  let list = Array.isArray(raw) ? raw : null;

  if (!list) {
    const name = String(legacyName || '').trim();
    const email = String(legacyEmail || '').trim().toLowerCase();
    list = name || email ? [{ name, email, emailActive: true }] : [];
  }

  return list
    .map((item) => ({
      name: String(item?.name || '').trim(),
      email: String(item?.email || '').trim().toLowerCase(),
      emailActive: asBool(item?.emailActive, true),
    }))
    .filter((item) => item.name || item.email);
}

export function validateBillingContacts(contacts) {
  for (const contact of contacts) {
    if (contact.email && !EMAIL_RE.test(contact.email)) {
      return { ok: false, message: 'Informe um e-mail de cobrança válido' };
    }
    if (contact.emailActive && !contact.email) {
      return {
        ok: false,
        message: 'Informe o e-mail dos contatos ativos para cobrança',
      };
    }
  }
  return { ok: true };
}

/** Espelha o primeiro contato nas colunas legadas. */
export function legacyBillingFromContacts(contacts) {
  const first = contacts[0];
  return {
    billingContactName: first?.name || null,
    billingEmail: first?.email || null,
  };
}
