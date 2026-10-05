// Port murni dari CLAUDE.md §4 "Faktur Penjualan" — dipakai FE untuk preview
// LIVE subtotal/PPN/total SEBELUM submit. Server tetap satu-satunya sumber
// kebenaran (POST /sales-invoices akan menghitung ulang persis rumus yang
// sama); util ini murni cermin baca, bukan pengganti.
//
// Diskon penjualan DI-DROP (docs/RENCANA_REVISI_TESTING_KLIEN.md §2B A1,
// paket R5 FP3) — harga sudah diketik bebas per pelanggan (CLAUDE.md §3),
// jadi diskon jadi jalur kedua untuk hal yang sama. subtotal = jumlah baris
// APA ADANYA, tidak ada pengurangan diskon sama sekali. `discountPercent`/
// `discountAmount` TETAP ada di tipe input (bentuk fungsi dipertahankan
// supaya tidak ada pemanggil yang pecah) tapi SENGAJA tidak pernah dibaca —
// backend sendiri sudah menolak nilai != 0 di DTO (paket R5 BE).
//
// SENGAJA lebih sederhana dari purchaseInvoiceCalc.ts:
// - Tidak ada alokasi pro-rata diskon faktur ke tiap baris (itu kebutuhan
//   khusus pembelian supaya tiap lot punya harga pokok sendiri, §4 "Faktur
//   Pembelian" langkah 5-6 — penjualan tidak membentuk lot).
// - PPN dihitung SEKALI di header atas subtotal, digerbangi HANYA
//   company_is_pkp — BUKAN per-baris productIsBkp && supplierIsPkp seperti
//   pembelian (CLAUDE.md §2.11: "Syarat PPN keluaran hanya company_is_pkp.
//   Status PKP pelanggan TIDAK menentukan apakah PPN dipungut"). Jangan
//   salin gerbang PPN masukan dari purchaseInvoiceCalc.ts.
// - Tidak ada konsep bonus (itu khusus pembelian dari supplier).
//
// Sen integer, sama seperti backend, supaya tidak ada drift pembulatan float
// antara preview dan yang sungguhan tersimpan.

export interface SalesInvoiceCalcLineInput {
  qtyInput: number
  unitPrice: number | undefined
  discountPercent: number | undefined
  discountAmount: number | undefined
}

export interface SalesInvoiceCalcLineResult {
  grossAmount: number
  lineDiscountAmount: number
  netAmount: number
}

export interface SalesInvoiceCalcInput {
  lines: SalesInvoiceCalcLineInput[]
  invoiceDiscountPercent: number | undefined
  invoiceDiscountAmount: number | undefined
  companyIsPkp: boolean
  taxRatePercent: number | null
}

export interface SalesInvoiceCalcResult {
  lines: SalesInvoiceCalcLineResult[]
  subtotal: number
  lineDiscountTotal: number
  invoiceDiscountAmount: number
  outputVatAmount: number
  totalAmount: number
}

export function calculateSalesInvoice(input: SalesInvoiceCalcInput): SalesInvoiceCalcResult {
  const grossCents: number[] = []
  let subtotalCents = 0

  for (const line of input.lines) {
    const unitPrice = line.unitPrice ?? 0
    const grossC = toCents(line.qtyInput * unitPrice)
    grossCents.push(grossC)
    subtotalCents += grossC
  }

  const rate = input.taxRatePercent
  const outputVatCents = (!input.companyIsPkp || !rate)
    ? 0
    : Math.round((subtotalCents * rate) / 100)

  const totalAmountCents = subtotalCents + outputVatCents

  return {
    lines: input.lines.map((_, i) => ({
      grossAmount: fromCents(grossCents[i]),
      lineDiscountAmount: 0,
      netAmount: fromCents(grossCents[i])
    })),
    subtotal: fromCents(subtotalCents),
    lineDiscountTotal: 0,
    invoiceDiscountAmount: 0,
    outputVatAmount: fromCents(outputVatCents),
    totalAmount: fromCents(totalAmountCents)
  }
}

function toCents(value: number): number {
  return Math.round(value * 100)
}

function fromCents(cents: number): number {
  return cents / 100
}
