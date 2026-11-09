import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/index.js';

export class FinanceTransaction extends Model {
  toSafeJSON() {
    const due = this.dueDate;
    const today = new Date().toISOString().slice(0, 10);
    let effectiveStatus = this.status;
    if (this.status === 'pendente' && due && String(due) < today) {
      effectiveStatus = 'atrasado';
    }
    if (this.type === 'transferencia' && this.status === 'pago') {
      effectiveStatus = 'transferido';
    }

    return {
      id: this.id,
      organizationId: this.organizationId,
      type: this.type,
      description: this.description,
      categoryId: this.categoryId || null,
      accountId: this.accountId || null,
      transferAccountId: this.transferAccountId || null,
      cardId: this.cardId || null,
      invoiceId: this.invoiceId || null,
      partyId: this.partyId || null,
      costCenterId: this.costCenterId || null,
      amount: Number(this.amount || 0),
      paidAmount: this.paidAmount != null ? Number(this.paidAmount) : null,
      dueDate: this.dueDate,
      paidAt: this.paidAt || null,
      status: this.status,
      effectiveStatus,
      modality: this.modality,
      recurrenceFrequency: this.recurrenceFrequency || null,
      masterTransactionId: this.masterTransactionId || null,
      isRecurrenceMaster: Boolean(this.isRecurrenceMaster),
      installmentGroupId: this.installmentGroupId || null,
      installmentNumber: this.installmentNumber ?? null,
      installmentTotal: this.installmentTotal ?? null,
      notes: this.notes || '',
      category: this.category ? this.category.toSafeJSON?.() || this.category : null,
      account: this.account ? this.account.toSafeJSON?.() || this.account : null,
      transferAccount: this.transferAccount
        ? this.transferAccount.toSafeJSON?.() || this.transferAccount
        : null,
      card: this.card ? this.card.toSafeJSON?.() || this.card : null,
      party: this.party ? this.party.toSafeJSON?.() || this.party : null,
      costCenter: this.costCenter ? this.costCenter.toSafeJSON?.() || this.costCenter : null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

FinanceTransaction.init(
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
    type: {
      type: DataTypes.ENUM('despesa', 'receita', 'transferencia'),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'category_id',
    },
    accountId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'account_id',
    },
    transferAccountId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'transfer_account_id',
    },
    cardId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'card_id',
    },
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'invoice_id',
    },
    partyId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'party_id',
    },
    costCenterId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'cost_center_id',
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    paidAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      field: 'paid_amount',
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'due_date',
    },
    paidAt: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'paid_at',
    },
    status: {
      type: DataTypes.ENUM('pendente', 'pago', 'recebido', 'cancelado'),
      allowNull: false,
      defaultValue: 'pendente',
    },
    modality: {
      type: DataTypes.ENUM('unico', 'recorrente', 'parcelado'),
      allowNull: false,
      defaultValue: 'unico',
    },
    recurrenceFrequency: {
      type: DataTypes.ENUM('semanal', 'mensal', 'anual'),
      allowNull: true,
      field: 'recurrence_frequency',
    },
    masterTransactionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'master_transaction_id',
    },
    isRecurrenceMaster: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_recurrence_master',
    },
    installmentGroupId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'installment_group_id',
    },
    installmentNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'installment_number',
    },
    installmentTotal: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'installment_total',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'FinanceTransaction',
    tableName: 'finance_transactions',
    indexes: [
      { fields: ['organization_id'] },
      { fields: ['organization_id', 'due_date'] },
      { fields: ['organization_id', 'status'] },
      { fields: ['organization_id', 'type'] },
      { fields: ['organization_id', 'account_id'] },
      { fields: ['organization_id', 'card_id'] },
      { fields: ['organization_id', 'invoice_id'] },
      { fields: ['organization_id', 'party_id'] },
      { fields: ['organization_id', 'cost_center_id'] },
      { fields: ['organization_id', 'installment_group_id'] },
      { fields: ['organization_id', 'master_transaction_id'] },
    ],
  },
);
