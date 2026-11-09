import { useId } from 'react';

export function maskMoneyInput(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return { display: '', numeric: '' };

  const cents = digits.slice(-2).padStart(2, '0');
  const ints = digits.slice(0, -2).replace(/^0+/, '') || '0';
  const withThousands = ints.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const display = `${withThousands},${cents}`;
  const numeric = `${ints}.${cents}`;
  return { display, numeric };
}

export function formatNumberToMoneyDisplay(value) {
  if (value === '' || value == null) return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Campo monetário BRL (máscara pt-BR).
 * onChange emite evento estilo input com value numérico (ex. "1234.56" ou "").
 */
export function CurrencyInput({
  label,
  hint,
  error,
  value,
  onChange,
  name,
  id,
  required,
  disabled,
  className = '',
}) {
  const autoId = useId();
  const inputId = id || name || autoId;
  const display = formatNumberToMoneyDisplay(value);

  function handleChange(event) {
    const { numeric } = maskMoneyInput(event.target.value);
    onChange?.({
      target: { value: numeric, name: name || '' },
      currentTarget: { value: numeric, name: name || '' },
    });
  }

  return (
    <div className={`field ${className}`.trim()}>
      {label ? (
        <label className="field__label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <div className="field__control-wrap has-prefix">
        <span className="field__prefix">R$</span>
        <input
          id={inputId}
          name={name}
          inputMode="decimal"
          className={`field__control field__control--with-prefix field__control--money ${error ? 'is-invalid' : ''}`.trim()}
          placeholder="0,00"
          value={display}
          onChange={handleChange}
          required={required}
          disabled={disabled}
        />
      </div>
      {error ? <p className="field__error">{error}</p> : null}
      {!error && hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}
