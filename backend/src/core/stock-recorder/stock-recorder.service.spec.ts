import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { Brand } from '../../modules/brands/entities/brand.entity';
import { ProductUnitConversion } from '../../modules/products/entities/product-unit-conversion.entity';
import { Product } from '../../modules/products/entities/product.entity';
import { ProductsService } from '../../modules/products/products.service';
import { Supplier } from '../../modules/suppliers/entities/supplier.entity';
import { User } from '../../modules/users/entities/user.entity';
import {
  Warehouse,
  WarehouseType,
} from '../../modules/warehouses/entities/warehouse.entity';
import { StockCostConsumption } from '../../modules/stock/entities/stock-cost-consumption.entity';
import { StockCostLot } from '../../modules/stock/entities/stock-cost-lot.entity';
import {
  StockMovement,
  StockMovementType,
} from '../../modules/stock/entities/stock-movement.entity';
import { StockRecorderService } from './stock-recorder.service';

/**
 * Integration test terhadap Postgres asli (pola sama dengan
 * journal-poster.service.spec.ts) — ProductsService dikonstruksi manual
 * lewat repository dari DataSource yang sama (bypass Nest DI, tapi
 * constructor-nya persis yang dipakai produksi) supaya StockRecorderService
 * bisa memanggil lockCode() sungguhan tanpa perlu bootstrap seluruh app Nest.
 */
describe('StockRecorderService', () => {
  let dataSource: DataSource;
  let service: StockRecorderService;
  let productsService: ProductsService;

  let userId: string;
  let brandId: string;
  let supplierId: string;
  let storeWarehouseId: string;
  let badStockWarehouseId: string;

  const createdProductIds: string[] = [];

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'omega_dev',
      entities: [
        User,
        Brand,
        Product,
        ProductUnitConversion,
        Supplier,
        Warehouse,
        StockMovement,
        StockCostLot,
        StockCostConsumption,
      ],
    });
    await dataSource.initialize();

    productsService = new ProductsService(
      dataSource.getRepository(Product),
      dataSource.getRepository(Brand),
      dataSource,
    );
    service = new StockRecorderService(dataSource, productsService);

    const usersRepo = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('test-password', 4);
    const user = await usersRepo.save(
      usersRepo.create({
        username: `test_stock_recorder_${Date.now()}`,
        passwordHash,
        fullName: 'Test Stock Recorder',
        role: Role.MASTER,
        isActive: true,
      }),
    );
    userId = user.id;

    const brandsRepo = dataSource.getRepository(Brand);
    const brand = await brandsRepo.save(
      brandsRepo.create({
        code: `TSR-${Date.now().toString().slice(-8)}`,
        name: 'Merek Uji StockRecorder',
        isActive: true,
      }),
    );
    brandId = brand.id;

    const suppliersRepo = dataSource.getRepository(Supplier);
    const supplier = await suppliersRepo.save(
      suppliersRepo.create({
        displayCode: `SUP-TSR-${Date.now().toString().slice(-6)}`,
        name: 'Supplier Uji StockRecorder',
        isPkp: false,
        isActive: true,
      }),
    );
    supplierId = supplier.id;

    const warehousesRepo = dataSource.getRepository(Warehouse);
    const storeWarehouse = await warehousesRepo.save(
      warehousesRepo.create({
        name: `Toko Uji StockRecorder ${Date.now()}`,
        warehouseType: WarehouseType.STORE,
        customerId: null,
        isActive: true,
      }),
    );
    storeWarehouseId = storeWarehouse.id;

    const badStockWarehouse = await warehousesRepo.save(
      warehousesRepo.create({
        name: `Bad Stock Uji StockRecorder ${Date.now()}`,
        warehouseType: WarehouseType.BAD_STOCK,
        customerId: null,
        isActive: true,
      }),
    );
    badStockWarehouseId = badStockWarehouse.id;
  });

  afterAll(async () => {
    if (createdProductIds.length > 0) {
      // ON DELETE CASCADE stock_cost_consumptions -> lot & movement ikut bersih.
      await dataSource.query(
        `DELETE FROM stock_cost_lots WHERE product_id = ANY($1)`,
        [createdProductIds],
      );
      await dataSource.query(
        `DELETE FROM stock_movements WHERE product_id = ANY($1)`,
        [createdProductIds],
      );
      await dataSource.query(
        `DELETE FROM product_stock_balance WHERE product_id = ANY($1)`,
        [createdProductIds],
      );
      await dataSource.query(`DELETE FROM products WHERE id = ANY($1)`, [
        createdProductIds,
      ]);
    }
    await dataSource.query('DELETE FROM warehouses WHERE id = ANY($1)', [
      [storeWarehouseId, badStockWarehouseId],
    ]);
    await dataSource.query('DELETE FROM suppliers WHERE id = $1', [supplierId]);
    await dataSource.query('DELETE FROM brands WHERE id = $1', [brandId]);
    await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
    await dataSource.destroy();
  });

  async function createTestProduct(
    keterangan: string,
    unitConversions: {
      unitName: string;
      qtyInBaseUnit: number;
      level: number;
    }[] = [],
  ): Promise<string> {
    const product = await productsService.create({
      brandId,
      keterangan: `${keterangan} ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      baseUnit: 'PCS',
      unitConversions,
    });
    createdProductIds.push(product.id);
    return product.id;
  }

  it('FIFO: 10@1000 lalu 10@1200, keluar 15 -> totalCost=16000, lot pertama habis, lot kedua sisa 5', async () => {
    const productId = await createTestProduct('Produk FIFO Dasar');

    await dataSource.transaction((manager) =>
      service.recordIn(
        {
          productId,
          warehouseId: storeWarehouseId,
          qtyBaseUnit: 10,
          unitCost: 1000,
          lotDate: new Date('2026-08-01'),
          movementDate: new Date('2026-08-01'),
          movementType: StockMovementType.PURCHASE,
          supplierId,
          sourceType: 'PURCHASE_INVOICE',
          sourceId: null,
          createdBy: userId,
        },
        manager,
      ),
    );
    await dataSource.transaction((manager) =>
      service.recordIn(
        {
          productId,
          warehouseId: storeWarehouseId,
          qtyBaseUnit: 10,
          unitCost: 1200,
          lotDate: new Date('2026-08-03'),
          movementDate: new Date('2026-08-03'),
          movementType: StockMovementType.PURCHASE,
          supplierId,
          sourceType: 'PURCHASE_INVOICE',
          sourceId: null,
          createdBy: userId,
        },
        manager,
      ),
    );

    const result = await dataSource.transaction((manager) =>
      service.recordOut(
        {
          productId,
          warehouseId: storeWarehouseId,
          qtyBaseUnit: 15,
          movementDate: new Date('2026-08-05'),
          movementType: StockMovementType.SALE,
          sourceType: 'SALES_INVOICE',
          sourceId: null,
          createdBy: userId,
        },
        manager,
      ),
    );

    expect(result.totalCost).toBe(16_000);
    expect(result.stockWarning).toBeUndefined();
    expect(result.consumptions).toHaveLength(2);

    const lots: {
      lot_date: string;
      unit_cost: string;
      qty_in: string;
      qty_remaining: string;
    }[] = await dataSource.query(
      `SELECT lot_date, unit_cost, qty_in, qty_remaining FROM stock_cost_lots
       WHERE product_id = $1 ORDER BY lot_date ASC`,
      [productId],
    );
    const consumptions: { qty: string; unit_cost: string; lot_date: string }[] =
      await dataSource.query(
        `SELECT sc.qty, sc.unit_cost, scl.lot_date
       FROM stock_cost_consumptions sc
       JOIN stock_cost_lots scl ON scl.id = sc.lot_id
       WHERE scl.product_id = $1
       ORDER BY scl.lot_date ASC`,
        [productId],
      );

    console.log('--- stock_cost_lots setelah skenario FIFO ---');

    console.log(lots);

    console.log('--- stock_cost_consumptions setelah skenario FIFO ---');

    console.log(consumptions);

    expect(Number(lots[0].qty_remaining)).toBe(0);
    expect(Number(lots[1].qty_remaining)).toBe(5);
  });

  it('keluar melebihi total stok -> berhasil, balance negatif, ada stockWarning', async () => {
    const productId = await createTestProduct('Produk Stok Minus');

    await dataSource.transaction((manager) =>
      service.recordIn(
        {
          productId,
          warehouseId: storeWarehouseId,
          qtyBaseUnit: 5,
          unitCost: 1500,
          lotDate: new Date('2026-08-01'),
          movementDate: new Date('2026-08-01'),
          movementType: StockMovementType.PURCHASE,
          supplierId,
          sourceType: 'PURCHASE_INVOICE',
          sourceId: null,
          createdBy: userId,
        },
        manager,
      ),
    );

    const result = await dataSource.transaction((manager) =>
      service.recordOut(
        {
          productId,
          warehouseId: storeWarehouseId,
          qtyBaseUnit: 20,
          movementDate: new Date('2026-08-02'),
          movementType: StockMovementType.SALE,
          sourceType: 'SALES_INVOICE',
          sourceId: null,
          createdBy: userId,
        },
        manager,
      ),
    );

    // 5 unit dari lot@1500 + 15 unit fallback (getLatestCostBasis = 1500,
    // satu-satunya lot berbayar) = 5*1500 + 15*1500 = 30_000.
    expect(result.totalCost).toBe(30_000);
    expect(result.stockWarning).toMatch(/minus/i);
    expect(result.stockWarning).toContain('15');

    const balance: { qty_base_unit: string }[] = await dataSource.query(
      `SELECT qty_base_unit FROM product_stock_balance WHERE product_id = $1 AND warehouse_id = $2`,
      [productId, storeWarehouseId],
    );
    expect(Number(balance[0].qty_base_unit)).toBe(-15);
  });

  it('transfer 5 unit -> 2 movement, lot tujuan ber-unit_cost identik', async () => {
    const productId = await createTestProduct('Produk Transfer');

    await dataSource.transaction((manager) =>
      service.recordIn(
        {
          productId,
          warehouseId: storeWarehouseId,
          qtyBaseUnit: 10,
          unitCost: 500,
          lotDate: new Date('2026-08-01'),
          movementDate: new Date('2026-08-01'),
          movementType: StockMovementType.PURCHASE,
          supplierId,
          sourceType: 'PURCHASE_INVOICE',
          sourceId: null,
          createdBy: userId,
        },
        manager,
      ),
    );

    const result = await dataSource.transaction((manager) =>
      service.transfer(
        {
          productId,
          fromWarehouseId: storeWarehouseId,
          toWarehouseId: badStockWarehouseId,
          qtyBaseUnit: 5,
          movementDate: new Date('2026-08-02'),
          sourceType: 'WAREHOUSE_MUTATION',
          sourceId: null,
          createdBy: userId,
        },
        manager,
      ),
    );

    expect(result.movementOut.warehouseId).toBe(storeWarehouseId);
    expect(Number(result.movementOut.qtyBaseUnit)).toBe(-5);
    expect(result.movementIn.warehouseId).toBe(badStockWarehouseId);
    expect(Number(result.movementIn.qtyBaseUnit)).toBe(5);

    const destLots: { unit_cost: string; qty_remaining: string }[] =
      await dataSource.query(
        `SELECT unit_cost, qty_remaining FROM stock_cost_lots
       WHERE product_id = $1 AND warehouse_id = $2`,
        [productId, badStockWarehouseId],
      );
    expect(destLots).toHaveLength(1);
    expect(Number(destLots[0].unit_cost)).toBe(500);
    expect(Number(destLots[0].qty_remaining)).toBe(5);

    const sourceBalance: { qty_base_unit: string }[] = await dataSource.query(
      `SELECT qty_base_unit FROM product_stock_balance WHERE product_id = $1 AND warehouse_id = $2`,
      [productId, storeWarehouseId],
    );
    const destBalance: { qty_base_unit: string }[] = await dataSource.query(
      `SELECT qty_base_unit FROM product_stock_balance WHERE product_id = $1 AND warehouse_id = $2`,
      [productId, badStockWarehouseId],
    );
    expect(Number(sourceBalance[0].qty_base_unit)).toBe(5);
    expect(Number(destBalance[0].qty_base_unit)).toBe(5);
  });

  it('2 pengeluaran paralel atas produk sama -> konsumsi lot tidak tumpang tindih', async () => {
    const productId = await createTestProduct('Produk Konsumsi Paralel');

    await dataSource.transaction((manager) =>
      service.recordIn(
        {
          productId,
          warehouseId: storeWarehouseId,
          qtyBaseUnit: 100,
          unitCost: 10,
          lotDate: new Date('2026-08-01'),
          movementDate: new Date('2026-08-01'),
          movementType: StockMovementType.PURCHASE,
          supplierId,
          sourceType: 'PURCHASE_INVOICE',
          sourceId: null,
          createdBy: userId,
        },
        manager,
      ),
    );

    const [resultA, resultB] = await Promise.all([
      dataSource.transaction((manager) =>
        service.recordOut(
          {
            productId,
            warehouseId: storeWarehouseId,
            qtyBaseUnit: 30,
            movementDate: new Date('2026-08-02'),
            movementType: StockMovementType.SALE,
            sourceType: 'SALES_INVOICE',
            sourceId: null,
            createdBy: userId,
          },
          manager,
        ),
      ),
      dataSource.transaction((manager) =>
        service.recordOut(
          {
            productId,
            warehouseId: storeWarehouseId,
            qtyBaseUnit: 30,
            movementDate: new Date('2026-08-02'),
            movementType: StockMovementType.SALE,
            sourceType: 'SALES_INVOICE',
            sourceId: null,
            createdBy: userId,
          },
          manager,
        ),
      ),
    ]);

    // Kedua transaksi lolos dengan cost lot yang sama (10) karena hanya
    // ada 1 lot — row-lock FOR UPDATE menyerialisasi akses, bukan menolak
    // salah satunya.
    expect(resultA.totalCost).toBe(300);
    expect(resultB.totalCost).toBe(300);

    const lot: { qty_remaining: string }[] = await dataSource.query(
      `SELECT qty_remaining FROM stock_cost_lots WHERE product_id = $1`,
      [productId],
    );
    expect(Number(lot[0].qty_remaining)).toBe(40);

    const balance: { qty_base_unit: string }[] = await dataSource.query(
      `SELECT qty_base_unit FROM product_stock_balance WHERE product_id = $1 AND warehouse_id = $2`,
      [productId, storeWarehouseId],
    );
    expect(Number(balance[0].qty_base_unit)).toBe(40);
  });

  it('getLatestCostBasis MELEWATI lot ber-unit_cost 0 (bonus) dan mengembalikan lot berbayar terakhir', async () => {
    const productId = await createTestProduct('Produk Bonus');

    await dataSource.transaction((manager) =>
      service.recordIn(
        {
          productId,
          warehouseId: storeWarehouseId,
          qtyBaseUnit: 10,
          unitCost: 2000,
          lotDate: new Date('2026-08-01'),
          movementDate: new Date('2026-08-01'),
          movementType: StockMovementType.PURCHASE,
          supplierId,
          sourceType: 'PURCHASE_INVOICE',
          sourceId: null,
          createdBy: userId,
        },
        manager,
      ),
    );
    // Lot bonus LEBIH BARU tapi unit_cost=0 — harus dilewati.
    await dataSource.transaction((manager) =>
      service.recordIn(
        {
          productId,
          warehouseId: storeWarehouseId,
          qtyBaseUnit: 5,
          unitCost: 0,
          lotDate: new Date('2026-08-10'),
          movementDate: new Date('2026-08-10'),
          movementType: StockMovementType.PURCHASE,
          supplierId,
          sourceType: 'PURCHASE_INVOICE',
          sourceId: null,
          createdBy: userId,
        },
        manager,
      ),
    );

    const basis = await dataSource.transaction((manager) =>
      service.getLatestCostBasis(productId, manager),
    );
    expect(basis).toBe(2000);
  });

  it('formatQtyBreakdown(255, 1 DUS = 20 PCS) -> "12 DUS 15 PCS"', async () => {
    const productId = await createTestProduct('Produk Breakdown', [
      { unitName: 'DUS', qtyInBaseUnit: 20, level: 1 },
    ]);

    const breakdown = await dataSource.transaction((manager) =>
      service.formatQtyBreakdown(255, productId, manager),
    );
    expect(breakdown).toBe('12 DUS 15 PCS');
  });
});
