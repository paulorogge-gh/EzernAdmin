/**
 * Barra de filtros/busca acima de listagens (fora do quadro da tabela).
 */
export function ListToolbar({ children, className = '' }) {
  return <div className={`list-toolbar ${className}`.trim()}>{children}</div>;
}

/**
 * Grupo de toggles (chips/segmentos).
 * options: { value, label, icon? }
 */
export function FilterChips({
  value,
  options = [],
  onChange,
  label = 'Filtro',
  className = '',
  variant = 'default',
}) {
  return (
    <div
      className={`filter-chips filter-chips--${variant} ${className}`.trim()}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value === '' ? '__all__' : opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            data-value={opt.value === '' ? 'all' : opt.value}
            className={`filter-chips__item ${active ? 'is-active' : ''}`.trim()}
            onClick={() => onChange?.(opt.value)}
          >
            {Icon ? (
              <span className="filter-chips__icon" aria-hidden="true">
                <Icon size={15} stroke={1.6} />
              </span>
            ) : null}
            <span className="filter-chips__label">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
