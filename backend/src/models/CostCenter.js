import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/index.js';

export class CostCenter extends Model {
  toSafeJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      code: this.code || '',
      parentId: this.parentId || null,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

CostCenter.init(
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
    code: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'parent_id',
    },
    status: {
      type: DataTypes.ENUM('ativa', 'inativa'),
      allowNull: false,
      defaultValue: 'ativa',
    },
  },
  {
    sequelize,
    modelName: 'CostCenter',
    tableName: 'cost_centers',
    indexes: [
      { fields: ['organization_id'] },
      { fields: ['organization_id', 'status'] },
    ],
  },
);
