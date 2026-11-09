import { Op } from 'sequelize';
import {
  CostCenter,
  FinanceAccount,
  FinanceCard,
  FinanceInvoice,
  FinanceTransaction,
  Party,
} from '../models/index.js';
import { findInvoiceCategory } from '../lib/financeCategorySeed.js';
import {
  addMonthsSafe,
  dateWithDay,
  formatBr,
  formatDateOnly,
  monthLabel,
  parseDateOnly,
  shiftMonth,
  toDateOnly,
  todayDateOnly,
} from '../lib/financeDates.js';

export const FUTURE_INVOICE_COUNT = 3;

function buildInvoiceDates(year, month, closingDay, dueDay) {
  const closing = dateWithDay(year, month, closingDay);
  let dueYear = year;
  let dueMonth = month;
  if (dueDay <= closingDay) {
    dueMonth += 1;
    if (dueMonth > 12) {
      dueMonth = 1;
      dueYear += 1;
    }
  }
  const due = dateWithDay(dueYear, dueMonth, dueDay);
  return {
    closingDate: formatDateOnly(closing),
    dueDate: formatDateOnly(due),
  };
}

function toNumber(value) {
  return Number(value || 0);
}

export async function ensureFutureInvoices(organizationId, card, fromDate = new Date()) {
  if (card.type !== 'credito') return [];
  const closingDay = Number(card.closingDay);
  const dueDay = Number(card.dueDay);
  if (!closingDay || !dueDay) {
    const err = new Error('Cartão de crédito sem dia de fechamento/vencimento');
    err.status = 400;
    throw err;
  }

  const base = parseDateOnly(toDateOnly(fromDate));
  let year = base.getUTCFullYear();
  let month = base.getUTCMonth() + 1;
  ({ year, month } = shiftMonth(year, month, -1));

  const created = [];
  for (let i = 0; i < FUTURE_INVOICE_COUNT + 2; i += 1) {
    const ref = shiftMonth(year, month, i);
    let invoice = await FinanceInvoice.findOne({
      where: {
        organizationId,
        cardId: card.id,
        referenceYear: ref.year,
        referenceMonth: ref.month,
      },
    });
    if (!invoice) {
      const dates = buildInvoiceDates(ref.year, ref.month, closingDay, dueDay);
      invoice = await FinanceInvoice.create({
        organizationId,
        cardId: card.id,
        referenceYear: ref.year,
        referenceMonth: ref.month,
        closingDate: dates.closingDate,
        dueDate: dates.dueDate,
        status: 'aberta',
      });
      created.push(invoice);
    }
  }
  return created;
}

export async function resolveInvoiceForPurchase(organizationId, cardId, purchaseDate) {
  const card = await FinanceCard.findOne({
    where: { id: cardId, organizationId },
    include: [{ model: FinanceAccount, as: 'account' }],
  });
  if (!card) {
    const err = new Error('Cartão não encontrado');
    err.status = 404;
    throw err;
  }
  if (card.type !== 'credito') {
    const err = new Error('Apenas cartões de crédito possuem fatura');
    err.status = 400;
    throw err;
  }

  await ensureFutureInvoices(organizationId, card, purchaseDate);
  const date = toDateOnly(purchaseDate);
  let invoices = await FinanceInvoice.findAll({
    where: { organizationId, cardId },
    order: [['closingDate', 'ASC']],
  });

  let invoice = invoices
    .filter((inv) => inv.status !== 'paga')
    .find((inv) => inv.closingDate >= date);

  if (!invoice) {
    await ensureFutureInvoices(organizationId, card, addMonthsSafe(date, 2));
    invoices = await FinanceInvoice.findAll({
      where: { organizationId, cardId },
      order: [['closingDate', 'ASC']],
    });
    invoice = invoices
      .filter((inv) => inv.status !== 'paga')
      .find((inv) => inv.closingDate >= date);
  }

  if (!invoice) {
    const err = new Error('Não foi possível determinar a fatura para esta compra');
    err.status = 400;
    throw err;
  }

  return {
    invoice,
    preview: {
      invoiceId: invoice.id,
      label: monthLabel(invoice.referenceYear, invoice.referenceMonth),
      closingDate: invoice.closingDate,
      dueDate: invoice.dueDate,
      message: `Esta compra entrará na fatura de ${monthLabel(
        invoice.referenceYear,
        invoice.referenceMonth,
      )}, que fecha em ${formatBr(invoice.closingDate)}`,
    },
  };
}

export async function sumInvoiceTotal(organizationId, invoiceId) {
  const rows = await FinanceTransaction.findAll({
    where: {
      organizationId,
      invoiceId,
      status: { [Op.ne]: 'cancelado' },
    },
    attributes: ['amount', 'type'],
  });
  return rows.reduce((sum, row) => {
    const value = toNumber(row.amount);
    return row.type === 'receita' ? sum - value : sum + value;
  }, 0);
}

export async function serializeInvoice(organizationId, invoice, { withItems = false } = {}) {
  const totalAmount = await sumInvoiceTotal(organizationId, invoice.id);
  const result = invoice.toSafeJSON({ totalAmount });
  if (withItems) {
    const items = await FinanceTransaction.findAll({
      where: { organizationId, invoiceId: invoice.id },
      order: [['dueDate', 'ASC'], ['createdAt', 'ASC']],
    });
    result.items = items
      .filter((row) => row.status !== 'cancelado')
      .map((row) => row.toSafeJSON());
  }
  return result;
}

export async function payInvoice(organizationId, invoiceId, { paidAt, costCenterId, partyId } = {}) {
  const invoice = await FinanceInvoice.findOne({
    where: { id: invoiceId, organizationId },
    include: [{ model: FinanceCard, as: 'card', include: [{ model: FinanceAccount, as: 'account' }] }],
  });
  if (!invoice) {
    const err = new Error('Fatura não encontrada');
    err.status = 404;
    throw err;
  }
  if (invoice.status === 'paga') {
    const err = new Error('Fatura já está paga');
    err.status = 400;
    throw err;
  }
  if (!invoice.card?.accountId) {
    const err = new Error('Cartão sem conta vinculada');
    err.status = 400;
    throw err;
  }

  const total = await sumInvoiceTotal(organizationId, invoice.id);
  if (total <= 0) {
    const err = new Error('Fatura sem valor a pagar');
    err.status = 400;
    throw err;
  }
  if (!costCenterId || !partyId) {
    const err = new Error('Informe fornecedor e centro de custo para pagar a fatura');
    err.status = 400;
    throw err;
  }

  const party = await Party.findOne({ where: { id: partyId, organizationId } });
  if (!party || !party.isSupplier) {
    const err = new Error('Informe um fornecedor válido');
    err.status = 400;
    throw err;
  }
  if (party.status === 'DISABLED') {
    const err = new Error('Fornecedor desativado');
    err.status = 400;
    throw err;
  }

  const costCenter = await CostCenter.findOne({
    where: { id: costCenterId, organizationId, status: 'ativa' },
  });
  if (!costCenter) {
    const err = new Error('Centro de custo inválido');
    err.status = 400;
    throw err;
  }

  const category = await findInvoiceCategory(organizationId);
  if (!category) {
    const err = new Error('Categoria Fatura cartão não encontrada');
    err.status = 400;
    throw err;
  }

  const payDate = toDateOnly(paidAt || invoice.dueDate || todayDateOnly());
  const payment = await FinanceTransaction.create({
    organizationId,
    type: 'despesa',
    description: `Pagamento fatura ${monthLabel(invoice.referenceYear, invoice.referenceMonth)} · ${invoice.card.name}`,
    categoryId: category.id,
    accountId: invoice.card.accountId,
    cardId: null,
    invoiceId: null,
    partyId,
    costCenterId,
    amount: total,
    paidAmount: total,
    dueDate: payDate,
    paidAt: payDate,
    status: 'pago',
    modality: 'unico',
  });

  const items = await FinanceTransaction.findAll({
    where: {
      organizationId,
      invoiceId: invoice.id,
      status: 'pendente',
    },
  });
  for (const row of items) {
    row.status = row.type === 'receita' ? 'recebido' : 'pago';
    row.paidAt = payDate;
    row.paidAmount = row.amount;
    await row.save();
  }

  invoice.status = 'paga';
  invoice.paidAt = payDate;
  invoice.paymentTransactionId = payment.id;
  await invoice.save();

  return serializeInvoice(organizationId, invoice, { withItems: true });
}

export async function unpayInvoice(organizationId, invoiceId) {
  const invoice = await FinanceInvoice.findOne({
    where: { id: invoiceId, organizationId },
  });
  if (!invoice) {
    const err = new Error('Fatura não encontrada');
    err.status = 404;
    throw err;
  }
  if (invoice.status !== 'paga') {
    const err = new Error('Fatura não está paga');
    err.status = 400;
    throw err;
  }

  if (invoice.paymentTransactionId) {
    await FinanceTransaction.destroy({
      where: { id: invoice.paymentTransactionId, organizationId },
    });
  }

  await FinanceTransaction.update(
    { status: 'pendente', paidAt: null, paidAmount: null },
    {
      where: {
        organizationId,
        invoiceId: invoice.id,
        status: { [Op.in]: ['pago', 'recebido'] },
      },
    },
  );

  invoice.status = 'aberta';
  invoice.paidAt = null;
  invoice.paymentTransactionId = null;
  await invoice.save();
  return serializeInvoice(organizationId, invoice, { withItems: true });
}

export async function closeInvoice(organizationId, invoiceId) {
  const invoice = await FinanceInvoice.findOne({ where: { id: invoiceId, organizationId } });
  if (!invoice) {
    const err = new Error('Fatura não encontrada');
    err.status = 404;
    throw err;
  }
  if (invoice.status === 'paga') {
    const err = new Error('Fatura paga não pode ser fechada novamente');
    err.status = 400;
    throw err;
  }
  invoice.status = 'fechada';
  await invoice.save();
  return serializeInvoice(organizationId, invoice);
}

export async function reopenInvoice(organizationId, invoiceId) {
  const invoice = await FinanceInvoice.findOne({ where: { id: invoiceId, organizationId } });
  if (!invoice) {
    const err = new Error('Fatura não encontrada');
    err.status = 404;
    throw err;
  }
  if (invoice.status === 'paga') {
    const err = new Error('Desfaça o pagamento antes de reabrir');
    err.status = 400;
    throw err;
  }
  invoice.status = 'aberta';
  await invoice.save();
  return serializeInvoice(organizationId, invoice);
}
