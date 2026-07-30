import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  buildPaginatedResult,
  PaginatedResult,
  resolveSortColumn,
  resolveSortDir,
} from '../../common/pagination';
import { CreateSalesmanDto } from './dto/create-salesman.dto';
import { SalesmanQueryDto } from './dto/salesman-query.dto';
import { UpdateSalesmanDto } from './dto/update-salesman.dto';
import { Salesman } from './entities/salesman.entity';

const SORTABLE_COLUMNS = ['code', 'name', 'isActive', 'createdAt'] as const;

@Injectable()
export class SalesmenService {
  constructor(
    @InjectRepository(Salesman)
    private readonly salesmenRepository: Repository<Salesman>,
  ) {}

  async findAll(query: SalesmanQueryDto): Promise<PaginatedResult<Salesman>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'name',
    );
    const sortDir = resolveSortDir(query.sortDir);

    const qb = this.salesmenRepository.createQueryBuilder('salesman');

    if (query.search) {
      qb.andWhere(
        '(salesman.code ILIKE :search OR salesman.name ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy(`salesman.${sortColumn}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string): Promise<Salesman> {
    const salesman = await this.salesmenRepository.findOne({ where: { id } });
    if (!salesman) {
      throw new NotFoundException('Salesman tidak ditemukan.');
    }
    return salesman;
  }

  async create(dto: CreateSalesmanDto): Promise<Salesman> {
    const salesman = this.salesmenRepository.create({
      code: dto.code,
      name: dto.name,
      isActive: dto.isActive ?? true,
    });
    return this.salesmenRepository.save(salesman);
  }

  async update(id: string, dto: UpdateSalesmanDto): Promise<Salesman> {
    await this.findOne(id);
    await this.salesmenRepository.update(id, {
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });
    return this.findOne(id);
  }
}
