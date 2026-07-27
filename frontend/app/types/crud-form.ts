export type FieldType
  = | 'text'
    | 'number'
    | 'currency'
    | 'select'
    | 'autocomplete'
    | 'date'
    | 'textarea'
    | 'switch'
    | 'repeater'

export interface SelectOption {
  label: string
  value: string | number | boolean
}

export interface RepeaterCellContext {
  row: Record<string, unknown>
  rowIndex: number
  rows: Record<string, unknown>[]
  form: Record<string, unknown>
}

export interface RepeaterColumnDef {
  key: string
  label: string
  type: 'text' | 'number'
  placeholder?: string | ((ctx: RepeaterCellContext) => string)
}

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  required?: boolean
  options?: SelectOption[] | (() => Promise<SelectOption[]>)
  cols?: number
  hint?: string
  disabled?: boolean | ((form: Record<string, unknown>) => boolean)
  placeholder?: string
  /** Nilai awal form create (selain default bawaan: switch=false, repeater=1 baris kosong, lainnya=null). */
  defaultValue?: unknown
  /** Wajib diisi kalau type === 'repeater'. Kolom sub-tabel di dalam form. */
  repeaterColumns?: RepeaterColumnDef[]
}
