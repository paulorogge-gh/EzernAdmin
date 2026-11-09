import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/index.js';

export class User extends Model {
  getAddress() {
    return {
      street: this.addressStreet || '',
      number: this.addressNumber || '',
      complement: this.addressComplement || '',
      neighborhood: this.addressNeighborhood || '',
      district: this.addressDistrict || '',
      city: this.addressCity || '',
      state: this.addressState || '',
      country: this.addressCountry || '',
      zip: this.addressZip || '',
      placeId: this.addressPlaceId || '',
      formatted: this.addressFormatted || '',
    };
  }

  toSafeJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      email: this.email,
      phone: this.phone || '',
      whatsappUsername: this.whatsappUsername || '',
      address: this.getAddress(),
      role: this.role,
      status: this.status,
      ssoRequired: this.ssoRequired,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
    };
  }
}

User.init(
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
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(190),
      allowNull: false,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    whatsappUsername: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: 'whatsapp_username',
    },
    addressStreet: {
      type: DataTypes.STRING(190),
      allowNull: true,
      field: 'address_street',
    },
    addressNumber: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'address_number',
    },
    addressComplement: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: 'address_complement',
    },
    addressNeighborhood: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: 'address_neighborhood',
    },
    addressDistrict: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: 'address_district',
    },
    addressCity: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: 'address_city',
    },
    addressState: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: 'address_state',
    },
    addressCountry: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: 'address_country',
    },
    addressZip: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'address_zip',
    },
    addressPlaceId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'address_place_id',
    },
    addressFormatted: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'address_formatted',
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'password_hash',
    },
    role: {
      type: DataTypes.ENUM('OWNER', 'ADMIN', 'MEMBER'),
      allowNull: false,
      defaultValue: 'MEMBER',
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INVITED', 'DISABLED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    ssoRequired: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'sso_required',
    },
    failedLoginCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'failed_login_count',
    },
    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'locked_until',
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login_at',
    },
  },
  { sequelize, modelName: 'User', tableName: 'users' },
);
