import { ColumnFormat } from './export.types';

export const COMPANY_NAME = process.env.COMPANY_NAME ?? 'Omega Sinar Terang';

export function formatDateId(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatDateTimeId(value: Date): string {
  const hh = String(value.getHours()).padStart(2, '0');
  const mi = String(value.getMinutes()).padStart(2, '0');
  return `${formatDateId(value)} ${hh}:${mi}`;
}

function formatNumberId(value: number, maxFractionDigits: number): string {
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

/** String() yang aman untuk `unknown` — hindari '[object Object]' kalau nilainya bukan primitif/Date. */
function toSafeString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return JSON.stringify(value);
}

/** Nilai tampilan string — dipakai PDF (selalu teks) dan sel teks Excel. */
export function formatDisplayValue(
  value: unknown,
  format: ColumnFormat = 'text',
): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  switch (format) {
    case 'currency':
      return `Rp ${formatNumberId(Number(value), 0)}`;
    case 'number':
      return formatNumberId(Number(value), 0);
    case 'qty':
      return formatNumberId(Number(value), 4);
    case 'date':
      return formatDateId(value as string | Date);
    case 'text':
    default:
      return toSafeString(value);
  }
}

/** Nilai bertipe untuk sel Excel — tetap numerik/Date supaya bisa dihitung ulang di Excel. */
export function toExcelCellValue(
  value: unknown,
  format: ColumnFormat = 'text',
): string | number | Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  switch (format) {
    case 'number':
    case 'currency':
    case 'qty':
      return Number(value);
    case 'date':
      return value instanceof Date ? value : new Date(toSafeString(value));
    case 'text':
    default:
      return toSafeString(value);
  }
}

export function excelNumFmt(format: ColumnFormat = 'text'): string | undefined {
  switch (format) {
    case 'currency':
      return '"Rp" #,##0';
    case 'number':
      return '#,##0';
    case 'qty':
      return '#,##0.####';
    case 'date':
      return 'dd/mm/yyyy';
    case 'text':
    default:
      return undefined;
  }
}

export function defaultAlign(
  format?: ColumnFormat,
): 'left' | 'right' | 'center' {
  if (format === 'number' || format === 'currency' || format === 'qty') {
    return 'right';
  }
  if (format === 'date') {
    return 'center';
  }
  return 'left';
}

export function formatFilters(
  filters: Record<string, string | number | boolean | null | undefined>,
): string {
  return Object.entries(filters)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(', ');
}
