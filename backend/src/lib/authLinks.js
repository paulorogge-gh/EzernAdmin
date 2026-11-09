import { env } from '../config/env.js';
import { absoluteAppPath, appPaths } from '../config/httpSurface.js';

/**
 * Links sensíveis usam fragment (#token=…) para não vazar em Referer/logs de proxy.
 * Rotas da SPA também são opacas (sem “reset-password” / “accept-invite” literais).
 */
export function buildPasswordResetUrl(rawToken) {
  return absoluteAppPath(
    env.appBaseUrl,
    appPaths.resetPassword,
    `#token=${encodeURIComponent(rawToken)}`,
  );
}

export function buildInviteAcceptUrl(rawToken) {
  return absoluteAppPath(
    env.appBaseUrl,
    appPaths.acceptInvite,
    `#token=${encodeURIComponent(rawToken)}`,
  );
}
