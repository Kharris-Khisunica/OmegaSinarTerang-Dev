import { DataSource } from 'typeorm';
import {
  AccountSubtype,
  AccountType,
  ChartOfAccount,
  NormalBalance,
} from './entities/chart-of-account.entity';
import { ChartOfAccountsService } from './chart-of-accounts.service';

/**
 * Integration test terhadap Postgres asli, pola sama service kecil lain
 * (mis. ArAccountResolverService) — bukan mock.
 */
describe('ChartOfAccountsService', () => {
  let dataSource: DataSource;
  let service: ChartOfAccountsService;
  const createdAccountIds: string[] = [];

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'omega_dev',
      entities: [ChartOfAccount],
    });
    await dataSource.initialize();
    service = new ChartOfAccountsService(
      dataSource.getRepository(ChartOfAccount),
    );
  });

  afterAll(async () => {
    if (createdAccountIds.length > 0) {
      await dataSource.query(
        `DELETE FROM chart_of_accounts WHERE id = ANY($1)`,
        [createdAccountIds],
      );
    }
    await dataSource.destroy();
  });

  it('create: akun kas baru langsung lolos findCashAccounts()', async () => {
    const suffix = Date.now().toString().slice(-5);
    const account = await service.create({
      code: `99.900.${suffix}`,
      name: 'Kas Baru Hari 18',
      accountType: AccountType.ASSET,
      normalBalance: NormalBalance.DEBIT,
      accountSubtype: AccountSubtype.CURRENT_ASSET,
      isCashAccount: true,
    });
    createdAccountIds.push(account.id);

    const cashAccounts = await service.findCashAccounts();
    expect(cashAccounts.map((a) => a.id)).toContain(account.id);
  });

  it('create: menolak kombinasi account_subtype x normal_balance yang mustahil (COA_USULAN §7.1)', async () => {
    const suffix = Date.now().toString().slice(-5);
    await expect(
      service.create({
        code: `99.901.${suffix}`,
        name: 'Akumulasi Penyusutan Salah Arah',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.ACCUMULATED_DEPRECIATION,
      }),
    ).rejects.toThrow(/wajib bersaldo normal CREDIT/);
  });

  it('create: menolak flag singular (is_inventory_account) kalau sudah dipegang akun aktif lain (§7.2)', async () => {
    const suffix = Date.now().toString().slice(-5);
    // Bagan Akun Hari 17A sudah men-seed tepat satu akun Persediaan aktif
    // (COA_USULAN §7.2) — akun baru mana pun yang minta flag ini wajib ditolak.
    await expect(
      service.create({
        code: `99.902.${suffix}`,
        name: 'Persediaan Kedua',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.CURRENT_ASSET,
        isInventoryAccount: true,
      }),
    ).rejects.toThrow(/Persediaan harus tepat satu/);
  });

  it('create: menolak parentId yang menunjuk akun Jenis (is_postable=true), hanya header yang boleh jadi induk', async () => {
    const suffix = Date.now().toString().slice(-5);
    const repo = dataSource.getRepository(ChartOfAccount);
    const leafParent = await repo.save(
      repo.create({
        code: `99.903.${suffix}`,
        name: 'Akun Jenis (bukan header)',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.CURRENT_ASSET,
        isPostable: true,
        isActive: true,
      }),
    );
    createdAccountIds.push(leafParent.id);

    const childSuffix = (Date.now() + 1).toString().slice(-5);
    await expect(
      service.create({
        code: `99.913.${childSuffix}`,
        name: 'Anak dari Akun Jenis',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.CURRENT_ASSET,
        parentId: leafParent.id,
      }),
    ).rejects.toThrow(/Akun induk harus akun header/);
  });

  it('create: menerima parentId yang menunjuk akun header (is_postable=false)', async () => {
    const suffix = Date.now().toString().slice(-5);
    const repo = dataSource.getRepository(ChartOfAccount);
    const header = await repo.save(
      repo.create({
        code: `99.904.${suffix}`,
        name: 'Header Uji',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.CURRENT_ASSET,
        isPostable: false,
        isActive: true,
      }),
    );
    createdAccountIds.push(header.id);

    const childSuffix = (Date.now() + 2).toString().slice(-5);
    const child = await service.create({
      code: `99.914.${childSuffix}`,
      name: 'Anak dari Header',
      accountType: AccountType.ASSET,
      normalBalance: NormalBalance.DEBIT,
      accountSubtype: AccountSubtype.CURRENT_ASSET,
      parentId: header.id,
    });
    createdAccountIds.push(child.id);

    expect(child.parentId).toBe(header.id);
  });

  it('update: menolak code yang sudah dipakai akun lain', async () => {
    const suffix = Date.now().toString().slice(-5);
    const repo = dataSource.getRepository(ChartOfAccount);
    const first = await repo.save(
      repo.create({
        code: `99.905.${suffix}`,
        name: 'Akun A',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.CURRENT_ASSET,
      }),
    );
    const second = await repo.save(
      repo.create({
        code: `99.906.${suffix}`,
        name: 'Akun B',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.CURRENT_ASSET,
      }),
    );
    createdAccountIds.push(first.id, second.id);

    await expect(
      service.update(second.id, { code: first.code }),
    ).rejects.toThrow(/sudah dipakai/);
  });

  it('update: mengubah requires_outflow_approval berhasil (Hari 17 gap tertutup)', async () => {
    const suffix = Date.now().toString().slice(-5);
    const repo = dataSource.getRepository(ChartOfAccount);
    const account = await repo.save(
      repo.create({
        code: `99.907.${suffix}`,
        name: 'Kas Besar Uji',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.CURRENT_ASSET,
        isCashAccount: true,
      }),
    );
    createdAccountIds.push(account.id);

    const updated = await service.update(account.id, {
      requiresOutflowApproval: true,
    });
    expect(updated.requiresOutflowApproval).toBe(true);
  });

  it('findCashAccounts: hanya mengembalikan akun is_cash_account=true DAN is_active=true', async () => {
    const suffix = Date.now().toString().slice(-8);
    const repo = dataSource.getRepository(ChartOfAccount);

    const activeCash = await repo.save(
      repo.create({
        code: `KA${suffix}`,
        name: 'Kas Aktif',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.CURRENT_ASSET,
        isCashAccount: true,
        isActive: true,
      }),
    );
    const inactiveCash = await repo.save(
      repo.create({
        code: `KN${suffix}`,
        name: 'Kas Nonaktif',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.CURRENT_ASSET,
        isCashAccount: true,
        isActive: false,
      }),
    );
    const nonCash = await repo.save(
      repo.create({
        code: `PR${suffix}`,
        name: 'Bukan Kas',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.CURRENT_ASSET,
        isCashAccount: false,
        isActive: true,
      }),
    );
    createdAccountIds.push(activeCash.id, inactiveCash.id, nonCash.id);

    const rows = await service.findCashAccounts();
    const ids = rows.map((r) => r.id);

    expect(ids).toContain(activeCash.id);
    expect(ids).not.toContain(inactiveCash.id);
    expect(ids).not.toContain(nonCash.id);
  });
});
