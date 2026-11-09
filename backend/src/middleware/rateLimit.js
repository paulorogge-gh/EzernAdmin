import rateLimit from 'express-rate-limit';

function makeLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { message } },
  });
}

/** Login / refresh: mitiga força bruta e abuso de sessão. */
export const authSensitiveLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
});

/** Esqueci senha / reenvio de convite: mitiga spam de e-mail. */
export const mailActionLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 8,
  message: 'Limite de e-mails atingido. Tente novamente mais tarde.',
});

/** Reset / aceite de convite: mitiga enumeração de tokens. */
export const tokenActionLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Muitas tentativas. Aguarde e tente novamente.',
});

/** API geral autenticada. */
export const apiGeneralLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: 'Muitas requisições. Aguarde um momento.',
});
