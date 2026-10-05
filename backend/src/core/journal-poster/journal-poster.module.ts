import { Module } from '@nestjs/common';
import { DocumentCounterModule } from '../document-counter/document-counter.module';
import { PeriodLockModule } from '../period-lock/period-lock.module';
import { JournalPosterService } from './journal-poster.service';

@Module({
  imports: [DocumentCounterModule, PeriodLockModule],
  providers: [JournalPosterService],
  exports: [JournalPosterService],
})
export class JournalPosterModule {}
