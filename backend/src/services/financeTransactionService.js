import { randomUUID } from 'node:crypto';
import { Op } from 'sequelize';
import {
  CostCenter,
  FinanceAccount,
  FinanceCard,
  FinanceCategory,
  FinanceTransaction,
  Party,
} from '../models/index.js';
import { ensureBusinessCategories } from '../lib/financeCategorySeed.js';
import { addDaysSafe, addMonthsSafe, toDateOnly, todayDateOnly } from '../lib/financeDates.js';
import { resolveInvoiceForPurchase } from './financeInvoiceService.js';

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function toNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw httpError('Informe um valor válido');
  return Math.round(n * 100) / 100;
}

async function loadParty(organizationId, partyId, type) {
  const party = await Party.findOne({ where: { id: partyId, organizationId } });
  if (!party) throw httpError('Parceiro não encontrado', 404);
  if (party.status === 'DISABLED') throw httpError('Parceiro desativado');
  if (type === 'despesa' && !party.isSupplier) {
    throw httpError('Despesa deve vincular um fornecedor');
  }
  if (type === 'receita' && !party.isCustomer) {
    throw httpError('Receita deve vincular um cliente');
  }
  return party;
}

async function loadCostCenter(organizationId, costCenterId) {
  const row = await CostCenter.findOne({
    where: { id: costCenterId, organizationId, status: 'ativa' },
  });
  if (!row) throw httpError('Centro de custo inválido');
  return row;
}

async function loadCategory(organizationId, categoryId, type) {
  const row = await FinanceCategory.findOne({
    where: { id: categoryId, organizationId, status: 'ativa' },
  });
  if (!row) throw httpError('Categoria inválida');
  if (row.type !== type) throw httpError('Categoria incompatível com o tipo do lançamento');
  return row;
}

const TX_INCLUDE = [
  { model: FinanceCategory, as: 'category' },
  { model: FinanceAccount, as: 'account' },
  { model: FinanceAccount, as: 'transferAccount' },
  { model: FinanceCard, as: 'card' },
  { model: Party, as: 'party' },
  { model: CostCenter, as: 'costCenter' },
];

export async function listTransactions(organizationId, query = {}) {
  await ensureBusinessCategories(organizationId);
  const where = { organizationId };
  if (query.type) where.type = query.type;
  if (query.status) where.status = query.status;
  if (query.accountId) where.accountId = query.accountId;
  if (query.cardId) where.cardId = query.cardId;
  if (query.partyId) where.partyId = query.partyId;
  if (query.costCenterId) where.costCenterId = query.costCenterId;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.from || query.to) {
    where.dueDate = {};
    if (query.from) where.dueDate[Op.gte] = query.from;
    if (query.to) where.dueDate[Op.lte] = query.to;
  }
  if (query.q) {
    where.description = { [Op.like]: `%${String(query.q).trim()}%` };
  }

  const rows = await FinanceTransaction.findAll({
    where,
    include: TX_INCLUDE,
    order: [['dueDate', 'DESC'], ['createdAt', 'DESC']],
    limit: Math.min(Number(query.limit) || 200, 500),
  });
  return rows.map((row) => row.toSafeJSON());
}

export async function getTransaction(organizationId, id) {
  const row = await FinanceTransaction.findOne({
    where: { id, organizationId },
    include: TX_INCLUDE,
  });
  if (!row) throw httpError('Lançamento não encontrado', 404);
  return row.toSafeJSON();
}

function nextRecurrenceDate(dateOnly, frequency) {
  if (frequency === 'semanal') return addDaysSafe(dateOnly, 7);
  if (frequency === 'anual') return addMonthsSafe(dateOnly, 12);
  return addMonthsSafe(dateOnly, 1);
}

async function createOne(organizationId, payload, extras = {}) {
  const row = await FinanceTransaction.create({
    organizationId,
    ...payload,
    ...extras,
  });
  return row;
}

export async function createTransaction(organizationId, body) {
  await ensureBusinessCategories(organizationId);
  const type = String(body?.type || '').toLowerCase();
  if (!['despesa', 'receita', 'transferencia'].includes(type)) {
    throw httpError('Tipo de lançamento inválido');
  }

  const description = String(body?.description || '').trim();
  if (!description) throw httpError('Informe a descrição');
  const amount = toNumber(body?.amount);
  const dueDate = toDateOnly(body?.dueDate);
  const modality = ['unico', 'recorrente', 'parcelado'].includes(body?.modality)
    ? body.modality
    : 'unico';

  if (type === 'transferencia') {
    const fromId = body?.accountId;
    const toId = body?.transferAccountId;
    if (!fromId || !toId) throw httpError('Informe as contas de origem e destino');
    if (fromId === toId) throw httpError('Contas de origem e destino devem ser diferentes');
    const [from, to] = await Promise.all([
      FinanceAccount.findOne({ where: { id: fromId, organizationId, status: 'ativa' } }),
      FinanceAccount.findOne({ where: { id: toId, organizationId, status: 'ativa' } }),
    ]);
    if (!from || !to) throw httpError('Conta inválida para transferência');

    const row = await createOne(organizationId, {
      type,
      description,
      amount,
      paidAmount: amount,
      dueDate,
      paidAt: dueDate,
      status: 'pago',
      modality: 'unico',
      accountId: fromId,
      transferAccountId: toId,
      cardId: null,
      categoryId: null,
      partyId: null,
      costCenterId: null,
      invoiceId: null,
      notes: String(body?.notes || '').trim() || null,
    });
    return getTransaction(organizationId, row.id);
  }

  const partyId = body?.partyId || null;
  const costCenterId = body?.costCenterId;
  const categoryId = body?.categoryId;
  if (!costCenterId) throw httpError('Informe o centro de custo');
  if (!categoryId) throw httpError('Informe a categoria');

  if (partyId) await loadParty(organizationId, partyId, type);
  await loadCostCenter(organizationId, costCenterId);
  await loadCategory(organizationId, categoryId, type);

  const accountId = body?.accountId || null;
  const cardId = body?.cardId || null;
  if (Boolean(accountId) === Boolean(cardId)) {
    throw httpError('Informe conta ou cartão (apenas um)');
  }

  let card = null;
  if (cardId) {
    card = await FinanceCard.findOne({
      where: { id: cardId, organizationId, status: 'ativo' },
    });
    if (!card) throw httpError('Cartão inválido');
  } else {
    const account = await FinanceAccount.findOne({
      where: { id: accountId, organizationId, status: 'ativa' },
    });
    if (!account) throw httpError('Conta inválida');
  }

  let invoiceId = null;
  let invoicePreview = null;
  if (card?.type === 'credito') {
    const resolved = await resolveInvoiceForPurchase(organizationId, card.id, dueDate);
    invoiceId = resolved.invoice.id;
    invoicePreview = resolved.preview;
  }

  const autoSettle = card?.type === 'debito' || Boolean(body?.settleNow);
  const settledStatus = type === 'receita' ? 'recebido' : 'pago';
  const baseStatus = autoSettle && card?.type !== 'credito' ? settledStatus : 'pendente';
  const paidAt = baseStatus !== 'pendente' ? toDateOnly(body?.paidAt || dueDate) : null;
  const paidAmount = baseStatus !== 'pendente' ? amount : null;

  if (modality === 'parcelado') {
    const total = Math.min(Math.max(Number(body?.installmentTotal) || 0, 2), 60);
    const groupId = randomUUID();
    const created = [];
    for (let i = 1; i <= total; i += 1) {
      const installmentDate = addMonthsSafe(dueDate, i - 1);
      const settleThis = autoSettle && card?.type !== 'credito' && i === 1;
      let itemInvoiceId = invoiceId;
      if (card?.type === 'credito') {
        const resolved = await resolveInvoiceForPurchase(organizationId, card.id, installmentDate);
        itemInvoiceId = resolved.invoice.id;
      }
      const row = await createOne(organizationId, {
        type,
        description: `${description} (${i}/${total})`,
        amount,
        paidAmount: settleThis ? amount : null,
        dueDate: installmentDate,
        paidAt: settleThis ? installmentDate : null,
        status: settleThis ? settledStatus : 'pendente',
        modality: 'parcelado',
        accountId: card ? null : accountId,
        cardId: card ? card.id : null,
        invoiceId: itemInvoiceId,
        categoryId,
        partyId,
        costCenterId,
        installmentGroupId: groupId,
        installmentNumber: i,
        installmentTotal: total,
        notes: String(body?.notes || '').trim() || null,
      });
      created.push(row.id);
    }
    const first = await getTransaction(organizationId, created[0]);
    return { ...first, createdIds: created, invoicePreview };
  }

  if (modality === 'recorrente') {
    const frequency = ['semanal', 'mensal', 'anual'].includes(body?.recurrenceFrequency)
      ? body.recurrenceFrequency
      : 'mensal';
    const horizon =
      frequency === 'semanal' ? 12 : frequency === 'anual' ? 3 : 12;
    const masterId = randomUUID();
    const created = [];
    let cursor = dueDate;
    for (let i = 0; i < horizon; i += 1) {
      const settleThis = autoSettle && card?.type !== 'credito' && i === 0;
      let itemInvoiceId = null;
      if (card?.type === 'credito') {
        const resolved = await resolveInvoiceForPurchase(organizationId, card.id, cursor);
        itemInvoiceId = resolved.invoice.id;
      }
      const row = await createOne(organizationId, {
        type,
        description,
        amount,
        paidAmount: settleThis ? amount : null,
        dueDate: cursor,
        paidAt: settleThis ? cursor : null,
        status: settleThis ? settledStatus : 'pendente',
        modality: 'recorrente',
        recurrenceFrequency: frequency,
        masterTransactionId: masterId,
        isRecurrenceMaster: i === 0,
        accountId: card ? null : accountId,
        cardId: card ? card.id : null,
        invoiceId: itemInvoiceId,
        categoryId,
        partyId,
        costCenterId,
        notes: String(body?.notes || '').trim() || null,
      });
      created.push(row.id);
      cursor = nextRecurrenceDate(cursor, frequency);
    }
    const first = await getTransaction(organizationId, created[0]);
    return { ...first, createdIds: created, invoicePreview };
  }

  const row = await createOne(organizationId, {
    type,
    description,
    amount,
    paidAmount,
    dueDate,
    paidAt,
    status: card?.type === 'credito' ? 'pendente' : baseStatus,
    modality: 'unico',
    accountId: card ? null : accountId,
    cardId: card ? card.id : null,
    invoiceId,
    categoryId,
    partyId,
    costCenterId,
    notes: String(body?.notes || '').trim() || null,
  });
  const data = await getTransaction(organizationId, row.id);
  return { ...data, invoicePreview };
}

export async function settleTransaction(organizationId, id, body = {}) {
  const row = await FinanceTransaction.findOne({ where: { id, organizationId } });
  if (!row) throw httpError('Lançamento não encontrado', 404);
  if (row.status === 'cancelado') throw httpError('Lançamento cancelado');
  if (row.type === 'transferencia') throw httpError('Transferência já está liquidada');
  if (row.cardId) {
    const card = await FinanceCard.findByPk(row.cardId);
    if (card?.type === 'credito') {
      throw httpError('Baixa de compra no crédito é feita pelo pagamento da fatura');
    }
  }
  if (row.status === 'pago' || row.status === 'recebido') {
    return getTransaction(organizationId, id);
  }
  const paidAt = toDateOnly(body.paidAt || todayDateOnly());
  row.status = row.type === 'receita' ? 'recebido' : 'pago';
  row.paidAt = paidAt;
  row.paidAmount = body.paidAmount != null ? toNumber(body.paidAmount) : Number(row.amount);
  await row.save();
  return getTransaction(organizationId, id);
}

export async function unsettleTransaction(organizationId, id) {
  const row = await FinanceTransaction.findOne({ where: { id, organizationId } });
  if (!row) throw httpError('Lançamento não encontrado', 404);
  if (row.type === 'transferencia') throw httpError('Não é possível estornar transferência assim');
  if (row.cardId) {
    const card = await FinanceCard.findByPk(row.cardId);
    if (card?.type === 'credito' && row.invoiceId) {
      throw httpError('Use o desfazer pagamento da fatura');
    }
  }
  row.status = 'pendente';
  row.paidAt = null;
  row.paidAmount = null;
  await row.save();
  return getTransaction(organizationId, id);
}

export async function cancelTransaction(organizationId, id, { scope = 'this' } = {}) {
  const row = await FinanceTransaction.findOne({ where: { id, organizationId } });
  if (!row) throw httpError('Lançamento não encontrado', 404);

  if (scope === 'series' && row.masterTransactionId) {
    await FinanceTransaction.update(
      { status: 'cancelado', paidAt: null, paidAmount: null },
      {
        where: {
          organizationId,
          masterTransactionId: row.masterTransactionId,
          status: { [Op.ne]: 'cancelado' },
          dueDate: { [Op.gte]: row.dueDate },
        },
      },
    );
  } else if (scope === 'series' && row.installmentGroupId) {
    await FinanceTransaction.update(
      { status: 'cancelado', paidAt: null, paidAmount: null },
      {
        where: {
          organizationId,
          installmentGroupId: row.installmentGroupId,
          status: { [Op.ne]: 'cancelado' },
          installmentNumber: { [Op.gte]: row.installmentNumber || 1 },
        },
      },
    );
  } else {
    row.status = 'cancelado';
    row.paidAt = null;
    row.paidAmount = null;
    await row.save();
  }
  return getTransaction(organizationId, id);
}

export async function updateTransaction(organizationId, id, body) {
  const row = await FinanceTransaction.findOne({ where: { id, organizationId } });
  if (!row) throw httpError('Lançamento não encontrado', 404);
  if (row.status === 'cancelado') throw httpError('Lançamento cancelado');
  if (row.type === 'transferencia') throw httpError('Edição de transferência não suportada nesta versão');

  if (body.description != null) {
    const description = String(body.description).trim();
    if (!description) throw httpError('Informe a descrição');
    row.description = description;
  }
  if (body.amount != null) row.amount = toNumber(body.amount);
  if (body.dueDate != null) row.dueDate = toDateOnly(body.dueDate);
  if (body.notes != null) row.notes = String(body.notes).trim() || null;

  if (body.categoryId) {
    await loadCategory(organizationId, body.categoryId, row.type);
    row.categoryId = body.categoryId;
  }
  if (body.partyId !== undefined) {
    if (!body.partyId) {
      row.partyId = null;
    } else {
      await loadParty(organizationId, body.partyId, row.type);
      row.partyId = body.partyId;
    }
  }
  if (body.costCenterId) {
    await loadCostCenter(organizationId, body.costCenterId);
    row.costCenterId = body.costCenterId;
  }

  await row.save();
  return getTransaction(organizationId, id);
}

export async function computeAccountBalance(organizationId, accountId) {
  const account = await FinanceAccount.findOne({ where: { id: accountId, organizationId } });
  if (!account) throw httpError('Conta não encontrada', 404);

  const rows = await FinanceTransaction.findAll({
    where: {
      organizationId,
      status: { [Op.in]: ['pago', 'recebido'] },
      [Op.or]: [{ accountId }, { transferAccountId: accountId }],
    },
  });

  let balance = Number(account.initialBalance || 0);
  for (const row of rows) {
    const amount = Number(row.amount || 0);
    if (row.type === 'receita' && row.accountId === accountId) balance += amount;
    else if (row.type === 'despesa' && row.accountId === accountId) balance -= amount;
    else if (row.type === 'transferencia' && row.accountId === accountId) balance -= amount;
    else if (row.type === 'transferencia' && row.transferAccountId === accountId) balance += amount;
  }
  return { accountId, balance: Math.round(balance * 100) / 100 };
}
