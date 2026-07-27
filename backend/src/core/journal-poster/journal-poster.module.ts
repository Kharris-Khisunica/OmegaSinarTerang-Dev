import { Module } from '@nestjs/common';
import { DocumentCounterModule } from '../document-counter/document-counter.module';
import { JournalPosterService } from './journal-poster.service';

@Module({
  imports: [DocumentCounterModule],
  providers: [JournalPosterService],
  exports: [JournalPosterService],
})
export class JournalPosterModule {}
