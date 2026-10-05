export interface ProductLookup {
  id: string
  code: string
  displayName: string
  baseUnit: string
  unitConversions: { unitName: string, qtyInBaseUnit: string | number, level: number }[]
}

export interface WarehouseLookup {
  id: string
  name: string
  warehouseType: string
  customerId: string | null
}

export interface CustomerLookup {
  id: string
  code: string
  name: string
}

/**
 * Loader kecil id->baris untuk menampilkan nama produk/gudang/pelanggan di
 * atas response GET /warehouse-mutations yang HANYA berisi id (tidak ada
 * relasi product/warehouse). Dipakai halaman list+detail (index.vue) dan
 * nota cetak (cetak.vue) — dua titik pakai sungguhan hari ini, kemungkinan
 * dipakai lagi nota dokumen lain Hari 15+. TIDAK dipakai create.vue, yang
 * butuh bentuk beda (array -> {label,value} untuk picker), jadi tidak
 * dipaksa lewat sini.
 *
 * Tidak ada cache lintas request sengaja — tiap halaman fetch ulang saat
 * mount, datanya bisa berubah antar kunjungan dan volumenya kecil.
 */
export function useWarehouseMutationLookups() {
  const api = useApi()

  async function loadProductMap(): Promise<Map<string, ProductLookup>> {
    const res = await api.get<{ data: ProductLookup[] }>('/products', { limit: 500 })
    return new Map(res.data.map(p => [p.id, p]))
  }

  async function loadWarehouseMap(): Promise<Map<string, WarehouseLookup>> {
    const res = await api.get<{ data: WarehouseLookup[] }>('/warehouses', { limit: 200 })
    return new Map(res.data.map(w => [w.id, w]))
  }

  async function loadCustomerMap(): Promise<Map<string, CustomerLookup>> {
    const res = await api.get<{ data: CustomerLookup[] }>('/customers', { limit: 500 })
    return new Map(res.data.map(c => [c.id, c]))
  }

  return { loadProductMap, loadWarehouseMap, loadCustomerMap }
}
