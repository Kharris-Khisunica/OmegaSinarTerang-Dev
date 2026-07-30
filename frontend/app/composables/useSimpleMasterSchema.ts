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
    { key: 'name', label: nameLabel, type: 'text', required: true, cols: 8, placeholder: namePlaceholder },
    { key: 'code', label: 'Kode', type: 'text', required: true, cols: 4, hint: 'Kode unik, diketik manual.' },
    { key: 'isActive', label: 'Aktif', type: 'switch', cols: 6, defaultValue: true }
  ]
}

/** Form -> payload POST/PATCH /brands|/units|/salesmen. */
export function simpleMasterTransformOut(form: Record<string, unknown>): Record<string, unknown> {
  return {
    code: form.code,
    name: form.name,
    isActive: form.isActive
  }
}
