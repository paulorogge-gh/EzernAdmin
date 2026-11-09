/**
 * Superfície HTTP pública opaca.
 * Nomes internos (auth/users/files) não aparecem nas URLs expostas.
 *
 * Pode ser sobrescrito via HTTP_SURFACE_ROOT (ex.: /g).
 */
const root = normalizeRoot(process.env.HTTP_SURFACE_ROOT || '/g');

function normalizeRoot(value) {
  const raw = String(value || '/g').trim() || '/g';
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withSlash.replace(/\/+$/, '') || '/g';
}

function join(base, ...parts) {
  const tail = parts
    .filter((p) => p !== undefined && p !== null && p !== '')
    .map((p) => String(p).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
  if (!tail) return base;
  return `${base}/${tail}`;
}

/** Montagens de routers */
export const surface = {
  root,
  auth: join(root, 'a'),
  members: join(root, 'm'),
  parties: join(root, 'c'),
  finance: join(root, 'n'),
  billing: join(root, 'f'),
  hooks: join(root, 'h'),
  query: join(root, 'q'),
  blob: join(root, 'b'),
  health: join(root, 'z'),
};

/** Rotas relativas dentro de cada router */
export const authPaths = {
  login: '/i',
  refresh: '/t',
  logout: '/x',
  me: '/p',
  publicConfig: '/c',
  passwordForgot: '/w/f',
  passwordReset: '/w/r',
  inviteAccept: '/v/a',
};

export const memberPaths = {
  resendInvite: '/:id/n',
};

export const queryPaths = {
  address: '/e',
  place: '/e/:placeId',
  cnpj: '/j/:cnpj',
};

export const blobPaths = {
  download: '/y',
};

export const healthPaths = {
  live: '/',
  ready: '/r',
};

/** Rotas da SPA (links de e-mail / deep links) */
export const appPaths = {
  home: '/',
  login: '/i',
  forgotPassword: '/w',
  resetPassword: '/w/n',
  acceptInvite: '/v',
  members: '/m',
  parties: '/c',
  profile: '/p',
  transactions: '/n',
  invoices: '/n/i',
  billing: '/f',
  billingContracts: '/f/c',
  billingCharges: '/f/h',
  billingServices: '/f/s',
  billingTaxes: '/f/t',
  settings: '/s',
  settingsAccounts: '/s/a',
  settingsCards: '/s/k',
  settingsCategories: '/s/g',
  settingsCostCenters: '/s/o',
  settingsCompany: '/s/e',
  settingsAsaas: '/s/n',
};

export function absoluteAppPath(baseUrl, appPath, hash = '') {
  const base = String(baseUrl || '').replace(/\/+$/, '');
  const path = appPath.startsWith('/') ? appPath : `/${appPath}`;
  return `${base}${path}${hash || ''}`;
}

export function cookiePathForAuth() {
  return surface.auth;
}
