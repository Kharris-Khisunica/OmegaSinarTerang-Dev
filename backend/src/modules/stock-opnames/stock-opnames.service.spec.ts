import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { AccountResolverService } from '../../core/account-resolver/account-resolver.service';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { JournalPosterService } from '../../core/journal-poster/journal-poster.service';
import { PeriodLockValidatorService } from '../../core/period-lock/period-lock-validator.service';
import { StockRecorderService } from '../../core/stock-recorder/stock-recorder.service';
import { VoidEngineService } from '../../core/void/void.service';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
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
import { User } from '../users/entities/user.entity';
import {
  Warehouse,
  WarehouseType,
} from '../warehouses/entities/warehouse.entity';
import { StockOpnameLine } from './entities/stock-opname-line.entity';
import { StockOpname, StockOpnameStatus } from './entities/stock-opname.entity';
import { StockOpnameVoidHook } from './stock-opname-void.hook';
import { StockOpnamesService } from './stock-opnames.service';

/**
 * Stok Opname tersimpan + koreksi stok (need_fixing.md #25). Integration test
 * Postgres asli, semua service dikonstruksi manual (pola spec modul lain).
 */
describe('StockOpnamesService', () => {
  let dataSource: DataSource;
  let productsService: ProductsService;
  let stockRecorderService: StockRecorderService;
  let service: StockOpnamesService;
  let storeWarehouseId: string;
  let inventoryAccountId: string;
  let diffAccountId: string;
  let brandId: string;
  let masterUserId: string;

  const createdProductIds: string[] = [];
  const createdOpnameIds: string[] = [];
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
        Warehouse,
        ChartOfAccount,
        JournalEntry,
        JournalEntryLine,
        StockMovement,
        StockCostLot,
        StockCostConsumption,
        StockOpname,
        StockOpnameLine,
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
    const voidEngineService = new VoidEngineService(
      journalPosterService,
      stockRecorderService,
    );
    new StockOpnameVoidHook(
      voidEngineService,
      stockRecorderService,
    ).onModuleInit();
    service = new StockOpnamesService(
      dataSource,
      documentCounterService,
      stockRecorderService,
      journalPosterService,
      accountResolverService,
      periodLockValidatorService,
      voidEngineService,
    );

    const suffix = Date.now();
    const usersRepo = dataSource.getRepository(User);
    const master = await usersRepo.save(
      usersRepo.create({
        username: `test_op_master_${suffix}`,
        passwordHash: await bcrypt.hash('x', 4),
        fullName: 'Test Opname Master',
        role: Role.MASTER,
        isActive: true,
      }),
    );
    masterUserId = master.id;
    masterUser.sub = masterUserId;

    const store = await dataSource.getRepository(Warehouse).findOneOrFail({
      where: {
        warehouseType: WarehouseType.STORE,
        isDefault: true,
        isActive: true,
      },
    });
    storeWarehouseId = store.id;

    const brandsRepo = dataSource.getRepository(Brand);
    const brand = await brandsRepo.save(
      brandsRepo.create({
        code: `TOP-${suffix.toString().slice(-8)}`,
        name: 'Merek Uji Opname',
        isActive: true,
      }),
    );
    brandId = brand.id;

    inventoryAccountId = await accountResolverService.resolveSingleActive(
      'is_inventory_account = true',
      'Persediaan',
    );
    diffAccountId = await accountResolverService.resolveSingleActive(
      'is_stock_opname_diff_account = true',
      'Selisih Persediaan',
    );
  });

  afterAll(async () => {
    if (createdOpnameIds.length > 0) {
      const entryIds = `SELECT id FROM journal_entries WHERE source_type = 'STOCK_OPNAME' AND source_id = ANY($1)`;
      await dataSource.query(
        `DELETE FROM journal_entry_lines WHERE journal_entry_id IN (
           SELECT id FROM journal_entries WHERE reversed_entry_id IN (${entryIds})
           UNION ${entryIds})`,
        [createdOpnameIds],
      );
      await dataSource.query(
        `DELETE FROM journal_entries WHERE reversed_entry_id IN (${entryIds})`,
        [createdOpnameIds],
      );
      await dataSource.query(
        `DELETE FROM journal_entries WHERE source_type = 'STOCK_OPNAME' AND source_id = ANY($1)`,
        [createdOpnameIds],
      );
      await dataSource.query(
        `DELETE FROM stock_opname_lines WHERE stock_opname_id = ANY($1)`,
        [createdOpnameIds],
      );
      await dataSource.query(`DELETE FROM stock_opnames WHERE id = ANY($1)`, [
        createdOpnameIds,
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
    await dataSource.query(`DELETE FROM brands WHERE id = $1`, [brandId]);
    await dataSource.query('DELETE FROM audit_logs WHERE user_id = $1', [
      masterUserId,
    ]);
    await dataSource.query('DELETE FROM users WHERE id = $1', [masterUserId]);
    await dataSource.destroy();
  });

  function today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  async function productWithStock(
    qty: number,
    unitCost: number,
  ): Promise<string> {
    const product = await productsService.create({
      brandId,
      keterangan: `Opname ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      baseUnit: 'PCS',
      isBkp: false,
      unitConversions: [],
    });
    createdProductIds.push(product.id);
    const lotDate = new Date();
    lotDate.setUTCDate(lotDate.getUTCDate() - 3);
    await dataSource.transaction((manager) =>
      stockRecorderService.recordIn(
        {
          productId: product.id,
          warehouseId: storeWarehouseId,
          qtyBaseUnit: qty,
          unitCost,
          lotDate,
          movementDate: lotDate,
          movementType: StockMovementType.PURCHASE,
          sourceType: 'MANUAL',
          createdBy: masterUserId,
        },
        manager,
      ),
    );
    return product.id;
  }

  async function storeQty(productId: string): Promise<number> {
    const rows: { qty: string }[] = await dataSource.query(
      `SELECT COALESCE(SUM(qty_base_unit), 0) AS qty FROM product_stock_balance
       WHERE product_id = $1 AND warehouse_id = $2`,
      [productId, storeWarehouseId],
    );
    return Number(rows[0].qty);
  }

  async function journalTotals(opnameId: string) {
    const rows: { account_id: string; debit: string; credit: string }[] =
      await dataSource.query(
        `SELECT l.account_id, SUM(l.debit_amount) AS debit, SUM(l.credit_amount) AS credit
         FROM journal_entries e JOIN journal_entry_lines l ON l.journal_entry_id = e.id
         WHERE e.source_type = 'STOCK_OPNAME' AND e.source_id = $1
         GROUP BY l.account_id`,
        [opnameId],
      );
    return new Map(
      rows.map((r) => [
        r.account_id,
        { debit: Number(r.debit), credit: Number(r.credit) },
      ]),
    );
  }

  it('simpan DRAFT: snapshot stok sistem + selisih, stok & jurnal TIDAK tersentuh; DRAFT bisa diubah', async () => {
    const productId = await productWithStock(10, 1000);
    const draft = await service.create(
      { countDate: today(), lines: [{ productId, physicalQtyBase: 8 }] },
      masterUser,
    );
    createdOpnameIds.push(draft.id);
    expect(draft.status).toBe(StockOpnameStatus.DRAFT);
    expect(draft.documentNumber).toMatch(/^OP\//);
    expect(Number(draft.lines[0].systemQtyBase)).toBe(10);
    expect(Number(draft.lines[0].diffQtyBase)).toBe(-2);
    expect(await storeQty(productId)).toBe(10);
    expect((await journalTotals(draft.id)).size).toBe(0);

    const updated = await service.update(draft.id, {
      countDate: today(),
      lines: [{ productId, physicalQtyBase: 9 }],
    });
    expect(Number(updated.lines[0].diffQtyBase)).toBe(-1);
  });

  it('posting: kurang -> stok keluar FIFO, Selisih Persediaan (D)/Persediaan (K); lebih -> lot baru harga pokok terakhir, kebalikannya', async () => {
    const shortProduct = await productWithStock(10, 1000);
    const surplusProduct = await productWithStock(5, 2500);
    const draft = await service.create(
      {
        countDate: today(),
        lines: [
          { productId: shortProduct, physicalQtyBase: 7 }, // -3 x 1.000
          { productId: surplusProduct, physicalQtyBase: 7 }, // +2 x 2.500
        ],
      },
      masterUser,
    );
    createdOpnameIds.push(draft.id);

    const posted = await service.post(draft.id, masterUser);
    expect(posted.status).toBe(StockOpnameStatus.POSTED);
    expect(Number(posted.shortageValue)).toBe(3000);
    expect(Number(posted.surplusValue)).toBe(5000);
    expect(await storeQty(shortProduct)).toBe(7);
    expect(await storeQty(surplusProduct)).toBe(7);

    const totals = await journalTotals(draft.id);
    expect(totals.get(diffAccountId)).toEqual({ debit: 3000, credit: 5000 });
    expect(totals.get(inventoryAccountId)).toEqual({
      debit: 5000,
      credit: 3000,
    });

    await expect(service.post(draft.id, masterUser)).rejects.toThrow(/DRAFT/);
    await expect(
      service.update(draft.id, {
        countDate: today(),
        lines: [{ productId: shortProduct, physicalQtyBase: 1 }],
      }),
    ).rejects.toThrow(/tidak bisa diubah/);
  });

  it('VOID opname POSTED -> stok & jurnal dibalik; VOID DRAFT -> cukup VOIDED', async () => {
    const productId = await productWithStock(10, 1000);
    const draft = await service.create(
      { countDate: today(), lines: [{ productId, physicalQtyBase: 6 }] },
      masterUser,
    );
    createdOpnameIds.push(draft.id);
    await service.post(draft.id, masterUser);
    expect(await storeQty(productId)).toBe(6);

    const voided = await service.voidOpname(
      draft.id,
      { reasonCode: 'SALAH_HITUNG', reasonNote: 'hitung ulang' },
      masterUser,
    );
    expect(voided.status).toBe(StockOpnameStatus.VOIDED);
    expect(await storeQty(productId)).toBe(10);

    const draft2 = await service.create(
      { countDate: today(), lines: [{ productId, physicalQtyBase: 10 }] },
      masterUser,
    );
    createdOpnameIds.push(draft2.id);
    const voidedDraft = await service.voidOpname(
      draft2.id,
      { reasonCode: 'BATAL', reasonNote: 'tidak jadi' },
      masterUser,
    );
    expect(voidedDraft.status).toBe(StockOpnameStatus.VOIDED);
  });

  it('produk dobel dalam satu opname -> ditolak', async () => {
    const productId = await productWithStock(1, 1000);
    await expect(
      service.create(
        {
          countDate: today(),
          lines: [
            { productId, physicalQtyBase: 1 },
            { productId, physicalQtyBase: 2 },
          ],
        },
        masterUser,
      ),
    ).rejects.toThrow(/sekali/);
  });
});
