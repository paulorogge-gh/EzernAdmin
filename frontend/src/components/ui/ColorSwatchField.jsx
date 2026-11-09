const DEFAULT_SWATCHES = [
  '#0f9f90',
  '#3dd6c6',
  '#2aa876',
  '#3d8f5a',
  '#5b8def',
  '#e07a3d',
  '#d64550',
  '#f0a500',
  '#6c5ce7',
  '#7a8ba0',
];

export function ColorSwatchField({
  label = 'Cor',
  value,
  onChange,
  swatches = DEFAULT_SWATCHES,
  disabled = false,
}) {
  const current = value || swatches[0];

  return (
    <div className={`field color-swatch-field ${disabled ? 'is-disabled' : ''}`.trim()}>
      {label ? <span className="field__label">{label}</span> : null}
      <div className="color-swatch-field__row" role="radiogroup" aria-label={label || 'Cor'}>
        {swatches.map((hex) => {
          const active = String(current).toLowerCase() === String(hex).toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              role="radio"
              aria-checked={active}
              title={hex}
              disabled={disabled}
              className={`color-swatch ${active ? 'is-active' : ''}`.trim()}
              style={{ background: hex }}
              onClick={() => {
                if (!disabled) onChange?.(hex);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
