import { env } from '../config/env.js';
import { buildInviteEmail, buildPasswordResetEmail } from '../emails/index.js';

let cachedGraphToken = null;
let cachedGraphTokenExpiresAt = 0;

export function mailConfigured() {
  if (env.emailTransport !== 'graph') return false;
  return Boolean(
    env.graph.tenantId &&
      env.graph.clientId &&
      env.graph.clientSecret &&
      env.defaultSender &&
      !env.defaultSender.includes('example.com'),
  );
}

async function getGraphAccessToken() {
  const now = Date.now();
  if (cachedGraphToken && now < cachedGraphTokenExpiresAt - 60_000) {
    return cachedGraphToken;
  }

  const tokenUrl = `https://login.microsoftonline.com/${env.graph.tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: env.graph.clientId,
    client_secret: env.graph.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!tokenRes.ok) {
    throw new Error(`Graph token falhou: ${tokenRes.status}`);
  }

  const payload = await tokenRes.json();
  cachedGraphToken = payload.access_token;
  const expiresIn = Number(payload.expires_in || 3600);
  cachedGraphTokenExpiresAt = now + expiresIn * 1000;
  return cachedGraphToken;
}

async function sendViaGraph({ to, subject, html, text }) {
  const accessToken = await getGraphAccessToken();
  const recipients = (Array.isArray(to) ? to : [to])
    .filter(Boolean)
    .map((address) => ({ emailAddress: { address: String(address).trim() } }));

  if (!recipients.length) {
    throw new Error('Destinatário de e-mail ausente');
  }

  const mailRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(env.defaultSender)}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject,
          body: {
            contentType: html ? 'HTML' : 'Text',
            content: html || text || '',
          },
          toRecipients: recipients,
        },
        saveToSentItems: false,
      }),
    },
  );

  if (!mailRes.ok) {
    const detail = await mailRes.text();
    console.error('[mail] Graph sendMail failed', mailRes.status, detail.slice(0, 200));
    throw new Error('Falha ao enviar e-mail');
  }
}

function redactSecrets(value) {
  return String(value || '')
    .replace(/([?#&]token=)[^&\s"'<>]+/gi, '$1[redacted]')
    .replace(/(token=)[A-Za-z0-9_-]{16,}/gi, '$1[redacted]')
    .replace(/#[^\s"'<>]*token=[^\s"'<>]+/gi, '#[redacted]');
}

/**
 * Transporte bruto. Prefira os helpers tipados.
 * Nunca loga corpo completo com tokens em claro.
 */
export async function sendMail({ to, subject, html, text }) {
  if (env.emailTransport === 'graph') {
    if (!mailConfigured()) {
      throw new Error('Transporte de e-mail Graph não configurado');
    }
    await sendViaGraph({ to, subject, html, text });
    return { transport: 'graph', sent: true };
  }

  if (env.isProd) {
    throw new Error('E-mail em modo log não é permitido em produção');
  }

  console.log('[mail:log]', {
    to,
    subject,
    preview: redactSecrets(text || html || '').slice(0, 160),
  });
  return { transport: 'log', sent: false };
}

export async function sendPasswordResetEmail(input) {
  const { subject, html, text } = buildPasswordResetEmail(input);
  return sendMail({ to: input.to, subject, html, text });
}

export async function sendInviteEmail(input) {
  const { subject, html, text } = buildInviteEmail(input);
  return sendMail({ to: input.to, subject, html, text });
}
