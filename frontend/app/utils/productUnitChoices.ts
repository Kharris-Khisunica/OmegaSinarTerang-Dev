// Pilihan satuan input qty untuk layar yang backend-nya menerima qty dalam
// SATUAN DASAR (Mutasi Gudang, Saldo Awal) -- need_fixing.md #28: operator
// mengetik "angka + pilihan satuan" seperti layar lain, default satuan
// TERBESAR, lalu FE mengonversi ke satuan dasar (qty × isi) sebelum dikirim.
// Konversi satu tingkat saja (CLAUDE.md §3): "1 <satuan besar> = N <dasar>".
export interface UnitChoice {
  name: string
  factor: number
}

export function unitChoicesForProduct(product: {
  baseUnit: string
  unitConversions: { unitName: string, qtyInBaseUnit: string | number }[]
} | undefined): UnitChoice[] {
  if (!product) return []
  const choices: UnitChoice[] = [{ name: product.baseUnit, factor: 1 }]
  for (const c of product.unitConversions) {
    const factor = Number(c.qtyInBaseUnit)
    if (!c.unitName || !(factor > 0)) continue
    if (choices.some(u => u.name.trim().toLowerCase() === c.unitName.trim().toLowerCase())) continue
    choices.push({ name: c.unitName, factor })
  }
  return choices.sort((a, b) => b.factor - a.factor)
}

/** Faktor isi satuan `unitName` (1 kalau tidak dikenal = satuan dasar). */
export function unitFactor(choices: UnitChoice[], unitName: string | undefined): number {
  return choices.find(u => u.name === unitName)?.factor ?? 1
}

/**
 * Pecah qty satuan dasar ke satuan TERBESAR yang membaginya habis -- dipakai
 * mengisi ulang form dari angka satuan dasar (mis. sisa titipan, draf lama)
 * tanpa memunculkan pecahan.
 */
export function largestExactUnit(choices: UnitChoice[], qtyBaseUnit: number): { qty: number, unitName: string | undefined } {
  for (const u of choices) {
    if (u.factor > 0 && Number.isInteger(qtyBaseUnit / u.factor)) {
      return { qty: qtyBaseUnit / u.factor, unitName: u.name }
    }
  }
  return { qty: qtyBaseUnit, unitName: choices[choices.length - 1]?.name }
}
