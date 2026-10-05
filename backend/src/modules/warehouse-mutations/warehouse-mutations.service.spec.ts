import { HttpException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { PeriodLockValidatorService } from '../../core/period-lock/period-lock-validator.service';
import { StepUpService } from '../../core/step-up/step-up.service';
import { StockRecorderService } from '../../core/stock-recorder/stock-recorder.service';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { AuthorizationRequestsService } from '../authorization-requests/authorization-requests.service';
import { AuthorizationRequest } from '../authorization-requests/entities/authorization-request.entity';
import { StepUpRequiredBody } from '../authorization-requests/step-up-response';
import { Brand } from '../brands/entities/brand.entity';
import { Customer } from '../customers/entities/customer.entity';
import { ProductUnitConversion } from '../products/entities/product-unit-conversion.entity';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { SalesInvoiceLine } from '../sales-invoices/entities/sales-invoice-line.entity';
import {
  SalesInvoice,
  SalesInvoicePostingStatus,
} from '../sales-invoices/entities/sales-invoice.entity';
import { StockCostConsumption } from '../stock/entities/stock-cost-consumption.entity';
import { StockCostLot } from '../stock/entities/stock-cost-lot.entity';
import {
  StockMovement,
  StockMovementType,
} from '../stock/entities/stock-movement.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { User } from '../users/entities/user.entity';
import {
  Warehouse,
  WarehouseType,
} from '../warehouses/entities/warehouse.entity';
import { WarehouseMutationLine } from './entities/warehouse-mutation-line.entity';
import {
  WarehouseMutation,
  WarehouseMutationType,
} from './entities/warehouse-mutation.entity';
import { WarehouseMutationsService } from './warehouse-mutations.service';

/**
 * Integration test terhadap Postgres asli, pola sama
 * opening-balance.service.spec.ts / stock-recorder.service.spec.ts — semua
 * service dikonstruksi manual lewat `new` (bypass Nest DI).
 */
describe('WarehouseMutationsService', () => {
  let dataSource: DataSource;
  let productsService: ProductsService;
  let service: WarehouseMutationsService;
  let authorizationRequestsService: AuthorizationRequestsService;

  let masterUserId: string;
  let operatorUserId: string;
  let supervisorUserId: string;
  let brandId: string;
  let supplierId: string;
  let customerId: string;
  let customerOtherId: string;
  let storeWarehouseId: string;
  let badStockWarehouseId: string;
  let titipanSalesmanId: string;
  let pcsUnitId: string;

  const createdProductIds: string[] = [];
  const createdMutationIds: string[] = [];
  const createdWarehouseIds: string[] = [];
  const createdRequestIds: string[] = [];
  const createdSalesInvoiceIds: string[] = [];

  const masterUser: AuthenticatedUser = {
    sub: '',
    username: 'master',
    role: Role.MASTER,
  };
  const operatorUser: AuthenticatedUser = {
    sub: '',
    username: 'operator',
    role: Role.OPERATOR,
  };
  const supervisorUser: AuthenticatedUser = {
    sub: '',
    username: 'supervisor',
    role: Role.SUPERVISOR,
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
        Supplier,
        Warehouse,
        StockMovement,
        StockCostLot,
        StockCostConsumption,
        AuthorizationRequest,
        WarehouseMutation,
        WarehouseMutationLine,
        SalesInvoice,
        SalesInvoiceLine,
      ],
    });
    await dataSource.initialize();

    productsService = new ProductsService(
      dataSource.getRepository(Product),
      dataSource.getRepository(Brand),
      dataSource,
    );
    const stockRecorderService = new StockRecorderService(
      dataSource,
      productsService,
    );
    const documentCounterService = new DocumentCounterService();
    const periodLockValidatorService = new PeriodLockValidatorService();
    authorizationRequestsService = new AuthorizationRequestsService(
      dataSource.getRepository(AuthorizationRequest),
    );
    const stepUpService = new StepUpService(authorizationRequestsService);

    service = new WarehouseMutationsService(
      dataSource,
      dataSource.getRepository(Warehouse),
      dataSource.getRepository(WarehouseMutation),
      stockRecorderService,
      documentCounterService,
      periodLockValidatorService,
      stepUpService,
    );

    const usersRepo = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('test-password', 4);
    const suffix = Date.now();

    const master = await usersRepo.save(
      usersRepo.create({
        username: `test_wm_master_${suffix}`,
        passwordHash,
        fullName: 'Test WarehouseMutations Master',
        role: Role.MASTER,
        isActive: true,
      }),
    );
    masterUserId = master.id;
    masterUser.sub = masterUserId;

    const operator = await usersRepo.save(
      usersRepo.create({
        username: `test_wm_operator_${suffix}`,
        passwordHash,
        fullName: 'Test WarehouseMutations Operator',
        role: Role.OPERATOR,
        isActive: true,
      }),
    );
    operatorUserId = operator.id;
    operatorUser.sub = operatorUserId;

    const supervisor = await usersRepo.save(
      usersRepo.create({
        username: `test_wm_supervisor_${suffix}`,
        passwordHash,
        fullName: 'Test WarehouseMutations Supervisor',
        role: Role.SUPERVISOR,
        isActive: true,
      }),
    );
    supervisorUserId = supervisor.id;
    supervisorUser.sub = supervisorUserId;

    const brandsRepo = dataSource.getRepository(Brand);
    const brand = await brandsRepo.save(
      brandsRepo.create({
        code: `TWM-${suffix.toString().slice(-8)}`,
        name: 'Merek Uji Mutasi Gudang',
        isActive: true,
      }),
    );
    brandId = brand.id;

    const suppliersRepo = dataSource.getRepository(Supplier);
    const supplier = await suppliersRepo.save(
      suppliersRepo.create({
        displayCode: `SUP-TWM-${suffix.toString().slice(-6)}`,
        name: 'Supplier Uji Mutasi Gudang',
        isPkp: false,
        isActive: true,
      }),
    );
    supplierId = supplier.id;

    const customersRepo = dataSource.getRepository(Customer);
    const customer = await customersRepo.save(
      customersRepo.create({
        code: `CUST-TWM-${suffix.toString().slice(-6)}`,
        name: 'Pelanggan Uji Mutasi Gudang',
        isPkp: false,
        isActive: true,
      }),
    );
    customerId = customer.id;

    const customerOther = await customersRepo.save(
      customersRepo.create({
        code: `CUST-TWM-OTHER-${suffix.toString().slice(-6)}`,
        name: 'Pelanggan Lain Uji Mutasi Gudang',
        isPkp: false,
        isActive: true,
      }),
    );
    customerOtherId = customerOther.id;

    const warehousesRepo = dataSource.getRepository(Warehouse);
    const storeWarehouse = await warehousesRepo.save(
      warehousesRepo.create({
        name: `Toko Uji Mutasi Gudang ${suffix}`,
        warehouseType: WarehouseType.STORE,
        customerId: null,
        isActive: true,
      }),
    );
    storeWarehouseId = storeWarehouse.id;
    createdWarehouseIds.push(storeWarehouseId);

    const badStockWarehouse = await warehousesRepo.save(
      warehousesRepo.create({
        name: `Bad Stock Uji Mutasi Gudang ${suffix}`,
        warehouseType: WarehouseType.BAD_STOCK,
        customerId: null,
        isActive: true,
      }),
    );
    badStockWarehouseId = badStockWarehouse.id;
    createdWarehouseIds.push(badStockWarehouseId);

    // Fixture untuk assertTitipanQtyWithinPurchased() (Hari 31) -- perlu
    // salesman + unit PCS (FK wajib sales_invoices/sales_invoice_lines).
    // Unit PCS dicari (bukan di-hardcode UUID-nya) karena sudah ada di seed.
    const salesmenRows: { id: string }[] = await dataSource.query(
      `INSERT INTO salesmen (code, name) VALUES ($1, 'Salesman Uji Titipan') RETURNING id`,
      [`SLM-TWM-${suffix.toString().slice(-6)}`],
    );
    titipanSalesmanId = salesmenRows[0].id;

    const unitRows: { id: string }[] = await dataSource.query(
      `SELECT id FROM units WHERE UPPER(name) = 'PCS' LIMIT 1`,
    );
    pcsUnitId = unitRows[0].id;
  });

  afterAll(async () => {
    // warehouse_mutation_lines.sales_invoice_line_id (paket R8) mengunci FK
    // ke sales_invoice_lines — mutasi HARUS dihapus dulu sebelum faktur,
    // urutan terbalik dari sebelum R8.
    if (createdMutationIds.length > 0) {
      await dataSource.query(
        `DELETE FROM warehouse_mutation_lines WHERE mutation_id = ANY($1)`,
        [createdMutationIds],
      );
      await dataSource.query(
        `DELETE FROM warehouse_mutations WHERE id = ANY($1)`,
        [createdMutationIds],
      );
    }
    if (createdSalesInvoiceIds.length > 0) {
      await dataSource.query(
        `DELETE FROM sales_invoice_lines WHERE sales_invoice_id = ANY($1)`,
        [createdSalesInvoiceIds],
      );
      await dataSource.query(`DELETE FROM sales_invoices WHERE id = ANY($1)`, [
        createdSalesInvoiceIds,
      ]);
    }
    if (titipanSalesmanId) {
      await dataSource.query(`DELETE FROM salesmen WHERE id = $1`, [
        titipanSalesmanId,
      ]);
    }
    if (createdRequestIds.length > 0) {
      await dataSource.query(
        `DELETE FROM authorization_requests WHERE id = ANY($1)`,
        [createdRequestIds],
      );
    }
    // Gudang titipan yang dibuat get-or-create juga perlu dibersihkan.
    const titipanRows: { id: string }[] = await dataSource.query(
      `SELECT id FROM warehouses WHERE customer_id = ANY($1)`,
      [[customerId, customerOtherId]],
    );
    const allWarehouseIds = [
      ...createdWarehouseIds,
      ...titipanRows.map((r) => r.id),
    ];
    if (createdProductIds.length > 0) {
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
      allWarehouseIds,
    ]);
    await dataSource.query('DELETE FROM customers WHERE id = ANY($1)', [
      [customerId, customerOtherId],
    ]);
    await dataSource.query('DELETE FROM suppliers WHERE id = $1', [supplierId]);
    await dataSource.query('DELETE FROM brands WHERE id = $1', [brandId]);
    await dataSource.query('DELETE FROM audit_logs WHERE user_id = ANY($1)', [
      [masterUserId, operatorUserId, supervisorUserId],
    ]);
    await dataSource.query('DELETE FROM users WHERE id = ANY($1)', [
      [masterUserId, operatorUserId, supervisorUserId],
    ]);
    await dataSource.destroy();
  });

  interface InvoiceFixture {
    invoiceId: string;
    invoiceNumber: string;
    lineId: string;
  }

  /**
   * Fixture "pelanggan sudah membeli produk ini sebanyak `qtyBaseUnit` lewat
   * satu baris faktur POSTED" -- dipakai
   * assertTitipanQtyWithinInvoiceLine() (paket R8, menggantikan
   * assertTitipanQtyWithinPurchased() Hari 31). Mengembalikan id baris
   * faktur karena kuota sekarang per BARIS, bukan lagi per produk lintas
   * faktur (docs/RENCANA_REVISI_TESTING_KLIEN.md §2A K7).
   */
  async function purchaseFixture(
    productId: string,
    qtyBaseUnit: number,
    opts?: { customerId?: string; voided?: boolean },
  ): Promise<InvoiceFixture> {
    const forCustomerId = opts?.customerId ?? customerId;
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const invoiceNumber = `JL-TWM-${suffix}`;
    const postingStatus = opts?.voided
      ? SalesInvoicePostingStatus.VOIDED
      : SalesInvoicePostingStatus.POSTED;
    const invoiceRows: { id: string }[] = await dataSource.query(
      `INSERT INTO sales_invoices
         (invoice_number, invoice_date, customer_id, sales_channel, salesman_id, due_date, subtotal, total_amount, posting_status, created_by)
       VALUES ($1, '2026-08-01', $2, 'TOKO', $3, '2026-08-01', $4, $4, $5, $6)
       RETURNING id`,
      [
        invoiceNumber,
        forCustomerId,
        titipanSalesmanId,
        qtyBaseUnit * 1000,
        postingStatus,
        masterUserId,
      ],
    );
    const invoiceId = invoiceRows[0].id;
    createdSalesInvoiceIds.push(invoiceId);
    const lineRows: { id: string }[] = await dataSource.query(
      `INSERT INTO sales_invoice_lines
         (sales_invoice_id, customer_id, line_order, product_id, unit_id, qty_input, qty_base_unit, unit_price, net_amount)
       VALUES ($1, $2, 1, $3, $4, $5, $5, 1000, $6)
       RETURNING id`,
      [
        invoiceId,
        forCustomerId,
        productId,
        pcsUnitId,
        qtyBaseUnit,
        qtyBaseUnit * 1000,
      ],
    );
    return { invoiceId, invoiceNumber, lineId: lineRows[0].id };
  }

  async function createTestProduct(keterangan: string): Promise<string> {
    const product = await productsService.create({
      brandId,
      keterangan: `${keterangan} ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      baseUnit: 'PCS',
      unitConversions: [],
    });
    createdProductIds.push(product.id);
    return product.id;
  }

  async function recordInFixtureStock(
    productId: string,
    warehouseId: string,
    qtyBaseUnit: number,
    unitCost: number,
  ): Promise<void> {
    const stockRecorderService = new StockRecorderService(
      dataSource,
      productsService,
    );
    await dataSource.transaction((manager) =>
      stockRecorderService.recordIn(
        {
          productId,
          warehouseId,
          qtyBaseUnit,
          unitCost,
          lotDate: new Date('2026-08-01'),
          movementDate: new Date('2026-08-01'),
          movementType: StockMovementType.PURCHASE,
          supplierId,
          sourceType: 'PURCHASE_INVOICE',
          sourceId: null,
          createdBy: masterUserId,
        },
        manager,
      ),
    );
  }

  it('mutasi ke TITIPAN_PELANGGAN -> 0 stock_movements/journal_entries, gudang titipan direuse untuk customer yang sama', async () => {
    const productId = await createTestProduct('Produk Titipan');
    // Baris faktur qty 10 -- titipan 5 lalu 2 (total 7) harus lolos.
    const invoice = await purchaseFixture(productId, 10);

    const first = await service.create(
      {
        customerId,
        salesInvoiceId: invoice.invoiceId,
        fromWarehouseId: storeWarehouseId,
        lines: [
          { productId, qtyBaseUnit: 5, salesInvoiceLineId: invoice.lineId },
        ],
      },
      masterUser,
      undefined,
    );
    createdMutationIds.push(first.mutation.id);

    expect(first.mutation.mutationType).toBe(
      WarehouseMutationType.TITIPAN_PELANGGAN,
    );
    expect(first.mutation.salesInvoiceId).toBe(invoice.invoiceId);
    expect(first.lines).toHaveLength(1);
    expect(first.lines[0].salesInvoiceLineId).toBe(invoice.lineId);
    expect(first.lines[0].unitCost).toBeNull();
    expect(first.lines[0].movementOutId).toBeNull();
    expect(first.lines[0].movementInId).toBeNull();

    const movements: unknown[] = await dataSource.query(
      `SELECT id FROM stock_movements WHERE source_type = 'WAREHOUSE_MUTATION' AND source_id = $1`,
      [first.mutation.id],
    );
    expect(movements).toHaveLength(0);

    const journalLines: unknown[] = await dataSource.query(
      `SELECT jel.id FROM journal_entry_lines jel
         JOIN journal_entries je ON je.id = jel.journal_entry_id
        WHERE je.source_type = 'WAREHOUSE_MUTATION' AND je.source_id = $1`,
      [first.mutation.id],
    );
    expect(journalLines).toHaveLength(0);

    const titipanWarehouse = await dataSource
      .getRepository(Warehouse)
      .findOneOrFail({ where: { id: first.mutation.toWarehouseId } });
    expect(titipanWarehouse.warehouseType).toBe(
      WarehouseType.TITIPAN_PELANGGAN,
    );
    expect(titipanWarehouse.customerId).toBe(customerId);

    // Mutasi titipan kedua untuk customer yang sama -> reuse gudang, bukan bikin baru.
    const second = await service.create(
      {
        customerId,
        salesInvoiceId: invoice.invoiceId,
        fromWarehouseId: storeWarehouseId,
        lines: [
          { productId, qtyBaseUnit: 2, salesInvoiceLineId: invoice.lineId },
        ],
      },
      masterUser,
      undefined,
    );
    createdMutationIds.push(second.mutation.id);
    expect(second.mutation.toWarehouseId).toBe(first.mutation.toWarehouseId);
  });

  it('titipan ditolak kalau qty kumulatif melebihi qty pada baris faktur, pesan menyebut nomor faktur (paket R8)', async () => {
    const productId = await createTestProduct('Produk Titipan Ditolak');
    const invoice = await purchaseFixture(productId, 3);

    await expect(
      service.create(
        {
          customerId,
          salesInvoiceId: invoice.invoiceId,
          fromWarehouseId: storeWarehouseId,
          lines: [
            { productId, qtyBaseUnit: 5, salesInvoiceLineId: invoice.lineId },
          ],
        },
        masterUser,
        undefined,
      ),
    ).rejects.toThrow(
      new RegExp(
        `melebihi qty pada baris faktur ${invoice.invoiceNumber.replace('/', '\\/')}`,
      ),
    );

    // Titipan persis 3 (== qty baris faktur) tetap harus lolos -- batasnya
    // "<=", bukan "<".
    const exact = await service.create(
      {
        customerId,
        salesInvoiceId: invoice.invoiceId,
        fromWarehouseId: storeWarehouseId,
        lines: [
          { productId, qtyBaseUnit: 3, salesInvoiceLineId: invoice.lineId },
        ],
      },
      masterUser,
      undefined,
    );
    createdMutationIds.push(exact.mutation.id);
    expect(exact.lines).toHaveLength(1);
  });

  it('titipan 5 lalu 6 di baris faktur qty 10 -> baris kedua 400, produk sama dari faktur BERBEDA tetap 201 (paket R8 K7)', async () => {
    const productId = await createTestProduct('Produk Titipan Multi Faktur');
    const invoiceA = await purchaseFixture(productId, 10);
    const invoiceB = await purchaseFixture(productId, 10);

    const first = await service.create(
      {
        customerId,
        salesInvoiceId: invoiceA.invoiceId,
        fromWarehouseId: storeWarehouseId,
        lines: [
          { productId, qtyBaseUnit: 5, salesInvoiceLineId: invoiceA.lineId },
        ],
      },
      masterUser,
      undefined,
    );
    createdMutationIds.push(first.mutation.id);

    // 6 lagi atas BARIS YANG SAMA (invoiceA) -> 400 (5 + 6 > 10).
    await expect(
      service.create(
        {
          customerId,
          salesInvoiceId: invoiceA.invoiceId,
          fromWarehouseId: storeWarehouseId,
          lines: [
            {
              productId,
              qtyBaseUnit: 6,
              salesInvoiceLineId: invoiceA.lineId,
            },
          ],
        },
        masterUser,
        undefined,
      ),
    ).rejects.toThrow(/melebihi qty pada baris faktur/);

    // Produk yang SAMA tapi dari FAKTUR LAIN (invoiceB) tidak lagi berbagi
    // kuota dengan invoiceA -- ini yang rusak di assertTitipanQtyWithinPurchased()
    // lama (per produk lintas faktur).
    const second = await service.create(
      {
        customerId,
        salesInvoiceId: invoiceB.invoiceId,
        fromWarehouseId: storeWarehouseId,
        lines: [
          { productId, qtyBaseUnit: 8, salesInvoiceLineId: invoiceB.lineId },
        ],
      },
      masterUser,
      undefined,
    );
    createdMutationIds.push(second.mutation.id);
    expect(second.lines).toHaveLength(1);
  });

  it('mutasi titipan tanpa salesInvoiceId -> 400', async () => {
    const productId = await createTestProduct('Produk Titipan Tanpa Faktur');

    await expect(
      service.create(
        {
          customerId,
          fromWarehouseId: storeWarehouseId,
          lines: [{ productId, qtyBaseUnit: 1 }],
        },
        masterUser,
        undefined,
      ),
    ).rejects.toThrow();
  });

  it('salesInvoiceId milik pelanggan lain -> 400', async () => {
    const productId = await createTestProduct(
      'Produk Titipan Faktur Beda Pelanggan',
    );
    const invoice = await purchaseFixture(productId, 10, {
      customerId: customerOtherId,
    });

    await expect(
      service.create(
        {
          customerId,
          salesInvoiceId: invoice.invoiceId,
          fromWarehouseId: storeWarehouseId,
          lines: [
            { productId, qtyBaseUnit: 1, salesInvoiceLineId: invoice.lineId },
          ],
        },
        masterUser,
        undefined,
      ),
    ).rejects.toThrow(/bukan milik pelanggan/);
  });

  it('salesInvoiceId sudah VOIDED -> 400', async () => {
    const productId = await createTestProduct('Produk Titipan Faktur Void');
    const invoice = await purchaseFixture(productId, 10, { voided: true });

    await expect(
      service.create(
        {
          customerId,
          salesInvoiceId: invoice.invoiceId,
          fromWarehouseId: storeWarehouseId,
          lines: [
            { productId, qtyBaseUnit: 1, salesInvoiceLineId: invoice.lineId },
          ],
        },
        masterUser,
        undefined,
      ),
    ).rejects.toThrow(/dibatalkan \(VOID\)/);
  });

  it('STORE -> BAD_STOCK: lot tujuan ber-unit_cost identik dengan lot asal, nomor berformat GD/...', async () => {
    const productId = await createTestProduct('Produk Transfer BS');
    await recordInFixtureStock(productId, storeWarehouseId, 10, 700);

    const result = await service.create(
      {
        fromWarehouseId: storeWarehouseId,
        toWarehouseId: badStockWarehouseId,
        lines: [{ productId, qtyBaseUnit: 4 }],
      },
      masterUser,
      undefined,
    );
    createdMutationIds.push(result.mutation.id);

    expect(result.mutation.mutationType).toBe(WarehouseMutationType.TRANSFER);
    expect(result.mutation.mutationNumber).toMatch(/^GD\/[^/]+-\d{8}$/);
    expect(result.lines).toHaveLength(1);
    expect(Number(result.lines[0].unitCost)).toBe(700);
    expect(result.lines[0].movementOutId).not.toBeNull();
    expect(result.lines[0].movementInId).not.toBeNull();

    const destLots: { unit_cost: string }[] = await dataSource.query(
      `SELECT unit_cost FROM stock_cost_lots WHERE product_id = $1 AND warehouse_id = $2`,
      [productId, badStockWarehouseId],
    );
    expect(destLots).toHaveLength(1);
    expect(Number(destLots[0].unit_cost)).toBe(700);

    const movements: unknown[] = await dataSource.query(
      `SELECT id FROM stock_movements WHERE source_type = 'WAREHOUSE_MUTATION' AND source_id = $1`,
      [result.mutation.id],
    );
    expect(movements).toHaveLength(2);

    console.log('--- stock_cost_lots setelah STORE -> BAD_STOCK ---');
    console.log(
      await dataSource.query(
        `SELECT warehouse_id, unit_cost, qty_remaining FROM stock_cost_lots WHERE product_id = $1`,
        [productId],
      ),
    );
  });

  it('BAD_STOCK -> STORE tanpa authorizationRequestId -> 412; setelah approve + retry -> sukses', async () => {
    const productId = await createTestProduct('Produk Transfer BS ke Store');
    await recordInFixtureStock(productId, badStockWarehouseId, 6, 300);

    const dto = {
      fromWarehouseId: badStockWarehouseId,
      toWarehouseId: storeWarehouseId,
      lines: [{ productId, qtyBaseUnit: 2 }],
    };

    let stepUpBody: StepUpRequiredBody | undefined;
    try {
      await service.create(dto, operatorUser, undefined);
      throw new Error('Seharusnya melempar 412 sebelum approval.');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(412);
      stepUpBody = httpErr.getResponse() as StepUpRequiredBody;
    }
    expect(stepUpBody?.requiresAuthorization).toBe(true);
    const authorizationRequestId = stepUpBody.authorizationRequestId;
    createdRequestIds.push(authorizationRequestId);

    await authorizationRequestsService.approve(
      authorizationRequestId,
      supervisorUser,
    );

    const result = await service.create(
      dto,
      operatorUser,
      authorizationRequestId,
    );
    createdMutationIds.push(result.mutation.id);

    expect(result.mutation.mutationType).toBe(WarehouseMutationType.TRANSFER);
    expect(result.lines).toHaveLength(1);
    expect(Number(result.lines[0].unitCost)).toBe(300);

    const movements: unknown[] = await dataSource.query(
      `SELECT id FROM stock_movements WHERE source_type = 'WAREHOUSE_MUTATION' AND source_id = $1`,
      [result.mutation.id],
    );
    expect(movements).toHaveLength(2);
  });

  it('kombinasi gudang tidak valid (STORE -> STORE) -> BadRequestException', async () => {
    const productId = await createTestProduct('Produk Kombinasi Invalid');

    await expect(
      service.create(
        {
          fromWarehouseId: storeWarehouseId,
          toWarehouseId: storeWarehouseId,
          lines: [{ productId, qtyBaseUnit: 1 }],
        },
        masterUser,
        undefined,
      ),
    ).rejects.toThrow(/kombinasi gudang/i);
  });

  it('findTitipanFakturForCustomer/findTitipanFakturLines: dipakai layar entri titipan (paket R8), sisa berkurang setelah submit', async () => {
    const productId = await createTestProduct('Produk Titipan Lookup');
    const invoice = await purchaseFixture(productId, 10);

    const before = await service.findTitipanFakturForCustomer(customerId);
    expect(before.some((f) => f.id === invoice.invoiceId)).toBe(true);

    const linesBefore = await service.findTitipanFakturLines(invoice.invoiceId);
    const lineBefore = linesBefore.find((l) => l.id === invoice.lineId)!;
    expect(lineBefore.qtyBaseUnit).toBe(10);
    expect(lineBefore.alreadyTitipanQtyBaseUnit).toBe(0);
    expect(lineBefore.remainingQtyBaseUnit).toBe(10);

    const mutation = await service.create(
      {
        customerId,
        salesInvoiceId: invoice.invoiceId,
        fromWarehouseId: storeWarehouseId,
        lines: [
          { productId, qtyBaseUnit: 10, salesInvoiceLineId: invoice.lineId },
        ],
      },
      masterUser,
      undefined,
    );
    createdMutationIds.push(mutation.mutation.id);

    const linesAfter = await service.findTitipanFakturLines(invoice.invoiceId);
    const lineAfter = linesAfter.find((l) => l.id === invoice.lineId)!;
    expect(lineAfter.alreadyTitipanQtyBaseUnit).toBe(10);
    expect(lineAfter.remainingQtyBaseUnit).toBe(0);

    // Faktur yang qty-nya sudah habis dititip TIDAK BOLEH lagi muncul di
    // daftar faktur eligible (DoD: "hanya faktur ... yang masih punya sisa").
    const after = await service.findTitipanFakturForCustomer(customerId);
    expect(after.some((f) => f.id === invoice.invoiceId)).toBe(false);
  });
});
