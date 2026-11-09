import { Organization, User } from '../models/index.js';
import { verifyAccessToken } from '../services/tokens.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: { message: 'Não autenticado' } });
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.sub,
      organizationId: payload.org,
      role: payload.role,
    };
    return next();
  } catch {
    return res.status(401).json({ error: { message: 'Sessão inválida ou expirada' } });
  }
}

/** Usa o papel atual do banco (após loadUser), não só o JWT. */
export function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.user?.role || req.auth?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ error: { message: 'Sem permissão' } });
    }
    return next();
  };
}

export async function loadUser(req, res, next) {
  try {
    const user = await User.findByPk(req.auth.userId, {
      include: [{ model: Organization, as: 'organization' }],
    });
    if (!user || user.status === 'DISABLED') {
      return res.status(401).json({ error: { message: 'Usuário indisponível' } });
    }
    if (user.organization?.status === 'SUSPENDED') {
      return res.status(403).json({ error: { message: 'Organização suspensa' } });
    }
    // Mantém auth alinhado ao estado atual do banco
    req.auth.role = user.role;
    req.auth.organizationId = user.organizationId;
    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}
