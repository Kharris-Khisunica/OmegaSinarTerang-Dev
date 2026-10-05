// Port murni dari backend/src/modules/purchase-invoices/purchase-invoices.service.ts
// (CLAUDE.md §4 "Faktur Pembelian") — dipakai FE untuk preview LIVE
// subtotal/PPN/diskon faktur/total SEBELUM submit. Server tetap satu-satunya
// sumber kebenaran (menghitung ulang persis rumus yang sama saat POST
// /purchase-invoices); util ini murni cermin baca, bukan pengganti.
//
// Sejak paket R7 (docs/RENCANA_REVISI_TESTING_KLIEN.md §2A, keputusan K5):
// TIDAK ADA lagi diskon baris dan TIDAK ADA lagi alokasi pro-rata diskon
// faktur ke baris (langkah 5-6 rumus lama DIHAPUS, bukan dinolkan) — diskon
// faktur (rupiah saja, mode persen di-drop) tidak pernah menyentuh
// harga_pokok/unit_cost, jadi baris jurnal "Diskon Pembelian" tersendiri di
// server (K6), bukan pengurang nilai baris di sini. Interface input TETAP
// menerima discountPercent/discountAmount per baris & invoiceDiscountPercent
// (kolom DTO backend dipertahankan untuk kompatibilitas pemanggil lama —
// lihat create-purchase-invoice(-line).dto.ts) tapi computeasinya diabaikan
// di sini, sama seperti backend menolaknya kalau != 0.
//
// Langkah harga_pokok/unit_cost per lot SENGAJA tidak diikutkan — bukan
// bagian footer/preview yang diminta (subtotal, diskon faktur, PPN masukan,
// TOTAL), dan unit_cost hasil hanya berarti sesudah StockRecorder jalan di
// server (pola sama "unit_cost read-only, muncul setelah tersimpan" di
// Mutasi Gudang Hari 13).
//
// Sen integer, sama seperti backend, supaya tidak ada drift pembulatan float
// antara preview dan yang sungguhan tersimpan.

export interface PurchaseInvoiceCalcLineInput {
  qtyInput: number
  unitPrice: number | undefined
  discountPercent: number | undefined
  discountAmount: number | undefined
  isBonus: boolean
  productIsBkp: boolean
}

export interface PurchaseInvoiceCalcLineResult {
  grossAmount: number
  lineDiscountAmount: number
  netAmount: number
  lineFinalAmount: number
  inputVat: number
}

export interface PurchaseInvoiceCalcInput {
  lines: PurchaseInvoiceCalcLineInput[]
  invoiceDiscountPercent: number | undefined
  invoiceDiscountAmount: number | undefined
  supplierIsPkp: boolean
  /** null = tarif belum termuat (mis. GET /tax-rates/effective belum selesai) -> PPN preview 0, bukan diblokir. */
  taxRatePercent: number | null
}

export interface PurchaseInvoiceCalcResult {
  lines: PurchaseInvoiceCalcLineResult[]
  subtotal: number
  lineDiscountTotal: number
  invoiceDiscountAmount: number
  inputVatTotal: number
  totalAmount: number
}

export function calculatePurchaseInvoice(input: PurchaseInvoiceCalcInput): PurchaseInvoiceCalcResult {
  // Langkah 1: baris[i] -> subtotal. K5: TIDAK ADA diskon baris — input
  // discountPercent/discountAmount per baris diabaikan (backend menolaknya
  // kalau != 0, lihat komentar berkas di atas).
  const grossCents: number[] = []
  let subtotalCents = 0

  for (const line of input.lines) {
    if (line.isBonus) {
      grossCents.push(0)
      continue
    }
    const unitPrice = line.unitPrice ?? 0
    const grossC = toCents(line.qtyInput * unitPrice)
    grossCents.push(grossC)
    subtotalCents += grossC
  }

  // Diskon faktur RUPIAH SAJA (K5) — invoiceDiscountPercent diabaikan, TIDAK
  // dialokasikan ke baris, TIDAK menyentuh harga pokok.
  const invoiceDiscountCents = toCents(input.invoiceDiscountAmount ?? 0)

  // Langkah 2: PPN masukan dari baris[i] POLOS — tidak ada lagi baris_final
  // pasca-alokasi.
  const rate = input.taxRatePercent
  const inputVatCents = input.lines.map((line, i) => {
    const gatedOff = line.isBonus || !input.supplierIsPkp || !line.productIsBkp || !rate
    return gatedOff ? 0 : Math.round((grossCents[i] * rate) / 100)
  })

  const inputVatTotalCents = inputVatCents.reduce((sum, v) => sum + v, 0)
  // total_bayar = subtotal + Σ ppn_masukan - diskon_faktur
  const totalAmountCents = subtotalCents + inputVatTotalCents - invoiceDiscountCents

  return {
    lines: input.lines.map((_, i) => ({
      grossAmount: fromCents(grossCents[i]),
      lineDiscountAmount: 0,
      netAmount: fromCents(grossCents[i]),
      lineFinalAmount: fromCents(grossCents[i]),
      inputVat: fromCents(inputVatCents[i])
    })),
    subtotal: fromCents(subtotalCents),
    lineDiscountTotal: 0,
    invoiceDiscountAmount: fromCents(invoiceDiscountCents),
    inputVatTotal: fromCents(inputVatTotalCents),
    totalAmount: fromCents(totalAmountCents)
  }
}

function toCents(value: number): number {
  return Math.round(value * 100)
}

function fromCents(cents: number): number {
  return cents / 100
}
