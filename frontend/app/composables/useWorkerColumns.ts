import type { Column } from '~/types/data-table'

// Master Pekerja/Tukang Angkut (CLAUDE.md §3 "Biaya Operasional") — dipakai
// baris Gaji Tukang Angkut & Kasbon. Layar ditambahkan need_fixing.md #23
// (API /workers sudah ada sejak Hari 32A).
export interface WorkerRow extends Record<string, unknown> {
  id: string
  code: string
  name: string
  isActive: boolean
}

export function useWorkerColumns(): Column<WorkerRow>[] {
  return [
    { key: 'name', label: 'Nama Pekerja' },
    { key: 'code', label: 'Kode', width: '140px', mono: true },
    { key: 'isActive', label: 'Status', align: 'center', format: v => (v ? 'Aktif' : 'Nonaktif') }
  ]
}
