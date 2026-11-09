import { Op } from 'sequelize';
import { sequelize } from '../db/index.js';
import { FinanceCategory } from '../models/FinanceCategory.js';

/** Categorias empresariais padrão (seed por organização). */
export const BUSINESS_CATEGORIES_SEED = [
  { key: 'receitas_operacionais', name: 'Receitas operacionais', type: 'receita', iconKey: 'briefcase', color: '#0f9f90' },
  { key: 'servicos', name: 'Serviços', type: 'receita', iconKey: 'briefcase', color: '#3dd6c6', parentKey: 'receitas_operacionais' },
  { key: 'produtos', name: 'Produtos', type: 'receita', iconKey: 'tag', color: '#2aa876', parentKey: 'receitas_operacionais' },
  { key: 'outras_receitas', name: 'Outras receitas', type: 'receita', iconKey: 'plus', color: '#7a8ba0' },
  { key: 'desconto', name: 'Desconto', type: 'receita', iconKey: 'percent', color: '#3d8f5a' },

  { key: 'pessoal', name: 'Despesas com pessoal', type: 'despesa', iconKey: 'users', color: '#5b8def' },
  { key: 'fornecedores', name: 'Fornecedores', type: 'despesa', iconKey: 'truck', color: '#e07a3d' },
  { key: 'impostos', name: 'Impostos', type: 'despesa', iconKey: 'percent', color: '#d64550' },
  { key: 'aluguel', name: 'Aluguel', type: 'despesa', iconKey: 'home', color: '#5b8def' },
  { key: 'utilidades', name: 'Utilidades', type: 'despesa', iconKey: 'bolt', color: '#f0a500' },
  { key: 'marketing', name: 'Marketing', type: 'despesa', iconKey: 'spark', color: '#6c5ce7' },
  { key: 'tarifas', name: 'Tarifa bancária', type: 'despesa', iconKey: 'bank', color: '#7a8ba0' },
  { key: 'fatura_cartao', name: 'Fatura cartão', type: 'despesa', iconKey: 'card', color: '#6c5ce7' },
  { key: 'juros_multa', name: 'Juros/Multa', type: 'despesa', iconKey: 'alert', color: '#d64550' },
  { key: 'outras_despesas', name: 'Outras despesas', type: 'despesa', iconKey: 'tag', color: '#7a8ba0' },
];

async function findOrCreateCategory(organizationId, item, parentId, transaction) {
  const where = {
    organizationId,
    type: item.type,
    name: item.name,
    parentId: parentId || null,
  };
  const existing = await FinanceCategory.findOne({ where, transaction });
  if (existing) return { row: existing, created: false };

  try {
    const row = await FinanceCategory.create(
      {
        ...where,
        iconKey: item.iconKey,
        color: item.color,
        status: 'ativa',
        isSystemSeed: true,
      },
      { transaction },
    );
    return { row, created: true };
  } catch (err) {
    const raced = await FinanceCategory.findOne({ where, transaction });
    if (raced) return { row: raced, created: false };
    throw err;
  }
}

export async function ensureBusinessCategories(organizationId) {
  return sequelize.transaction(async (transaction) => {
    const byKey = new Map();
    let created = 0;

    for (const item of BUSINESS_CATEGORIES_SEED.filter((row) => !row.parentKey)) {
      const result = await findOrCreateCategory(organizationId, item, null, transaction);
      byKey.set(item.key, result.row);
      if (result.created) created += 1;
    }

    for (const item of BUSINESS_CATEGORIES_SEED.filter((row) => row.parentKey)) {
      const parent = byKey.get(item.parentKey);
      const result = await findOrCreateCategory(
        organizationId,
        item,
        parent?.id || null,
        transaction,
      );
      byKey.set(item.key, result.row);
      if (result.created) created += 1;
    }

    return { created };
  });
}

/** Remove duplicatas (mesmo org/tipo/nome/pai), reatribuindo filhos e lançamentos. */
export async function dedupeFinanceCategories() {
  let deletedTotal = 0;

  for (let pass = 0; pass < 5; pass += 1) {
    const rows = await FinanceCategory.findAll({
      order: [['createdAt', 'ASC'], ['id', 'ASC']],
    });
    const keepByKey = new Map();
    const remap = new Map();
    const toDelete = [];

    for (const row of rows) {
      const key = `${row.organizationId}|${row.type}|${row.name}|${row.parentId || ''}`;
      if (!keepByKey.has(key)) {
        keepByKey.set(key, row.id);
        continue;
      }
      remap.set(row.id, keepByKey.get(key));
      toDelete.push(row.id);
    }

    if (!toDelete.length) break;

    for (const [fromId, toId] of remap) {
      await FinanceCategory.update({ parentId: toId }, { where: { parentId: fromId } });
      await sequelize.query(
        `UPDATE finance_transactions SET category_id = :toId WHERE category_id = :fromId`,
        { replacements: { toId, fromId } },
      );
    }

    await FinanceCategory.destroy({ where: { id: { [Op.in]: toDelete } } });
    deletedTotal += toDelete.length;
  }

  return { deleted: deletedTotal };
}

export async function findInvoiceCategory(organizationId) {
  await ensureBusinessCategories(organizationId);
  const row = await FinanceCategory.findOne({
    where: {
      organizationId,
      type: 'despesa',
      name: 'Fatura cartão',
      status: 'ativa',
    },
  });
  return row;
}
