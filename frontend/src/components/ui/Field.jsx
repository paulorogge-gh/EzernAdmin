import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { IconCheck, IconChevronDown, IconEye, IconEyeOff } from '@tabler/icons-react';
import { Processing } from './Processing';

function FieldShell({ label, hint, error, htmlFor, children, className = '' }) {
  return (
    <div className={`field ${className}`.trim()}>
      {label ? (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {children}
      {error ? <p className="field__error">{error}</p> : null}
      {!error && hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

function childrenToText(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(childrenToText).join('');
  if (isValidElement(node)) return childrenToText(node.props.children);
  return '';
}

function parseOptionsFromChildren(children) {
  const options = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || child.type !== 'option') return;
    const value = child.props.value == null ? '' : String(child.props.value);
    const label = childrenToText(child.props.children).trim() || value;
    options.push({ value, label, disabled: Boolean(child.props.disabled) });
  });
  return options;
}

export function TextField({
  label,
  hint,
  error,
  className = '',
  id,
  type = 'text',
  prefix,
  busy = false,
  ...props
}) {
  const autoId = useId();
  const inputId = id || props.name || autoId;
  const isPassword = type === 'password';
  const [visible, setVisible] = useState(false);
  const inputType = isPassword ? (visible ? 'text' : 'password') : type;
  const hasPrefix = Boolean(prefix);
  const hasTrailing = isPassword || busy;

  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={inputId}>
      <div
        className={`field__control-wrap ${hasTrailing ? 'has-action' : ''} ${hasPrefix ? 'has-prefix' : ''}`.trim()}
      >
        {hasPrefix ? <span className="field__prefix">{prefix}</span> : null}
        <input
          id={inputId}
          type={inputType}
          className={`field__control ${hasTrailing ? 'field__control--with-action' : ''} ${hasPrefix ? 'field__control--with-prefix' : ''} ${error ? 'is-invalid' : ''} ${className}`.trim()}
          {...props}
        />
        {busy ? (
          <span className="field__busy">
            <Processing active />
          </span>
        ) : null}
        {isPassword && !busy ? (
          <button
            type="button"
            className="field__action"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            title={visible ? 'Ocultar senha' : 'Mostrar senha'}
            tabIndex={-1}
          >
            {visible ? (
              <IconEyeOff size={18} stroke={1.75} />
            ) : (
              <IconEye size={18} stroke={1.75} />
            )}
          </button>
        ) : null}
      </div>
    </FieldShell>
  );
}

export function TextareaField({ label, hint, error, className = '', id, rows = 4, ...props }) {
  const autoId = useId();
  const inputId = id || props.name || autoId;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={inputId}>
      <textarea
        id={inputId}
        rows={rows}
        className={`field__control field__control--area ${error ? 'is-invalid' : ''} ${className}`.trim()}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className = '',
  id,
  children,
  options: optionsProp,
  onChange,
  placeholder = 'Selecione',
  value,
  defaultValue,
  disabled,
  required,
  name,
  searchable,
}) {
  const autoId = useId();
  const inputId = id || name || autoId;
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [panelBox, setPanelBox] = useState(null);
  const [query, setQuery] = useState('');

  const options = useMemo(
    () => optionsProp || parseOptionsFromChildren(children),
    [optionsProp, children]
  );
  const canSearch = searchable ?? options.length >= 8;

  const currentValue = value !== undefined ? String(value) : String(defaultValue ?? '');
  const selected = options.find((opt) => opt.value === currentValue);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const label = String(opt.label || '').toLowerCase();
      const val = String(opt.value || '').toLowerCase();
      return label.includes(q) || val.includes(q);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;

    function place() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const maxHeight = canSearch ? 300 : 240;
      const spaceBelow = window.innerHeight - rect.bottom - 12;
      const openUp = spaceBelow < 160 && rect.top > spaceBelow;
      setPanelBox({
        top: openUp ? undefined : rect.bottom + 6,
        bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(maxHeight, openUp ? rect.top - 12 : spaceBelow),
      });
    }

    place();
    const onDoc = (event) => {
      const target = event.target;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, canSearch]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return undefined;
    }
    if (!canSearch) return undefined;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [open, canSearch]);

  function emit(next) {
    onChange?.({
      target: { value: next, name: name || '' },
      currentTarget: { value: next, name: name || '' },
    });
  }

  function pick(opt) {
    if (opt.disabled) return;
    emit(opt.value);
    setOpen(false);
  }

  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={inputId} className={className}>
      <div ref={rootRef} className={`field__select ${disabled ? 'is-disabled' : ''}`.trim()}>
        <button
          ref={triggerRef}
          id={inputId}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-required={required || undefined}
          className={`field__control field__control--select ${error ? 'is-invalid' : ''} ${open ? 'is-open' : ''}`.trim()}
          onClick={() => {
            if (!disabled) setOpen((v) => !v);
          }}
        >
          <span className={`field__select-value ${selected ? '' : 'is-placeholder'}`.trim()}>
            {selected ? selected.label : placeholder}
          </span>
          <IconChevronDown size={16} stroke={1.75} className="field__select-chevron" />
        </button>

        {open && panelBox
          ? createPortal(
              <div
                ref={panelRef}
                role="listbox"
                className="field__menu"
                style={{
                  top: panelBox.top,
                  bottom: panelBox.bottom,
                  left: panelBox.left,
                  width: panelBox.width,
                  maxHeight: panelBox.maxHeight,
                }}
              >
                {canSearch ? (
                  <div className="field__menu-search">
                    <input
                      ref={searchRef}
                      type="search"
                      className="field__menu-search-input"
                      placeholder="Buscar..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                ) : null}
                <ul className="field__menu-list">
                  {filtered.length === 0 ? (
                    <li className="field__menu-empty">Nenhuma opção</li>
                  ) : (
                    filtered.map((opt) => {
                      const active = opt.value === currentValue;
                      return (
                        <li key={`${opt.value}::${opt.label}`}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            disabled={opt.disabled}
                            className={`field__menu-item ${active ? 'is-active' : ''}`.trim()}
                            onClick={() => pick(opt)}
                          >
                            <span>{opt.label}</span>
                            {active ? <IconCheck size={15} stroke={1.85} /> : null}
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>,
              document.body
            )
          : null}

        <input type="hidden" name={name} value={currentValue} required={required} />
      </div>
    </FieldShell>
  );
}

export function CheckboxField({ label, className = '', id, ...props }) {
  const autoId = useId();
  const inputId = id || props.name || autoId;
  return (
    <label className={`field field--check ${className}`.trim()} htmlFor={inputId}>
      <span className="field__check">
        <input id={inputId} type="checkbox" className="field__check-input" {...props} />
        <span className="field__check-box" aria-hidden="true">
          <IconCheck size={14} stroke={2.25} />
        </span>
      </span>
      {label ? <span className="field__check-label">{label}</span> : null}
    </label>
  );
}
