import { sequelize } from './index.js';

const USER_COLUMNS = [
  ['phone', 'VARCHAR(32) NULL'],
  ['whatsapp_username', 'VARCHAR(80) NULL'],
  ['address_street', 'VARCHAR(190) NULL'],
  ['address_number', 'VARCHAR(30) NULL'],
  ['address_complement', 'VARCHAR(120) NULL'],
  ['address_neighborhood', 'VARCHAR(120) NULL'],
  ['address_district', 'VARCHAR(120) NULL'],
  ['address_city', 'VARCHAR(120) NULL'],
  ['address_state', 'VARCHAR(80) NULL'],
  ['address_country', 'VARCHAR(80) NULL'],
  ['address_zip', 'VARCHAR(20) NULL'],
  ['address_place_id', 'VARCHAR(255) NULL'],
  ['address_formatted', 'VARCHAR(255) NULL'],
];

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT 1 AS ok
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :table
       AND COLUMN_NAME = :column
     LIMIT 1`,
    { replacements: { table, column } },
  );
  return rows.length > 0;
}

async function ensureUserColumns() {
  for (const [column, definition] of USER_COLUMNS) {
    if (await columnExists('users', column)) continue;
    await sequelize.query(`ALTER TABLE \`users\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`[migrate] users.${column} adicionada`);
  }
}

async function ensureRefreshTokenFamily() {
  if (!(await columnExists('refresh_tokens', 'family_id'))) {
    await sequelize.query(
      'ALTER TABLE `refresh_tokens` ADD COLUMN `family_id` CHAR(36) NULL',
    );
    console.log('[migrate] refresh_tokens.family_id adicionada');
  }

  await sequelize.query(
    `UPDATE \`refresh_tokens\`
     SET \`family_id\` = UUID()
     WHERE \`family_id\` IS NULL OR \`family_id\` = ''`,
  );

  await sequelize.query(
    'ALTER TABLE `refresh_tokens` MODIFY COLUMN `family_id` CHAR(36) NOT NULL',
  );

  const [indexes] = await sequelize.query('SHOW INDEX FROM `refresh_tokens`');
  const hasFamilyIndex = indexes.some((row) => row.Key_name === 'refresh_tokens_family_id');
  if (!hasFamilyIndex) {
    await sequelize.query(
      'CREATE INDEX `refresh_tokens_family_id` ON `refresh_tokens` (`family_id`)',
    );
    console.log('[migrate] índice refresh_tokens_family_id criado');
  }
}

async function cleanupDuplicateEmailUniques() {
  const [indexes] = await sequelize.query(
    `SHOW INDEX FROM \`users\` WHERE Column_name = 'email' AND Non_unique = 0`,
  );

  const byName = new Map();
  for (const row of indexes) {
    byName.set(row.Key_name, row);
  }

  const names = [...byName.keys()].filter((name) => name !== 'PRIMARY');
  if (names.length <= 1) return;

  const keep = names.includes('email') ? 'email' : names[0];
  for (const name of names) {
    if (name === keep) continue;
    await sequelize.query(`ALTER TABLE \`users\` DROP INDEX \`${name}\``);
    console.log(`[migrate] índice UNIQUE duplicado removido: ${name}`);
  }
}

const PARTY_COLUMNS = [
  ['birth_date', 'DATE NULL'],
  ['billing_contact_name', 'VARCHAR(120) NULL'],
  ['billing_email', 'VARCHAR(190) NULL'],
  ['billing_contacts', 'JSON NULL'],
  ['bank_code', 'VARCHAR(10) NULL'],
  ['bank_agency', 'VARCHAR(20) NULL'],
  ['bank_account', 'VARCHAR(30) NULL'],
  ['bank_account_type', "ENUM('CHECKING','SAVINGS') NULL"],
  ['pix_key', 'VARCHAR(140) NULL'],
  ['bank_holder_kind', "ENUM('OWN','OTHER') NULL"],
  ['bank_holder_name', 'VARCHAR(190) NULL'],
];

async function ensurePartyColumns() {
  const [tables] = await sequelize.query(
    `SELECT 1 AS ok
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'parties'
     LIMIT 1`,
  );
  if (!tables.length) return;

  for (const [column, definition] of PARTY_COLUMNS) {
    if (await columnExists('parties', column)) continue;
    await sequelize.query(`ALTER TABLE \`parties\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`[migrate] parties.${column} adicionada`);
  }

  await backfillBillingContacts();
}

async function backfillBillingContacts() {
  if (!(await columnExists('parties', 'billing_contacts'))) return;

  await sequelize.query(
    `UPDATE \`parties\`
     SET \`billing_contacts\` = JSON_ARRAY(
       JSON_OBJECT(
         'name', IFNULL(\`billing_contact_name\`, ''),
         'email', IFNULL(\`billing_email\`, ''),
         'emailActive', TRUE
       )
     )
     WHERE \`billing_contacts\` IS NULL
       AND (
         (NULLIF(\`billing_contact_name\`, '') IS NOT NULL)
         OR (NULLIF(\`billing_email\`, '') IS NOT NULL)
       )`,
  );
}

async function tableExists(table) {
  const [rows] = await sequelize.query(
    `SELECT 1 AS ok
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :table
     LIMIT 1`,
    { replacements: { table } },
  );
  return rows.length > 0;
}

async function ensureColumns(table, columns) {
  if (!(await tableExists(table))) return;
  for (const [column, definition] of columns) {
    if (await columnExists(table, column)) continue;
    await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`[migrate] ${table}.${column} adicionada`);
  }
}

async function ensureIndex(table, indexName, createSql) {
  if (!(await tableExists(table))) return;
  const [indexes] = await sequelize.query(`SHOW INDEX FROM \`${table}\``);
  if (indexes.some((row) => row.Key_name === indexName)) return;
  await sequelize.query(createSql);
  console.log(`[migrate] índice ${indexName} criado`);
}

const FINANCE_ACCOUNT_COLUMNS = [
  ['organization_id', 'CHAR(36) NOT NULL'],
  ['name', 'VARCHAR(120) NOT NULL'],
  ['type', "ENUM('corrente','poupanca','investimento','caixa') NOT NULL DEFAULT 'corrente'"],
  ['institution_code', 'VARCHAR(20) NULL'],
  ['institution_name', 'VARCHAR(180) NULL'],
  ['agency', 'VARCHAR(40) NULL'],
  ['account_number', 'VARCHAR(40) NULL'],
  ['icon_key', "VARCHAR(60) NOT NULL DEFAULT 'bank'"],
  ['initial_balance', 'DECIMAL(15,2) NOT NULL DEFAULT 0'],
  ['initial_balance_date', 'DATE NOT NULL'],
  ['status', "ENUM('ativa','inativa') NOT NULL DEFAULT 'ativa'"],
  ['include_in_consolidated', 'TINYINT(1) NOT NULL DEFAULT 1'],
  ['created_at', 'DATETIME NOT NULL'],
  ['updated_at', 'DATETIME NOT NULL'],
];

const FINANCE_CARD_COLUMNS = [
  ['organization_id', 'CHAR(36) NOT NULL'],
  ['name', 'VARCHAR(120) NOT NULL'],
  ['type', "ENUM('credito','debito') NOT NULL"],
  ['brand', 'VARCHAR(80) NULL'],
  ['account_id', 'CHAR(36) NOT NULL'],
  ['icon_key', "VARCHAR(60) NOT NULL DEFAULT 'card'"],
  ['closing_day', 'INT NULL'],
  ['due_day', 'INT NULL'],
  ['credit_limit', 'DECIMAL(15,2) NULL'],
  ['status', "ENUM('ativo','inativo') NOT NULL DEFAULT 'ativo'"],
  ['created_at', 'DATETIME NOT NULL'],
  ['updated_at', 'DATETIME NOT NULL'],
];

const FINANCE_CATEGORY_COLUMNS = [
  ['organization_id', 'CHAR(36) NOT NULL'],
  ['name', 'VARCHAR(120) NOT NULL'],
  ['type', "ENUM('despesa','receita') NOT NULL"],
  ['parent_id', 'CHAR(36) NULL'],
  ['icon_key', "VARCHAR(60) NOT NULL DEFAULT 'tag'"],
  ['color', "VARCHAR(20) NOT NULL DEFAULT '#0f9f90'"],
  ['status', "ENUM('ativa','inativa') NOT NULL DEFAULT 'ativa'"],
  ['is_system_seed', 'TINYINT(1) NOT NULL DEFAULT 0'],
  ['created_at', 'DATETIME NOT NULL'],
  ['updated_at', 'DATETIME NOT NULL'],
];

const COST_CENTER_COLUMNS = [
  ['organization_id', 'CHAR(36) NOT NULL'],
  ['name', 'VARCHAR(120) NOT NULL'],
  ['code', 'VARCHAR(40) NULL'],
  ['parent_id', 'CHAR(36) NULL'],
  ['status', "ENUM('ativa','inativa') NOT NULL DEFAULT 'ativa'"],
  ['created_at', 'DATETIME NOT NULL'],
  ['updated_at', 'DATETIME NOT NULL'],
];

const FINANCE_INVOICE_COLUMNS = [
  ['organization_id', 'CHAR(36) NOT NULL'],
  ['card_id', 'CHAR(36) NOT NULL'],
  ['reference_year', 'INT NOT NULL'],
  ['reference_month', 'INT NOT NULL'],
  ['closing_date', 'DATE NOT NULL'],
  ['due_date', 'DATE NOT NULL'],
  ['status', "ENUM('aberta','fechada','paga') NOT NULL DEFAULT 'aberta'"],
  ['paid_at', 'DATE NULL'],
  ['payment_transaction_id', 'CHAR(36) NULL'],
  ['created_at', 'DATETIME NOT NULL'],
  ['updated_at', 'DATETIME NOT NULL'],
];

const FINANCE_TRANSACTION_COLUMNS = [
  ['organization_id', 'CHAR(36) NOT NULL'],
  ['type', "ENUM('despesa','receita','transferencia') NOT NULL"],
  ['description', 'VARCHAR(255) NOT NULL'],
  ['category_id', 'CHAR(36) NULL'],
  ['account_id', 'CHAR(36) NULL'],
  ['transfer_account_id', 'CHAR(36) NULL'],
  ['card_id', 'CHAR(36) NULL'],
  ['invoice_id', 'CHAR(36) NULL'],
  ['party_id', 'CHAR(36) NULL'],
  ['cost_center_id', 'CHAR(36) NULL'],
  ['amount', 'DECIMAL(15,2) NOT NULL'],
  ['paid_amount', 'DECIMAL(15,2) NULL'],
  ['due_date', 'DATE NOT NULL'],
  ['paid_at', 'DATE NULL'],
  ['status', "ENUM('pendente','pago','recebido','cancelado') NOT NULL DEFAULT 'pendente'"],
  ['modality', "ENUM('unico','recorrente','parcelado') NOT NULL DEFAULT 'unico'"],
  ['recurrence_frequency', "ENUM('semanal','mensal','anual') NULL"],
  ['master_transaction_id', 'CHAR(36) NULL'],
  ['is_recurrence_master', 'TINYINT(1) NOT NULL DEFAULT 0'],
  ['installment_group_id', 'CHAR(36) NULL'],
  ['installment_number', 'INT NULL'],
  ['installment_total', 'INT NULL'],
  ['notes', 'TEXT NULL'],
  ['created_at', 'DATETIME NOT NULL'],
  ['updated_at', 'DATETIME NOT NULL'],
];

const FINANCE_TX_ATTACHMENT_COLUMNS = [
  ['organization_id', 'CHAR(36) NOT NULL'],
  ['transaction_id', 'CHAR(36) NOT NULL'],
  ['blob_name', 'VARCHAR(320) NOT NULL'],
  ['original_name', 'VARCHAR(190) NOT NULL'],
  ['content_type', 'VARCHAR(120) NOT NULL'],
  ['size_bytes', 'INT UNSIGNED NOT NULL'],
  ['uploaded_by', 'CHAR(36) NULL'],
  ['created_at', 'DATETIME NOT NULL'],
];

async function ensureFinanceTables() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`finance_accounts\` (
      \`id\` CHAR(36) NOT NULL,
      \`organization_id\` CHAR(36) NOT NULL,
      \`name\` VARCHAR(120) NOT NULL,
      \`type\` ENUM('corrente','poupanca','investimento','caixa') NOT NULL DEFAULT 'corrente',
      \`institution_code\` VARCHAR(20) NULL,
      \`institution_name\` VARCHAR(180) NULL,
      \`agency\` VARCHAR(40) NULL,
      \`account_number\` VARCHAR(40) NULL,
      \`icon_key\` VARCHAR(60) NOT NULL DEFAULT 'bank',
      \`initial_balance\` DECIMAL(15,2) NOT NULL DEFAULT 0,
      \`initial_balance_date\` DATE NOT NULL,
      \`status\` ENUM('ativa','inativa') NOT NULL DEFAULT 'ativa',
      \`include_in_consolidated\` TINYINT(1) NOT NULL DEFAULT 1,
      \`created_at\` DATETIME NOT NULL,
      \`updated_at\` DATETIME NOT NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`finance_cards\` (
      \`id\` CHAR(36) NOT NULL,
      \`organization_id\` CHAR(36) NOT NULL,
      \`name\` VARCHAR(120) NOT NULL,
      \`type\` ENUM('credito','debito') NOT NULL,
      \`brand\` VARCHAR(80) NULL,
      \`account_id\` CHAR(36) NOT NULL,
      \`icon_key\` VARCHAR(60) NOT NULL DEFAULT 'card',
      \`closing_day\` INT NULL,
      \`due_day\` INT NULL,
      \`credit_limit\` DECIMAL(15,2) NULL,
      \`status\` ENUM('ativo','inativo') NOT NULL DEFAULT 'ativo',
      \`created_at\` DATETIME NOT NULL,
      \`updated_at\` DATETIME NOT NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`finance_categories\` (
      \`id\` CHAR(36) NOT NULL,
      \`organization_id\` CHAR(36) NOT NULL,
      \`name\` VARCHAR(120) NOT NULL,
      \`type\` ENUM('despesa','receita') NOT NULL,
      \`parent_id\` CHAR(36) NULL,
      \`icon_key\` VARCHAR(60) NOT NULL DEFAULT 'tag',
      \`color\` VARCHAR(20) NOT NULL DEFAULT '#0f9f90',
      \`status\` ENUM('ativa','inativa') NOT NULL DEFAULT 'ativa',
      \`is_system_seed\` TINYINT(1) NOT NULL DEFAULT 0,
      \`created_at\` DATETIME NOT NULL,
      \`updated_at\` DATETIME NOT NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`cost_centers\` (
      \`id\` CHAR(36) NOT NULL,
      \`organization_id\` CHAR(36) NOT NULL,
      \`name\` VARCHAR(120) NOT NULL,
      \`code\` VARCHAR(40) NULL,
      \`parent_id\` CHAR(36) NULL,
      \`status\` ENUM('ativa','inativa') NOT NULL DEFAULT 'ativa',
      \`created_at\` DATETIME NOT NULL,
      \`updated_at\` DATETIME NOT NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`finance_invoices\` (
      \`id\` CHAR(36) NOT NULL,
      \`organization_id\` CHAR(36) NOT NULL,
      \`card_id\` CHAR(36) NOT NULL,
      \`reference_year\` INT NOT NULL,
      \`reference_month\` INT NOT NULL,
      \`closing_date\` DATE NOT NULL,
      \`due_date\` DATE NOT NULL,
      \`status\` ENUM('aberta','fechada','paga') NOT NULL DEFAULT 'aberta',
      \`paid_at\` DATE NULL,
      \`payment_transaction_id\` CHAR(36) NULL,
      \`created_at\` DATETIME NOT NULL,
      \`updated_at\` DATETIME NOT NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`finance_transactions\` (
      \`id\` CHAR(36) NOT NULL,
      \`organization_id\` CHAR(36) NOT NULL,
      \`type\` ENUM('despesa','receita','transferencia') NOT NULL,
      \`description\` VARCHAR(255) NOT NULL,
      \`category_id\` CHAR(36) NULL,
      \`account_id\` CHAR(36) NULL,
      \`transfer_account_id\` CHAR(36) NULL,
      \`card_id\` CHAR(36) NULL,
      \`invoice_id\` CHAR(36) NULL,
      \`party_id\` CHAR(36) NULL,
      \`cost_center_id\` CHAR(36) NULL,
      \`amount\` DECIMAL(15,2) NOT NULL,
      \`paid_amount\` DECIMAL(15,2) NULL,
      \`due_date\` DATE NOT NULL,
      \`paid_at\` DATE NULL,
      \`status\` ENUM('pendente','pago','recebido','cancelado') NOT NULL DEFAULT 'pendente',
      \`modality\` ENUM('unico','recorrente','parcelado') NOT NULL DEFAULT 'unico',
      \`recurrence_frequency\` ENUM('semanal','mensal','anual') NULL,
      \`master_transaction_id\` CHAR(36) NULL,
      \`is_recurrence_master\` TINYINT(1) NOT NULL DEFAULT 0,
      \`installment_group_id\` CHAR(36) NULL,
      \`installment_number\` INT NULL,
      \`installment_total\` INT NULL,
      \`notes\` TEXT NULL,
      \`created_at\` DATETIME NOT NULL,
      \`updated_at\` DATETIME NOT NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`finance_transaction_attachments\` (
      \`id\` CHAR(36) NOT NULL,
      \`organization_id\` CHAR(36) NOT NULL,
      \`transaction_id\` CHAR(36) NOT NULL,
      \`blob_name\` VARCHAR(320) NOT NULL,
      \`original_name\` VARCHAR(190) NOT NULL,
      \`content_type\` VARCHAR(120) NOT NULL,
      \`size_bytes\` INT UNSIGNED NOT NULL,
      \`uploaded_by\` CHAR(36) NULL,
      \`created_at\` DATETIME NOT NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await ensureColumns('finance_accounts', FINANCE_ACCOUNT_COLUMNS);
  await ensureColumns('finance_cards', FINANCE_CARD_COLUMNS);
  await ensureColumns('finance_categories', FINANCE_CATEGORY_COLUMNS);
  await ensureColumns('cost_centers', COST_CENTER_COLUMNS);
  await ensureColumns('finance_invoices', FINANCE_INVOICE_COLUMNS);
  await ensureColumns('finance_transactions', FINANCE_TRANSACTION_COLUMNS);
  await ensureColumns('finance_transaction_attachments', FINANCE_TX_ATTACHMENT_COLUMNS);

  await ensureIndex(
    'finance_accounts',
    'finance_accounts_organization_id',
    'CREATE INDEX `finance_accounts_organization_id` ON `finance_accounts` (`organization_id`)',
  );
  await ensureIndex(
    'finance_cards',
    'finance_cards_organization_id',
    'CREATE INDEX `finance_cards_organization_id` ON `finance_cards` (`organization_id`)',
  );
  await ensureIndex(
    'finance_categories',
    'finance_categories_organization_id',
    'CREATE INDEX `finance_categories_organization_id` ON `finance_categories` (`organization_id`)',
  );
  await ensureIndex(
    'cost_centers',
    'cost_centers_organization_id',
    'CREATE INDEX `cost_centers_organization_id` ON `cost_centers` (`organization_id`)',
  );
  await ensureIndex(
    'finance_invoices',
    'finance_invoices_org_card_ref_unique',
    'CREATE UNIQUE INDEX `finance_invoices_org_card_ref_unique` ON `finance_invoices` (`organization_id`, `card_id`, `reference_year`, `reference_month`)',
  );
  await ensureIndex(
    'finance_transactions',
    'finance_transactions_organization_id',
    'CREATE INDEX `finance_transactions_organization_id` ON `finance_transactions` (`organization_id`)',
  );
  await ensureIndex(
    'finance_transactions',
    'finance_transactions_org_due_date',
    'CREATE INDEX `finance_transactions_org_due_date` ON `finance_transactions` (`organization_id`, `due_date`)',
  );
  await ensureIndex(
    'finance_transaction_attachments',
    'finance_tx_attachments_org_tx',
    'CREATE INDEX `finance_tx_attachments_org_tx` ON `finance_transaction_attachments` (`organization_id`, `transaction_id`)',
  );
  await ensureIndex(
    'finance_transaction_attachments',
    'finance_tx_attachments_blob_name_unique',
    'CREATE UNIQUE INDEX `finance_tx_attachments_blob_name_unique` ON `finance_transaction_attachments` (`blob_name`)',
  );
}

async function dedupeFinanceCategoryRows() {
  if (!(await tableExists('finance_categories'))) return;
  const { dedupeFinanceCategories } = await import('../lib/financeCategorySeed.js');
  const result = await dedupeFinanceCategories();
  if (result.deleted > 0) {
    console.log(`[migrate] categorias duplicadas removidas: ${result.deleted}`);
  }
}

async function ensureBillingIndexes() {
  if (await tableExists('webhook_receipts')) {
    await ensureIndex(
      'webhook_receipts',
      'webhook_receipts_provider_event_unique',
      'CREATE UNIQUE INDEX `webhook_receipts_provider_event_unique` ON `webhook_receipts` (`provider`, `event_id`)',
    );
  }
  if (await tableExists('billing_charges')) {
    await ensureIndex(
      'billing_charges',
      'billing_charges_organization_id',
      'CREATE INDEX `billing_charges_organization_id` ON `billing_charges` (`organization_id`)',
    );
  }
  if (await tableExists('billing_contracts')) {
    await ensureIndex(
      'billing_contracts',
      'billing_contracts_organization_id',
      'CREATE INDEX `billing_contracts_organization_id` ON `billing_contracts` (`organization_id`)',
    );
  }
  if (await tableExists('simples_tax_periods')) {
    await ensureIndex(
      'simples_tax_periods',
      'simples_tax_periods_org_competence_unique',
      'CREATE UNIQUE INDEX `simples_tax_periods_org_competence_unique` ON `simples_tax_periods` (`organization_id`, `competence`)',
    );
  }
  if (await tableExists('organization_profiles')) {
    await ensureIndex(
      'organization_profiles',
      'organization_profiles_organization_id_unique',
      'CREATE UNIQUE INDEX `organization_profiles_organization_id_unique` ON `organization_profiles` (`organization_id`)',
    );
  }
}

/**
 * Migração idempotente para a estrutura atual (sem Sequelize.alter no boot).
 */
export async function runMigrations() {
  await ensureUserColumns();
  await ensureRefreshTokenFamily();
  await cleanupDuplicateEmailUniques();
  await ensurePartyColumns();
  await ensureFinanceTables();
  await dedupeFinanceCategoryRows();
  await ensureBillingIndexes();
}
