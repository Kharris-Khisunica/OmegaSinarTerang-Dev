export interface Column<T = Record<string, unknown>> {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  width?: string
  format?: (value: unknown, row: T) => string
  slot?: string
  /** Kode/nomor dokumen — font-mono (PANDUAN_UI.md §9). */
  mono?: boolean
}

export interface FilterOption {
  label: string
  value: string | number | boolean
}

export interface FilterDef {
  key: string
  label: string
  type: 'select' | 'date-range' | 'date'
  options?: FilterOption[]
  placeholder?: string
  /** Nilai awal dipakai kalau query URL belum menentukan filter ini (mis. "hari ini"). */
  default?: string | number | boolean
}

export interface RowAction<T = Record<string, unknown>> {
  label: string
  icon?: string
  to?: (row: T) => string
  onClick?: (row: T) => void | Promise<void>
  roles?: string[]
  show?: (row: T) => boolean
  color?: 'primary' | 'neutral' | 'error' | 'warning' | 'success'
}

export interface SortState {
  key: string
  dir: 'asc' | 'desc'
}

export interface PagedMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PagedResponse<T> {
  data: T[]
  meta: PagedMeta
}
