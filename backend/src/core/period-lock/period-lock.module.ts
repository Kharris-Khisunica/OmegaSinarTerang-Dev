import { Module } from '@nestjs/common';
import { PeriodLockValidatorService } from './period-lock-validator.service';

@Module({
  providers: [PeriodLockValidatorService],
  exports: [PeriodLockValidatorService],
})
export class PeriodLockModule {}
