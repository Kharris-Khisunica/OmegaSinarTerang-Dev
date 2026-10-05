import { Module } from '@nestjs/common';
import { JournalPosterModule } from '../journal-poster/journal-poster.module';
import { PeriodLockModule } from '../period-lock/period-lock.module';
import { StockRecorderModule } from '../stock-recorder/stock-recorder.module';
import { DocumentReviseService } from './document-revise.service';

@Module({
  imports: [JournalPosterModule, StockRecorderModule, PeriodLockModule],
  providers: [DocumentReviseService],
  exports: [DocumentReviseService],
})
export class DocumentReviseModule {}
