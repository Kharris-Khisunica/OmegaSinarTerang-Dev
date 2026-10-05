import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { AccountResolverService } from '../../core/account-resolver/account-resolver.service';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { JournalPosterService } from '../../core/journal-poster/journal-poster.service';
import { PeriodLockValidatorService } from '../../core/period-lock/period-lock-validator.service';
import { PrintLockService } from '../../core/print-lock/print-lock.service';
import { StockRecorderService } from '../../core/stock-recorder/stock-recorder.service';
import { StepUpService } from '../../core/step-up/step-up.service';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { AuthorizationRequestsService } from '../authorization-requests/authorization-requests.service';
import { AuthorizationRequest } from '../authorization-requests/entities/authorization-request.entity';
import { Brand } from '../brands/entities/brand.entity';
import {
  AccountSubtype,
  AccountType,
  ChartOfAccount,
  NormalBalance,
} from '../chart-of-accounts/entities/chart-of-account.entity';
import { JournalEntryLine } from '../journal-entries/entities/journal-entry-line.entity';
import { JournalEntry } from '../journal-entries/entities/journal-entry.entity';
import { ProductUnitConversion } from '../products/entities/product-unit-conversion.entity';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
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
import { CreatePurchaseReturnDto } from './dto/create-purchase-return.dto';
import { PurchaseReturnLine } from './entities/purchase-return-line.entity';
import {
  PurchaseReturn,
  PurchaseReturnSettlementType,
  PurchaseReturnUnitMode,
} from './entities/purchase-return.entity';
import { PurchaseReturnsService } from './purchase-returns.service';

/**
 * Integration test terhadap Postgres asli, pola sama
 * purchase-invoices.service.spec.ts — semua service dikonstruksi manual
 * lewat `new` (bypass Nest DI). Tidak membuat gudang STORE/BAD_STOCK sendiri
 * — dev DB sudah punya tepat satu masing-masing ber-is_default=true
 * ("Gudang Utama"/"Gudang Barang Rusak"), asersi di-scope ke product_id/
 * return_id milik test ini sendiri.
 */
describe('PurchaseReturnsService', () => {
  let dataSource: DataSource;
  let productsService: ProductsService;
  let stockRecorderService: StockRecorderService;
  let service: PurchaseReturnsService;

  let masterUserId: string;
  let brandId: string;
  let badStockWarehouseId: string;
  let inventoryAccountId: string;
  let payableAccountId: string;
  let diffAccountId: string;
  let cashAccountId: string;
  let nonCashAccountId: string;

  const createdProductIds: string[] = [];
  const createdSupplierIds: string[] = [];
  const createdReturnIds: string[] = [];
  const createdAccountIds: string[] = [];

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
        Supplier,
        Warehouse,
        ChartOfAccount,
        JournalEntry,
        JournalEntryLine,
        StockMovement,
        StockCostLot,
        StockCostConsumption,
        PurchaseReturn,
        PurchaseReturnLine,
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
    const authorizationRequestsService = new AuthorizationRequestsService(
      dataSource.getRepository(AuthorizationRequest),
    );
    const stepUpService = new StepUpService(authorizationRequestsService);
    const printLockService = new PrintLockService(dataSource, stepUpService);

    service = new PurchaseReturnsService(
      dataSource,
      dataSource.getRepository(PurchaseReturn),
      dataSource.getRepository(Warehouse),
      documentCounterService,
      stockRecorderService,
      journalPosterService,
      accountResolverService,
      printLockService,
    );

    const suffix = Date.now();

    const usersRepo = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('test-password', 4);
    const master = await usersRepo.save(
      usersRepo.create({
        username: `test_pr_master_${suffix}`,
        passwordHash,
        fullName: 'Test PurchaseReturns Master',
        role: Role.MASTER,
        isActive: true,
      }),
    );
    masterUserId = master.id;
    masterUser.sub = masterUserId;

    const badStockWarehouse = await dataSource
      .getRepository(Warehouse)
      .findOneOrFail({
        where: {
          warehouseType: WarehouseType.BAD_STOCK,
          isDefault: true,
          isActive: true,
        },
      });
    badStockWarehouseId = badStockWarehouse.id;

    const brandsRepo = dataSource.getRepository(Brand);
    const brand = await brandsRepo.save(
      brandsRepo.create({
        code: `TPR-${suffix.toString().slice(-8)}`,
        name: 'Merek Uji Retur Pembelian',
        isActive: true,
      }),
    );
    brandId = brand.id;

    inventoryAccountId = await accountResolverService.resolveSingleActive(
      'is_inventory_account = true',
      'Persediaan',
    );
    payableAccountId = await accountResolverService.resolveSingleActive(
      'is_payable_account = true',
      'Hutang Usaha',
    );
    diffAccountId = await accountResolverService.resolveSingleActive(
      'is_purchase_return_diff_account = true',
      'Selisih Retur Pembelian',
    );

    const coaRepo = dataSource.getRepository(ChartOfAccount);
    const cashAccount = await coaRepo.save(
      coaRepo.create({
        code: `KAS-TPR-${suffix.toString().slice(-8)}`,
        name: 'Kas Uji Retur Pembelian',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.CURRENT_ASSET,
        isCashAccount: true,
        isActive: true,
      }),
    );
    cashAccountId = cashAccount.id;
    createdAccountIds.push(cashAccountId);
    nonCashAccountId = inventoryAccountId; // akun nyata tapi is_cash_account=false
  });

  afterAll(async () => {
    if (createdReturnIds.length > 0) {
      await dataSource.query(
        `DELETE FROM journal_entry_lines WHERE journal_entry_id IN (
           SELECT id FROM journal_entries WHERE source_type = 'PURCHASE_RETURN' AND source_id = ANY($1)
         )`,
        [createdReturnIds],
      );
      await dataSource.query(
        `DELETE FROM journal_entries WHERE source_type = 'PURCHASE_RETURN' AND source_id = ANY($1)`,
        [createdReturnIds],
      );
      await dataSource.query(
        `DELETE FROM purchase_return_lines WHERE purchase_return_id = ANY($1)`,
        [createdReturnIds],
      );
      await dataSource.query(
        `DELETE FROM purchase_returns WHERE id = ANY($1)`,
        [createdReturnIds],
      );
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
    if (createdSupplierIds.length > 0) {
      await dataSource.query(`DELETE FROM suppliers WHERE id = ANY($1)`, [
        createdSupplierIds,
      ]);
    }
    if (createdAccountIds.length > 0) {
      await dataSource.query(
        `DELETE FROM chart_of_accounts WHERE id = ANY($1)`,
        [createdAccountIds],
      );
    }
    await dataSource.query(`DELETE FROM brands WHERE id = $1`, [brandId]);
    await dataSource.query('DELETE FROM audit_logs WHERE user_id = $1', [
      masterUserId,
    ]);
    await dataSource.query('DELETE FROM users WHERE id = $1', [masterUserId]);
    await dataSource.destroy();
  });

  async function createTestProduct(
    label: string,
    unitConversions: {
      unitName: string;
      qtyInBaseUnit: number;
      level: number;
    }[],
  ): Promise<string> {
    const product = await productsService.create({
      brandId,
      keterangan: `${label} ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      baseUnit: 'PCS',
      isBkp: false,
      unitConversions,
    });
    createdProductIds.push(product.id);
    return product.id;
  }

  async function createTestSupplier(): Promise<string> {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const supplier = await dataSource.getRepository(Supplier).save(
      dataSource.getRepository(Supplier).create({
        displayCode: `SUP-TPR-${suffix}`,
        name: `Supplier Uji Retur Pembelian ${suffix}`,
        isPkp: false,
        isActive: true,
      }),
    );
    createdSupplierIds.push(supplier.id);
    return supplier.id;
  }

  /** Seed lot BAD_STOCK langsung lewat StockRecorderService.recordIn() (bukan
   * lewat alur STORE->BS transfer sungguhan) — cukup untuk menguji
   * consumeFifo supplier-scoped di PurchaseReturnsService, tidak menguji
   * jalur mutasi gudang itu sendiri. */
  async function seedBadStockLot(
    productId: string,
    supplierId: string,
    qtyBaseUnit: number,
    unitCost: number,
    lotDaysAgo = 3,
  ): Promise<void> {
    const lotDate = new Date();
    lotDate.setUTCDate(lotDate.getUTCDate() - lotDaysAgo);
    await dataSource.transaction(async (manager) => {
      await stockRecorderService.recordIn(
        {
          productId,
          warehouseId: badStockWarehouseId,
          qtyBaseUnit,
          unitCost,
          lotDate,
          movementDate: lotDate,
          movementType: StockMovementType.PURCHASE,
          supplierId,
          sourceType: 'PURCHASE_INVOICE',
          sourceId: null,
          createdBy: masterUserId,
        },
        manager,
      );
    });
  }

  function isoTodayMinus(days: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  }

  it('retur BESAR nilai > harga pokok -> Selisih Retur Pembelian KREDIT, jurnal balance, qtyBaseUnit terkonversi benar, agreedAmount dari qtyInput (bukan qtyBaseUnit)', async () => {
    const supplierId = await createTestSupplier();
    const productId = await createTestProduct('Produk Untung', [
      { unitName: 'DUS', qtyInBaseUnit: 12, level: 1 },
    ]);
    // 2 DUS = 24 pcs @ unitCost 7.250 -> harga pokok 174.000
    await seedBadStockLot(productId, supplierId, 24, 7250);

    const dto: CreatePurchaseReturnDto = {
      supplierId,
      returnDate: isoTodayMinus(0),
      unitMode: PurchaseReturnUnitMode.BESAR,
      settlementType: PurchaseReturnSettlementType.REDUCE_INVOICE,
      lines: [{ productId, qtyInput: 2, agreedUnitPrice: 90000 }], // 2 x 90.000 = 180.000
    };

    const result = await service.create(dto, masterUser);
    createdReturnIds.push(result.purchaseReturn.id);

    expect(result.purchaseReturn.returnNumber).toMatch(/^RB\/[^/]+-\d{8}$/);
    expect(Number(result.purchaseReturn.subtotalAgreedAmount)).toBe(180000);
    expect(Number(result.purchaseReturn.totalCostBasis)).toBe(174000);
    expect(Number(result.purchaseReturn.differenceAmount)).toBe(6000);

    const line = result.lines[0];
    expect(Number(line.qtyInput)).toBe(2);
    expect(Number(line.qtyBaseUnit)).toBe(24);
    expect(Number(line.agreedAmount)).toBe(180000); // 2 x 90.000, BUKAN 24 x 90.000
    expect(Number(line.costBasisAmount)).toBe(174000);

    const journalLines = result.journalEntry.lines;
    const totalDebit = journalLines.reduce(
      (s, l) => s + Number(l.debitAmount),
      0,
    );
    const totalCredit = journalLines.reduce(
      (s, l) => s + Number(l.creditAmount),
      0,
    );
    expect(totalDebit).toBe(totalCredit);
    expect(totalDebit).toBe(180000);

    const payableLine = journalLines.find(
      (l) => l.accountId === payableAccountId,
    );
    expect(Number(payableLine!.debitAmount)).toBe(180000);
    const inventoryLine = journalLines.find(
      (l) => l.accountId === inventoryAccountId,
    );
    expect(Number(inventoryLine!.creditAmount)).toBe(174000);
    const diffLine = journalLines.find((l) => l.accountId === diffAccountId);
    expect(diffLine).toBeDefined();
    expect(Number(diffLine!.creditAmount)).toBe(6000);
    expect(Number(diffLine!.debitAmount)).toBe(0);
  });

  it('retur nilai < harga pokok -> Selisih Retur Pembelian DEBIT, jurnal tetap balance', async () => {
    const supplierId = await createTestSupplier();
    const productId = await createTestProduct('Produk Rugi', [
      { unitName: 'DUS', qtyInBaseUnit: 12, level: 1 },
    ]);
    // 1 DUS = 12 pcs @ unitCost 10.000 -> harga pokok 120.000
    await seedBadStockLot(productId, supplierId, 12, 10000);

    const dto: CreatePurchaseReturnDto = {
      supplierId,
      returnDate: isoTodayMinus(0),
      unitMode: PurchaseReturnUnitMode.BESAR,
      settlementType: PurchaseReturnSettlementType.REDUCE_INVOICE,
      lines: [{ productId, qtyInput: 1, agreedUnitPrice: 95000 }], // 95.000 < 120.000
    };

    const result = await service.create(dto, masterUser);
    createdReturnIds.push(result.purchaseReturn.id);

    expect(Number(result.purchaseReturn.differenceAmount)).toBe(-25000);

    const journalLines = result.journalEntry.lines;
    const totalDebit = journalLines.reduce(
      (s, l) => s + Number(l.debitAmount),
      0,
    );
    const totalCredit = journalLines.reduce(
      (s, l) => s + Number(l.creditAmount),
      0,
    );
    expect(totalDebit).toBe(totalCredit);
    expect(totalDebit).toBe(120000); // hutang(D) 95.000 + selisih(D) 25.000

    const diffLine = journalLines.find((l) => l.accountId === diffAccountId);
    expect(Number(diffLine!.debitAmount)).toBe(25000);
    expect(Number(diffLine!.creditAmount)).toBe(0);
  });

  it('retur nilai = harga pokok -> hanya 2 baris jurnal, tidak ada baris Selisih', async () => {
    const supplierId = await createTestSupplier();
    const productId = await createTestProduct('Produk Pas', [
      { unitName: 'DUS', qtyInBaseUnit: 12, level: 1 },
    ]);
    // 1 DUS = 12 pcs @ unitCost 8.000 -> harga pokok 96.000 = agreedAmount (1 x 96.000)
    await seedBadStockLot(productId, supplierId, 12, 8000);

    const dto: CreatePurchaseReturnDto = {
      supplierId,
      returnDate: isoTodayMinus(0),
      unitMode: PurchaseReturnUnitMode.BESAR,
      settlementType: PurchaseReturnSettlementType.REDUCE_INVOICE,
      lines: [{ productId, qtyInput: 1, agreedUnitPrice: 96000 }],
    };

    const result = await service.create(dto, masterUser);
    createdReturnIds.push(result.purchaseReturn.id);

    expect(Number(result.purchaseReturn.differenceAmount)).toBe(0);
    expect(result.journalEntry.lines).toHaveLength(2);
    const diffLine = result.journalEntry.lines.find(
      (l) => l.accountId === diffAccountId,
    );
    expect(diffLine).toBeUndefined();
  });

  it('findBadStockLots(supplierA) tidak menampilkan produk yang lot BS-nya cuma dari supplier B', async () => {
    const supplierA = await createTestSupplier();
    const supplierB = await createTestSupplier();
    const productForA = await createTestProduct('Produk Khusus A', [
      { unitName: 'DUS', qtyInBaseUnit: 12, level: 1 },
    ]);
    const productForB = await createTestProduct('Produk Khusus B', [
      { unitName: 'DUS', qtyInBaseUnit: 12, level: 1 },
    ]);
    await seedBadStockLot(productForA, supplierA, 12, 5000);
    await seedBadStockLot(productForB, supplierB, 12, 5000);

    const rowsForA = await service.findBadStockLots(supplierA);
    const productIdsForA = rowsForA.map((r) => r.productId);
    expect(productIdsForA).toContain(productForA);
    expect(productIdsForA).not.toContain(productForB);
  });

  it('findBadStockLots: fifoNextUnitCost = unit_cost lot TERTUA, bukan rata-rata, walau ada lot lain lebih murah/mahal', async () => {
    const supplierId = await createTestSupplier();
    const productId = await createTestProduct('Produk Referensi Harga', []);

    await seedBadStockLot(productId, supplierId, 10, 5000, 10); // tertua
    await seedBadStockLot(productId, supplierId, 10, 9000, 2); // lebih baru, lebih mahal

    const rows = await service.findBadStockLots(supplierId);
    const row = rows.find((r) => r.productId === productId);
    expect(row).toBeDefined();
    expect(row!.qtyAvailable).toBe(20);
    // Rata-rata (5000+9000)/2 = 7000 -- HARUS BUKAN ini, harus 5000 (lot tertua).
    expect(row!.fifoNextUnitCost).toBe(5000);
  });

  it('retur qty melebihi stok BS milik supplier itu -> BadRequestException, bukan lot fiktif', async () => {
    const supplierId = await createTestSupplier();
    const productId = await createTestProduct('Produk Kurang', [
      { unitName: 'DUS', qtyInBaseUnit: 12, level: 1 },
    ]);
    await seedBadStockLot(productId, supplierId, 5, 5000); // hanya 5 pcs tersedia

    const dto: CreatePurchaseReturnDto = {
      supplierId,
      returnDate: isoTodayMinus(0),
      unitMode: PurchaseReturnUnitMode.KECIL,
      settlementType: PurchaseReturnSettlementType.REDUCE_INVOICE,
      lines: [{ productId, qtyInput: 20, agreedUnitPrice: 5000 }], // minta 20, cuma ada 5
    };

    await expect(service.create(dto, masterUser)).rejects.toThrow(
      /tidak mencukupi/,
    );

    const balance: { qty_base_unit: string }[] = await dataSource.query(
      `SELECT qty_base_unit FROM product_stock_balance WHERE product_id = $1 AND warehouse_id = $2`,
      [productId, badStockWarehouseId],
    );
    expect(Number(balance[0].qty_base_unit)).toBe(5); // rollback penuh, stok tidak berubah
  });

  it('stok BS berkurang tepat sejumlah qty retur, dari lot FIFO tertua dulu', async () => {
    const supplierId = await createTestSupplier();
    const productId = await createTestProduct('Produk FIFO', []);

    await seedBadStockLot(productId, supplierId, 10, 5000, 10); // lot lebih tua
    await seedBadStockLot(productId, supplierId, 10, 6000, 2); // lot lebih baru

    const dto: CreatePurchaseReturnDto = {
      supplierId,
      returnDate: isoTodayMinus(0),
      unitMode: PurchaseReturnUnitMode.KECIL,
      settlementType: PurchaseReturnSettlementType.REDUCE_INVOICE,
      lines: [{ productId, qtyInput: 7, agreedUnitPrice: 5000 }], // < 10, harus dari lot tertua saja
    };

    const result = await service.create(dto, masterUser);
    createdReturnIds.push(result.purchaseReturn.id);

    // Harga pokok baris harus 7 x 5.000 = 35.000 (murni dari lot tertua,
    // BUKAN campur lot 6.000) -> membuktikan FIFO urut lot_date benar.
    expect(Number(result.lines[0].costBasisAmount)).toBe(35000);

    const lots: { unit_cost: string; qty_remaining: string }[] =
      await dataSource.query(
        `SELECT unit_cost, qty_remaining FROM stock_cost_lots
         WHERE product_id = $1 AND warehouse_id = $2 ORDER BY lot_date ASC`,
        [productId, badStockWarehouseId],
      );
    expect(Number(lots[0].unit_cost)).toBe(5000);
    expect(Number(lots[0].qty_remaining)).toBe(3); // 10 - 7
    expect(Number(lots[1].unit_cost)).toBe(6000);
    expect(Number(lots[1].qty_remaining)).toBe(10); // tidak tersentuh
  });

  it('settlementType=CASH tanpa cashAccountId -> 400; cashAccountId bukan akun kas -> 400', async () => {
    const supplierId = await createTestSupplier();
    const productId = await createTestProduct('Produk Cash', []);
    await seedBadStockLot(productId, supplierId, 5, 5000);

    const baseDto: CreatePurchaseReturnDto = {
      supplierId,
      returnDate: isoTodayMinus(0),
      unitMode: PurchaseReturnUnitMode.KECIL,
      settlementType: PurchaseReturnSettlementType.CASH,
      lines: [{ productId, qtyInput: 5, agreedUnitPrice: 5000 }],
    };

    await expect(service.create(baseDto, masterUser)).rejects.toThrow(
      /cashAccountId wajib diisi/,
    );

    await expect(
      service.create(
        { ...baseDto, cashAccountId: nonCashAccountId },
        masterUser,
      ),
    ).rejects.toThrow(/bukan akun/);
  });

  it('unitMode=BESAR untuk produk TANPA satuan besar terdaftar -> 400 jelas', async () => {
    const supplierId = await createTestSupplier();
    const productId = await createTestProduct('Produk Tanpa Besar', []);

    const dto: CreatePurchaseReturnDto = {
      supplierId,
      returnDate: isoTodayMinus(0),
      unitMode: PurchaseReturnUnitMode.BESAR,
      settlementType: PurchaseReturnSettlementType.REDUCE_INVOICE,
      lines: [{ productId, qtyInput: 1, agreedUnitPrice: 90000 }],
    };

    await expect(service.create(dto, masterUser)).rejects.toThrow(
      /tidak punya satuan besar terdaftar/,
    );
  });

  it('unitMode=BESAR untuk produk yang punya LEBIH DARI SATU satuan besar -> 400 jelas, tidak diam-diam pakai yang pertama', async () => {
    const supplierId = await createTestSupplier();
    const productId = await createTestProduct('Produk Dua Satuan Besar', [
      { unitName: 'DUS', qtyInBaseUnit: 12, level: 1 },
      { unitName: 'RENCENG', qtyInBaseUnit: 10, level: 2 },
    ]);

    const dto: CreatePurchaseReturnDto = {
      supplierId,
      returnDate: isoTodayMinus(0),
      unitMode: PurchaseReturnUnitMode.BESAR,
      settlementType: PurchaseReturnSettlementType.REDUCE_INVOICE,
      lines: [{ productId, qtyInput: 1, agreedUnitPrice: 90000 }],
    };

    await expect(service.create(dto, masterUser)).rejects.toThrow(
      /lebih dari satu satuan besar/,
    );
  });

  it('unitMode=KECIL -> qtyBaseUnit = qtyInput langsung, tanpa lookup konversi (produk tanpa unitConversions tetap jalan)', async () => {
    const supplierId = await createTestSupplier();
    const productId = await createTestProduct('Produk Kecil', []); // TIDAK ADA konversi sama sekali
    await seedBadStockLot(productId, supplierId, 15, 4000);

    const dto: CreatePurchaseReturnDto = {
      supplierId,
      returnDate: isoTodayMinus(0),
      unitMode: PurchaseReturnUnitMode.KECIL,
      settlementType: PurchaseReturnSettlementType.REDUCE_INVOICE,
      lines: [{ productId, qtyInput: 9, agreedUnitPrice: 4500 }],
    };

    const result = await service.create(dto, masterUser);
    createdReturnIds.push(result.purchaseReturn.id);

    expect(Number(result.lines[0].qtyInput)).toBe(9);
    expect(Number(result.lines[0].qtyBaseUnit)).toBe(9); // identik, tanpa konversi
  });

  it('settlementType=CASH dengan cashAccountId valid -> jurnal debit ke akun kas itu, bukan Hutang Usaha', async () => {
    const supplierId = await createTestSupplier();
    const productId = await createTestProduct('Produk Cash Sukses', []);
    await seedBadStockLot(productId, supplierId, 5, 5000);

    const dto: CreatePurchaseReturnDto = {
      supplierId,
      returnDate: isoTodayMinus(0),
      unitMode: PurchaseReturnUnitMode.KECIL,
      settlementType: PurchaseReturnSettlementType.CASH,
      cashAccountId,
      lines: [{ productId, qtyInput: 5, agreedUnitPrice: 5000 }],
    };

    const result = await service.create(dto, masterUser);
    createdReturnIds.push(result.purchaseReturn.id);

    const cashLine = result.journalEntry.lines.find(
      (l) => l.accountId === cashAccountId,
    );
    expect(cashLine).toBeDefined();
    expect(Number(cashLine!.debitAmount)).toBe(25000);
    const payableLine = result.journalEntry.lines.find(
      (l) => l.accountId === payableAccountId,
    );
    expect(payableLine).toBeUndefined();
  });
});
