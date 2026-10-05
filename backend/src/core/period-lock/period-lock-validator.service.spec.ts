import { DataSource } from 'typeorm';
import { PeriodLockValidatorService } from './period-lock-validator.service';

/**
 * Integration test terhadap Postgres asli (pola sama
 * document-counter.service.spec.ts) — service stateless, di-`new` langsung
 * tanpa Nest app.
 */
describe('PeriodLockValidatorService', () => {
  let dataSource: DataSource;
  let service: PeriodLockValidatorService;
  let originalOpeningBalanceDate: string | null;

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
    service = new PeriodLockValidatorService();

    const rows: { value: string }[] = await dataSource.query(
      `SELECT value FROM settings WHERE key = 'opening_balance_date'`,
    );
    originalOpeningBalanceDate = rows[0]?.value ?? null;
  });

  afterAll(async () => {
    if (originalOpeningBalanceDate) {
      await dataSource.query(
        `UPDATE settings SET value = $1 WHERE key = 'opening_balance_date'`,
        [originalOpeningBalanceDate],
      );
    }
    await dataSource.destroy();
  });

  describe('validate (backdate)', () => {
    it('tanggal hari ini -> lolos', async () => {
      await expect(
        dataSource.transaction((manager) =>
          service.validate(new Date(), manager),
        ),
      ).resolves.toBeUndefined();
    });

    it('tanggal masa depan -> error', async () => {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

      await expect(
        dataSource.transaction((manager) =>
          service.validate(tomorrow, manager),
        ),
      ).rejects.toThrow(/tidak boleh di masa depan/i);
    });

    it('mundur lebih dari backdate_max_days -> error', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);

      await expect(
        dataSource.transaction((manager) =>
          service.validate(threeDaysAgo, manager),
        ),
      ).rejects.toThrow(/maksimal mundur/i);
    });
  });

  describe('assertOpeningBalanceDate (pengecualian bernama Saldo Awal)', () => {
    it('tanggal persis sama dengan settings.opening_balance_date -> lolos', async () => {
      await dataSource.query(
        `UPDATE settings SET value = '2026-09-01' WHERE key = 'opening_balance_date'`,
      );
      const openingDate = new Date(Date.UTC(2026, 8, 1)); // 1 Sept 2026, di masa depan

      await expect(
        dataSource.transaction((manager) =>
          service.assertOpeningBalanceDate(openingDate, manager),
        ),
      ).resolves.toBeUndefined();
    });

    it('tanggal tidak cocok dengan settings.opening_balance_date -> error', async () => {
      await dataSource.query(
        `UPDATE settings SET value = '2026-09-01' WHERE key = 'opening_balance_date'`,
      );
      const wrongDate = new Date(Date.UTC(2026, 8, 2));

      await expect(
        dataSource.transaction((manager) =>
          service.assertOpeningBalanceDate(wrongDate, manager),
        ),
      ).rejects.toThrow(/harus persis/i);
    });
  });
});
