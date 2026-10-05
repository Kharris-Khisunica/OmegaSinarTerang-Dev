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
import { JournalEntryLine } from '../journal-entries/entities/journal-entry-line.entity';
import { JournalEntry } from '../journal-entries/entities/journal-entry.entity';
import { OpeningBalanceService } from '../opening-balance/opening-balance.service';
import { ProductUnitConversion } from '../products/entities/product-unit-conversion.entity';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { User } from '../users/entities/user.entity';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';

/**
 * Integration test terhadap Postgres asli, pola sama opening-balance.service
 * .spec.ts — semua service dikonstruksi manual lewat `new` (bypass Nest DI).
 * Fokus: kunci ar_account_id (CLAUDE.md §3 "Dikunci selama saldo pelanggan
 * belum nol") lewat OpeningBalanceService sebagai satu-satunya sumber saldo
 * pelanggan nyata hari ini (Faktur/Pembayaran/Retur Penjualan belum ada).
 */
describe('CustomersService — kunci ar_account_id (Hari 18)', () => {
  let dataSource: DataSource;
  let customersService: CustomersService;
  let openingBalanceService: OpeningBalanceService;
  let arAccountResolverService: ArAccountResolverService;

  let userId: string;
  let receivableAccountId: string; // 01.120.00001 — dipakai sebagai target pindah eksplisit

  const openingDateString = '2026-09-01';
  let originalOpeningBalanceDate: string | null;
  const createdCustomerIds: string[] = [];
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
        ChartOfAccount,
        JournalEntry,
        JournalEntryLine,
      ],
    });
    await dataSource.initialize();

    const productsService = new ProductsService(
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
    arAccountResolverService = new ArAccountResolverService(dataSource);
    const periodLockValidatorService = new PeriodLockValidatorService();
    const accountResolverService = new AccountResolverService(dataSource);

    openingBalanceService = new OpeningBalanceService(
      dataSource,
      stockRecorderService,
      journalPosterService,
      arAccountResolverService,
      periodLockValidatorService,
      accountResolverService,
    );

    customersService = new CustomersService(
      dataSource.getRepository(Customer),
      dataSource.getRepository(ChartOfAccount),
      dataSource,
      arAccountResolverService,
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
        username: `test_customers_ar_lock_${Date.now()}`,
        passwordHash,
        fullName: 'Test Customers AR Lock',
        role: Role.MASTER,
        isActive: true,
      }),
    );
    userId = user.id;

    const accountsRepo = dataSource.getRepository(ChartOfAccount);
    receivableAccountId = (
      await accountsRepo.findOneOrFail({ where: { code: '01.120.00001' } })
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
    if (createdCustomerIds.length > 0) {
      await dataSource.query('DELETE FROM customers WHERE id = ANY($1)', [
        createdCustomerIds,
      ]);
    }
    await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
    await dataSource.destroy();
  });

  async function createTestCustomer(name: string): Promise<Customer> {
    const customer = await customersService.create({ name });
    createdCustomerIds.push(customer.id);
    return customer;
  }

  it('saldo nol -> ar_account_id boleh diubah', async () => {
    const customer = await createTestCustomer(
      `Pelanggan Saldo Nol ${Date.now()}`,
    );
    expect(customer.arAccountId).toBeNull();

    const updated = await customersService.update(customer.id, {
      arAccountId: receivableAccountId,
    });
    expect(updated.arAccountId).toBe(receivableAccountId);
  });

  it('mengirim arAccountId yang SAMA dengan nilai sekarang -> tidak dianggap perubahan, tidak query saldo', async () => {
    const customer = await createTestCustomer(
      `Pelanggan Tanpa Perubahan ${Date.now()}`,
    );
    await customersService.update(customer.id, {
      arAccountId: receivableAccountId,
    });

    // Kalau ini keliru dianggap "berubah", assertBalanceIsZero() akan
    // dipanggil — tidak masalah karena saldo memang nol, tapi field lain
    // (name) tetap harus berhasil ter-update tanpa terhalang.
    const updated = await customersService.update(customer.id, {
      arAccountId: receivableAccountId,
      name: 'Nama Diperbarui',
    });
    expect(updated.name).toBe('NAMA DIPERBARUI');
    expect(updated.arAccountId).toBe(receivableAccountId);
  });

  it('saldo piutang belum nol (dari Saldo Awal) -> ar_account_id DITOLAK dengan pesan jelas', async () => {
    const customer = await createTestCustomer(
      `Pelanggan Bersaldo ${Date.now()}`,
    );

    const result = await openingBalanceService.submit(
      { receivableLines: [{ customerId: customer.id, amount: 5_000 }] },
      userId,
    );
    createdEntryIds.push(result.journalEntry.id);

    const balance = await arAccountResolverService.getCustomerBalance(
      customer.id,
    );
    expect(balance).toBe(5_000);

    await expect(
      customersService.update(customer.id, {
        arAccountId: receivableAccountId,
      }),
    ).rejects.toThrow(/masih ada saldo piutang Rp5000\.00/);
  });

  it('field lain (name) TETAP bisa diubah untuk pelanggan bersaldo, selama ar_account_id tidak disentuh', async () => {
    const customer = await createTestCustomer(
      `Pelanggan Bersaldo Ganti Nama ${Date.now()}`,
    );
    const result = await openingBalanceService.submit(
      { receivableLines: [{ customerId: customer.id, amount: 2_500 }] },
      userId,
    );
    createdEntryIds.push(result.journalEntry.id);

    const updated = await customersService.update(customer.id, {
      name: 'Nama Baru Meski Bersaldo',
    });
    expect(updated.name).toBe('NAMA BARU MESKI BERSALDO');
  });
});
