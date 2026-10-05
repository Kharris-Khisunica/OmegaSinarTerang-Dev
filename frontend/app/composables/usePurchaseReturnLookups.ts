export interface SupplierLookup {
  id: string
  displayCode: string
  name: string
  isPkp: boolean
}

export interface ProductLookup {
  id: string
  code: string
  displayName: string
  baseUnit: string
  unitConversions: { unitName: string, qtyInBaseUnit: string | number, level: number }[]
}

export interface BadStockLotRow {
  productId: string
  displayName: string
  qtyAvailable: number
  fifoNextUnitCost: number
}

export interface CashAccountOption {
  id: string
  code: string
  name: string
}

/**
 * Loader untuk Retur Pembelian (Hari 16), pola sama usePurchaseInvoiceLookups.ts
 * / useWarehouseMutationLookups.ts. `name`/`displayCode` supplier SUDAH
 * ter-mask untuk OPERATOR oleh SupplierMaskingInterceptor backend
 * (CLAUDE.md §3) — tidak perlu masking lagi di sini.
 *
 * findBadStockLots() SENGAJA tidak dipanggil di sini secara otomatis —
 * dipanggil eksplisit oleh create.vue lewat watch(supplierId) supaya daftar
 * BS benar-benar kosong sampai supplier dipilih (bukan fetch-lalu-filter).
 */
export function usePurchaseReturnLookups() {
  const api = useApi()

  async function loadSupplierMap(): Promise<Map<string, SupplierLookup>> {
    const res = await api.get<{ data: SupplierLookup[] }>('/suppliers', { limit: 500 })
    return new Map(res.data.map(s => [s.id, s]))
  }

  async function loadProductMap(): Promise<Map<string, ProductLookup>> {
    const res = await api.get<{ data: ProductLookup[] }>('/products', { limit: 500 })
    return new Map(res.data.map(p => [p.id, p]))
  }

  function findBadStockLots(supplierId: string): Promise<BadStockLotRow[]> {
    return api.get<BadStockLotRow[]>('/purchase-returns/bad-stock', { supplierId })
  }

  async function loadCashAccountOptions(): Promise<CashAccountOption[]> {
    return api.get<CashAccountOption[]>('/chart-of-accounts/cash-accounts')
  }

  return { loadSupplierMap, loadProductMap, findBadStockLots, loadCashAccountOptions }
}
