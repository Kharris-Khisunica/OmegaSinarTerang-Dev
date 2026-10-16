import { Module } from '@nestjs/common';
import { AccountResolverModule } from '../../core/account-resolver/account-resolver.module';
import { JournalPosterModule } from '../../core/journal-poster/journal-poster.module';
import { PeriodLockModule } from '../../core/period-lock/period-lock.module';
import { ReceivablesModule } from '../../core/receivables/receivables.module';
import { StockRecorderModule } from '../../core/stock-recorder/stock-recorder.module';
import { OpeningBalanceController } from './opening-balance.controller';
import { OpeningBalanceImportService } from './opening-balance-import.service';
import { OpeningBalanceService } from './opening-balance.service';

@Module({
  imports: [
    StockRecorderModule,
    JournalPosterModule,
    ReceivablesModule,
    PeriodLockModule,
    AccountResolverModule,
  ],
  controllers: [OpeningBalanceController],
  providers: [OpeningBalanceService, OpeningBalanceImportService],
})
export class OpeningBalanceModule {}
