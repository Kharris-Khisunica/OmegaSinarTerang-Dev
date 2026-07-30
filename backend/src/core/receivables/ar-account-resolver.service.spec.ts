import { DataSource } from 'typeorm';
import { ArAccountResolverService } from './ar-account-resolver.service';

/**
 * Integration test terhadap Postgres asli (pola sama dengan
 * DocumentCounterService) — bukan mock. Ini satu-satunya pemanggil hari ini;
 * pemanggil produksi menyusul di Hari 12 (Saldo Awal), 21 (Faktur Penjualan),
 * 23 (Retur Penjualan), 26-27 (Payment), dan pembalikan VOID.
 */
describe('ArAccountResolverService', () => {
  let dataSource: DataSource;
  let service: ArAccountResolverService;
  let originalDefaultId: string | undefined;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'omega_dev',
    });
    await dataSource.initialize();
    service = new ArAccountResolverService(dataSource);

    const rows: { value: string }[] = await dataSource.query(
      `SELECT value FROM settings WHERE key = 'default_ar_account_id'`,
    );
    originalDefaultId = rows[0]?.value;
  });

  afterAll(async () => {
    if (originalDefaultId) {
      await dataSource.query(
        `UPDATE settings SET value = $1 WHERE key = 'default_ar_account_id'`,
        [originalDefaultId],
      );
    }
    await dataSource.destroy();
  });

  it('mengembalikan ar_account_id customer kalau terisi, tanpa query settings', async () => {
    const result = await service.resolve({
      arAccountId: '11111111-1111-1111-1111-111111111111',
    });
    expect(result).toBe('11111111-1111-1111-1111-111111111111');
  });

  it('jatuh ke settings.default_ar_account_id kalau ar_account_id NULL', async () => {
    const result = await service.resolve({ arAccountId: null });
    expect(result).toBe(originalDefaultId);
  });

  it('menolak dengan 400 kalau ar_account_id NULL dan default belum diisi', async () => {
    await dataSource.query(
      `UPDATE settings SET value = '' WHERE key = 'default_ar_account_id'`,
    );

    await expect(service.resolve({ arAccountId: null })).rejects.toThrow(
      'settings.default_ar_account_id belum diisi',
    );
  });
});
