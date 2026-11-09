import { Skeleton } from './Skeleton';

function cellClass(col) {
  const parts = ['data-table__td'];
  if (col.align === 'right') parts.push('data-table__td--right');
  if (col.align === 'center') parts.push('data-table__td--center');
  if (col.actions) parts.push('data-table__td--actions');
  if (col.narrow) parts.push('data-table__td--narrow');
  if (col.className) parts.push(col.className);
  return parts.join(' ');
}

function headClass(col) {
  const parts = ['data-table__th'];
  if (col.align === 'right') parts.push('data-table__th--right');
  if (col.align === 'center') parts.push('data-table__th--center');
  if (col.actions) parts.push('data-table__th--actions');
  if (col.narrow) parts.push('data-table__th--narrow');
  if (col.headClassName) parts.push(col.headClassName);
  return parts.join(' ');
}

function renderCell(col, row) {
  if (typeof col.render === 'function') return col.render(row);
  const value = row?.[col.key];
  if (col.primary) {
    const secondary =
      typeof col.secondary === 'function'
        ? col.secondary(row)
        : col.secondary
          ? row?.[col.secondary]
          : null;
    return (
      <>
        <span className="data-table__primary">{value}</span>
        {secondary ? <span className="data-table__secondary">{secondary}</span> : null}
      </>
    );
  }
  if (col.muted) return <span className="data-table__muted">{value}</span>;
  return value ?? null;
}

function skeletonWidth(col, colIndex, colCount) {
  if (col.actions) return '2.15rem';
  if (col.primary) return '70%';
  if (col.narrow) return '4.75rem';
  if (colIndex === colCount - 1) return '42%';
  return `${56 + ((colIndex * 7) % 20)}%`;
}

function TableSkeletonRows({ columns, rows = 6 }) {
  return Array.from({ length: rows }, (_, rowIndex) => (
    <tr key={`skeleton-${rowIndex}`} className="data-table__tr data-table__tr--skeleton">
      {columns.map((col, colIndex) => (
        <td key={col.key} className={cellClass(col)}>
          {col.actions ? (
            <div className="data-table__actions">
              <Skeleton active width="2.15rem" height="2.15rem" />
              <Skeleton active width="2.15rem" height="2.15rem" />
            </div>
          ) : (
            <Skeleton
              active
              width={skeletonWidth(col, colIndex, columns.length)}
              height={col.primary ? '0.95rem' : '0.8rem'}
            />
          )}
        </td>
      ))}
    </tr>
  ));
}

export function DataTable({
  columns,
  rows = [],
  loading = false,
  emptyMessage = 'Nenhum registro encontrado.',
  emptyTitle,
  flush = false,
  onRowClick,
  rowKey = 'id',
  className = '',
  skeletonRows = 6,
}) {
  // Estrutura (thead) sempre monta. Placeholder só no primeiro load.
  // Em refresh, mantém as linhas atuais até os novos dados chegarem.
  const awaitingFirstData = loading && rows.length === 0;
  const refreshing = loading && rows.length > 0;
  const isEmpty = !loading && rows.length === 0;

  return (
    <div
      className={`data-table ${flush ? 'data-table--flush' : ''} ${refreshing ? 'is-refreshing' : ''} ${className}`.trim()}
    >
      <table className="data-table__table">
        <thead className="data-table__head">
          <tr className="data-table__head-row">
            {columns.map((col) => (
              <th key={col.key} scope="col" className={headClass(col)}>
                <span className="data-table__head-label">{col.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody aria-busy={loading || undefined}>
          {awaitingFirstData ? (
            <TableSkeletonRows columns={columns} rows={skeletonRows} />
          ) : isEmpty ? (
            <tr>
              <td colSpan={columns.length} className="data-table__empty">
                {emptyTitle ? <p className="data-table__empty-title">{emptyTitle}</p> : null}
                <p className={emptyTitle ? 'data-table__empty-text' : undefined}>{emptyMessage}</p>
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const key = row?.[rowKey] ?? index;
              const clickable = Boolean(onRowClick);
              return (
                <tr
                  key={key}
                  className={`data-table__tr ${clickable ? 'data-table__tr--clickable' : ''}`.trim()}
                  onClick={clickable ? () => onRowClick(row) : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onKeyDown={
                    clickable
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cellClass(col)}
                      onClick={
                        col.actions && clickable
                          ? (event) => event.stopPropagation()
                          : undefined
                      }
                    >
                      {col.actions ? (
                        <div className="data-table__actions">{renderCell(col, row)}</div>
                      ) : (
                        renderCell(col, row)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
