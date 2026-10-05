import { Module } from '@nestjs/common';
import { JournalPosterModule } from '../../core/journal-poster/journal-poster.module';
import { JournalManualController } from './journal-manual.controller';
import { JournalManualService } from './journal-manual.service';

@Module({
  imports: [JournalPosterModule],
  controllers: [JournalManualController],
  providers: [JournalManualService],
})
export class JournalManualModule {}
