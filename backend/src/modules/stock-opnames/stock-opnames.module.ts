import { Module } from '@nestjs/common';
import { AccountResolverModule } from '../../core/account-resolver/account-resolver.module';
import { DocumentCounterModule } from '../../core/document-counter/document-counter.module';
import { JournalPosterModule } from '../../core/journal-poster/journal-poster.module';
import { PeriodLockModule } from '../../core/period-lock/period-lock.module';
import { StockRecorderModule } from '../../core/stock-recorder/stock-recorder.module';
import { VoidModule } from '../../core/void/void.module';
import { StockOpnameVoidHook } from './stock-opname-void.hook';
import { StockOpnamesController } from './stock-opnames.controller';
import { StockOpnamesService } from './stock-opnames.service';

// need_fixing.md #25 — Stok Opname tersimpan + koreksi stok. Tanpa
// PrintLockModule (tidak ikut kunci cetak §2.16) & tanpa StepUpModule
// (posting/VOID dibatasi MASTER lewat @Roles, bukan step-up).
@Module({
  imports: [
    AccountResolverModule,
    DocumentCounterModule,
    JournalPosterModule,
    PeriodLockModule,
    StockRecorderModule,
    VoidModule,
  ],
  controllers: [StockOpnamesController],
  providers: [StockOpnamesService, StockOpnameVoidHook],
})
export class StockOpnamesModule {}
