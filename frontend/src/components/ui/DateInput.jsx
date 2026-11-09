import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  IconCalendarEvent,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
const MONTHS_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function isoToDisplay(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function maskDateDigits(raw) {
  const digits = String(raw || '')
    .replace(/\D/g, '')
    .slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function displayToIso(display) {
  const match = String(display || '')
    .trim()
    .match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) {
    return null;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseIso(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

function toIso(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function buildCalendarDays(view) {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i += 1) {
    cells.push({
      date: new Date(view.getFullYear(), view.getMonth(), -startWeekday + i + 1),
      inMonth: false,
    });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(view.getFullYear(), view.getMonth(), day), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({
      date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
      inMonth: false,
    });
  }
  return cells;
}

export function DateInput({
  label,
  hint,
  error,
  className = '',
  id,
  name,
  value = '',
  onChange,
  disabled = false,
  required = false,
  placeholder = 'dd/mm/aaaa',
}) {
  const autoId = useId();
  const inputId = id || name || autoId;
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [panelMode, setPanelMode] = useState('days');
  const [display, setDisplay] = useState(() => isoToDisplay(value));
  const [panelBox, setPanelBox] = useState(null);
  const selected = parseIso(value);
  const [view, setView] = useState(() => {
    const base = selected || new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    setDisplay(isoToDisplay(value));
    const d = parseIso(value);
    if (d) setView(new Date(d.getFullYear(), d.getMonth(), 1));
  }, [value]);

  useEffect(() => {
    if (!open) {
      setPanelMode('days');
      return undefined;
    }

    function place() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const maxHeight = 420;
      const spaceBelow = window.innerHeight - rect.bottom - 12;
      const openUp = spaceBelow < 220 && rect.top > spaceBelow;
      setPanelBox({
        top: openUp ? undefined : rect.bottom + 6,
        bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
        left: Math.min(rect.left, window.innerWidth - 304),
        width: Math.max(288, rect.width),
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
      if (event.key !== 'Escape') return;
      setPanelMode((mode) => {
        if (mode === 'years') return 'months';
        if (mode === 'months') return 'days';
        setOpen(false);
        return mode;
      });
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

  function emit(iso) {
    onChange?.({
      target: { value: iso, name: name || '' },
      currentTarget: { value: iso, name: name || '' },
    });
  }

  function onType(event) {
    const nextDisplay = maskDateDigits(event.target.value);
    setDisplay(nextDisplay);
    if (nextDisplay.length < 10) {
      if (value) emit('');
      return;
    }
    const iso = displayToIso(nextDisplay);
    emit(iso || '');
  }

  function pickDay(date) {
    const iso = toIso(date);
    setDisplay(isoToDisplay(iso));
    emit(iso);
    setOpen(false);
  }

  function shiftView(delta) {
    if (panelMode === 'years') {
      setView((v) => new Date(v.getFullYear() + delta * 12, v.getMonth(), 1));
      return;
    }
    if (panelMode === 'months') {
      setView((v) => new Date(v.getFullYear() + delta, v.getMonth(), 1));
      return;
    }
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  }

  const days = useMemo(() => buildCalendarDays(view), [view]);
  const todayIso = toIso(new Date());
  const decadeStart = Math.floor(view.getFullYear() / 12) * 12;
  const yearOptions = Array.from({ length: 12 }, (_, i) => decadeStart + i);

  return (
    <div className={`field ${className}`.trim()} ref={rootRef}>
      {label ? (
        <label className="field__label" htmlFor={inputId}>
          {label}
          {required ? ' *' : ''}
        </label>
      ) : null}
      <div className="field__control-wrap has-action" ref={triggerRef}>
        <input
          id={inputId}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          value={display}
          className={`field__control field__control--with-action ${error ? 'is-invalid' : ''}`.trim()}
          onChange={onType}
          onFocus={() => {
            if (!disabled) {
              setPanelMode('days');
              setOpen(true);
            }
          }}
        />
        <button
          type="button"
          className="field__action"
          disabled={disabled}
          aria-label="Abrir calendário"
          tabIndex={-1}
          onClick={() => {
            if (disabled) return;
            setOpen((v) => {
              const next = !v;
              if (next) setPanelMode('days');
              return next;
            });
          }}
        >
          <IconCalendarEvent size={18} stroke={1.75} />
        </button>
      </div>
      {error ? <p className="field__error">{error}</p> : null}
      {!error && hint ? <p className="field__hint">{hint}</p> : null}

      {open && panelBox
        ? createPortal(
            <div
              ref={panelRef}
              className="date-panel"
              role="dialog"
              aria-label="Calendário"
              style={{
                top: panelBox.top,
                bottom: panelBox.bottom,
                left: panelBox.left,
                width: panelBox.width,
                maxHeight: panelBox.maxHeight,
              }}
            >
              <div className="date-panel__header">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Anterior"
                  onClick={() => shiftView(-1)}
                >
                  <IconChevronLeft size={18} stroke={1.75} />
                </button>
                <div className="date-panel__switchers">
                  <button
                    type="button"
                    className={`date-panel__switch ${panelMode === 'months' ? 'is-active' : ''}`.trim()}
                    aria-label="Selecionar mês"
                    aria-pressed={panelMode === 'months'}
                    onClick={() =>
                      setPanelMode((mode) => (mode === 'months' ? 'days' : 'months'))
                    }
                  >
                    {MONTHS[view.getMonth()]}
                  </button>
                  <button
                    type="button"
                    className={`date-panel__switch ${panelMode === 'years' ? 'is-active' : ''}`.trim()}
                    aria-label="Selecionar ano"
                    aria-pressed={panelMode === 'years'}
                    onClick={() =>
                      setPanelMode((mode) => (mode === 'years' ? 'days' : 'years'))
                    }
                  >
                    {view.getFullYear()}
                  </button>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Próximo"
                  onClick={() => shiftView(1)}
                >
                  <IconChevronRight size={18} stroke={1.75} />
                </button>
              </div>

              {panelMode === 'years' ? (
                <div className="date-panel__picker">
                  {yearOptions.map((year) => {
                    const active = view.getFullYear() === year;
                    return (
                      <button
                        key={year}
                        type="button"
                        className={`date-panel__pick ${active ? 'is-selected' : ''}`.trim()}
                        onClick={() => {
                          setView(new Date(year, view.getMonth(), 1));
                          setPanelMode('months');
                        }}
                      >
                        {year}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {panelMode === 'months' ? (
                <div className="date-panel__picker">
                  {MONTHS_SHORT.map((monthLabel, monthIndex) => {
                    const active = view.getMonth() === monthIndex;
                    return (
                      <button
                        key={monthLabel}
                        type="button"
                        className={`date-panel__pick ${active ? 'is-selected' : ''}`.trim()}
                        onClick={() => {
                          setView(new Date(view.getFullYear(), monthIndex, 1));
                          setPanelMode('days');
                        }}
                      >
                        {monthLabel}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {panelMode === 'days' ? (
                <>
                  <div className="date-panel__weekdays">
                    {WEEKDAYS.map((day, index) => (
                      <span key={`${day}-${index}`}>{day}</span>
                    ))}
                  </div>
                  <div className="date-panel__grid">
                    {days.map((cell) => {
                      const iso = toIso(cell.date);
                      const isSelected = value === iso;
                      const isToday = todayIso === iso;
                      return (
                        <button
                          key={iso + String(cell.inMonth)}
                          type="button"
                          className={`date-panel__day ${cell.inMonth ? '' : 'is-outside'} ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`.trim()}
                          onClick={() => pickDay(cell.date)}
                        >
                          {cell.date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
