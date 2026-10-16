import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';
import { ExportInterceptor } from '../../core/export/export.interceptor';
import { Roles } from '../auth/decorators/roles.decorator';
import { CashDailyReportQueryDto } from './dto/cash-daily-report-query.dto';
import { DocumentContinuityQueryDto } from './dto/document-continuity-query.dto';
import { OperationalExpenseReportQueryDto } from './dto/operational-expense-report-query.dto';
import { SalesReportQueryDto } from './dto/sales-report-query.dto';
import { CashDailyReportService } from './cash-daily-report.service';
import { DashboardService } from './dashboard.service';
import { DocumentContinuityService } from './document-continuity.service';
import { OperationalExpenseReportService } from './operational-expense-report.service';
import { PayablesReportService } from './payables-report.service';
import { ReceivablesReportService } from './receivables-report.service';
import { SalesReportsService } from './sales-reports.service';
import { StockReportsService } from './stock-reports.service';

// Read-only. Tidak ada @Roles() di level class dengan sengaja — Laporan
// terbuka untuk semua role login (CLAUDE.md §5: "Laporan | MASTER ✅ |
// SUPERVISOR ✅ | OPERATOR ✅ (kecuali COA)"), pola sama
// JournalEntriesController.
//
// PENGECUALIAN: `stock-opname` (di bawah) PUNYA @Roles(MASTER,SUPERVISOR)
// method-level — paket R11 poin L1, keputusan kerja user 20 Sep 2026 (BELUM
// dikonfirmasi ulang ke klien, pola sama Payment §2.12/Biaya Operasional §3)
// supaya operator tidak bisa membaca angka fisik sebelum stok opname dicek
// supervisor. Method-level @Roles MENIMPA absennya class-level (RolesGuard
// pakai getAllAndOverride, pola sama ChartOfAccountsController) — laporan
// lain di controller ini TETAP terbuka semua role, JANGAN dianggap keliru
// dan dicabut tanpa memeriksa §5 CLAUDE.md dulu.
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly documentContinuityService: DocumentContinuityService,
    private readonly stockReportsService: StockReportsService,
    private readonly salesReportsService: SalesReportsService,
    private readonly receivablesReportService: ReceivablesReportService,
    private readonly payablesReportService: PayablesReportService,
    private readonly cashDailyReportService: CashDailyReportService,
    private readonly operationalExpenseReportService: OperationalExpenseReportService,
    private readonly dashboardService: DashboardService,
  ) {}

  // need_fixing.md #9 — ringkasan beranda. MASTER+OPERATOR (Supervisor tidak
  // punya dashboard, CLAUDE.md §5); tanpa ExportInterceptor.
  @Roles(Role.MASTER, Role.OPERATOR)
  @Get('dashboard-summary')
  getDashboardSummary() {
    return this.dashboardService.getSummary();
  }

  // ?format=xlsx|pdf ditangani ExportInterceptor secara transparan — tanpa
  // ?format, respons JSON biasa {rows, columns, meta, summary} diteruskan
  // apa adanya. PDF laporan di-un-cut 05 Sep 2026 (CLAUDE.md §8) — FE
  // sekarang menawarkan kedua tombol (Excel + PDF, A4) lewat <ExportButton>.
  @Get('document-continuity')
  @UseInterceptors(ExportInterceptor)
  getDocumentContinuity(@Query() query: DocumentContinuityQueryDto) {
    return this.documentContinuityService.getContinuity(
      query.type,
      query.year,
      query.month,
    );
  }

  // Hari 29 (CLAUDE.md §3 "Gudang") — snapshot stok per produk: gudang
  // STORE, BAD_STOCK, dan Total. Tidak ada filter periode: ini snapshot
  // saat ini, bukan laporan historis.
  @Get('stock')
  @UseInterceptors(ExportInterceptor)
  getStockBalanceReport() {
    return this.stockReportsService.getStockBalanceReport();
  }

  // Hari 29 — pivot Nama Barang x Pelanggan, sumber warehouse_mutations
  // (BUKAN stock_movements — mutasi titipan sengaja tidak membuat movement).
  @Get('titipan')
  @UseInterceptors(ExportInterceptor)
  getTitipanReport() {
    return this.stockReportsService.getTitipanPivotReport();
  }

  // Hari 29 poin 3, ditarik maju dari Hari 32 — worksheet baca-saja: qty
  // sistem gudang STORE + daftar titipan sebagai penjelas selisih fisik.
  // Input angka fisik & hitungan selisih dilakukan di FE, tidak disimpan.
  // R11/L1 — dibatasi MASTER+SUPERVISOR (lihat komentar kepala controller).
  @Roles(Role.MASTER, Role.SUPERVISOR)
  @Get('stock-opname')
  @UseInterceptors(ExportInterceptor)
  getStockOpnameWorksheet() {
    return this.stockReportsService.getStockOpnameWorksheet();
  }

  // Hari 30 (CLAUDE.md §0, un-postponed 03 Sep 2026 atas instruksi user) —
  // per periode + groupBy Pelanggan/Salesman/Detail-per-faktur, TANPA komisi.
  // R11/L2 (20 Sep 2026) — `salesmanId` opsional dipakai bersama
  // groupBy=INVOICE untuk menyaring rincian faktur milik satu salesman;
  // diabaikan untuk groupBy CUSTOMER/SALESMAN (keduanya sudah rekap).
  @Get('sales')
  @UseInterceptors(ExportInterceptor)
  getSalesReport(@Query() query: SalesReportQueryDto) {
    return this.salesReportsService.getSalesReport(
      query.dateFrom,
      query.dateTo,
      query.groupBy,
      query.salesmanId,
    );
  }

  // Hari 30 — umur piutang, saldo GL-based (journal_entry_lines.customer_id),
  // BUKAN dihitung ulang dari sales_invoices. Snapshot saat ini, tanpa filter
  // periode (pola sama /reports/stock).
  @Get('receivables-aging')
  @UseInterceptors(ExportInterceptor)
  getReceivablesAging() {
    return this.receivablesReportService.getAgingReport();
  }

  // Hari 30 — umur hutang per supplier dari purchase_invoices+payments (lewat
  // PaymentsService, sama seperti layar Pembayaran), umur dari due_date.
  @Get('payables-aging')
  @UseInterceptors(ExportInterceptor)
  getPayablesAging() {
    return this.payablesReportService.getAgingReport();
  }

  // Hari 31 (CLAUDE.md §0 — "rekap kas harian" eksplisit TIDAK ditunda,
  // pengganti cash opname yang dipotong). `accountId` opsional -- kosong
  // berarti semua akun kas aktif sekaligus.
  @Get('cash-daily')
  @UseInterceptors(ExportInterceptor)
  getCashDailyReport(@Query() query: CashDailyReportQueryDto) {
    return this.cashDailyReportService.getDailyCashReport(
      query.date,
      query.accountId,
    );
  }

  // Hari 32 — pengecekan integritas ledger: SUM(stock_movements) vs
  // product_stock_balance (cache), lewat StockRecorderService.reconcile()
  // Hari 10. Selisih WAJIB 0 pada DB sehat. Kolom Titipan bersifat konteks
  // tambahan (baris STORE saja), bukan penjelas selisih ledger itu sendiri
  // — lihat komentar StockReportsService.getStockReconciliationReport().
  @Get('stock-reconciliation')
  @UseInterceptors(ExportInterceptor)
  getStockReconciliationReport() {
    return this.stockReportsService.getStockReconciliationReport();
  }

  // Hari 32A tugas 10 (CLAUDE.md §3 "Biaya Operasional") — rekap per akun
  // EXPENSE bulan berjalan. Kasbon (Piutang Karyawan) TIDAK ikut — bukan
  // biaya. FE membatasi tombol export hanya Excel (tanpa PDF, keputusan
  // klien) lewat <ExportButton :formats="['xlsx']">, bukan dibatasi di sini.
  @Get('operational-expenses')
  @UseInterceptors(ExportInterceptor)
  getOperationalExpenseReport(
    @Query() query: OperationalExpenseReportQueryDto,
  ) {
    return this.operationalExpenseReportService.getMonthlyReport(query.month);
  }
}
