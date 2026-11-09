/**
 * Catálogo de templates de e-mail do Ezern Admin.
 * Novos tipos entram aqui como builders exportados.
 */
export { buildPasswordResetEmail } from './passwordReset.js';
export { buildInviteEmail } from './invite.js';
export {
  brandEmailShell,
  emailCtaButton,
  emailFooterNote,
  emailInfoCard,
  emailParagraph,
  escapeHtml,
  EMAIL_C,
} from './layout.js';
