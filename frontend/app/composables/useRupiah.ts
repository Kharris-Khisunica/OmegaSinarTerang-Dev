/**
 * Satu-satunya composable format angka mata uang (CLAUDE.md §6 — tidak ada
 * toLocaleString tersebar). Dipakai oleh field type "currency" di CrudFormPage
 * dan kolom uang di DataTable (lewat Column.format).
 */
export function useRupiah() {
  function format(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return ''
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value)
  }

  function parse(input: string | number | null | undefined): number {
    if (typeof input === 'number') return input
    if (!input) return 0
    const digits = input.replace(/[^0-9-]/g, '')
    return digits ? Number(digits) : 0
  }

  return { format, parse }
}
