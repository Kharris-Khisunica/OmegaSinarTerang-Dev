import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Brand } from '../brands/entities/brand.entity';
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

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'omega_dev',
      entities: [Product, ProductUnitConversion, Brand],
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
  });

  afterAll(async () => {
    await dataSource.query(
      `DELETE FROM product_unit_conversions WHERE product_id IN (SELECT id FROM products WHERE brand_id = $1)`,
      [brandId],
    );
    await dataSource.getRepository(Product).delete({ brandId });
    await dataSource.getRepository(Brand).delete(brandId);
    await dataSource.destroy();
  });

  it('menyusun display_name dari 4 bagian dan bisa dicari lewat display_name', async () => {
    const product = await service.create({
      brandId,
      keterangan: 'Putih',
      kemasan: 'Sachet',
      ukuranUom: '37 gr',
      baseUnit: 'pcs',
    });

    expect(product.displayName).toBe('Bendera Putih Sachet 37 gr');

    const found = await service.findAll({ search: 'bendera' });
    expect(found.data.some((p) => p.id === product.id)).toBe(true);
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
});
