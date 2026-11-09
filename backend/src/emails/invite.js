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
 * Template padrão: convite de usuário.
 * @param {{
 *   to: string,
 *   userName?: string,
 *   inviteUrl: string,
 *   expiresAt?: Date|string|null,
 *   inviterName?: string,
 * }} input
 */
export function buildInviteEmail(input) {
  const greetingName = escapeHtml(input.userName || 'Olá');
  const email = escapeHtml(input.to || '');
  const inviter = escapeHtml(input.inviterName || '');
  const expiresLabel = input.expiresAt
    ? new Date(input.expiresAt).toLocaleString('pt-BR')
    : 'em breve';

  const subject = `Convite - ${BRAND.productName}`;
  const title = 'Você foi convidado';

  const intro = inviter
    ? `${inviter} convidou você para acessar o ${escapeHtml(BRAND.productName)}.`
    : `Você foi convidado para acessar o ${escapeHtml(BRAND.productName)}.`;

  const rows = [
    emailParagraph(`Olá, ${greetingName}.`),
    emailParagraph(intro),
    emailInfoCard('Conta', email),
    emailInfoCard('Validade do convite', escapeHtml(expiresLabel)),
    emailCtaButton('Aceitar convite', input.inviteUrl),
    emailParagraph(
      'Se você não esperava este convite, ignore este e-mail.',
    ),
    emailFooterNote(
      `Por segurança, nunca compartilhe este link. O acesso é pessoal e intransferível.`,
    ),
  ];

  const html = brandEmailShell(title, rows.join('\n'), {
    htmlLang: 'pt-BR',
    headerBadge: BRAND.productName,
    preheader: `Convite para o ${BRAND.productName}.`,
  });

  const text = [
    `Olá, ${input.userName || ''}.`.trim(),
    '',
    input.inviterName
      ? `${input.inviterName} convidou você para o ${BRAND.productName}.`
      : `Você foi convidado para o ${BRAND.productName}.`,
    `Conta: ${input.to || ''}`,
    `Validade: ${expiresLabel}`,
    '',
    `Aceitar convite: ${input.inviteUrl}`,
    '',
    'Se você não esperava este convite, ignore este e-mail.',
  ].join('\n');

  return { subject, html, text };
}
