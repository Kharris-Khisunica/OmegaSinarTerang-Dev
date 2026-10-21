import type { FieldDef } from '~/types/crud-form'

/**
 * Skema form Supplier (Hari 5), dipakai bareng create & edit.
 * `displayCode` (mis. "SUP-001") di-generate server dari `supplier_code_seq` —
 * TIDAK PERNAH dikirim dari FE (backend tidak menerimanya di DTO, `whitelist: true`
 * akan membuangnya kalau dikirim juga). Field tetap ditampilkan (disabled) supaya
 * Master/Operator tahu kode supplier itu ada dan otomatis, bukan diketik manual.
 * Revisi klien 17 Okt 2026 (Hari 44): supplier cukup NAMA (+ PKP, gerbang PPN
 * masukan §2.11) — kontak di-drop dan masking OPERATOR dicabut.
 */
export function useSupplierSchema(): FieldDef[] {
  return [
    { key: 'name', label: 'Nama Supplier', type: 'text', required: true, cols: 8, uppercase: true },
    {
      key: 'displayCode',
      label: 'Kode',
      type: 'text',
      cols: 4,
      disabled: true,
      placeholder: 'Otomatis setelah disimpan',
      hint: 'Dibuat otomatis oleh sistem, tidak bisa diubah.'
    },
    { key: 'isPkp', label: 'PKP (Pengusaha Kena Pajak)', type: 'switch', cols: 6, hint: 'Aktifkan kalau supplier ini kena PPN.' },
    { key: 'isActive', label: 'Aktif', type: 'switch', cols: 6, defaultValue: true }
  ]
}

/** Form -> payload POST/PATCH /suppliers (displayCode dibuang, server-generated). */
export function supplierTransformOut(form: Record<string, unknown>): Record<string, unknown> {
  return {
    name: form.name,
    isPkp: form.isPkp,
    isActive: form.isActive
  }
}
