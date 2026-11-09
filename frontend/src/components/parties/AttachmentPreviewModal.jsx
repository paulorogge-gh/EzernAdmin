import { useEffect, useState } from 'react';
import { IconDownload } from '@tabler/icons-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { BlockSkeleton } from '../ui/Skeleton';
import { apiDownload } from '../../lib/api';
import { API } from '../../lib/httpSurface';

function isImageType(contentType = '', name = '') {
  if (String(contentType).startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
}

function isPdfType(contentType = '', name = '') {
  if (String(contentType).includes('pdf')) return true;
  return /\.pdf$/i.test(name);
}

/**
 * Modal elevado para visualizar anexo.
 * Preferir `downloadUrl`; `partyId` permanece como fallback legado.
 */
export function AttachmentPreviewModal({
  open,
  partyId,
  downloadUrl,
  file,
  onBack,
  onDownload,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [objectUrl, setObjectUrl] = useState('');
  const [contentType, setContentType] = useState('');

  useEffect(() => {
    const url =
      downloadUrl ||
      (partyId && file?.id ? API.partyAttachmentDownload(partyId, file.id) : '');

    if (!open || !url || !file?.id) {
      setLoading(false);
      setError('');
      setContentType('');
      setObjectUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return '';
      });
      return undefined;
    }

    let cancelled = false;
    let createdUrl = '';

    setLoading(true);
    setError('');
    setContentType('');
    setObjectUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return '';
    });

    void (async () => {
      try {
        const result = await apiDownload(url);
        if (cancelled) return;
        createdUrl = URL.createObjectURL(result.blob);
        setObjectUrl(createdUrl);
        setContentType(result.contentType || result.blob.type || file.contentType || '');
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'Não foi possível abrir o anexo');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [open, partyId, downloadUrl, file?.id, file?.contentType]);

  const name = file?.originalName || file?.name || 'Anexo';
  const type = contentType || file?.contentType || file?.mimeType || '';
  const canPreviewImage = Boolean(objectUrl) && isImageType(type, name);
  const canPreviewPdf = Boolean(objectUrl) && isPdfType(type, name);

  return (
    <Modal
      open={open}
      elevated
      wide
      title={name}
      onClose={onBack}
      footer={
        <>
          <Button variant="ghost" onClick={onBack}>
            Voltar
          </Button>
          {onDownload && file ? (
            <Button type="button" onClick={() => onDownload(file)}>
              <IconDownload size={16} stroke={1.75} />
              Baixar
            </Button>
          ) : null}
        </>
      }
    >
      <div className="attachment-preview">
        {loading ? <BlockSkeleton active lines={6} className="attachment-preview__skeleton" /> : null}
        {!loading && error ? <p className="field__error">{error}</p> : null}
        {!loading && !error && canPreviewImage ? (
          <img className="attachment-preview__image" src={objectUrl} alt={name} />
        ) : null}
        {!loading && !error && canPreviewPdf ? (
          <iframe className="attachment-preview__frame" title={name} src={objectUrl} />
        ) : null}
        {!loading && !error && objectUrl && !canPreviewImage && !canPreviewPdf ? (
          <div className="attachment-preview__fallback">
            <p className="attachment-preview__fallback-title">Pré-visualização indisponível</p>
            <p className="attachment-preview__fallback-text">
              Este tipo de arquivo não pode ser exibido aqui. Use Baixar para abrir no seu
              dispositivo.
            </p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
