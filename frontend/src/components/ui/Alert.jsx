import {
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
  IconX,
} from '@tabler/icons-react';
import { IconButton } from './Button';

const icons = {
  success: IconCircleCheck,
  error: IconAlertTriangle,
  warning: IconAlertTriangle,
  info: IconInfoCircle,
};

const titles = {
  success: 'Sucesso',
  error: 'Erro',
  warning: 'Atenção',
  info: 'Informação',
};

export function Alert({
  variant = 'info',
  title,
  message,
  leaving = false,
  onClose,
}) {
  const Icon = icons[variant] || IconInfoCircle;
  return (
    <div className={`toast toast-${variant} ${leaving ? 'is-leaving' : ''}`.trim()}>
      <span className="toast__icon" aria-hidden>
        <Icon size={16} stroke={1.75} />
      </span>
      <div>
        <p className="toast__title">{title || titles[variant] || 'Aviso'}</p>
        <p className="toast__message">{message}</p>
      </div>
      {onClose ? (
        <IconButton aria-label="Fechar" onClick={onClose}>
          <IconX size={16} stroke={1.75} />
        </IconButton>
      ) : null}
    </div>
  );
}
