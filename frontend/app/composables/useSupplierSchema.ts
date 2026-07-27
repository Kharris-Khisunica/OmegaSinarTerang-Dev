import type { FieldDef } from '~/types/crud-form'

/**
 * Skema form Supplier (Hari 5), dipakai bareng create & edit.
 * `displayCode` (mis. "SUP-001") di-generate server dari `supplier_code_seq` —
 * TIDAK PERNAH dikirim dari FE (backend tidak menerimanya di DTO, `whitelist: true`
 * akan membuangnya kalau dikirim juga). Field tetap ditampilkan (disabled) supaya
 * Master/Operator tahu kode supplier itu ada dan otomatis, bukan diketik manual.
 * Untuk OPERATOR, `name`/`contactPhone`/`contactAddress` yang tampil di sini SUDAH
 * ter-mask oleh `SupplierMaskingInterceptor` di backend (CLAUDE.md §3) — FE tidak
 * perlu masking sendiri, cukup tampilkan apa adanya dari response.
 */
export function useSupplierSchema(): FieldDef[] {
  return [
    { key: 'name', label: 'Nama Supplier', type: 'text', required: true, cols: 8 },
    {
      key: 'displayCode',
      label: 'Kode',
      type: 'text',
      cols: 4,
      disabled: true,
      placeholder: 'Otomatis setelah disimpan',
      hint: 'Dibuat otomatis oleh sistem, tidak bisa diubah.'
    },
    {
      key: 'contactPhone',
      label: 'No. Telepon',
      type: 'text',
      cols: 6,
      placeholder: '081234567890'
    },
    { key: 'contactAddress', label: 'Alamat', type: 'textarea', cols: 12 },
    { key: 'isActive', label: 'Aktif', type: 'switch', cols: 6, defaultValue: true }
  ]
}

/**
 * Form -> payload POST/PATCH /suppliers (displayCode dibuang, server-generated).
 * Sengaja TIDAK mengonversi string kosong -> undefined: `contactPhone`/`contactAddress`
 * kosong tetap dikirim apa adanya (null atau '') supaya mengosongkan field saat edit
 * benar-benar terkirim ke server, bukan diam-diam diabaikan (lihat perilaku
 * `UpdateSupplierDto` di suppliers.service.ts: field hanya di-update kalau !== undefined).
 */
export function supplierTransformOut(form: Record<string, unknown>): Record<string, unknown> {
  return {
    name: form.name,
    contactPhone: form.contactPhone,
    contactAddress: form.contactAddress,
    isActive: form.isActive
  }
}
