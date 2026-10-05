import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentCounterModule } from '../../core/document-counter/document-counter.module';
import { PrintLockModule } from '../../core/print-lock/print-lock.module';
import { SalesInvoice } from '../sales-invoices/entities/sales-invoice.entity';
import { Salesman } from '../salesmen/entities/salesman.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { DeliveryOrderLine } from './entities/delivery-order-line.entity';
import { DeliveryOrder } from './entities/delivery-order.entity';
import { DeliveryOrdersController } from './delivery-orders.controller';
import { DeliveryOrdersService } from './delivery-orders.service';

// TIDAK import StockRecorderModule/JournalPosterModule — surat jalan tidak
// menyentuh stok maupun jurnal sama sekali (CLAUDE.md §3, stok sudah
// berkurang saat faktur diposting). TIDAK import VoidModule/StepUpModule —
// VOID untuk SJ sengaja belum dibangun hari ini (pola sama RJ/RB).
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryOrder,
      DeliveryOrderLine,
      Salesman,
      Vehicle,
      SalesInvoice,
    ]),
    DocumentCounterModule,
    PrintLockModule,
  ],
  controllers: [DeliveryOrdersController],
  providers: [DeliveryOrdersService],
})
export class DeliveryOrdersModule {}
