import { IconCheck } from '@tabler/icons-react';

/**
 * Seleção visual suave por cartões (ícone + título + descrição).
 */
export function ChoiceCards({
  label,
  value,
  options = [],
  onChange,
  error,
  hint,
  className = '',
}) {
  return (
    <div className={`field ${className}`.trim()}>
      {label ? <span className="field__label">{label}</span> : null}
      <div className="choice-cards" role="radiogroup" aria-label={label || undefined}>
        {options.map((opt) => {
          const active = value === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              className={`choice-card ${active ? 'is-active' : ''}`.trim()}
              onClick={() => onChange?.(opt.value)}
            >
              {Icon ? (
                <span className="choice-card__icon" aria-hidden="true">
                  <Icon size={18} stroke={1.75} />
                </span>
              ) : null}
              <span className="choice-card__copy">
                <span className="choice-card__title">{opt.label}</span>
                {opt.description ? (
                  <span className="choice-card__desc">{opt.description}</span>
                ) : null}
              </span>
              <span className="choice-card__check" aria-hidden="true">
                <IconCheck size={12} stroke={2.4} />
              </span>
            </button>
          );
        })}
      </div>
      {error ? <p className="field__error">{error}</p> : null}
      {!error && hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}
