import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/index.js';

export class FinanceCard extends Model {
  toSafeJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      type: this.type,
      brand: this.brand || '',
      accountId: this.accountId,
      account: this.account ? this.account.toSafeJSON?.() || this.account : null,
      iconKey: this.iconKey || 'card',
      closingDay: this.closingDay ?? null,
      dueDay: this.dueDay ?? null,
      creditLimit: this.creditLimit != null ? Number(this.creditLimit) : null,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

FinanceCard.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'organization_id',
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('credito', 'debito'),
      allowNull: false,
    },
    brand: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    accountId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'account_id',
    },
    iconKey: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: 'card',
      field: 'icon_key',
    },
    closingDay: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'closing_day',
      validate: { min: 1, max: 31 },
    },
    dueDay: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'due_day',
      validate: { min: 1, max: 31 },
    },
    creditLimit: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      field: 'credit_limit',
    },
    status: {
      type: DataTypes.ENUM('ativo', 'inativo'),
      allowNull: false,
      defaultValue: 'ativo',
    },
  },
  {
    sequelize,
    modelName: 'FinanceCard',
    tableName: 'finance_cards',
    indexes: [
      { fields: ['organization_id'] },
      { fields: ['organization_id', 'status'] },
      { fields: ['organization_id', 'account_id'] },
    ],
  },
);
