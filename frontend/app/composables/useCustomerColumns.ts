import type { Column } from '~/types/data-table'

export interface CustomerRow extends Record<string, unknown> {
  id: string
  code: string
  name: string
  city: string | null
  isPkp: boolean
  isActive: boolean
}

export function useCustomerColumns(): Column<CustomerRow>[] {
  return [
    { key: 'code', label: 'Kode', width: '120px', mono: true },
    // PANDUAN_UI.md §11.1: "Pelanggan" bukan "Customer".
    { key: 'name', label: 'Nama Pelanggan' },
    { key: 'city', label: 'Kota', format: v => (v ? String(v) : '-') },
    { key: 'isPkp', label: 'PKP', align: 'center', format: v => (v ? 'Ya' : 'Tidak') },
    { key: 'isActive', label: 'Status', align: 'center', format: v => (v ? 'Aktif' : 'Nonaktif') }
  ]
}
