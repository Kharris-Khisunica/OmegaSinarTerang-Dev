import type { FieldDef } from '~/types/crud-form'

interface UnitConversionRow {
  unitName: string
  ratioToNext: number | null
}

interface ServerUnitConversion {
  unitName: string
  qtyInBaseUnit: string | number
  level: number
}

/**
 * Skema form Produk (Hari 4), dipakai bareng create & edit.
 * Urutan field sengaja: nama duluan, baru kode — supaya "Simpan & Tambah Lagi"
 * (yang fokus ke field pertama) langsung siap ketik nama produk berikutnya.
 *
 * Baris "Konversi Satuan" diinput dari satuan TERBESAR ke TERKECIL (mis. dus
 * dulu, baru renceng, baru — implisit — satuan dasar). `ratioToNext` = berapa
 * satuan di baris BAWAHNYA (baris terakhir = berapa satuan dasar produk), BUKAN
 * total dalam satuan dasar — lebih natural buat operator ("1 dus = 12 renceng")
 * daripada harus mengalikan sendiri ("1 dus = 120 pcs"). Perkalian bertingkat +
 * konversi ke level/qtyInBaseUnit absolut (kontrak backend, level 1 = satuan
 * terkecil, tidak berubah) terjadi di productTransformOut/In di bawah.
 */
export function useProductSchema(): FieldDef[] {
  return [
    { key: 'name', label: 'Nama Produk', type: 'text', required: true, cols: 8 },
    {
      key: 'code',
      label: 'Kode',
      type: 'text',
      required: true,
      cols: 4,
      placeholder: 'SKU',
      hint: 'Kode unik, diketik manual (belum ada generator otomatis).'
    },
    { key: 'baseUnit', label: 'Satuan Dasar (terkecil)', type: 'text', required: true, cols: 6, placeholder: 'pcs' },
    { key: 'isActive', label: 'Aktif', type: 'switch', cols: 6, defaultValue: true },
    {
      key: 'unitConversions',
      label: 'Konversi Satuan',
      type: 'repeater',
      cols: 12,
      hint: 'Urutkan dari satuan PALING BESAR ke PALING KECIL (mis. dus, lalu renceng). Isi tiap baris = berapa satuan di baris bawahnya (baris terakhir = berapa satuan dasar). Baris dengan nama satuan kosong otomatis diabaikan saat disimpan.',
      repeaterColumns: [
        { key: 'unitName', label: 'Nama Satuan', type: 'text', placeholder: 'dus' },
        {
          key: 'ratioToNext',
          label: 'Isi',
          type: 'number',
          placeholder: ({ rows, rowIndex, form }) => {
            const nextUnit = (rows[rowIndex + 1]?.unitName as string) || (form.baseUnit as string) || 'satuan dasar'
            return `berapa ${nextUnit || 'satuan dasar'}?`
          }
        }
      ]
    }
  ]
}

/** Response GET /products/:id -> bentuk form (rasio bertingkat, urut besar ke kecil). */
export function productTransformIn(data: Record<string, unknown>): Record<string, unknown> {
  const conversions = (data.unitConversions as ServerUnitConversion[] | undefined) ?? []
  // Urut level naik = kecil ke besar (konvensi backend, level 1 = satuan terkecil).
  const sortedSmallToBig = [...conversions].sort((a, b) => a.level - b.level)

  const withRatio: UnitConversionRow[] = sortedSmallToBig.map((c, index) => {
    const qty = Number(c.qtyInBaseUnit)
    const prevQty = index === 0 ? 1 : Number(sortedSmallToBig[index - 1]!.qtyInBaseUnit)
    return { unitName: c.unitName, ratioToNext: prevQty === 0 ? 0 : qty / prevQty }
  })

  const rows = withRatio.length ? [...withRatio].reverse() : [{ unitName: '', ratioToNext: null }]

  return {
    ...data,
    unitConversions: rows
  }
}

/** Form -> payload POST/PATCH /products (baris kosong dibuang, rasio bertingkat -> qty absolut + level). */
export function productTransformOut(form: Record<string, unknown>): Record<string, unknown> {
  const rows = ((form.unitConversions as UnitConversionRow[] | undefined) ?? [])
    .filter(row => typeof row.unitName === 'string' && row.unitName.trim() !== '')

  const count = rows.length
  const withQty: { unitName: string, qtyInBaseUnit: number }[] = new Array(count)

  // Proses dari baris terakhir (satuan terkecil, dekat satuan dasar) ke baris pertama
  // (satuan terbesar), mengalikan rasio secara bertingkat ke atas.
  let runningQty: number | null = null
  for (let i = count - 1; i >= 0; i--) {
    const ratio = Number(rows[i]!.ratioToNext ?? 0)
    runningQty = runningQty === null ? ratio : ratio * runningQty
    withQty[i] = { unitName: rows[i]!.unitName.trim(), qtyInBaseUnit: runningQty }
  }

  // level 1 = satuan terkecil (baris terakhir), naik ke atas — konvensi backend tidak berubah.
  const unitConversions = withQty.map((row, index) => ({
    unitName: row.unitName,
    qtyInBaseUnit: row.qtyInBaseUnit,
    level: count - index
  }))

  return {
    code: form.code,
    name: form.name,
    baseUnit: form.baseUnit,
    isActive: form.isActive,
    unitConversions
  }
}
