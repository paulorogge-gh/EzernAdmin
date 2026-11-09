import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconMapPin } from '@tabler/icons-react';
import { api } from '../../lib/api';
import { API } from '../../lib/httpSurface';
import { addressSearchLabel, emptyAddress, normalizeAddress } from '../../lib/address';
import { Processing } from './Processing';
import { TextField } from './Field';

/**
 * Endereço global do projeto.
 * Busca em um único campo (Google Places). Número e complemento
 * só aparecem após selecionar uma sugestão obrigatória.
 */
export function AddressField({
  label = 'Endereço',
  value,
  onChange,
  required = false,
  error,
  hint = 'Digite e selecione uma sugestão do Google',
  disabled = false,
}) {
  const inputId = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const skipSearch = useRef(false);
  const searchSeq = useRef(0);

  const address = normalizeAddress(value);
  // Selecionado via Places ou preenchido (ex.: consulta CNPJ).
  const selected = Boolean(address.street && (address.placeId || address.city || address.zip));
  const [query, setQuery] = useState(addressSearchLabel(address));
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [panelBox, setPanelBox] = useState(null);

  useEffect(() => {
    const next = addressSearchLabel(address);
    setQuery((current) => {
      if (current === next) return current;
      skipSearch.current = true;
      return next;
    });
  }, [address.placeId, address.formatted, address.street, address.number]);

  useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false;
      setOpen(false);
      setItems([]);
      return undefined;
    }
    const q = query.trim();
    if (q.length < 3 || selected) {
      setItems([]);
      setOpen(false);
      return undefined;
    }

    const requestId = ++searchSeq.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const next = await api(API.addressLookup(q));
        if (requestId !== searchSeq.current) return;
        const list = Array.isArray(next) ? next : [];
        setItems(list);
        setSearchError('');
        setOpen(list.length > 0);
      } catch (err) {
        if (requestId !== searchSeq.current) return;
        setItems([]);
        setOpen(false);
        setSearchError(err.message || 'Não foi possível buscar o endereço');
      } finally {
        if (requestId === searchSeq.current) setLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query, selected]);

  useEffect(() => {
    if (!open) return undefined;

    function place() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const maxHeight = 260;
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
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('mousedown', onDoc);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [open]);

  function emit(next) {
    onChange?.(normalizeAddress(next));
  }

  function clearSelectionKeepQuery(nextQuery) {
    emit({
      ...emptyAddress(),
      formatted: nextQuery,
    });
  }

  async function pick(item) {
    skipSearch.current = true;
    searchSeq.current += 1;
    setOpen(false);
    setItems([]);
    setLoading(false);
    setSearchError('');
    setQuery(item.label);

    try {
      setLoading(true);
      const place = await api(API.placeDetails(item.placeId));
      const next = {
        street: place.street || '',
        number: place.number || '',
        complement: place.complement || '',
        neighborhood: place.neighborhood || '',
        district: place.district || '',
        city: place.city || '',
        state: place.state || '',
        country: place.country || 'Brasil',
        zip: place.zip || '',
        placeId: place.placeId || item.placeId,
        formatted: place.formatted || item.label,
      };
      skipSearch.current = true;
      setQuery(next.formatted);
      emit(next);
    } catch (err) {
      setSearchError(err.message || 'Não foi possível obter o endereço');
      clearSelectionKeepQuery(item.label);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="address-field">
      <div className={`field ${error ? 'has-error' : ''}`.trim()}>
        {label ? (
          <label className="field__label" htmlFor={inputId}>
            {label}
            {required ? ' *' : ''}
          </label>
        ) : null}

        <div ref={rootRef} className={`field__control-wrap ${loading ? 'has-action' : ''}`.trim()}>
          <input
            ref={triggerRef}
            id={inputId}
            type="text"
            className={`field__control ${loading ? 'field__control--with-action' : ''} ${error ? 'is-invalid' : ''}`.trim()}
            autoComplete="off"
            disabled={disabled}
            required={required && !selected}
            placeholder="Digite o endereço e selecione uma sugestão"
            value={query}
            onChange={(event) => {
              skipSearch.current = false;
              const next = event.target.value;
              setQuery(next);
              clearSelectionKeepQuery(next);
            }}
            onFocus={() => {
              if (items.length && !selected) setOpen(true);
            }}
          />
          {loading ? (
            <span className="field__busy" aria-hidden="true">
              <Processing active />
            </span>
          ) : null}
        </div>

        {open && panelBox
          ? createPortal(
              <div
                ref={panelRef}
                role="listbox"
                className="address-suggest"
                style={{
                  top: panelBox.top,
                  bottom: panelBox.bottom,
                  left: panelBox.left,
                  width: Math.max(panelBox.width, 280),
                  maxHeight: panelBox.maxHeight,
                }}
              >
                <div className="address-suggest__head">Sugestões de endereço</div>
                <ul className="address-suggest__list">
                  {items.map((item) => {
                    const [title, ...rest] = String(item.label || '')
                      .split(',')
                      .map((part) => part.trim())
                      .filter(Boolean);
                    const meta = rest.join(', ');
                    return (
                      <li key={item.placeId}>
                        <button
                          type="button"
                          className="address-suggest__item"
                          onClick={() => void pick(item)}
                        >
                          <span className="address-suggest__icon" aria-hidden="true">
                            <IconMapPin size={16} stroke={1.75} />
                          </span>
                          <span className="address-suggest__copy">
                            <span className="address-suggest__title">{title || item.label}</span>
                            {meta ? <span className="address-suggest__meta">{meta}</span> : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>,
              document.body,
            )
          : null}

        <div className="address-field__status">
          {searchError && !loading ? <p className="field__error">{searchError}</p> : null}
          {error && !searchError ? <p className="field__error">{error}</p> : null}
          {!error && !searchError && !loading && hint && !selected ? (
            <p className="field__hint">{hint}</p>
          ) : null}
        </div>
      </div>

      {selected ? (
        <div className="address-field__details anim-fade-up">
          <TextField
            label="Número"
            value={address.number}
            required
            disabled={disabled}
            onChange={(event) => emit({ ...address, number: event.target.value })}
          />
          <TextField
            label="Complemento"
            value={address.complement}
            disabled={disabled}
            placeholder="Apto, bloco, sala..."
            onChange={(event) => emit({ ...address, complement: event.target.value })}
          />
        </div>
      ) : null}
    </div>
  );
}
