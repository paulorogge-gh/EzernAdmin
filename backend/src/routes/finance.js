import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import { requireAuth, requireRole, loadUser } from '../middleware/auth.js';
import {
  CostCenter,
  FinanceAccount,
  FinanceCard,
  FinanceCategory,
  FinanceInvoice,
  FinanceTransaction,
  FinanceTransactionAttachment,
} from '../models/index.js';
import { ensureBusinessCategories } from '../lib/financeCategorySeed.js';
import { todayDateOnly, toDateOnly } from '../lib/financeDates.js';
import {
  MAX_FILE_SIZE,
  MAX_FILES_PER_UPLOAD,
  detectSafeType,
  financeTransactionAttachmentBlobPath,
  sanitizeOriginalName,
} from '../lib/safeFile.js';
import {
  cancelTransaction,
  computeAccountBalance,
  createTransaction,
  getTransaction,
  listTransactions,
  settleTransaction,
  unsettleTransaction,
  updateTransaction,
} from '../services/financeTransactionService.js';
import {
  closeInvoice,
  ensureFutureInvoices,
  payInvoice,
  reopenInvoice,
  serializeInvoice,
  unpayInvoice,
} from '../services/financeInvoiceService.js';
import { deleteBlob, downloadBlob, uploadBlob } from '../services/blob.js';

export const financeRouter = Router();
financeRouter.use(requireAuth, loadUser, requireRole('OWNER', 'ADMIN'));

const uploadAttachments = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES_PER_UPLOAD },
});

function orgId(req) {
  return req.auth.organizationId;
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function blobConfigured(res) {
  if (env.blob.connectionString) return true;
  res.status(503).json({ error: { message: 'Armazenamento de arquivos não configurado' } });
  return false;
}

async function findOrgTransaction(organizationId, transactionId) {
  return FinanceTransaction.findOne({
    where: { id: transactionId, organizationId },
  });
}

/* ---------- Accounts ---------- */
financeRouter.get(
  '/a',
  asyncHandler(async (req, res) => {
    const rows = await FinanceAccount.findAll({
      where: { organizationId: orgId(req) },
      order: [['name', 'ASC']],
    });
    const data = [];
    for (const row of rows) {
      const json = row.toSafeJSON();
      try {
        const bal = await computeAccountBalance(orgId(req), row.id);
        json.currentBalance = bal.balance;
      } catch {
        json.currentBalance = Number(row.initialBalance || 0);
      }
      data.push(json);
    }
    res.json({ data });
  }),
);

financeRouter.post(
  '/a',
  asyncHandler(async (req, res) => {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: { message: 'Informe o nome da conta' } });
    const type = ['corrente', 'poupanca', 'investimento', 'caixa'].includes(req.body?.type)
      ? req.body.type
      : 'corrente';
    const initialBalanceDate = toDateOnly(req.body?.initialBalanceDate || todayDateOnly());
    const row = await FinanceAccount.create({
      organizationId: orgId(req),
      name,
      type,
      institutionCode: String(req.body?.institutionCode || '').trim() || null,
      institutionName: String(req.body?.institutionName || '').trim() || null,
      agency: String(req.body?.agency || '').trim() || null,
      accountNumber: String(req.body?.accountNumber || '').trim() || null,
      iconKey: String(req.body?.iconKey || 'bank').trim() || 'bank',
      initialBalance: Number(req.body?.initialBalance || 0),
      initialBalanceDate,
      status: req.body?.status === 'inativa' ? 'inativa' : 'ativa',
      includeInConsolidated: req.body?.includeInConsolidated !== false,
    });
    res.status(201).json({ data: row.toSafeJSON() });
  }),
);

financeRouter.patch(
  '/a/:id',
  asyncHandler(async (req, res) => {
    const row = await FinanceAccount.findOne({
      where: { id: req.params.id, organizationId: orgId(req) },
    });
    if (!row) return res.status(404).json({ error: { message: 'Conta não encontrada' } });
    if (req.body?.name != null) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ error: { message: 'Informe o nome da conta' } });
      row.name = name;
    }
    if (req.body?.type && ['corrente', 'poupanca', 'investimento', 'caixa'].includes(req.body.type)) {
      row.type = req.body.type;
    }
    if (req.body?.institutionCode !== undefined) {
      row.institutionCode = String(req.body.institutionCode || '').trim() || null;
    }
    if (req.body?.institutionName !== undefined) {
      row.institutionName = String(req.body.institutionName || '').trim() || null;
    }
    if (req.body?.agency !== undefined) row.agency = String(req.body.agency || '').trim() || null;
    if (req.body?.accountNumber !== undefined) {
      row.accountNumber = String(req.body.accountNumber || '').trim() || null;
    }
    if (req.body?.iconKey) row.iconKey = String(req.body.iconKey).trim();
    if (req.body?.initialBalance != null) row.initialBalance = Number(req.body.initialBalance);
    if (req.body?.initialBalanceDate) row.initialBalanceDate = toDateOnly(req.body.initialBalanceDate);
    if (req.body?.status === 'ativa' || req.body?.status === 'inativa') row.status = req.body.status;
    if (req.body?.includeInConsolidated != null) {
      row.includeInConsolidated = Boolean(req.body.includeInConsolidated);
    }
    await row.save();
    res.json({ data: row.toSafeJSON() });
  }),
);

/* ---------- Cards ---------- */
financeRouter.get(
  '/k',
  asyncHandler(async (req, res) => {
    const rows = await FinanceCard.findAll({
      where: { organizationId: orgId(req) },
      include: [{ model: FinanceAccount, as: 'account' }],
      order: [['name', 'ASC']],
    });
    res.json({ data: rows.map((row) => row.toSafeJSON()) });
  }),
);

financeRouter.post(
  '/k',
  asyncHandler(async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const type = req.body?.type === 'debito' ? 'debito' : 'credito';
    const accountId = req.body?.accountId;
    if (!name) return res.status(400).json({ error: { message: 'Informe o nome do cartão' } });
    if (!accountId) return res.status(400).json({ error: { message: 'Vincule uma conta' } });
    const account = await FinanceAccount.findOne({
      where: { id: accountId, organizationId: orgId(req) },
    });
    if (!account) return res.status(400).json({ error: { message: 'Conta inválida' } });
    if (type === 'credito') {
      const closingDay = Number(req.body?.closingDay);
      const dueDay = Number(req.body?.dueDay);
      if (!closingDay || !dueDay) {
        return res.status(400).json({
          error: { message: 'Informe dia de fechamento e vencimento' },
        });
      }
    }
    const row = await FinanceCard.create({
      organizationId: orgId(req),
      name,
      type,
      brand: String(req.body?.brand || '').trim() || null,
      accountId,
      iconKey: String(req.body?.iconKey || 'card').trim() || 'card',
      closingDay: type === 'credito' ? Number(req.body.closingDay) : null,
      dueDay: type === 'credito' ? Number(req.body.dueDay) : null,
      creditLimit: req.body?.creditLimit != null ? Number(req.body.creditLimit) : null,
      status: req.body?.status === 'inativo' ? 'inativo' : 'ativo',
    });
    if (row.type === 'credito') await ensureFutureInvoices(orgId(req), row);
    const full = await FinanceCard.findByPk(row.id, {
      include: [{ model: FinanceAccount, as: 'account' }],
    });
    res.status(201).json({ data: full.toSafeJSON() });
  }),
);

financeRouter.patch(
  '/k/:id',
  asyncHandler(async (req, res) => {
    const row = await FinanceCard.findOne({
      where: { id: req.params.id, organizationId: orgId(req) },
    });
    if (!row) return res.status(404).json({ error: { message: 'Cartão não encontrado' } });
    if (req.body?.name != null) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ error: { message: 'Informe o nome do cartão' } });
      row.name = name;
    }
    if (req.body?.brand !== undefined) row.brand = String(req.body.brand || '').trim() || null;
    if (req.body?.accountId) {
      const account = await FinanceAccount.findOne({
        where: { id: req.body.accountId, organizationId: orgId(req) },
      });
      if (!account) return res.status(400).json({ error: { message: 'Conta inválida' } });
      row.accountId = account.id;
    }
    if (req.body?.closingDay != null) row.closingDay = Number(req.body.closingDay);
    if (req.body?.dueDay != null) row.dueDay = Number(req.body.dueDay);
    if (req.body?.creditLimit !== undefined) {
      row.creditLimit = req.body.creditLimit != null ? Number(req.body.creditLimit) : null;
    }
    if (req.body?.status === 'ativo' || req.body?.status === 'inativo') row.status = req.body.status;
    await row.save();
    if (row.type === 'credito') await ensureFutureInvoices(orgId(req), row);
    const full = await FinanceCard.findByPk(row.id, {
      include: [{ model: FinanceAccount, as: 'account' }],
    });
    res.json({ data: full.toSafeJSON() });
  }),
);

/* ---------- Categories ---------- */
financeRouter.get(
  '/g',
  asyncHandler(async (req, res) => {
    await ensureBusinessCategories(orgId(req));
    const where = { organizationId: orgId(req) };
    if (req.query.type === 'despesa' || req.query.type === 'receita') where.type = req.query.type;
    const rows = await FinanceCategory.findAll({
      where,
      order: [['type', 'ASC'], ['name', 'ASC']],
    });
    res.json({ data: rows.map((row) => row.toSafeJSON()) });
  }),
);

financeRouter.post(
  '/g',
  asyncHandler(async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const type = req.body?.type === 'receita' ? 'receita' : 'despesa';
    if (!name) return res.status(400).json({ error: { message: 'Informe o nome da categoria' } });
    const row = await FinanceCategory.create({
      organizationId: orgId(req),
      name,
      type,
      parentId: req.body?.parentId || null,
      iconKey: String(req.body?.iconKey || 'tag').trim() || 'tag',
      color: String(req.body?.color || '#0f9f90').trim() || '#0f9f90',
      status: req.body?.status === 'inativa' ? 'inativa' : 'ativa',
      isSystemSeed: false,
    });
    res.status(201).json({ data: row.toSafeJSON() });
  }),
);

financeRouter.patch(
  '/g/:id',
  asyncHandler(async (req, res) => {
    const organizationId = orgId(req);
    const row = await FinanceCategory.findOne({
      where: { id: req.params.id, organizationId },
    });
    if (!row) return res.status(404).json({ error: { message: 'Categoria não encontrada' } });
    if (req.body?.name != null) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ error: { message: 'Informe o nome' } });
      row.name = name;
    }

    const nextType =
      req.body?.type === 'receita' || req.body?.type === 'despesa' ? req.body.type : row.type;
    const typeChanged = nextType !== row.type;

    if (req.body?.parentId !== undefined) {
      const parentId = req.body.parentId || null;
      if (parentId) {
        if (parentId === row.id) {
          return res.status(400).json({ error: { message: 'Categoria pai inválida' } });
        }
        const parent = await FinanceCategory.findOne({
          where: { id: parentId, organizationId },
        });
        if (!parent || parent.type !== nextType) {
          return res.status(400).json({
            error: { message: 'Categoria pai deve ser do mesmo tipo' },
          });
        }
        if (parent.parentId) {
          return res.status(400).json({
            error: { message: 'Selecione uma categoria raiz como pai' },
          });
        }
      }
      row.parentId = parentId;
    } else if (typeChanged && row.parentId) {
      const parent = await FinanceCategory.findOne({
        where: { id: row.parentId, organizationId },
      });
      if (!parent || parent.type !== nextType) {
        row.parentId = null;
      }
    }

    if (typeChanged) {
      row.type = nextType;
      await FinanceCategory.update(
        { type: nextType },
        { where: { organizationId, parentId: row.id } },
      );
    }

    if (req.body?.iconKey) row.iconKey = String(req.body.iconKey).trim();
    if (req.body?.color) row.color = String(req.body.color).trim();
    if (req.body?.status === 'ativa' || req.body?.status === 'inativa') row.status = req.body.status;
    await row.save();
    res.json({ data: row.toSafeJSON() });
  }),
);

/* ---------- Cost centers ---------- */
financeRouter.get(
  '/o',
  asyncHandler(async (req, res) => {
    const rows = await CostCenter.findAll({
      where: { organizationId: orgId(req) },
      order: [['name', 'ASC']],
    });
    res.json({ data: rows.map((row) => row.toSafeJSON()) });
  }),
);

financeRouter.post(
  '/o',
  asyncHandler(async (req, res) => {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: { message: 'Informe o nome do centro de custo' } });
    const row = await CostCenter.create({
      organizationId: orgId(req),
      name,
      code: String(req.body?.code || '').trim() || null,
      parentId: null,
      status: req.body?.status === 'inativa' ? 'inativa' : 'ativa',
    });
    res.status(201).json({ data: row.toSafeJSON() });
  }),
);

financeRouter.patch(
  '/o/:id',
  asyncHandler(async (req, res) => {
    const row = await CostCenter.findOne({
      where: { id: req.params.id, organizationId: orgId(req) },
    });
    if (!row) return res.status(404).json({ error: { message: 'Centro de custo não encontrado' } });
    if (req.body?.name != null) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ error: { message: 'Informe o nome' } });
      row.name = name;
    }
    if (req.body?.code !== undefined) row.code = String(req.body.code || '').trim() || null;
    if (req.body?.status === 'ativa' || req.body?.status === 'inativa') row.status = req.body.status;
    await row.save();
    res.json({ data: row.toSafeJSON() });
  }),
);

/* ---------- Transactions ---------- */
financeRouter.get(
  '/t',
  asyncHandler(async (req, res) => {
    const data = await listTransactions(orgId(req), req.query);
    res.json({ data });
  }),
);

financeRouter.get(
  '/t/:id',
  asyncHandler(async (req, res) => {
    const data = await getTransaction(orgId(req), req.params.id);
    res.json({ data });
  }),
);

financeRouter.post(
  '/t',
  asyncHandler(async (req, res) => {
    const data = await createTransaction(orgId(req), req.body);
    res.status(201).json({ data });
  }),
);

financeRouter.patch(
  '/t/:id',
  asyncHandler(async (req, res) => {
    const data = await updateTransaction(orgId(req), req.params.id, req.body);
    res.json({ data });
  }),
);

financeRouter.post(
  '/t/:id/s',
  asyncHandler(async (req, res) => {
    const data = await settleTransaction(orgId(req), req.params.id, req.body);
    res.json({ data });
  }),
);

financeRouter.post(
  '/t/:id/u',
  asyncHandler(async (req, res) => {
    const data = await unsettleTransaction(orgId(req), req.params.id);
    res.json({ data });
  }),
);

financeRouter.post(
  '/t/:id/x',
  asyncHandler(async (req, res) => {
    const data = await cancelTransaction(orgId(req), req.params.id, {
      scope: req.body?.scope === 'series' ? 'series' : 'this',
    });
    res.json({ data });
  }),
);

/* ---------- Transaction attachments ---------- */
financeRouter.get(
  '/t/:id/f',
  asyncHandler(async (req, res) => {
    const row = await findOrgTransaction(orgId(req), req.params.id);
    if (!row) return res.status(404).json({ error: { message: 'Lançamento não encontrado' } });
    const files = await FinanceTransactionAttachment.findAll({
      where: { organizationId: orgId(req), transactionId: row.id },
      order: [['createdAt', 'DESC']],
    });
    res.json({ data: files.map((item) => item.toSafeJSON()) });
  }),
);

financeRouter.post(
  '/t/:id/f',
  uploadAttachments.array('files', MAX_FILES_PER_UPLOAD),
  asyncHandler(async (req, res) => {
    if (!blobConfigured(res)) return;
    const row = await findOrgTransaction(orgId(req), req.params.id);
    if (!row) return res.status(404).json({ error: { message: 'Lançamento não encontrado' } });

    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      return res.status(400).json({ error: { message: 'Selecione ao menos um arquivo' } });
    }

    const created = [];
    for (const file of files) {
      const check = await detectSafeType(file.buffer, file.mimetype);
      if (!check.ok) {
        return res.status(400).json({
          error: { message: `${sanitizeOriginalName(file.originalname)}: ${check.message}` },
        });
      }

      const attachmentId = randomUUID();
      const blobName = financeTransactionAttachmentBlobPath(
        orgId(req),
        row.id,
        attachmentId,
        check.ext,
      );

      await uploadBlob(blobName, file.buffer, check.mime);

      try {
        const attachment = await FinanceTransactionAttachment.create({
          id: attachmentId,
          organizationId: orgId(req),
          transactionId: row.id,
          blobName,
          originalName: sanitizeOriginalName(file.originalname),
          contentType: check.mime,
          sizeBytes: file.size,
          uploadedBy: req.auth.userId || null,
        });
        created.push(attachment.toSafeJSON());
      } catch (err) {
        await deleteBlob(blobName).catch(() => undefined);
        throw err;
      }
    }

    res.status(201).json({ data: created });
  }),
);

financeRouter.get(
  '/t/:id/f/:fid/y',
  asyncHandler(async (req, res) => {
    if (!blobConfigured(res)) return;
    const attachment = await FinanceTransactionAttachment.findOne({
      where: {
        id: req.params.fid,
        transactionId: req.params.id,
        organizationId: orgId(req),
      },
    });
    if (!attachment) {
      return res.status(404).json({ error: { message: 'Arquivo não encontrado' } });
    }

    const file = await downloadBlob(attachment.blobName);
    const safeName = sanitizeOriginalName(attachment.originalName).replace(/"/g, '');
    res.setHeader('Content-Type', attachment.contentType || file.contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
    );
    return res.send(file.buffer);
  }),
);

financeRouter.delete(
  '/t/:id/f/:fid',
  asyncHandler(async (req, res) => {
    const attachment = await FinanceTransactionAttachment.findOne({
      where: {
        id: req.params.fid,
        transactionId: req.params.id,
        organizationId: orgId(req),
      },
    });
    if (!attachment) {
      return res.status(404).json({ error: { message: 'Arquivo não encontrado' } });
    }

    const blobName = attachment.blobName;
    await attachment.destroy();
    if (env.blob.connectionString) {
      await deleteBlob(blobName).catch(() => undefined);
    }
    return res.status(204).send();
  }),
);

/* ---------- Invoices ---------- */
financeRouter.get(
  '/i',
  asyncHandler(async (req, res) => {
    const where = { organizationId: orgId(req) };
    if (req.query.cardId) where.cardId = req.query.cardId;
    if (req.query.status) where.status = req.query.status;
    const rows = await FinanceInvoice.findAll({
      where,
      include: [{ model: FinanceCard, as: 'card', include: [{ model: FinanceAccount, as: 'account' }] }],
      order: [['dueDate', 'DESC']],
    });
    const data = [];
    for (const row of rows) data.push(await serializeInvoice(orgId(req), row));
    res.json({ data });
  }),
);

financeRouter.post(
  '/i/m',
  asyncHandler(async (req, res) => {
    const cards = await FinanceCard.findAll({
      where: { organizationId: orgId(req), type: 'credito', status: 'ativo' },
    });
    for (const card of cards) await ensureFutureInvoices(orgId(req), card);
    res.json({ data: { ok: true, cards: cards.length } });
  }),
);

financeRouter.get(
  '/i/:id',
  asyncHandler(async (req, res) => {
    const row = await FinanceInvoice.findOne({
      where: { id: req.params.id, organizationId: orgId(req) },
      include: [{ model: FinanceCard, as: 'card', include: [{ model: FinanceAccount, as: 'account' }] }],
    });
    if (!row) return res.status(404).json({ error: { message: 'Fatura não encontrada' } });
    res.json({ data: await serializeInvoice(orgId(req), row, { withItems: true }) });
  }),
);

financeRouter.post(
  '/i/:id/p',
  asyncHandler(async (req, res) => {
    const data = await payInvoice(orgId(req), req.params.id, req.body);
    res.json({ data });
  }),
);

financeRouter.post(
  '/i/:id/q',
  asyncHandler(async (req, res) => {
    const data = await unpayInvoice(orgId(req), req.params.id);
    res.json({ data });
  }),
);

financeRouter.post(
  '/i/:id/c',
  asyncHandler(async (req, res) => {
    const data = await closeInvoice(orgId(req), req.params.id);
    res.json({ data });
  }),
);

financeRouter.post(
  '/i/:id/r',
  asyncHandler(async (req, res) => {
    const data = await reopenInvoice(orgId(req), req.params.id);
    res.json({ data });
  }),
);
