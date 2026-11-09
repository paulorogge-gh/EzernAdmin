import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from '@tabler/icons-react';
import { Button, IconButton } from './Button';
import { BusyLabel } from './Processing';

const LEAVE_MS = 200;

function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
  wide = false,
  elevated = false,
  tone = '',
}) {
  const [visible, setVisible] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const [payload, setPayload] = useState({ title, children, footer, wide, elevated, tone });

  useBodyScrollLock(visible);

  // Mantém título/conteúdo/footer enquanto o modal anima a saída
  useEffect(() => {
    if (!open) return;
    setPayload({ title, children, footer, wide, elevated, tone });
  }, [open, title, children, footer, wide, elevated, tone]);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setLeaving(false);
      return undefined;
    }
    if (!visible) return undefined;
    setLeaving(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      setLeaving(false);
    }, LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [open, visible]);

  if (!visible) return null;

  const view = payload;

  return createPortal(
    <div
      className={`modal-root ${view.elevated ? 'modal-root--elevated' : ''}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-label={view.title}
    >
      <div className={`modal-backdrop ${leaving ? 'is-leaving' : ''}`} aria-hidden="true" />
      <div
        className={`modal-panel ${view.wide ? 'modal-panel--wide' : ''} ${view.tone ? `modal-panel--tone-${view.tone}` : ''} ${leaving ? 'is-leaving' : ''}`.trim()}
      >
        <header
          className={`modal-header block-header ${view.tone ? `modal-header--tone-${view.tone}` : ''}`.trim()}
        >
          <h2 className="block-header__title">{view.title}</h2>
          <IconButton aria-label="Fechar" onClick={onClose}>
            <IconX size={18} stroke={1.75} />
          </IconButton>
        </header>
        <div className="modal-body">{view.children}</div>
        {view.footer ? <footer className="modal-footer">{view.footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmModal({
  open,
  title = 'Confirmar',
  children,
  onClose,
  onConfirm,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  loading = false,
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            <BusyLabel active={loading} idle={confirmLabel} />
          </Button>
        </>
      }
    >
      <div className="modal-copy">{children}</div>
    </Modal>
  );
}
