import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountResolverModule } from '../../core/account-resolver/account-resolver.module';
import { DocumentCounterModule } from '../../core/document-counter/document-counter.module';
import { DocumentReviseModule } from '../../core/document-revise/document-revise.module';
import { JournalPosterModule } from '../../core/journal-poster/journal-poster.module';
import { PrintLockModule } from '../../core/print-lock/print-lock.module';
import { ReceivablesModule } from '../../core/receivables/receivables.module';
import { StepUpModule } from '../../core/step-up/step-up.module';
import { StockRecorderModule } from '../../core/stock-recorder/stock-recorder.module';
import { TaxRatesModule } from '../../core/tax-rates/tax-rates.module';
import { VoidModule } from '../../core/void/void.module';
import { SalesOrdersModule } from '../sales-orders/sales-orders.module';
import { SalesInvoiceLine } from './entities/sales-invoice-line.entity';
import { SalesInvoice } from './entities/sales-invoice.entity';
import { PriceSuggestionController } from './price-suggestion.controller';
import { PriceSuggestionService } from './price-suggestion.service';
import { SalesInvoiceVoidHook } from './sales-invoice-void.hook';
import { SalesInvoicesController } from './sales-invoices.controller';
import { SalesInvoicesService } from './sales-invoices.service';

// Hari 21: POST /sales-invoices ditambah. Hari 22: GET (list+detail),
// edit/VOID/kunci cetak menyusul — PrintLockModule/VoidModule sekarang
// diimport, SalesInvoiceVoidHook self-register ke VoidEngineService.
@Module({
  imports: [
    TypeOrmModule.forFeature([SalesInvoice, SalesInvoiceLine]),
    DocumentCounterModule,
    StockRecorderModule,
    JournalPosterModule,
    AccountResolverModule,
    ReceivablesModule,
    TaxRatesModule,
    StepUpModule,
    SalesOrdersModule,
    PrintLockModule,
    VoidModule,
    DocumentReviseModule,
  ],
  controllers: [PriceSuggestionController, SalesInvoicesController],
  providers: [
    PriceSuggestionService,
    SalesInvoicesService,
    SalesInvoiceVoidHook,
  ],
})
export class SalesInvoicesModule {}
