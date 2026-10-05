import type { FieldDef } from '~/types/crud-form'

/**
 * Skema bersama untuk master data kecil berbentuk {code, name, isActive}:
 * Merek, Satuan (UoM jual/beli), Salesman (Hari 8). Ketiganya identik di
 * backend (lihat brands/units/salesmen controller+entity) — satu schema
 * dipakai ulang lewat parameter label, BUKAN forked per modul (CLAUDE.md §6:
 * "Dilarang copy-paste layout tabel/form. Kalau butuh varian, tambah prop").
 */
export function useSimpleMasterSchema(nameLabel: string, namePlaceholder?: string): FieldDef[] {
  return [
    { key: 'name', label: nameLabel, type: 'text', required: true, cols: 8, placeholder: namePlaceholder, uppercase: true },
    {
      key: 'code',
      label: 'Kode',
      type: 'text',
      cols: 4,
      hint: 'Dibangkitkan otomatis oleh sistem saat disimpan, kecuali sakelar "Isi kode manual" dinyalakan.',
      // Field kode otomatis (docs/RENCANA_REVISI_TESTING_KLIEN.md §3 R1 item
      // M2) — backend membangkitkan dari sequence saat create kalau `code`
      // tidak dikirim (BrandsService/UnitsService/SalesmenService.create()).
      autoCode: {}
    },
    { key: 'isActive', label: 'Aktif', type: 'switch', cols: 6, defaultValue: true }
  ]
}

/** Form -> payload POST/PATCH /brands|/units|/salesmen. */
export function simpleMasterTransformOut(form: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: form.name,
    isActive: form.isActive
  }
  // Kosong (baru atau setelah klik "Bangkitkan") -> jangan kirim key ini sama
  // sekali: backend membangkitkan kode otomatis saat CREATE kalau tidak
  // dikirim; saat UPDATE, kode yang ada dibiarkan seperti semula (konsisten
  // productTransformOut, useProductSchema.ts).
  if (form.code) payload.code = form.code
  return payload
}
