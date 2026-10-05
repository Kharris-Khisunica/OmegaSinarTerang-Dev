import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountResolverModule } from '../../core/account-resolver/account-resolver.module';
import { DocumentCounterModule } from '../../core/document-counter/document-counter.module';
import { DocumentReviseModule } from '../../core/document-revise/document-revise.module';
import { JournalPosterModule } from '../../core/journal-poster/journal-poster.module';
import { PrintLockModule } from '../../core/print-lock/print-lock.module';
import { StockRecorderModule } from '../../core/stock-recorder/stock-recorder.module';
import { TaxRatesModule } from '../../core/tax-rates/tax-rates.module';
import { VoidModule } from '../../core/void/void.module';
import { GoodsReceiptLine } from './entities/goods-receipt-line.entity';
import { GoodsReceipt } from './entities/goods-receipt.entity';
import { PurchaseInvoiceLine } from './entities/purchase-invoice-line.entity';
import { PurchaseInvoice } from './entities/purchase-invoice.entity';
import { PurchaseInvoiceVoidHook } from './purchase-invoice-void.hook';
import { PurchaseInvoicesController } from './purchase-invoices.controller';
import { PurchaseInvoicesService } from './purchase-invoices.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseInvoice,
      PurchaseInvoiceLine,
      GoodsReceipt,
      GoodsReceiptLine,
    ]),
    DocumentCounterModule,
    StockRecorderModule,
    JournalPosterModule,
    AccountResolverModule,
    TaxRatesModule,
    PrintLockModule,
    VoidModule,
    DocumentReviseModule,
  ],
  controllers: [PurchaseInvoicesController],
  providers: [PurchaseInvoicesService, PurchaseInvoiceVoidHook],
})
export class PurchaseInvoicesModule {}
