import { Router } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import { blobPaths } from '../config/httpSurface.js';
import {
  MAX_FILE_SIZE,
  detectSafeType,
} from '../lib/safeFile.js';
import { requireAuth, requireRole, loadUser } from '../middleware/auth.js';
import { downloadBlob, uploadBlob } from '../services/blob.js';
import { createOpaqueToken } from '../services/tokens.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

export const filesRouter = Router();

filesRouter.use(requireAuth, loadUser, requireRole('OWNER', 'ADMIN'));

function blobConfigured(res) {
  if (env.blob.connectionString) return true;
  res.status(503).json({ error: { message: 'Armazenamento de arquivos não configurado' } });
  return false;
}

function assertOrgScopedName(organizationId, name) {
  const normalized = String(name || '').replace(/^\/+/, '');
  const prefix = `${organizationId}/`;
  if (!normalized.startsWith(prefix) || normalized.includes('..')) {
    return null;
  }
  return normalized;
}

filesRouter.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!blobConfigured(res)) return undefined;
    if (!req.file) {
      return res.status(400).json({ error: { message: 'Arquivo obrigatório' } });
    }

    const check = await detectSafeType(req.file.buffer, req.file.mimetype);
    if (!check.ok) {
      return res.status(400).json({ error: { message: check.message } });
    }

    const ext = check.ext || 'bin';
    // Nome interno opaco: sem nome original do arquivo na URL/path.
    const name = `${req.auth.organizationId}/${createOpaqueToken()}.${ext}`;
    const result = await uploadBlob(name, req.file.buffer, check.mime);
    return res.status(201).json({
      data: {
        id: result.name,
        contentType: result.contentType,
      },
    });
  } catch (err) {
    return next(err);
  }
});

filesRouter.get(blobPaths.download, async (req, res, next) => {
  try {
    if (!blobConfigured(res)) return undefined;
    const scoped = assertOrgScopedName(
      req.auth.organizationId,
      req.query.id || req.query.name,
    );
    if (!scoped) {
      return res.status(404).json({ error: { message: 'Arquivo não encontrado' } });
    }
    const file = await downloadBlob(scoped);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'attachment; filename="arquivo"');
    return res.send(file.buffer);
  } catch (err) {
    return next(err);
  }
});
