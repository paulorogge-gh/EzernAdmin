import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/index.js';

export class SimplesTaxPeriod extends Model {
  toSafeJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      competence: this.competence,
      rbt12: Number(this.rbt12 || 0),
      fatorR: Number(this.fatorR || 0),
      payroll12m: Number(this.payroll12m || 0),
      totalBase: Number(this.totalBase || 0),
      totalTax: Number(this.totalTax || 0),
      dueDate: this.dueDate,
      status: this.status,
      financePayableId: this.financePayableId || null,
      closedAt: this.closedAt || null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

SimplesTaxPeriod.init(
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
    competence: { type: DataTypes.STRING(7), allowNull: false },
    rbt12: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    fatorR: {
      type: DataTypes.DECIMAL(12, 6),
      allowNull: false,
      defaultValue: 0,
      field: 'fator_r',
    },
    payroll12m: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'payroll_12m',
    },
    totalBase: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'total_base',
    },
    totalTax: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'total_tax',
    },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'due_date' },
    status: {
      type: DataTypes.ENUM('open', 'closed'),
      allowNull: false,
      defaultValue: 'open',
    },
    financePayableId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'finance_payable_id',
    },
    closedAt: { type: DataTypes.DATE, allowNull: true, field: 'closed_at' },
  },
  { sequelize, modelName: 'SimplesTaxPeriod', tableName: 'simples_tax_periods' },
);
