import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentCounterModule } from '../../core/document-counter/document-counter.module';
import { PeriodLockModule } from '../../core/period-lock/period-lock.module';
import { StepUpModule } from '../../core/step-up/step-up.module';
import { StockRecorderModule } from '../../core/stock-recorder/stock-recorder.module';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { WarehouseMutationLine } from './entities/warehouse-mutation-line.entity';
import { WarehouseMutation } from './entities/warehouse-mutation.entity';
import { WarehouseMutationsController } from './warehouse-mutations.controller';
import { WarehouseMutationsService } from './warehouse-mutations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Warehouse,
      WarehouseMutation,
      WarehouseMutationLine,
    ]),
    StockRecorderModule,
    DocumentCounterModule,
    PeriodLockModule,
    StepUpModule,
  ],
  controllers: [WarehouseMutationsController],
  providers: [WarehouseMutationsService],
})
export class WarehouseMutationsModule {}
