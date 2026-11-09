/**
 * Retângulos piscantes para reservar espaço enquanto os dados carregam.
 * Só renderiza com active=true.
 */
export function Skeleton({
  active = true,
  width = '100%',
  height = '0.85rem',
  className = '',
  rounded = 'md',
}) {
  if (!active) return null;
  const roundClass =
    rounded === 'full' ? 'skeleton--full' : rounded === 'sm' ? 'skeleton--sm' : 'skeleton--md';
  return (
    <span
      className={`skeleton ${roundClass} ${className}`.trim()}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function BlockSkeleton({ active = false, lines = 4, className = '' }) {
  if (!active) return null;
  return (
    <div className={`skeleton-stack ${className}`.trim()} role="status" aria-label="Carregando">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          active
          width={index === lines - 1 && lines > 1 ? '64%' : '100%'}
          height="0.85rem"
        />
      ))}
    </div>
  );
}
