import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { generateSequenceCode } from '../../common/generate-sequence-code';
import { toUpperTrim } from '../../common/normalize-text';
import {
  buildPaginatedResult,
  PaginatedResult,
  resolveSortColumn,
  resolveSortDir,
} from '../../common/pagination';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { WorkerQueryDto } from './dto/worker-query.dto';
import { Worker } from './entities/worker.entity';

const SORTABLE_COLUMNS = ['code', 'name', 'isActive', 'createdAt'] as const;

@Injectable()
export class WorkersService {
  constructor(
    @InjectRepository(Worker)
    private readonly workersRepository: Repository<Worker>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: WorkerQueryDto): Promise<PaginatedResult<Worker>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'name',
    );
    const sortDir = resolveSortDir(query.sortDir);

    const qb = this.workersRepository.createQueryBuilder('worker');

    if (query.search) {
      qb.andWhere('(worker.code ILIKE :search OR worker.name ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy(`worker.${sortColumn}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string): Promise<Worker> {
    const worker = await this.workersRepository.findOne({ where: { id } });
    if (!worker) {
      throw new NotFoundException('Pekerja tidak ditemukan.');
    }
    return worker;
  }

  async create(dto: CreateWorkerDto): Promise<Worker> {
    const code =
      dto.code ??
      (await generateSequenceCode(this.dataSource, 'worker_code_seq', 'PKR'));
    const worker = this.workersRepository.create({
      code,
      name: toUpperTrim(dto.name),
      isActive: dto.isActive ?? true,
    });
    return this.workersRepository.save(worker);
  }

  async update(id: string, dto: UpdateWorkerDto): Promise<Worker> {
    await this.findOne(id);
    await this.workersRepository.update(id, {
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.name !== undefined && { name: toUpperTrim(dto.name) }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });
    return this.findOne(id);
  }
}
