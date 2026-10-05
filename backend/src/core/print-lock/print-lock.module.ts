import { Module } from '@nestjs/common';
import { StepUpModule } from '../step-up/step-up.module';
import { PrintLockService } from './print-lock.service';

@Module({
  imports: [StepUpModule],
  providers: [PrintLockService],
  exports: [PrintLockService],
})
export class PrintLockModule {}
