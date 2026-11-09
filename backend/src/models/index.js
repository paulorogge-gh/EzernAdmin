import { Organization } from './Organization.js';
import { User } from './User.js';
import { RefreshToken } from './RefreshToken.js';
import { OneTimeToken } from './OneTimeToken.js';
import { Party } from './Party.js';
import { PartyAttachment } from './PartyAttachment.js';
import { FinanceAccount } from './FinanceAccount.js';
import { FinanceCard } from './FinanceCard.js';
import { FinanceCategory } from './FinanceCategory.js';
import { CostCenter } from './CostCenter.js';
import { FinanceTransaction } from './FinanceTransaction.js';
import { FinanceTransactionAttachment } from './FinanceTransactionAttachment.js';
import { FinanceInvoice } from './FinanceInvoice.js';
import { OrganizationProfile } from './OrganizationProfile.js';
import { BillingService } from './BillingService.js';
import { BillingContract } from './BillingContract.js';
import { BillingContractItem } from './BillingContractItem.js';
import { BillingCharge } from './BillingCharge.js';
import { BillingChargeItem } from './BillingChargeItem.js';
import { SimplesTaxLedger } from './SimplesTaxLedger.js';
import { SimplesTaxPeriod } from './SimplesTaxPeriod.js';
import { WebhookReceipt } from './WebhookReceipt.js';
import { runMigrations } from '../db/migrate.js';

Organization.hasMany(User, { foreignKey: 'organizationId', as: 'users' });
User.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(OneTimeToken, { foreignKey: 'userId', as: 'tokens' });
OneTimeToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Organization.hasMany(Party, { foreignKey: 'organizationId', as: 'parties' });
Party.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Party.hasMany(PartyAttachment, { foreignKey: 'partyId', as: 'attachments', onDelete: 'CASCADE' });
PartyAttachment.belongsTo(Party, { foreignKey: 'partyId', as: 'party' });
Organization.hasMany(PartyAttachment, { foreignKey: 'organizationId', as: 'partyAttachments' });
PartyAttachment.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

Organization.hasMany(FinanceAccount, { foreignKey: 'organizationId', as: 'financeAccounts' });
FinanceAccount.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

Organization.hasMany(FinanceCard, { foreignKey: 'organizationId', as: 'financeCards' });
FinanceCard.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
FinanceCard.belongsTo(FinanceAccount, { foreignKey: 'accountId', as: 'account' });
FinanceAccount.hasMany(FinanceCard, { foreignKey: 'accountId', as: 'cards' });

Organization.hasMany(FinanceCategory, { foreignKey: 'organizationId', as: 'financeCategories' });
FinanceCategory.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
FinanceCategory.belongsTo(FinanceCategory, { foreignKey: 'parentId', as: 'parent' });
FinanceCategory.hasMany(FinanceCategory, { foreignKey: 'parentId', as: 'children' });

Organization.hasMany(CostCenter, { foreignKey: 'organizationId', as: 'costCenters' });
CostCenter.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

Organization.hasMany(FinanceTransaction, { foreignKey: 'organizationId', as: 'financeTransactions' });
FinanceTransaction.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
FinanceTransaction.belongsTo(FinanceCategory, { foreignKey: 'categoryId', as: 'category' });
FinanceTransaction.belongsTo(FinanceAccount, { foreignKey: 'accountId', as: 'account' });
FinanceTransaction.belongsTo(FinanceAccount, { foreignKey: 'transferAccountId', as: 'transferAccount' });
FinanceTransaction.belongsTo(FinanceCard, { foreignKey: 'cardId', as: 'card' });
FinanceTransaction.belongsTo(FinanceInvoice, { foreignKey: 'invoiceId', as: 'invoice' });
FinanceTransaction.belongsTo(Party, { foreignKey: 'partyId', as: 'party' });
FinanceTransaction.belongsTo(CostCenter, { foreignKey: 'costCenterId', as: 'costCenter' });
FinanceTransaction.hasMany(FinanceTransactionAttachment, {
  foreignKey: 'transactionId',
  as: 'attachments',
  onDelete: 'CASCADE',
});
FinanceTransactionAttachment.belongsTo(FinanceTransaction, {
  foreignKey: 'transactionId',
  as: 'transaction',
});
Organization.hasMany(FinanceTransactionAttachment, {
  foreignKey: 'organizationId',
  as: 'financeTransactionAttachments',
});
FinanceTransactionAttachment.belongsTo(Organization, {
  foreignKey: 'organizationId',
  as: 'organization',
});

Organization.hasMany(FinanceInvoice, { foreignKey: 'organizationId', as: 'financeInvoices' });
FinanceInvoice.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
FinanceInvoice.belongsTo(FinanceCard, { foreignKey: 'cardId', as: 'card' });
FinanceCard.hasMany(FinanceInvoice, { foreignKey: 'cardId', as: 'invoices' });
FinanceInvoice.hasMany(FinanceTransaction, { foreignKey: 'invoiceId', as: 'items' });

Organization.hasOne(OrganizationProfile, {
  foreignKey: 'organizationId',
  as: 'profile',
});
OrganizationProfile.belongsTo(Organization, {
  foreignKey: 'organizationId',
  as: 'organization',
});

Organization.hasMany(BillingService, { foreignKey: 'organizationId', as: 'billingServices' });
BillingService.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

Organization.hasMany(BillingContract, { foreignKey: 'organizationId', as: 'billingContracts' });
BillingContract.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
BillingContract.belongsTo(Party, { foreignKey: 'partyId', as: 'party' });
BillingContract.belongsTo(BillingService, { foreignKey: 'fiscalServiceId', as: 'fiscalService' });
BillingContract.hasMany(BillingContractItem, {
  foreignKey: 'contractId',
  as: 'items',
  onDelete: 'CASCADE',
});
BillingContractItem.belongsTo(BillingContract, { foreignKey: 'contractId', as: 'contract' });

Organization.hasMany(BillingCharge, { foreignKey: 'organizationId', as: 'billingCharges' });
BillingCharge.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
BillingCharge.belongsTo(BillingContract, { foreignKey: 'contractId', as: 'contract' });
BillingCharge.belongsTo(Party, { foreignKey: 'partyId', as: 'party' });
BillingCharge.hasMany(BillingChargeItem, {
  foreignKey: 'chargeId',
  as: 'items',
  onDelete: 'CASCADE',
});
BillingChargeItem.belongsTo(BillingCharge, { foreignKey: 'chargeId', as: 'charge' });

Organization.hasMany(SimplesTaxLedger, { foreignKey: 'organizationId', as: 'simplesTaxLedger' });
SimplesTaxLedger.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
SimplesTaxLedger.belongsTo(BillingCharge, { foreignKey: 'chargeId', as: 'charge' });

Organization.hasMany(SimplesTaxPeriod, { foreignKey: 'organizationId', as: 'simplesTaxPeriods' });
SimplesTaxPeriod.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

Organization.hasMany(WebhookReceipt, { foreignKey: 'organizationId', as: 'webhookReceipts' });
WebhookReceipt.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

export {
  Organization,
  User,
  RefreshToken,
  OneTimeToken,
  Party,
  PartyAttachment,
  FinanceAccount,
  FinanceCard,
  FinanceCategory,
  CostCenter,
  FinanceTransaction,
  FinanceTransactionAttachment,
  FinanceInvoice,
  OrganizationProfile,
  BillingService,
  BillingContract,
  BillingContractItem,
  BillingCharge,
  BillingChargeItem,
  SimplesTaxLedger,
  SimplesTaxPeriod,
  WebhookReceipt,
};

export async function syncModels() {
  await Organization.sync();
  await User.sync();
  await RefreshToken.sync();
  await OneTimeToken.sync();
  await Party.sync();
  await PartyAttachment.sync();
  await FinanceAccount.sync();
  await FinanceCard.sync();
  await FinanceCategory.sync();
  await CostCenter.sync();
  await FinanceInvoice.sync();
  await FinanceTransaction.sync();
  await FinanceTransactionAttachment.sync();
  await OrganizationProfile.sync();
  await BillingService.sync();
  await BillingContract.sync();
  await BillingContractItem.sync();
  await BillingCharge.sync();
  await BillingChargeItem.sync();
  await SimplesTaxLedger.sync();
  await SimplesTaxPeriod.sync();
  await WebhookReceipt.sync();
  await runMigrations();
}
