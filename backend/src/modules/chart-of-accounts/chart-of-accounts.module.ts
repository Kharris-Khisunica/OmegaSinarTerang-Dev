import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChartOfAccountsController } from './chart-of-accounts.controller';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { ChartOfAccount } from './entities/chart-of-account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChartOfAccount])],
  controllers: [ChartOfAccountsController],
  providers: [ChartOfAccountsService],
})
export class ChartOfAccountsModule {}
