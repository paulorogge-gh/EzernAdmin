import { useId } from 'react';
import { IconSearch, IconX } from '@tabler/icons-react';

/**
 * Campo de busca global do projeto (ícone + limpar).
 */
export function SearchField({
  value = '',
  onChange,
  placeholder = 'Buscar...',
  label = 'Buscar',
  className = '',
  id,
  ...props
}) {
  const autoId = useId();
  const inputId = id || props.name || autoId;

  return (
    <div className={`search-field ${className}`.trim()}>
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      <span className="search-field__icon" aria-hidden="true">
        <IconSearch size={18} stroke={1.75} />
      </span>
      <input
        id={inputId}
        type="search"
        className="search-field__control"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
        autoComplete="off"
        {...props}
      />
      {value ? (
        <button
          type="button"
          className="search-field__clear"
          aria-label="Limpar busca"
          title="Limpar busca"
          onClick={() => onChange?.('')}
        >
          <IconX size={16} stroke={1.75} />
        </button>
      ) : null}
    </div>
  );
}
