import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountResolverModule } from '../../core/account-resolver/account-resolver.module';
import { DocumentCounterModule } from '../../core/document-counter/document-counter.module';
import { JournalPosterModule } from '../../core/journal-poster/journal-poster.module';
import { PrintLockModule } from '../../core/print-lock/print-lock.module';
import { StockRecorderModule } from '../../core/stock-recorder/stock-recorder.module';
import { DocumentReviseModule } from '../../core/document-revise/document-revise.module';
import { StepUpModule } from '../../core/step-up/step-up.module';
import { VoidModule } from '../../core/void/void.module';
import { PurchaseReturnVoidHook } from './purchase-return-void.hook';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { PurchaseReturnLine } from './entities/purchase-return-line.entity';
import { PurchaseReturn } from './entities/purchase-return.entity';
import { PurchaseReturnsController } from './purchase-returns.controller';
import { PurchaseReturnsService } from './purchase-returns.service';

// VoidModule/StepUpModule/DocumentReviseModule — VOID & revisi retur
// pembelian (need_fixing.md #19).
@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseReturn, PurchaseReturnLine, Warehouse]),
    DocumentCounterModule,
    StockRecorderModule,
    JournalPosterModule,
    AccountResolverModule,
    PrintLockModule,
    VoidModule,
    StepUpModule,
    DocumentReviseModule,
  ],
  controllers: [PurchaseReturnsController],
  providers: [PurchaseReturnsService, PurchaseReturnVoidHook],
})
export class PurchaseReturnsModule {}
