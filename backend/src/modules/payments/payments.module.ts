import { Module } from '@nestjs/common';
import { AccountResolverModule } from '../../core/account-resolver/account-resolver.module';
import { DocumentCounterModule } from '../../core/document-counter/document-counter.module';
import { JournalPosterModule } from '../../core/journal-poster/journal-poster.module';
import { PrintLockModule } from '../../core/print-lock/print-lock.module';
import { ReceivablesModule } from '../../core/receivables/receivables.module';
import { StepUpModule } from '../../core/step-up/step-up.module';
import { VoidModule } from '../../core/void/void.module';
import { PaymentBatchVoidHook } from './payment-batch-void.hook';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

// Tidak ada TypeOrmModule.forFeature() — PaymentsService hanya memakai
// @InjectDataSource() (dataSource.manager.findOne()/save()/create() + raw
// query()), tidak ada @InjectRepository() di mana pun (pola sama
// AccountResolverModule, yang juga tanpa forFeature). Entity
// Payment/PaymentBatch/PaymentMethod tetap ter-load otomatis lewat glob
// TypeOrmModule.forRootAsync di app.module.ts.
//
// Hari 27: DocumentCounterModule (batch_number PAY) + JournalPosterModule
// (jurnal batch) + ReceivablesModule (ArAccountResolverService, akun piutang
// per pelanggan) + StepUpModule (CASH_OUTFLOW + VOID_DOCUMENT) + VoidModule
// (VOID batch) ditambahkan sekarang — Hari 26 tidak membutuhkannya karena
// previewAllocation() murni baca. PrintLockModule ditambahkan susulan (Hari
// 27 FE) begitu payment_batches ikut kunci cetak (PRINT_LOCK_TABLES).
@Module({
  imports: [
    AccountResolverModule,
    DocumentCounterModule,
    JournalPosterModule,
    PrintLockModule,
    ReceivablesModule,
    StepUpModule,
    VoidModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentBatchVoidHook],
  // PaymentsService diekspor Hari 30 — PayablesReportService (modul reports)
  // memakai ulang getOutstandingInvoicesForReport(), bukan menulis query
  // outstanding tandingan.
  exports: [PaymentsService],
})
export class PaymentsModule {}
