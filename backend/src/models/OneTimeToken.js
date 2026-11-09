import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/index.js';

export class OneTimeToken extends Model {}

OneTimeToken.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    type: {
      type: DataTypes.ENUM('INVITE', 'PASSWORD_RESET'),
      allowNull: false,
    },
    tokenHash: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true,
      field: 'token_hash',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'used_at',
    },
  },
  { sequelize, modelName: 'OneTimeToken', tableName: 'one_time_tokens' },
);
