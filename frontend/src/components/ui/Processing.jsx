/**
 * Indicador global de processamento: reticências piscando (só visual).
 * Nunca renderiza quando active=false.
 */
export function Processing({ active = false, className = '' }) {
  if (!active) return null;

  return (
    <span
      className={`processing ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label="Processando"
    >
      <span className="processing__dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </span>
  );
}

export function PageLoader({ active = false }) {
  if (!active) return null;
  return (
    <div className="loading-screen">
      <Processing active />
    </div>
  );
}

/**
 * No idle mostra o rótulo; no busy mantém o mesmo espaço e só troca
 * o texto pelo indicador (sem encolher o botão).
 */
export function BusyLabel({ active = false, idle }) {
  return (
    <span className={`busy-label ${active ? 'is-busy' : ''}`.trim()}>
      <span className="busy-label__idle" aria-hidden={active || undefined}>
        {idle}
      </span>
      {active ? <Processing active className="busy-label__processing" /> : null}
    </span>
  );
}
