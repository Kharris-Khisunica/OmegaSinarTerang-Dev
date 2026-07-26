/**
 * MOCK sementara (Hari 3 FE) — BE belum punya modul warehouses (rencana Hari 4).
 * In-memory, hilang tiap restart dev server. Hapus file ini begitu
 * backend CRUD /warehouses sungguhan tersedia dan arahkan endpoint ke sana.
 */
export type WarehouseType = 'STORE' | 'CUSTOMER_CONSIGNMENT' | 'BAD_STOCK'

export interface Warehouse {
  id: number
  code: string
  name: string
  type: WarehouseType
  address: string
  is_active: boolean
  created_at: string
}

const typeCycle: WarehouseType[] = ['STORE', 'CUSTOMER_CONSIGNMENT', 'BAD_STOCK']

function seed(): Warehouse[] {
  const names = [
    'Gudang Pusat', 'Gudang Cabang Timur', 'Gudang Cabang Barat', 'Gudang Titipan Toko Sinar',
    'Gudang Rusak Ekspedisi', 'Gudang Cabang Utara', 'Gudang Cabang Selatan', 'Gudang Transit Pelabuhan',
    'Gudang Titipan Agen Jaya', 'Gudang Cadangan', 'Gudang Retur', 'Gudang Konsinyasi Toko Makmur',
    'Gudang Pusat 2', 'Gudang Cabang Kota Lama', 'Gudang Rusak Gudang Utama', 'Gudang Cabang Industri',
    'Gudang Titipan Toko Rejeki', 'Gudang Cabang Pasar Baru', 'Gudang Cabang Terminal', 'Gudang Konsinyasi Warung Sehat',
    'Gudang Cabang Kawasan', 'Gudang Rusak Retur Supplier', 'Gudang Cabang Perumahan', 'Gudang Titipan Toko Berkah',
    'Gudang Cabang Depan Pasar'
  ]
  return names.map((name, i) => ({
    id: i + 1,
    code: `WH${String(i + 1).padStart(3, '0')}`,
    name,
    type: typeCycle[i % typeCycle.length]!,
    address: `Jl. Contoh No. ${i + 1}, Jakarta`,
    is_active: i % 7 !== 0,
    created_at: new Date(Date.now() - i * 86400000).toISOString()
  }))
}

const globalStore = globalThis as unknown as { __warehousesStore?: Warehouse[] }
if (!globalStore.__warehousesStore) {
  globalStore.__warehousesStore = seed()
}

export function listWarehouses() {
  return globalStore.__warehousesStore!
}

export function getWarehouseById(id: number) {
  return globalStore.__warehousesStore!.find(w => w.id === id)
}

export function findByCode(code: string, excludeId?: number) {
  return globalStore.__warehousesStore!.find(w => w.code.toLowerCase() === code.toLowerCase() && w.id !== excludeId)
}

export function insertWarehouse(data: Omit<Warehouse, 'id' | 'created_at'>) {
  const store = globalStore.__warehousesStore!
  const nextId = store.length ? Math.max(...store.map(w => w.id)) + 1 : 1
  const row: Warehouse = { id: nextId, created_at: new Date().toISOString(), ...data }
  store.push(row)
  return row
}

export function updateWarehouse(id: number, data: Partial<Omit<Warehouse, 'id' | 'created_at'>>) {
  const store = globalStore.__warehousesStore!
  const row = store.find(w => w.id === id)
  if (!row) return undefined
  Object.assign(row, data)
  return row
}
