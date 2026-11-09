import { BRAND } from '../config/brand.js';
import {
  brandEmailShell,
  emailCtaButton,
  emailFooterNote,
  emailInfoCard,
  emailParagraph,
  escapeHtml,
} from './layout.js';

/**
 * Template padrão: recuperação de senha.
 * @param {{
 *   to: string,
 *   userName?: string,
 *   resetUrl: string,
 *   expiresAt?: Date|string|null,
 * }} input
 * @returns {{ subject: string, html: string, text: string }}
 */
export function buildPasswordResetEmail(input) {
  const greetingName = escapeHtml(input.userName || 'Olá');
  const email = escapeHtml(input.to || '');
  const expiresLabel = input.expiresAt
    ? new Date(input.expiresAt).toLocaleString('pt-BR')
    : 'em breve';

  const subject = `Redefinir senha - ${BRAND.productName}`;
  const title = 'Recuperação de senha';

  const rows = [
    emailParagraph(`Olá, ${greetingName}.`),
    emailParagraph(
      `Recebemos um pedido para redefinir a senha da sua conta no ${escapeHtml(BRAND.productName)}. Se foi você, use o botão abaixo. O link é de uso único e expira em breve.`,
    ),
    emailInfoCard('Conta', email),
    emailInfoCard('Validade', escapeHtml(expiresLabel)),
    emailCtaButton('Redefinir senha', input.resetUrl),
    emailParagraph(
      'Se você não solicitou esta alteração, ignore este e-mail. Sua senha permanece a mesma.',
    ),
    emailFooterNote(
      `Por segurança, nunca compartilhe este link. Em caso de dúvida, acesse o ${escapeHtml(BRAND.productName)} e use “Esqueci minha senha” novamente.`,
    ),
  ];

  const html = brandEmailShell(title, rows.join('\n'), {
    htmlLang: 'pt-BR',
    headerBadge: BRAND.productName,
    preheader: 'Link seguro para redefinir sua senha.',
  });

  const text = [
    `Olá, ${input.userName || ''}.`.trim(),
    '',
    `Recebemos um pedido para redefinir a senha da sua conta no ${BRAND.productName}.`,
    `Conta: ${input.to || ''}`,
    `Validade: ${expiresLabel}`,
    '',
    `Redefinir senha: ${input.resetUrl}`,
    '',
    'Se você não solicitou, ignore este e-mail.',
  ].join('\n');

  return { subject, html, text };
}
