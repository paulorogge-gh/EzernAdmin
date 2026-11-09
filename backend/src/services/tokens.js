import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { env } from '../config/env.js';
import { RefreshToken } from '../models/index.js';

const JWT_ALG = 'HS256';

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      org: user.organizationId,
      role: user.role,
    },
    env.jwtSecret,
    { algorithm: JWT_ALG, expiresIn: env.jwtAccessTtl },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret, { algorithms: [JWT_ALG] });
}

export function hashOpaqueToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function createOpaqueToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function createTokenFamilyId() {
  return crypto.randomUUID();
}

/**
 * Emite refresh token. Se `familyId` for omitido, cria nova família.
 */
export async function issueRefreshToken(userId, familyId = createTokenFamilyId()) {
  const raw = createOpaqueToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.jwtRefreshTtlDays);

  await RefreshToken.create({
    userId,
    familyId,
    tokenHash: hashOpaqueToken(raw),
    expiresAt,
  });

  return { raw, expiresAt, familyId };
}

export async function revokeRefreshToken(raw) {
  const tokenHash = hashOpaqueToken(raw);
  await RefreshToken.update(
    { revokedAt: new Date() },
    { where: { tokenHash, revokedAt: null } },
  );
}

export async function revokeAllRefreshTokens(userId) {
  await RefreshToken.update(
    { revokedAt: new Date() },
    { where: { userId, revokedAt: null } },
  );
}

export async function revokeRefreshFamily(familyId) {
  if (!familyId) return;
  await RefreshToken.update(
    { revokedAt: new Date() },
    { where: { familyId, revokedAt: null } },
  );
}

/**
 * Rotação atômica do refresh.
 * - Se o token já estiver revogado (reuso): invalida a família inteira e falha.
 * - Caso contrário: marca como usado com UPDATE condicional e emite o próximo.
 */
export async function rotateRefreshToken(raw) {
  const tokenHash = hashOpaqueToken(raw);
  const existing = await RefreshToken.findOne({ where: { tokenHash } });

  if (!existing) {
    return { ok: false, reason: 'missing' };
  }

  if (existing.expiresAt < new Date()) {
    if (!existing.revokedAt) {
      existing.revokedAt = new Date();
      await existing.save();
    }
    return { ok: false, reason: 'expired' };
  }

  if (existing.revokedAt) {
    // Possível roubo: token já rotacionado sendo reutilizado.
    await revokeRefreshFamily(existing.familyId);
    await revokeAllRefreshTokens(existing.userId);
    return { ok: false, reason: 'reuse' };
  }

  const [affected] = await RefreshToken.update(
    { revokedAt: new Date() },
    {
      where: {
        id: existing.id,
        revokedAt: null,
        expiresAt: { [Op.gt]: new Date() },
      },
    },
  );

  if (affected !== 1) {
    await revokeRefreshFamily(existing.familyId);
    await revokeAllRefreshTokens(existing.userId);
    return { ok: false, reason: 'race' };
  }

  const next = await issueRefreshToken(existing.userId, existing.familyId);
  return { ok: true, userId: existing.userId, refresh: next };
}
