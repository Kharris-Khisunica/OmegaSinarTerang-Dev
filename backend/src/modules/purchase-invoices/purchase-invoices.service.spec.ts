import { HttpException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { AccountResolverService } from '../../core/account-resolver/account-resolver.service';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { DocumentReviseService } from '../../core/document-revise/document-revise.service';
import { JournalPosterService } from '../../core/journal-poster/journal-poster.service';
import { PeriodLockValidatorService } from '../../core/period-lock/period-lock-validator.service';
import { PrintLockService } from '../../core/print-lock/print-lock.service';
import { StockRecorderService } from '../../core/stock-recorder/stock-recorder.service';
import { TaxRateResolverService } from '../../core/tax-rates/tax-rate-resolver.service';
import { StepUpService } from '../../core/step-up/step-up.service';
import { VoidEngineService } from '../../core/void/void.service';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { AuthorizationRequestsService } from '../authorization-requests/authorization-requests.service';
import { AuthorizationRequest } from '../authorization-requests/entities/authorization-request.entity';
import { StepUpRequiredBody } from '../authorization-requests/step-up-response';
import { Brand } from '../brands/entities/brand.entity';
import { ChartOfAccount } from '../chart-of-accounts/entities/chart-of-account.entity';
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
import { TaxRate } from '../tax-rates/entities/tax-rate.entity';
import { Unit } from '../units/entities/unit.entity';
import { User } from '../users/entities/user.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { GoodsReceiptLine } from './entities/goods-receipt-line.entity';
import { GoodsReceipt } from './entities/goods-receipt.entity';
import { PurchaseInvoiceLine } from './entities/purchase-invoice-line.entity';
import {
  PurchaseInvoice,
  PurchaseInvoicePostingStatus,
  PurchaseInvoicePrintStatus,
  PurchaseInvoiceReviewStatus,
} from './entities/purchase-invoice.entity';
import { PurchaseInvoiceVoidHook } from './purchase-invoice-void.hook';
import { PurchaseInvoicesService } from './purchase-invoices.service';

/**
 * Integration test terhadap Postgres asli, pola sama
 * warehouse-mutations.service.spec.ts / opening-balance.service.spec.ts —
 * semua service dikonstruksi manual lewat `new` (bypass Nest DI). Tidak
 * membuat warehouse STORE sendiri — dev DB sudah punya tepat satu STORE aktif
 * ber-is_default=true ("Gudang Utama"), dan asersi di sini di-scope ke
 * product_id/invoice_id milik test ini sendiri, bukan bergantung pada
 * warehouse mana yang dipilih.
 */
describe('PurchaseInvoicesService', () => {
  let dataSource: DataSource;
  let productsService: ProductsService;
  let stockRecorderService: StockRecorderService;
  let authorizationRequestsService: AuthorizationRequestsService;
  let service: PurchaseInvoicesService;

  let masterUserId: string;
  let operatorUserId: string;
  let supervisorUserId: string;
  let brandId: string;
  let unitId: string;
  let storeWarehouseId: string;

  const createdProductIds: string[] = [];
  const createdSupplierIds: string[] = [];
  const createdInvoiceIds: string[] = [];
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
        Supplier,
        Warehouse,
        Unit,
        ChartOfAccount,
        JournalEntry,
        JournalEntryLine,
        StockMovement,
        StockCostLot,
        StockCostConsumption,
        TaxRate,
        PurchaseInvoice,
        PurchaseInvoiceLine,
        GoodsReceipt,
        GoodsReceiptLine,
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
    const taxRateResolverService = new TaxRateResolverService(dataSource);
    authorizationRequestsService = new AuthorizationRequestsService(
      dataSource.getRepository(AuthorizationRequest),
    );
    const stepUpService = new StepUpService(authorizationRequestsService);
    const printLockService = new PrintLockService(dataSource, stepUpService);
    const voidEngineService = new VoidEngineService(
      journalPosterService,
      stockRecorderService,
    );
    const voidHook = new PurchaseInvoiceVoidHook(
      voidEngineService,
      stockRecorderService,
    );
    voidHook.onModuleInit();
    const documentReviseService = new DocumentReviseService(
      journalPosterService,
      stockRecorderService,
      periodLockValidatorService,
    );

    service = new PurchaseInvoicesService(
      dataSource,
      dataSource.getRepository(PurchaseInvoice),
      documentCounterService,
      stockRecorderService,
      journalPosterService,
      accountResolverService,
      taxRateResolverService,
      printLockService,
      voidEngineService,
      documentReviseService,
    );

    const suffix = Date.now();

    const usersRepo = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('test-password', 4);
    const master = await usersRepo.save(
      usersRepo.create({
        username: `test_pi_master_${suffix}`,
        passwordHash,
        fullName: 'Test PurchaseInvoices Master',
        role: Role.MASTER,
        isActive: true,
      }),
    );
    masterUserId = master.id;
    masterUser.sub = masterUserId;

    const operator = await usersRepo.save(
      usersRepo.create({
        username: `test_pi_operator_${suffix}`,
        passwordHash,
        fullName: 'Test PurchaseInvoices Operator',
        role: Role.OPERATOR,
        isActive: true,
      }),
    );
    operatorUserId = operator.id;
    operatorUser.sub = operatorUserId;

    const supervisor = await usersRepo.save(
      usersRepo.create({
        username: `test_pi_supervisor_${suffix}`,
        passwordHash,
        fullName: 'Test PurchaseInvoices Supervisor',
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
        code: `TPI-${suffix.toString().slice(-8)}`,
        name: 'Merek Uji Faktur Pembelian',
        isActive: true,
      }),
    );
    brandId = brand.id;

    const unitsRepo = dataSource.getRepository(Unit);
    const unit = await unitsRepo.save(
      unitsRepo.create({
        code: `DUS-TPI-${suffix.toString().slice(-6)}`,
        name: 'DUS',
        isActive: true,
      }),
    );
    unitId = unit.id;
  });

  afterAll(async () => {
    if (createdRequestIds.length > 0) {
      await dataSource.query(
        `DELETE FROM authorization_requests WHERE id = ANY($1)`,
        [createdRequestIds],
      );
    }
    if (createdInvoiceIds.length > 0) {
      // VOID (Hari 15) menulis journal_entries reversal ber-reversed_entry_id
      // menunjuk entry asli (self-FK NOT DEFERRABLE) — anak dulu, baru induk.
      await dataSource.query(
        `DELETE FROM journal_entry_lines WHERE journal_entry_id IN (
           SELECT id FROM journal_entries WHERE source_type = 'PURCHASE_INVOICE' AND source_id = ANY($1)
           UNION
           SELECT id FROM journal_entries WHERE reversed_entry_id IN (
             SELECT id FROM journal_entries WHERE source_type = 'PURCHASE_INVOICE' AND source_id = ANY($1)
           )
         )`,
        [createdInvoiceIds],
      );
      await dataSource.query(
        `DELETE FROM journal_entries WHERE reversed_entry_id IN (
           SELECT id FROM journal_entries WHERE source_type = 'PURCHASE_INVOICE' AND source_id = ANY($1)
         )`,
        [createdInvoiceIds],
      );
      await dataSource.query(
        `DELETE FROM journal_entries WHERE source_type = 'PURCHASE_INVOICE' AND source_id = ANY($1)`,
        [createdInvoiceIds],
      );
      await dataSource.query(
        `DELETE FROM goods_receipt_lines WHERE goods_receipt_id IN (SELECT id FROM goods_receipts WHERE purchase_invoice_id = ANY($1))`,
        [createdInvoiceIds],
      );
      await dataSource.query(
        `DELETE FROM goods_receipts WHERE purchase_invoice_id = ANY($1)`,
        [createdInvoiceIds],
      );
      await dataSource.query(
        `DELETE FROM purchase_invoice_lines WHERE purchase_invoice_id = ANY($1)`,
        [createdInvoiceIds],
      );
      await dataSource.query(
        `DELETE FROM purchase_invoices WHERE id = ANY($1)`,
        [createdInvoiceIds],
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
    if (createdTaxRateIds.length > 0) {
      await dataSource.query(`DELETE FROM tax_rates WHERE id = ANY($1)`, [
        createdTaxRateIds,
      ]);
    }
    if (createdSupplierIds.length > 0) {
      await dataSource.query(`DELETE FROM suppliers WHERE id = ANY($1)`, [
        createdSupplierIds,
      ]);
    }
    await dataSource.query(`DELETE FROM units WHERE id = $1`, [unitId]);
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

  async function createTestProduct(
    label: string,
    isBkp: boolean,
  ): Promise<string> {
    const product = await productsService.create({
      brandId,
      keterangan: `${label} ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      baseUnit: 'PCS',
      isBkp,
      unitConversions: [{ unitName: 'DUS', qtyInBaseUnit: 12, level: 1 }],
    });
    createdProductIds.push(product.id);
    return product.id;
  }

  async function createTestSupplier(isPkp: boolean): Promise<string> {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const supplier = await dataSource.getRepository(Supplier).save(
      dataSource.getRepository(Supplier).create({
        displayCode: `SUP-TPI-${suffix}`,
        name: `Supplier Uji Faktur Pembelian ${suffix}`,
        isPkp,
        isActive: true,
      }),
    );
    createdSupplierIds.push(supplier.id);
    return supplier.id;
  }

  async function seedTaxRate(ratePercent: number): Promise<void> {
    const taxRate = await dataSource.getRepository(TaxRate).save(
      dataSource.getRepository(TaxRate).create({
        name: `PPN ${ratePercent}% (uji)`,
        rate: ratePercent.toFixed(2),
        effectiveFrom: '2020-01-01',
        effectiveTo: null,
      }),
    );
    createdTaxRateIds.push(taxRate.id);
  }

  function daysAgoIso(days: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  }

  function addDaysIso(iso: string, days: number): string {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  it('3 baris + 1 bonus + diskon faktur (K5): jurnal balance 3 baris (+ Diskon Pembelian), TIDAK ada alokasi ke baris, 4 lot (1 unit_cost=0), total_amount eksak, lot_date=receipt_date, due_date dari supplier_invoice_date, non-PKP supplier -> input_vat 0 walau produk BKP', async () => {
    const supplierId = await createTestSupplier(false);
    const productA = await createTestProduct('Produk A', true);
    const productB = await createTestProduct('Produk B', true);
    const productC = await createTestProduct('Produk C', true);

    const receiptDate = daysAgoIso(1);
    const supplierInvoiceDate = daysAgoIso(6);
    const termDays = 30;

    const dto: CreatePurchaseInvoiceDto = {
      supplierId,
      supplierInvoiceNo: 'SINV-001',
      receiptDate,
      supplierInvoiceDate,
      termDays,
      invoiceDiscountAmount: 10000,
      lines: [
        { productId: productA, unitId, qtyInput: 10, unitPrice: 50000 }, // gross 500.000
        { productId: productB, unitId, qtyInput: 5, unitPrice: 80000 }, // gross 400.000, TIDAK ada diskon baris (K5)
        { productId: productC, unitId, qtyInput: 8, unitPrice: 30000 }, // gross 240.000
        { productId: productA, unitId, qtyInput: 2, isBonus: true }, // bonus, sama produk dgn baris 1
      ],
    };

    const result = await service.create(dto, masterUser);
    createdInvoiceIds.push(result.purchaseInvoice.id);

    // --- Struktur dasar ---------------------------------------------------
    expect(result.lines).toHaveLength(4);
    expect(result.purchaseInvoice.invoiceNumber).toMatch(/^B1\/[^/]+-\d{8}$/);

    const bonusLine = result.lines.find((l) => l.isBonus);
    expect(bonusLine).toBeDefined();
    expect(Number(bonusLine!.unitCostResult)).toBe(0);
    expect(Number(bonusLine!.unitPrice)).toBe(0);
    expect(Number(bonusLine!.allocatedInvoiceDiscount)).toBe(0);
    expect(Number(bonusLine!.inputVat)).toBe(0);

    // --- 4 lot, satu unit_cost = 0 -----------------------------------------
    const lots: { unit_cost: string; lot_date: string; qty_in: string }[] =
      await dataSource.query(
        `SELECT unit_cost, TO_CHAR(lot_date, 'YYYY-MM-DD') AS lot_date, qty_in FROM stock_cost_lots WHERE source_type = 'PURCHASE_INVOICE' AND source_id = $1 ORDER BY created_at`,
        [result.purchaseInvoice.id],
      );
    expect(lots).toHaveLength(4);
    const zeroCostLots = lots.filter((lot) => Number(lot.unit_cost) === 0);
    expect(zeroCostLots).toHaveLength(1);

    // --- lot_date = receipt_date, BUKAN supplier_invoice_date --------------
    for (const lot of lots) {
      expect(lot.lot_date).toBe(receiptDate);
      expect(lot.lot_date).not.toBe(supplierInvoiceDate);
    }

    // --- due_date = supplier_invoice_date + term_days, BUKAN receipt_date --
    const expectedDueDate = addDaysIso(supplierInvoiceDate, termDays);
    const expectedWrongDueDate = addDaysIso(receiptDate, termDays);
    expect(expectedDueDate).not.toBe(expectedWrongDueDate);
    expect(result.purchaseInvoice.dueDate).toBe(expectedDueDate);

    // --- K5: diskon faktur TIDAK dialokasikan ke baris mana pun ------------
    for (const line of result.lines) {
      expect(Number(line.allocatedInvoiceDiscount)).toBe(0);
    }
    // lineFinalAmount = baris[i] (gross) polos, tanpa alokasi.
    expect(Number(result.lines[0].lineFinalAmount)).toBe(500000);
    expect(Number(result.lines[1].lineFinalAmount)).toBe(400000);
    expect(Number(result.lines[2].lineFinalAmount)).toBe(240000);

    // --- total_amount eksak, tanpa pembulatan (K5: TIDAK ada residu alokasi)
    // subtotal = 500.000 + 400.000 + 240.000 + 0 = 1.140.000
    // total_bayar = subtotal - diskon faktur (10.000) + PPN (0, supplier non-PKP) = 1.130.000
    expect(Number(result.purchaseInvoice.subtotal)).toBe(1_140_000);
    expect(Number(result.purchaseInvoice.totalAmount)).toBe(1_130_000);

    // --- unit_cost per lot TIDAK terpengaruh diskon faktur (K5) ------------
    // qtyBaseUnit: A=10x12=120, B=5x12=60, C=8x12=96
    expect(Number(result.lines[0].unitCostResult)).toBeCloseTo(500000 / 120, 4);
    expect(Number(result.lines[1].unitCostResult)).toBeCloseTo(400000 / 60, 4);
    expect(Number(result.lines[2].unitCostResult)).toBeCloseTo(240000 / 96, 4);

    // --- Supplier non-PKP -> input_vat 0 di semua baris walau produk BKP ---
    for (const line of result.lines) {
      expect(Number(line.inputVat)).toBe(0);
    }
    expect(Number(result.purchaseInvoice.inputVatAmount)).toBe(0);

    // --- Jurnal balance, 3 baris (Persediaan D / Hutang K / Diskon
    // Pembelian K — K6, karena diskon_faktur > 0) ---------------------------
    expect(result.journalEntry.lines).toHaveLength(3);
    const totalDebit = result.journalEntry.lines.reduce(
      (sum, l) => sum + Number(l.debitAmount),
      0,
    );
    const totalCredit = result.journalEntry.lines.reduce(
      (sum, l) => sum + Number(l.creditAmount),
      0,
    );
    expect(totalDebit).toBe(totalCredit);
    expect(totalDebit).toBe(1_140_000);

    const inventoryLine = result.journalEntry.lines.find(
      (l) => Number(l.debitAmount) > 0,
    );
    expect(Number(inventoryLine!.debitAmount)).toBe(1_140_000);

    const payableLine = result.journalEntry.lines.find(
      (l) => Number(l.creditAmount) === 1_130_000,
    );
    expect(payableLine).toBeDefined();

    const discountLine = result.journalEntry.lines.find(
      (l) => Number(l.creditAmount) === 10_000,
    );
    expect(discountLine).toBeDefined();
    expect(discountLine!.accountId).not.toBe(payableLine!.accountId);

    // --- Invariant ke-5, di-scope ke faktur ini: Σ nilai lot baru = debit
    // Persediaan yang baru diposting (lot masih fresh, qty_remaining = qty_in).
    // Toleransi presisi 1 (bukan 2): unit_cost disimpan NUMERIC(16,4), jadi
    // qty x unit_cost merekonstruksi nilai dengan residu pembulatan hingga
    // qty x 0.00005 per baris — dengan 3 baris ber-qty sampai 120, residu
    // terakumulasi bisa sedikit di atas 0,005 (bukan bug logika).
    const lotValue = lots.reduce(
      (sum, lot) => sum + Number(lot.qty_in) * Number(lot.unit_cost),
      0,
    );
    expect(lotValue).toBeCloseTo(Number(inventoryLine!.debitAmount), 1);

    // --- Dump manual: baris, lot, dan jurnal berdampingan -------------------
    console.log('--- purchase_invoice_lines ---');
    console.log(
      result.lines.map((l) => ({
        productId: l.productId,
        qtyInput: l.qtyInput,
        qtyBaseUnit: l.qtyBaseUnit,
        unitPrice: l.unitPrice,
        discountAmount: l.discountAmount,
        allocatedInvoiceDiscount: l.allocatedInvoiceDiscount,
        lineFinalAmount: l.lineFinalAmount,
        inputVat: l.inputVat,
        unitCostResult: l.unitCostResult,
        isBonus: l.isBonus,
      })),
    );
    console.log('--- stock_cost_lots ---');
    console.log(lots);
    console.log('--- journal_entries + lines ---');
    console.log({
      entryNumber: result.journalEntry.entryNumber,
      entryDate: result.journalEntry.entryDate,
      lines: result.journalEntry.lines.map((l) => ({
        accountId: l.accountId,
        debit: l.debitAmount,
        credit: l.creditAmount,
      })),
    });
  });

  describe('Paket R7: diskon faktur rupiah, tanpa alokasi (K5+K6)', () => {
    it('diskon faktur Rp 100.000 (10 dus x Rp 125.000): unit_cost lot TIDAK berubah/bulat, jurnal memuat baris Diskon Pembelian 100.000 di kredit', async () => {
      const supplierId = await createTestSupplier(false);
      const productId = await createTestProduct('Produk Diskon Faktur', false);

      const result = await service.create(
        {
          supplierId,
          supplierInvoiceNo: `SINV-R7-${Date.now()}`,
          receiptDate: daysAgoIso(0),
          supplierInvoiceDate: daysAgoIso(1),
          termDays: 14,
          invoiceDiscountAmount: 100000,
          lines: [{ productId, unitId, qtyInput: 10, unitPrice: 125000 }], // gross 1.250.000
        },
        masterUser,
      );
      createdInvoiceIds.push(result.purchaseInvoice.id);

      // unit_cost = 125.000 / isi per dus (12) -> BULAT, tidak terpengaruh diskon.
      const qtyBaseUnit = Number(result.lines[0].qtyBaseUnit); // 10 x 12 = 120
      expect(Number(result.lines[0].unitCostResult)).toBeCloseTo(
        1250000 / qtyBaseUnit,
        4,
      );
      expect(Number(result.lines[0].unitCostResult)).toBeCloseTo(
        125000 / 12,
        4,
      );

      expect(Number(result.purchaseInvoice.subtotal)).toBe(1_250_000);
      expect(Number(result.purchaseInvoice.totalAmount)).toBe(1_150_000);

      expect(result.journalEntry.lines).toHaveLength(3);
      const inventoryLine = result.journalEntry.lines.find(
        (l) => Number(l.debitAmount) === 1_250_000,
      );
      const payableLine = result.journalEntry.lines.find(
        (l) => Number(l.creditAmount) === 1_150_000,
      );
      const discountLine = result.journalEntry.lines.find(
        (l) => Number(l.creditAmount) === 100_000,
      );
      expect(inventoryLine).toBeDefined();
      expect(payableLine).toBeDefined();
      expect(discountLine).toBeDefined();

      const totalDebit = result.journalEntry.lines.reduce(
        (sum, l) => sum + Number(l.debitAmount),
        0,
      );
      const totalCredit = result.journalEntry.lines.reduce(
        (sum, l) => sum + Number(l.creditAmount),
        0,
      );
      expect(totalDebit).toBe(totalCredit);

      const account: { code: string; is_postable: boolean }[] =
        await dataSource.query(
          `SELECT code, is_postable FROM chart_of_accounts WHERE id = $1`,
          [discountLine!.accountId],
        );
      expect(account[0]?.code).toBe('07.110.00005');
      expect(account[0]?.is_postable).toBe(true);
    });

    it('diskon faktur 0 -> TIDAK ada baris Diskon Pembelian, jurnal tetap 2 baris', async () => {
      const supplierId = await createTestSupplier(false);
      const productId = await createTestProduct(
        'Produk Tanpa Diskon Faktur',
        false,
      );

      const result = await service.create(
        {
          supplierId,
          supplierInvoiceNo: `SINV-R7-ZERO-${Date.now()}`,
          receiptDate: daysAgoIso(0),
          supplierInvoiceDate: daysAgoIso(1),
          termDays: 14,
          lines: [{ productId, unitId, qtyInput: 2, unitPrice: 50000 }],
        },
        masterUser,
      );
      createdInvoiceIds.push(result.purchaseInvoice.id);

      expect(result.journalEntry.lines).toHaveLength(2);
      const accountIds = result.journalEntry.lines.map((l) => l.accountId);
      const accounts: { id: string; code: string }[] = await dataSource.query(
        `SELECT id, code FROM chart_of_accounts WHERE id = ANY($1)`,
        [accountIds],
      );
      expect(accounts.some((a) => a.code === '07.110.00005')).toBe(false);
    });

    it('diskon baris (discountAmount != 0) -> 400, pesan Indonesia', async () => {
      const supplierId = await createTestSupplier(false);
      const productId = await createTestProduct(
        'Produk Diskon Baris Ditolak',
        false,
      );

      await expect(
        service.create(
          {
            supplierId,
            supplierInvoiceNo: `SINV-R7-LINEDISC-${Date.now()}`,
            receiptDate: daysAgoIso(0),
            supplierInvoiceDate: daysAgoIso(1),
            termDays: 14,
            lines: [
              {
                productId,
                unitId,
                qtyInput: 2,
                unitPrice: 50000,
                discountAmount: 1000,
              },
            ],
          },
          masterUser,
        ),
      ).rejects.toThrow(/sudah tidak dipakai/i);
    });

    it('diskon baris (discountPercent != 0) -> 400', async () => {
      const supplierId = await createTestSupplier(false);
      const productId = await createTestProduct(
        'Produk Diskon Persen Baris Ditolak',
        false,
      );

      await expect(
        service.create(
          {
            supplierId,
            supplierInvoiceNo: `SINV-R7-LINEPCT-${Date.now()}`,
            receiptDate: daysAgoIso(0),
            supplierInvoiceDate: daysAgoIso(1),
            termDays: 14,
            lines: [
              {
                productId,
                unitId,
                qtyInput: 2,
                unitPrice: 50000,
                discountPercent: 5,
              },
            ],
          },
          masterUser,
        ),
      ).rejects.toThrow(/sudah tidak dipakai/i);
    });

    it('diskon faktur persen (invoiceDiscountPercent != 0) -> 400 (K5: mode persen faktur di-drop)', async () => {
      const supplierId = await createTestSupplier(false);
      const productId = await createTestProduct(
        'Produk Diskon Persen Faktur Ditolak',
        false,
      );

      await expect(
        service.create(
          {
            supplierId,
            supplierInvoiceNo: `SINV-R7-INVPCT-${Date.now()}`,
            receiptDate: daysAgoIso(0),
            supplierInvoiceDate: daysAgoIso(1),
            termDays: 14,
            invoiceDiscountPercent: 10,
            lines: [{ productId, unitId, qtyInput: 2, unitPrice: 50000 }],
          },
          masterUser,
        ),
      ).rejects.toThrow(/sudah tidak dipakai/i);
    });

    it('POST tanpa supplierInvoiceNo -> 201/sukses (asumsi A3: opsional)', async () => {
      const supplierId = await createTestSupplier(false);
      const productId = await createTestProduct(
        'Produk Tanpa Nomor Faktur Supplier',
        false,
      );

      const dto: CreatePurchaseInvoiceDto = {
        supplierId,
        receiptDate: daysAgoIso(0),
        supplierInvoiceDate: daysAgoIso(1),
        termDays: 14,
        lines: [{ productId, unitId, qtyInput: 1, unitPrice: 10000 }],
      };

      const result = await service.create(dto, masterUser);
      createdInvoiceIds.push(result.purchaseInvoice.id);

      expect(result.purchaseInvoice.supplierInvoiceNo).toBeNull();
    });

    it('pencarian faktur (findAll search) tetap berfungsi saat ada baris ber-supplier_invoice_no NULL', async () => {
      const supplierId = await createTestSupplier(false);
      const productId = await createTestProduct(
        'Produk Pencarian Nomor NULL',
        false,
      );

      const dto: CreatePurchaseInvoiceDto = {
        supplierId,
        receiptDate: daysAgoIso(0),
        supplierInvoiceDate: daysAgoIso(1),
        termDays: 14,
        lines: [{ productId, unitId, qtyInput: 1, unitPrice: 10000 }],
      };

      const result = await service.create(dto, masterUser);
      createdInvoiceIds.push(result.purchaseInvoice.id);
      expect(result.purchaseInvoice.supplierInvoiceNo).toBeNull();

      const found = await service.findAll({
        search: result.purchaseInvoice.invoiceNumber,
        page: 1,
        limit: 100,
      });
      expect(
        found.data.some((row) => row.id === result.purchaseInvoice.id),
      ).toBe(true);
    });

    it('baris bonus tetap unit_cost 0 walau faktur punya diskon faktur', async () => {
      const supplierId = await createTestSupplier(false);
      const productId = await createTestProduct(
        'Produk Bonus Dengan Diskon Faktur',
        false,
      );

      const result = await service.create(
        {
          supplierId,
          supplierInvoiceNo: `SINV-R7-BONUS-${Date.now()}`,
          receiptDate: daysAgoIso(0),
          supplierInvoiceDate: daysAgoIso(1),
          termDays: 14,
          invoiceDiscountAmount: 5000,
          lines: [
            { productId, unitId, qtyInput: 4, unitPrice: 40000 }, // gross 160.000
            { productId, unitId, qtyInput: 1, isBonus: true },
          ],
        },
        masterUser,
      );
      createdInvoiceIds.push(result.purchaseInvoice.id);

      const bonusLine = result.lines.find((l) => l.isBonus);
      expect(bonusLine).toBeDefined();
      expect(Number(bonusLine!.unitCostResult)).toBe(0);
      expect(Number(bonusLine!.unitPrice)).toBe(0);
      expect(Number(bonusLine!.allocatedInvoiceDiscount)).toBe(0);
      expect(Number(bonusLine!.inputVat)).toBe(0);
    });
  });

  it('supplier PKP + produk non-BKP -> input_vat 0, jurnal tetap 2 baris', async () => {
    const supplierId = await createTestSupplier(true);
    const productId = await createTestProduct('Produk Non-BKP', false);
    const receiptDate = daysAgoIso(0);
    const supplierInvoiceDate = daysAgoIso(3);

    const dto: CreatePurchaseInvoiceDto = {
      supplierId,
      supplierInvoiceNo: 'SINV-002',
      receiptDate,
      supplierInvoiceDate,
      termDays: 14,
      lines: [{ productId, unitId, qtyInput: 3, unitPrice: 100000 }],
    };

    const result = await service.create(dto, masterUser);
    createdInvoiceIds.push(result.purchaseInvoice.id);

    expect(Number(result.lines[0].inputVat)).toBe(0);
    expect(Number(result.purchaseInvoice.inputVatAmount)).toBe(0);
    expect(result.journalEntry.lines).toHaveLength(2);
  });

  it('supplier PKP + produk BKP -> PPN masukan dihitung dari tax_rates efektif (supplier_invoice_date), dikapitalisasi ke harga pokok karena company_is_pkp masih false', async () => {
    await seedTaxRate(11);
    const supplierId = await createTestSupplier(true);
    const productId = await createTestProduct('Produk BKP', true);
    const receiptDate = daysAgoIso(0);
    const supplierInvoiceDate = daysAgoIso(2);

    const dto: CreatePurchaseInvoiceDto = {
      supplierId,
      supplierInvoiceNo: 'SINV-003',
      receiptDate,
      supplierInvoiceDate,
      termDays: 14,
      lines: [{ productId, unitId, qtyInput: 4, unitPrice: 100000 }], // gross 400.000
    };

    const result = await service.create(dto, masterUser);
    createdInvoiceIds.push(result.purchaseInvoice.id);

    const line = result.lines[0];
    expect(Number(line.lineFinalAmount)).toBe(400000);
    expect(Number(line.inputVat)).toBe(44000); // 400.000 x 11%
    expect(Number(result.purchaseInvoice.inputVatAmount)).toBe(44000);

    // company_is_pkp masih false -> PPN masuk ke unit_cost (harga pokok),
    // jurnal tetap 2 baris (Persediaan sudah termasuk PPN).
    expect(result.journalEntry.lines).toHaveLength(2);
    const qtyBaseUnit = Number(line.qtyBaseUnit); // 4 x 12 = 48
    const expectedUnitCost = (400000 + 44000) / qtyBaseUnit;
    expect(Number(line.unitCostResult)).toBeCloseTo(expectedUnitCost, 4);

    const totalDebit = result.journalEntry.lines.reduce(
      (sum, l) => sum + Number(l.debitAmount),
      0,
    );
    expect(totalDebit).toBe(444000);
  });

  it('company_is_pkp = true -> jurnal 3 baris (Persediaan D / PPN Masukan D / Hutang K), harga pokok TIDAK termasuk PPN', async () => {
    await seedTaxRate(11);
    const supplierId = await createTestSupplier(true);
    const productId = await createTestProduct('Produk BKP PKP', true);
    const receiptDate = daysAgoIso(0);
    const supplierInvoiceDate = daysAgoIso(2);

    await dataSource.query(
      `UPDATE settings SET value = 'true' WHERE key = 'company_is_pkp'`,
    );
    try {
      const dto: CreatePurchaseInvoiceDto = {
        supplierId,
        supplierInvoiceNo: 'SINV-004',
        receiptDate,
        supplierInvoiceDate,
        termDays: 14,
        lines: [{ productId, unitId, qtyInput: 5, unitPrice: 60000 }], // gross 300.000
      };

      const result = await service.create(dto, masterUser);
      createdInvoiceIds.push(result.purchaseInvoice.id);

      const line = result.lines[0];
      expect(Number(line.lineFinalAmount)).toBe(300000);
      expect(Number(line.inputVat)).toBe(33000); // 300.000 x 11%

      // Cabang company_is_pkp=true: harga pokok TIDAK termasuk PPN.
      const qtyBaseUnit = Number(line.qtyBaseUnit); // 5 x 12 = 60
      expect(Number(line.unitCostResult)).toBeCloseTo(300000 / qtyBaseUnit, 4);

      expect(result.journalEntry.lines).toHaveLength(3);
      const debitLines = result.journalEntry.lines.filter(
        (l) => Number(l.debitAmount) > 0,
      );
      const creditLines = result.journalEntry.lines.filter(
        (l) => Number(l.creditAmount) > 0,
      );
      expect(debitLines).toHaveLength(2); // Persediaan + PPN Masukan
      expect(creditLines).toHaveLength(1); // Hutang Usaha

      const totalDebit = result.journalEntry.lines.reduce(
        (sum, l) => sum + Number(l.debitAmount),
        0,
      );
      const totalCredit = result.journalEntry.lines.reduce(
        (sum, l) => sum + Number(l.creditAmount),
        0,
      );
      expect(totalDebit).toBe(totalCredit);
      expect(totalDebit).toBe(333000);

      const inventoryDebit = debitLines.find(
        (l) => Number(l.debitAmount) === 300000,
      );
      const vatDebit = debitLines.find((l) => Number(l.debitAmount) === 33000);
      expect(inventoryDebit).toBeDefined();
      expect(vatDebit).toBeDefined();
    } finally {
      await dataSource.query(
        `UPDATE settings SET value = 'false' WHERE key = 'company_is_pkp'`,
      );
    }
  });

  describe('kunci cetak generik + edit/VOID (Hari 15)', () => {
    async function createSimpleInvoice(): Promise<{
      invoice: PurchaseInvoice;
      productId: string;
    }> {
      const supplierId = await createTestSupplier(false);
      const productId = await createTestProduct('Produk Kunci Cetak', false);
      const result = await service.create(
        {
          supplierId,
          supplierInvoiceNo: `SINV-LOCK-${Date.now()}`,
          receiptDate: daysAgoIso(0),
          supplierInvoiceDate: daysAgoIso(1),
          termDays: 14,
          lines: [{ productId, unitId, qtyInput: 2, unitPrice: 50000 }],
        },
        masterUser,
      );
      createdInvoiceIds.push(result.purchaseInvoice.id);
      return { invoice: result.purchaseInvoice, productId };
    }

    async function consumeInvoiceLot(
      productId: string,
      qty: number,
    ): Promise<void> {
      await dataSource.transaction((manager) =>
        stockRecorderService.recordOut(
          {
            productId,
            warehouseId: storeWarehouseId,
            qtyBaseUnit: qty,
            movementDate: new Date(),
            movementType: StockMovementType.SALE,
            sourceType: 'SALES_INVOICE',
            sourceId: null,
            createdBy: masterUserId,
          },
          manager,
        ),
      );
    }

    async function unlockAndRetry<T>(
      call: (authorizationRequestId?: string) => Promise<T>,
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
      return call(authorizationRequestId);
    }

    async function expectStepUp412(promise: Promise<unknown>): Promise<void> {
      try {
        await promise;
        throw new Error('Seharusnya melempar 412.');
      } catch (err) {
        expect(err).toBeInstanceOf(HttpException);
        expect((err as HttpException).getStatus()).toBe(412);
      }
    }

    it('cetak ulang identik: print_count naik, tanpa approval, boleh berkali-kali', async () => {
      const { invoice } = await createSimpleInvoice();

      const first = await service.registerPrint(invoice.id);
      expect(first.printCount).toBe(1);
      expect(first.printStatus).toBe(PurchaseInvoicePrintStatus.PRINTED);

      const second = await service.registerPrint(invoice.id);
      expect(second.printCount).toBe(2);

      const requests: unknown[] = await dataSource.query(
        `SELECT id FROM authorization_requests WHERE requester_id = $1`,
        [masterUserId],
      );
      expect(requests).toHaveLength(0);
    });

    it('edit sebelum dicetak: langsung sukses, tidak membuat authorization_request', async () => {
      const { invoice } = await createSimpleInvoice();

      const updated = await service.update(
        invoice.id,
        { supplierInvoiceNo: 'SINV-EDITED-1' },
        masterUser,
        undefined,
      );
      expect(updated.supplierInvoiceNo).toBe('SINV-EDITED-1');
      expect(updated.printStatus).toBe(PurchaseInvoicePrintStatus.NOT_PRINTED);

      const requests: unknown[] = await dataSource.query(
        `SELECT id FROM authorization_requests WHERE requester_id = $1`,
        [masterUserId],
      );
      expect(requests).toHaveLength(0);
    });

    it('edit setelah dicetak tanpa unlock -> 412; approve + retry -> sukses, printStatus PRINT_CANCELLED, revisionNumber naik', async () => {
      const { invoice } = await createSimpleInvoice();
      await service.registerPrint(invoice.id);

      const updated = await unlockAndRetry((authorizationRequestId) =>
        service.update(
          invoice.id,
          {
            supplierInvoiceNo: 'SINV-EDITED-2',
            reason: 'Salah ketik nomor faktur supplier',
          },
          operatorUser,
          authorizationRequestId,
        ),
      );

      expect(updated.supplierInvoiceNo).toBe('SINV-EDITED-2');
      expect(updated.printStatus).toBe(
        PurchaseInvoicePrintStatus.PRINT_CANCELLED,
      );
      expect(updated.revisionNumber).toBe(1);
    });

    it('edit tanpa alasan pada faktur yang sudah dicetak -> ditolak (alasan wajib)', async () => {
      const { invoice } = await createSimpleInvoice();
      await service.registerPrint(invoice.id);

      await expect(
        service.update(
          invoice.id,
          { supplierInvoiceNo: 'SINV-NO-REASON' },
          operatorUser,
          undefined,
        ),
      ).rejects.toThrow(/alasan wajib/i);
    });

    it('edit ketika lot faktur sudah bergerak -> ditolak pesan Indonesia, faktur belum dicetak jadi tidak butuh approval', async () => {
      const { invoice, productId } = await createSimpleInvoice();
      await consumeInvoiceLot(productId, 1);

      await expect(
        service.update(
          invoice.id,
          { supplierInvoiceNo: 'SINV-CONSUMED' },
          masterUser,
          undefined,
        ),
      ).rejects.toThrow(/sudah bergerak/i);
    });

    it('VOID faktur belum dicetak & belum terkonsumsi -> sukses langsung (postingStatus VOIDED, jurnal pembalik + stok terbalik), tanpa approval', async () => {
      const { invoice, productId } = await createSimpleInvoice();

      const voided = await service.voidInvoice(
        invoice.id,
        { reasonCode: 'SALAH_INPUT', reasonNote: 'Faktur dobel input' },
        masterUser,
        undefined,
      );
      expect(voided.postingStatus).toBe(PurchaseInvoicePostingStatus.VOIDED);
      expect(voided.voidReasonCode).toBe('SALAH_INPUT');

      const reversal: { id: string }[] = await dataSource.query(
        `SELECT id FROM journal_entries WHERE source_type = 'VOID_REVERSAL' AND source_id IN (SELECT id FROM journal_entries WHERE source_type = 'PURCHASE_INVOICE' AND source_id = $1)`,
        [invoice.id],
      );
      expect(reversal).toHaveLength(1);

      const balance: { qty_base_unit: string }[] = await dataSource.query(
        `SELECT qty_base_unit FROM product_stock_balance WHERE product_id = $1 AND warehouse_id = $2`,
        [productId, storeWarehouseId],
      );
      expect(Number(balance[0]?.qty_base_unit ?? 0)).toBe(0);

      const requests: unknown[] = await dataSource.query(
        `SELECT id FROM authorization_requests WHERE requester_id = $1`,
        [masterUserId],
      );
      expect(requests).toHaveLength(0);
    });

    it('VOID faktur yang lotnya sudah terjual sebagian -> ditolak "buat retur pembelian", TIDAK ada jurnal pembalik ditulis', async () => {
      const { invoice, productId } = await createSimpleInvoice();
      await consumeInvoiceLot(productId, 1);

      await expect(
        service.voidInvoice(
          invoice.id,
          { reasonCode: 'SALAH_INPUT', reasonNote: 'Coba batalkan' },
          masterUser,
          undefined,
        ),
      ).rejects.toThrow(/retur pembelian/i);

      const reversal: unknown[] = await dataSource.query(
        `SELECT id FROM journal_entries WHERE source_type = 'VOID_REVERSAL' AND source_id IN (SELECT id FROM journal_entries WHERE source_type = 'PURCHASE_INVOICE' AND source_id = $1)`,
        [invoice.id],
      );
      expect(reversal).toHaveLength(0);

      const stillPosted = await service.findOne(invoice.id);
      expect(stillPosted.postingStatus).toBe(
        PurchaseInvoicePostingStatus.POSTED,
      );
    });

    it('VOID faktur yang sudah dicetak tanpa unlock -> 412 intent VOID; approve + retry -> sukses', async () => {
      const { invoice } = await createSimpleInvoice();
      await service.registerPrint(invoice.id);

      const voided = await unlockAndRetry((authorizationRequestId) =>
        service.voidInvoice(
          invoice.id,
          {
            reasonCode: 'SALAH_INPUT',
            reasonNote: 'Faktur dicetak lalu ternyata salah',
          },
          operatorUser,
          authorizationRequestId,
        ),
      );
      expect(voided.postingStatus).toBe(PurchaseInvoicePostingStatus.VOIDED);
      expect(voided.printStatus).toBe(
        PurchaseInvoicePrintStatus.PRINT_CANCELLED,
      );

      // VOID tidak pernah "direvisi" — revisionNumber TIDAK naik untuk intent VOID.
      expect(voided.revisionNumber).toBe(0);
    });

    it('token intent EDIT tidak bisa dipakai untuk VOID (payload mismatch -> 412 lagi, bukan tembus)', async () => {
      const { invoice } = await createSimpleInvoice();
      await service.registerPrint(invoice.id);

      // Minta approval untuk EDIT dulu.
      let editRequestId = '';
      try {
        await service.update(
          invoice.id,
          { supplierInvoiceNo: 'X', reason: 'test intent mismatch' },
          operatorUser,
          undefined,
        );
        throw new Error('Seharusnya 412.');
      } catch (err) {
        const body = (err as HttpException).getResponse() as StepUpRequiredBody;
        editRequestId = body.authorizationRequestId;
        createdRequestIds.push(editRequestId);
      }
      await authorizationRequestsService.approve(editRequestId, supervisorUser);

      // Token yang disetujui untuk EDIT dipakai untuk VOID -> harus tetap 412
      // (payload mismatch: intent beda), BUKAN sukses mem-VOID.
      await expectStepUp412(
        service.voidInvoice(
          invoice.id,
          {
            reasonCode: 'SALAH_INPUT',
            reasonNote: 'coba tembus pakai token EDIT',
          },
          operatorUser,
          editRequestId,
        ),
      );

      const stillPosted = await service.findOne(invoice.id);
      expect(stillPosted.postingStatus).toBe(
        PurchaseInvoicePostingStatus.POSTED,
      );
    });

    it('token UNLOCK_PRINT faktur A tidak bisa dipakai untuk faktur B (payload mismatch -> 412)', async () => {
      const { invoice: invoiceA } = await createSimpleInvoice();
      const { invoice: invoiceB } = await createSimpleInvoice();
      await service.registerPrint(invoiceA.id);
      await service.registerPrint(invoiceB.id);

      let requestIdForA = '';
      try {
        await service.update(
          invoiceA.id,
          { supplierInvoiceNo: 'X', reason: 'test cross document' },
          operatorUser,
          undefined,
        );
        throw new Error('Seharusnya 412.');
      } catch (err) {
        const body = (err as HttpException).getResponse() as StepUpRequiredBody;
        requestIdForA = body.authorizationRequestId;
        createdRequestIds.push(requestIdForA);
      }
      await authorizationRequestsService.approve(requestIdForA, supervisorUser);

      await expectStepUp412(
        service.update(
          invoiceB.id,
          {
            supplierInvoiceNo: 'Y',
            reason: 'coba tembus pakai token faktur A',
          },
          operatorUser,
          requestIdForA,
        ),
      );
    });

    it('faktur yang sudah VOIDED tetap bisa dicetak ulang (arsip), postingStatus dikembalikan VOIDED', async () => {
      const { invoice } = await createSimpleInvoice();
      await service.voidInvoice(
        invoice.id,
        { reasonCode: 'SALAH_INPUT', reasonNote: 'untuk uji cetak arsip' },
        masterUser,
        undefined,
      );

      const printed = await service.registerPrint(invoice.id);
      expect(printed.printCount).toBe(1);
      expect(printed.postingStatus).toBe(PurchaseInvoicePostingStatus.VOIDED);
    });

    it('faktur yang sudah VOIDED tidak bisa diedit lagi', async () => {
      const { invoice } = await createSimpleInvoice();
      await service.voidInvoice(
        invoice.id,
        { reasonCode: 'SALAH_INPUT', reasonNote: 'untuk uji tolak edit' },
        masterUser,
        undefined,
      );

      await expect(
        service.update(
          invoice.id,
          { supplierInvoiceNo: 'SINV-AFTER-VOID' },
          masterUser,
          undefined,
        ),
      ).rejects.toThrow(/sudah VOID/i);
    });
  });

  describe('Pengecekan Invoice Harian — review() (Hari 22A)', () => {
    async function createSimpleInvoice(): Promise<{
      invoice: PurchaseInvoice;
      productId: string;
    }> {
      const supplierId = await createTestSupplier(false);
      const productId = await createTestProduct(
        'Produk Pengecekan Invoice',
        false,
      );
      const result = await service.create(
        {
          supplierId,
          supplierInvoiceNo: `SINV-REVIEW-${Date.now()}`,
          receiptDate: daysAgoIso(0),
          supplierInvoiceDate: daysAgoIso(1),
          termDays: 14,
          lines: [{ productId, unitId, qtyInput: 2, unitPrice: 50000 }],
        },
        masterUser,
      );
      createdInvoiceIds.push(result.purchaseInvoice.id);
      return { invoice: result.purchaseInvoice, productId };
    }

    it('SUPERVISOR menandai BERMASALAH dengan catatan -> reviewStatus/reviewNote/reviewedBy/reviewedAt terisi, isi faktur tidak berubah', async () => {
      const { invoice } = await createSimpleInvoice();

      const reviewed = await service.review(
        invoice.id,
        {
          reviewStatus: PurchaseInvoiceReviewStatus.BERMASALAH,
          reviewNote: 'Nomor faktur supplier perlu dicek ulang.',
        },
        supervisorUser,
      );

      expect(reviewed.reviewStatus).toBe(
        PurchaseInvoiceReviewStatus.BERMASALAH,
      );
      expect(reviewed.reviewNote).toBe(
        'Nomor faktur supplier perlu dicek ulang.',
      );
      expect(reviewed.reviewedBy).toBe(supervisorUserId);
      expect(reviewed.reviewedAt).not.toBeNull();
      expect(reviewed.totalAmount).toBe(invoice.totalAmount);
      expect(reviewed.supplierInvoiceNo).toBe(invoice.supplierInvoiceNo);
    });

    it('MASTER menandai DISETUJUI tanpa catatan -> sukses (catatan hanya wajib untuk BERMASALAH)', async () => {
      const { invoice } = await createSimpleInvoice();

      const reviewed = await service.review(
        invoice.id,
        { reviewStatus: PurchaseInvoiceReviewStatus.DISETUJUI },
        masterUser,
      );

      expect(reviewed.reviewStatus).toBe(PurchaseInvoiceReviewStatus.DISETUJUI);
      expect(reviewed.reviewNote).toBeNull();
      expect(reviewed.reviewedBy).toBe(masterUserId);
    });

    it('menandai BERMASALAH tanpa catatan (atau catatan kosong) -> ditolak', async () => {
      const { invoice } = await createSimpleInvoice();

      await expect(
        service.review(
          invoice.id,
          { reviewStatus: PurchaseInvoiceReviewStatus.BERMASALAH },
          supervisorUser,
        ),
      ).rejects.toThrow('Catatan wajib diisi saat menandai faktur BERMASALAH.');

      await expect(
        service.review(
          invoice.id,
          {
            reviewStatus: PurchaseInvoiceReviewStatus.BERMASALAH,
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
          reviewStatus: PurchaseInvoiceReviewStatus.BERMASALAH,
          reviewNote: 'Cek ulang jumlah.',
        },
        supervisorUser,
      );

      const byReviewStatus = await service.findAll({
        reviewStatus: PurchaseInvoiceReviewStatus.BERMASALAH,
        page: 1,
        limit: 100,
      });
      expect(byReviewStatus.data.some((row) => row.id === invoice.id)).toBe(
        true,
      );

      const byDate = await service.findAll({
        date: invoice.receiptDate,
        page: 1,
        limit: 100,
      });
      expect(byDate.data.some((row) => row.id === invoice.id)).toBe(true);
    });
  });

  describe('Revisi-di-tempat (paket R6)', () => {
    async function createRevisableInvoice(daysAgo: number): Promise<{
      invoice: PurchaseInvoice;
      supplierId: string;
      productId: string;
    }> {
      const supplierId = await createTestSupplier(false);
      const productId = await createTestProduct(
        'Produk Revisi Pembelian',
        false,
      );
      const result = await service.create(
        {
          supplierId,
          supplierInvoiceNo: `SINV-REV-${Date.now()}`,
          receiptDate: daysAgoIso(daysAgo),
          supplierInvoiceDate: daysAgoIso(daysAgo),
          termDays: 14,
          lines: [{ productId, unitId, qtyInput: 2, unitPrice: 50000 }],
        },
        masterUser,
      );
      createdInvoiceIds.push(result.purchaseInvoice.id);
      return { invoice: result.purchaseInvoice, supplierId, productId };
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

    async function activeEntryOf(invoiceId: string): Promise<string> {
      const rows: { id: string }[] = await dataSource.query(
        `SELECT je.id FROM journal_entries je
         WHERE je.source_type = 'PURCHASE_INVOICE' AND je.source_id = $1 AND je.is_reversal = false
           AND NOT EXISTS (SELECT 1 FROM journal_entries r WHERE r.reversed_entry_id = je.id)`,
        [invoiceId],
      );
      return rows[0].id;
    }

    it('faktur NOT_PRINTED: ubah harga -> 200, revisionNumber 1, jurnal lama terbalik + jurnal baru KEDUANYA bertanggal receiptDate asli (bukan hari ini)', async () => {
      const { invoice, supplierId, productId } =
        await createRevisableInvoice(1);
      const today = new Date().toISOString().slice(0, 10);
      expect(invoice.receiptDate).not.toBe(today);

      const revised = await service.reviseInvoice(
        invoice.id,
        {
          supplierId,
          supplierInvoiceNo: invoice.supplierInvoiceNo ?? undefined,
          receiptDate: invoice.receiptDate,
          supplierInvoiceDate: invoice.supplierInvoiceDate,
          termDays: 14,
          lines: [{ productId, unitId, qtyInput: 2, unitPrice: 70000 }],
        },
        masterUser,
        undefined,
      );

      expect(revised.revisionNumber).toBe(1);
      expect(Number(revised.subtotal)).toBe(140000);

      const entries: { entry_date: string }[] = await dataSource.query(
        `SELECT entry_date::text AS entry_date FROM journal_entries
         WHERE (source_type = 'PURCHASE_INVOICE' AND source_id = $1)
            OR (source_type = 'REVISION_REVERSAL' AND source_id IN (
                  SELECT id FROM journal_entries WHERE source_type = 'PURCHASE_INVOICE' AND source_id = $1
                ))
         ORDER BY created_at ASC`,
        [invoice.id],
      );
      expect(entries).toHaveLength(3);
      for (const entry of entries) {
        expect(entry.entry_date).toBe(invoice.receiptDate);
        expect(entry.entry_date).not.toBe(today);
      }

      const sums = await sumJournalLines(await activeEntryOf(invoice.id));
      expect(sums.debit).toBe(sums.credit);

      expect(
        (await stockRecorderService.reconcile({ productId })).every(
          (r) => r.difference === 0,
        ),
      ).toBe(true);
      const balance: { qty_base_unit: string }[] = await dataSource.query(
        `SELECT qty_base_unit FROM product_stock_balance WHERE product_id = $1 AND warehouse_id = $2`,
        [productId, storeWarehouseId],
      );
      // qtyInput 2 DUS x 12 (konversi DUS->PCS) = 24 base unit.
      expect(Number(balance[0].qty_base_unit)).toBe(24);

      // goods_receipt_lines ditulis ulang mengikuti purchase_invoice_lines
      // yang baru — tetap satu baris, terhubung ke lot yang AKTIF sekarang.
      const grLines: { qty_base_unit: string; unit_cost: string }[] =
        await dataSource.query(
          `SELECT gl.qty_base_unit, gl.unit_cost FROM goods_receipt_lines gl
           JOIN goods_receipts gr ON gr.id = gl.goods_receipt_id
           WHERE gr.purchase_invoice_id = $1`,
          [invoice.id],
        );
      expect(grLines).toHaveLength(1);
      // unit_cost per BASE unit = harga_pokok (2 x 70.000) / 24 base unit.
      expect(Number(grLines[0].unit_cost)).toBeCloseTo(140000 / 24, 2);
    });

    it('faktur yang sudah PRINTED: revise tanpa token -> 412 UNLOCK_PRINT; approve + retry -> 200, revisionNumber naik lewat PrintLockService (tidak dobel)', async () => {
      const { invoice, supplierId, productId } =
        await createRevisableInvoice(0);
      await service.registerPrint(invoice.id);

      const dto = {
        supplierId,
        supplierInvoiceNo: invoice.supplierInvoiceNo ?? undefined,
        receiptDate: invoice.receiptDate,
        supplierInvoiceDate: invoice.supplierInvoiceDate,
        termDays: 14,
        lines: [{ productId, unitId, qtyInput: 2, unitPrice: 60000 }],
        reason: 'Salah harga saat input',
      };

      let authorizationRequestId: string;
      try {
        await service.reviseInvoice(invoice.id, dto, masterUser, undefined);
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
      );
      expect(revised.printStatus).toBe(
        PurchaseInvoicePrintStatus.PRINT_CANCELLED,
      );
      expect(revised.revisionNumber).toBe(1);
    });

    it('faktur berumur lebih dari 2 hari -> 400 dengan pesan yang MENYEBUT jalan keluarnya (VOID + faktur baru)', async () => {
      const { invoice, supplierId, productId } =
        await createRevisableInvoice(0);
      const staleDate = daysAgoIso(5);
      await dataSource.query(
        `UPDATE purchase_invoices SET receipt_date = $1 WHERE id = $2`,
        [staleDate, invoice.id],
      );

      await expect(
        service.reviseInvoice(
          invoice.id,
          {
            supplierId,
            supplierInvoiceNo: invoice.supplierInvoiceNo ?? undefined,
            receiptDate: staleDate,
            supplierInvoiceDate: staleDate,
            termDays: 14,
            lines: [{ productId, unitId, qtyInput: 2, unitPrice: 60000 }],
          },
          masterUser,
          undefined,
        ),
      ).rejects.toThrow(/VOID.*faktur baru/i);
    });

    it('barang dari faktur ini sudah terjual sebagian -> 400 dengan pesan yang menyarankan Retur Pembelian', async () => {
      const { invoice, supplierId, productId } =
        await createRevisableInvoice(0);
      // Jual 1 dari 24 base unit (2 DUS) yang masuk -> lot ini sudah
      // terkonsumsi sebagian.
      await dataSource.transaction((manager) =>
        stockRecorderService.recordOut(
          {
            productId,
            warehouseId: storeWarehouseId,
            qtyBaseUnit: 1,
            movementDate: new Date(),
            movementType: StockMovementType.SALE,
            sourceType: 'SALES_INVOICE',
            sourceId: null,
            createdBy: masterUserId,
          },
          manager,
        ),
      );

      await expect(
        service.reviseInvoice(
          invoice.id,
          {
            supplierId,
            supplierInvoiceNo: invoice.supplierInvoiceNo ?? undefined,
            receiptDate: invoice.receiptDate,
            supplierInvoiceDate: invoice.supplierInvoiceDate,
            termDays: 14,
            lines: [{ productId, unitId, qtyInput: 2, unitPrice: 60000 }],
          },
          masterUser,
          undefined,
        ),
      ).rejects.toThrow(/Retur Pembelian/i);
    });

    it('faktur VOIDED -> revise ditolak', async () => {
      const { invoice, supplierId, productId } =
        await createRevisableInvoice(0);
      await service.voidInvoice(
        invoice.id,
        { reasonCode: 'SALAH_INPUT', reasonNote: 'Dibatalkan untuk uji' },
        masterUser,
        undefined,
      );

      await expect(
        service.reviseInvoice(
          invoice.id,
          {
            supplierId,
            supplierInvoiceNo: invoice.supplierInvoiceNo ?? undefined,
            receiptDate: invoice.receiptDate,
            supplierInvoiceDate: invoice.supplierInvoiceDate,
            termDays: 14,
            lines: [{ productId, unitId, qtyInput: 2, unitPrice: 60000 }],
          },
          masterUser,
          undefined,
        ),
      ).rejects.toThrow(/sudah VOID/i);
    });

    it('revisi dua kali berturut-turut tetap konsisten: revisionNumber = 2, jurnal & stok tetap seimbang, tidak ada lot qty_remaining negatif', async () => {
      const { invoice, supplierId, productId } =
        await createRevisableInvoice(0);

      await service.reviseInvoice(
        invoice.id,
        {
          supplierId,
          supplierInvoiceNo: invoice.supplierInvoiceNo ?? undefined,
          receiptDate: invoice.receiptDate,
          supplierInvoiceDate: invoice.supplierInvoiceDate,
          termDays: 14,
          lines: [{ productId, unitId, qtyInput: 3, unitPrice: 55000 }],
        },
        masterUser,
        undefined,
      );

      const revision2 = await service.reviseInvoice(
        invoice.id,
        {
          supplierId,
          supplierInvoiceNo: invoice.supplierInvoiceNo ?? undefined,
          receiptDate: invoice.receiptDate,
          supplierInvoiceDate: invoice.supplierInvoiceDate,
          termDays: 14,
          lines: [{ productId, unitId, qtyInput: 4, unitPrice: 65000 }],
        },
        masterUser,
        undefined,
      );

      expect(revision2.revisionNumber).toBe(2);
      expect(Number(revision2.subtotal)).toBe(260000);

      const sums = await sumJournalLines(await activeEntryOf(invoice.id));
      expect(sums.debit).toBe(sums.credit);

      const balance: { qty_base_unit: string }[] = await dataSource.query(
        `SELECT qty_base_unit FROM product_stock_balance WHERE product_id = $1 AND warehouse_id = $2`,
        [productId, storeWarehouseId],
      );
      // Net stok akhir HANYA qty revisi TERAKHIR (4 DUS x 12 = 48 base unit)
      // — bukan akumulasi tiga ronde (2+3+4), membuktikan reversal ronde
      // sebelumnya benar.
      expect(Number(balance[0].qty_base_unit)).toBe(48);

      const negativeLots: { id: string }[] = await dataSource.query(
        `SELECT id FROM stock_cost_lots WHERE qty_remaining < 0`,
      );
      expect(negativeLots).toHaveLength(0);

      // assertLotsUnconsumed TIDAK BOLEH salah mengira lot dari revisi #1
      // (sudah nol karena dibalik, bukan terjual) sebagai "sudah terjual" —
      // dibuktikan langsung: revisi #3 masih diizinkan lanjut sampai ke
      // pengecekan harga (tidak terhenti di beforeReverse).
      await expect(
        service.reviseInvoice(
          invoice.id,
          {
            supplierId,
            supplierInvoiceNo: invoice.supplierInvoiceNo ?? undefined,
            receiptDate: invoice.receiptDate,
            supplierInvoiceDate: invoice.supplierInvoiceDate,
            termDays: 14,
            lines: [{ productId, unitId, qtyInput: 5, unitPrice: 70000 }],
          },
          masterUser,
          undefined,
        ),
      ).resolves.toBeDefined();
    });
  });
});
