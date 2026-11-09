import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/index.js';

export class BillingCharge extends Model {
  toSafeJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      contractId: this.contractId,
      partyId: this.partyId,
      dueDate: this.dueDate,
      amount: Number(this.amount || 0),
      status: this.status,
      description: this.description || '',
      asaasPaymentId: this.asaasPaymentId || null,
      asaasInvoiceId: this.asaasInvoiceId || null,
      asaasSubscriptionId: this.asaasSubscriptionId || null,
      bankSlipUrl: this.bankSlipUrl || '',
      invoiceUrl: this.invoiceUrl || '',
      identificationField: this.identificationField || '',
      nfStatus: this.nfStatus || null,
      nfNumber: this.nfNumber || '',
      nfPdfUrl: this.nfPdfUrl || '',
      nfXmlUrl: this.nfXmlUrl || '',
      nfAuthorizedAt: this.nfAuthorizedAt || null,
      paidAt: this.paidAt || null,
      financeReceivableId: this.financeReceivableId || null,
      competence: this.competence || null,
      items: Array.isArray(this.items)
        ? this.items.map((item) => (item.toSafeJSON ? item.toSafeJSON() : item))
        : undefined,
      party: this.party?.toSafeJSON ? this.party.toSafeJSON() : this.party,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

BillingCharge.init(
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
    contractId: { type: DataTypes.UUID, allowNull: false, field: 'contract_id' },
    partyId: { type: DataTypes.UUID, allowNull: false, field: 'party_id' },
    dueDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'due_date' },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM(
        'pending',
        'confirmed',
        'received',
        'overdue',
        'refunded',
        'deleted',
        'cancelled',
      ),
      allowNull: false,
      defaultValue: 'pending',
    },
    description: { type: DataTypes.STRING(500), allowNull: true },
    asaasPaymentId: {
      type: DataTypes.STRING(80),
      allowNull: true,
      unique: true,
      field: 'asaas_payment_id',
    },
    asaasInvoiceId: { type: DataTypes.STRING(80), allowNull: true, field: 'asaas_invoice_id' },
    asaasSubscriptionId: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: 'asaas_subscription_id',
    },
    bankSlipUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'bank_slip_url' },
    invoiceUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'invoice_url' },
    identificationField: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: 'identification_field',
    },
    nfStatus: {
      type: DataTypes.ENUM(
        'none',
        'scheduled',
        'authorized',
        'processing',
        'error',
        'cancelled',
      ),
      allowNull: false,
      defaultValue: 'none',
      field: 'nf_status',
    },
    nfNumber: { type: DataTypes.STRING(60), allowNull: true, field: 'nf_number' },
    nfPdfUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'nf_pdf_url' },
    nfXmlUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'nf_xml_url' },
    nfAuthorizedAt: { type: DataTypes.DATE, allowNull: true, field: 'nf_authorized_at' },
    paidAt: { type: DataTypes.DATEONLY, allowNull: true, field: 'paid_at' },
    financeReceivableId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'finance_receivable_id',
    },
    competence: { type: DataTypes.STRING(7), allowNull: true },
  },
  { sequelize, modelName: 'BillingCharge', tableName: 'billing_charges' },
);
