import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Brand } from '../brands/entities/brand.entity';
import { ProductStockBalance } from '../stock/entities/product-stock-balance.entity';
import {
  Warehouse,
  WarehouseType,
} from '../warehouses/entities/warehouse.entity';
import { ProductUnitConversion } from './entities/product-unit-conversion.entity';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';

/**
 * Integration test terhadap Postgres asli (pola sama dengan
 * DocumentCounterService/JournalPosterService) — bukan mock.
 */
describe('ProductsService', () => {
  let dataSource: DataSource;
  let service: ProductsService;
  let brandId: string;
  let storeWarehouseId: string;
  let badStockWarehouseId: string;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'omega_dev',
      entities: [
        Product,
        ProductUnitConversion,
        Brand,
        Warehouse,
        ProductStockBalance,
      ],
    });
    await dataSource.initialize();

    service = new ProductsService(
      dataSource.getRepository(Product),
      dataSource.getRepository(Brand),
      dataSource,
    );

    const brand = await dataSource.getRepository(Brand).save(
      dataSource.getRepository(Brand).create({
        code: `TEST-BRAND-${Date.now()}`,
        name: 'Bendera',
        isActive: true,
      }),
    );
    brandId = brand.id;

    const warehousesRepo = dataSource.getRepository(Warehouse);
    const storeWarehouse = await warehousesRepo.save(
      warehousesRepo.create({
        name: `Toko Uji ProductsService ${Date.now()}`,
        warehouseType: WarehouseType.STORE,
        customerId: null,
        isActive: true,
      }),
    );
    storeWarehouseId = storeWarehouse.id;
    const badStockWarehouse = await warehousesRepo.save(
      warehousesRepo.create({
        name: `Bad Stock Uji ProductsService ${Date.now()}`,
        warehouseType: WarehouseType.BAD_STOCK,
        customerId: null,
        isActive: true,
      }),
    );
    badStockWarehouseId = badStockWarehouse.id;
  });

  afterAll(async () => {
    await dataSource.query(
      `DELETE FROM product_stock_balance WHERE product_id IN (SELECT id FROM products WHERE brand_id = $1)`,
      [brandId],
    );
    await dataSource.query(
      `DELETE FROM product_unit_conversions WHERE product_id IN (SELECT id FROM products WHERE brand_id = $1)`,
      [brandId],
    );
    await dataSource.getRepository(Product).delete({ brandId });
    await dataSource.query('DELETE FROM warehouses WHERE id = ANY($1)', [
      [storeWarehouseId, badStockWarehouseId],
    ]);
    await dataSource.getRepository(Brand).delete(brandId);
    await dataSource.destroy();
  });

  it('menyusun display_name dari 4 bagian (urutan Merek-Kemasan-Keterangan-UkuranUom, R2) dan bisa dicari lewat display_name', async () => {
    const product = await service.create({
      brandId,
      keterangan: 'Putih',
      kemasan: 'Sachet',
      ukuranUom: '37 gr',
      baseUnit: 'pcs',
    });

    expect(product.displayName).toBe('BENDERA SACHET PUTIH 37 GR');

    const found = await service.findAll({ search: 'bendera' });
    expect(found.data.some((p) => p.id === product.id)).toBe(true);
  });

  it('menyusun display_name tanpa keterangan, tanpa spasi ganda', async () => {
    const product = await service.create({
      brandId,
      kemasan: 'Sachet',
      ukuranUom: '37 gr',
      baseUnit: 'pcs',
    });

    expect(product.displayName).toBe('BENDERA SACHET 37 GR');
    expect(product.displayName).not.toMatch(/ {2,}/);
  });

  it('membangkitkan code 10 digit otomatis kalau kode kosong', async () => {
    const product = await service.create({
      brandId,
      keterangan: 'Otomatis',
      baseUnit: 'pcs',
    });

    expect(product.code).toMatch(/^[0-9]{10}$/);
  });

  it('menolak ubah code produk yang sudah terkunci (dipakai transaksi pertama)', async () => {
    const product = await service.create({
      brandId,
      keterangan: 'Terkunci',
      baseUnit: 'pcs',
    });

    await service.lockCode(product.id);

    await expect(
      service.update(product.id, { code: '9999999999' }),
    ).rejects.toThrow(BadRequestException);

    // Field lain tetap bisa diubah walau code terkunci.
    const updated = await service.update(product.id, {
      keterangan: 'Terkunci Revisi',
    });
    expect(updated.keterangan).toBe('Terkunci Revisi');
    expect(updated.code).toBe(product.code);
  });

  it('getStockBalance menjumlahkan hanya gudang STORE, mengabaikan BAD_STOCK', async () => {
    const product = await service.create({
      brandId,
      keterangan: 'Uji Stok',
      baseUnit: 'pcs',
    });

    const balanceRepo = dataSource.getRepository(ProductStockBalance);
    await balanceRepo.save(
      balanceRepo.create({
        productId: product.id,
        warehouseId: storeWarehouseId,
        qtyBaseUnit: '25.5000',
      }),
    );
    await balanceRepo.save(
      balanceRepo.create({
        productId: product.id,
        warehouseId: badStockWarehouseId,
        qtyBaseUnit: '999.0000',
      }),
    );

    const qty = await service.getStockBalance(product.id);
    expect(qty).toBe(25.5);
  });
});
