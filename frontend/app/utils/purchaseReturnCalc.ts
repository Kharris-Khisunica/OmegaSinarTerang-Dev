// Kalkulasi LIVE untuk preview form Retur Pembelian (Hari 16) SEBELUM submit.
// `agreedAmount` di sini identik dengan backend (qtyInput * agreedUnitPrice,
// backend/src/modules/purchase-returns/purchase-returns.service.ts).
//
// `estimatedDifference`/`estimatedCostBasis` BUKAN cermin backend — backend
// menghitung costBasisAmount dari FIFO SUNGGUHAN saat submit (bisa mencampur
// lebih dari satu lot kalau qtyInput melebihi qty lot tertua). Util ini hanya
// mengalikan qtyInput dengan `fifoNextUnitCost` (lot tertua, referensi dari
// GET /purchase-returns/bad-stock) sebagai ESTIMASI — wajib dilabeli
// "(estimasi)" di UI, jangan ditampilkan seolah angka final.
//
// Sen integer, sama seperti backend, supaya tidak ada drift pembulatan float.

export interface PurchaseReturnCalcLineInput {
  qtyInput: number
  agreedUnitPrice: number | undefined
  fifoNextUnitCost: number
}

export interface PurchaseReturnCalcLineResult {
  agreedAmount: number
  estimatedCostBasis: number
  estimatedDifference: number
}

export interface PurchaseReturnCalcResult {
  lines: PurchaseReturnCalcLineResult[]
  subtotalAgreedAmount: number
  estimatedTotalCostBasis: number
  estimatedTotalDifference: number
}

export function calculatePurchaseReturn(lines: PurchaseReturnCalcLineInput[]): PurchaseReturnCalcResult {
  const agreedCents: number[] = []
  const costBasisCents: number[] = []

  for (const line of lines) {
    const agreedC = toCents(line.qtyInput * (line.agreedUnitPrice ?? 0))
    const costC = toCents(line.qtyInput * line.fifoNextUnitCost)
    agreedCents.push(agreedC)
    costBasisCents.push(costC)
  }

  const subtotalAgreedCents = agreedCents.reduce((sum, v) => sum + v, 0)
  const totalCostBasisCents = costBasisCents.reduce((sum, v) => sum + v, 0)

  return {
    lines: lines.map((_, i) => {
      const agreedC = agreedCents[i] ?? 0
      const costC = costBasisCents[i] ?? 0
      return {
        agreedAmount: fromCents(agreedC),
        estimatedCostBasis: fromCents(costC),
        estimatedDifference: fromCents(agreedC - costC)
      }
    }),
    subtotalAgreedAmount: fromCents(subtotalAgreedCents),
    estimatedTotalCostBasis: fromCents(totalCostBasisCents),
    estimatedTotalDifference: fromCents(subtotalAgreedCents - totalCostBasisCents)
  }
}

function toCents(value: number): number {
  return Math.round(value * 100)
}

function fromCents(cents: number): number {
  return cents / 100
}
