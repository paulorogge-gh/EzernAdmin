import {
  BillingCharge,
  BillingContract,
  WebhookReceipt,
} from '../models/index.js';
import {
  settleChargeReceivable,
  upsertChargeFromAsaasPayment,
} from './billingContractService.js';
import { getProfileForWebhookToken } from './organizationProfileService.js';
import {
  competenceFromDate,
  recordAuthorizedInvoiceTax,
} from './simplesTaxService.js';
import { sendMail } from './mail.js';
import { normalizeBillingContacts } from '../lib/billingContacts.js';
import { Party } from '../models/Party.js';

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function claimEvent(organizationId, eventId, eventType, payload) {
  if (!eventId) return true;
  try {
    await WebhookReceipt.create({
      organizationId,
      provider: 'asaas',
      eventId: String(eventId),
      eventType: String(eventType || 'UNKNOWN'),
      payload,
      processedAt: new Date(),
    });
    return true;
  } catch (err) {
    if (String(err?.name || '').includes('Unique') || err?.original?.code === 'ER_DUP_ENTRY') {
      return false;
    }
    throw err;
  }
}

async function emailChargeCreated(organizationId, charge) {
  const party = await Party.findByPk(charge.partyId);
  if (!party) return;
  const contacts = normalizeBillingContacts(party.billingContacts, {
    legacyName: party.billingContactName,
    legacyEmail: party.billingEmail,
  }).filter((c) => c.email && c.emailActive);
  if (!contacts.length) return;

  const lines = (charge.items || [])
    .map((item) => `- ${item.description}: R$ ${Number(item.amount).toFixed(2)}`)
    .join('\n');

  const text = [
    `Olá,`,
    ``,
    `Segue sua cobrança:`,
    ``,
    `Descrição: ${charge.description || 'Faturamento'}`,
    `Valor: R$ ${Number(charge.amount).toFixed(2)}`,
    `Vencimento: ${charge.dueDate}`,
    charge.identificationField ? `Linha digitável: ${charge.identificationField}` : null,
    charge.bankSlipUrl ? `Boleto: ${charge.bankSlipUrl}` : null,
    charge.invoiceUrl ? `Fatura: ${charge.invoiceUrl}` : null,
    lines ? `\nItens:\n${lines}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  for (const contact of contacts) {
    await sendMail({
      to: contact.email,
      subject: `Cobrança ${charge.dueDate} - R$ ${Number(charge.amount).toFixed(2)}`,
      text,
    });
  }
}

async function emailNfAuthorized(charge) {
  const party = await Party.findByPk(charge.partyId);
  if (!party) return;
  const contacts = normalizeBillingContacts(party.billingContacts, {
    legacyName: party.billingContactName,
    legacyEmail: party.billingEmail,
  }).filter((c) => c.email && c.emailActive);
  if (!contacts.length) return;

  const text = [
    `Olá,`,
    ``,
    `Sua nota fiscal foi autorizada.`,
    ``,
    `Número: ${charge.nfNumber || '-'}`,
    charge.nfPdfUrl ? `PDF: ${charge.nfPdfUrl}` : null,
    charge.nfXmlUrl ? `XML: ${charge.nfXmlUrl}` : null,
    `Valor: R$ ${Number(charge.amount).toFixed(2)}`,
  ]
    .filter(Boolean)
    .join('\n');

  for (const contact of contacts) {
    await sendMail({
      to: contact.email,
      subject: `Nota fiscal autorizada - R$ ${Number(charge.amount).toFixed(2)}`,
      text,
    });
  }
}

export async function handleAsaasWebhook(token, body = {}) {
  const profile = await getProfileForWebhookToken(token);
  if (!profile) throw httpError('Webhook não autorizado', 401);
  const organizationId = profile.organizationId;
  const event = body.event || body.type || 'UNKNOWN';
  const eventId = body.id || `${event}:${body.payment?.id || body.invoice?.id || Date.now()}`;

  const claimed = await claimEvent(organizationId, eventId, event, body);
  if (!claimed) return { ok: true, duplicate: true };

  const payment = body.payment;
  const invoice = body.invoice;

  if (payment?.id && String(event).startsWith('PAYMENT_')) {
    const charge = await upsertChargeFromAsaasPayment(organizationId, payment);
    if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event)) {
      charge.status = event === 'PAYMENT_RECEIVED' ? 'received' : 'confirmed';
      charge.paidAt = payment.paymentDate || payment.confirmedDate || charge.paidAt;
      await charge.save();
      await settleChargeReceivable(organizationId, charge);
    }
    if (event === 'PAYMENT_CREATED') {
      const full = await BillingCharge.findByPk(charge.id, {
        include: ['items'],
      });
      try {
        await emailChargeCreated(organizationId, full || charge);
      } catch (err) {
        console.error('[billing] e-mail cobrança falhou', err.message);
      }
    }
    if (event === 'PAYMENT_OVERDUE') {
      charge.status = 'overdue';
      await charge.save();
    }
  }

  if (invoice && String(event).startsWith('INVOICE_')) {
    const paymentId = invoice.payment || invoice.paymentId;
    let charge = null;
    if (paymentId) {
      charge = await BillingCharge.findOne({
        where: { organizationId, asaasPaymentId: paymentId },
      });
    }
    if (!charge && invoice.id) {
      charge = await BillingCharge.findOne({
        where: { organizationId, asaasInvoiceId: invoice.id },
      });
    }
    if (charge) {
      charge.asaasInvoiceId = invoice.id || charge.asaasInvoiceId;
      charge.nfNumber = invoice.number || charge.nfNumber;
      charge.nfPdfUrl = invoice.pdfUrl || invoice.invoiceUrl || charge.nfPdfUrl;
      charge.nfXmlUrl = invoice.xmlUrl || charge.nfXmlUrl;
      if (event === 'INVOICE_AUTHORIZED') {
        charge.nfStatus = 'authorized';
        charge.nfAuthorizedAt = new Date();
        charge.competence = competenceFromDate(charge.nfAuthorizedAt);
        await charge.save();
        await recordAuthorizedInvoiceTax(organizationId, charge.id);
        try {
          await emailNfAuthorized(charge);
        } catch (err) {
          console.error('[billing] e-mail NF falhou', err.message);
        }
      } else if (event === 'INVOICE_ERROR') {
        charge.nfStatus = 'error';
        await charge.save();
      } else if (event === 'INVOICE_CANCELED' || event === 'INVOICE_CANCELLED') {
        charge.nfStatus = 'cancelled';
        await charge.save();
      } else {
        charge.nfStatus = 'processing';
        await charge.save();
      }
    }
  }

  if (body.subscription?.id && event === 'SUBSCRIPTION_DELETED') {
    await BillingContract.update(
      { status: 'cancelled', cancelledAt: new Date() },
      {
        where: {
          organizationId,
          asaasSubscriptionId: body.subscription.id,
          status: 'active',
        },
      },
    );
  }

  return { ok: true };
}
