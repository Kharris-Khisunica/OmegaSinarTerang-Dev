import { HttpException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource, EntityManager } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { SalesChannel } from '../../common/enums/sales-channel.enum';
import { AccountResolverService } from '../../core/account-resolver/account-resolver.service';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { DocumentReviseService } from '../../core/document-revise/document-revise.service';
import { JournalPosterService } from '../../core/journal-poster/journal-poster.service';
import { PeriodLockValidatorService } from '../../core/period-lock/period-lock-validator.service';
import { PrintLockService } from '../../core/print-lock/print-lock.service';
import { ArAccountResolverService } from '../../core/receivables/ar-account-resolver.service';
import { StepUpService } from '../../core/step-up/step-up.service';
import { StockRecorderService } from '../../core/stock-recorder/stock-recorder.service';
import { TaxRateResolverService } from '../../core/tax-rates/tax-rate-resolver.service';
import { VoidEngineService } from '../../core/void/void.service';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { AuthorizationRequestsService } from '../authorization-requests/authorization-requests.service';
import { AuthorizationRequest } from '../authorization-requests/entities/authorization-request.entity';
import { StepUpRequiredBody } from '../authorization-requests/step-up-response';
import { Brand } from '../brands/entities/brand.entity';
import { ChartOfAccount } from '../chart-of-accounts/entities/chart-of-account.entity';
import { Customer } from '../customers/entities/customer.entity';
import { JournalEntryLine } from '../journal-entries/entities/journal-entry-line.entity';
import { JournalEntry } from '../journal-entries/entities/journal-entry.entity';
import { ProductUnitConversion } from '../products/entities/product-unit-conversion.entity';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { Salesman } from '../salesmen/entities/salesman.entity';
import { SalesOrderLine } from '../sales-orders/entities/sales-order-line.entity';
import { SalesOrder } from '../sales-orders/entities/sales-order.entity';
import { SalesOrdersService } from '../sales-orders/sales-orders.service';
import { StockCostConsumption } from '../stock/entities/stock-cost-consumption.entity';
import { StockCostLot } from '../stock/entities/stock-cost-lot.entity';
import {
  StockMovement,
  StockMovementType,
} from '../stock/entities/stock-movement.entity';
import { TaxRate } from '../tax-rates/entities/tax-rate.entity';
import { Unit } from '../units/entities/unit.entity';
import { User } from '../users/entities/user.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { CreateSalesInvoiceDto } from './dto/create-sales-invoice.dto';
import { VoidSalesInvoiceDto } from './dto/void-sales-invoice.dto';
import { SalesInvoiceLine } from './entities/sales-invoice-line.entity';
import {
  SalesInvoice,
  SalesInvoicePostingStatus,
  SalesInvoicePrintStatus,
  SalesInvoiceReviewStatus,
} from './entities/sales-invoice.entity';
import { SalesInvoiceVoidHook } from './sales-invoice-void.hook';
import { SalesInvoicesService } from './sales-invoices.service';

/**
 * Integration test terhadap Postgres asli, pola sama
 * purchase-invoices.service.spec.ts — semua service dikonstruksi manual
 * lewat `new` (bypass Nest DI). Tidak membuat warehouse STORE sendiri — dev
 * DB sudah punya tepat satu STORE aktif ber-is_default=true.
 */
describe('SalesInvoicesService', () => {
  let dataSource: DataSource;
  let productsService: ProductsService;
  let stockRecorderService: StockRecorderService;
  let salesOrdersService: SalesOrdersService;
  let authorizationRequestsService: AuthorizationRequestsService;
  let service: SalesInvoicesService;

  let masterUserId: string;
  let operatorUserId: string;
  let supervisorUserId: string;
  let brandId: string;
  let dusUnitId: string;
  let pcsUnitId: string;
  let storeWarehouseId: string;

  const createdProductIds: string[] = [];
  const createdCustomerIds: string[] = [];
  const createdSalesmanIds: string[] = [];
  const createdInvoiceIds: string[] = [];
  const createdSalesOrderIds: string[] = [];
  const createdTaxRateIds: string[] = [];
  const createdRequestIds: string[] = [];

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
        Salesman,
        Warehouse,
        Unit,
        ChartOfAccount,
        JournalEntry,
        JournalEntryLine,
        StockMovement,
        StockCostLot,
        StockCostConsumption,
        TaxRate,
        SalesOrder,
        SalesOrderLine,
        SalesInvoice,
        SalesInvoiceLine,
        AuthorizationRequest,
      ],
    });
    await dataSource.initialize();

    productsService = new ProductsService(
      dataSource.getRepository(Product),
      dataSource.getRepository(Brand),
      dataSource,
    );
    stockRecorderService = new StockRecorderService(
      dataSource,
      productsService,
    );
    const documentCounterService = new DocumentCounterService();
    const periodLockValidatorService = new PeriodLockValidatorService();
    const journalPosterService = new JournalPosterService(
      documentCounterService,
      periodLockValidatorService,
    );
    const accountResolverService = new AccountResolverService(dataSource);
    const arAccountResolverService = new ArAccountResolverService(dataSource);
    const taxRateResolverService = new TaxRateResolverService(dataSource);
    authorizationRequestsService = new AuthorizationRequestsService(
      dataSource.getRepository(AuthorizationRequest),
    );
    const stepUpService = new StepUpService(authorizationRequestsService);
    salesOrdersService = new SalesOrdersService(
      dataSource,
      dataSource.getRepository(SalesOrder),
      documentCounterService,
      periodLockValidatorService,
    );
    const printLockService = new PrintLockService(dataSource, stepUpService);
    const voidEngineService = new VoidEngineService(
      journalPosterService,
      stockRecorderService,
    );
    const voidHook = new SalesInvoiceVoidHook(voidEngineService);
    voidHook.onModuleInit();
    const documentReviseService = new DocumentReviseService(
      journalPosterService,
      stockRecorderService,
      periodLockValidatorService,
    );

    service = new SalesInvoicesService(
      dataSource,
      dataSource.getRepository(SalesInvoice),
      documentCounterService,
      stockRecorderService,
      journalPosterService,
      accountResolverService,
      arAccountResolverService,
      taxRateResolverService,
      stepUpService,
      salesOrdersService,
      printLockService,
      voidEngineService,
      documentReviseService,
    );

    const suffix = Date.now();

    const usersRepo = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('test-password', 4);
    const master = await usersRepo.save(
      usersRepo.create({
        username: `test_si_master_${suffix}`,
        passwordHash,
        fullName: 'Test SalesInvoices Master',
        role: Role.MASTER,
        isActive: true,
      }),
    );
    masterUserId = master.id;
    masterUser.sub = masterUserId;

    const operator = await usersRepo.save(
      usersRepo.create({
        username: `test_si_operator_${suffix}`,
        passwordHash,
        fullName: 'Test SalesInvoices Operator',
        role: Role.OPERATOR,
        isActive: true,
      }),
    );
    operatorUserId = operator.id;
    operatorUser.sub = operatorUserId;

    const supervisor = await usersRepo.save(
      usersRepo.create({
        username: `test_si_supervisor_${suffix}`,
        passwordHash,
        fullName: 'Test SalesInvoices Supervisor',
        role: Role.SUPERVISOR,
        isActive: true,
      }),
    );
    supervisorUserId = supervisor.id;
    supervisorUser.sub = supervisorUserId;

    const storeWarehouse = await dataSource
      .getRepository(Warehouse)
      .findOneOrFail({ where: { isDefault: true, isActive: true } });
    storeWarehouseId = storeWarehouse.id;

    const brandsRepo = dataSource.getRepository(Brand);
    const brand = await brandsRepo.save(
      brandsRepo.create({
        code: `TSI-${suffix.toString().slice(-8)}`,
        name: 'Merek Uji Faktur Penjualan',
        isActive: true,
      }),
    );
    brandId = brand.id;

    const unitsRepo = dataSource.getRepository(Unit);
    const dusUnit = await unitsRepo.save(
      unitsRepo.create({
        code: `DUS-TSI-${suffix.toString().slice(-6)}`,
        name: 'DUS',
        isActive: true,
      }),
    );
    dusUnitId = dusUnit.id;
    // Satuan = base unit produk uji (PCS) sendiri, faktor konversi = 1 —
    // memudahkan hitung manual angka batas jual-rugi tanpa faktor kali.
    const pcsUnit = await unitsRepo.save(
      unitsRepo.create({
        code: `PCS-TSI-${suffix.toString().slice(-6)}`,
        name: 'PCS',
        isActive: true,
      }),
    );
    pcsUnitId = pcsUnit.id;
  });

  afterAll(async () => {
    if (createdRequestIds.length > 0) {
      await dataSource.query(
        `DELETE FROM authorization_requests WHERE id = ANY($1)`,
        [createdRequestIds],
      );
    }
    if (createdInvoiceIds.length > 0) {
      // VOID (Hari 22) menulis journal_entries reversal ber-reversed_entry_id
      // menunjuk entry asli (self-FK NOT DEFERRABLE) — anak dulu, baru induk.
      await dataSource.query(
        `DELETE FROM journal_entry_lines WHERE journal_entry_id IN (
           SELECT id FROM journal_entries WHERE source_type = 'SALES_INVOICE' AND source_id = ANY($1)
           UNION
           SELECT id FROM journal_entries WHERE reversed_entry_id IN (
             SELECT id FROM journal_entries WHERE source_type = 'SALES_INVOICE' AND source_id = ANY($1)
           )
         )`,
        [createdInvoiceIds],
      );
      await dataSource.query(
        `DELETE FROM journal_entries WHERE reversed_entry_id IN (
           SELECT id FROM journal_entries WHERE source_type = 'SALES_INVOICE' AND source_id = ANY($1)
         )`,
        [createdInvoiceIds],
      );
      await dataSource.query(
        `DELETE FROM journal_entries WHERE source_type = 'SALES_INVOICE' AND source_id = ANY($1)`,
        [createdInvoiceIds],
      );
      await dataSource.query(
        `DELETE FROM sales_invoice_lines WHERE sales_invoice_id = ANY($1)`,
        [createdInvoiceIds],
      );
      await dataSource.query(`DELETE FROM sales_invoices WHERE id = ANY($1)`, [
        createdInvoiceIds,
      ]);
    }
    if (createdSalesOrderIds.length > 0) {
      await dataSource.query(
        `DELETE FROM sales_order_lines WHERE sales_order_id = ANY($1)`,
        [createdSalesOrderIds],
      );
      await dataSource.query(`DELETE FROM sales_orders WHERE id = ANY($1)`, [
        createdSalesOrderIds,
      ]);
    }
    if (createdProductIds.length > 0) {
      await dataSource.query(
        `DELETE FROM stock_cost_consumptions WHERE lot_id IN (SELECT id FROM stock_cost_lots WHERE product_id = ANY($1))`,
        [createdProductIds],
      );
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
    if (createdTaxRateIds.length > 0) {
      await dataSource.query(`DELETE FROM tax_rates WHERE id = ANY($1)`, [
        createdTaxRateIds,
      ]);
    }
    if (createdCustomerIds.length > 0) {
      await dataSource.query(`DELETE FROM customers WHERE id = ANY($1)`, [
        createdCustomerIds,
      ]);
    }
    if (createdSalesmanIds.length > 0) {
      await dataSource.query(`DELETE FROM salesmen WHERE id = ANY($1)`, [
        createdSalesmanIds,
      ]);
    }
    await dataSource.query(`DELETE FROM units WHERE id = ANY($1)`, [
      [dusUnitId, pcsUnitId],
    ]);
    await dataSource.query(`DELETE FROM brands WHERE id = $1`, [brandId]);
    const testUserIds = [masterUserId, operatorUserId, supervisorUserId];
    await dataSource.query('DELETE FROM audit_logs WHERE user_id = ANY($1)', [
      testUserIds,
    ]);
    await dataSource.query('DELETE FROM users WHERE id = ANY($1)', [
      testUserIds,
    ]);
    await dataSource.destroy();
  });

  async function createTestProduct(label: string): Promise<string> {
    const product = await productsService.create({
      brandId,
      keterangan: `${label} ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      baseUnit: 'PCS',
      isBkp: true,
      unitConversions: [{ unitName: 'DUS', qtyInBaseUnit: 12, level: 1 }],
    });
    createdProductIds.push(product.id);
    return product.id;
  }

  async function createTestCustomer(isPkp = false): Promise<string> {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const customer = await dataSource.getRepository(Customer).save(
      dataSource.getRepository(Customer).create({
        code: `CUST-TSI-${suffix}`,
        name: `Pelanggan Uji Faktur Penjualan ${suffix}`,
        isPkp,
        isActive: true,
      }),
    );
    createdCustomerIds.push(customer.id);
    return customer.id;
  }

  async function createTestSalesman(): Promise<string> {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const salesman = await dataSource.getRepository(Salesman).save(
      dataSource.getRepository(Salesman).create({
        code: `SLM-TSI-${suffix}`,
        name: `Salesman Uji ${suffix}`,
        isActive: true,
      }),
    );
    createdSalesmanIds.push(salesman.id);
    return salesman.id;
  }

  async function seedTaxRate(ratePercent: number): Promise<void> {
    const taxRate = await dataSource.getRepository(TaxRate).save(
      dataSource.getRepository(TaxRate).create({
        name: `PPN ${ratePercent}% (uji faktur penjualan)`,
        rate: ratePercent.toFixed(2),
        effectiveFrom: '2020-01-01',
        effectiveTo: null,
      }),
    );
    createdTaxRateIds.push(taxRate.id);
  }

  async function seedPurchaseLot(
    productId: string,
    qtyBaseUnit: number,
    unitCost: number,
    lotDateIso: string,
  ): Promise<void> {
    await dataSource.transaction((manager) =>
      stockRecorderService.recordIn(
        {
          productId,
          warehouseId: storeWarehouseId,
          qtyBaseUnit,
          unitCost,
          lotDate: new Date(lotDateIso),
          movementDate: new Date(lotDateIso),
          movementType: StockMovementType.PURCHASE,
          sourceType: 'PURCHASE_INVOICE',
          sourceId: null,
          createdBy: masterUserId,
        },
        manager,
      ),
    );
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

  async function unlockAndRetry<T>(
    call: (authorizationRequestId?: string) => Promise<T>,
    requester: AuthenticatedUser,
  ): Promise<T> {
    let stepUpBody: StepUpRequiredBody | undefined;
    try {
      await call(undefined);
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
    void requester;
    return call(authorizationRequestId);
  }

  it('faktur 3 baris tanpa lot (tanpa batas jual-rugi) -> total Rp 34.050.000 tersimpan APA ADANYA, jurnal balance dengan customerId di baris Piutang, TANPA baris Diskon Penjualan (diskon DI-DROP, paket R5)', async () => {
    const customerId = await createTestCustomer(false);
    const salesmanId = await createTestSalesman();
    const productA = await createTestProduct('Produk A');
    const productB = await createTestProduct('Produk B');
    const productC = await createTestProduct('Produk C');

    const invoiceDate = daysAgoIso(0);
    const dto: CreateSalesInvoiceDto = {
      customerId,
      salesChannel: SalesChannel.TOKO,
      salesmanId,
      invoiceDate,
      termDays: 30,
      lines: [
        {
          productId: productA,
          unitId: pcsUnitId,
          qtyInput: 10,
          unitPrice: 1000000,
        }, // gross/net 10.000.000
        {
          productId: productB,
          unitId: pcsUnitId,
          qtyInput: 25,
          unitPrice: 650000,
        }, // gross/net 16.250.000
        {
          productId: productC,
          unitId: pcsUnitId,
          qtyInput: 3,
          unitPrice: 2600000,
        }, // gross/net 7.800.000
      ],
    };

    const result = await service.create(dto, masterUser, undefined);
    createdInvoiceIds.push(result.salesInvoice.id);

    expect(result.salesInvoice.invoiceNumber).toMatch(/^JL\/[^/]+-\d{8}$/);
    // subtotal = 10.000.000 + 16.250.000 + 7.800.000 = 34.050.000 (tanpa diskon)
    expect(Number(result.salesInvoice.subtotal)).toBe(34_050_000);
    // total = subtotal - diskon faktur (0, DI-DROP) + ppn (0, company non-PKP) = 34.050.000
    expect(Number(result.salesInvoice.totalAmount)).toBe(34_050_000);

    for (const line of result.lines) {
      expect(Number(line.unitCostFifo)).toBe(0); // belum pernah dibeli -> fallback cost 0
    }

    const totalDebit = result.journalEntry.lines.reduce(
      (sum, l) => sum + Number(l.debitAmount),
      0,
    );
    const totalCredit = result.journalEntry.lines.reduce(
      (sum, l) => sum + Number(l.creditAmount),
      0,
    );
    expect(totalDebit).toBe(totalCredit);

    const arLine = result.journalEntry.lines.find(
      (l) => Number(l.debitAmount) === 34_050_000,
    );
    expect(arLine).toBeDefined();
    const arLineRows: { customer_id: string }[] = await dataSource.query(
      `SELECT customer_id FROM journal_entry_lines WHERE id = $1`,
      [arLine!.id],
    );
    expect(arLineRows[0].customer_id).toBe(customerId);

    // Tidak ada HPP/Persediaan (totalCogsCents=0, produk belum pernah dibeli).
    const inventoryOrCogsLines = result.journalEntry.lines.filter(
      (l) => Number(l.debitAmount) === 0 && Number(l.creditAmount) === 0,
    );
    expect(inventoryOrCogsLines).toHaveLength(0);

    // Hanya 2 baris (Piutang + Pendapatan) -- BUKTI baris "Diskon Penjualan"
    // tidak pernah terbentuk sama sekali (JournalPosterService menolak baris
    // bernilai nol di kedua sisi, jadi totalDiscountCents=0 -> baris itu
    // dilewati di sales-invoices.service.ts), bukan cuma diasumsikan.
    expect(result.journalEntry.lines).toHaveLength(2);
    const discountAccountRows: { count: string }[] = await dataSource.query(
      `SELECT COUNT(*)::text AS count
       FROM journal_entry_lines jel
       JOIN chart_of_accounts coa ON coa.id = jel.account_id
       WHERE jel.journal_entry_id = $1 AND coa.is_sales_discount_account = true`,
      [result.journalEntry.id],
    );
    expect(Number(discountAccountRows[0].count)).toBe(0);
  });

  it('diskon penjualan (header maupun baris) dikirim dengan nilai != 0 -> ditolak 400 pesan Indonesia (diskon DI-DROP, paket R5)', async () => {
    const customerId = await createTestCustomer(false);
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Diskon Ditolak');
    const baseLine = {
      productId,
      unitId: pcsUnitId,
      qtyInput: 1,
      unitPrice: 10000,
    };
    const baseDto = {
      customerId,
      salesChannel: SalesChannel.TOKO,
      salesmanId,
      invoiceDate: daysAgoIso(0),
      termDays: 0,
    } as const;
    const expectedMessage =
      /Diskon penjualan sudah tidak dipakai — masukkan harga bersih langsung di kolom Harga\./;

    await expect(
      service.create(
        { ...baseDto, invoiceDiscountAmount: 5000, lines: [baseLine] },
        masterUser,
        undefined,
      ),
    ).rejects.toThrow(expectedMessage);

    await expect(
      service.create(
        { ...baseDto, invoiceDiscountPercent: 5, lines: [baseLine] },
        masterUser,
        undefined,
      ),
    ).rejects.toThrow(expectedMessage);

    await expect(
      service.create(
        {
          ...baseDto,
          lines: [{ ...baseLine, discountAmount: 1000 }],
        },
        masterUser,
        undefined,
      ),
    ).rejects.toThrow(expectedMessage);

    await expect(
      service.create(
        {
          ...baseDto,
          lines: [{ ...baseLine, discountPercent: 10 }],
        },
        masterUser,
        undefined,
      ),
    ).rejects.toThrow(expectedMessage);

    // Diskon 0 eksplisit (bukan hanya "tidak dikirim") tetap DIIZINKAN --
    // kolom dipertahankan di skema, faktur baru hanya dilarang mengisinya
    // dengan nilai != 0.
    const okResult = await service.create(
      {
        ...baseDto,
        invoiceDiscountAmount: 0,
        lines: [{ ...baseLine, discountPercent: 0, discountAmount: 0 }],
      },
      masterUser,
      undefined,
    );
    createdInvoiceIds.push(okResult.salesInvoice.id);
    expect(Number(okResult.salesInvoice.totalAmount)).toBe(10000);
  });

  it('faktur LAMA yang sudah terlanjur punya diskon (data pra-R5) tetap terbaca apa adanya lewat findOne()', async () => {
    // Simulasi baris lama: tulis langsung lewat repository (bypass
    // SalesInvoicesService.create()/DTO, sama seperti data yang sudah
    // terlanjur tersimpan sebelum paket R5) -- membuktikan §2B A1 "faktur
    // lama yang sudah terlanjur punya diskon harus tetap bisa dibaca".
    // Perhitungan retur atas faktur berdiskon sendiri sudah dites penuh
    // (rumus prorata TIDAK disentuh paket ini) di
    // sales-returns.service.spec.ts ("retur SELURUH baris pada qty penuh"/
    // "retur PARSIAL ... prorata tarif efektif faktur asli"), yang memakai
    // pola seed langsung yang sama -- SalesReturnsService membaca kolom ini
    // apa adanya dari DB, tidak lewat CreateSalesInvoiceDto, jadi tidak
    // terpengaruh validasi baru di paket ini.
    const customerId = await createTestCustomer(false);
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Diskon Lama');
    const invoiceDate = daysAgoIso(0);

    const invoicesRepo = dataSource.getRepository(SalesInvoice);
    const legacyInvoice = await invoicesRepo.save(
      invoicesRepo.create({
        invoiceNumber: `JL/LEGACY-${Date.now()}`,
        invoiceDate,
        customerId,
        salesChannel: SalesChannel.TOKO,
        salesOrderId: null,
        salesmanId,
        termDays: 0,
        dueDate: invoiceDate,
        subtotal: '95000.00',
        lineDiscountTotal: '5000.00',
        invoiceDiscountAmount: '0.00',
        invoiceDiscountPercent: null,
        outputVatAmount: '0.00',
        totalAmount: '95000.00',
        postingStatus: SalesInvoicePostingStatus.POSTED,
        printStatus: SalesInvoicePrintStatus.NOT_PRINTED,
        reviewStatus: SalesInvoiceReviewStatus.BELUM_DICEK,
        createdBy: masterUserId,
      }),
    );
    createdInvoiceIds.push(legacyInvoice.id);

    await dataSource.getRepository(SalesInvoiceLine).save(
      dataSource.getRepository(SalesInvoiceLine).create({
        salesInvoiceId: legacyInvoice.id,
        customerId,
        lineOrder: 1,
        productId,
        unitId: pcsUnitId,
        qtyInput: '10.0000',
        qtyBaseUnit: '10.0000',
        unitPrice: '10000.00',
        discountPercent: '5.00',
        discountAmount: '5000.00',
        grossAmount: '100000.00',
        netAmount: '95000.00',
        unitCostFifo: '0.0000',
      }),
    );

    const reloaded = await service.findOne(legacyInvoice.id);
    expect(Number(reloaded.lineDiscountTotal)).toBe(5000);
    expect(reloaded.lines).toHaveLength(1);
    expect(Number(reloaded.lines[0].discountAmount)).toBe(5000);
    expect(Number(reloaded.lines[0].netAmount)).toBe(95000);
  });

  it('unit_cost_fifo terisi > 0 dari lot sungguhan, sama dengan totalCost/qtyBaseUnit dari recordOut', async () => {
    const customerId = await createTestCustomer(false);
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Berlot');
    await seedPurchaseLot(productId, 100, 25000, daysAgoIso(10));

    const dto: CreateSalesInvoiceDto = {
      customerId,
      salesChannel: SalesChannel.TOKO,
      salesmanId,
      invoiceDate: daysAgoIso(0),
      termDays: 0,
      lines: [{ productId, unitId: pcsUnitId, qtyInput: 10, unitPrice: 40000 }],
    };

    const result = await service.create(dto, masterUser, undefined);
    createdInvoiceIds.push(result.salesInvoice.id);

    expect(Number(result.lines[0].unitCostFifo)).toBe(25000);
    // Piutang, Pendapatan, HPP, Persediaan (tanpa diskon/PPN -> 4 baris, bukan 6).
    expect(result.journalEntry.lines).toHaveLength(4);
    const totalDebit = result.journalEntry.lines.reduce(
      (sum, l) => sum + Number(l.debitAmount),
      0,
    );
    const totalCredit = result.journalEntry.lines.reduce(
      (sum, l) => sum + Number(l.creditAmount),
      0,
    );
    expect(totalDebit).toBe(totalCredit);
  });

  it('lot bonus (unit_cost=0) WAJIB dilewati saat cari cost basis -> batas jual-rugi tetap memakai lot berbayar terakhir', async () => {
    const customerId = await createTestCustomer(false);
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Bonus');
    // Lot 1: dibeli @100.000, lebih lama.
    await seedPurchaseLot(productId, 100, 100000, daysAgoIso(10));
    // Lot 2: bonus (unit_cost=0), LEBIH BARU dari lot 1.
    await seedPurchaseLot(productId, 50, 0, daysAgoIso(5));

    const dto: CreateSalesInvoiceDto = {
      customerId,
      salesChannel: SalesChannel.TOKO,
      salesmanId,
      invoiceDate: daysAgoIso(0),
      termDays: 0,
      lines: [
        // Dijual 50.000 -- di bawah 100.000 (basis dari lot berbayar, BUKAN 0
        // dari lot bonus yang lebih baru).
        { productId, unitId: pcsUnitId, qtyInput: 10, unitPrice: 50000 },
      ],
    };

    const created = await unlockAndRetry(
      (authorizationRequestId) =>
        service.create(dto, masterUser, authorizationRequestId),
      masterUser,
    );
    createdInvoiceIds.push(created.salesInvoice.id);
    expect(Number(created.salesInvoice.totalAmount)).toBe(500000);
  });

  it('produk tanpa lot sama sekali -> tidak ada batas jual-rugi, sukses langsung tanpa 412 di harga berapa pun', async () => {
    const customerId = await createTestCustomer(false);
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Tanpa Lot');

    const dto: CreateSalesInvoiceDto = {
      customerId,
      salesChannel: SalesChannel.TOKO,
      salesmanId,
      invoiceDate: daysAgoIso(0),
      termDays: 0,
      lines: [{ productId, unitId: pcsUnitId, qtyInput: 5, unitPrice: 1 }],
    };

    const result = await service.create(dto, masterUser, undefined);
    createdInvoiceIds.push(result.salesInvoice.id);
    expect(Number(result.salesInvoice.totalAmount)).toBe(5);
  });

  it('satu faktur dengan 3 baris di bawah harga pokok -> SATU authorization_request (bukan 3), payload.lines berisi ketiganya', async () => {
    const customerId = await createTestCustomer(false);
    const salesmanId = await createTestSalesman();
    const productA = await createTestProduct('Produk Rugi A');
    const productB = await createTestProduct('Produk Rugi B');
    const productC = await createTestProduct('Produk Rugi C');
    await seedPurchaseLot(productA, 100, 100000, daysAgoIso(3));
    await seedPurchaseLot(productB, 100, 200000, daysAgoIso(3));
    await seedPurchaseLot(productC, 100, 300000, daysAgoIso(3));

    const dto: CreateSalesInvoiceDto = {
      customerId,
      salesChannel: SalesChannel.TOKO,
      salesmanId,
      invoiceDate: daysAgoIso(0),
      termDays: 0,
      lines: [
        {
          productId: productA,
          unitId: pcsUnitId,
          qtyInput: 1,
          unitPrice: 50000,
        },
        {
          productId: productB,
          unitId: pcsUnitId,
          qtyInput: 1,
          unitPrice: 100000,
        },
        {
          productId: productC,
          unitId: pcsUnitId,
          qtyInput: 1,
          unitPrice: 150000,
        },
      ],
    };

    const countBefore: { count: string }[] = await dataSource.query(
      `SELECT COUNT(*)::text AS count FROM authorization_requests WHERE requester_id = $1 AND action_type = 'SELL_BELOW_COST'`,
      [masterUserId],
    );

    let stepUpBody: StepUpRequiredBody | undefined;
    try {
      await service.create(dto, masterUser, undefined);
      throw new Error('Seharusnya 412.');
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(412);
      stepUpBody = (err as HttpException).getResponse() as StepUpRequiredBody;
    }
    const authorizationRequestId = stepUpBody.authorizationRequestId;
    createdRequestIds.push(authorizationRequestId);

    const requestRow: { payload: { lines: unknown[] } }[] =
      await dataSource.query(
        `SELECT payload FROM authorization_requests WHERE id = $1`,
        [authorizationRequestId],
      );
    expect(requestRow[0].payload.lines).toHaveLength(3);

    // Satu permintaan per FAKTUR (bukan per baris pelanggar) -> jumlah
    // authorization_requests SELL_BELOW_COST milik user ini naik TEPAT 1,
    // bukan 3.
    const countAfterFirstCall: { count: string }[] = await dataSource.query(
      `SELECT COUNT(*)::text AS count FROM authorization_requests WHERE requester_id = $1 AND action_type = 'SELL_BELOW_COST'`,
      [masterUserId],
    );
    expect(Number(countAfterFirstCall[0].count)).toBe(
      Number(countBefore[0].count) + 1,
    );

    await authorizationRequestsService.approve(
      authorizationRequestId,
      supervisorUser,
    );
    const result = await service.create(
      dto,
      masterUser,
      authorizationRequestId,
    );
    createdInvoiceIds.push(result.salesInvoice.id);
    expect(result.lines).toHaveLength(3);

    // Retry dengan header yang sudah disetujui TIDAK membuat baris baru.
    const countAfterRetry: { count: string }[] = await dataSource.query(
      `SELECT COUNT(*)::text AS count FROM authorization_requests WHERE requester_id = $1 AND action_type = 'SELL_BELOW_COST'`,
      [masterUserId],
    );
    expect(countAfterRetry[0].count).toBe(countAfterFirstCall[0].count);
  });

  it('PPN keluaran digerbangi HANYA company_is_pkp, status PKP pelanggan tidak berpengaruh', async () => {
    await seedTaxRate(11);

    // company_is_pkp=true + customer non-PKP -> PPN tetap dipungut.
    await dataSource.query(
      `UPDATE settings SET value = 'true' WHERE key = 'company_is_pkp'`,
    );
    try {
      const customerId = await createTestCustomer(false);
      const salesmanId = await createTestSalesman();
      const productId = await createTestProduct('Produk PPN A');

      const result = await service.create(
        {
          customerId,
          salesChannel: SalesChannel.TOKO,
          salesmanId,
          invoiceDate: daysAgoIso(0),
          termDays: 0,
          lines: [
            { productId, unitId: pcsUnitId, qtyInput: 10, unitPrice: 100000 },
          ],
        },
        masterUser,
        undefined,
      );
      createdInvoiceIds.push(result.salesInvoice.id);
      expect(Number(result.salesInvoice.outputVatAmount)).toBe(110000); // 1.000.000 x 11%
    } finally {
      await dataSource.query(
        `UPDATE settings SET value = 'false' WHERE key = 'company_is_pkp'`,
      );
    }

    // company_is_pkp=false + customer PKP -> PPN tetap 0.
    const customerPkpId = await createTestCustomer(true);
    const salesmanId2 = await createTestSalesman();
    const productId2 = await createTestProduct('Produk PPN B');
    const result2 = await service.create(
      {
        customerId: customerPkpId,
        salesChannel: SalesChannel.TOKO,
        salesmanId: salesmanId2,
        invoiceDate: daysAgoIso(0),
        termDays: 0,
        lines: [
          {
            productId: productId2,
            unitId: pcsUnitId,
            qtyInput: 10,
            unitPrice: 100000,
          },
        ],
      },
      masterUser,
      undefined,
    );
    createdInvoiceIds.push(result2.salesInvoice.id);
    expect(Number(result2.salesInvoice.outputVatAmount)).toBe(0);
  });

  it('salesChannel=PENGIRIMAN tanpa salesOrderId -> ditolak; dengan SO OPEN milik pelanggan sama -> sukses & SO jadi CONVERTED', async () => {
    const customerId = await createTestCustomer(false);
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Kirim');

    await expect(
      service.create(
        {
          customerId,
          salesChannel: SalesChannel.PENGIRIMAN,
          salesmanId,
          invoiceDate: daysAgoIso(0),
          termDays: 0,
          lines: [
            { productId, unitId: pcsUnitId, qtyInput: 1, unitPrice: 10000 },
          ],
        },
        masterUser,
        undefined,
      ),
    ).rejects.toThrow(/Sales Order/i);

    // SO sekarang menyimpan salesman sendiri (koreksi 02 Okt 2026, PJ atas
    // SO) — dibuat dengan salesman BERBEDA dari `salesmanId` di atas untuk
    // membuktikan "terkunci ikut SO": kalaupun dto.salesmanId dikirim beda,
    // yang tersimpan di faktur WAJIB ikut salesman SO, bukan dto.
    const soSalesmanId = await createTestSalesman();
    const so = await salesOrdersService.create(
      {
        customerId,
        salesmanId: soSalesmanId,
        orderDate: daysAgoIso(0),
        lines: [{ productId, unitId: pcsUnitId, qtyInput: 1 }],
      },
      masterUser,
    );
    createdSalesOrderIds.push(so.salesOrder.id);

    const result = await service.create(
      {
        customerId,
        salesChannel: SalesChannel.PENGIRIMAN,
        salesOrderId: so.salesOrder.id,
        salesmanId,
        invoiceDate: daysAgoIso(0),
        termDays: 0,
        lines: [
          { productId, unitId: pcsUnitId, qtyInput: 1, unitPrice: 10000 },
        ],
      },
      masterUser,
      undefined,
    );
    createdInvoiceIds.push(result.salesInvoice.id);
    expect(result.salesInvoice.salesOrderId).toBe(so.salesOrder.id);
    // Terkunci ikut SO -- bukan dto.salesmanId yang dikirim di atas.
    expect(result.salesInvoice.salesmanId).toBe(soSalesmanId);
    expect(result.salesInvoice.salesmanId).not.toBe(salesmanId);

    const soRow: { status: string }[] = await dataSource.query(
      `SELECT status FROM sales_orders WHERE id = $1`,
      [so.salesOrder.id],
    );
    expect(soRow[0].status).toBe('CONVERTED');
  });

  it('salesChannel=TOKO tanpa salesmanId -> ditolak (TOKO tidak punya SO yang membawa salesman)', async () => {
    const customerId = await createTestCustomer(false);
    const productId = await createTestProduct('Produk TOKO Tanpa Salesman');

    await expect(
      service.create(
        {
          customerId,
          salesChannel: SalesChannel.TOKO,
          invoiceDate: daysAgoIso(0),
          termDays: 0,
          lines: [
            { productId, unitId: pcsUnitId, qtyInput: 1, unitPrice: 10000 },
          ],
        },
        masterUser,
        undefined,
      ),
    ).rejects.toThrow(/Salesman wajib diisi/i);
  });

  it('rollback penuh saat gagal di baris kedua: nomor JL tidak lompat, tidak ada baris sales_invoices/lines tersisa', async () => {
    const customerId = await createTestCustomer(false);
    const salesmanId = await createTestSalesman();
    const productA = await createTestProduct('Produk Rollback A');
    const productB = await createTestProduct('Produk Rollback B');

    const invoiceDate = daysAgoIso(0);
    const period = periodOf(invoiceDate);
    const before: { last_number: number }[] = await dataSource.query(
      `SELECT last_number FROM document_counters WHERE doc_type = 'SALES_INVOICE' AND period = $1`,
      [period],
    );
    const beforeNumber = before[0]?.last_number ?? 0;

    const countBefore: { count: string }[] = await dataSource.query(
      `SELECT COUNT(*)::text AS count FROM sales_invoices WHERE customer_id = $1`,
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
        if (args[0] === SalesInvoiceLine) {
          lineSaveCount++;
          if (lineSaveCount === 2) {
            throw new Error('simulasi gagal di tengah transaction faktur');
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
            salesChannel: SalesChannel.TOKO,
            salesmanId,
            invoiceDate,
            termDays: 0,
            lines: [
              {
                productId: productA,
                unitId: pcsUnitId,
                qtyInput: 1,
                unitPrice: 10000,
              },
              {
                productId: productB,
                unitId: pcsUnitId,
                qtyInput: 1,
                unitPrice: 10000,
              },
            ],
          },
          masterUser,
          undefined,
        ),
      ).rejects.toThrow('simulasi gagal di tengah transaction faktur');
    } finally {
      spy.mockRestore();
    }

    const after: { last_number: number }[] = await dataSource.query(
      `SELECT last_number FROM document_counters WHERE doc_type = 'SALES_INVOICE' AND period = $1`,
      [period],
    );
    expect(after[0]?.last_number ?? 0).toBe(beforeNumber);

    const countAfter: { count: string }[] = await dataSource.query(
      `SELECT COUNT(*)::text AS count FROM sales_invoices WHERE customer_id = $1`,
      [customerId],
    );
    expect(countAfter[0].count).toBe(countBefore[0].count);
  });

  it('jual melebihi stok tersedia -> sukses (stok minus diizinkan), response mengandung stockWarnings', async () => {
    const customerId = await createTestCustomer(false);
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Stok Minus');
    await seedPurchaseLot(productId, 5, 10000, daysAgoIso(2));

    const result = await service.create(
      {
        customerId,
        salesChannel: SalesChannel.TOKO,
        salesmanId,
        invoiceDate: daysAgoIso(0),
        termDays: 0,
        lines: [
          // Stok hanya 5, jual 20 -> minus 15.
          { productId, unitId: pcsUnitId, qtyInput: 20, unitPrice: 20000 },
        ],
      },
      masterUser,
      undefined,
    );
    createdInvoiceIds.push(result.salesInvoice.id);
    expect(result.stockWarnings.length).toBeGreaterThan(0);
    expect(result.stockWarnings[0]).toMatch(/minus/i);
  });

  describe('kunci cetak generik + edit/VOID + operator-void step-up (Hari 22)', () => {
    async function createSimpleInvoice(): Promise<{
      invoice: SalesInvoice;
      productId: string;
    }> {
      const customerId = await createTestCustomer(false);
      const salesmanId = await createTestSalesman();
      const productId = await createTestProduct('Produk Kunci Cetak');
      const result = await service.create(
        {
          customerId,
          salesChannel: SalesChannel.TOKO,
          salesmanId,
          invoiceDate: daysAgoIso(0),
          termDays: 14,
          lines: [
            { productId, unitId: pcsUnitId, qtyInput: 2, unitPrice: 50000 },
          ],
        },
        masterUser,
        undefined,
      );
      createdInvoiceIds.push(result.salesInvoice.id);
      return { invoice: result.salesInvoice, productId };
    }

    async function expectStepUp412(
      promise: Promise<unknown>,
    ): Promise<StepUpRequiredBody> {
      try {
        await promise;
        throw new Error('Seharusnya melempar 412.');
      } catch (err) {
        expect(err).toBeInstanceOf(HttpException);
        expect((err as HttpException).getStatus()).toBe(412);
        return (err as HttpException).getResponse() as StepUpRequiredBody;
      }
    }

    async function actionTypeOf(requestId: string): Promise<string> {
      const rows: { action_type: string }[] = await dataSource.query(
        `SELECT action_type FROM authorization_requests WHERE id = $1`,
        [requestId],
      );
      return rows[0].action_type;
    }

    // Menyelesaikan VOID lewat DUA gerbang step-up independen (UNLOCK_PRINT +
    // VOID_DOCUMENT) sekaligus, apa pun kombinasi yang berlaku (0/1/2
    // gerbang) — menyetujui gerbang mana pun yang 412 lebih dulu, memetakan
    // ke slot header yang benar lewat action_type, lalu mengulang.
    async function voidWithFullUnlock(
      id: string,
      dto: VoidSalesInvoiceDto,
      user: AuthenticatedUser,
    ): Promise<SalesInvoice> {
      let authorizationRequestId: string | undefined;
      let voidAuthorizationRequestId: string | undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await service.voidInvoice(
            id,
            dto,
            user,
            authorizationRequestId,
            voidAuthorizationRequestId,
          );
        } catch (err) {
          if (!(err instanceof HttpException) || err.getStatus() !== 412) {
            throw err;
          }
          const body = err.getResponse() as StepUpRequiredBody;
          createdRequestIds.push(body.authorizationRequestId);
          await authorizationRequestsService.approve(
            body.authorizationRequestId,
            supervisorUser,
          );
          const actionType = await actionTypeOf(body.authorizationRequestId);
          if (actionType === 'UNLOCK_PRINT') {
            authorizationRequestId = body.authorizationRequestId;
          } else {
            voidAuthorizationRequestId = body.authorizationRequestId;
          }
        }
      }
      throw new Error('Terlalu banyak percobaan retry VOID.');
    }

    async function countMasterRequests(): Promise<number> {
      const rows: { count: string }[] = await dataSource.query(
        `SELECT COUNT(*)::text AS count FROM authorization_requests WHERE requester_id = $1`,
        [masterUserId],
      );
      return Number(rows[0].count);
    }

    it('cetak ulang identik: print_count naik, tanpa approval, boleh berkali-kali', async () => {
      const { invoice } = await createSimpleInvoice();
      const before = await countMasterRequests();

      const first = await service.registerPrint(invoice.id);
      expect(first.printCount).toBe(1);
      expect(first.printStatus).toBe(SalesInvoicePrintStatus.PRINTED);

      const second = await service.registerPrint(invoice.id);
      expect(second.printCount).toBe(2);

      expect(await countMasterRequests()).toBe(before);
    });

    it('edit sebelum dicetak: langsung sukses, tidak membuat authorization_request', async () => {
      const { invoice } = await createSimpleInvoice();
      const before = await countMasterRequests();

      const updated = await service.update(
        invoice.id,
        { termDays: 45 },
        masterUser,
        undefined,
      );
      expect(updated.termDays).toBe(45);
      expect(updated.printStatus).toBe(SalesInvoicePrintStatus.NOT_PRINTED);

      expect(await countMasterRequests()).toBe(before);
    });

    it('edit setelah dicetak tanpa unlock -> 412; approve + retry -> sukses, printStatus PRINT_CANCELLED, revisionNumber naik', async () => {
      const { invoice } = await createSimpleInvoice();
      await service.registerPrint(invoice.id);

      const body = await expectStepUp412(
        service.update(
          invoice.id,
          { termDays: 45, reason: 'Salah input termin' },
          operatorUser,
          undefined,
        ),
      );
      createdRequestIds.push(body.authorizationRequestId);
      await authorizationRequestsService.approve(
        body.authorizationRequestId,
        supervisorUser,
      );
      const updated = await service.update(
        invoice.id,
        { termDays: 45, reason: 'Salah input termin' },
        operatorUser,
        body.authorizationRequestId,
      );

      expect(updated.termDays).toBe(45);
      expect(updated.printStatus).toBe(SalesInvoicePrintStatus.PRINT_CANCELLED);
      expect(updated.revisionNumber).toBe(1);
    });

    it('edit tanpa alasan pada faktur yang sudah dicetak -> ditolak (alasan wajib)', async () => {
      const { invoice } = await createSimpleInvoice();
      await service.registerPrint(invoice.id);

      await expect(
        service.update(invoice.id, { termDays: 45 }, operatorUser, undefined),
      ).rejects.toThrow(/alasan wajib/i);
    });

    it('edit salesmanId ke salesman tidak aktif -> ditolak', async () => {
      const { invoice } = await createSimpleInvoice();
      const inactiveSalesmanId = await createTestSalesman();
      await dataSource
        .getRepository(Salesman)
        .update(inactiveSalesmanId, { isActive: false });

      await expect(
        service.update(
          invoice.id,
          { salesmanId: inactiveSalesmanId },
          masterUser,
          undefined,
        ),
      ).rejects.toThrow(/tidak aktif/i);
    });

    it('edit salesmanId pada faktur PENGIRIMAN (salesman terkunci ikut SO) -> ditolak', async () => {
      const customerId = await createTestCustomer(false);
      const soSalesmanId = await createTestSalesman();
      const otherSalesmanId = await createTestSalesman();
      const productId = await createTestProduct('Produk Salesman Terkunci SO');
      const so = await salesOrdersService.create(
        {
          customerId,
          salesmanId: soSalesmanId,
          orderDate: daysAgoIso(0),
          lines: [{ productId, unitId: pcsUnitId, qtyInput: 1 }],
        },
        masterUser,
      );
      createdSalesOrderIds.push(so.salesOrder.id);
      const result = await service.create(
        {
          customerId,
          salesChannel: SalesChannel.PENGIRIMAN,
          salesOrderId: so.salesOrder.id,
          invoiceDate: daysAgoIso(0),
          termDays: 0,
          lines: [
            { productId, unitId: pcsUnitId, qtyInput: 1, unitPrice: 10000 },
          ],
        },
        masterUser,
        undefined,
      );
      createdInvoiceIds.push(result.salesInvoice.id);

      await expect(
        service.update(
          result.salesInvoice.id,
          { salesmanId: otherSalesmanId },
          masterUser,
          undefined,
        ),
      ).rejects.toThrow(/mengikuti Sales Order/i);
    });

    it('VOID oleh MASTER faktur belum dicetak -> sukses langsung, tanpa approval apa pun', async () => {
      const { invoice, productId } = await createSimpleInvoice();
      const before = await countMasterRequests();

      const voided = await service.voidInvoice(
        invoice.id,
        { reasonCode: 'SALAH_INPUT', reasonNote: 'Faktur dobel input' },
        masterUser,
        undefined,
        undefined,
      );
      expect(voided.postingStatus).toBe(SalesInvoicePostingStatus.VOIDED);
      expect(voided.voidReasonCode).toBe('SALAH_INPUT');

      const reversal: { id: string }[] = await dataSource.query(
        `SELECT id FROM journal_entries WHERE source_type = 'VOID_REVERSAL' AND source_id IN (SELECT id FROM journal_entries WHERE source_type = 'SALES_INVOICE' AND source_id = $1)`,
        [invoice.id],
      );
      expect(reversal).toHaveLength(1);

      const balance: { qty_base_unit: string }[] = await dataSource.query(
        `SELECT qty_base_unit FROM product_stock_balance WHERE product_id = $1 AND warehouse_id = $2`,
        [productId, storeWarehouseId],
      );
      expect(Number(balance[0]?.qty_base_unit ?? 0)).toBe(0);
      expect(await countMasterRequests()).toBe(before);
    });

    it('VOID oleh MASTER faktur yang sudah dicetak tanpa unlock -> 412 intent VOID; approve + retry -> sukses (MASTER tidak pernah diminta VOID_DOCUMENT)', async () => {
      const { invoice } = await createSimpleInvoice();
      await service.registerPrint(invoice.id);
      const before = await countMasterRequests();

      const body = await expectStepUp412(
        service.voidInvoice(
          invoice.id,
          { reasonCode: 'SALAH_INPUT', reasonNote: 'Faktur dicetak, salah' },
          masterUser,
          undefined,
          undefined,
        ),
      );
      expect(await actionTypeOf(body.authorizationRequestId)).toBe(
        'UNLOCK_PRINT',
      );
      createdRequestIds.push(body.authorizationRequestId);
      await authorizationRequestsService.approve(
        body.authorizationRequestId,
        supervisorUser,
      );

      const voided = await service.voidInvoice(
        invoice.id,
        { reasonCode: 'SALAH_INPUT', reasonNote: 'Faktur dicetak, salah' },
        masterUser,
        body.authorizationRequestId,
        undefined,
      );
      expect(voided.postingStatus).toBe(SalesInvoicePostingStatus.VOIDED);
      expect(voided.printStatus).toBe(SalesInvoicePrintStatus.PRINT_CANCELLED);

      // MASTER tidak pernah diminta VOID_DOCUMENT -> hanya SATU
      // authorization_request baru yang dibuat untuk VOID ini (UNLOCK_PRINT).
      expect(await countMasterRequests()).toBe(before + 1);
    });

    it('token intent EDIT tidak bisa dipakai untuk VOID (payload mismatch -> 412 lagi, bukan tembus)', async () => {
      const { invoice } = await createSimpleInvoice();
      await service.registerPrint(invoice.id);

      const editBody = await expectStepUp412(
        service.update(
          invoice.id,
          { termDays: 45, reason: 'test intent mismatch' },
          masterUser,
          undefined,
        ),
      );
      createdRequestIds.push(editBody.authorizationRequestId);
      await authorizationRequestsService.approve(
        editBody.authorizationRequestId,
        supervisorUser,
      );

      // Token yang disetujui untuk EDIT dipakai untuk VOID -> harus tetap 412
      // (payload mismatch: intent beda), BUKAN sukses mem-VOID.
      await expectStepUp412(
        service.voidInvoice(
          invoice.id,
          {
            reasonCode: 'SALAH_INPUT',
            reasonNote: 'coba tembus pakai token EDIT',
          },
          masterUser,
          editBody.authorizationRequestId,
          undefined,
        ),
      );

      const stillPosted = await service.findOne(invoice.id);
      expect(stillPosted.postingStatus).toBe(SalesInvoicePostingStatus.POSTED);
    });

    it('faktur yang sudah VOIDED tetap bisa dicetak ulang (arsip), postingStatus dikembalikan VOIDED', async () => {
      const { invoice } = await createSimpleInvoice();
      await service.voidInvoice(
        invoice.id,
        { reasonCode: 'SALAH_INPUT', reasonNote: 'untuk uji cetak arsip' },
        masterUser,
        undefined,
        undefined,
      );

      const printed = await service.registerPrint(invoice.id);
      expect(printed.printCount).toBe(1);
      expect(printed.postingStatus).toBe(SalesInvoicePostingStatus.VOIDED);
    });

    it('faktur yang sudah VOIDED tidak bisa diedit lagi', async () => {
      const { invoice } = await createSimpleInvoice();
      await service.voidInvoice(
        invoice.id,
        { reasonCode: 'SALAH_INPUT', reasonNote: 'untuk uji tolak edit' },
        masterUser,
        undefined,
        undefined,
      );

      await expect(
        service.update(invoice.id, { termDays: 45 }, masterUser, undefined),
      ).rejects.toThrow(/sudah VOID/i);
    });

    it('VOID oleh OPERATOR faktur belum dicetak -> 412 VOID_DOCUMENT (bukan UNLOCK_PRINT); approve + retry -> sukses', async () => {
      const { invoice } = await createSimpleInvoice();

      const body = await expectStepUp412(
        service.voidInvoice(
          invoice.id,
          { reasonCode: 'SALAH_INPUT', reasonNote: 'operator batal faktur' },
          operatorUser,
          undefined,
          undefined,
        ),
      );
      expect(await actionTypeOf(body.authorizationRequestId)).toBe(
        'VOID_DOCUMENT',
      );
      createdRequestIds.push(body.authorizationRequestId);
      await authorizationRequestsService.approve(
        body.authorizationRequestId,
        supervisorUser,
      );

      const voided = await service.voidInvoice(
        invoice.id,
        { reasonCode: 'SALAH_INPUT', reasonNote: 'operator batal faktur' },
        operatorUser,
        undefined,
        body.authorizationRequestId,
      );
      expect(voided.postingStatus).toBe(SalesInvoicePostingStatus.VOIDED);
    });

    it('VOID oleh OPERATOR mengembalikan qty_remaining PERSIS ke lot ASLI yang dikonsumsi (bukan lot baru)', async () => {
      const customerId = await createTestCustomer(false);
      const salesmanId = await createTestSalesman();
      const productId = await createTestProduct('Produk VOID Lot');
      await seedPurchaseLot(productId, 100, 10000, daysAgoIso(5));

      const lotBefore: { id: string; qty_in: string; qty_remaining: string }[] =
        await dataSource.query(
          `SELECT id, qty_in, qty_remaining FROM stock_cost_lots WHERE product_id = $1`,
          [productId],
        );
      expect(lotBefore).toHaveLength(1);

      const result = await service.create(
        {
          customerId,
          salesChannel: SalesChannel.TOKO,
          salesmanId,
          invoiceDate: daysAgoIso(0),
          termDays: 0,
          lines: [
            { productId, unitId: pcsUnitId, qtyInput: 10, unitPrice: 20000 },
          ],
        },
        masterUser,
        undefined,
      );
      createdInvoiceIds.push(result.salesInvoice.id);

      const lotAfterSale: { qty_remaining: string }[] = await dataSource.query(
        `SELECT qty_remaining FROM stock_cost_lots WHERE id = $1`,
        [lotBefore[0].id],
      );
      expect(Number(lotAfterSale[0].qty_remaining)).toBe(
        Number(lotBefore[0].qty_in) - 10,
      );

      await voidWithFullUnlock(
        result.salesInvoice.id,
        { reasonCode: 'SALAH_INPUT', reasonNote: 'operator batal, cek lot' },
        operatorUser,
      );

      const lotAfterVoid: { id: string; qty_remaining: string }[] =
        await dataSource.query(
          `SELECT id, qty_remaining FROM stock_cost_lots WHERE product_id = $1`,
          [productId],
        );
      // Lot ASLI yang sama (id tidak berubah), qty_remaining pulih persis.
      expect(lotAfterVoid).toHaveLength(1);
      expect(lotAfterVoid[0].id).toBe(lotBefore[0].id);
      expect(Number(lotAfterVoid[0].qty_remaining)).toBe(
        Number(lotBefore[0].qty_in),
      );
    });

    it('VOID oleh OPERATOR faktur yang SUDAH DICETAK -> dua gate berurutan: 412 UNLOCK_PRINT dulu, approve+retry -> 412 VOID_DOCUMENT, approve+retry -> sukses (3 round-trip)', async () => {
      const { invoice } = await createSimpleInvoice();
      await service.registerPrint(invoice.id);
      const dto: VoidSalesInvoiceDto = {
        reasonCode: 'SALAH_INPUT',
        reasonNote: 'operator batal, faktur sudah dicetak',
      };

      // Round-trip 1: tanpa header sama sekali -> 412 UNLOCK_PRINT (gate ini
      // dicek lebih dulu di voidInvoice()).
      const printBody = await expectStepUp412(
        service.voidInvoice(
          invoice.id,
          dto,
          operatorUser,
          undefined,
          undefined,
        ),
      );
      expect(await actionTypeOf(printBody.authorizationRequestId)).toBe(
        'UNLOCK_PRINT',
      );
      createdRequestIds.push(printBody.authorizationRequestId);
      await authorizationRequestsService.approve(
        printBody.authorizationRequestId,
        supervisorUser,
      );

      // Round-trip 2: UNLOCK_PRINT terpenuhi, tapi VOID_DOCUMENT (operator)
      // belum -> 412 lagi, actionType BEDA.
      const voidBody = await expectStepUp412(
        service.voidInvoice(
          invoice.id,
          dto,
          operatorUser,
          printBody.authorizationRequestId,
          undefined,
        ),
      );
      expect(await actionTypeOf(voidBody.authorizationRequestId)).toBe(
        'VOID_DOCUMENT',
      );
      createdRequestIds.push(voidBody.authorizationRequestId);
      await authorizationRequestsService.approve(
        voidBody.authorizationRequestId,
        supervisorUser,
      );

      // Round-trip 3: kedua header terisi -> sukses.
      const voided = await service.voidInvoice(
        invoice.id,
        dto,
        operatorUser,
        printBody.authorizationRequestId,
        voidBody.authorizationRequestId,
      );
      expect(voided.postingStatus).toBe(SalesInvoicePostingStatus.VOIDED);
      expect(voided.printStatus).toBe(SalesInvoicePrintStatus.PRINT_CANCELLED);
    });

    it('token VOID_DOCUMENT faktur A tidak bisa dipakai untuk faktur B (payload mismatch -> 412)', async () => {
      const { invoice: invoiceA } = await createSimpleInvoice();
      const { invoice: invoiceB } = await createSimpleInvoice();

      const bodyA = await expectStepUp412(
        service.voidInvoice(
          invoiceA.id,
          { reasonCode: 'SALAH_INPUT', reasonNote: 'test cross document' },
          operatorUser,
          undefined,
          undefined,
        ),
      );
      createdRequestIds.push(bodyA.authorizationRequestId);
      await authorizationRequestsService.approve(
        bodyA.authorizationRequestId,
        supervisorUser,
      );

      await expectStepUp412(
        service.voidInvoice(
          invoiceB.id,
          {
            reasonCode: 'SALAH_INPUT',
            reasonNote: 'coba tembus pakai token faktur A',
          },
          operatorUser,
          undefined,
          bodyA.authorizationRequestId,
        ),
      );

      const stillPostedB = await service.findOne(invoiceB.id);
      expect(stillPostedB.postingStatus).toBe(SalesInvoicePostingStatus.POSTED);
    });

    it('header x-authorization-request-id yang sudah dikonsumsi UNLOCK_PRINT tidak bisa dipakai ulang untuk VOID_DOCUMENT (400, bukan 412)', async () => {
      const { invoice: invoiceA } = await createSimpleInvoice();
      await service.registerPrint(invoiceA.id);

      // Ambil token UNLOCK_PRINT yang APPROVED tapi BELUM dikonsumsi (tidak
      // di-retry ke update() sungguhan).
      const unlockBody = await expectStepUp412(
        service.update(
          invoiceA.id,
          { termDays: 45, reason: 'mint token UNLOCK_PRINT' },
          operatorUser,
          undefined,
        ),
      );
      createdRequestIds.push(unlockBody.authorizationRequestId);
      await authorizationRequestsService.approve(
        unlockBody.authorizationRequestId,
        supervisorUser,
      );

      // Pakai token UNLOCK_PRINT itu di slot VOID_DOCUMENT, pada faktur LAIN
      // yang belum dicetak (supaya gerbang UNLOCK_PRINT-nya sendiri no-op,
      // mengisolasi collision di slot VOID_DOCUMENT).
      const { invoice: invoiceB } = await createSimpleInvoice();
      let caughtStatus: number | undefined;
      try {
        await service.voidInvoice(
          invoiceB.id,
          { reasonCode: 'SALAH_INPUT', reasonNote: 'coba tukar slot header' },
          operatorUser,
          undefined,
          unlockBody.authorizationRequestId,
        );
      } catch (err) {
        expect(err).toBeInstanceOf(HttpException);
        caughtStatus = (err as HttpException).getStatus();
      }
      // actionType tersimpan (UNLOCK_PRINT) != yang diminta (VOID_DOCUMENT)
      // -> AuthorizationRequestsService.consumeApproval() menolak keras
      // (400), BUKAN 412 yang bisa di-retry — inilah alasan dua header
      // terpisah wajib dipakai, bukan satu header dipakai bergantian.
      expect(caughtStatus).toBe(400);
    });
  });

  describe('Pengecekan Invoice Harian — review() (Hari 22A)', () => {
    async function createSimpleInvoice(): Promise<{
      invoice: SalesInvoice;
      productId: string;
    }> {
      const customerId = await createTestCustomer(false);
      const salesmanId = await createTestSalesman();
      const productId = await createTestProduct('Produk Pengecekan Invoice');
      const result = await service.create(
        {
          customerId,
          salesChannel: SalesChannel.TOKO,
          salesmanId,
          invoiceDate: daysAgoIso(0),
          termDays: 14,
          lines: [
            { productId, unitId: pcsUnitId, qtyInput: 2, unitPrice: 50000 },
          ],
        },
        masterUser,
        undefined,
      );
      createdInvoiceIds.push(result.salesInvoice.id);
      return { invoice: result.salesInvoice, productId };
    }

    it('SUPERVISOR menandai BERMASALAH dengan catatan -> reviewStatus/reviewNote/reviewedBy/reviewedAt terisi, isi faktur tidak berubah', async () => {
      const { invoice } = await createSimpleInvoice();

      const reviewed = await service.review(
        invoice.id,
        {
          reviewStatus: SalesInvoiceReviewStatus.BERMASALAH,
          reviewNote: 'Harga baris 1 kelihatannya salah ketik.',
        },
        supervisorUser,
      );

      expect(reviewed.reviewStatus).toBe(SalesInvoiceReviewStatus.BERMASALAH);
      expect(reviewed.reviewNote).toBe(
        'Harga baris 1 kelihatannya salah ketik.',
      );
      expect(reviewed.reviewedBy).toBe(supervisorUserId);
      expect(reviewed.reviewedAt).not.toBeNull();
      // Supervisor tidak pernah menulis isi faktur (CLAUDE.md §5) — totalAmount
      // dan termDays dari createSimpleInvoice() harus tetap apa adanya.
      expect(reviewed.termDays).toBe(14);
      expect(reviewed.totalAmount).toBe(invoice.totalAmount);
    });

    it('MASTER menandai DISETUJUI tanpa catatan -> sukses (catatan hanya wajib untuk BERMASALAH)', async () => {
      const { invoice } = await createSimpleInvoice();

      const reviewed = await service.review(
        invoice.id,
        { reviewStatus: SalesInvoiceReviewStatus.DISETUJUI },
        masterUser,
      );

      expect(reviewed.reviewStatus).toBe(SalesInvoiceReviewStatus.DISETUJUI);
      expect(reviewed.reviewNote).toBeNull();
      expect(reviewed.reviewedBy).toBe(masterUserId);
    });

    it('menandai BERMASALAH tanpa catatan (atau catatan kosong) -> ditolak', async () => {
      const { invoice } = await createSimpleInvoice();

      await expect(
        service.review(
          invoice.id,
          { reviewStatus: SalesInvoiceReviewStatus.BERMASALAH },
          supervisorUser,
        ),
      ).rejects.toThrow('Catatan wajib diisi saat menandai faktur BERMASALAH.');

      await expect(
        service.review(
          invoice.id,
          {
            reviewStatus: SalesInvoiceReviewStatus.BERMASALAH,
            reviewNote: '   ',
          },
          supervisorUser,
        ),
      ).rejects.toThrow('Catatan wajib diisi saat menandai faktur BERMASALAH.');
    });

    it('?reviewStatus= dan ?date= pada findAll() menyaring faktur yang baru ditandai', async () => {
      const { invoice } = await createSimpleInvoice();
      await service.review(
        invoice.id,
        {
          reviewStatus: SalesInvoiceReviewStatus.BERMASALAH,
          reviewNote: 'Cek ulang harga.',
        },
        supervisorUser,
      );

      const byReviewStatus = await service.findAll({
        reviewStatus: SalesInvoiceReviewStatus.BERMASALAH,
        page: 1,
        limit: 100,
      });
      expect(byReviewStatus.data.some((row) => row.id === invoice.id)).toBe(
        true,
      );

      const byDate = await service.findAll({
        date: invoice.invoiceDate,
        page: 1,
        limit: 100,
      });
      expect(byDate.data.some((row) => row.id === invoice.id)).toBe(true);
    });
  });

  describe('Revisi-di-tempat (paket R6)', () => {
    async function createRevisableInvoice(daysAgo: number): Promise<{
      invoice: SalesInvoice;
      customerId: string;
      salesmanId: string;
      productId: string;
    }> {
      const customerId = await createTestCustomer(false);
      const salesmanId = await createTestSalesman();
      const productId = await createTestProduct('Produk Revisi');
      const result = await service.create(
        {
          customerId,
          salesChannel: SalesChannel.TOKO,
          salesmanId,
          invoiceDate: daysAgoIso(daysAgo),
          termDays: 14,
          lines: [
            { productId, unitId: pcsUnitId, qtyInput: 2, unitPrice: 50000 },
          ],
        },
        masterUser,
        undefined,
      );
      createdInvoiceIds.push(result.salesInvoice.id);
      return {
        invoice: result.salesInvoice,
        customerId,
        salesmanId,
        productId,
      };
    }

    async function sumJournalLines(
      journalEntryId: string,
    ): Promise<{ debit: number; credit: number }> {
      const rows: { debit: string; credit: string }[] = await dataSource.query(
        `SELECT COALESCE(SUM(debit_amount),0) AS debit, COALESCE(SUM(credit_amount),0) AS credit
         FROM journal_entry_lines WHERE journal_entry_id = $1`,
        [journalEntryId],
      );
      return { debit: Number(rows[0].debit), credit: Number(rows[0].credit) };
    }

    it('faktur NOT_PRINTED: ubah harga satu baris -> 200, revisionNumber 1, jurnal lama terbalik + jurnal baru KEDUANYA bertanggal tanggal faktur asli (bukan hari ini)', async () => {
      const { invoice, customerId, salesmanId, productId } =
        await createRevisableInvoice(1);
      const today = new Date().toISOString().slice(0, 10);
      expect(invoice.invoiceDate).not.toBe(today);

      const revised = await service.reviseInvoice(
        invoice.id,
        {
          customerId,
          salesChannel: SalesChannel.TOKO,
          salesmanId,
          invoiceDate: invoice.invoiceDate,
          termDays: 14,
          lines: [
            { productId, unitId: pcsUnitId, qtyInput: 2, unitPrice: 75000 },
          ],
        },
        masterUser,
        undefined,
        undefined,
      );

      expect(revised.revisionNumber).toBe(1);
      expect(Number(revised.totalAmount)).toBe(150000);

      const entries: {
        entry_date: string;
        is_reversal: boolean;
        source_type: string;
      }[] = await dataSource.query(
        `SELECT entry_date::text AS entry_date, is_reversal, source_type FROM journal_entries
         WHERE (source_type = 'SALES_INVOICE' AND source_id = $1)
            OR (source_type = 'REVISION_REVERSAL' AND source_id IN (
                  SELECT id FROM journal_entries WHERE source_type = 'SALES_INVOICE' AND source_id = $1
                ))
         ORDER BY created_at ASC`,
        [invoice.id],
      );
      // Entry asli + pembalik + posting-ulang = 3 baris.
      expect(entries).toHaveLength(3);
      for (const entry of entries) {
        expect(entry.entry_date).toBe(invoice.invoiceDate);
        expect(entry.entry_date).not.toBe(today);
      }

      // SUM(debit)=SUM(credit) pada jurnal AKTIF terbaru (invarian 1).
      const activeEntry: { id: string }[] = await dataSource.query(
        `SELECT je.id FROM journal_entries je
         WHERE je.source_type = 'SALES_INVOICE' AND je.source_id = $1 AND je.is_reversal = false
           AND NOT EXISTS (SELECT 1 FROM journal_entries r WHERE r.reversed_entry_id = je.id)`,
        [invoice.id],
      );
      expect(activeEntry).toHaveLength(1);
      const sums = await sumJournalLines(activeEntry[0].id);
      expect(sums.debit).toBe(sums.credit);

      // Saldo stok = SUM(stock_movements) (invarian 2) — beli 2 pcs, revisi
      // tidak mengubah qty, jadi net stok TETAP -2.
      expect(
        (await stockRecorderService.reconcile({ productId })).every(
          (r) => r.difference === 0,
        ),
      ).toBe(true);
      const balance: { qty_base_unit: string }[] = await dataSource.query(
        `SELECT qty_base_unit FROM product_stock_balance WHERE product_id = $1 AND warehouse_id = $2`,
        [productId, storeWarehouseId],
      );
      expect(Number(balance[0].qty_base_unit)).toBe(-2);
    });

    it('faktur yang sudah PRINTED: revise tanpa token -> 412 UNLOCK_PRINT; approve + retry -> 200, revisionNumber naik lewat PrintLockService (tidak dobel)', async () => {
      const { invoice, customerId, salesmanId, productId } =
        await createRevisableInvoice(0);
      await service.registerPrint(invoice.id);

      const dto = {
        customerId,
        salesChannel: SalesChannel.TOKO,
        salesmanId,
        invoiceDate: invoice.invoiceDate,
        termDays: 14,
        lines: [
          { productId, unitId: pcsUnitId, qtyInput: 2, unitPrice: 60000 },
        ],
        reason: 'Salah harga saat input',
      };

      let authorizationRequestId: string;
      try {
        await service.reviseInvoice(
          invoice.id,
          dto,
          masterUser,
          undefined,
          undefined,
        );
        throw new Error('Seharusnya 412.');
      } catch (err) {
        expect((err as HttpException).getStatus()).toBe(412);
        const body = (err as HttpException).getResponse() as StepUpRequiredBody;
        authorizationRequestId = body.authorizationRequestId;
        createdRequestIds.push(authorizationRequestId);
      }
      await authorizationRequestsService.approve(
        authorizationRequestId,
        supervisorUser,
      );

      const revised = await service.reviseInvoice(
        invoice.id,
        dto,
        masterUser,
        authorizationRequestId,
        undefined,
      );
      expect(revised.printStatus).toBe(SalesInvoicePrintStatus.PRINT_CANCELLED);
      // PrintLockService.consume() sudah menaikkan revisionNumber (K4) —
      // TIDAK dinaikkan dua kali oleh reviseInvoice() sendiri.
      expect(revised.revisionNumber).toBe(1);
    });

    it('faktur berumur lebih dari 2 hari -> 400 dengan pesan yang MENYEBUT jalan keluarnya (VOID + faktur baru)', async () => {
      // service.create() SENDIRI menolak backdate > 2 hari (§2.9) — jadi
      // faktur "berumur 5 hari" ini dibuat normal (hari ini) lalu tanggalnya
      // diubah LANGSUNG lewat SQL, mensimulasikan faktur yang sudah keluar
      // dari jendela revisi tanpa perlu menerobos validator create().
      const { invoice, customerId, salesmanId, productId } =
        await createRevisableInvoice(0);
      const staleDate = daysAgoIso(5);
      await dataSource.query(
        `UPDATE sales_invoices SET invoice_date = $1 WHERE id = $2`,
        [staleDate, invoice.id],
      );

      await expect(
        service.reviseInvoice(
          invoice.id,
          {
            customerId,
            salesChannel: SalesChannel.TOKO,
            salesmanId,
            invoiceDate: staleDate,
            termDays: 14,
            lines: [
              { productId, unitId: pcsUnitId, qtyInput: 2, unitPrice: 60000 },
            ],
          },
          masterUser,
          undefined,
          undefined,
        ),
      ).rejects.toThrow(/VOID.*faktur baru/i);
    });

    it('revisi mengubah customerId -> jurnal baru memakai akun piutang milik PELANGGAN BARU (ar_account_id kustom)', async () => {
      const { invoice, salesmanId, productId } =
        await createRevisableInvoice(0);

      // 01.120.00003 Piutang Pihak Berelasi — akun aktif/postable yang BUKAN
      // default (01.120.00001 Piutang Usaha), jadi perbedaannya teruji
      // langsung lewat account_id baris jurnal.
      const arRows: { id: string }[] = await dataSource.query(
        `SELECT id FROM chart_of_accounts WHERE code = '01.120.00003'`,
      );
      const customRepo = dataSource.getRepository(Customer);
      const newCustomer = await customRepo.save(
        customRepo.create({
          code: `CUST-TSI-AR-${Date.now()}`,
          name: 'Pelanggan AR Kustom Uji Revisi',
          isPkp: false,
          isActive: true,
          arAccountId: arRows[0].id,
        }),
      );
      createdCustomerIds.push(newCustomer.id);

      const revised = await service.reviseInvoice(
        invoice.id,
        {
          customerId: newCustomer.id,
          salesChannel: SalesChannel.TOKO,
          salesmanId,
          invoiceDate: invoice.invoiceDate,
          termDays: 14,
          lines: [
            { productId, unitId: pcsUnitId, qtyInput: 2, unitPrice: 50000 },
          ],
        },
        masterUser,
        undefined,
        undefined,
      );
      expect(revised.customerId).toBe(newCustomer.id);

      const activeEntry: { id: string }[] = await dataSource.query(
        `SELECT je.id FROM journal_entries je
         WHERE je.source_type = 'SALES_INVOICE' AND je.source_id = $1 AND je.is_reversal = false
           AND NOT EXISTS (SELECT 1 FROM journal_entries r WHERE r.reversed_entry_id = je.id)`,
        [invoice.id],
      );
      const arLine: { account_id: string }[] = await dataSource.query(
        `SELECT account_id FROM journal_entry_lines WHERE journal_entry_id = $1 AND customer_id = $2`,
        [activeEntry[0].id, newCustomer.id],
      );
      expect(arLine).toHaveLength(1);
      expect(arLine[0].account_id).toBe(arRows[0].id);
    });

    it('revisi menurunkan harga di bawah harga pokok -> 412 SELL_BELOW_COST; approve + retry -> sukses', async () => {
      const { invoice, customerId, salesmanId, productId } =
        await createRevisableInvoice(0);
      await seedPurchaseLot(productId, 50, 60000, daysAgoIso(3));

      const dto = {
        customerId,
        salesChannel: SalesChannel.TOKO,
        salesmanId,
        invoiceDate: invoice.invoiceDate,
        termDays: 14,
        lines: [
          // 40.000 < harga pokok 60.000/pcs -> pelanggaran §2.17.
          { productId, unitId: pcsUnitId, qtyInput: 2, unitPrice: 40000 },
        ],
      };

      let sellBelowCostAuthorizationRequestId: string;
      try {
        await service.reviseInvoice(
          invoice.id,
          dto,
          masterUser,
          undefined,
          undefined,
        );
        throw new Error('Seharusnya 412.');
      } catch (err) {
        expect((err as HttpException).getStatus()).toBe(412);
        const body = (err as HttpException).getResponse() as StepUpRequiredBody;
        sellBelowCostAuthorizationRequestId = body.authorizationRequestId;
        createdRequestIds.push(sellBelowCostAuthorizationRequestId);
        expect(
          await actionTypeOfRequest(sellBelowCostAuthorizationRequestId),
        ).toBe('SELL_BELOW_COST');
      }
      await authorizationRequestsService.approve(
        sellBelowCostAuthorizationRequestId,
        supervisorUser,
      );

      const revised = await service.reviseInvoice(
        invoice.id,
        dto,
        masterUser,
        undefined,
        sellBelowCostAuthorizationRequestId,
      );
      expect(Number(revised.totalAmount)).toBe(80000);
    });

    it('faktur VOIDED -> revise ditolak', async () => {
      const { invoice, customerId, salesmanId, productId } =
        await createRevisableInvoice(0);
      await service.voidInvoice(
        invoice.id,
        { reasonCode: 'SALAH_INPUT', reasonNote: 'Dibatalkan untuk uji' },
        masterUser,
        undefined,
        undefined,
      );

      await expect(
        service.reviseInvoice(
          invoice.id,
          {
            customerId,
            salesChannel: SalesChannel.TOKO,
            salesmanId,
            invoiceDate: invoice.invoiceDate,
            termDays: 14,
            lines: [
              { productId, unitId: pcsUnitId, qtyInput: 2, unitPrice: 60000 },
            ],
          },
          masterUser,
          undefined,
          undefined,
        ),
      ).rejects.toThrow(/sudah VOID/i);
    });

    it('revisi dua kali berturut-turut tetap konsisten: revisionNumber = 2, jurnal & stok tetap seimbang', async () => {
      const { invoice, customerId, salesmanId, productId } =
        await createRevisableInvoice(0);

      await service.reviseInvoice(
        invoice.id,
        {
          customerId,
          salesChannel: SalesChannel.TOKO,
          salesmanId,
          invoiceDate: invoice.invoiceDate,
          termDays: 14,
          lines: [
            { productId, unitId: pcsUnitId, qtyInput: 3, unitPrice: 55000 },
          ],
        },
        masterUser,
        undefined,
        undefined,
      );

      const revision2 = await service.reviseInvoice(
        invoice.id,
        {
          customerId,
          salesChannel: SalesChannel.TOKO,
          salesmanId,
          invoiceDate: invoice.invoiceDate,
          termDays: 14,
          lines: [
            { productId, unitId: pcsUnitId, qtyInput: 4, unitPrice: 65000 },
          ],
        },
        masterUser,
        undefined,
        undefined,
      );

      expect(revision2.revisionNumber).toBe(2);
      expect(Number(revision2.totalAmount)).toBe(260000);

      const activeEntry: { id: string }[] = await dataSource.query(
        `SELECT je.id FROM journal_entries je
         WHERE je.source_type = 'SALES_INVOICE' AND je.source_id = $1 AND je.is_reversal = false
           AND NOT EXISTS (SELECT 1 FROM journal_entries r WHERE r.reversed_entry_id = je.id)`,
        [invoice.id],
      );
      expect(activeEntry).toHaveLength(1);
      const sums = await sumJournalLines(activeEntry[0].id);
      expect(sums.debit).toBe(sums.credit);

      const balance: { qty_base_unit: string }[] = await dataSource.query(
        `SELECT qty_base_unit FROM product_stock_balance WHERE product_id = $1 AND warehouse_id = $2`,
        [productId, storeWarehouseId],
      );
      // Net stok akhir HANYA mencerminkan qty revisi TERAKHIR (4 pcs), bukan
      // akumulasi tiga ronde (2+3+4).
      expect(Number(balance[0].qty_base_unit)).toBe(-4);

      const negativeLots: { id: string }[] = await dataSource.query(
        `SELECT id FROM stock_cost_lots WHERE qty_remaining < 0`,
      );
      expect(negativeLots).toHaveLength(0);
    });

    async function actionTypeOfRequest(requestId: string): Promise<string> {
      const rows: { action_type: string }[] = await dataSource.query(
        `SELECT action_type FROM authorization_requests WHERE id = $1`,
        [requestId],
      );
      return rows[0].action_type;
    }
  });
});
