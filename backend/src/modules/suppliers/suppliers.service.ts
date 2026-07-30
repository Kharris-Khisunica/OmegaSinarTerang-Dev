import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  buildPaginatedResult,
  PaginatedResult,
  resolveSortColumn,
  resolveSortDir,
} from '../../common/pagination';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { SupplierQueryDto } from './dto/supplier-query.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from './entities/supplier.entity';

const SORTABLE_COLUMNS = [
  'displayCode',
  'name',
  'isActive',
  'createdAt',
] as const;

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: SupplierQueryDto): Promise<PaginatedResult<Supplier>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'displayCode',
    );
    const sortDir = resolveSortDir(query.sortDir);

    const qb = this.suppliersRepository.createQueryBuilder('supplier');

    if (query.search) {
      qb.andWhere(
        '(supplier.displayCode ILIKE :search OR supplier.name ILIKE :search OR supplier.contactPhone ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy(`supplier.${sortColumn}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string): Promise<Supplier> {
    const supplier = await this.suppliersRepository.findOne({ where: { id } });
    if (!supplier) {
      throw new NotFoundException('Supplier tidak ditemukan.');
    }
    return supplier;
  }

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    const displayCode = await this.nextDisplayCode();
    const supplier = this.suppliersRepository.create({
      displayCode,
      name: dto.name,
      contactPhone: dto.contactPhone ?? null,
      contactAddress: dto.contactAddress ?? null,
      isPkp: dto.isPkp ?? false,
      isActive: dto.isActive ?? true,
    });
    return this.suppliersRepository.save(supplier);
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    await this.findOne(id);
    await this.suppliersRepository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
      ...(dto.contactAddress !== undefined && {
        contactAddress: dto.contactAddress,
      }),
      ...(dto.isPkp !== undefined && { isPkp: dto.isPkp }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });
    return this.findOne(id);
  }

  private async nextDisplayCode(): Promise<string> {
    const rows: { nextval: string }[] = await this.dataSource.query(
      `SELECT nextval('supplier_code_seq') AS nextval`,
    );
    const sequenceValue = Number(rows[0].nextval);
    return `SUP-${String(sequenceValue).padStart(3, '0')}`;
  }
}
