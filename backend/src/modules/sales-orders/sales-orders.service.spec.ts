import * as bcrypt from 'bcrypt';
import { DataSource, EntityManager } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { SalesChannel } from '../../common/enums/sales-channel.enum';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { PeriodLockValidatorService } from '../../core/period-lock/period-lock-validator.service';
import { PRINT_LOCK_TABLES } from '../../core/print-lock/print-lock-tables';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { Brand } from '../brands/entities/brand.entity';
import { Customer } from '../customers/entities/customer.entity';
import { ProductUnitConversion } from '../products/entities/product-unit-conversion.entity';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { Salesman } from '../salesmen/entities/salesman.entity';
import { Unit } from '../units/entities/unit.entity';
import { User } from '../users/entities/user.entity';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { SalesOrderLine } from './entities/sales-order-line.entity';
import { SalesOrder, SalesOrderStatus } from './entities/sales-order.entity';
import { SalesOrdersService } from './sales-orders.service';

/**
 * Integration test terhadap Postgres asli, pola sama
 * purchase-invoices.service.spec.ts — semua service dikonstruksi manual
 * lewat `new` (bypass Nest DI). Tidak membuat warehouse/produk global lain
 * di luar yang dibuat test ini sendiri; semua asersi di-scope ke id yang
 * dibuat test ini.
 */
describe('SalesOrdersService', () => {
  let dataSource: DataSource;
  let productsService: ProductsService;
  let documentCounterService: DocumentCounterService;
  let periodLockValidatorService: PeriodLockValidatorService;
  let service: SalesOrdersService;

  let masterUserId: string;
  let brandId: string;
  let unitId: string;
  let salesmanId: string;

  const createdProductIds: string[] = [];
  const createdCustomerIds: string[] = [];
  const createdOrderIds: string[] = [];
  const createdSalesmanIds: string[] = [];

  const masterUser: AuthenticatedUser = {
    sub: '',
    username: 'master',
    role: Role.MASTER,
  };

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
        Customer,
        Salesman,
        Unit,
        SalesOrder,
        SalesOrderLine,
      ],
    });
    await dataSource.initialize();

    productsService = new ProductsService(
      dataSource.getRepository(Product),
      dataSource.getRepository(Brand),
      dataSource,
    );
    documentCounterService = new DocumentCounterService();
    periodLockValidatorService = new PeriodLockValidatorService();
    service = new SalesOrdersService(
      dataSource,
      dataSource.getRepository(SalesOrder),
      documentCounterService,
      periodLockValidatorService,
    );

    const suffix = Date.now();

    const usersRepo = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('test-password', 4);
    const master = await usersRepo.save(
      usersRepo.create({
        username: `test_so_master_${suffix}`,
        passwordHash,
        fullName: 'Test SalesOrders Master',
        role: Role.MASTER,
        isActive: true,
      }),
    );
    masterUserId = master.id;
    masterUser.sub = masterUserId;

    const brandsRepo = dataSource.getRepository(Brand);
    const brand = await brandsRepo.save(
      brandsRepo.create({
        code: `TSO-${suffix.toString().slice(-8)}`,
        name: 'Merek Uji Sales Order',
        isActive: true,
      }),
    );
    brandId = brand.id;

    const unitsRepo = dataSource.getRepository(Unit);
    const unit = await unitsRepo.save(
      unitsRepo.create({
        code: `DUS-TSO-${suffix.toString().slice(-6)}`,
        name: 'DUS',
        isActive: true,
      }),
    );
    unitId = unit.id;

    const salesmenRepo = dataSource.getRepository(Salesman);
    const salesman = await salesmenRepo.save(
      salesmenRepo.create({
        code: `SLM-TSO-${suffix.toString().slice(-6)}`,
        name: 'Salesman Uji SO (PJ)',
        isActive: true,
      }),
    );
    salesmanId = salesman.id;
  });

  afterAll(async () => {
    if (createdOrderIds.length > 0) {
      await dataSource.query(
        `DELETE FROM sales_order_lines WHERE sales_order_id = ANY($1)`,
        [createdOrderIds],
      );
      await dataSource.query(`DELETE FROM sales_orders WHERE id = ANY($1)`, [
        createdOrderIds,
      ]);
    }
    if (createdSalesmanIds.length > 0) {
      await dataSource.query(`DELETE FROM salesmen WHERE id = ANY($1)`, [
        createdSalesmanIds,
      ]);
    }
    if (createdProductIds.length > 0) {
      await dataSource.query(
        `DELETE FROM product_unit_conversions WHERE product_id = ANY($1)`,
        [createdProductIds],
      );
      await dataSource.query(`DELETE FROM products WHERE id = ANY($1)`, [
        createdProductIds,
      ]);
    }
    if (createdCustomerIds.length > 0) {
      await dataSource.query(`DELETE FROM customers WHERE id = ANY($1)`, [
        createdCustomerIds,
      ]);
    }
    await dataSource.query(`DELETE FROM units WHERE id = $1`, [unitId]);
    await dataSource.query(`DELETE FROM salesmen WHERE id = $1`, [salesmanId]);
    await dataSource.query(`DELETE FROM brands WHERE id = $1`, [brandId]);
    await dataSource.query('DELETE FROM audit_logs WHERE user_id = $1', [
      masterUserId,
    ]);
    await dataSource.query('DELETE FROM users WHERE id = $1', [masterUserId]);
    await dataSource.destroy();
  });

  async function createTestProduct(label: string): Promise<string> {
    const product = await productsService.create({
      brandId,
      keterangan: `${label} ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      baseUnit: 'PCS',
      unitConversions: [{ unitName: 'DUS', qtyInBaseUnit: 12, level: 1 }],
    });
    createdProductIds.push(product.id);
    return product.id;
  }

  async function createTestCustomer(): Promise<string> {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const customer = await dataSource.getRepository(Customer).save(
      dataSource.getRepository(Customer).create({
        code: `CUST-TSO-${suffix}`,
        name: `Pelanggan Uji SO ${suffix}`,
        isActive: true,
      }),
    );
    createdCustomerIds.push(customer.id);
    return customer.id;
  }

  function daysAgoIso(days: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  }

  function periodOf(iso: string): string {
    const [yyyy, mm] = iso.split('-');
    return `${yyyy.slice(-2)}${mm}`;
  }

  async function createSimpleOrder(
    customerId: string,
    productId: string,
  ): Promise<SalesOrder> {
    const dto: CreateSalesOrderDto = {
      customerId,
      salesmanId,
      orderDate: daysAgoIso(0),
      lines: [{ productId, unitId, qtyInput: 3 }],
    };
    const result = await service.create(dto, masterUser);
    createdOrderIds.push(result.salesOrder.id);
    return result.salesOrder;
  }

  it('create() 2 baris -> nomor SO/{store_code}-YYMMXXXX, status OPEN, qtyBaseUnit konversi benar', async () => {
    const customerId = await createTestCustomer();
    const productA = await createTestProduct('Produk A');
    const productB = await createTestProduct('Produk B');

    const dto: CreateSalesOrderDto = {
      customerId,
      salesmanId,
      orderDate: daysAgoIso(0),
      lines: [
        { productId: productA, unitId, qtyInput: 2, unitPrice: 50000 },
        { productId: productB, unitId, qtyInput: 5 },
      ],
    };
    const result = await service.create(dto, masterUser);
    createdOrderIds.push(result.salesOrder.id);

    expect(result.salesOrder.orderNumber).toMatch(/^SO\/[^/]+-\d{8}$/);
    expect(result.salesOrder.status).toBe(SalesOrderStatus.OPEN);
    expect(result.salesOrder.salesmanId).toBe(salesmanId);
    expect(result.lines).toHaveLength(2);
    expect(Number(result.lines[0].qtyBaseUnit)).toBe(24); // 2 x 12
    expect(Number(result.lines[1].qtyBaseUnit)).toBe(60); // 5 x 12
    expect(Number(result.lines[0].unitPrice)).toBe(50000);
    expect(result.lines[1].unitPrice).toBeNull();
  });

  it('create() dengan salesman tidak aktif -> ditolak', async () => {
    const customerId = await createTestCustomer();
    const productId = await createTestProduct('Produk Salesman Nonaktif');
    const inactiveSalesman = await dataSource.getRepository(Salesman).save(
      dataSource.getRepository(Salesman).create({
        code: `SLM-TSO-INACTIVE-${Date.now()}`,
        name: 'Salesman Uji Nonaktif',
        isActive: false,
      }),
    );
    createdSalesmanIds.push(inactiveSalesman.id);

    await expect(
      service.create(
        {
          customerId,
          salesmanId: inactiveSalesman.id,
          orderDate: daysAgoIso(0),
          lines: [{ productId, unitId, qtyInput: 1 }],
        },
        masterUser,
      ),
    ).rejects.toThrow(/tidak aktif/i);
  });

  it('update() SO OPEN — ganti salesman (PJ) ke salesman lain', async () => {
    const customerId = await createTestCustomer();
    const productId = await createTestProduct('Produk Ganti PJ');
    const order = await createSimpleOrder(customerId, productId);
    const otherSalesman = await dataSource.getRepository(Salesman).save(
      dataSource.getRepository(Salesman).create({
        code: `SLM-TSO-OTHER-${Date.now()}`,
        name: 'Salesman Uji PJ Lain',
        isActive: true,
      }),
    );
    createdSalesmanIds.push(otherSalesman.id);

    const updated = await service.update(order.id, {
      salesmanId: otherSalesman.id,
    });
    expect(updated.salesmanId).toBe(otherSalesman.id);
  });

  it('create() dengan orderDate melewati batas backdate -> ditolak', async () => {
    const customerId = await createTestCustomer();
    const productId = await createTestProduct('Produk Backdate');

    const dto: CreateSalesOrderDto = {
      customerId,
      salesmanId,
      orderDate: daysAgoIso(30),
      lines: [{ productId, unitId, qtyInput: 1 }],
    };

    await expect(service.create(dto, masterUser)).rejects.toThrow();
  });

  it('findAll() filter status dan customerId', async () => {
    const customerId = await createTestCustomer();
    const productId = await createTestProduct('Produk FindAll');
    const order = await createSimpleOrder(customerId, productId);

    const byCustomer = await service.findAll({
      page: 1,
      limit: 20,
      customerId,
    });
    expect(byCustomer.data.map((o) => o.id)).toContain(order.id);

    const byStatus = await service.findAll({
      page: 1,
      limit: 20,
      customerId,
      status: SalesOrderStatus.OPEN,
    });
    expect(byStatus.data.map((o) => o.id)).toContain(order.id);

    const byWrongStatus = await service.findAll({
      page: 1,
      limit: 20,
      customerId,
      status: SalesOrderStatus.CONVERTED,
    });
    expect(byWrongStatus.data.map((o) => o.id)).not.toContain(order.id);
  });

  it('update() SO OPEN — ganti notes + ganti seluruh lines, orderNumber tidak berubah', async () => {
    const customerId = await createTestCustomer();
    const productA = await createTestProduct('Produk Update A');
    const productC = await createTestProduct('Produk Update C');
    const order = await createSimpleOrder(customerId, productA);

    const updated = await service.update(order.id, {
      notes: 'Catatan baru',
      lines: [{ productId: productC, unitId, qtyInput: 7 }],
    });

    expect(updated.orderNumber).toBe(order.orderNumber);
    expect(updated.notes).toBe('Catatan baru');
    expect(updated.lines).toHaveLength(1);
    expect(updated.lines[0].productId).toBe(productC);
  });

  it('markConverted() SO OPEN -> status CONVERTED, convertedAt terisi; markConverted() dua kali -> throw', async () => {
    const customerId = await createTestCustomer();
    const productId = await createTestProduct('Produk Convert');
    const order = await createSimpleOrder(customerId, productId);

    await dataSource.transaction((manager) =>
      service.markConverted(order.id, manager),
    );

    const reloaded = await service.findOne(order.id);
    expect(reloaded.status).toBe(SalesOrderStatus.CONVERTED);
    expect(reloaded.convertedAt).not.toBeNull();

    await expect(
      dataSource.transaction((manager) =>
        service.markConverted(order.id, manager),
      ),
    ).rejects.toThrow();
  });

  it('update() SO CONVERTED -> ditolak, pesan menyebut "sudah dikonversi"', async () => {
    const customerId = await createTestCustomer();
    const productId = await createTestProduct('Produk Convert Update');
    const order = await createSimpleOrder(customerId, productId);

    await dataSource.transaction((manager) =>
      service.markConverted(order.id, manager),
    );

    await expect(
      service.update(order.id, { notes: 'coba edit setelah convert' }),
    ).rejects.toThrow(/sudah dikonversi/i);
  });

  it('dua create() berurutan -> nomor SO berurutan tanpa lompat', async () => {
    const customerId = await createTestCustomer();
    const productId = await createTestProduct('Produk Berurutan');

    const first = await createSimpleOrder(customerId, productId);
    const second = await createSimpleOrder(customerId, productId);

    const firstSeq = Number(first.orderNumber.slice(-4));
    const secondSeq = Number(second.orderNumber.slice(-4));
    expect(secondSeq).toBe(firstSeq + 1);
  });

  it('nomor SO tidak lompat saat create() gagal di tengah transaction (baris kedua gagal disimpan)', async () => {
    const customerId = await createTestCustomer();
    const productA = await createTestProduct('Produk Gagal A');
    const productB = await createTestProduct('Produk Gagal B');

    const orderDate = daysAgoIso(0);
    const period = periodOf(orderDate);
    const before: { last_number: number }[] = await dataSource.query(
      `SELECT last_number FROM document_counters WHERE doc_type = 'SALES_ORDER' AND period = $1`,
      [period],
    );
    const beforeNumber = before[0]?.last_number ?? 0;

    const countBefore: { count: string }[] = await dataSource.query(
      `SELECT COUNT(*)::text AS count FROM sales_orders WHERE customer_id = $1`,
      [customerId],
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalSave = EntityManager.prototype.save;
    let lineSaveCount = 0;
    const spy = jest
      .spyOn(EntityManager.prototype, 'save')
      .mockImplementation(function (
        this: EntityManager,

        ...args: any[]
      ) {
        if (args[0] === SalesOrderLine) {
          lineSaveCount++;
          if (lineSaveCount === 2) {
            throw new Error('simulasi gagal di tengah transaction');
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        return (originalSave as any).apply(this, args);
      });

    try {
      await expect(
        service.create(
          {
            customerId,
            salesmanId,
            orderDate,
            lines: [
              { productId: productA, unitId, qtyInput: 1 },
              { productId: productB, unitId, qtyInput: 1 },
            ],
          },
          masterUser,
        ),
      ).rejects.toThrow('simulasi gagal di tengah transaction');
    } finally {
      spy.mockRestore();
    }

    const after: { last_number: number }[] = await dataSource.query(
      `SELECT last_number FROM document_counters WHERE doc_type = 'SALES_ORDER' AND period = $1`,
      [period],
    );
    expect(after[0]?.last_number ?? 0).toBe(beforeNumber);

    const countAfter: { count: string }[] = await dataSource.query(
      `SELECT COUNT(*)::text AS count FROM sales_orders WHERE customer_id = $1`,
      [customerId],
    );
    expect(countAfter[0].count).toBe(countBefore[0].count);

    // Percobaan berikutnya tetap dapat nomor lanjutan, tanpa lubang.
    const next = await createSimpleOrder(customerId, productA);
    const nextSeq = Number(next.orderNumber.slice(-4));
    expect(nextSeq).toBe(beforeNumber + 1);
  });

  it('SO tidak terdaftar di PRINT_LOCK_TABLES (pagar regresi kunci cetak)', () => {
    expect(PRINT_LOCK_TABLES).not.toContain('sales_orders');
  });

  it('SO tidak menahan stok — tidak ada stock_movements/product_stock_balance yang tersentuh', async () => {
    const customerId = await createTestCustomer();
    const productId = await createTestProduct('Produk Tanpa Stok');
    await createSimpleOrder(customerId, productId);

    const movements: unknown[] = await dataSource.query(
      `SELECT id FROM stock_movements WHERE source_type = 'SALES_ORDER' AND product_id = $1`,
      [productId],
    );
    expect(movements).toHaveLength(0);

    const balances: unknown[] = await dataSource.query(
      `SELECT product_id FROM product_stock_balance WHERE product_id = $1`,
      [productId],
    );
    expect(balances).toHaveLength(0);
  });

  it('getCommittedQty() live: bertambah saat SO OPEN dibuat, berkurang saat dikonversi', async () => {
    const customerId = await createTestCustomer();
    const productId = await createTestProduct('Produk Committed');

    const zero = await productsService.getCommittedQty(productId);
    expect(zero).toBe(0);

    const order1 = await createSimpleOrder(customerId, productId); // qty 3 x 12 = 36
    const afterFirst = await productsService.getCommittedQty(productId);
    expect(afterFirst).toBe(36);

    const order2 = await createSimpleOrder(customerId, productId); // +36
    const afterSecond = await productsService.getCommittedQty(productId);
    expect(afterSecond).toBe(72);

    await dataSource.transaction((manager) =>
      service.markConverted(order1.id, manager),
    );
    const afterConvert = await productsService.getCommittedQty(productId);
    expect(afterConvert).toBe(36);

    void order2;
  });

  describe('assertChannelSalesOrderRequirement — CLAUDE.md §1 saluran penjualan', () => {
    it('PENGIRIMAN tanpa salesOrderId -> ditolak', async () => {
      const customerId = await createTestCustomer();
      await expect(
        dataSource.transaction((manager) =>
          service.assertChannelSalesOrderRequirement(
            SalesChannel.PENGIRIMAN,
            null,
            customerId,
            manager,
          ),
        ),
      ).rejects.toThrow(/PENGIRIMAN.*Sales Order/i);
    });

    it('PENGIRIMAN dengan salesOrderId yang tidak ada -> "tidak ditemukan"', async () => {
      const customerId = await createTestCustomer();
      await expect(
        dataSource.transaction((manager) =>
          service.assertChannelSalesOrderRequirement(
            SalesChannel.PENGIRIMAN,
            '00000000-0000-0000-0000-000000000000',
            customerId,
            manager,
          ),
        ),
      ).rejects.toThrow(/tidak ditemukan/i);
    });

    it('PENGIRIMAN dengan SO OPEN milik customer yang sama -> lolos', async () => {
      const customerId = await createTestCustomer();
      const productId = await createTestProduct('Produk Channel Match');
      const order = await createSimpleOrder(customerId, productId);

      await expect(
        dataSource.transaction((manager) =>
          service.assertChannelSalesOrderRequirement(
            SalesChannel.PENGIRIMAN,
            order.id,
            customerId,
            manager,
          ),
        ),
      ).resolves.toBeUndefined();
    });

    it('PENGIRIMAN dengan SO milik customer lain -> "pelanggan lain"', async () => {
      const customerId = await createTestCustomer();
      const otherCustomerId = await createTestCustomer();
      const productId = await createTestProduct('Produk Channel Mismatch');
      const order = await createSimpleOrder(customerId, productId);

      await expect(
        dataSource.transaction((manager) =>
          service.assertChannelSalesOrderRequirement(
            SalesChannel.PENGIRIMAN,
            order.id,
            otherCustomerId,
            manager,
          ),
        ),
      ).rejects.toThrow(/pelanggan lain/i);
    });

    it('PENGIRIMAN dengan SO yang sudah CONVERTED -> "sudah dikonversi"', async () => {
      const customerId = await createTestCustomer();
      const productId = await createTestProduct('Produk Channel Converted');
      const order = await createSimpleOrder(customerId, productId);
      await dataSource.transaction((manager) =>
        service.markConverted(order.id, manager),
      );

      await expect(
        dataSource.transaction((manager) =>
          service.assertChannelSalesOrderRequirement(
            SalesChannel.PENGIRIMAN,
            order.id,
            customerId,
            manager,
          ),
        ),
      ).rejects.toThrow(/sudah dikonversi/i);
    });

    it('TOKO tanpa salesOrderId -> lolos', async () => {
      const customerId = await createTestCustomer();
      await expect(
        dataSource.transaction((manager) =>
          service.assertChannelSalesOrderRequirement(
            SalesChannel.TOKO,
            null,
            customerId,
            manager,
          ),
        ),
      ).resolves.toBeUndefined();
    });

    it('TOKO dengan salesOrderId sampah -> tetap lolos (no-op short-circuit, tidak query)', async () => {
      const customerId = await createTestCustomer();
      await expect(
        dataSource.transaction((manager) =>
          service.assertChannelSalesOrderRequirement(
            SalesChannel.TOKO,
            '00000000-0000-0000-0000-000000000000',
            customerId,
            manager,
          ),
        ),
      ).resolves.toBeUndefined();
    });
  });
});
