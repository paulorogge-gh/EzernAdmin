import { useId, useRef, useState } from 'react';
import {
  IconDownload,
  IconFile,
  IconPaperclip,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_LABEL,
  formatFileBytes,
  partitionAttachmentsBySize,
} from '../../lib/attachments';
import { IconButton } from './Button';
import { Processing } from './Processing';

const ACCEPT_DEFAULT =
  '.pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.xls,.xlsx,application/pdf,image/*,text/plain';

function fileKey(file, index) {
  return `${file.name}:${file.size}:${file.lastModified}:${index}`;
}

export function FileDropzone({
  label = 'Anexos',
  hint = '',
  error = '',
  files = [],
  existing = [],
  onAddFiles,
  onRejectFiles,
  onRemovePending,
  onRemoveExisting,
  onDownloadExisting,
  disabled = false,
  busy = false,
  accept = ACCEPT_DEFAULT,
  multiple = true,
  maxBytes = MAX_ATTACHMENT_BYTES,
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function pickFiles(list) {
    const { accepted, rejected } = partitionAttachmentsBySize(list, maxBytes);
    if (rejected.length) onRejectFiles?.(rejected);
    if (accepted.length) onAddFiles?.(accepted);
  }

  function onInputChange(event) {
    pickFiles(event.target.files);
    event.target.value = '';
  }

  function onDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    if (disabled || busy) return;
    setDragging(true);
  }

  function onDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
  }

  function onDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    if (disabled || busy) return;
    pickFiles(event.dataTransfer?.files);
  }

  const hasItems = existing.length > 0 || files.length > 0;

  return (
    <div className={`field file-dropzone ${error ? 'has-error' : ''}`.trim()}>
      {label ? (
        <label className="field__label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}

      <div
        className={`file-dropzone__surface ${dragging ? 'is-dragging' : ''} ${disabled || busy ? 'is-disabled' : ''}`.trim()}
        role="button"
        tabIndex={disabled || busy ? -1 : 0}
        aria-controls={inputId}
        aria-label="Arraste arquivos aqui ou escolha no computador"
        onClick={() => {
          if (disabled || busy) return;
          inputRef.current?.click();
        }}
        onKeyDown={(event) => {
          if (disabled || busy) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={onDragOver}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="file-dropzone__input"
          accept={accept}
          multiple={multiple}
          disabled={disabled || busy}
          onChange={onInputChange}
          onClick={(event) => event.stopPropagation()}
        />

        <div className="file-dropzone__prompt">
          <span className="file-dropzone__icon" aria-hidden="true">
            <IconUpload size={22} stroke={1.6} />
          </span>
          <div className="file-dropzone__copy">
            <p className="file-dropzone__title">
              Arraste arquivos aqui ou escolha no computador
            </p>
            <p className="file-dropzone__meta">
              PDF, imagens, Word, Excel ou texto · até {MAX_ATTACHMENT_LABEL}
            </p>
          </div>
          {busy ? (
            <div className="file-dropzone__busy" aria-live="polite">
              <Processing active />
              <span>Enviando anexos</span>
            </div>
          ) : null}
        </div>
      </div>

      {hasItems ? (
        <ul className="file-dropzone__list">
          {existing.map((item) => (
            <li key={`saved-${item.id}`} className="file-dropzone__item">
              <span className="file-dropzone__item-icon" aria-hidden="true">
                <IconPaperclip size={16} stroke={1.75} />
              </span>
              <div className="file-dropzone__item-copy">
                <span className="file-dropzone__item-name">{item.originalName}</span>
                <span className="file-dropzone__item-size">{formatFileBytes(item.sizeBytes)}</span>
              </div>
              <div className="file-dropzone__item-actions">
                {onDownloadExisting ? (
                  <IconButton
                    type="button"
                    title="Baixar"
                    aria-label={`Baixar ${item.originalName}`}
                    disabled={disabled || busy}
                    onClick={() => onDownloadExisting(item)}
                  >
                    <IconDownload size={16} stroke={1.75} />
                  </IconButton>
                ) : null}
                {onRemoveExisting ? (
                  <IconButton
                    type="button"
                    danger
                    title="Remover"
                    aria-label={`Remover ${item.originalName}`}
                    disabled={disabled || busy}
                    onClick={() => onRemoveExisting(item)}
                  >
                    <IconTrash size={16} stroke={1.75} />
                  </IconButton>
                ) : null}
              </div>
            </li>
          ))}

          {files.map((file, index) => (
            <li key={`pending-${fileKey(file, index)}`} className="file-dropzone__item is-pending">
              <span className="file-dropzone__item-icon" aria-hidden="true">
                <IconFile size={16} stroke={1.75} />
              </span>
              <div className="file-dropzone__item-copy">
                <span className="file-dropzone__item-name">{file.name}</span>
                <span className="file-dropzone__item-size">{formatFileBytes(file.size)}</span>
              </div>
              <div className="file-dropzone__item-actions">
                {onRemovePending ? (
                  <IconButton
                    type="button"
                    danger
                    title="Remover"
                    aria-label={`Remover ${file.name}`}
                    disabled={disabled || busy}
                    onClick={() => onRemovePending(index)}
                  >
                    <IconTrash size={16} stroke={1.75} />
                  </IconButton>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="field__error">{error}</p> : null}
      {!error && hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}
