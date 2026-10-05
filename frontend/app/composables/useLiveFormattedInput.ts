function countDigitsBefore(text: string, pos: number): number {
  let count = 0
  for (let i = 0; i < pos && i < text.length; i++) {
    if (/[0-9]/.test(text[i]!)) count++
  }
  return count
}

function caretPosForDigitCount(text: string, digitCount: number): number {
  if (digitCount <= 0) return 0
  let count = 0
  for (let i = 0; i < text.length; i++) {
    if (/[0-9]/.test(text[i]!)) {
      count++
      if (count === digitCount) return i + 1
    }
  }
  return text.length
}

/**
 * Mekanika caret bersama <MoneyInput>/<QtyInput> — BUKAN formatter. Format
 * angkanya sendiri wajib datang dari useRupiah()/useQty() (CLAUDE.md §6,
 * tidak ada formatter kedua); helper ini murni menghitung ulang posisi
 * caret dari JUMLAH DIGIT di kiri caret (bukan panjang string), supaya
 * caret tidak melompat ke ujung saat pemisah ribuan bertambah/berkurang
 * di tengah pengetikan.
 *
 * PENTING (dibuktikan lewat uji manual): pemanggil WAJIB menerapkan
 * `newCaret` lewat `nextTick()` yang dijadwalkan SETELAH menulis
 * `display.value` (bukan di sini) — Vue mem-patch ulang DOM `<input>`
 * setiap `display` berubah, dan menulis `el.value` secara native SELALU
 * memindahkan caret ke ujung. Kalau `setSelectionRange` dijadwalkan DI SINI
 * (sebelum `display.value` ditulis oleh pemanggil), nextTick ini resolve
 * LEBIH DULU daripada patch Vue yang menyusul, dan hasilnya caret
 * terdorong balik ke ujung — persis bug yang ditemukan.
 */
export function useLiveFormattedInput(opts: {
  toDisplay: (raw: string) => string
  toValue: (raw: string) => number | undefined
}) {
  function handleRawInput(
    raw: string,
    inputEl: HTMLInputElement | null | undefined
  ): { display: string, value: number | undefined, newCaret: number | null } {
    const caretPos = inputEl?.selectionStart ?? raw.length
    const digitsBeforeCaret = countDigitsBefore(raw, caretPos)
    const display = opts.toDisplay(raw)
    const value = opts.toValue(raw)
    const newCaret = inputEl ? caretPosForDigitCount(display, digitsBeforeCaret) : null

    return { display, value, newCaret }
  }

  return { handleRawInput }
}
