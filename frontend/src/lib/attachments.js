/** Limite alinhado ao backend (safeFile.MAX_FILE_SIZE). */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENT_LABEL = '10 MB';

export function formatFileBytes(value) {
  const size = Number(value) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(size < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

/**
 * Separa arquivos válidos dos rejeitados por tamanho.
 * @returns {{ accepted: File[], rejected: { file: File, reason: string }[] }}
 */
export function partitionAttachmentsBySize(fileList, maxBytes = MAX_ATTACHMENT_BYTES) {
  const accepted = [];
  const rejected = [];
  for (const file of Array.from(fileList || []).filter(Boolean)) {
    if (file.size > maxBytes) {
      rejected.push({
        file,
        reason: `"${file.name}" tem ${formatFileBytes(file.size)} e excede o limite de ${MAX_ATTACHMENT_LABEL}.`,
      });
      continue;
    }
    accepted.push(file);
  }
  return { accepted, rejected };
}
