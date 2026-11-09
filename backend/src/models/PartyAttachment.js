import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/index.js';

export class PartyAttachment extends Model {
  toSafeJSON() {
    return {
      id: this.id,
      partyId: this.partyId,
      originalName: this.originalName,
      contentType: this.contentType,
      sizeBytes: this.sizeBytes,
      createdAt: this.createdAt,
    };
  }
}

PartyAttachment.init(
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
    partyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'party_id',
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
    modelName: 'PartyAttachment',
    tableName: 'party_attachments',
    updatedAt: false,
    indexes: [
      {
        fields: ['organization_id', 'party_id'],
        name: 'party_attachments_org_party',
      },
      {
        unique: true,
        fields: ['blob_name'],
        name: 'party_attachments_blob_name_unique',
      },
    ],
  },
);
