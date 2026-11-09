import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/index.js';

export class BillingChargeItem extends Model {
  toSafeJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      chargeId: this.chargeId,
      itemType: this.itemType,
      description: this.description,
      quantity: Number(this.quantity || 1),
      amount: Number(this.amount || 0),
      costAmount: Number(this.costAmount || 0),
      supplierPartyId: this.supplierPartyId || null,
      passThrough: Boolean(this.passThrough),
      financePayableId: this.financePayableId || null,
      sortOrder: Number(this.sortOrder || 0),
    };
  }
}

BillingChargeItem.init(
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
    chargeId: { type: DataTypes.UUID, allowNull: false, field: 'charge_id' },
    itemType: {
      type: DataTypes.ENUM('servico', 'reembolso', 'taxa', 'outro'),
      allowNull: false,
      defaultValue: 'servico',
      field: 'item_type',
    },
    description: { type: DataTypes.STRING(255), allowNull: false },
    quantity: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      defaultValue: 1,
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    costAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'cost_amount',
    },
    supplierPartyId: { type: DataTypes.UUID, allowNull: true, field: 'supplier_party_id' },
    passThrough: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'pass_through',
    },
    financePayableId: { type: DataTypes.UUID, allowNull: true, field: 'finance_payable_id' },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
    },
  },
  { sequelize, modelName: 'BillingChargeItem', tableName: 'billing_charge_items' },
);
