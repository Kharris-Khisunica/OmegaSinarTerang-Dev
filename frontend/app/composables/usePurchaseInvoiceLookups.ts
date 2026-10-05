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
  isBkp: boolean
  isActive: boolean
  unitConversions: { unitName: string, qtyInBaseUnit: string | number }[]
}

export interface UnitLookup {
  id: string
  code: string
  name: string
  isActive: boolean
}

/**
 * Loader id->baris untuk Faktur Pembelian (Hari 14), pola sama
 * useWarehouseMutationLookups.ts. Dipakai create.vue (picker) DAN index.vue
 * (menampilkan nama supplier/produk di atas response GET /purchase-invoices
 * yang cuma berisi id). `name`/`displayCode` supplier SUDAH ter-mask untuk
 * OPERATOR oleh SupplierMaskingInterceptor backend (CLAUDE.md §3) — tidak
 * perlu masking lagi di sini, tampilkan apa adanya.
 */
export function usePurchaseInvoiceLookups() {
  const api = useApi()

  async function loadSupplierMap(): Promise<Map<string, SupplierLookup>> {
    const res = await api.get<{ data: SupplierLookup[] }>('/suppliers', { limit: 500 })
    return new Map(res.data.map(s => [s.id, s]))
  }

  async function loadProductMap(): Promise<Map<string, ProductLookup>> {
    const res = await api.get<{ data: ProductLookup[] }>('/products', { limit: 500 })
    return new Map(res.data.map(p => [p.id, p]))
  }

  async function loadUnitMap(): Promise<Map<string, UnitLookup>> {
    const res = await api.get<{ data: UnitLookup[] }>('/units', { limit: 200 })
    return new Map(res.data.map(u => [u.id, u]))
  }

  return { loadSupplierMap, loadProductMap, loadUnitMap }
}
