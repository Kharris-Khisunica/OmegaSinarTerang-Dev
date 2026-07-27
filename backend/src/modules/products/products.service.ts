import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  buildPaginatedResult,
  PaginatedResult,
  resolveSortColumn,
  resolveSortDir,
} from '../../common/pagination';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductUnitConversion } from './entities/product-unit-conversion.entity';
import { Product } from './entities/product.entity';
import { validateUnitConversions } from './validators/validate-unit-conversions';

const SORTABLE_COLUMNS = [
  'code',
  'name',
  'baseUnit',
  'isActive',
  'createdAt',
] as const;

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: ProductQueryDto): Promise<PaginatedResult<Product>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'code',
    );
    const sortDir = resolveSortDir(query.sortDir);

    const qb = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.unitConversions', 'unitConversions');

    if (query.search) {
      qb.andWhere(
        '(product.code ILIKE :search OR product.name ILIKE :search)',
        {
          search: `%${query.search}%`,
        },
      );
    }

    qb.orderBy(`product.${sortColumn}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: { unitConversions: true },
    });
    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan.');
    }
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    validateUnitConversions(dto.baseUnit, dto.unitConversions);

    return this.dataSource.transaction(async (manager) => {
      const product = manager.create(Product, {
        code: dto.code,
        name: dto.name,
        baseUnit: dto.baseUnit,
        isActive: dto.isActive ?? true,
      });
      const saved = await manager.save(Product, product);

      if (dto.unitConversions && dto.unitConversions.length > 0) {
        const conversions = dto.unitConversions.map((c) =>
          manager.create(ProductUnitConversion, {
            productId: saved.id,
            unitName: c.unitName,
            qtyInBaseUnit: String(c.qtyInBaseUnit),
            level: c.level,
          }),
        );
        await manager.save(ProductUnitConversion, conversions);
      }

      const result = await manager.findOne(Product, {
        where: { id: saved.id },
        relations: { unitConversions: true },
      });
      if (!result) {
        throw new BadRequestException('Gagal membuat produk.');
      }
      return result;
    });
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const existing = await this.findOne(id);
    const baseUnit = dto.baseUnit ?? existing.baseUnit;

    if (dto.unitConversions) {
      validateUnitConversions(baseUnit, dto.unitConversions);
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.update(Product, id, {
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.baseUnit !== undefined && { baseUnit: dto.baseUnit }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      });

      if (dto.unitConversions) {
        await manager.delete(ProductUnitConversion, { productId: id });
        if (dto.unitConversions.length > 0) {
          const conversions = dto.unitConversions.map((c) =>
            manager.create(ProductUnitConversion, {
              productId: id,
              unitName: c.unitName,
              qtyInBaseUnit: String(c.qtyInBaseUnit),
              level: c.level,
            }),
          );
          await manager.save(ProductUnitConversion, conversions);
        }
      }

      const result = await manager.findOne(Product, {
        where: { id },
        relations: { unitConversions: true },
      });
      if (!result) {
        throw new NotFoundException('Produk tidak ditemukan.');
      }
      return result;
    });
  }
}
