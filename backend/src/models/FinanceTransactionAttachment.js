import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/index.js';

export class FinanceTransactionAttachment extends Model {
  toSafeJSON() {
    return {
      id: this.id,
      transactionId: this.transactionId,
      originalName: this.originalName,
      contentType: this.contentType,
      sizeBytes: this.sizeBytes,
      createdAt: this.createdAt,
    };
  }
}

FinanceTransactionAttachment.init(
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
    transactionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'transaction_id',
    },
    blobName: {
      type: DataTypes.STRING(320),
      allowNull: false,
      field: 'blob_name',
    },
    originalName: {
      type: DataTypes.STRING(190),
      allowNull: false,
      field: 'original_name',
    },
    contentType: {
      type: DataTypes.STRING(120),
      allowNull: false,
      field: 'content_type',
    },
    sizeBytes: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'size_bytes',
    },
    uploadedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'uploaded_by',
    },
  },
  {
    sequelize,
    modelName: 'FinanceTransactionAttachment',
    tableName: 'finance_transaction_attachments',
    updatedAt: false,
    indexes: [
      {
        fields: ['organization_id', 'transaction_id'],
        name: 'finance_tx_attachments_org_tx',
      },
      {
        unique: true,
        fields: ['blob_name'],
        name: 'finance_tx_attachments_blob_name_unique',
      },
    ],
  },
);
