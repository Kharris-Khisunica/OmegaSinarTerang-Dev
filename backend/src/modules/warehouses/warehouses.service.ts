import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, Repository } from 'typeorm';
import { toUpperTrim } from '../../common/normalize-text';
import {
  buildPaginatedResult,
  PaginatedResult,
  resolveSortColumn,
  resolveSortDir,
} from '../../common/pagination';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseQueryDto } from './dto/warehouse-query.dto';
import { Warehouse, WarehouseType } from './entities/warehouse.entity';

const SORTABLE_COLUMNS = [
  'name',
  'warehouseType',
  'isDefault',
  'isActive',
  'createdAt',
] as const;

@Injectable()
export class WarehousesService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehousesRepository: Repository<Warehouse>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: WarehouseQueryDto): Promise<PaginatedResult<Warehouse>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'name',
    );
    const sortDir = resolveSortDir(query.sortDir);

    const qb = this.warehousesRepository.createQueryBuilder('warehouse');

    if (query.search) {
      qb.andWhere('warehouse.name ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy(`warehouse.${sortColumn}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string): Promise<Warehouse> {
    const warehouse = await this.warehousesRepository.findOne({
      where: { id },
    });
    if (!warehouse) {
      throw new NotFoundException('Gudang tidak ditemukan.');
    }
    return warehouse;
  }

  async create(dto: CreateWarehouseDto): Promise<Warehouse> {
    this.assertConsignmentCustomer(dto.warehouseType, dto.customerId ?? null);

    return this.dataSource.transaction(async (manager) => {
      const warehouse = manager.create(Warehouse, {
        name: toUpperTrim(dto.name),
        warehouseType: dto.warehouseType,
        customerId: dto.customerId ?? null,
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
      });
      const saved = await manager.save(Warehouse, warehouse);

      if (saved.isDefault) {
        await manager.update(
          Warehouse,
          { warehouseType: saved.warehouseType, id: Not(saved.id) },
          { isDefault: false },
        );
      }

      return saved;
    });
  }

  async update(id: string, dto: UpdateWarehouseDto): Promise<Warehouse> {
    const existing = await this.findOne(id);
    const warehouseType = dto.warehouseType ?? existing.warehouseType;
    const customerId =
      dto.customerId !== undefined ? dto.customerId : existing.customerId;

    this.assertConsignmentCustomer(warehouseType, customerId);

    return this.dataSource.transaction(async (manager) => {
      await manager.update(Warehouse, id, {
        ...(dto.name !== undefined && { name: toUpperTrim(dto.name) }),
        ...(dto.warehouseType !== undefined && {
          warehouseType: dto.warehouseType,
        }),
        ...(dto.customerId !== undefined && { customerId: dto.customerId }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      });

      if (dto.isDefault === true) {
        await manager.update(
          Warehouse,
          { warehouseType, id: Not(id) },
          { isDefault: false },
        );
      }

      const result = await manager.findOne(Warehouse, { where: { id } });
      if (!result) {
        throw new NotFoundException('Gudang tidak ditemukan.');
      }
      return result;
    });
  }

  private assertConsignmentCustomer(
    warehouseType: WarehouseType,
    customerId: string | null,
  ): void {
    if (warehouseType === WarehouseType.TITIPAN_PELANGGAN && !customerId) {
      throw new BadRequestException(
        'customer_id wajib diisi untuk gudang bertipe TITIPAN_PELANGGAN.',
      );
    }
    if (warehouseType !== WarehouseType.TITIPAN_PELANGGAN && customerId) {
      throw new BadRequestException(
        'customer_id hanya boleh diisi untuk gudang bertipe TITIPAN_PELANGGAN.',
      );
    }
  }
}
