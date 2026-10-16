import { Module } from '@nestjs/common';
import { AccountResolverModule } from '../../core/account-resolver/account-resolver.module';
import { DocumentCounterModule } from '../../core/document-counter/document-counter.module';
import { JournalPosterModule } from '../../core/journal-poster/journal-poster.module';
import { StepUpModule } from '../../core/step-up/step-up.module';
import { VoidModule } from '../../core/void/void.module';
import { KasbonRepaymentVoidHook } from './kasbon-repayment-void.hook';
import { KasbonRepaymentsController } from './kasbon-repayments.controller';
import { KasbonRepaymentsService } from './kasbon-repayments.service';

// Pola sama CashTransfersModule — tanpa PrintLockModule (tidak ikut kunci
// cetak §2.16).
@Module({
  imports: [
    AccountResolverModule,
    DocumentCounterModule,
    JournalPosterModule,
    StepUpModule,
    VoidModule,
  ],
  controllers: [KasbonRepaymentsController],
  providers: [KasbonRepaymentsService, KasbonRepaymentVoidHook],
})
export class KasbonRepaymentsModule {}
