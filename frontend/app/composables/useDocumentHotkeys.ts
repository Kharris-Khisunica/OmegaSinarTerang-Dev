export type HotkeyContext = 'document' | 'line' | 'list'

export interface DocumentHotkeyHandlers {
  /** Ctrl+S — simpan dokumen. Konteks: document. */
  onSave?: () => void
  /** Insert — entri baris baru. Konteks: document. */
  onNewLine?: () => void
  /** F2 — ubah baris terpilih. Konteks: document | list. */
  onEditSelected?: () => void
  /** Delete — hapus baris terpilih (dengan konfirmasi di sisi pemanggil). Konteks: line. */
  onDeleteSelected?: () => void
  /** Esc — tutup satu lapis (konfirmasi dirty ditangani pemanggil). Konteks: semua. */
  onEsc?: () => void
  /** "/" — fokus kotak Cari. Konteks: list. */
  onFocusSearch?: () => void
  /** Enter — field berikutnya / simpan baris & buka baris baru. Konteks: line. */
  onEnterNext?: (e: KeyboardEvent) => void
}

/**
 * Satu jalur pendaftaran hotkey dokumen (PANDUAN_UI.md §12) — dilarang listener
 * keydown tersebar. Setiap pemanggil (DocumentModal, nanti LineModal/halaman
 * daftar) memanggil ini sekali dengan handler + `active` ref sendiri; instance
 * yang sedang tidak aktif (mis. DocumentModal saat LineModal-nya terbuka di atas)
 * jadi no-op lewat `active`, bukan add/remove listener dinamis.
 *
 * Hotkey tidak aktif saat fokus di dalam <input type="text"> KECUALI yang memang
 * ditujukan ke sana: Ctrl+S, Enter, Esc — daftar ini SENGAJA lebih luas dari
 * kalimat literal §12 (yang tidak menyebut Ctrl+S) karena CrudFormPage yang
 * sudah ada membiarkan Ctrl+S bekerja tanpa syarat fokus; perilaku itu
 * dipertahankan di sini, bukan reinterpretasi diam-diam.
 *
 * Ctrl+H/Ctrl+D (lock harga & diskon Faktur Penjualan) DICABUT di sini, bukan
 * cuma disembunyikan di pemanggil (docs/RENCANA_REVISI_TESTING_KLIEN.md §3
 * paket R5 FP4) — field harga langsung bisa diketik begitu baris dibuka,
 * tidak ada lagi konsep terkunci untuk digerbangi hotkey.
 */
export function useDocumentHotkeys(
  _context: HotkeyContext,
  handlers: DocumentHotkeyHandlers,
  options?: { active?: Ref<boolean> }
) {
  const active = options?.active ?? ref(true)

  function isInsideTextInput(el: Element | null): boolean {
    if (!el) return false
    return el.matches('input:not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]')
  }

  function isAlwaysAllowed(e: KeyboardEvent): boolean {
    const ctrlOrCmd = e.ctrlKey || e.metaKey
    if (ctrlOrCmd && e.key.toLowerCase() === 's') return true
    if (e.key === 'Enter') return true
    if (e.key === 'Escape') return true
    return false
  }

  function onKeydown(e: KeyboardEvent) {
    if (!active.value) return
    const insideTextInput = isInsideTextInput(document.activeElement)
    if (insideTextInput && !isAlwaysAllowed(e)) return

    const ctrlOrCmd = e.ctrlKey || e.metaKey
    if (ctrlOrCmd && e.key.toLowerCase() === 's' && handlers.onSave) {
      e.preventDefault()
      handlers.onSave()
    } else if (e.key === 'Escape' && handlers.onEsc) {
      e.preventDefault()
      handlers.onEsc()
    } else if (e.key === 'Enter' && handlers.onEnterNext) {
      handlers.onEnterNext(e)
    } else if (e.key === 'Insert' && handlers.onNewLine) {
      e.preventDefault()
      handlers.onNewLine()
    } else if (e.key === 'F2' && handlers.onEditSelected) {
      e.preventDefault()
      handlers.onEditSelected()
    } else if (e.key === 'Delete' && handlers.onDeleteSelected) {
      e.preventDefault()
      handlers.onDeleteSelected()
    } else if (e.key === '/' && handlers.onFocusSearch && !insideTextInput) {
      e.preventDefault()
      handlers.onFocusSearch()
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))
}
