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
    | 'display'

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
  type: 'text' | 'number' | 'currency' | 'select'
  placeholder?: string | ((ctx: RepeaterCellContext) => string)
  /** Wajib diisi kalau type === 'select'. Sama konvensi dengan FieldDef.options. */
  options?: SelectOption[] | (() => Promise<SelectOption[]>)
}

export interface FieldAction {
  icon: string
  label: string
  /** Dipanggil dengan form saat ini + setter — dipakai mis. tombol "Bangkitkan" kode. */
  onClick: (form: Record<string, unknown>, setField: (key: string, value: unknown) => void) => void
  /** Sembunyikan tombol aksi (mis. saat field terkunci). Default selalu tampil. */
  hidden?: (form: Record<string, unknown>) => boolean
}

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  required?: boolean
  options?: SelectOption[] | (() => Promise<SelectOption[]>)
  cols?: number
  /** String statis atau fungsi (hint berubah sesuai isi form, mis. status terkunci). */
  hint?: string | ((form: Record<string, unknown>) => string)
  disabled?: boolean | ((form: Record<string, unknown>) => boolean)
  placeholder?: string
  /** Nilai awal form create (selain default bawaan: switch=false, repeater=1 baris kosong, lainnya=null). */
  defaultValue?: unknown
  /** Wajib diisi kalau type === 'repeater'. Kolom sub-tabel di dalam form. */
  repeaterColumns?: RepeaterColumnDef[]
  /** Sembunyikan field secara reaktif berdasar nilai field lain di form. Default selalu tampil. */
  showIf?: (form: Record<string, unknown>) => boolean
  /** Wajib diisi kalau type === 'display'. Teks besar read-only, dihitung ulang tiap render. */
  compute?: (form: Record<string, unknown>) => string
  /** Tombol di samping input (type 'text' saja), mis. "Bangkitkan" kode otomatis. */
  action?: FieldAction
  /**
   * Auto-capitalize (type 'text'/'textarea') — asumsi A2 docs/RENCANA_REVISI_TESTING_KLIEN.md
   * §2B: HURUF BESAR SEMUA saat blur, `text-transform: uppercase` saat mengetik supaya
   * operator langsung melihat hasilnya. Hanya untuk field nama & alamat — JANGAN
   * dipasang di email/kode/NPWP/telepon/keterangan bebas.
   */
  uppercase?: boolean
  /**
   * Field kode otomatis (type 'text' saja) — default read-only dengan placeholder
   * "(otomatis saat disimpan)" + sakelar "Isi kode manual" di sampingnya. Dikunci
   * total (sakelar disembunyikan) kalau `autoCode.locked?.(form)` true, mis. kode
   * produk yang sudah dipakai transaksi pertama (CLAUDE.md §3).
   */
  autoCode?: {
    locked?: (form: Record<string, unknown>) => boolean
  }
}
