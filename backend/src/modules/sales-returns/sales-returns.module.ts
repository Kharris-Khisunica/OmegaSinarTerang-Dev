import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountResolverModule } from '../../core/account-resolver/account-resolver.module';
import { DocumentCounterModule } from '../../core/document-counter/document-counter.module';
import { JournalPosterModule } from '../../core/journal-poster/journal-poster.module';
import { PrintLockModule } from '../../core/print-lock/print-lock.module';
import { ReceivablesModule } from '../../core/receivables/receivables.module';
import { StockRecorderModule } from '../../core/stock-recorder/stock-recorder.module';
import { DocumentReviseModule } from '../../core/document-revise/document-revise.module';
import { StepUpModule } from '../../core/step-up/step-up.module';
import { VoidModule } from '../../core/void/void.module';
import { SalesReturnVoidHook } from './sales-return-void.hook';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { SalesReturnLine } from './entities/sales-return-line.entity';
import { SalesReturn } from './entities/sales-return.entity';
import { SalesReturnsController } from './sales-returns.controller';
import { SalesReturnsService } from './sales-returns.service';

// VoidModule/StepUpModule/DocumentReviseModule — VOID & revisi retur
// penjualan (need_fixing.md #19).
@Module({
  imports: [
    TypeOrmModule.forFeature([SalesReturn, SalesReturnLine, Warehouse]),
    DocumentCounterModule,
    StockRecorderModule,
    JournalPosterModule,
    AccountResolverModule,
    ReceivablesModule,
    PrintLockModule,
    VoidModule,
    StepUpModule,
    DocumentReviseModule,
  ],
  controllers: [SalesReturnsController],
  providers: [SalesReturnsService, SalesReturnVoidHook],
})
export class SalesReturnsModule {}
