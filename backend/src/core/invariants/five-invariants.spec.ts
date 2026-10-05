import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { Brand } from '../../modules/brands/entities/brand.entity';
import { ChartOfAccount } from '../../modules/chart-of-accounts/entities/chart-of-account.entity';
import { Customer } from '../../modules/customers/entities/customer.entity';
import { JournalEntryLine } from '../../modules/journal-entries/entities/journal-entry-line.entity';
import { JournalEntry } from '../../modules/journal-entries/entities/journal-entry.entity';
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
import { DocumentCounterService } from '../document-counter/document-counter.service';
import { DocumentReviseService } from '../document-revise/document-revise.service';
import { JournalPosterService } from '../journal-poster/journal-poster.service';
import { PeriodLockValidatorService } from '../period-lock/period-lock-validator.service';
import { StockRecorderService } from '../stock-recorder/stock-recorder.service';
import { VoidHook } from '../void/void-hook.interface';
import { VoidEngineService } from '../void/void.service';

class NoopHook implements VoidHook {
  checkVoidable(): Promise<void> {
    return Promise.resolve();
  }
  markVoided(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * 5 invarian akuntansi/stok (Hari 11, CLAUDE.md §7/§8) — integration test
 * terhadap Postgres asli, pola sama journal-poster.service.spec.ts/
 * stock-recorder.service.spec.ts/void.service.spec.ts. Semua service
 * dikonstruksi manual lewat `new` (bypass Nest DI, constructor produksi asli).
 *
 * Setup bersama (sesuai instruksi tugas): COA seed + 1 produk (2 satuan:
 * base PCS + konversi DUS=12) + 1 customer + 1 supplier PKP + 2 gudang
 * (STORE + BAD_STOCK). Customer diseed untuk mengikuti instruksi meski tidak
 * dirujuk langsung oleh JournalPosterService/StockRecorderService (tidak ada FK).
 */
describe('5 Invarian (Hari 11)', () => {
  let dataSource: DataSource;
  let journalPosterService: JournalPosterService;
  let stockRecorderService: StockRecorderService;
  let productsService: ProductsService;
  let voidEngineService: VoidEngineService;
  let documentReviseService: DocumentReviseService;

  let userId: string;
  let brandId: string;
  let supplierId: string;
  let customerId: string;
  let storeWarehouseId: string;
  let badStockWarehouseId: string;
  let persediaanAccountId: string; // 01.130.00001
  let hutangAccountId: string; // 02.110.00001
  let piutangAccountId: string; // 01.120.00001
  let pendapatanAccountId: string; // 04.110.00001
  let hppAccountId: string; // 05.110.00001

  const createdProductIds: string[] = [];
  const createdEntryIds: string[] = [];

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
        Customer,
        Warehouse,
        ChartOfAccount,
        JournalEntry,
        JournalEntryLine,
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
    stockRecorderService = new StockRecorderService(
      dataSource,
      productsService,
    );
    journalPosterService = new JournalPosterService(
      new DocumentCounterService(),
      new PeriodLockValidatorService(),
    );
    voidEngineService = new VoidEngineService(
      journalPosterService,
      stockRecorderService,
    );
    documentReviseService = new DocumentReviseService(
      journalPosterService,
      stockRecorderService,
      new PeriodLockValidatorService(),
    );
    const noopHook = new NoopHook();
    voidEngineService.registerHook('MANUAL', noopHook);
    voidEngineService.registerHook('PURCHASE_INVOICE', noopHook);
    voidEngineService.registerHook('SALES_INVOICE', noopHook);

    const usersRepo = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('test-password', 4);
    const user = await usersRepo.save(
      usersRepo.create({
        username: `test_invariants_${Date.now()}`,
        passwordHash,
        fullName: 'Test 5 Invarian',
        role: Role.MASTER,
        isActive: true,
      }),
    );
    userId = user.id;

    const brandsRepo = dataSource.getRepository(Brand);
    const brand = await brandsRepo.save(
      brandsRepo.create({
        code: `TIV-${Date.now().toString().slice(-8)}`,
        name: 'Merek Uji Invarian',
        isActive: true,
      }),
    );
    brandId = brand.id;

    const suppliersRepo = dataSource.getRepository(Supplier);
    const supplier = await suppliersRepo.save(
      suppliersRepo.create({
        displayCode: `SUP-TIV-${Date.now().toString().slice(-6)}`,
        name: 'Supplier Uji Invarian (PKP)',
        isPkp: true,
        isActive: true,
      }),
    );
    supplierId = supplier.id;

    const customersRepo = dataSource.getRepository(Customer);
    const customer = await customersRepo.save(
      customersRepo.create({
        code: `CUST-TIV-${Date.now().toString().slice(-6)}`,
        name: 'Pelanggan Uji Invarian',
        isPkp: false,
        isActive: true,
      }),
    );
    customerId = customer.id;

    const warehousesRepo = dataSource.getRepository(Warehouse);
    const storeWarehouse = await warehousesRepo.save(
      warehousesRepo.create({
        name: `Toko Uji Invarian ${Date.now()}`,
        warehouseType: WarehouseType.STORE,
        customerId: null,
        isActive: true,
      }),
    );
    storeWarehouseId = storeWarehouse.id;
    const badStockWarehouse = await warehousesRepo.save(
      warehousesRepo.create({
        name: `Bad Stock Uji Invarian ${Date.now()}`,
        warehouseType: WarehouseType.BAD_STOCK,
        customerId: null,
        isActive: true,
      }),
    );
    badStockWarehouseId = badStockWarehouse.id;

    const accountsRepo = dataSource.getRepository(ChartOfAccount);
    persediaanAccountId = (
      await accountsRepo.findOneOrFail({ where: { code: '01.130.00001' } })
    ).id;
    hutangAccountId = (
      await accountsRepo.findOneOrFail({ where: { code: '02.110.00001' } })
    ).id;
    piutangAccountId = (
      await accountsRepo.findOneOrFail({ where: { code: '01.120.00001' } })
    ).id;
    pendapatanAccountId = (
      await accountsRepo.findOneOrFail({ where: { code: '04.110.00001' } })
    ).id;
    hppAccountId = (
      await accountsRepo.findOneOrFail({ where: { code: '05.110.00001' } })
    ).id;
  });

  afterAll(async () => {
    // Self-FK (reversed_entry_id) — hapus baris reversal (anak) dulu, baru
    // baris asli, supaya tidak melanggar FK NOT DEFERRABLE.
    if (createdEntryIds.length > 0) {
      await dataSource.query(
        `DELETE FROM journal_entries WHERE id = ANY($1) AND reversed_entry_id IS NOT NULL`,
        [createdEntryIds],
      );
      await dataSource.query(`DELETE FROM journal_entries WHERE id = ANY($1)`, [
        createdEntryIds,
      ]);
    }
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
      [storeWarehouseId, badStockWarehouseId],
    ]);
    await dataSource.query('DELETE FROM customers WHERE id = $1', [customerId]);
    await dataSource.query('DELETE FROM suppliers WHERE id = $1', [supplierId]);
    await dataSource.query('DELETE FROM brands WHERE id = $1', [brandId]);
    await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
    await dataSource.destroy();
  });

  async function createTestProduct(keterangan: string): Promise<string> {
    const product = await productsService.create({
      brandId,
      keterangan: `${keterangan} ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      baseUnit: 'PCS',
      unitConversions: [{ unitName: 'DUS', qtyInBaseUnit: 12, level: 1 }],
    });
    createdProductIds.push(product.id);
    return product.id;
  }

  async function insertRawLot(
    productId: string,
    warehouseId: string,
    lotDate: string,
    qty: number,
    unitCost: number,
  ): Promise<string> {
    const rows: { id: string }[] = await dataSource.query(
      `INSERT INTO stock_cost_lots
         (product_id, warehouse_id, lot_date, qty_in, qty_remaining, unit_cost, source_type, source_id)
       VALUES ($1, $2, $3, $4, $4, $5, 'MANUAL', NULL)
       RETURNING id`,
      [productId, warehouseId, lotDate, qty, unitCost],
    );
    return rows[0].id;
  }

  it('TEST 1 — jurnal balance: SUM(debit)=SUM(credit) untuk SETIAP journal_entry, scan seluruh tabel', async () => {
    const sourceId = randomUUID();
    const entry = await dataSource.transaction((manager) =>
      journalPosterService.post(
        {
          entryDate: new Date(),
          sourceType: 'MANUAL',
          sourceId,
          createdBy: userId,
          lines: [
            { accountId: persediaanAccountId, debit: 50_000, credit: 0 },
            { accountId: hutangAccountId, debit: 0, credit: 50_000 },
          ],
        },
        manager,
      ),
    );
    createdEntryIds.push(entry.id);

    // Scan GLOBAL (bukan cuma entry yang dibuat test ini) — pengaman regresi:
    // CHECK constraint + validateBalance() seharusnya sudah menjamin ini
    // selalu benar untuk SELURUH tabel journal_entries di database ini.
    const unbalanced: { entry_number: string }[] = await dataSource.query(`
      SELECT je.entry_number
      FROM journal_entries je
      WHERE (SELECT COALESCE(SUM(debit_amount), 0) FROM journal_entry_lines WHERE journal_entry_id = je.id)
         <> (SELECT COALESCE(SUM(credit_amount), 0) FROM journal_entry_lines WHERE journal_entry_id = je.id)
    `);
    expect(unbalanced).toHaveLength(0);
  });

  it('TEST 2 — FIFO urut: konsumsi ikuti lot_date tertua meski INSERT tidak berurutan', async () => {
    const productId = await createTestProduct('Produk FIFO Urut');

    // Insert 3 lot LANGSUNG (bypass recordIn), urutan INSERT sengaja acak
    // relatif terhadap lot_date, untuk membuktikan consumeFifo() mengurutkan
    // berdasarkan lot_date (bukan urutan baris ditulis/id).
    const lotDay3Id = await insertRawLot(
      productId,
      storeWarehouseId,
      '2026-08-03',
      10,
      300,
    );
    const lotDay1Id = await insertRawLot(
      productId,
      storeWarehouseId,
      '2026-08-01',
      10,
      100,
    );
    const lotDay2Id = await insertRawLot(
      productId,
      storeWarehouseId,
      '2026-08-02',
      10,
      200,
    );
    await dataSource.query(
      `INSERT INTO product_stock_balance (product_id, warehouse_id, qty_base_unit)
       VALUES ($1, $2, 30)`,
      [productId, storeWarehouseId],
    );

    const result = await dataSource.transaction((manager) =>
      stockRecorderService.recordOut(
        {
          productId,
          warehouseId: storeWarehouseId,
          qtyBaseUnit: 25,
          movementDate: new Date(),
          movementType: StockMovementType.SALE,
          sourceType: 'SALES_INVOICE',
          sourceId: randomUUID(),
          createdBy: userId,
        },
        manager,
      ),
    );

    expect(result.consumptions).toHaveLength(3);
    expect(result.consumptions.map((c) => c.lotId)).toEqual([
      lotDay1Id,
      lotDay2Id,
      lotDay3Id,
    ]);
    expect(Number(result.consumptions[0].qty)).toBe(10);
    expect(Number(result.consumptions[1].qty)).toBe(10);
    expect(Number(result.consumptions[2].qty)).toBe(5); // sisa dari lot termuda
  });

  it('TEST 3 — VOID simetris: jumlah baris sama, debit<->kredit tertukar nominal identik, entry_date = hari ini', async () => {
    const sourceId = randomUUID();
    const twoDaysAgo = new Date();
    twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2); // batas backdate_max_days

    const originalEntry = await dataSource.transaction((manager) =>
      journalPosterService.post(
        {
          entryDate: twoDaysAgo,
          sourceType: 'MANUAL',
          sourceId,
          createdBy: userId,
          lines: [
            { accountId: persediaanAccountId, debit: 75_000, credit: 0 },
            { accountId: hutangAccountId, debit: 0, credit: 75_000 },
          ],
        },
        manager,
      ),
    );
    createdEntryIds.push(originalEntry.id);

    const result = await dataSource.transaction((manager) =>
      voidEngineService.voidDocument({
        sourceType: 'MANUAL',
        sourceId,
        reasonCode: 'BATAL_INPUT',
        reasonNote: 'Uji VOID simetris (invarian 3)',
        userId,
        manager,
      }),
    );
    createdEntryIds.push(result.reversalEntry.id);

    expect(result.reversalEntry.isReversal).toBe(true);
    expect(result.reversalEntry.reversedEntryId).toBe(originalEntry.id);
    expect(result.reversalEntry.lines).toHaveLength(originalEntry.lines.length);
    // Konsekuensi §2.2: VOID dokumen lama TIDAK PERNAH bertanggal sama
    // dengan dokumen asli — mem-VOID dokumen bulan lalu tidak pernah
    // mengubah angka bulan yang sudah ditutup.
    expect(result.reversalEntry.entryDate).not.toBe(originalEntry.entryDate);
    expect(result.reversalEntry.entryDate).toBe(
      new Date().toISOString().slice(0, 10),
    );

    const originalByAccount = new Map(
      originalEntry.lines.map((l) => [l.accountId, l]),
    );
    for (const line of result.reversalEntry.lines) {
      const orig = originalByAccount.get(line.accountId)!;
      expect(Number(line.debitAmount)).toBe(Number(orig.creditAmount));
      expect(Number(line.creditAmount)).toBe(Number(orig.debitAmount));
    }
  });

  it('TEST 4 — stok rekonsiliasi: purchase -> sale -> return -> void(sale), reconcile()=0 di tiap langkah', async () => {
    const productId = await createTestProduct('Produk Rekonsiliasi');
    const purchaseSourceId = randomUUID();
    const saleSourceId = randomUUID();

    // purchase
    await dataSource.transaction(async (manager) => {
      await stockRecorderService.recordIn(
        {
          productId,
          warehouseId: storeWarehouseId,
          qtyBaseUnit: 20,
          unitCost: 100,
          lotDate: new Date(),
          movementDate: new Date(),
          movementType: StockMovementType.PURCHASE,
          supplierId,
          sourceType: 'PURCHASE_INVOICE',
          sourceId: purchaseSourceId,
          createdBy: userId,
        },
        manager,
      );
      const entry = await journalPosterService.post(
        {
          entryDate: new Date(),
          sourceType: 'PURCHASE_INVOICE',
          sourceId: purchaseSourceId,
          createdBy: userId,
          lines: [
            { accountId: persediaanAccountId, debit: 2_000, credit: 0 },
            { accountId: hutangAccountId, debit: 0, credit: 2_000 },
          ],
        },
        manager,
      );
      createdEntryIds.push(entry.id);
    });
    expect(
      (await stockRecorderService.reconcile({ productId })).every(
        (r) => r.difference === 0,
      ),
    ).toBe(true);

    // sale (Dr Piutang/Cr Pendapatan + Dr HPP/Cr Persediaan, jurnal seimbang)
    await dataSource.transaction(async (manager) => {
      await stockRecorderService.recordOut(
        {
          productId,
          warehouseId: storeWarehouseId,
          qtyBaseUnit: 8,
          movementDate: new Date(),
          movementType: StockMovementType.SALE,
          sourceType: 'SALES_INVOICE',
          sourceId: saleSourceId,
          createdBy: userId,
        },
        manager,
      );
      const entry = await journalPosterService.post(
        {
          entryDate: new Date(),
          sourceType: 'SALES_INVOICE',
          sourceId: saleSourceId,
          createdBy: userId,
          lines: [
            { accountId: piutangAccountId, debit: 800, credit: 0 },
            { accountId: pendapatanAccountId, debit: 0, credit: 800 },
            { accountId: hppAccountId, debit: 800, credit: 0 },
            { accountId: persediaanAccountId, debit: 0, credit: 800 },
          ],
        },
        manager,
      );
      createdEntryIds.push(entry.id);
    });
    expect(
      (await stockRecorderService.reconcile({ productId })).every(
        (r) => r.difference === 0,
      ),
    ).toBe(true);

    // "return" — retur pelanggan SELALU masuk BAD_STOCK (CLAUDE.md §3), tanpa
    // jurnal di sini (retur penjualan sungguhan Hari 23, di luar lingkup hari ini).
    await dataSource.transaction((manager) =>
      stockRecorderService.recordIn(
        {
          productId,
          warehouseId: badStockWarehouseId,
          qtyBaseUnit: 3,
          unitCost: 100,
          lotDate: new Date(),
          movementDate: new Date(),
          movementType: StockMovementType.RETURN_IN,
          supplierId: null,
          sourceType: 'SALES_RETURN',
          sourceId: randomUUID(),
          createdBy: userId,
        },
        manager,
      ),
    );
    expect(
      (await stockRecorderService.reconcile({ productId })).every(
        (r) => r.difference === 0,
      ),
    ).toBe(true);

    // void the sale
    const voidResult = await dataSource.transaction((manager) =>
      voidEngineService.voidDocument({
        sourceType: 'SALES_INVOICE',
        sourceId: saleSourceId,
        reasonCode: 'BATAL_INPUT',
        reasonNote: 'Uji rekonsiliasi setelah VOID (invarian 4)',
        userId,
        manager,
      }),
    );
    createdEntryIds.push(voidResult.reversalEntry.id);

    expect(
      (await stockRecorderService.reconcile({ productId })).every(
        (r) => r.difference === 0,
      ),
    ).toBe(true);
  });

  it('TEST 5 — persediaan cocok dengan lot: Σ(qty_remaining×unit_cost) = Σ(debit-credit) akun 01.130.00001, tetap pegang setelah VOID', async () => {
    const productId = await createTestProduct('Produk Invarian Persediaan');
    const sourceId = randomUUID();
    const qty = 15;
    const unitCost = 1200;
    const totalCost = qty * unitCost;

    // Ditrack TERPISAH dari createdEntryIds (yang dipakai cleanup global) —
    // supaya perhitungan saldo akun 01.130.00001 di bawah HANYA menghitung entry
    // yang dibuat test ini, tidak keganggu data test lain di omega_dev.
    const test5EntryIds: string[] = [];

    const entry = await dataSource.transaction(async (manager) => {
      await stockRecorderService.recordIn(
        {
          productId,
          warehouseId: storeWarehouseId,
          qtyBaseUnit: qty,
          unitCost,
          lotDate: new Date(),
          movementDate: new Date(),
          movementType: StockMovementType.PURCHASE,
          supplierId,
          sourceType: 'PURCHASE_INVOICE',
          sourceId,
          createdBy: userId,
        },
        manager,
      );
      return journalPosterService.post(
        {
          entryDate: new Date(),
          sourceType: 'PURCHASE_INVOICE',
          sourceId,
          createdBy: userId,
          lines: [
            { accountId: persediaanAccountId, debit: totalCost, credit: 0 },
            { accountId: hutangAccountId, debit: 0, credit: totalCost },
          ],
        },
        manager,
      );
    });
    createdEntryIds.push(entry.id);
    test5EntryIds.push(entry.id);

    const lotValue = async (): Promise<number> => {
      const rows: { total: string | null }[] = await dataSource.query(
        `SELECT SUM(qty_remaining * unit_cost) AS total FROM stock_cost_lots WHERE product_id = $1`,
        [productId],
      );
      return Number(rows[0].total ?? 0);
    };
    const persediaanLedgerValue = async (): Promise<number> => {
      const rows: { total: string | null }[] = await dataSource.query(
        `SELECT SUM(debit_amount - credit_amount) AS total
         FROM journal_entry_lines
         WHERE account_id = $1 AND journal_entry_id = ANY($2)`,
        [persediaanAccountId, test5EntryIds],
      );
      return Number(rows[0].total ?? 0);
    };

    expect(await lotValue()).toBe(totalCost);
    expect(await persediaanLedgerValue()).toBe(totalCost);

    const voidResult = await dataSource.transaction((manager) =>
      voidEngineService.voidDocument({
        sourceType: 'PURCHASE_INVOICE',
        sourceId,
        reasonCode: 'BATAL_INPUT',
        reasonNote: 'Uji invarian persediaan setelah VOID (invarian 5)',
        userId,
        manager,
      }),
    );
    createdEntryIds.push(voidResult.reversalEntry.id);
    test5EntryIds.push(voidResult.reversalEntry.id);

    // Invarian tetap pegang SETELAH void — kembali ke 0 bersamaan, bukan
    // salah satu sisi doang yang turun (persis kekhawatiran CLAUDE.md §11
    // soal diskon/PPN masukan yang salah masuk jurnal).
    expect(await lotValue()).toBe(0);
    expect(await persediaanLedgerValue()).toBe(0);
  });

  it('TEST 6 — revisi (paket R6) konsisten dua kali berturut-turut, tanggal pembalik = tanggal dokumen asli (bukan hari ini), lot lama tidak dibaca sebagai "sudah terjual"', async () => {
    const productId = await createTestProduct('Produk Invarian Revisi');
    const sourceId = randomUUID();
    const originalDate = new Date();
    originalDate.setUTCDate(originalDate.getUTCDate() - 1); // dalam jendela 2 hari (K3)

    const test6EntryIds: string[] = [];

    // Posting AWAL: qty=10 @ unit_cost=100 (pola sama TEST 5).
    const originalEntry = await dataSource.transaction(async (manager) => {
      await stockRecorderService.recordIn(
        {
          productId,
          warehouseId: storeWarehouseId,
          qtyBaseUnit: 10,
          unitCost: 100,
          lotDate: originalDate,
          movementDate: originalDate,
          movementType: StockMovementType.PURCHASE,
          supplierId,
          sourceType: 'PURCHASE_INVOICE',
          sourceId,
          createdBy: userId,
        },
        manager,
      );
      return journalPosterService.post(
        {
          entryDate: originalDate,
          sourceType: 'PURCHASE_INVOICE',
          sourceId,
          createdBy: userId,
          lines: [
            { accountId: persediaanAccountId, debit: 1_000, credit: 0 },
            { accountId: hutangAccountId, debit: 0, credit: 1_000 },
          ],
        },
        manager,
      );
    });
    createdEntryIds.push(originalEntry.id);
    test6EntryIds.push(originalEntry.id);

    const lotValue = async (): Promise<number> => {
      const rows: { total: string | null }[] = await dataSource.query(
        `SELECT SUM(qty_remaining * unit_cost) AS total FROM stock_cost_lots WHERE product_id = $1`,
        [productId],
      );
      return Number(rows[0].total ?? 0);
    };
    const persediaanLedgerValue = async (): Promise<number> => {
      const rows: { total: string | null }[] = await dataSource.query(
        `SELECT SUM(debit_amount - credit_amount) AS total
         FROM journal_entry_lines
         WHERE account_id = $1 AND journal_entry_id = ANY($2)`,
        [persediaanAccountId, test6EntryIds],
      );
      return Number(rows[0].total ?? 0);
    };

    expect(await lotValue()).toBe(1_000);

    // Revisi #1: qty TETAP 10 (produk SAMA — inilah kasus yang membuktikan
    // fix movement_id, bukan skenario ganti produk yang kebetulan lolos)
    // tapi unit_cost dikoreksi 100 -> 150.
    const revise = (newUnitCost: number) =>
      dataSource.transaction((manager) =>
        documentReviseService.revise({
          sourceType: 'PURCHASE_INVOICE',
          sourceId,
          originalDate,
          userId,
          manager,
          reversalDescription: 'Uji revisi invarian (TEST 6)',
          beforeReverse: (manager) =>
            stockRecorderService.assertLotsUnconsumed(
              'PURCHASE_INVOICE',
              sourceId,
              manager,
              'Barang dari faktur ini sudah terjual sebagian — tidak bisa direvisi.',
            ),
          applyChanges: async (manager) => {
            await stockRecorderService.recordIn(
              {
                productId,
                warehouseId: storeWarehouseId,
                qtyBaseUnit: 10,
                unitCost: newUnitCost,
                lotDate: originalDate,
                movementDate: originalDate,
                movementType: StockMovementType.PURCHASE,
                supplierId,
                sourceType: 'PURCHASE_INVOICE',
                sourceId,
                createdBy: userId,
              },
              manager,
            );
            const newTotal = 10 * newUnitCost;
            return {
              repostDate: originalDate,
              journalDescription: 'Uji posting-ulang invarian (TEST 6)',
              journalLines: [
                { accountId: persediaanAccountId, debit: newTotal, credit: 0 },
                { accountId: hutangAccountId, debit: 0, credit: newTotal },
              ],
            };
          },
        }),
      );

    const revision1 = await revise(150);
    createdEntryIds.push(revision1.reversalEntry.id, revision1.repostEntry.id);
    test6EntryIds.push(revision1.reversalEntry.id, revision1.repostEntry.id);

    // K2: pembalik DAN posting ulang bertanggal DOKUMEN ASLI, bukan hari ini
    // (beda sengaja dari VOID, §2.2 CLAUDE.md pengecualian jalur revisi).
    const originalDateStr = originalDate.toISOString().slice(0, 10);
    expect(revision1.reversalEntry.entryDate).toBe(originalDateStr);
    expect(revision1.repostEntry.entryDate).toBe(originalDateStr);
    expect(revision1.repostEntry.entryDate).not.toBe(
      new Date().toISOString().slice(0, 10),
    );

    // Nilai lot & ledger persediaan cocok pada harga BARU (1.500), lot LAMA
    // (harga 100) sudah dibalik ke nol — bukan lagi bagian dari total aktif.
    expect(await lotValue()).toBe(1_500);
    expect(await persediaanLedgerValue()).toBe(1_500);

    // assertLotsUnconsumed TIDAK BOLEH salah mengira lot LAMA (sudah nol
    // karena dibalik revisi, bukan karena terjual) sebagai "barang sudah
    // terjual" — inilah bukti langsung movement_id menutup celah lama.
    await expect(
      dataSource.transaction((manager) =>
        stockRecorderService.assertLotsUnconsumed(
          'PURCHASE_INVOICE',
          sourceId,
          manager,
          'GAGAL: lot lama salah dibaca sebagai sudah terjual',
        ),
      ),
    ).resolves.toBeUndefined();

    // Revisi #2 — dua kali berturut-turut tetap konsisten (produk SAMA
    // lagi): unit_cost 150 -> 200.
    const revision2 = await revise(200);
    createdEntryIds.push(revision2.reversalEntry.id, revision2.repostEntry.id);
    test6EntryIds.push(revision2.reversalEntry.id, revision2.repostEntry.id);

    // Revisi #2 membalik entry AKTIF (repost revisi #1), BUKAN entry asli —
    // findActiveEntry() harus memilih yang benar, bukan yang pertama dijumpai.
    expect(revision2.reversalEntry.reversedEntryId).toBe(
      revision1.repostEntry.id,
    );

    expect(await lotValue()).toBe(2_000);
    expect(await persediaanLedgerValue()).toBe(2_000);

    const negativeLots: { id: string }[] = await dataSource.query(
      `SELECT id FROM stock_cost_lots WHERE product_id = $1 AND qty_remaining < 0`,
      [productId],
    );
    expect(negativeLots).toHaveLength(0);

    expect(
      (await stockRecorderService.reconcile({ productId })).every(
        (r) => r.difference === 0,
      ),
    ).toBe(true);
  });
});
