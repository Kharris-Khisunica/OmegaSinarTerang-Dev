export interface CustomerLookup {
  id: string
  code: string
  name: string
  isActive: boolean
}

export interface ProductLookup {
  id: string
  code: string
  displayName: string
  baseUnit: string
  isActive: boolean
  unitConversions: { unitName: string, qtyInBaseUnit: string | number }[]
}

export interface UnitLookup {
  id: string
  code: string
  name: string
  isActive: boolean
}

export interface SalesmanLookup {
  id: string
  code: string
  name: string
  isActive: boolean
}

/**
 * Loader id->baris untuk Sales Order (Hari 19 FE), pola sama
 * usePurchaseInvoiceLookups.ts / useWarehouseMutationLookups.ts. Dipakai
 * index.vue untuk picker (Entri/Ubah) DAN menampilkan nama pelanggan/produk
 * di atas response GET /sales-orders yang cuma berisi id.
 *
 * loadSalesmanMap() ditambahkan 02 Okt 2026 (koreksi: SO sekarang menyimpan
 * salesman sebagai PJ) — pola identik useSalesInvoiceLookups.ts.
 */
export function useSalesOrderLookups() {
  const api = useApi()

  async function loadCustomerMap(): Promise<Map<string, CustomerLookup>> {
    const res = await api.get<{ data: CustomerLookup[] }>('/customers', { limit: 500 })
    return new Map(res.data.map(c => [c.id, c]))
  }

  async function loadProductMap(): Promise<Map<string, ProductLookup>> {
    const res = await api.get<{ data: ProductLookup[] }>('/products', { limit: 500 })
    return new Map(res.data.map(p => [p.id, p]))
  }

  async function loadUnitMap(): Promise<Map<string, UnitLookup>> {
    const res = await api.get<{ data: UnitLookup[] }>('/units', { limit: 200 })
    return new Map(res.data.map(u => [u.id, u]))
  }

  async function loadSalesmanMap(): Promise<Map<string, SalesmanLookup>> {
    const res = await api.get<{ data: SalesmanLookup[] }>('/salesmen', { limit: 200 })
    return new Map(res.data.map(s => [s.id, s]))
  }

  return { loadCustomerMap, loadProductMap, loadUnitMap, loadSalesmanMap }
}
