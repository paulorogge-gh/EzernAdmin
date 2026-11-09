/**
 * Toggle switch alinhado aos campos do formulário.
 * `size="sm"` deixa o controle mais compacto (ex.: linhas de contato).
 */
export function SwitchField({
  label,
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  className = '',
  'aria-label': ariaLabel,
}) {
  return (
    <div
      className={`switch-field ${size === 'sm' ? 'switch-field--sm' : ''} ${checked ? 'is-on' : ''} ${className}`.trim()}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}
        className="switch-field__control"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          onChange?.(!checked);
        }}
      >
        <span className="switch-field__thumb" aria-hidden="true" />
      </button>
      {label ? <span className="switch-field__label">{label}</span> : null}
    </div>
  );
}
