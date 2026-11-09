/**
 * Lê token sensível do fragment (#token=) e remove da URL imediatamente.
 * Aceita query legado (?token=) uma vez e também limpa.
 */
export function takeUrlToken() {
  if (typeof window === 'undefined') return '';

  let token = '';

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    token = hashParams.get('token') || '';
  }

  if (!token) {
    const query = new URLSearchParams(window.location.search);
    token = query.get('token') || '';
  }

  if (token || window.location.hash || window.location.search.includes('token=')) {
    const clean = `${window.location.pathname}`;
    window.history.replaceState(null, '', clean);
  }

  return token;
}
