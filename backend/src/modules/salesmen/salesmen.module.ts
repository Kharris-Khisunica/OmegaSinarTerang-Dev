import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Salesman } from './entities/salesman.entity';
import { SalesmenController } from './salesmen.controller';
import { SalesmenService } from './salesmen.service';

@Module({
  imports: [TypeOrmModule.forFeature([Salesman])],
  controllers: [SalesmenController],
  providers: [SalesmenService],
  exports: [TypeOrmModule],
})
export class SalesmenModule {}
