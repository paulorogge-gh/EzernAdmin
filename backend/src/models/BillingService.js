import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/index.js';

export class BillingService extends Model {
  toSafeJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      description: this.description || '',
      nfDescription: this.nfDescription || '',
      unitPrice: Number(this.unitPrice || 0),
      status: this.status,
      cnae: this.cnae || '',
      municipalServiceId: this.municipalServiceId || '',
      municipalServiceCode: this.municipalServiceCode || '',
      municipalServiceName: this.municipalServiceName || '',
      taxes: this.taxes || null,
      simplesAnexo: this.simplesAnexo || 'V',
      fatorREligible: Boolean(this.fatorREligible),
      issRetained: Boolean(this.issRetained),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

BillingService.init(
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
    name: { type: DataTypes.STRING(160), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    nfDescription: { type: DataTypes.STRING(255), allowNull: true, field: 'nf_description' },
    unitPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'unit_price',
    },
    status: {
      type: DataTypes.ENUM('ativo', 'inativo'),
      allowNull: false,
      defaultValue: 'ativo',
    },
    cnae: { type: DataTypes.STRING(20), allowNull: true },
    municipalServiceId: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: 'municipal_service_id',
    },
    municipalServiceCode: {
      type: DataTypes.STRING(40),
      allowNull: true,
      field: 'municipal_service_code',
    },
    municipalServiceName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'municipal_service_name',
    },
    taxes: { type: DataTypes.JSON, allowNull: true },
    simplesAnexo: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: 'V',
      field: 'simples_anexo',
    },
    fatorREligible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'fator_r_eligible',
    },
    issRetained: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'iss_retained',
    },
  },
  { sequelize, modelName: 'BillingService', tableName: 'billing_services' },
);
