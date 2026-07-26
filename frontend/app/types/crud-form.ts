export type FieldType
  = | 'text'
    | 'number'
    | 'currency'
    | 'select'
    | 'autocomplete'
    | 'date'
    | 'textarea'
    | 'switch'

export interface SelectOption {
  label: string
  value: string | number | boolean
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
}
