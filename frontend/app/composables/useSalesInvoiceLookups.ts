export interface CustomerLookup {
  id: string
  code: string
  name: string
  isActive: boolean
  isPkp: boolean
  // Dicetak di kepala nota (§13.1 PANDUAN_UI.md). Sejak revisi klien 17 Okt
  // 2026 (Hari 44) pelanggan hanya punya Nama + Kota — telepon/alamat di-drop.
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

// Pekerja/tukang angkut (master `workers`) -- dipilih di Surat Jalan (Hari 44).
export interface WorkerLookup {
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

  async function loadWorkerMap(): Promise<Map<string, WorkerLookup>> {
    const res = await api.get<{ data: WorkerLookup[] }>('/workers', { limit: 200 })
    return new Map(res.data.map(w => [w.id, w]))
  }

  return { loadCustomerMap, loadProductMap, loadUnitMap, loadSalesmanMap, loadVehicleMap, loadWorkerMap }
}
