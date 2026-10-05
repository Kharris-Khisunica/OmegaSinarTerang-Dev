import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccountResolverService } from '../../core/account-resolver/account-resolver.service';
import { CashDailyReportService } from './cash-daily-report.service';

/**
 * Integration test terhadap Postgres asli (pola sama receivables/payables
 * report Hari 30) — fixture jurnal lewat INSERT langsung ke
 * journal_entries/journal_entry_lines, bukan lewat JournalPosterService
 * penuh (baris uji sengaja tidak seimbang debit=kredit per journal_entry,
 * karena yang diuji murni agregasi SUM per akun/tanggal, bukan validasi
 * posting).
 */
describe('CashDailyReportService', () => {
  let dataSource: DataSource;
  let service: CashDailyReportService;

  let userId: string;
  let cashAccountId: string;
  let cashAccountCode: string;
  let secondCashAccountId: string;
  let nonCashAccountId: string;
  const journalEntryIds: string[] = [];

  function isoDaysAgo(days: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  }

  async function insertJournalEntry(entryDate: string): Promise<string> {
    const rows: { id: string }[] = await dataSource.query(
      `INSERT INTO journal_entries (entry_number, entry_date, source_type, created_by)
       VALUES ($1, $2, 'MANUAL', $3) RETURNING id`,
      [
        `JE${String(Date.now()).slice(-9)}${Math.random().toString(36).slice(2, 6)}`,
        entryDate,
        userId,
      ],
    );
    journalEntryIds.push(rows[0].id);
    return rows[0].id;
  }

  async function insertLine(
    journalEntryId: string,
    accountId: string,
    debit: number,
    credit: number,
  ): Promise<void> {
    await dataSource.query(
      `INSERT INTO journal_entry_lines
         (journal_entry_id, account_id, debit_amount, credit_amount, line_order)
       VALUES ($1, $2, $3, $4, 1)`,
      [journalEntryId, accountId, debit, credit],
    );
  }

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
    const accountResolverService = new AccountResolverService(dataSource);
    service = new CashDailyReportService(dataSource, accountResolverService);

    const stamp = Date.now();
    const codeBase = String(stamp).slice(-9);
    const userRows: { id: string }[] = await dataSource.query(
      `INSERT INTO users (username, password_hash, full_name, role)
       VALUES ($1, 'x', 'Test Hari 31 Kas', 'MASTER') RETURNING id`,
      [`test_cash_daily_report_${stamp}`],
    );
    userId = userRows[0].id;

    async function insertAccount(
      code: string,
      name: string,
      isCash: boolean,
    ): Promise<string> {
      const rows: { id: string }[] = await dataSource.query(
        `INSERT INTO chart_of_accounts
           (code, name, account_type, is_active, normal_balance, account_subtype, is_postable, is_cash_account)
         VALUES ($1, $2, 'ASSET', true, 'DEBIT', 'CURRENT_ASSET', true, $3)
         RETURNING id`,
        [code, name, isCash],
      );
      return rows[0].id;
    }

    cashAccountCode = `KASA${codeBase}`;
    cashAccountId = await insertAccount(cashAccountCode, 'Kas Uji A', true);
    secondCashAccountId = await insertAccount(
      `KASB${codeBase}`,
      'Kas Uji B',
      true,
    );
    nonCashAccountId = await insertAccount(
      `NKAS${codeBase}`,
      'Bukan Kas Uji',
      false,
    );

    // Akun A: D0 debit 1.000.000 (seed sebelum jendela uji), D1 debit 300rb +
    // kredit 100rb, D2 (hari ini) debit 50rb.
    const d0 = isoDaysAgo(2);
    const d1 = isoDaysAgo(1);
    const d2 = isoDaysAgo(0);

    const je0 = await insertJournalEntry(d0);
    await insertLine(je0, cashAccountId, 1_000_000, 0);

    const je1 = await insertJournalEntry(d1);
    await insertLine(je1, cashAccountId, 300_000, 0);
    const je1b = await insertJournalEntry(d1);
    await insertLine(je1b, cashAccountId, 0, 100_000);

    const je2 = await insertJournalEntry(d2);
    await insertLine(je2, cashAccountId, 50_000, 0);

    // Akun B: satu baris di D1 saja (400rb masuk) -- untuk membuktikan GRAND
    // TOTAL menjumlah lintas akun, dan filter accountId mengisolasi akun A.
    const je3 = await insertJournalEntry(d1);
    await insertLine(je3, secondCashAccountId, 400_000, 0);
  });

  afterAll(async () => {
    await dataSource.query(
      `DELETE FROM journal_entry_lines WHERE journal_entry_id = ANY($1)`,
      [journalEntryIds],
    );
    await dataSource.query(`DELETE FROM journal_entries WHERE id = ANY($1)`, [
      journalEntryIds,
    ]);
    await dataSource.query(`DELETE FROM chart_of_accounts WHERE id = ANY($1)`, [
      [cashAccountId, secondCashAccountId, nonCashAccountId],
    ]);
    await dataSource.query(`DELETE FROM users WHERE id = $1`, [userId]);
    await dataSource.destroy();
  });

  it('menghitung saldo awal/masuk/keluar/saldo akhir per akun, dan saldo akhir hari N = saldo awal hari N+1', async () => {
    const d0 = isoDaysAgo(2);
    const d1 = isoDaysAgo(1);
    const d2 = isoDaysAgo(0);

    const reportD0 = await service.getDailyCashReport(d0, cashAccountId);
    const rowD0 = reportD0.rows.find((r) => r.accountId === cashAccountId)!;
    expect(rowD0.openingBalance).toBe(0);
    expect(rowD0.cashIn).toBe(1_000_000);
    expect(rowD0.cashOut).toBe(0);
    expect(rowD0.closingBalance).toBe(1_000_000);

    const reportD1 = await service.getDailyCashReport(d1, cashAccountId);
    const rowD1 = reportD1.rows.find((r) => r.accountId === cashAccountId)!;
    // DoD: saldo akhir hari N = saldo awal hari N+1.
    expect(rowD1.openingBalance).toBe(rowD0.closingBalance);
    expect(rowD1.cashIn).toBe(300_000);
    expect(rowD1.cashOut).toBe(100_000);
    expect(rowD1.closingBalance).toBe(1_200_000);

    const reportD2 = await service.getDailyCashReport(d2, cashAccountId);
    const rowD2 = reportD2.rows.find((r) => r.accountId === cashAccountId)!;
    expect(rowD2.openingBalance).toBe(rowD1.closingBalance);
    expect(rowD2.cashIn).toBe(50_000);
    expect(rowD2.closingBalance).toBe(1_250_000);
  });

  it('menyertakan baris GRAND TOTAL yang menjumlah lintas akun kas', async () => {
    const d1 = isoDaysAgo(1);
    const report = await service.getDailyCashReport(d1);

    const rowA = report.rows.find((r) => r.accountId === cashAccountId)!;
    const rowB = report.rows.find((r) => r.accountId === secondCashAccountId)!;
    expect(rowA).toBeDefined();
    expect(rowB).toBeDefined();
    expect(rowB.cashIn).toBe(400_000);

    const grandTotal = report.rows[report.rows.length - 1];
    expect(grandTotal.isGrandTotal).toBe(true);
    expect(grandTotal.cashIn).toBe(rowA.cashIn + rowB.cashIn);
    expect(grandTotal.closingBalance).toBe(
      rowA.closingBalance + rowB.closingBalance,
    );
  });

  it('accountId filter mengisolasi satu akun saja (tidak ikut akun kas lain)', async () => {
    const d1 = isoDaysAgo(1);
    const report = await service.getDailyCashReport(d1, cashAccountId);
    // rows = [akun A, GRAND TOTAL] -- akun B tidak ikut.
    expect(report.rows).toHaveLength(2);
    expect(report.rows[0].accountId).toBe(cashAccountId);
  });

  it('menolak accountId yang bukan akun kas aktif', async () => {
    await expect(
      service.getDailyCashReport(isoDaysAgo(0), nonCashAccountId),
    ).rejects.toThrow(BadRequestException);
  });
});
