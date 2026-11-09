import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const envPath = path.join(root, '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

function bool(value, fallback = false) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

export const env = {
  nodeEnv,
  isProd,
  port: Number(process.env.PORT || 3001),
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:5173',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
  serveWeb: bool(process.env.SERVE_WEB, false),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    name: process.env.DB_NAME || 'ezern_admin_app',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    ssl: bool(process.env.DB_SSL, false),
  },
  jwtSecret: process.env.JWT_SECRET || '',
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
  jwtRefreshTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS || 7),
  cookieSecure: bool(process.env.COOKIE_SECURE, isProd),
  emailTransport: process.env.EMAIL_TRANSPORT || (isProd ? 'graph' : 'log'),
  defaultSender: process.env.DEFAULT_SENDER_MAILBOX || 'noreply@example.com',
  graph: {
    tenantId: process.env.GRAPH_TENANT_ID || '',
    clientId: process.env.GRAPH_CLIENT_ID || '',
    clientSecret: process.env.GRAPH_CLIENT_SECRET || '',
  },
  blob: {
    connectionString: process.env.BLOB_CONNECTION_STRING || '',
    container: process.env.BLOB_CONTAINER || 'documents',
  },
  googlePlacesApiKey:
    process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
  microsoftSsoEnabled: bool(process.env.MICROSOFT_SSO_ENABLED, false),
  healthReadyToken: process.env.HEALTH_READY_TOKEN || '',
  corsOrigins: String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};

function assertSecureBoot() {
  const errors = [];

  if (!env.jwtSecret || env.jwtSecret.length < 32) {
    errors.push('JWT_SECRET deve ter pelo menos 32 caracteres');
  }
  const weakSecrets = new Set([
    'dev-insecure-secret-change-me',
    'change-me-to-a-long-random-string',
    'dev-local-jwt-secret-change-me-32b-minimum-value',
  ]);
  if (isProd && weakSecrets.has(env.jwtSecret)) {
    errors.push('JWT_SECRET não pode ser um valor de exemplo/placeholder');
  }

  if (isProd) {
    if (!env.cookieSecure) {
      errors.push('COOKIE_SECURE=true é obrigatório em produção');
    }
    if (env.emailTransport !== 'graph') {
      errors.push('EMAIL_TRANSPORT=graph é obrigatório em produção');
    }
    if (!env.graph.tenantId || !env.graph.clientId || !env.graph.clientSecret) {
      errors.push('Credenciais GRAPH_* são obrigatórias em produção');
    }
    if (!env.defaultSender || env.defaultSender.includes('example.com')) {
      errors.push('DEFAULT_SENDER_MAILBOX real é obrigatório em produção');
    }
    if (!env.db.ssl) {
      errors.push('DB_SSL=true é obrigatório em produção');
    }
    if (!env.db.password) {
      errors.push('DB_PASSWORD é obrigatório em produção');
    }
    if (!env.appBaseUrl.startsWith('https://')) {
      errors.push('APP_BASE_URL deve usar https em produção');
    }
  }

  if (errors.length) {
    throw new Error(`Configuração insegura:\n- ${errors.join('\n- ')}`);
  }
}

assertSecureBoot();
