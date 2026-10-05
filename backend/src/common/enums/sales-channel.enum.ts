// CLAUDE.md §1 "Dua saluran penjualan" — field EKSPLISIT di faktur penjualan
// (Hari 21), TIDAK PERNAH disimpulkan dari ada/tidaknya surat jalan. Dipakai
// hari ini oleh SalesOrdersService.assertChannelSalesOrderRequirement()
// meski sales_invoices belum ada tabelnya (Hari 20/21) — enum ini hidup di
// common supaya kedua modul memakai nilai yang sama persis, bukan
// didefinisikan ulang di masing-masing.
export enum SalesChannel {
  PENGIRIMAN = 'PENGIRIMAN',
  TOKO = 'TOKO',
}
