import { Router } from 'express';
import { Op } from 'sequelize';
import { env } from '../config/env.js';
import { memberPaths } from '../config/httpSurface.js';
import { buildInviteAcceptUrl } from '../lib/authLinks.js';
import { addressToUserFields, applyAddressToUser, validateAddress } from '../lib/address.js';
import { requireAuth, requireRole, loadUser } from '../middleware/auth.js';
import { mailActionLimiter } from '../middleware/rateLimit.js';
import { OneTimeToken, User } from '../models/index.js';
import { sendInviteEmail } from '../services/mail.js';
import { createOpaqueToken, hashOpaqueToken } from '../services/tokens.js';

export const usersRouter = Router();

usersRouter.use(requireAuth, loadUser, requireRole('OWNER', 'ADMIN'));

async function createInviteToken(userId) {
  await OneTimeToken.update(
    { usedAt: new Date() },
    {
      where: {
        userId,
        type: 'INVITE',
        usedAt: null,
      },
    },
  );

  const raw = createOpaqueToken();
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  await OneTimeToken.create({
    userId,
    type: 'INVITE',
    tokenHash: hashOpaqueToken(raw),
    expiresAt,
  });
  return { raw, expiresAt };
}

async function sendInvite(user, rawToken, expiresAt, inviterName) {
  await sendInviteEmail({
    to: user.email,
    userName: user.name,
    inviteUrl: buildInviteAcceptUrl(rawToken),
    expiresAt,
    inviterName,
  });
}

function resolveAddressPayload(rawAddress, { requiredIfPresent = true } = {}) {
  const hasAddress = Boolean(rawAddress?.placeId || rawAddress?.street || rawAddress?.formatted);
  if (!hasAddress) {
    return { ok: true, fields: null, address: null };
  }
  const check = validateAddress(rawAddress, { required: requiredIfPresent });
  if (!check.ok) return check;
  return { ok: true, fields: addressToUserFields(check.address), address: check.address };
}

function resolveSsoRequired(rawFlag) {
  const ssoRequired = Boolean(rawFlag);
  if (ssoRequired && !env.microsoftSsoEnabled) {
    return {
      ok: false,
      message: 'SSO Microsoft não está habilitado neste ambiente',
    };
  }
  return { ok: true, ssoRequired };
}

usersRouter.get('/', async (req, res, next) => {
  try {
    const users = await User.findAll({
      where: { organizationId: req.auth.organizationId },
      order: [['createdAt', 'ASC']],
    });
    return res.json({ data: users.map((u) => u.toSafeJSON()) });
  } catch (err) {
    return next(err);
  }
});

usersRouter.post('/', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const phone = String(req.body?.phone || '').trim();
    const whatsappUsername = String(req.body?.whatsappUsername || '')
      .trim()
      .replace(/^@+/, '');
    const role = String(req.body?.role || 'MEMBER').toUpperCase();
    const sso = resolveSsoRequired(req.body?.ssoRequired);

    if (!name || !email) {
      return res.status(400).json({ error: { message: 'Nome e e-mail são obrigatórios' } });
    }
    if (!['OWNER', 'ADMIN', 'MEMBER'].includes(role)) {
      return res.status(400).json({ error: { message: 'Perfil inválido' } });
    }
    if (role === 'OWNER' && req.auth.role !== 'OWNER') {
      return res.status(403).json({ error: { message: 'Apenas OWNER pode convidar outro OWNER' } });
    }
    if (!sso.ok) {
      return res.status(400).json({ error: { message: sso.message } });
    }

    const addressResult = resolveAddressPayload(req.body?.address);
    if (!addressResult.ok) {
      return res.status(400).json({ error: { message: addressResult.message } });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return res.status(409).json({ error: { message: 'E-mail já cadastrado' } });
    }

    const user = await User.create({
      organizationId: req.auth.organizationId,
      name,
      email,
      phone: phone || null,
      whatsappUsername: whatsappUsername || null,
      ...(addressResult.fields || {}),
      role,
      status: 'INVITED',
      ssoRequired: sso.ssoRequired,
      passwordHash: null,
    });

    const { raw, expiresAt } = await createInviteToken(user.id);
    await sendInvite(user, raw, expiresAt, req.user?.name);

    return res.status(201).json({ data: user.toSafeJSON() });
  } catch (err) {
    return next(err);
  }
});

usersRouter.patch('/:id', async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: { id: req.params.id, organizationId: req.auth.organizationId },
    });
    if (!user) {
      return res.status(404).json({ error: { message: 'Usuário não encontrado' } });
    }

    const { name, phone, whatsappUsername, address, role, status, ssoRequired } = req.body || {};

    if (user.role === 'OWNER' && req.auth.role !== 'OWNER') {
      return res.status(403).json({ error: { message: 'Apenas OWNER pode alterar outro OWNER' } });
    }

    if (name !== undefined) user.name = String(name).trim();
    if (phone !== undefined) user.phone = String(phone || '').trim() || null;
    if (whatsappUsername !== undefined) {
      user.whatsappUsername = String(whatsappUsername || '')
        .trim()
        .replace(/^@+/, '') || null;
    }
    if (address !== undefined) {
      const addressResult = resolveAddressPayload(address);
      if (!addressResult.ok) {
        return res.status(400).json({ error: { message: addressResult.message } });
      }
      applyAddressToUser(user, addressResult.address || {});
    }
    if (role !== undefined) {
      const nextRole = String(role).toUpperCase();
      if (!['OWNER', 'ADMIN', 'MEMBER'].includes(nextRole)) {
        return res.status(400).json({ error: { message: 'Perfil inválido' } });
      }
      if (nextRole === 'OWNER' && req.auth.role !== 'OWNER') {
        return res.status(403).json({ error: { message: 'Apenas OWNER pode promover a OWNER' } });
      }
      if (user.role === 'OWNER' && nextRole !== 'OWNER' && req.auth.role !== 'OWNER') {
        return res.status(403).json({ error: { message: 'Apenas OWNER pode demover outro OWNER' } });
      }
      user.role = nextRole;
    }
    if (status !== undefined) {
      const nextStatus = String(status).toUpperCase();
      if (!['ACTIVE', 'INVITED', 'DISABLED'].includes(nextStatus)) {
        return res.status(400).json({ error: { message: 'Status inválido' } });
      }
      if (user.role === 'OWNER' && nextStatus === 'DISABLED' && req.auth.role !== 'OWNER') {
        return res.status(403).json({ error: { message: 'Apenas OWNER pode desativar outro OWNER' } });
      }
      if (user.id === req.auth.userId && nextStatus === 'DISABLED') {
        return res.status(400).json({ error: { message: 'Você não pode desativar a própria conta' } });
      }
      user.status = nextStatus;
    }
    if (ssoRequired !== undefined) {
      const sso = resolveSsoRequired(ssoRequired);
      if (!sso.ok) {
        return res.status(400).json({ error: { message: sso.message } });
      }
      user.ssoRequired = sso.ssoRequired;
    }

    await user.save();
    return res.json({ data: user.toSafeJSON() });
  } catch (err) {
    return next(err);
  }
});

usersRouter.post(memberPaths.resendInvite, mailActionLimiter, async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: {
        id: req.params.id,
        organizationId: req.auth.organizationId,
        status: { [Op.ne]: 'DISABLED' },
      },
    });
    if (!user) {
      return res.status(404).json({ error: { message: 'Usuário não encontrado' } });
    }
    if (user.status !== 'INVITED') {
      return res.status(400).json({ error: { message: 'Usuário não está com convite pendente' } });
    }

    const { raw, expiresAt } = await createInviteToken(user.id);
    await sendInvite(user, raw, expiresAt, req.user?.name);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});
