import { Router } from 'express';
import { Op } from 'sequelize';
import { env } from '../config/env.js';
import { authPaths, cookiePathForAuth } from '../config/httpSurface.js';
import { buildPasswordResetUrl } from '../lib/authLinks.js';
import { OneTimeToken, Organization, User } from '../models/index.js';
import { requireAuth, loadUser } from '../middleware/auth.js';
import {
  authSensitiveLimiter,
  mailActionLimiter,
  tokenActionLimiter,
} from '../middleware/rateLimit.js';
import { applyAddressToUser, validateAddress } from '../lib/address.js';
import { sendPasswordResetEmail } from '../services/mail.js';
import { hashPassword, verifyPassword } from '../services/password.js';
import {
  createOpaqueToken,
  hashOpaqueToken,
  issueRefreshToken,
  revokeAllRefreshTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from '../services/tokens.js';

export const authRouter = Router();

const REFRESH_COOKIE = env.cookieSecure ? '__Secure-ezern_refresh' : 'ezern_refresh';
const LEGACY_REFRESH_COOKIE = 'ezern_refresh';
const AUTH_COOKIE_PATH = cookiePathForAuth();

/** Flags públicas (sem segredos) para o frontend alinhar UX à política do servidor. */
authRouter.get(authPaths.publicConfig, (_req, res) => {
  res.json({
    data: {
      microsoftSsoEnabled: env.microsoftSsoEnabled,
      passwordMinLength: 12,
    },
  });
});

function setRefreshCookie(res, raw, expiresAt) {
  res.cookie(REFRESH_COOKIE, raw, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
    expires: expiresAt,
    path: AUTH_COOKIE_PATH,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, {
    path: AUTH_COOKIE_PATH,
    secure: env.cookieSecure,
    sameSite: 'lax',
  });
  // Limpa cookie legado (path antigo) sem revelar estrutura nova.
  res.clearCookie(LEGACY_REFRESH_COOKIE, { path: '/api/auth', sameSite: 'lax' });
  res.clearCookie(LEGACY_REFRESH_COOKIE, { path: AUTH_COOKIE_PATH, sameSite: 'lax' });
}

function readRefreshRaw(req) {
  return req.cookies?.[REFRESH_COOKIE] || req.cookies?.[LEGACY_REFRESH_COOKIE] || null;
}

async function buildSession(user, res, familyId) {
  const accessToken = signAccessToken(user);
  const refresh = await issueRefreshToken(user.id, familyId);
  setRefreshCookie(res, refresh.raw, refresh.expiresAt);
  return {
    accessToken,
    user: user.toSafeJSON(),
  };
}

function assertPasswordAuthAllowed(user) {
  if (user.ssoRequired) {
    return {
      ok: false,
      status: 400,
      message: env.microsoftSsoEnabled
        ? 'Este usuário exige login Microsoft'
        : 'Este usuário exige SSO e não pode autenticar por senha',
    };
  }
  return { ok: true };
}

authRouter.post(authPaths.login, authSensitiveLimiter, async (req, res, next) => {
  try {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || '');

    const user = await User.findOne({
      where: { email },
      include: [{ model: Organization, as: 'organization' }],
    });
    if (!user || user.status !== 'ACTIVE' || !user.passwordHash) {
      return res.status(401).json({ error: { message: 'Credenciais inválidas' } });
    }
    if (user.organization?.status === 'SUSPENDED') {
      return res.status(403).json({ error: { message: 'Organização suspensa' } });
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json({ error: { message: 'Conta temporariamente bloqueada' } });
    }

    const ssoGate = assertPasswordAuthAllowed(user);
    if (!ssoGate.ok) {
      return res.status(ssoGate.status).json({ error: { message: ssoGate.message } });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      user.failedLoginCount += 1;
      if (user.failedLoginCount >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.failedLoginCount = 0;
      }
      await user.save();
      return res.status(401).json({ error: { message: 'Credenciais inválidas' } });
    }

    user.failedLoginCount = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    const data = await buildSession(user, res);
    return res.json({ data });
  } catch (err) {
    return next(err);
  }
});

authRouter.post(authPaths.refresh, authSensitiveLimiter, async (req, res, next) => {
  try {
    const raw = readRefreshRaw(req);
    if (!raw) {
      return res.status(401).json({ error: { message: 'Refresh ausente' } });
    }

    const rotated = await rotateRefreshToken(raw);
    if (!rotated.ok) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: { message: 'Refresh inválido' } });
    }

    const user = await User.findByPk(rotated.userId, {
      include: [{ model: Organization, as: 'organization' }],
    });
    if (!user || user.status !== 'ACTIVE') {
      clearRefreshCookie(res);
      return res.status(401).json({ error: { message: 'Usuário indisponível' } });
    }
    if (user.organization?.status === 'SUSPENDED') {
      clearRefreshCookie(res);
      return res.status(403).json({ error: { message: 'Organização suspensa' } });
    }

    setRefreshCookie(res, rotated.refresh.raw, rotated.refresh.expiresAt);
    return res.json({
      data: {
        accessToken: signAccessToken(user),
        user: user.toSafeJSON(),
      },
    });
  } catch (err) {
    return next(err);
  }
});

authRouter.post(authPaths.logout, async (req, res, next) => {
  try {
    const raw = readRefreshRaw(req);
    if (raw) await revokeRefreshToken(raw);
    clearRefreshCookie(res);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

authRouter.get(authPaths.me, requireAuth, loadUser, async (req, res) => {
  const organization = await req.user.getOrganization();
  return res.json({
    data: {
      ...req.user.toSafeJSON(),
      organization: organization
        ? { id: organization.id, name: organization.name, document: organization.document }
        : null,
    },
  });
});

authRouter.patch(authPaths.me, requireAuth, loadUser, async (req, res, next) => {
  try {
    const { name, phone, whatsappUsername, address, currentPassword, newPassword } = req.body || {};
    if (name !== undefined) req.user.name = String(name).trim();
    if (phone !== undefined) req.user.phone = String(phone || '').trim() || null;
    if (whatsappUsername !== undefined) {
      req.user.whatsappUsername = String(whatsappUsername || '')
        .trim()
        .replace(/^@+/, '') || null;
    }
    if (address !== undefined) {
      const hasAddress = Boolean(address?.placeId || address?.street || address?.formatted);
      const check = validateAddress(address, { required: hasAddress });
      if (!check.ok) {
        return res.status(400).json({ error: { message: check.message } });
      }
      applyAddressToUser(req.user, check.address);
    }

    if (newPassword) {
      const ssoGate = assertPasswordAuthAllowed(req.user);
      if (!ssoGate.ok) {
        return res.status(ssoGate.status).json({ error: { message: ssoGate.message } });
      }
      if (String(newPassword).length < 12) {
        return res.status(400).json({ error: { message: 'Nova senha: mínimo 12 caracteres' } });
      }
      const ok = await verifyPassword(String(currentPassword || ''), req.user.passwordHash);
      if (!ok) {
        return res.status(400).json({ error: { message: 'Senha atual incorreta' } });
      }
      req.user.passwordHash = await hashPassword(String(newPassword));
      await revokeAllRefreshTokens(req.user.id);
    }

    await req.user.save();
    return res.json({ data: req.user.toSafeJSON() });
  } catch (err) {
    return next(err);
  }
});

authRouter.post(authPaths.passwordForgot, mailActionLimiter, async (req, res, next) => {
  try {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const user = await User.findOne({ where: { email, status: { [Op.ne]: 'DISABLED' } } });

    // Resposta uniforme; só envia se a conta puder autenticar por senha.
    if (user && user.passwordHash && !user.ssoRequired) {
      await OneTimeToken.update(
        { usedAt: new Date() },
        {
          where: {
            userId: user.id,
            type: 'PASSWORD_RESET',
            usedAt: null,
          },
        },
      );

      const raw = createOpaqueToken();
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
      await OneTimeToken.create({
        userId: user.id,
        type: 'PASSWORD_RESET',
        tokenHash: hashOpaqueToken(raw),
        expiresAt,
      });

      await sendPasswordResetEmail({
        to: user.email,
        userName: user.name,
        resetUrl: buildPasswordResetUrl(raw),
        expiresAt,
      });
    }

    return res.json({ data: { ok: true } });
  } catch (err) {
    return next(err);
  }
});

authRouter.post(authPaths.passwordReset, tokenActionLimiter, async (req, res, next) => {
  try {
    const token = String(req.body?.token || '');
    const password = String(req.body?.password || '');
    if (password.length < 12) {
      return res.status(400).json({ error: { message: 'Senha: mínimo 12 caracteres' } });
    }

    const row = await OneTimeToken.findOne({
      where: {
        type: 'PASSWORD_RESET',
        tokenHash: hashOpaqueToken(token),
        usedAt: null,
        expiresAt: { [Op.gt]: new Date() },
      },
    });
    if (!row) {
      return res.status(400).json({ error: { message: 'Token inválido ou expirado' } });
    }

    const user = await User.findByPk(row.userId);
    if (!user) {
      return res.status(400).json({ error: { message: 'Usuário não encontrado' } });
    }
    if (user.ssoRequired) {
      return res.status(400).json({ error: { message: 'Conta com SSO não redefine senha local' } });
    }

    user.passwordHash = await hashPassword(password);
    user.status = 'ACTIVE';
    await user.save();
    row.usedAt = new Date();
    await row.save();
    await revokeAllRefreshTokens(user.id);

    return res.json({ data: { ok: true } });
  } catch (err) {
    return next(err);
  }
});

authRouter.post(authPaths.inviteAccept, tokenActionLimiter, async (req, res, next) => {
  try {
    const token = String(req.body?.token || '');
    const password = String(req.body?.password || '');
    if (password.length < 12) {
      return res.status(400).json({ error: { message: 'Senha: mínimo 12 caracteres' } });
    }

    const row = await OneTimeToken.findOne({
      where: {
        type: 'INVITE',
        tokenHash: hashOpaqueToken(token),
        usedAt: null,
        expiresAt: { [Op.gt]: new Date() },
      },
    });
    if (!row) {
      return res.status(400).json({ error: { message: 'Convite inválido ou expirado' } });
    }

    const user = await User.findByPk(row.userId);
    if (!user || user.status === 'DISABLED') {
      return res.status(400).json({ error: { message: 'Usuário indisponível' } });
    }
    if (user.ssoRequired) {
      return res.status(400).json({
        error: { message: 'Conta com SSO deve ser ativada pelo provedor Microsoft' },
      });
    }

    user.passwordHash = await hashPassword(password);
    user.status = 'ACTIVE';
    await user.save();
    row.usedAt = new Date();
    await row.save();
    await revokeAllRefreshTokens(user.id);

    const data = await buildSession(user, res);
    return res.json({ data });
  } catch (err) {
    return next(err);
  }
});
