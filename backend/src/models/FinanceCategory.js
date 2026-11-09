import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/index.js';

export class FinanceCategory extends Model {
  toSafeJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      type: this.type,
      parentId: this.parentId || null,
      iconKey: this.iconKey || 'tag',
      color: this.color || '#0f9f90',
      status: this.status,
      isSystemSeed: Boolean(this.isSystemSeed),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

FinanceCategory.init(
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
      type: DataTypes.ENUM('despesa', 'receita'),
      allowNull: false,
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'parent_id',
    },
    iconKey: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: 'tag',
      field: 'icon_key',
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '#0f9f90',
    },
    status: {
      type: DataTypes.ENUM('ativa', 'inativa'),
      allowNull: false,
      defaultValue: 'ativa',
    },
    isSystemSeed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_system_seed',
    },
  },
  {
    sequelize,
    modelName: 'FinanceCategory',
    tableName: 'finance_categories',
    indexes: [
      { fields: ['organization_id'] },
      { fields: ['organization_id', 'type'] },
      { fields: ['organization_id', 'parent_id'] },
      { fields: ['organization_id', 'status'] },
    ],
  },
);
