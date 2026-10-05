import { Module } from '@nestjs/common';
import { AccountResolverModule } from '../../core/account-resolver/account-resolver.module';
import { DocumentCounterModule } from '../../core/document-counter/document-counter.module';
import { JournalPosterModule } from '../../core/journal-poster/journal-poster.module';
import { StepUpModule } from '../../core/step-up/step-up.module';
import { VoidModule } from '../../core/void/void.module';
import { CashTransferVoidHook } from './cash-transfer-void.hook';
import { CashTransfersController } from './cash-transfers.controller';
import { CashTransfersService } from './cash-transfers.service';

// Tidak ada PrintLockModule (cash_transfers tidak ikut kunci cetak §2.16) —
// beda dari PaymentsModule. Tidak ada ReceivablesModule (tidak menyentuh
// piutang/hutang sama sekali, cuma dua akun kas).
@Module({
  imports: [
    AccountResolverModule,
    DocumentCounterModule,
    JournalPosterModule,
    StepUpModule,
    VoidModule,
  ],
  controllers: [CashTransfersController],
  providers: [CashTransfersService, CashTransferVoidHook],
})
export class CashTransfersModule {}
