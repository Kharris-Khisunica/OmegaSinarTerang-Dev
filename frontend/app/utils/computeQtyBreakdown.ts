// Port murni dari backend/src/core/stock-recorder/qty-breakdown.ts — konversi
// satu tingkat saja (CLAUDE.md §3): "1 <satuan besar> = N <satuan dasar>".
// Tidak ada endpoint stok yang mengembalikan pecahan siap-pakai hari ini
// (lihat catatan <StockBadge>), jadi FE menghitungnya sendiri dari qty base
// unit + daftar konversi produk yang SUDAH ada di response GET /products/:id.
// Kalau backend nanti mengekspos endpoint saldo stok yang sudah memanggil
// StockRecorderService.formatQtyBreakdown() sendiri, fungsi ini masih valid
// dipakai sebagai fallback offline/optimistic-update, bukan mubazir.
export interface QtyConversionLevel {
  unitName: string
  qtyInBaseUnit: number
}

export interface ComputeQtyBreakdownOptions {
  /**
   * RENCANA_REVISI_TESTING_KLIEN.md §2B A4: sisa stok jangan pecahan --
   * cukup satuan TERBESAR, dibulatkan KE BAWAH, ditandai "+" kalau ada sisa
   * yang dibuang (mis. 12,5 dus -> "12 dus +"). Tanpa tanda ini operator
   * menyangka sisanya pas 12 dan bisa salah ambil keputusan saat stok mepet.
   */
  largestOnly?: boolean
}

export function computeQtyBreakdown(
  qtyBaseUnit: number,
  baseUnitName: string,
  conversions: QtyConversionLevel[],
  options?: ComputeQtyBreakdownOptions
): string {
  const sign = qtyBaseUnit < 0 ? '-' : ''
  const abs = Math.abs(qtyBaseUnit)

  if (options?.largestOnly) {
    const largest = [...conversions]
      .filter(c => c.qtyInBaseUnit > 0)
      .sort((a, b) => b.qtyInBaseUnit - a.qtyInBaseUnit)[0]
    const unitName = largest?.unitName ?? baseUnitName
    const factor = largest?.qtyInBaseUnit ?? 1
    const count = Math.floor(abs / factor)
    const hasRemainder = roundQty(abs - count * factor) > 0
    return `${sign}${count} ${unitName}${hasRemainder ? ' +' : ''}`
  }

  let remaining = abs

  const sortedDesc = [...conversions].sort((a, b) => b.qtyInBaseUnit - a.qtyInBaseUnit)

  const parts: string[] = []
  for (const level of sortedDesc) {
    if (level.qtyInBaseUnit <= 0) continue
    const count = Math.floor(remaining / level.qtyInBaseUnit)
    if (count > 0) {
      parts.push(`${count} ${level.unitName}`)
      remaining = roundQty(remaining - count * level.qtyInBaseUnit)
    }
  }

  if (remaining > 0 || parts.length === 0) {
    parts.push(`${formatQty(remaining)} ${baseUnitName}`)
  }

  return sign + parts.join(' ')
}

function roundQty(n: number): number {
  return Number(n.toFixed(4))
}

function formatQty(n: number): string {
  return roundQty(n).toString()
}
