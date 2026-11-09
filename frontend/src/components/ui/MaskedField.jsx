import { TextField } from './Field';
import { MASKS } from '../../lib/masks';

/**
 * Campo de texto com máscara global do projeto.
 * @param {'cpf'|'cnpj'|'cpfCnpj'|'phone'|'cep'|Function} mask
 */
export function MaskedField({
  mask = 'cpfCnpj',
  value = '',
  onChange,
  busy = false,
  ...props
}) {
  const formatter = typeof mask === 'function' ? mask : MASKS[mask];

  function handleChange(event) {
    const raw = event.target.value;
    const next = formatter ? formatter(raw) : raw;
    if (typeof onChange === 'function') {
      onChange({
        ...event,
        target: {
          ...event.target,
          value: next,
          name: event.target.name,
        },
      });
    }
  }

  return (
    <TextField
      {...props}
      busy={busy}
      value={value}
      onChange={handleChange}
      inputMode={props.inputMode || 'numeric'}
      autoComplete={props.autoComplete || 'off'}
    />
  );
}
