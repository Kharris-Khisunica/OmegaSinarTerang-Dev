export interface CustomerLookup {
  id: string
  code: string
  name: string
  isActive: boolean
  isPkp: boolean
  // Dipakai halaman cetak nota (§13.1 PANDUAN_UI.md) -- backend tidak
  // memangkas field ini untuk GET /customers (beda dari GET /suppliers yang
  // di-mask untuk OPERATOR, CLAUDE.md §3), jadi aman dibaca di sini juga.
  phone: string | null
  address: string | null
  city: string | null
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

export interface VehicleLookup {
  id: string
  code: string
  name: string
  isActive: boolean
}

/**
 * Loader id->baris untuk Faktur Penjualan (Hari 20 FE), pola sama
 * useSalesOrderLookups.ts / usePurchaseInvoiceLookups.ts.
 */
export function useSalesInvoiceLookups() {
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

  async function loadVehicleMap(): Promise<Map<string, VehicleLookup>> {
    const res = await api.get<{ data: VehicleLookup[] }>('/vehicles', { limit: 200 })
    return new Map(res.data.map(v => [v.id, v]))
  }

  return { loadCustomerMap, loadProductMap, loadUnitMap, loadSalesmanMap, loadVehicleMap }
}
