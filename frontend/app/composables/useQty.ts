/**
 * Satu-satunya composable format angka qty (CLAUDE.md §6, bersama useRupiah()
 * untuk uang — tidak ada toLocaleString tersebar). Qty disimpan NUMERIC(16,4)
 * (CLAUDE.md §14): format() menampilkan APA ADANYA sampai 4 desimal tanpa
 * membulatkan, trailing zero dibuang supaya "12" tidak tampil "12.0000".
 */
export function useQty() {
  function format(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return ''
    const rounded = Math.round(value * 10000) / 10000
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(rounded)
  }

  function parse(input: string | number | null | undefined): number {
    if (typeof input === 'number') return input
    if (!input) return 0
    const normalized = input.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
    return normalized ? Number(normalized) : 0
  }

  /**
   * Qty SAAT MENGETIK (dipakai <QtyInput>) — beda dari format() (menerima
   * number final): ini menerima STRING MENTAH yang sedang diketik, supaya
   * desimal yang belum selesai (mis. "12," sebelum digit desimalnya diketik)
   * tidak hilang gara-gara dibulatkan lewat number secara prematur. Pemisah
   * ribuan tetap dipasang di bagian bulat; bagian desimal dibiarkan apa
   * adanya, dipotong maksimal 4 digit (NUMERIC(16,4), CLAUDE.md §2.14).
   */
  function formatTyping(raw: string): string {
    if (!raw) return ''
    const commaIndex = raw.indexOf(',')
    const integerRaw = (commaIndex === -1 ? raw : raw.slice(0, commaIndex)).replace(/[^0-9]/g, '')
    const integerFormatted = integerRaw
      ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(integerRaw))
      : ''
    if (commaIndex === -1) return integerFormatted
    const fractionRaw = raw.slice(commaIndex + 1).replace(/[^0-9]/g, '').slice(0, 4)
    return `${integerFormatted || '0'},${fractionRaw}`
  }

  /** Pasangan formatTyping() — string mentah -> number, kosong/tanpa digit -> undefined (bukan 0). */
  function parseTyping(raw: string): number | undefined {
    const commaIndex = raw.indexOf(',')
    const integerRaw = (commaIndex === -1 ? raw : raw.slice(0, commaIndex)).replace(/[^0-9]/g, '')
    const fractionRaw = commaIndex === -1 ? '' : raw.slice(commaIndex + 1).replace(/[^0-9]/g, '').slice(0, 4)
    if (!integerRaw && !fractionRaw) return undefined
    const numeric = Number(`${integerRaw || '0'}.${fractionRaw || '0'}`)
    return Number.isNaN(numeric) ? undefined : numeric
  }

  return { format, parse, formatTyping, parseTyping }
}
