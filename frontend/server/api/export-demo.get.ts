/**
 * Endpoint DUMMY (Hari 5 FE) — hanya untuk menguji jalur unduh `useExport()` /
 * `<ExportButton>` sebelum endpoint laporan backend sungguhan ada (ExcelJS/PDFKit
 * generik adalah task BE Hari 5 terpisah, belum tersambung ke sini). Balas file kecil
 * dengan Content-Type sesuai `?format=xlsx|pdf` — BUKAN xlsx/pdf valid secara struktur,
 * cukup untuk membuktikan blob + trigger-download bekerja end-to-end.
 *
 * Hapus file ini kalau sudah tidak dipakai halaman uji manapun.
 */
const CONTENT_TYPE: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf'
}

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const format = typeof query.format === 'string' ? query.format : 'xlsx'
  const contentType = CONTENT_TYPE[format] ?? 'application/octet-stream'

  setHeader(event, 'Content-Type', contentType)
  return Buffer.from(`Dummy export (${format}) — dibuat ${new Date().toISOString()}\n`, 'utf-8')
})
