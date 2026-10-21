import type { Column } from '~/types/data-table'

export interface SupplierRow extends Record<string, unknown> {
  id: string
  displayCode: string
  name: string
  isPkp: boolean
  isActive: boolean
}

export function useSupplierColumns(): Column<SupplierRow>[] {
  return [
    { key: 'displayCode', label: 'Kode', width: '110px', mono: true },
    { key: 'name', label: 'Nama Supplier' },
    { key: 'isPkp', label: 'PKP', align: 'center', format: v => (v ? 'Ya' : 'Tidak') },
    { key: 'isActive', label: 'Status', align: 'center', format: v => (v ? 'Aktif' : 'Nonaktif') }
  ]
}
