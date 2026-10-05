import { Module } from '@nestjs/common';
import { JournalPosterModule } from '../journal-poster/journal-poster.module';
import { StockRecorderModule } from '../stock-recorder/stock-recorder.module';
import { VoidEngineService } from './void.service';

@Module({
  imports: [JournalPosterModule, StockRecorderModule],
  providers: [VoidEngineService],
  exports: [VoidEngineService],
})
export class VoidModule {}
