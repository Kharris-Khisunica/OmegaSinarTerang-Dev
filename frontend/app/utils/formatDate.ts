/**
 * Format tanggal 'YYYY-MM-DD' (kontrak kolom DATE backend, lihat catatan di
 * JournalEntry entity) jadi 'DD/MM/YYYY' lewat pemotongan string murni —
 * SENGAJA tidak lewat `new Date(value)` supaya tidak ada pergeseran tanggal
 * akibat konversi timezone lokal browser.
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const [year, month, day] = value.slice(0, 10).split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}
