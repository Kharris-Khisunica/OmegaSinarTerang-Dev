/**
 * Penghitung modal dokumen/baris yang sedang terbuka (need_fixing.md #8) —
 * dipakai menonaktifkan hotkey LAPIS BAWAH selama ada lapis di atasnya
 * (PANDUAN_UI.md §12: Esc menutup SATU lapis; Insert/F2/Delete milik modal
 * dokumen tidak boleh ikut bereaksi saat modal baris terbuka; "/" halaman
 * daftar diam selama ada modal). State modul (bukan per instance) karena
 * lapis-lapis itu komponen berbeda yang tidak saling tahu.
 */
const openCounts = reactive({ document: 0, line: 0 })

export type ModalKind = 'document' | 'line'

export function useModalStack() {
  /** Daftarkan satu modal: hitungan ikut `open`-nya, dibersihkan saat unmount. */
  function register(kind: ModalKind, open: Ref<boolean>) {
    let counted = false
    const sync = (value: boolean) => {
      if (value && !counted) {
        openCounts[kind]++
        counted = true
      } else if (!value && counted) {
        openCounts[kind]--
        counted = false
      }
    }
    watch(open, sync, { immediate: true })
    onUnmounted(() => sync(false))
  }

  const anyLineOpen = computed(() => openCounts.line > 0)
  const anyModalOpen = computed(() => openCounts.document > 0 || openCounts.line > 0)

  return { register, anyLineOpen, anyModalOpen }
}
