import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/index.js';

export class FinanceAccount extends Model {
  toSafeJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      type: this.type,
      institutionCode: this.institutionCode || '',
      institutionName: this.institutionName || '',
      agency: this.agency || '',
      accountNumber: this.accountNumber || '',
      iconKey: this.iconKey || 'bank',
      initialBalance: Number(this.initialBalance || 0),
      initialBalanceDate: this.initialBalanceDate,
      status: this.status,
      includeInConsolidated: Boolean(this.includeInConsolidated),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

FinanceAccount.init(
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
      type: DataTypes.ENUM('corrente', 'poupanca', 'investimento', 'caixa'),
      allowNull: false,
      defaultValue: 'corrente',
    },
    institutionCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'institution_code',
    },
    institutionName: {
      type: DataTypes.STRING(180),
      allowNull: true,
      field: 'institution_name',
    },
    agency: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    accountNumber: {
      type: DataTypes.STRING(40),
      allowNull: true,
      field: 'account_number',
    },
    iconKey: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: 'bank',
      field: 'icon_key',
    },
    initialBalance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'initial_balance',
    },
    initialBalanceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'initial_balance_date',
    },
    status: {
      type: DataTypes.ENUM('ativa', 'inativa'),
      allowNull: false,
      defaultValue: 'ativa',
    },
    includeInConsolidated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'include_in_consolidated',
    },
  },
  {
    sequelize,
    modelName: 'FinanceAccount',
    tableName: 'finance_accounts',
    indexes: [
      { fields: ['organization_id'] },
      { fields: ['organization_id', 'status'] },
    ],
  },
);
