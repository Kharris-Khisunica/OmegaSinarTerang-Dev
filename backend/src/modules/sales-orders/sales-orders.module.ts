import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentCounterModule } from '../../core/document-counter/document-counter.module';
import { PeriodLockModule } from '../../core/period-lock/period-lock.module';
import { SalesOrderLine } from './entities/sales-order-line.entity';
import { SalesOrder } from './entities/sales-order.entity';
import { SalesOrdersController } from './sales-orders.controller';
import { SalesOrdersService } from './sales-orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalesOrder, SalesOrderLine]),
    DocumentCounterModule,
    PeriodLockModule,
  ],
  controllers: [SalesOrdersController],
  // exports: dipakai SalesInvoicesModule (Hari 21) untuk
  // assertChannelSalesOrderRequirement()/markConverted() tanpa perlu ubah
  // wiring modul ini lagi.
  providers: [SalesOrdersService],
  exports: [SalesOrdersService],
})
export class SalesOrdersModule {}
