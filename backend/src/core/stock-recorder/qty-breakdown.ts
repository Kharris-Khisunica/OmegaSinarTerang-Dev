// Konversi satu tingkat saja (CLAUDE.md §3): "1 <satuan besar> = N <satuan
// dasar>". Fungsi murni — tidak menyentuh DB, supaya gampang diuji langsung
// tanpa perlu produk sungguhan (StockRecorderService.formatQtyBreakdown()
// yang membaca product+unitConversions dari DB lalu memanggil ini).
export interface QtyConversionLevel {
  unitName: string;
  qtyInBaseUnit: number;
}

/**
 * qtyBaseUnit=255, baseUnitName='RENCENG', conversions=[{unitName:'DUS',
 * qtyInBaseUnit:20}] -> "12 DUS 15 RENCENG". Sisa nol tidak ditampilkan,
 * kecuali tidak ada bagian lain sama sekali (qty 0) supaya hasil tidak
 * pernah string kosong.
 */
export function computeQtyBreakdown(
  qtyBaseUnit: number,
  baseUnitName: string,
  conversions: QtyConversionLevel[],
): string {
  const sign = qtyBaseUnit < 0 ? '-' : '';
  let remaining = Math.abs(qtyBaseUnit);

  const sortedDesc = [...conversions].sort(
    (a, b) => b.qtyInBaseUnit - a.qtyInBaseUnit,
  );

  const parts: string[] = [];
  for (const level of sortedDesc) {
    if (level.qtyInBaseUnit <= 0) continue;
    const count = Math.floor(remaining / level.qtyInBaseUnit);
    if (count > 0) {
      parts.push(`${count} ${level.unitName}`);
      remaining = roundQty(remaining - count * level.qtyInBaseUnit);
    }
  }

  if (remaining > 0 || parts.length === 0) {
    parts.push(`${formatQty(remaining)} ${baseUnitName}`);
  }

  return sign + parts.join(' ');
}

function roundQty(n: number): number {
  return Number(n.toFixed(4));
}

function formatQty(n: number): string {
  return roundQty(n).toString();
}
