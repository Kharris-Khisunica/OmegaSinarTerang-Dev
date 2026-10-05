import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountResolverModule } from '../../core/account-resolver/account-resolver.module';
import { DocumentCounterModule } from '../../core/document-counter/document-counter.module';
import { JournalPosterModule } from '../../core/journal-poster/journal-poster.module';
import { PrintLockModule } from '../../core/print-lock/print-lock.module';
import { ReceivablesModule } from '../../core/receivables/receivables.module';
import { StockRecorderModule } from '../../core/stock-recorder/stock-recorder.module';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { SalesReturnLine } from './entities/sales-return-line.entity';
import { SalesReturn } from './entities/sales-return.entity';
import { SalesReturnsController } from './sales-returns.controller';
import { SalesReturnsService } from './sales-returns.service';

// TIDAK import VoidModule — VOID untuk RJ sengaja belum dibangun hari ini
// (pola sama purchase_returns Hari 16). TIDAK import StepUpModule — tidak
// ada gerbang otorisasi untuk retur penjualan (CASH settlement hanya
// divalidasi AccountResolverService.assertAccountHasFlag(), bukan step-up).
@Module({
  imports: [
    TypeOrmModule.forFeature([SalesReturn, SalesReturnLine, Warehouse]),
    DocumentCounterModule,
    StockRecorderModule,
    JournalPosterModule,
    AccountResolverModule,
    ReceivablesModule,
    PrintLockModule,
  ],
  controllers: [SalesReturnsController],
  providers: [SalesReturnsService],
})
export class SalesReturnsModule {}
