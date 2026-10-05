import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Worker } from './entities/worker.entity';
import { WorkersController } from './workers.controller';
import { WorkersService } from './workers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Worker])],
  controllers: [WorkersController],
  providers: [WorkersService],
  exports: [TypeOrmModule],
})
export class WorkersModule {}
