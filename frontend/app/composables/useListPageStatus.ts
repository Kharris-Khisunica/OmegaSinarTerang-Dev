const total = ref<number | null>(null)

/**
 * Singleton jumlah data halaman daftar yang sedang terbuka, dibaca StatusBar.vue
 * (PANDUAN_UI.md §4.2, padanan "REC(s)" sistem lama). Pola singleton module-level
 * sama seperti useClockTick(). Diisi <DataTable> setelah load() sukses (mode
 * endpoint saja — mode data lokal untuk grid baris di dalam modal tidak pernah
 * menyentuh ini), dikosongkan saat instance itu unmount.
 */
export function useListPageStatus() {
  function setTotal(n: number) {
    total.value = n
  }
  function clear() {
    total.value = null
  }
  return { total: readonly(total), setTotal, clear }
}
