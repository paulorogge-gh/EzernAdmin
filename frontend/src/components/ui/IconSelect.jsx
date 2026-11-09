import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import { CATALOG_ICON_OPTIONS, resolveCatalogIcon } from './icons';

/** Seletor visual de ícone (grade no dropdown, sem descrição). */
export function IconSelect({
  label = 'Ícone',
  value,
  onChange,
  options = CATALOG_ICON_OPTIONS,
  error,
  hint,
  name = 'iconKey',
  disabled = false,
}) {
  const autoId = useId();
  const triggerId = `${autoId}-trigger`;
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [panelBox, setPanelBox] = useState(null);

  const current = String(value || options[0]?.value || 'tag');
  const Preview = resolveCatalogIcon(current);

  useEffect(() => {
    if (!open) return undefined;

    function place() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(rect.width, 16.5 * 16);
      const maxHeight = 240;
      const spaceBelow = window.innerHeight - rect.bottom - 12;
      const openUp = spaceBelow < 160 && rect.top > spaceBelow;
      const left = Math.min(rect.left, window.innerWidth - width - 12);
      setPanelBox({
        top: openUp ? undefined : rect.bottom + 6,
        bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
        left: Math.max(12, left),
        width,
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
  }, [open]);

  function pick(next) {
    onChange?.(next);
    setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className={`field icon-select ${disabled ? 'is-disabled' : ''}`.trim()}
    >
      {label ? (
        <label className="field__label" htmlFor={triggerId}>
          {label}
        </label>
      ) : null}

      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        name={name}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`field__control field__control--select icon-select__trigger ${error ? 'is-invalid' : ''} ${open ? 'is-open' : ''}`.trim()}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
      >
        <span className="icon-select__trigger-icon" aria-hidden>
          <Preview size={18} stroke={1.75} />
        </span>
        <IconChevronDown size={16} stroke={1.75} className="field__select-chevron" />
      </button>

      {error ? <p className="field__error">{error}</p> : null}
      {!error && hint ? <p className="field__hint">{hint}</p> : null}

      {open && panelBox
        ? createPortal(
            <div
              ref={panelRef}
              role="listbox"
              aria-label={label || 'Ícones'}
              className="icon-select__menu"
              style={{
                top: panelBox.top,
                bottom: panelBox.bottom,
                left: panelBox.left,
                width: panelBox.width,
                maxHeight: panelBox.maxHeight,
              }}
            >
              <div className="icon-select__grid">
                {options.map((opt) => {
                  const key = opt.value;
                  const Icon = resolveCatalogIcon(key);
                  const active = key === current;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="option"
                      aria-selected={active}
                      title={opt.label || key}
                      className={`icon-select__option ${active ? 'is-active' : ''}`.trim()}
                      onClick={() => pick(key)}
                    >
                      <Icon size={18} stroke={1.75} />
                      {active ? (
                        <span className="icon-select__check" aria-hidden>
                          <IconCheck size={12} stroke={2.25} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
