/**
 * Seleção rápida em segmento (ex.: Pessoa física / Pessoa jurídica).
 * Com `readOnly`, funciona só como indicador visual (sem clique).
 */
export function SegmentedControl({
  label,
  value,
  options = [],
  onChange,
  error,
  hint,
  className = '',
  variant = 'default',
  readOnly = false,
}) {
  return (
    <div className={`field segmented-field ${className}`.trim()}>
      {label ? <span className="field__label">{label}</span> : null}
      <div
        className={`segmented ${variant !== 'default' ? `segmented--${variant}` : ''} ${readOnly ? 'is-readonly' : ''}`.trim()}
        role="radiogroup"
        aria-label={label || undefined}
        aria-readonly={readOnly || undefined}
      >
        {options.map((opt) => {
          const active = value === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              data-value={opt.value}
              tabIndex={readOnly ? -1 : 0}
              disabled={readOnly}
              className={`segmented__item ${active ? 'is-active' : ''}`.trim()}
              onClick={() => {
                if (readOnly) return;
                onChange?.(opt.value);
              }}
            >
              {Icon ? (
                <span className="segmented__icon" aria-hidden="true">
                  <Icon size={16} stroke={1.75} />
                </span>
              ) : null}
              <span className="segmented__label">{opt.label}</span>
            </button>
          );
        })}
      </div>
      {error ? <p className="field__error">{error}</p> : null}
      {!error && hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}
