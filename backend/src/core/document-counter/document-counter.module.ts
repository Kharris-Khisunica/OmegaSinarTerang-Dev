import { Module } from '@nestjs/common';
import { DocumentCounterService } from './document-counter.service';

@Module({
  providers: [DocumentCounterService],
  exports: [DocumentCounterService],
})
export class DocumentCounterModule {}
