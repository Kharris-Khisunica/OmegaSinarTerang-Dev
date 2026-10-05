import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { AccountResolverService } from '../../core/account-resolver/account-resolver.service';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { JournalPosterService } from '../../core/journal-poster/journal-poster.service';
import { PeriodLockValidatorService } from '../../core/period-lock/period-lock-validator.service';
import { ArAccountResolverService } from '../../core/receivables/ar-account-resolver.service';
import { StockRecorderService } from '../../core/stock-recorder/stock-recorder.service';
import { Brand } from '../brands/entities/brand.entity';
import { ChartOfAccount } from '../chart-of-accounts/entities/chart-of-account.entity';
import { Customer } from '../customers/entities/customer.entity';
import { JournalEntryLine } from '../journal-entries/entities/journal-entry-line.entity';
import { JournalEntry } from '../journal-entries/entities/journal-entry.entity';
import { ProductUnitConversion } from '../products/entities/product-unit-conversion.entity';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { StockCostConsumption } from '../stock/entities/stock-cost-consumption.entity';
import { StockCostLot } from '../stock/entities/stock-cost-lot.entity';
import { StockMovement } from '../stock/entities/stock-movement.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { User } from '../users/entities/user.entity';
import {
  Warehouse,
  WarehouseType,
} from '../warehouses/entities/warehouse.entity';
import { SubmitOpeningBalanceDto } from './dto/submit-opening-balance.dto';
import { OpeningBalanceService } from './opening-balance.service';

/**
 * Integration test terhadap Postgres asli, pola sama five-invariants.spec.ts
 * — semua service dikonstruksi manual lewat `new` (bypass Nest DI).
 */
describe('OpeningBalanceService', () => {
  let dataSource: DataSource;
  let productsService: ProductsService;
  let service: OpeningBalanceService;

  let userId: string;
  let brandId: string;
  let customerId: string;
  let supplierId: string;
  let storeWarehouseId: string;
  let persediaanAccountId: string; // 01.130.00001

  const openingDateString = '2026-09-01';
  let originalOpeningBalanceDate: string | null;

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
        Customer,
        Supplier,
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
    const stockRecorderService = new StockRecorderService(
      dataSource,
      productsService,
    );
    const journalPosterService = new JournalPosterService(
      new DocumentCounterService(),
      new PeriodLockValidatorService(),
    );
    const arAccountResolverService = new ArAccountResolverService(dataSource);
    const periodLockValidatorService = new PeriodLockValidatorService();
    const accountResolverService = new AccountResolverService(dataSource);

    service = new OpeningBalanceService(
      dataSource,
      stockRecorderService,
      journalPosterService,
      arAccountResolverService,
      periodLockValidatorService,
      accountResolverService,
    );

    const settingRows: { value: string }[] = await dataSource.query(
      `SELECT value FROM settings WHERE key = 'opening_balance_date'`,
    );
    originalOpeningBalanceDate = settingRows[0]?.value ?? null;
    await dataSource.query(
      `UPDATE settings SET value = $1 WHERE key = 'opening_balance_date'`,
      [openingDateString],
    );

    const usersRepo = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('test-password', 4);
    const user = await usersRepo.save(
      usersRepo.create({
        username: `test_opening_balance_${Date.now()}`,
        passwordHash,
        fullName: 'Test Opening Balance',
        role: Role.MASTER,
        isActive: true,
      }),
    );
    userId = user.id;

    const brandsRepo = dataSource.getRepository(Brand);
    const brand = await brandsRepo.save(
      brandsRepo.create({
        code: `TOB-${Date.now().toString().slice(-8)}`,
        name: 'Merek Uji Saldo Awal',
        isActive: true,
      }),
    );
    brandId = brand.id;

    const customersRepo = dataSource.getRepository(Customer);
    const customer = await customersRepo.save(
      customersRepo.create({
        code: `CUST-TOB-${Date.now().toString().slice(-6)}`,
        name: 'Pelanggan Uji Saldo Awal',
        isPkp: false,
        isActive: true,
      }),
    );
    customerId = customer.id;

    const suppliersRepo = dataSource.getRepository(Supplier);
    const supplier = await suppliersRepo.save(
      suppliersRepo.create({
        displayCode: `SUP-TOB-${Date.now().toString().slice(-6)}`,
        name: 'Supplier Uji Saldo Awal',
        isPkp: false,
        isActive: true,
      }),
    );
    supplierId = supplier.id;

    const warehousesRepo = dataSource.getRepository(Warehouse);
    const storeWarehouse = await warehousesRepo.save(
      warehousesRepo.create({
        name: `Toko Uji Saldo Awal ${Date.now()}`,
        warehouseType: WarehouseType.STORE,
        customerId: null,
        isActive: true,
      }),
    );
    storeWarehouseId = storeWarehouse.id;

    const accountsRepo = dataSource.getRepository(ChartOfAccount);
    persediaanAccountId = (
      await accountsRepo.findOneOrFail({ where: { code: '01.130.00001' } })
    ).id;
  });

  afterAll(async () => {
    if (originalOpeningBalanceDate) {
      await dataSource.query(
        `UPDATE settings SET value = $1 WHERE key = 'opening_balance_date'`,
        [originalOpeningBalanceDate],
      );
    }
    if (createdEntryIds.length > 0) {
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
    await dataSource.query('DELETE FROM warehouses WHERE id = $1', [
      storeWarehouseId,
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

  it('3 produk -> 3 lot DAN 1 jurnal pembuka bernilai PERSIS sama (dibuktikan lewat query SQL, bukan hitung manual)', async () => {
    const productIds = await Promise.all([
      createTestProduct('Produk Saldo Awal A'),
      createTestProduct('Produk Saldo Awal B'),
      createTestProduct('Produk Saldo Awal C'),
    ]);

    const dto: SubmitOpeningBalanceDto = {
      stockLines: [
        {
          productId: productIds[0],
          warehouseId: storeWarehouseId,
          qtyBaseUnit: 100,
          unitCost: 5_000,
        },
        {
          productId: productIds[1],
          warehouseId: storeWarehouseId,
          qtyBaseUnit: 50,
          unitCost: 12_000,
        },
        {
          productId: productIds[2],
          warehouseId: storeWarehouseId,
          qtyBaseUnit: 20,
          unitCost: 25_000,
        },
      ],
    };

    const result = await service.submit(dto, userId);
    createdEntryIds.push(result.journalEntry.id);

    expect(result.stockMovements).toHaveLength(3);

    const lotRows: { total: string }[] = await dataSource.query(
      `SELECT SUM(qty_remaining * unit_cost) AS total FROM stock_cost_lots WHERE product_id = ANY($1)`,
      [productIds],
    );
    const lotTotal = Number(lotRows[0].total);

    const ledgerRows: { total: string }[] = await dataSource.query(
      `SELECT SUM(debit_amount) AS total FROM journal_entry_lines
       WHERE journal_entry_id = $1 AND account_id = $2`,
      [result.journalEntry.id, persediaanAccountId],
    );
    const ledgerTotal = Number(ledgerRows[0].total);

    expect(lotTotal).toBeGreaterThan(0);
    expect(ledgerTotal).toBe(lotTotal);

    const balanceRows: { total_debit: string; total_credit: string }[] =
      await dataSource.query(
        `SELECT SUM(debit_amount) AS total_debit, SUM(credit_amount) AS total_credit
         FROM journal_entry_lines WHERE journal_entry_id = $1`,
        [result.journalEntry.id],
      );
    expect(Number(balanceRows[0].total_debit)).toBe(
      Number(balanceRows[0].total_credit),
    );
  });

  it('stok + piutang + hutang dalam 1 submit -> baris Modal jadi plug otomatis, tetap balance', async () => {
    const productId = await createTestProduct('Produk Saldo Awal Gabungan');

    const dto: SubmitOpeningBalanceDto = {
      stockLines: [
        {
          productId,
          warehouseId: storeWarehouseId,
          qtyBaseUnit: 10,
          unitCost: 1_000,
        }, // 10,000
      ],
      receivableLines: [{ customerId, amount: 5_000 }],
      payableLines: [{ supplierId, amount: 3_000 }],
    };

    const result = await service.submit(dto, userId);
    createdEntryIds.push(result.journalEntry.id);

    // Total Debit = 10.000 (Persediaan) + 5.000 (Piutang) = 15.000
    // Total Kredit = 3.000 (Hutang) + 12.000 (plug Modal) = 15.000
    expect(result.journalEntry.lines).toHaveLength(4);

    const balanceRows: { total_debit: string; total_credit: string }[] =
      await dataSource.query(
        `SELECT SUM(debit_amount) AS total_debit, SUM(credit_amount) AS total_credit
         FROM journal_entry_lines WHERE journal_entry_id = $1`,
        [result.journalEntry.id],
      );
    expect(Number(balanceRows[0].total_debit)).toBe(15_000);
    expect(Number(balanceRows[0].total_credit)).toBe(15_000);
  });

  it('submit tanpa baris sama sekali -> BadRequestException', async () => {
    await expect(service.submit({}, userId)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('receivableLines dengan customerId tidak ditemukan -> BadRequestException', async () => {
    await expect(
      service.submit(
        {
          receivableLines: [
            {
              customerId: '00000000-0000-0000-0000-000000000000',
              amount: 1000,
            },
          ],
        },
        userId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('GET verify() -> difference 0 setelah semua submit di atas', async () => {
    const result = await service.verify();
    expect(result.difference).toBe(0);
  });
});
