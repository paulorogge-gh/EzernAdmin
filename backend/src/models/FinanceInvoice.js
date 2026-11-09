import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/index.js';

export class FinanceInvoice extends Model {
  toSafeJSON(extra = {}) {
    return {
      id: this.id,
      organizationId: this.organizationId,
      cardId: this.cardId,
      referenceYear: this.referenceYear,
      referenceMonth: this.referenceMonth,
      closingDate: this.closingDate,
      dueDate: this.dueDate,
      status: this.status,
      paidAt: this.paidAt || null,
      paymentTransactionId: this.paymentTransactionId || null,
      card: this.card ? this.card.toSafeJSON?.() || this.card : null,
      label: `${String(this.referenceMonth).padStart(2, '0')}/${this.referenceYear}`,
      ...extra,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

FinanceInvoice.init(
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
    cardId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'card_id',
    },
    referenceYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'reference_year',
    },
    referenceMonth: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'reference_month',
      validate: { min: 1, max: 12 },
    },
    closingDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'closing_date',
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'due_date',
    },
    status: {
      type: DataTypes.ENUM('aberta', 'fechada', 'paga'),
      allowNull: false,
      defaultValue: 'aberta',
    },
    paidAt: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'paid_at',
    },
    paymentTransactionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'payment_transaction_id',
    },
  },
  {
    sequelize,
    modelName: 'FinanceInvoice',
    tableName: 'finance_invoices',
    indexes: [
      { fields: ['organization_id'] },
      { fields: ['organization_id', 'card_id'] },
      {
        fields: ['organization_id', 'card_id', 'reference_year', 'reference_month'],
        unique: true,
        name: 'finance_invoices_org_card_ref_unique',
      },
      { fields: ['organization_id', 'status'] },
    ],
  },
);
