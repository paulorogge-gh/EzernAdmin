import FileType from 'file-type';

export const ALLOWED_BY_MIME = {
  'application/pdf': ['pdf'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'text/plain': ['txt'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
};

export const ALLOWED_MIME = new Set(Object.keys(ALLOWED_BY_MIME));

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 12;

export async function detectSafeType(buffer, declaredMime) {
  const detected = await FileType.fromBuffer(buffer);
  if (detected) {
    if (!ALLOWED_MIME.has(detected.mime)) {
      return { ok: false, message: 'Tipo de arquivo não permitido' };
    }
    return { ok: true, mime: detected.mime, ext: detected.ext };
  }

  // text/plain não tem assinatura mágica confiável
  if (declaredMime === 'text/plain') {
    const sample = buffer.slice(0, 2048).toString('utf8');
    if (sample.includes('\u0000')) {
      return { ok: false, message: 'Tipo de arquivo não permitido' };
    }
    return { ok: true, mime: 'text/plain', ext: 'txt' };
  }

  return { ok: false, message: 'Não foi possível validar o tipo do arquivo' };
}

export function sanitizeOriginalName(name) {
  const base = String(name || 'arquivo')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
  return base || 'arquivo';
}

/** Diretório no storage: {org}/parties/{partyId}/{fileId}.{ext} */
export function partyAttachmentBlobPath(organizationId, partyId, fileId, ext) {
  const safeExt = String(ext || 'bin').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  return `${organizationId}/parties/${partyId}/${fileId}.${safeExt}`;
}

/** Diretório no storage: {org}/finance/transactions/{txId}/{fileId}.{ext} */
export function financeTransactionAttachmentBlobPath(organizationId, transactionId, fileId, ext) {
  const safeExt = String(ext || 'bin').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  return `${organizationId}/finance/transactions/${transactionId}/${fileId}.${safeExt}`;
}
