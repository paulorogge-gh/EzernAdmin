/**
 * Padrão global de visualização de cadastro em páginas de gerenciamento.
 * Use em modal ao clicar na linha da DataTable.
 *
 * <DetailView>
 *   <DetailSection title="Identificação">
 *     <DetailGrid>
 *       <DetailItem label="Nome" value={row.name} />
 *     </DetailGrid>
 *   </DetailSection>
 * </DetailView>
 */

import { Skeleton } from './Skeleton';

function hasValue(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export function DetailView({ children, className = '' }) {
  return <div className={`detail-view ${className}`.trim()}>{children}</div>;
}

export function DetailSection({ title, description, children, className = '' }) {
  return (
    <section className={`detail-section ${className}`.trim()}>
      {title || description ? (
        <header className="detail-section__header">
          {title ? <h3 className="detail-section__title">{title}</h3> : null}
          {description ? <p className="detail-section__desc">{description}</p> : null}
        </header>
      ) : null}
      <div className="detail-section__body">{children}</div>
    </section>
  );
}

export function DetailGrid({ columns = 2, children, className = '' }) {
  const cols = columns === 3 ? 'detail-grid--3' : columns === 1 ? 'detail-grid--1' : 'detail-grid--2';
  return <div className={`detail-grid ${cols} ${className}`.trim()}>{children}</div>;
}

export function DetailItem({ label, value, children, empty = 'Não informado', full = false }) {
  const content = children ?? value;
  const filled = children != null || hasValue(value);

  return (
    <div className={`detail-item ${full ? 'detail-item--full' : ''}`.trim()}>
      {label ? <dt className="detail-item__label">{label}</dt> : null}
      <dd className={`detail-item__value ${filled ? '' : 'is-empty'}`.trim()}>
        {filled ? content : empty}
      </dd>
    </div>
  );
}

export function DetailList({ children, className = '' }) {
  return <div className={`detail-list ${className}`.trim()}>{children}</div>;
}

export function DetailListItem({ title, meta, badge, children }) {
  return (
    <div className="detail-list__item">
      <div className="detail-list__main">
        {title ? <p className="detail-list__title">{title}</p> : null}
        {meta ? <p className="detail-list__meta">{meta}</p> : null}
        {children}
      </div>
      {badge ? <div className="detail-list__badge">{badge}</div> : null}
    </div>
  );
}

/** Placeholder alinhado às linhas de DetailList (anexos, contatos, etc.). */
export function DetailListSkeleton({ active = false, rows = 2 }) {
  if (!active) return null;
  return (
    <div className="detail-list" role="status" aria-label="Carregando">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="detail-list__item detail-list__item--skeleton">
          <div className="detail-list__main">
            <Skeleton active width="58%" height="0.9rem" />
            <Skeleton active width="42%" height="0.72rem" />
          </div>
          <Skeleton active width="2.15rem" height="2.15rem" rounded="md" />
        </div>
      ))}
    </div>
  );
}
