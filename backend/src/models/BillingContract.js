import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/index.js';

export class BillingContract extends Model {
  toSafeJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      partyId: this.partyId,
      fiscalServiceId: this.fiscalServiceId,
      kind: this.kind,
      cycle: this.cycle,
      nextDueDate: this.nextDueDate,
      status: this.status,
      nfDescription: this.nfDescription || '',
      emitNfse: Boolean(this.emitNfse),
      asaasCustomerId: this.asaasCustomerId || null,
      asaasSubscriptionId: this.asaasSubscriptionId || null,
      totalAmount: Number(this.totalAmount || 0),
      notes: this.notes || '',
      activatedAt: this.activatedAt || null,
      cancelledAt: this.cancelledAt || null,
      items: Array.isArray(this.items)
        ? this.items.map((item) => (item.toSafeJSON ? item.toSafeJSON() : item))
        : undefined,
      party: this.party?.toSafeJSON ? this.party.toSafeJSON() : this.party,
      fiscalService: this.fiscalService?.toSafeJSON
        ? this.fiscalService.toSafeJSON()
        : this.fiscalService,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

BillingContract.init(
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
    partyId: { type: DataTypes.UUID, allowNull: false, field: 'party_id' },
    fiscalServiceId: { type: DataTypes.UUID, allowNull: false, field: 'fiscal_service_id' },
    kind: {
      type: DataTypes.ENUM('recurring', 'one_shot'),
      allowNull: false,
      defaultValue: 'recurring',
    },
    cycle: {
      type: DataTypes.ENUM('WEEKLY', 'MONTHLY', 'YEARLY'),
      allowNull: true,
    },
    nextDueDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'next_due_date' },
    status: {
      type: DataTypes.ENUM('draft', 'active', 'paused', 'cancelled'),
      allowNull: false,
      defaultValue: 'draft',
    },
    nfDescription: { type: DataTypes.STRING(255), allowNull: true, field: 'nf_description' },
    emitNfse: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'emit_nfse',
    },
    asaasCustomerId: { type: DataTypes.STRING(80), allowNull: true, field: 'asaas_customer_id' },
    asaasSubscriptionId: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: 'asaas_subscription_id',
    },
    totalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'total_amount',
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    activatedAt: { type: DataTypes.DATE, allowNull: true, field: 'activated_at' },
    cancelledAt: { type: DataTypes.DATE, allowNull: true, field: 'cancelled_at' },
  },
  { sequelize, modelName: 'BillingContract', tableName: 'billing_contracts' },
);
