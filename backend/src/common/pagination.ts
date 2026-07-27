export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

/** Jaga sortBy dari query string tidak dipakai mentah di ORDER BY (whitelist kolom). */
export function resolveSortColumn(
  sortBy: string | undefined,
  allowedColumns: readonly string[],
  fallback: string,
): string {
  if (sortBy && allowedColumns.includes(sortBy)) {
    return sortBy;
  }
  return fallback;
}

export function resolveSortDir(sortDir: string | undefined): 'ASC' | 'DESC' {
  return sortDir?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
}
