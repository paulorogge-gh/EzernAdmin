import { env } from '../config/env.js';
import { connectDb } from '../db/index.js';
import { Organization, syncModels, User } from '../models/index.js';
import { hashPassword } from '../services/password.js';
import { ensureOrganizationProfile } from '../services/organizationProfileService.js';

const name = process.env.SEED_OWNER_NAME || '';
const email = String(process.env.SEED_OWNER_EMAIL || '').trim().toLowerCase();
const password = process.env.SEED_OWNER_PASSWORD || '';

if (!email || !password) {
  console.error('Defina SEED_OWNER_EMAIL e SEED_OWNER_PASSWORD para executar o seed.');
  process.exit(1);
}

if (password.length < 12) {
  console.error('SEED_OWNER_PASSWORD deve ter pelo menos 12 caracteres.');
  process.exit(1);
}

if (env.isProd && !process.env.SEED_ALLOW_PRODUCTION) {
  console.error('Seed bloqueado em produção. Defina SEED_ALLOW_PRODUCTION=1 apenas se for intencional.');
  process.exit(1);
}

await connectDb();
await syncModels();

let org = await Organization.findOne({ where: { name: 'Ezern' } });
if (!org) {
  org = await Organization.create({
    name: 'Ezern',
    document: '37010664000141',
    status: 'ACTIVE',
  });
  console.log('Organization created');
} else {
  console.log('Organization already exists');
}

await ensureOrganizationProfile(org.id);
console.log('Organization profile ensured');

const existing = await User.findOne({ where: { email } });
if (existing) {
  console.log(`Owner already exists: ${email}`);
} else {
  await User.create({
    organizationId: org.id,
    name: name || 'Owner',
    email,
    role: 'OWNER',
    status: 'ACTIVE',
    ssoRequired: false,
    passwordHash: await hashPassword(password),
  });
  console.log(`Owner created: ${email}`);
}

process.exit(0);
