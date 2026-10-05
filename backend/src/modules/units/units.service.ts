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
import { CreateUnitDto } from './dto/create-unit.dto';
import { UnitQueryDto } from './dto/unit-query.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { Unit } from './entities/unit.entity';

const SORTABLE_COLUMNS = ['code', 'name', 'isActive', 'createdAt'] as const;

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitsRepository: Repository<Unit>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: UnitQueryDto): Promise<PaginatedResult<Unit>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'name',
    );
    const sortDir = resolveSortDir(query.sortDir);

    const qb = this.unitsRepository.createQueryBuilder('unit');

    if (query.search) {
      qb.andWhere('(unit.code ILIKE :search OR unit.name ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy(`unit.${sortColumn}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string): Promise<Unit> {
    const unit = await this.unitsRepository.findOne({ where: { id } });
    if (!unit) {
      throw new NotFoundException('Satuan tidak ditemukan.');
    }
    return unit;
  }

  async create(dto: CreateUnitDto): Promise<Unit> {
    const code =
      dto.code ??
      (await generateSequenceCode(this.dataSource, 'unit_code_seq', 'SAT'));
    const unit = this.unitsRepository.create({
      code,
      name: toUpperTrim(dto.name),
      isActive: dto.isActive ?? true,
    });
    return this.unitsRepository.save(unit);
  }

  async update(id: string, dto: UpdateUnitDto): Promise<Unit> {
    await this.findOne(id);
    await this.unitsRepository.update(id, {
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.name !== undefined && { name: toUpperTrim(dto.name) }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });
    return this.findOne(id);
  }
}
