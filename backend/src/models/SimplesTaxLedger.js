import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/index.js';

export class SimplesTaxLedger extends Model {
  toSafeJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      chargeId: this.chargeId,
      asaasInvoiceId: this.asaasInvoiceId || null,
      competence: this.competence,
      baseAmount: Number(this.baseAmount || 0),
      baseAnexo: this.baseAnexo,
      effectiveAnexo: this.effectiveAnexo,
      rbt12: Number(this.rbt12 || 0),
      fatorR: Number(this.fatorR || 0),
      effectiveAliquot: Number(this.effectiveAliquot || 0),
      taxAmount: Number(this.taxAmount || 0),
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

SimplesTaxLedger.init(
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
    asaasInvoiceId: { type: DataTypes.STRING(80), allowNull: true, field: 'asaas_invoice_id' },
    competence: { type: DataTypes.STRING(7), allowNull: false },
    baseAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'base_amount',
    },
    baseAnexo: { type: DataTypes.STRING(8), allowNull: false, field: 'base_anexo' },
    effectiveAnexo: { type: DataTypes.STRING(8), allowNull: false, field: 'effective_anexo' },
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
    effectiveAliquot: {
      type: DataTypes.DECIMAL(12, 8),
      allowNull: false,
      defaultValue: 0,
      field: 'effective_aliquot',
    },
    taxAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'tax_amount',
    },
    status: {
      type: DataTypes.ENUM('active', 'reversed'),
      allowNull: false,
      defaultValue: 'active',
    },
  },
  { sequelize, modelName: 'SimplesTaxLedger', tableName: 'simples_tax_ledger' },
);
