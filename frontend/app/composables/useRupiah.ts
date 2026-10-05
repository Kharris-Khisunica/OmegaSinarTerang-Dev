/**
 * Satu-satunya composable format angka mata uang (CLAUDE.md §6 — tidak ada
 * toLocaleString tersebar). Dipakai oleh field type "currency" di CrudFormPage
 * dan kolom uang di DataTable (lewat Column.format).
 */
export function useRupiah() {
  /**
   * `bare: true` = tanpa "Rp", untuk sel grid (PANDUAN_UI.md §10) — nol/kosong
   * tampil "-". Tanpa opsi, perilaku identik seperti sebelumnya (dengan "Rp").
   */
  function format(value: number | null | undefined, opts?: { bare?: boolean }): string {
    if (value === null || value === undefined || Number.isNaN(value)) return opts?.bare ? '-' : ''
    if (opts?.bare && value === 0) return '-'
    return new Intl.NumberFormat('id-ID', {
      style: opts?.bare ? 'decimal' : 'currency',
      currency: opts?.bare ? undefined : 'IDR',
      maximumFractionDigits: 0
    }).format(value)
  }

  function parse(input: string | number | null | undefined): number {
    if (typeof input === 'number') return input
    if (!input) return 0
    const digits = input.replace(/[^0-9-]/g, '')
    return digits ? Number(digits) : 0
  }

  /**
   * Uang SAAT MENGETIK (dipakai <MoneyInput>) — tanpa "Rp" (supaya perhitungan
   * caret sederhana) dan tanpa kasus khusus 0 -> "-" milik format() di atas
   * (itu untuk sel grid, bukan field yang sedang aktif diketik).
   */
  function formatTyping(value: number | undefined): string {
    if (value === undefined || Number.isNaN(value)) return ''
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value)
  }

  /** Pasangan formatTyping() — kosong/tanpa digit -> undefined, BUKAN 0, supaya field wajib tetap terdeteksi kosong. */
  function parseTyping(raw: string): number | undefined {
    const digits = raw.replace(/[^0-9]/g, '')
    return digits ? Number(digits) : undefined
  }

  return { format, parse, formatTyping, parseTyping }
}
