import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { toUpperTrim } from '../../common/normalize-text';
import {
  buildPaginatedResult,
  PaginatedResult,
  resolveSortColumn,
  resolveSortDir,
} from '../../common/pagination';
import { Brand } from '../brands/entities/brand.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductUnitConversion } from './entities/product-unit-conversion.entity';
import { Product } from './entities/product.entity';
import { validateUnitConversions } from './validators/validate-unit-conversions';

const SORTABLE_COLUMNS = [
  'code',
  'displayName',
  'baseUnit',
  'isActive',
  'createdAt',
] as const;

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Brand)
    private readonly brandsRepository: Repository<Brand>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: ProductQueryDto): Promise<PaginatedResult<Product>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'displayName',
    );
    const sortDir = resolveSortDir(query.sortDir);

    const qb = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.unitConversions', 'unitConversions');

    if (query.search) {
      // Jalur pencarian terpanas aplikasi (CLAUDE.md §3) — operator mencari
      // lewat display_name (terindeks), bukan code.
      qb.andWhere(
        '(product.code ILIKE :search OR product.displayName ILIKE :search)',
        { search: `%${query.search}%` },
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
      const brand = await this.assertActiveBrand(dto.brandId, manager);
      const code = dto.code ?? (await this.generateCode(manager));

      const product = manager.create(Product, {
        code,
        brandId: dto.brandId,
        keterangan: dto.keterangan ?? null,
        kemasan: dto.kemasan ?? null,
        ukuranUom: dto.ukuranUom ?? null,
        displayName: toUpperTrim(
          buildDisplayName(
            brand.name,
            dto.kemasan ?? null,
            dto.keterangan ?? null,
            dto.ukuranUom ?? null,
          ),
        ),
        isBkp: dto.isBkp ?? false,
        eanBarcode: dto.eanBarcode ?? null,
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

    if (
      dto.code !== undefined &&
      dto.code !== existing.code &&
      existing.isCodeLocked
    ) {
      throw new BadRequestException(
        'Kode produk sudah terkunci karena sudah dipakai di transaksi pertama dan tidak bisa diubah lagi.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const brandId = dto.brandId ?? existing.brandId;
      const keterangan = dto.keterangan ?? existing.keterangan;
      const kemasan =
        dto.kemasan !== undefined ? dto.kemasan : existing.kemasan;
      const ukuranUom =
        dto.ukuranUom !== undefined ? dto.ukuranUom : existing.ukuranUom;

      const nameFieldsChanged =
        dto.brandId !== undefined ||
        dto.keterangan !== undefined ||
        dto.kemasan !== undefined ||
        dto.ukuranUom !== undefined;

      let displayName: string | undefined;
      if (nameFieldsChanged) {
        const brand = await this.assertActiveBrand(brandId, manager);
        displayName = toUpperTrim(
          buildDisplayName(brand.name, kemasan, keterangan, ukuranUom),
        );
      }

      await manager.update(Product, id, {
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.brandId !== undefined && { brandId: dto.brandId }),
        ...(dto.keterangan !== undefined && { keterangan: dto.keterangan }),
        ...(dto.kemasan !== undefined && { kemasan: dto.kemasan }),
        ...(dto.ukuranUom !== undefined && { ukuranUom: dto.ukuranUom }),
        ...(displayName !== undefined && { displayName }),
        ...(dto.isBkp !== undefined && { isBkp: dto.isBkp }),
        ...(dto.eanBarcode !== undefined && { eanBarcode: dto.eanBarcode }),
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

  /**
   * Titik masuk tunggal untuk mengunci kode produk setelah dipakai di
   * transaksi pertama (CLAUDE.md §3) — dipanggil StockRecorder/Faktur
   * Penjualan/Faktur Pembelian (Hari 10+) begitu produk tersentuh transaksi
   * sungguhan pertama kalinya. Idempotent: no-op kalau sudah terkunci.
   */
  async lockCode(id: string, manager?: EntityManager): Promise<void> {
    const runner = manager ?? this.dataSource.manager;
    await runner.update(
      Product,
      { id, isCodeLocked: false },
      {
        isCodeLocked: true,
      },
    );
  }

  /**
   * Qty produk yang terikat Sales Order OPEN — MURNI informatif (CLAUDE.md
   * §2.16/§3: "SO tidak menahan stok, qty terikat hanya ditampilkan").
   * Raw SQL langsung ke sales_order_lines/sales_orders, BUKAN import
   * SalesOrdersModule ke ProductsModule (dikonfirmasi lewat riset Hari 19:
   * SalesOrdersService juga tidak import ProductsModule, cukup
   * manager.findOne(Product, ...) langsung — tidak ada risiko circular
   * dependency untuk dihindari, raw SQL dipilih murni karena lebih
   * sederhana untuk agregat sekali-baca). TIDAK PERNAH menyentuh
   * product_stock_balance — dihitung live tiap panggilan, tidak di-cache.
   */
  async getCommittedQty(productId: string): Promise<number> {
    await this.findOne(productId);
    const rows: { committed_qty: string }[] = await this.dataSource.query(
      `SELECT COALESCE(SUM(sol.qty_base_unit), 0) AS committed_qty
       FROM sales_order_lines sol
       JOIN sales_orders so ON so.id = sol.sales_order_id
       WHERE sol.product_id = $1 AND so.status = 'OPEN'`,
      [productId],
    );
    return Number(rows[0].committed_qty);
  }

  /**
   * Sisa stok gudang STORE — cermin baca `product_stock_balance` (CLAUDE.md
   * §2.5: dilarang UPDATE langsung dari modul lain, tapi baca murni aman).
   * Dibangun untuk panel "SISA STOK" Faktur Penjualan (Hari 20) — pola sama
   * getCommittedQty() di atas. Hanya gudang STORE (CLAUDE.md §3: "Lokasi
   * tidak dipilih per baris — selalu STORE"); BAD_STOCK/TITIPAN_PELANGGAN
   * sengaja tidak ikut, itu bukan stok yang bisa dijual.
   */
  async getStockBalance(productId: string): Promise<number> {
    await this.findOne(productId);
    const rows: { qty_base_unit: string }[] = await this.dataSource.query(
      `SELECT COALESCE(SUM(psb.qty_base_unit), 0) AS qty_base_unit
       FROM product_stock_balance psb
       JOIN warehouses w ON w.id = psb.warehouse_id
       WHERE psb.product_id = $1 AND w.warehouse_type = 'STORE'`,
      [productId],
    );
    return Number(rows[0].qty_base_unit);
  }

  private async assertActiveBrand(
    brandId: string,
    manager: EntityManager,
  ): Promise<Brand> {
    const brand = await manager.findOne(Brand, { where: { id: brandId } });
    if (!brand || !brand.isActive) {
      throw new BadRequestException('brandId harus merek aktif.');
    }
    return brand;
  }

  private async generateCode(manager: EntityManager): Promise<string> {
    const rows: { nextval: string }[] = await manager.query(
      `SELECT nextval('product_code_seq') AS nextval`,
    );
    const sequence = String(Number(rows[0].nextval)).padStart(4, '0');
    const now = new Date();
    const yy = String(now.getFullYear() % 100).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}${sequence}`;
  }
}

function buildDisplayName(
  brandName: string,
  kemasan: string | null,
  keterangan: string | null,
  ukuranUom: string | null,
): string {
  return [brandName, kemasan, keterangan, ukuranUom]
    .filter((part): part is string => !!part && part.trim().length > 0)
    .map((part) => part.trim())
    .join(' ');
}
