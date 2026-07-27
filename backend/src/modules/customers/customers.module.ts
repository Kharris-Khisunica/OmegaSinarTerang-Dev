import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChartOfAccount } from '../chart-of-accounts/entities/chart-of-account.entity';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, ChartOfAccount])],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
