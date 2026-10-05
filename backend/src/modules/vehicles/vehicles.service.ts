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
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleQueryDto } from './dto/vehicle-query.dto';
import { Vehicle } from './entities/vehicle.entity';

const SORTABLE_COLUMNS = ['code', 'name', 'isActive', 'createdAt'] as const;

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: VehicleQueryDto): Promise<PaginatedResult<Vehicle>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'name',
    );
    const sortDir = resolveSortDir(query.sortDir);

    const qb = this.vehiclesRepository.createQueryBuilder('vehicle');

    if (query.search) {
      qb.andWhere(
        '(vehicle.code ILIKE :search OR vehicle.name ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy(`vehicle.${sortColumn}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findOne({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException('Kendaraan tidak ditemukan.');
    }
    return vehicle;
  }

  async create(dto: CreateVehicleDto): Promise<Vehicle> {
    const code =
      dto.code ??
      (await generateSequenceCode(this.dataSource, 'vehicle_code_seq', 'KND'));
    const vehicle = this.vehiclesRepository.create({
      code,
      name: toUpperTrim(dto.name),
      isActive: dto.isActive ?? true,
    });
    return this.vehiclesRepository.save(vehicle);
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    await this.findOne(id);
    await this.vehiclesRepository.update(id, {
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.name !== undefined && { name: toUpperTrim(dto.name) }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });
    return this.findOne(id);
  }
}
