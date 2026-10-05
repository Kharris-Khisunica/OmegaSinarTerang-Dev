import type { Column } from '~/types/data-table'

export interface VehicleRow extends Record<string, unknown> {
  id: string
  code: string
  name: string
  isActive: boolean
}

export function useVehicleColumns(): Column<VehicleRow>[] {
  return [
    { key: 'name', label: 'Nama Kendaraan' },
    { key: 'code', label: 'Kode', width: '140px', mono: true },
    { key: 'isActive', label: 'Status', align: 'center', format: v => (v ? 'Aktif' : 'Nonaktif') }
  ]
}
