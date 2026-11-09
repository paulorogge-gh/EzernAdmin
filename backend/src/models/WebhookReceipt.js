import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/index.js';

export class WebhookReceipt extends Model {}

WebhookReceipt.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'organization_id',
    },
    provider: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'asaas',
    },
    eventId: { type: DataTypes.STRING(120), allowNull: false, field: 'event_id' },
    eventType: { type: DataTypes.STRING(80), allowNull: false, field: 'event_type' },
    payload: { type: DataTypes.JSON, allowNull: true },
    processedAt: { type: DataTypes.DATE, allowNull: true, field: 'processed_at' },
  },
  { sequelize, modelName: 'WebhookReceipt', tableName: 'webhook_receipts' },
);
