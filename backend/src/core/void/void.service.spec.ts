import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { ChartOfAccount } from '../../modules/chart-of-accounts/entities/chart-of-account.entity';
import { Customer } from '../../modules/customers/entities/customer.entity';
import { JournalEntryLine } from '../../modules/journal-entries/entities/journal-entry-line.entity';
import { JournalEntry } from '../../modules/journal-entries/entities/journal-entry.entity';
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
import { DocumentCounterService } from '../document-counter/document-counter.service';
import { JournalPosterService } from '../journal-poster/journal-poster.service';
import { PeriodLockValidatorService } from '../period-lock/period-lock-validator.service';
import { StockRecorderService } from '../stock-recorder/stock-recorder.service';
import { VoidHook } from './void-hook.interface';
import { VoidDocumentResult, VoidEngineService } from './void.service';

class RecordingHook implements VoidHook {
  checkVoidableCalls: string[] = [];
  markVoidedCalls: {
    sourceId: string;
    reasonCode: string;
    reasonNote: string;
    userId: string;
  }[] = [];

  checkVoidable(sourceId: string): Promise<void> {
    this.checkVoidableCalls.push(sourceId);
    return Promise.resolve();
  }

  markVoided(
    sourceId: string,
    reasonCode: string,
    reasonNote: string,
    userId: string,
  ): Promise<void> {
    this.markVoidedCalls.push({ sourceId, reasonCode, reasonNote, userId });
    return Promise.resolve();
  }
}

class RejectingHook implements VoidHook {
  checkVoidable(): Promise<void> {
    throw new Error('Hook prasyarat menolak sourceId ini (uji VoidEngine).');
  }
  markVoided(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * Integration test terhadap Postgres asli, pola sama journal-poster.service
 * .spec.ts/stock-recorder.service.spec.ts — semua service dikonstruksi manual
 * lewat `new` (bypass Nest DI, constructor produksi asli).
 */
describe('VoidEngineService', () => {
  let dataSource: DataSource;
  let journalPosterService: JournalPosterService;
  let stockRecorderService: StockRecorderService;
  let productsService: ProductsService;
  let voidEngineService: VoidEngineService;
  let recordingHook: RecordingHook;

  let userId: string;
  let brandId: string;
  let supplierId: string;
  let customerId: string;
  let storeWarehouseId: string;
  let secondWarehouseId: string;
  let persediaanAccountId: string; // 01.130.00001
  let hutangAccountId: string; // 02.110.00001

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
        Warehouse,
        ChartOfAccount,
        Customer,
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

    recordingHook = new RecordingHook();
    voidEngineService.registerHook('PURCHASE_INVOICE', recordingHook);
    voidEngineService.registerHook('SALES_INVOICE', recordingHook);
    voidEngineService.registerHook('TEST_HOOKED_SOURCE', new RejectingHook());

    const usersRepo = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('test-password', 4);
    const user = await usersRepo.save(
      usersRepo.create({
        username: `test_void_engine_${Date.now()}`,
        passwordHash,
        fullName: 'Test Void Engine',
        role: Role.MASTER,
        isActive: true,
      }),
    );
    userId = user.id;

    const brandsRepo = dataSource.getRepository(Brand);
    const brand = await brandsRepo.save(
      brandsRepo.create({
        code: `TVE-${Date.now().toString().slice(-8)}`,
        name: 'Merek Uji VoidEngine',
        isActive: true,
      }),
    );
    brandId = brand.id;

    const suppliersRepo = dataSource.getRepository(Supplier);
    const supplier = await suppliersRepo.save(
      suppliersRepo.create({
        displayCode: `SUP-TVE-${Date.now().toString().slice(-6)}`,
        name: 'Supplier Uji VoidEngine',
        isPkp: false,
        isActive: true,
      }),
    );
    supplierId = supplier.id;

    const customersRepo = dataSource.getRepository(Customer);
    const customer = await customersRepo.save(
      customersRepo.create({
        code: `CUST-TVE-${Date.now().toString().slice(-6)}`,
        name: 'Pelanggan Uji VoidEngine',
        isPkp: false,
        isActive: true,
      }),
    );
    customerId = customer.id;

    const warehousesRepo = dataSource.getRepository(Warehouse);
    const storeWarehouse = await warehousesRepo.save(
      warehousesRepo.create({
        name: `Toko Uji VoidEngine ${Date.now()}`,
        warehouseType: WarehouseType.STORE,
        customerId: null,
        isActive: true,
      }),
    );
    storeWarehouseId = storeWarehouse.id;
    const secondWarehouse = await warehousesRepo.save(
      warehousesRepo.create({
        name: `Toko Kedua Uji VoidEngine ${Date.now()}`,
        warehouseType: WarehouseType.STORE,
        customerId: null,
        isActive: true,
      }),
    );
    secondWarehouseId = secondWarehouse.id;

    const accountsRepo = dataSource.getRepository(ChartOfAccount);
    persediaanAccountId = (
      await accountsRepo.findOneOrFail({ where: { code: '01.130.00001' } })
    ).id;
    hutangAccountId = (
      await accountsRepo.findOneOrFail({ where: { code: '02.110.00001' } })
    ).id;
  });

  afterAll(async () => {
    // Self-FK (reversed_entry_id) — hapus baris reversal (anak) dulu,
    // baru baris asli, supaya tidak melanggar FK NOT DEFERRABLE.
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
      [storeWarehouseId, secondWarehouseId],
    ]);
    await dataSource.query('DELETE FROM suppliers WHERE id = $1', [supplierId]);
    await dataSource.query('DELETE FROM customers WHERE id = $1', [customerId]);
    await dataSource.query('DELETE FROM brands WHERE id = $1', [brandId]);
    await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
    await dataSource.destroy();
  });

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

  /** Pembelian "sungguhan": recordIn + jurnal Dr Persediaan/Cr Hutang, 1 transaction. */
  async function createPurchase(
    productId: string,
    qty: number,
    unitCost: number,
    sourceId: string,
  ): Promise<{ movementId: string; entryId: string }> {
    return dataSource.transaction(async (manager: EntityManager) => {
      const movement = await stockRecorderService.recordIn(
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
      const entry = await journalPosterService.post(
        {
          entryDate: new Date(),
          description: 'Pembelian uji VoidEngine',
          sourceType: 'PURCHASE_INVOICE',
          sourceId,
          createdBy: userId,
          lines: [
            {
              accountId: persediaanAccountId,
              debit: qty * unitCost,
              credit: 0,
            },
            { accountId: hutangAccountId, debit: 0, credit: qty * unitCost },
          ],
        },
        manager,
      );
      createdEntryIds.push(entry.id);
      return { movementId: movement.id, entryId: entry.id };
    });
  }

  /**
   * Dokumen jurnal-saja (tanpa efek stok) — dipakai untuk uji jalur yang
   * butuh jurnal asli ADA tapi tidak peduli stok (fail-closed hook, hook
   * prasyarat menolak). `sourceType` di-cast karena test ini sengaja memakai
   * nilai di luar union JournalSourceType bawaan untuk mensimulasikan
   * sourceType "milik modul lain" — kolom DB tetap VARCHAR bebas.
   */
  async function createJournalOnlyDocument(
    sourceType: string,
    sourceId: string,
    amount: number,
  ): Promise<{ entryId: string }> {
    const entry = await dataSource.transaction((manager) =>
      journalPosterService.post(
        {
          entryDate: new Date(),
          description: 'Dokumen jurnal-saja uji VoidEngine',
          sourceType: sourceType as never,
          sourceId,
          createdBy: userId,
          lines: [
            { accountId: persediaanAccountId, debit: amount, credit: 0 },
            { accountId: hutangAccountId, debit: 0, credit: amount },
          ],
        },
        manager,
      ),
    );
    createdEntryIds.push(entry.id);
    return { entryId: entry.id };
  }

  it('VOID dasar: purchase 10@1000 dibalik -> jurnal simetris, lot nol, balance nol', async () => {
    const productId = await createTestProduct('Produk VOID Dasar');
    const sourceId = randomUUID();
    const { entryId } = await createPurchase(productId, 10, 1000, sourceId);

    const result = await dataSource.transaction((manager) =>
      voidEngineService.voidDocument({
        sourceType: 'PURCHASE_INVOICE',
        sourceId,
        reasonCode: 'BATAL_INPUT',
        reasonNote: 'Salah input jumlah',
        userId,
        manager,
      }),
    );
    createdEntryIds.push(result.reversalEntry.id);

    expect(result.reversalEntry.isReversal).toBe(true);
    expect(result.reversalEntry.reversedEntryId).toBe(entryId);
    expect(result.reversalEntry.entryDate).toBe(
      new Date().toISOString().slice(0, 10),
    );
    expect(result.reversalEntry.lines).toHaveLength(2);
    const debitLine = result.reversalEntry.lines.find(
      (l) => Number(l.debitAmount) > 0,
    )!;
    const creditLine = result.reversalEntry.lines.find(
      (l) => Number(l.creditAmount) > 0,
    )!;
    expect(debitLine.accountId).toBe(hutangAccountId);
    expect(Number(debitLine.debitAmount)).toBe(10_000);
    expect(creditLine.accountId).toBe(persediaanAccountId);
    expect(Number(creditLine.creditAmount)).toBe(10_000);

    expect(result.reversedMovements).toHaveLength(1);
    expect(Number(result.reversedMovements[0].qtyBaseUnit)).toBe(-10);

    const lot: { qty_remaining: string }[] = await dataSource.query(
      `SELECT qty_remaining FROM stock_cost_lots WHERE product_id = $1`,
      [productId],
    );
    expect(Number(lot[0].qty_remaining)).toBe(0);

    const balance: { qty_base_unit: string }[] = await dataSource.query(
      `SELECT qty_base_unit FROM product_stock_balance WHERE product_id = $1 AND warehouse_id = $2`,
      [productId, storeWarehouseId],
    );
    expect(Number(balance[0].qty_base_unit)).toBe(0);

    const reconcile = await stockRecorderService.reconcile({ productId });
    expect(reconcile.every((row) => row.difference === 0)).toBe(true);

    expect(
      recordingHook.markVoidedCalls.some(
        (call) =>
          call.sourceId === sourceId &&
          call.reasonCode === 'BATAL_INPUT' &&
          call.reasonNote === 'Salah input jumlah' &&
          call.userId === userId,
      ),
    ).toBe(true);
  });

  it('VOID dua kali -> panggilan kedua ditolak', async () => {
    const productId = await createTestProduct('Produk VOID Dua Kali');
    const sourceId = randomUUID();
    await createPurchase(productId, 5, 500, sourceId);

    const first = await dataSource.transaction((manager) =>
      voidEngineService.voidDocument({
        sourceType: 'PURCHASE_INVOICE',
        sourceId,
        reasonCode: 'BATAL_INPUT',
        reasonNote: 'Uji void ganda',
        userId,
        manager,
      }),
    );
    createdEntryIds.push(first.reversalEntry.id);

    await expect(
      dataSource.transaction((manager) =>
        voidEngineService.voidDocument({
          sourceType: 'PURCHASE_INVOICE',
          sourceId,
          reasonCode: 'BATAL_INPUT',
          reasonNote: 'Percobaan kedua',
          userId,
          manager,
        }),
      ),
    ).rejects.toThrow(/sudah pernah di-VOID/i);
  });

  it('VOID tanpa void_reason_note -> ditolak, tidak ada apa pun yang berubah', async () => {
    const productId = await createTestProduct('Produk VOID Tanpa Alasan');
    const sourceId = randomUUID();
    await createPurchase(productId, 8, 700, sourceId);

    await expect(
      dataSource.transaction((manager) =>
        voidEngineService.voidDocument({
          sourceType: 'PURCHASE_INVOICE',
          sourceId,
          reasonCode: 'BATAL_INPUT',
          reasonNote: '   ',
          userId,
          manager,
        }),
      ),
    ).rejects.toThrow(/alasan pembatalan/i);

    const lot: { qty_remaining: string }[] = await dataSource.query(
      `SELECT qty_remaining FROM stock_cost_lots WHERE product_id = $1`,
      [productId],
    );
    expect(Number(lot[0].qty_remaining)).toBe(8);
  });

  it('VOID purchase yang lotnya sudah sebagian terjual -> ditolak, tidak ada apa pun yang berubah', async () => {
    const productId = await createTestProduct('Produk VOID Sudah Terjual');
    const purchaseSourceId = randomUUID();
    await createPurchase(productId, 10, 1000, purchaseSourceId);

    // Jual sebagian (transaksi terpisah, tidak lewat VoidEngine).
    await dataSource.transaction((manager) =>
      stockRecorderService.recordOut(
        {
          productId,
          warehouseId: storeWarehouseId,
          qtyBaseUnit: 4,
          movementDate: new Date(),
          movementType: StockMovementType.SALE,
          sourceType: 'SALES_INVOICE',
          sourceId: randomUUID(),
          createdBy: userId,
        },
        manager,
      ),
    );

    await expect(
      dataSource.transaction((manager) =>
        voidEngineService.voidDocument({
          sourceType: 'PURCHASE_INVOICE',
          sourceId: purchaseSourceId,
          reasonCode: 'BATAL_INPUT',
          reasonNote: 'Coba batalkan padahal sudah terjual',
          userId,
          manager,
        }),
      ),
    ).rejects.toThrow(/sudah terjual.*retur pembelian/i);

    // Transaction voidDocument gagal di tengah (reverseIn melempar) ->
    // seluruh transaction rollback, termasuk jurnal pembalik yang sempat
    // "ditulis" sebelum reverseIn dipanggil.
    const entries: { id: string }[] = await dataSource.query(
      `SELECT id FROM journal_entries WHERE source_type = 'PURCHASE_INVOICE' AND source_id = $1`,
      [purchaseSourceId],
    );
    expect(entries).toHaveLength(1);

    const lot: { qty_remaining: string }[] = await dataSource.query(
      `SELECT qty_remaining FROM stock_cost_lots WHERE product_id = $1`,
      [productId],
    );
    expect(Number(lot[0].qty_remaining)).toBe(6);
  });

  it('sourceType tanpa VoidHook terdaftar -> fail-closed (dokumennya sendiri sah, tidak ada&sudah-di-VOID)', async () => {
    // 'OPERATIONAL_EXPENSE' anggota sah JournalSourceType tapi sengaja tidak
    // pernah di-registerHook() di file ini — mensimulasikan modul yang lupa
    // wiring hook-nya. Dokumen aslinya ADA dan belum pernah di-VOID, supaya
    // test ini murni membuktikan gerbang "hook belum terdaftar", bukan
    // kebetulan ketahan gerbang lain (existence/idempotensi) duluan.
    const sourceId = randomUUID();
    await createJournalOnlyDocument('OPERATIONAL_EXPENSE', sourceId, 25_000);

    await expect(
      dataSource.transaction((manager) =>
        voidEngineService.voidDocument({
          sourceType: 'OPERATIONAL_EXPENSE',
          sourceId,
          reasonCode: 'BATAL_INPUT',
          reasonNote: 'Uji fail-closed',
          userId,
          manager,
        }),
      ),
    ).rejects.toThrow(/belum ada voidhook terdaftar/i);
  });

  it('hook prasyarat modul menolak -> pesan hook yang muncul (dokumennya sendiri sah)', async () => {
    const sourceId = randomUUID();
    await createJournalOnlyDocument('TEST_HOOKED_SOURCE', sourceId, 15_000);

    await expect(
      dataSource.transaction((manager) =>
        voidEngineService.voidDocument({
          sourceType: 'TEST_HOOKED_SOURCE',
          sourceId,
          reasonCode: 'BATAL_INPUT',
          reasonNote: 'Uji hook prasyarat',
          userId,
          manager,
        }),
      ),
    ).rejects.toThrow(/hook prasyarat menolak/i);
  });

  it('VOID dua kali BERSAMAAN (race) -> hanya satu yang berhasil, tidak ada dua jurnal pembalik', async () => {
    const productId = await createTestProduct('Produk VOID Race');
    const sourceId = randomUUID();
    await createPurchase(productId, 6, 600, sourceId);

    const results = await Promise.allSettled([
      dataSource.transaction((manager) =>
        voidEngineService.voidDocument({
          sourceType: 'PURCHASE_INVOICE',
          sourceId,
          reasonCode: 'BATAL_INPUT',
          reasonNote: 'Race A',
          userId,
          manager,
        }),
      ),
      dataSource.transaction((manager) =>
        voidEngineService.voidDocument({
          sourceType: 'PURCHASE_INVOICE',
          sourceId,
          reasonCode: 'BATAL_INPUT',
          reasonNote: 'Race B',
          userId,
          manager,
        }),
      ),
    ]);

    const fulfilled = results.filter(
      (r): r is PromiseFulfilledResult<VoidDocumentResult> =>
        r.status === 'fulfilled',
    );
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );
    // Siapa pun yang menang (app-level check atau index unik DB yang
    // menangkapnya) hasil akhirnya harus sama: tepat satu sukses, satu
    // ditolak dengan pesan yang sama seperti VOID ganda berurutan.
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0].reason as Error).message).toMatch(
      /sudah pernah di-VOID/i,
    );
    createdEntryIds.push(fulfilled[0].value.reversalEntry.id);

    const reversals: { id: string }[] = await dataSource.query(
      `SELECT id FROM journal_entries
       WHERE reversed_entry_id = (
         SELECT id FROM journal_entries
         WHERE source_type = 'PURCHASE_INVOICE' AND source_id = $1 AND is_reversal = false
       )`,
      [sourceId],
    );
    expect(reversals).toHaveLength(1);
  });

  it('VOID 1 sourceId dengan banyak movement (multi-baris) -> semua lot & movement dibalik', async () => {
    const productA = await createTestProduct('Produk Multi Baris A');
    const productB = await createTestProduct('Produk Multi Baris B');
    const sourceId = randomUUID();

    await dataSource.transaction(async (manager) => {
      await stockRecorderService.recordIn(
        {
          productId: productA,
          warehouseId: storeWarehouseId,
          qtyBaseUnit: 10,
          unitCost: 500,
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
      await stockRecorderService.recordIn(
        {
          productId: productB,
          warehouseId: storeWarehouseId,
          qtyBaseUnit: 4,
          unitCost: 2_000,
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
      const entry = await journalPosterService.post(
        {
          entryDate: new Date(),
          sourceType: 'PURCHASE_INVOICE',
          sourceId,
          createdBy: userId,
          lines: [
            { accountId: persediaanAccountId, debit: 5_000 + 8_000, credit: 0 },
            { accountId: hutangAccountId, debit: 0, credit: 13_000 },
          ],
        },
        manager,
      );
      createdEntryIds.push(entry.id);
    });

    const result = await dataSource.transaction((manager) =>
      voidEngineService.voidDocument({
        sourceType: 'PURCHASE_INVOICE',
        sourceId,
        reasonCode: 'BATAL_INPUT',
        reasonNote: 'Uji VOID multi-baris',
        userId,
        manager,
      }),
    );
    createdEntryIds.push(result.reversalEntry.id);

    expect(result.reversedMovements).toHaveLength(2);

    const lots: { qty_remaining: string }[] = await dataSource.query(
      `SELECT qty_remaining FROM stock_cost_lots WHERE product_id = ANY($1)`,
      [[productA, productB]],
    );
    expect(lots).toHaveLength(2);
    expect(lots.every((l) => Number(l.qty_remaining) === 0)).toBe(true);

    const balances: { qty_base_unit: string }[] = await dataSource.query(
      `SELECT qty_base_unit FROM product_stock_balance WHERE product_id = ANY($1)`,
      [[productA, productB]],
    );
    expect(balances).toHaveLength(2);
    expect(balances.every((b) => Number(b.qty_base_unit) === 0)).toBe(true);
  });

  it('VOID atas movement bertipe TRANSFER -> ditolak eksplisit (belum didukung, Hari 13)', async () => {
    const productId = await createTestProduct('Produk VOID Transfer Ditolak');
    const mutationSourceId = randomUUID();

    // Stok awal di gudang asal (dokumen terpisah, bukan yang mau di-VOID).
    await createPurchase(productId, 10, 100, randomUUID());

    await dataSource.transaction((manager) =>
      stockRecorderService.transfer(
        {
          productId,
          fromWarehouseId: storeWarehouseId,
          toWarehouseId: secondWarehouseId,
          qtyBaseUnit: 4,
          movementDate: new Date(),
          sourceType: 'WAREHOUSE_MUTATION',
          sourceId: mutationSourceId,
          createdBy: userId,
        },
        manager,
      ),
    );
    // Transfer sungguhan TIDAK PERNAH bikin jurnal (CLAUDE.md §3 "Mutasi
    // gudang") — jurnal tiruan (via helper journal-saja) murni supaya
    // voidDocument() lolos sampai tahap pembalikan stok, untuk membuktikan
    // guard TRANSFER-nya, tanpa menunggu Hari 13 sungguhan berdiri.
    // sourceType HARUS sama dengan transfer di atas supaya voidDocument()
    // menemukan movement transfer-nya lewat source_type/source_id yang sama.
    await createJournalOnlyDocument('WAREHOUSE_MUTATION', mutationSourceId, 1);

    voidEngineService.registerHook('WAREHOUSE_MUTATION', recordingHook);

    await expect(
      dataSource.transaction((manager) =>
        voidEngineService.voidDocument({
          sourceType: 'WAREHOUSE_MUTATION',
          sourceId: mutationSourceId,
          reasonCode: 'BATAL_INPUT',
          reasonNote: 'Uji guard transfer',
          userId,
          manager,
        }),
      ),
    ).rejects.toThrow(/mutasi gudang \(transfer\)/i);
  });

  it('VOID dokumen ber-customer_id -> baris pembalik ikut membawa customer_id yang sama (Hari 18, regresi tag piutang)', async () => {
    // Titik paling gampang lupa (lihat komentar reversalLines di void.service.ts):
    // reversalLines dulu hanya mem-map accountId/debit/credit/description.
    // Tanpa memneruskan customerId, jurnal pembalik dokumen yang menyentuh
    // piutang pelanggan diam-diam kehilangan tag pelanggannya dan
    // ArAccountResolverService.getCustomerBalance() salah hitung tanpa error
    // apa pun.
    const sourceId = randomUUID();
    voidEngineService.registerHook('TEST_AR_VOID', recordingHook);

    const entry = await dataSource.transaction((manager) =>
      journalPosterService.post(
        {
          entryDate: new Date(),
          description: 'Dokumen ber-piutang uji VoidEngine',
          sourceType: 'TEST_AR_VOID' as never,
          sourceId,
          createdBy: userId,
          lines: [
            {
              accountId: persediaanAccountId,
              debit: 7_500,
              credit: 0,
              customerId,
            },
            { accountId: hutangAccountId, debit: 0, credit: 7_500 },
          ],
        },
        manager,
      ),
    );
    createdEntryIds.push(entry.id);

    const result = await dataSource.transaction((manager) =>
      voidEngineService.voidDocument({
        sourceType: 'TEST_AR_VOID',
        sourceId,
        reasonCode: 'BATAL_INPUT',
        reasonNote: 'Uji regresi customer_id pada reversal',
        userId,
        manager,
      }),
    );
    createdEntryIds.push(result.reversalEntry.id);

    const reversalLineWithCustomer = result.reversalEntry.lines.find(
      (line) => line.accountId === persediaanAccountId,
    )!;
    expect(reversalLineWithCustomer.customerId).toBe(customerId);

    const reversalLineWithoutCustomer = result.reversalEntry.lines.find(
      (line) => line.accountId === hutangAccountId,
    )!;
    expect(reversalLineWithoutCustomer.customerId).toBeNull();
  });
});
