import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountResolverModule } from '../../core/account-resolver/account-resolver.module';
import { DocumentCounterModule } from '../../core/document-counter/document-counter.module';
import { JournalPosterModule } from '../../core/journal-poster/journal-poster.module';
import { PrintLockModule } from '../../core/print-lock/print-lock.module';
import { StockRecorderModule } from '../../core/stock-recorder/stock-recorder.module';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { PurchaseReturnLine } from './entities/purchase-return-line.entity';
import { PurchaseReturn } from './entities/purchase-return.entity';
import { PurchaseReturnsController } from './purchase-returns.controller';
import { PurchaseReturnsService } from './purchase-returns.service';

// TIDAK import VoidModule — VOID untuk RB sengaja belum dibangun hari ini
// (pola sama warehouse_mutations Hari 13, lihat catatan di
// purchase-return.entity.ts).
@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseReturn, PurchaseReturnLine, Warehouse]),
    DocumentCounterModule,
    StockRecorderModule,
    JournalPosterModule,
    AccountResolverModule,
    PrintLockModule,
  ],
  controllers: [PurchaseReturnsController],
  providers: [PurchaseReturnsService],
})
export class PurchaseReturnsModule {}
