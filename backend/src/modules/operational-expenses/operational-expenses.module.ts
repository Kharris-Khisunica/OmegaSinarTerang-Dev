import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountResolverModule } from '../../core/account-resolver/account-resolver.module';
import { DocumentCounterModule } from '../../core/document-counter/document-counter.module';
import { JournalPosterModule } from '../../core/journal-poster/journal-poster.module';
import { StepUpModule } from '../../core/step-up/step-up.module';
import { VoidModule } from '../../core/void/void.module';
import { ChartOfAccount } from '../chart-of-accounts/entities/chart-of-account.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { Worker } from '../workers/entities/worker.entity';
import { OperationalExpenseDocument } from './entities/operational-expense-document.entity';
import { OperationalExpenseLine } from './entities/operational-expense-line.entity';
import { OperationalExpenseVoidHook } from './operational-expense-void.hook';
import { OperationalExpensesController } from './operational-expenses.controller';
import { OperationalExpensesService } from './operational-expenses.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OperationalExpenseDocument,
      OperationalExpenseLine,
      ChartOfAccount,
      Worker,
      Vehicle,
    ]),
    DocumentCounterModule,
    JournalPosterModule,
    AccountResolverModule,
    StepUpModule,
    VoidModule,
  ],
  controllers: [OperationalExpensesController],
  providers: [OperationalExpensesService, OperationalExpenseVoidHook],
})
export class OperationalExpensesModule {}
