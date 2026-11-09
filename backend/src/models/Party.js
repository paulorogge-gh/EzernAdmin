import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/index.js';

export class Party extends Model {
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

  getKind() {
    if (this.isCustomer && this.isSupplier) return 'BOTH';
    if (this.isSupplier) return 'SUPPLIER';
    return 'CUSTOMER';
  }

  getBillingContacts() {
    const raw = this.billingContacts;
    if (Array.isArray(raw) && raw.length) {
      return raw.map((item) => ({
        name: String(item?.name || '').trim(),
        email: String(item?.email || '').trim().toLowerCase(),
        emailActive: item?.emailActive !== false,
      }));
    }
    const name = this.billingContactName || '';
    const email = this.billingEmail || '';
    if (!name && !email) return [];
    return [{ name, email, emailActive: true }];
  }

  toSafeJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      personType: this.personType,
      document: this.document || '',
      legalName: this.legalName,
      tradeName: this.tradeName || '',
      contactName: this.contactName || '',
      birthDate: this.birthDate || null,
      email: this.email || '',
      phone: this.phone || '',
      whatsappUsername: this.whatsappUsername || '',
      isCustomer: Boolean(this.isCustomer),
      isSupplier: Boolean(this.isSupplier),
      kind: this.getKind(),
      status: this.status,
      notes: this.notes || '',
      billingContacts: this.getBillingContacts(),
      billingContactName: this.billingContactName || '',
      billingEmail: this.billingEmail || '',
      bankCode: this.bankCode || '',
      bankAgency: this.bankAgency || '',
      bankAccount: this.bankAccount || '',
      bankAccountType: this.bankAccountType || null,
      pixKey: this.pixKey || '',
      bankHolderKind: this.bankHolderKind || null,
      bankHolderName: this.bankHolderName || '',
      address: this.getAddress(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Party.init(
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
    personType: {
      type: DataTypes.ENUM('PF', 'PJ'),
      allowNull: false,
      field: 'person_type',
    },
    document: {
      type: DataTypes.STRING(14),
      allowNull: false,
    },
    legalName: {
      type: DataTypes.STRING(190),
      allowNull: false,
      field: 'legal_name',
    },
    tradeName: {
      type: DataTypes.STRING(190),
      allowNull: true,
      field: 'trade_name',
    },
    contactName: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: 'contact_name',
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'birth_date',
    },
    email: {
      type: DataTypes.STRING(190),
      allowNull: true,
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
    isCustomer: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_customer',
    },
    isSupplier: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_supplier',
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'DISABLED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    billingContactName: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: 'billing_contact_name',
    },
    billingEmail: {
      type: DataTypes.STRING(190),
      allowNull: true,
      field: 'billing_email',
    },
    billingContacts: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'billing_contacts',
    },
    bankCode: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'bank_code',
    },
    bankAgency: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'bank_agency',
    },
    bankAccount: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'bank_account',
    },
    bankAccountType: {
      type: DataTypes.ENUM('CHECKING', 'SAVINGS'),
      allowNull: true,
      field: 'bank_account_type',
    },
    pixKey: {
      type: DataTypes.STRING(140),
      allowNull: true,
      field: 'pix_key',
    },
    bankHolderKind: {
      type: DataTypes.ENUM('OWN', 'OTHER'),
      allowNull: true,
      field: 'bank_holder_kind',
    },
    bankHolderName: {
      type: DataTypes.STRING(190),
      allowNull: true,
      field: 'bank_holder_name',
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
  },
  {
    sequelize,
    modelName: 'Party',
    tableName: 'parties',
    indexes: [
      {
        unique: true,
        fields: ['organization_id', 'document'],
        name: 'parties_org_document_unique',
      },
    ],
  },
);
