/** Shell HTML e helpers de e-mail — marca Ezern Admin. */

import { BRAND } from '../config/brand.js';

export const EMAIL_C = {
  paper: '#f3f1ec',
  paperDeep: '#ebe7e0',
  soft: '#e8f0eb',
  card: '#fffcf8',
  border: '#e2ddd4',
  ink: '#152019',
  secondary: '#3d4a41',
  muted: '#66756b',
  accent: '#a8844a',
  accentHover: '#8f6f3a',
  accentTint: 'rgba(168, 132, 74, 0.14)',
  forest: '#183528',
  contrast: '#ffffff',
};

export const EMAIL_FONT_BODY =
  "'DM Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
export const EMAIL_FONT_DISPLAY =
  "'Source Serif 4', Georgia, 'Times New Roman', serif";

export function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

/**
 * @param {string} title
 * @param {string} innerRows HTML de <tr>…</tr>
 * @param {{ preheader?: string, htmlLang?: string, headerBadge?: string }} [opts]
 */
export function brandEmailShell(title, innerRows, opts = {}) {
  const htmlLang = opts.htmlLang ?? 'pt-BR';
  const headerBadge = opts.headerBadge ?? BRAND.productName;
  const pre = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>`
    : '';
  const C = EMAIL_C;

  return `<!DOCTYPE html>
<html lang="${escapeHtml(htmlLang)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background-color:${C.paper};font-family:${EMAIL_FONT_BODY};-webkit-font-smoothing:antialiased;color:${C.ink};">
  ${pre}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.paper};">
    <tr>
      <td align="center" style="padding:36px 16px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
          <tr>
            <td style="padding:28px 32px 0;background-color:${C.card};border:1px solid ${C.border};border-bottom:none;border-radius:16px 16px 0 0;box-shadow:0 1px 0 rgba(21,32,25,0.04);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="padding:0 0 22px;">
                    <p style="margin:0;font-family:${EMAIL_FONT_BODY};font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:${C.accent};">${escapeHtml(headerBadge)}</p>
                    <h1 style="margin:10px 0 0;font-family:${EMAIL_FONT_DISPLAY};font-size:26px;font-weight:400;letter-spacing:-0.02em;line-height:1.2;color:${C.forest};">${escapeHtml(title)}</h1>
                  </td>
                </tr>
                <tr><td style="border-bottom:2px solid ${C.accent};font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 32px;background-color:${C.card};border:1px solid ${C.border};border-top:none;border-radius:0 0 16px 16px;box-shadow:0 12px 40px rgba(21,32,25,0.06);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${innerRows}</table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 16px 8px;">
              <p style="margin:0 0 4px;font-family:${EMAIL_FONT_DISPLAY};font-size:15px;font-weight:400;color:${C.forest};">${escapeHtml(BRAND.productName)}</p>
              <p style="margin:0;font-family:${EMAIL_FONT_BODY};font-size:11px;line-height:1.6;color:${C.muted};">${escapeHtml(BRAND.productTagline)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailParagraph(html) {
  const C = EMAIL_C;
  return `<tr><td style="padding-bottom:16px;"><p style="margin:0;font-family:${EMAIL_FONT_BODY};font-size:15px;line-height:1.65;color:${C.ink};">${html}</p></td></tr>`;
}

export function emailInfoCard(label, value) {
  const C = EMAIL_C;
  return `<tr><td style="padding-bottom:20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.paperDeep};border:1px solid ${C.border};border-radius:12px;">
      <tr><td style="padding:16px 18px;">
        <p style="margin:0 0 4px;font-family:${EMAIL_FONT_BODY};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};">${label}</p>
        <p style="margin:0;font-family:${EMAIL_FONT_BODY};font-size:15px;font-weight:600;color:${C.ink};word-break:break-word;">${value}</p>
      </td></tr>
    </table>
  </td></tr>`;
}

function ctaLinkFallback(href) {
  const C = EMAIL_C;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.paperDeep};border:1px solid ${C.border};border-radius:10px;">
    <tr>
      <td style="padding:11px 14px;text-align:center;">
        <p style="margin:0 0 5px;font-family:${EMAIL_FONT_BODY};font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">Link direto</p>
        <p style="margin:0;font-family:Consolas,Monaco,'Courier New',monospace;font-size:10px;line-height:1.55;color:${C.muted};word-break:break-all;">
          <a href="${href}" target="_blank" style="color:${C.accentHover};text-decoration:none;">${href}</a>
        </p>
      </td>
    </tr>
  </table>`;
}

export function emailCtaButton(label, href) {
  const C = EMAIL_C;
  const safeHref = escapeAttr(href);
  return `<tr><td style="padding:8px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${C.border};">
      <tr>
        <td align="center" style="padding:20px 0 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="center" style="border-radius:12px;background-color:${C.forest};border:1px solid ${C.forest};">
              <a href="${safeHref}" target="_blank" style="display:inline-block;padding:13px 28px;font-family:${EMAIL_FONT_BODY};font-size:13px;font-weight:600;letter-spacing:0.02em;color:${C.contrast};text-decoration:none;border-radius:12px;">${escapeHtml(label)}</a>
            </td>
          </tr></table>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 0 0;">
          ${ctaLinkFallback(safeHref)}
        </td>
      </tr>
    </table>
  </td></tr>`;
}

export function emailFooterNote(textHtml) {
  const C = EMAIL_C;
  return `<tr><td style="padding-top:8px;border-top:1px solid ${C.border};">
    <p style="margin:16px 0 0;font-family:${EMAIL_FONT_BODY};font-size:12px;line-height:1.5;color:${C.muted};">${textHtml}</p>
  </td></tr>`;
}
