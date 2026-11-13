import Link from 'next/link';
export function Pagination({
  path,
  params,
  parameter,
  page,
  count,
  size = 10,
  anchor = '',
}: {
  path: string;
  params: Record<string, string | undefined>;
  parameter: string;
  page: number;
  count: number;
  size?: number;
  anchor?: string;
}) {
  const url = (n: number) => {
    const query = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
      ) as Record<string, string>,
    );
    query.set(parameter, String(n));
    return `${path}?${query}${anchor ? `#${anchor}` : ''}`;
  };
  return (
    <nav className="pagination" aria-label={`Paginación ${anchor || path}`}>
      {page > 1 && <Link href={url(page - 1)}>← Anterior</Link>}
      <span>
        Página {page} de {Math.max(1, Math.ceil(count / size))} · {count} registros
      </span>
      {page * size < count && <Link href={url(page + 1)}>Siguiente →</Link>}
    </nav>
  );
}
