export interface CashAccountOption {
  id: string
  code: string
  name: string
}

export interface ReturnableInvoiceLine {
  id: string
  productId: string
  unitId: string
  qtyInput: number
  netAmount: number
  unitCostFifo: number
  // Sisa qty yang belum diretur, dalam SATUAN YANG SAMA dengan qtyInput baris
  // faktur (CLAUDE.md §3 "Lain-lain": satuan retur mengikuti satuan baris
  // faktur asal, tidak dipilih ulang).
  alreadyReturnedQtyInput: number
  remainingQtyInput: number
}

export interface ReturnableInvoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  customerId: string
  subtotal: number
  invoiceDiscountAmount: number
  outputVatAmount: number
  totalAmount: number
  postingStatus: 'POSTED' | 'VOIDED'
  lines: ReturnableInvoiceLine[]
}

interface RawInvoiceLine {
  id: string
  productId: string
  unitId: string
  qtyInput: string
  qtyBaseUnit: string
  netAmount: string
  unitCostFifo: string
}
interface RawInvoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  customerId: string
  subtotal: string
  invoiceDiscountAmount: string
  outputVatAmount: string
  totalAmount: string
  postingStatus: 'POSTED' | 'VOIDED'
  lines: RawInvoiceLine[]
}
interface RawReturnLine {
  salesInvoiceLineId: string
  qtyBaseUnit: string
}

/**
 * Loader untuk Retur Penjualan (Hari 23 FE), pola sama usePurchaseReturnLookups.ts.
 *
 * loadReturnableInvoice() menghitung SISA qty per baris faktur yang belum
 * diretur -- backend (SalesReturnsService.create()) menghitung ini sendiri di
 * dalam transaction, tapi tidak mengekspos satu endpoint ringkas untuk FE.
 * Volume rendah (11-12 faktur/hari, retur lebih jarang lagi) jadi N+1 fetch
 * (satu GET /sales-returns/:id per retur yang sudah tercatat atas faktur ini)
 * aman dipakai di sini murni untuk PREVIEW/gerbang di layar -- backend tetap
 * jadi wasit terakhir lewat validasi di create() (CLAUDE.md §7 "Qty retur
 * tidak boleh melebihi qty faktur" ditahan DUA kali: di sini dan di backend).
 */
export function useSalesReturnLookups() {
  const api = useApi()

  async function loadCashAccountOptions(): Promise<CashAccountOption[]> {
    return api.get<CashAccountOption[]>('/chart-of-accounts/cash-accounts')
  }

  async function loadReturnableInvoice(invoiceId: string): Promise<ReturnableInvoice> {
    const invoice = await api.get<RawInvoice>(`/sales-invoices/${invoiceId}`)

    const alreadyReturnedByLine = new Map<string, number>()
    if (invoice.postingStatus !== 'VOIDED') {
      const existingReturns = await api.get<{ data: { id: string }[] }>('/sales-returns', {
        salesInvoiceId: invoiceId,
        limit: 200
      })
      for (const ret of existingReturns.data) {
        const detail = await api.get<{ lines: RawReturnLine[] }>(`/sales-returns/${ret.id}`)
        for (const line of detail.lines) {
          alreadyReturnedByLine.set(
            line.salesInvoiceLineId,
            (alreadyReturnedByLine.get(line.salesInvoiceLineId) ?? 0) + Number(line.qtyBaseUnit)
          )
        }
      }
    }

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      customerId: invoice.customerId,
      subtotal: Number(invoice.subtotal),
      invoiceDiscountAmount: Number(invoice.invoiceDiscountAmount),
      outputVatAmount: Number(invoice.outputVatAmount),
      totalAmount: Number(invoice.totalAmount),
      postingStatus: invoice.postingStatus,
      lines: invoice.lines.map((l) => {
        const qtyInput = Number(l.qtyInput)
        const qtyBaseUnit = Number(l.qtyBaseUnit)
        const factor = qtyInput > 0 ? qtyBaseUnit / qtyInput : 0
        const alreadyReturnedQtyBaseUnit = alreadyReturnedByLine.get(l.id) ?? 0
        const alreadyReturnedQtyInput = factor > 0 ? alreadyReturnedQtyBaseUnit / factor : 0
        const remainingQtyInput = Math.max(0, qtyInput - alreadyReturnedQtyInput)
        return {
          id: l.id,
          productId: l.productId,
          unitId: l.unitId,
          qtyInput,
          netAmount: Number(l.netAmount),
          unitCostFifo: Number(l.unitCostFifo),
          alreadyReturnedQtyInput,
          remainingQtyInput
        }
      })
    }
  }

  return { loadCashAccountOptions, loadReturnableInvoice }
}
