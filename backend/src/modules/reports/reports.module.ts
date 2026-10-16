import { Module } from '@nestjs/common';
import { AccountResolverModule } from '../../core/account-resolver/account-resolver.module';
import { ExportModule } from '../../core/export/export.module';
import { StockRecorderModule } from '../../core/stock-recorder/stock-recorder.module';
import { PaymentsModule } from '../payments/payments.module';
import { SettingsModule } from '../settings/settings.module';
import { CashDailyReportService } from './cash-daily-report.service';
import { DashboardService } from './dashboard.service';
import { DocumentContinuityService } from './document-continuity.service';
import { OperationalExpenseReportService } from './operational-expense-report.service';
import { PayablesReportService } from './payables-report.service';
import { ReceivablesReportService } from './receivables-report.service';
import { ReportsController } from './reports.controller';
import { SalesReportsService } from './sales-reports.service';
import { StockReportsService } from './stock-reports.service';

// Hari 30 — PaymentsModule (getOutstandingInvoicesForReport(), Laporan
// Hutang) dan SettingsModule (aging_bucket_days) ditambahkan. Tidak ada
// import ReceivablesModule: kolom "Akun Piutang" di Laporan Piutang dibaca
// lewat satu query batch (loadArAccountCodes()) yang meniru rumus
// ArAccountResolverService.resolve(), bukan memanggilnya N kali per pelanggan.
// Hari 31 — AccountResolverModule ditambahkan untuk CashDailyReportService
// (validasi `accountId` filter WAJIB akun kas aktif, pola sama Payment/Retur
// Pembelian, bukan pengecekan ad-hoc baru).
// Hari 32 — StockRecorderModule ditambahkan supaya StockReportsService bisa
// memanggil reconcile() (Hari 10, belum pernah punya endpoint pemanggil).
@Module({
  imports: [
    ExportModule,
    PaymentsModule,
    SettingsModule,
    AccountResolverModule,
    StockRecorderModule,
  ],
  controllers: [ReportsController],
  providers: [
    DocumentContinuityService,
    StockReportsService,
    SalesReportsService,
    ReceivablesReportService,
    PayablesReportService,
    CashDailyReportService,
    OperationalExpenseReportService,
    DashboardService,
  ],
})
export class ReportsModule {}
