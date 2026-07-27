import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChartOfAccount } from './entities/chart-of-account.entity';

@Injectable()
export class ChartOfAccountsService {
  constructor(
    @InjectRepository(ChartOfAccount)
    private readonly chartOfAccountsRepository: Repository<ChartOfAccount>,
  ) {}

  findAll(): Promise<ChartOfAccount[]> {
    return this.chartOfAccountsRepository.find({ order: { code: 'ASC' } });
  }
}
