import type { Column } from '~/types/data-table'

export interface WarehouseRow extends Record<string, unknown> {
  id: string
  name: string
  warehouseType: 'STORE' | 'TITIPAN_PELANGGAN' | 'BAD_STOCK'
  isDefault: boolean
  isActive: boolean
}

const TYPE_LABEL: Record<string, string> = {
  STORE: 'Gudang Toko',
  TITIPAN_PELANGGAN: 'Titipan Pelanggan',
  BAD_STOCK: 'Barang Rusak'
}

export function useWarehouseColumns(): Column<WarehouseRow>[] {
  return [
    { key: 'name', label: 'Nama Gudang' },
    { key: 'warehouseType', label: 'Tipe', format: v => TYPE_LABEL[String(v)] ?? String(v) },
    { key: 'isDefault', label: 'Default', align: 'center', format: v => (v ? 'Ya' : '-') },
    { key: 'isActive', label: 'Status', align: 'center', format: v => (v ? 'Aktif' : 'Nonaktif') }
  ]
}
