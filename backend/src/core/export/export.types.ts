export type ColumnFormat = 'text' | 'number' | 'currency' | 'date' | 'qty';

export interface ExportColumn {
  key: string;
  label: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
  format?: ColumnFormat;
}

export type ExportRow = Record<string, unknown>;

export interface ExportMeta {
  title: string;
  subtitle?: string;
  printedBy: string;
  printedAt: Date;
  filters?: Record<string, string | number | boolean | null | undefined>;
}

/**
 * Kontrak yang wajib dikembalikan handler controller laporan supaya
 * ExportInterceptor bisa mengubahnya jadi xlsx/pdf lewat ?format=.
 * `meta` di sini sengaja tanpa printedBy/printedAt — dua field itu diisi
 * interceptor dari request (user login + waktu saat itu), bukan dari handler.
 */
export interface ExportableResponse<T extends ExportRow = ExportRow> {
  rows: T[];
  columns: ExportColumn[];
  meta?: {
    title?: string;
    subtitle?: string;
    filters?: ExportMeta['filters'];
  };
}
