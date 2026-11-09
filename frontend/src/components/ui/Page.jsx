import { BlockSkeleton } from './Skeleton';

export function PageHeader({ title, description, actions }) {
  return (
    <header className="page-header anim-fade-up">
      <div className="page-header__row">
        <div>
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="page-header__actions">{actions}</div> : null}
      </div>
    </header>
  );
}

/** Estrutura do bloco sempre montada; o conteúdo interno cuida do loading. */
export function PageSection({ title, children, className = '', delay = 0, flush = false }) {
  const delayClass =
    delay === 1 ? 'anim-delay-1' : delay === 2 ? 'anim-delay-2' : delay === 3 ? 'anim-delay-3' : '';
  const flushClass = flush ? 'page-section--flush' : '';
  return (
    <section className={`page-section anim-fade-up ${delayClass} ${flushClass} ${className}`.trim()}>
      {title ? (
        <header className="block-header">
          <h2 className="block-header__title">{title}</h2>
        </header>
      ) : null}
      <div className={`page-section__body ${flush ? 'page-section__body--flush' : ''}`.trim()}>
        {children}
      </div>
    </section>
  );
}

/**
 * Corpo adiado: monta o placeholder só no primeiro carregamento.
 * Se já houver conteúdo, mantém na tela durante refresh.
 */
export function DeferredBody({
  loading = false,
  hasContent = false,
  skeletonLines = 4,
  children,
  className = '',
}) {
  if (loading && !hasContent) {
    return <BlockSkeleton active lines={skeletonLines} className={className} />;
  }
  return (
    <div className={`deferred-body ${loading ? 'is-refreshing' : ''} ${className}`.trim()}>
      {children}
    </div>
  );
}

export function PageGrid({ cols = 2, children, className = '' }) {
  return (
    <div className={`page-grid ${cols === 2 ? 'page-grid-2' : ''} ${className}`.trim()}>
      {children}
    </div>
  );
}
