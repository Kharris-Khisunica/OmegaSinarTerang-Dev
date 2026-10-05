// Diangkat dari penjualan/faktur/index.vue (Hari 20) supaya Order Penjualan
// dan Faktur Pembelian tidak menyalin logika fetch yang sama (CLAUDE.md §6 --
// dilarang copy-paste). GET /products/:id/stock-balance sudah ada
// (products.controller.ts) -- composable ini TIDAK menambah endpoint baru.
export function useStockBalance() {
  const api = useApi()

  const qtyBaseUnit = ref<number | null>(null)
  const loading = ref(false)

  async function fetch(productId: string | undefined) {
    if (!productId) {
      qtyBaseUnit.value = null
      return
    }
    loading.value = true
    try {
      const res = await api.get<{ productId: string, qtyBaseUnit: number }>(`/products/${productId}/stock-balance`)
      qtyBaseUnit.value = res.qtyBaseUnit
    } catch {
      // Gagal fetch -> null ("belum tahu"), BUKAN 0 ("stok habis") -- dua arti
      // beda yang tidak boleh disamakan (StockBadge sudah membedakan ini juga).
      qtyBaseUnit.value = null
    } finally {
      loading.value = false
    }
  }

  return { qtyBaseUnit, loading, fetch }
}
