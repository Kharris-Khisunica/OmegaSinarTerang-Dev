export type ExportFormat = 'xlsx' | 'pdf'

/**
 * Satu jalur export file (Excel/PDF) di FE, dipakai berulang oleh semua halaman laporan
 * mulai Hari 26 (lewat <ExportButton>). Panggil endpoint yang sama dengan `?format=xlsx|pdf`
 * ditambah `filters()` sebagai query, lalu picu download di browser.
 *
 * Lewat `useApi().getBlob()` (bukan $fetch terpisah) supaya tetap ikut auth header +
 * retry 401→refresh yang sama dengan seluruh request lain (CLAUDE.md §6: "Panggilan API
 * lewat useApi()").
 *
 * Nama file SENGAJA ditentukan di FE (bukan dibaca dari header Content-Disposition
 * server) — lebih sederhana dan tidak bergantung header yang belum tentu diisi backend
 * dummy/awal. `filters` boleh fungsi supaya dievaluasi ulang tiap kali export dipanggil
 * (mis. filter tanggal di halaman laporan berubah tanpa remount composable).
 */
export function useExport(endpoint: string, filters?: () => Record<string, unknown>) {
  const api = useApi()
  const exporting = ref(false)
  const error = ref('')

  function buildFileName(format: ExportFormat, fileNamePrefix: string, query: Record<string, unknown>): string {
    const dateParam = query.date ?? query.tanggal
    const dateStr = typeof dateParam === 'string' && dateParam ? dateParam : new Date().toISOString().slice(0, 10)
    return `${fileNamePrefix}-${dateStr}.${format}`
  }

  function triggerDownload(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function exportFile(format: ExportFormat, fileNamePrefix: string): Promise<void> {
    if (exporting.value) return
    error.value = ''
    exporting.value = true
    try {
      const query = { ...(filters ? filters() : {}), format }
      const blob = await api.getBlob(endpoint, query)
      triggerDownload(blob, buildFileName(format, fileNamePrefix, query))
    } catch (err) {
      error.value = getErrorMessage(err, 'Gagal mengunduh file.')
      throw err
    } finally {
      exporting.value = false
    }
  }

  return { exporting, error, exportFile }
}
