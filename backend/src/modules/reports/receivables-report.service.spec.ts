import { DataSource } from 'typeorm';
import { Setting } from '../settings/entities/setting.entity';
import { SettingsService } from '../settings/settings.service';
import { ReceivablesReportService } from './receivables-report.service';

/**
 * Integration test terhadap Postgres asli (pola sama
 * document-continuity.service.spec.ts / stock-reports.service.spec.ts) —
 * fixture jurnal dibuat lewat INSERT langsung ke journal_entries/
 * journal_entry_lines (bukan lewat SalesInvoicesService/PaymentsService
 * penuh) supaya fokus murni pada logic laporan: FIFO ledger + filter
 * is_receivable_account + rekonsiliasi ke GL.
 *
 * `omega_dev` dipakai bersama sesi lain (CLAUDE.md "Aturan baru" §3 PROGRESS)
 * — laporan men-scan SELURUH journal_entry_lines, jadi setiap assertion di
 * sini HANYA membaca baris milik customer id buatan test ini sendiri, tidak
 * pernah mengasumsikan grand total atau isi rows penuh.
 */
describe('ReceivablesReportService', () => {
  let dataSource: DataSource;
  let service: ReceivablesReportService;
  let bucketDays: number;

  let userId: string;
  let arDefaultAccountId: string;
  let arCustomAccountId: string;
  let nonArAccountId: string; // mis. "Selisih Pembayaran" -- juga ditag customer_id, TAPI bukan piutang
  let customerOldId: string;
  let customerCustomArId: string;
  let customerPaidOffId: string;
  const journalEntryIds: string[] = [];

  function isoDaysAgo(days: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  }

  async function insertJournalEntry(
    entryDate: string,
    sourceId: string | null = null,
  ): Promise<string> {
    const rows: { id: string }[] = await dataSource.query(
      `INSERT INTO journal_entries (entry_number, entry_date, source_type, source_id, created_by)
       VALUES ($1, $2, 'SALES_INVOICE', $3, $4) RETURNING id`,
      [
        // entry_number varchar(30) -- 9 digit terakhir Date.now() + 4 acak.
        `JE${String(Date.now()).slice(-9)}${Math.random().toString(36).slice(2, 6)}`,
        entryDate,
        sourceId,
        userId,
      ],
    );
    journalEntryIds.push(rows[0].id);
    return rows[0].id;
  }

  async function insertLine(
    journalEntryId: string,
    accountId: string,
    customerId: string,
    debit: number,
    credit: number,
    lineOrder: number,
  ): Promise<void> {
    await dataSource.query(
      `INSERT INTO journal_entry_lines
         (journal_entry_id, account_id, debit_amount, credit_amount, line_order, customer_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [journalEntryId, accountId, debit, credit, lineOrder, customerId],
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
      entities: [Setting],
    });
    await dataSource.initialize();
    const settingsService = new SettingsService(
      dataSource.getRepository(Setting),
    );
    service = new ReceivablesReportService(dataSource, settingsService);

    const settings = await settingsService.findAll();
    bucketDays = Number(
      settings.find((s) => s.key === 'aging_bucket_days')?.value ?? 30,
    );

    const stamp = Date.now();
    const userRows: { id: string }[] = await dataSource.query(
      `INSERT INTO users (username, password_hash, full_name, role)
       VALUES ($1, 'x', 'Test Hari 30 Piutang', 'MASTER') RETURNING id`,
      [`test_receivables_report_${stamp}`],
    );
    userId = userRows[0].id;

    async function insertAccount(
      code: string,
      name: string,
      isReceivable: boolean,
    ): Promise<string> {
      const rows: { id: string }[] = await dataSource.query(
        `INSERT INTO chart_of_accounts
           (code, name, account_type, is_active, normal_balance, account_subtype, is_postable, is_receivable_account)
         VALUES ($1, $2, 'ASSET', true, 'DEBIT', 'CURRENT_ASSET', true, $3)
         RETURNING id`,
        [code, name, isReceivable],
      );
      return rows[0].id;
    }

    // chart_of_accounts.code adalah varchar(20) -- pakai 9 digit terakhir
    // stamp saja (pola sama stock-reports.service.spec.ts `codeBase`).
    const codeBase = String(stamp).slice(-9);
    arDefaultAccountId = await insertAccount(
      `RCVAR1${codeBase}`,
      'Piutang Uji (Default)',
      true,
    );
    arCustomAccountId = await insertAccount(
      `RCVAR2${codeBase}`,
      'Piutang Uji (Custom)',
      true,
    );
    nonArAccountId = await insertAccount(
      `RCVNAR${codeBase}`,
      'Bukan Piutang Uji',
      false,
    );

    async function insertCustomer(name: string): Promise<string> {
      const rows: { id: string }[] = await dataSource.query(
        `INSERT INTO customers (code, name) VALUES ($1, $2) RETURNING id`,
        [`RCV${stamp}${Math.random().toString(36).slice(2, 6)}`, name],
      );
      return rows[0].id;
    }

    customerOldId = await insertCustomer('Pelanggan Lama Uji Hari 30');
    customerCustomArId = await insertCustomer(
      'Pelanggan Akun Custom Uji Hari 30',
    );
    customerPaidOffId = await insertCustomer('Pelanggan Lunas Uji Hari 30');

    // customerOld: debit tua (ageDays = bucketDays+5, jatuh di bucket index 1)
    // di akun AR "default" + baris kredit "noise" di akun BUKAN piutang
    // (pola sama baris Selisih Pembayaran PaymentsService.confirm()) --
    // noise ini TIDAK BOLEH ikut mengurangi saldo piutang customerOld.
    const oldDate = isoDaysAgo(bucketDays + 5);
    const fakeInvoiceRows: { id: string }[] = await dataSource.query(
      `SELECT gen_random_uuid() AS id`,
    );
    const fakeInvoiceId = fakeInvoiceRows[0].id;
    const je1 = await insertJournalEntry(oldDate, fakeInvoiceId);
    await insertLine(je1, arDefaultAccountId, customerOldId, 700_000, 0, 1);
    const je1b = await insertJournalEntry(isoDaysAgo(0));
    await insertLine(je1b, nonArAccountId, customerOldId, 0, 300_000, 1);

    // customerCustomAr: debit baru (ageDays=0, bucket index 0) di akun AR
    // CUSTOM (bukan akun default manapun) -- membuktikan filter
    // is_receivable_account, bukan account_id spesifik, yang dipakai.
    const je2 = await insertJournalEntry(isoDaysAgo(0));
    await insertLine(je2, arCustomAccountId, customerCustomArId, 250_000, 0, 1);

    // customerPaidOff: debit tua, lalu kredit PENUH di akun AR yang SAMA --
    // saldo net 0, wajib TIDAK muncul di laporan sama sekali.
    const je3 = await insertJournalEntry(isoDaysAgo(bucketDays + 20));
    await insertLine(je3, arDefaultAccountId, customerPaidOffId, 400_000, 0, 1);
    const je3b = await insertJournalEntry(isoDaysAgo(0));
    await insertLine(
      je3b,
      arDefaultAccountId,
      customerPaidOffId,
      0,
      400_000,
      1,
    );
  });

  afterAll(async () => {
    await dataSource.query(
      `DELETE FROM journal_entry_lines WHERE journal_entry_id = ANY($1)`,
      [journalEntryIds],
    );
    await dataSource.query(`DELETE FROM journal_entries WHERE id = ANY($1)`, [
      journalEntryIds,
    ]);
    await dataSource.query(`DELETE FROM customers WHERE id = ANY($1)`, [
      [customerOldId, customerCustomArId, customerPaidOffId],
    ]);
    await dataSource.query(`DELETE FROM chart_of_accounts WHERE id = ANY($1)`, [
      [arDefaultAccountId, arCustomAccountId, nonArAccountId],
    ]);
    await dataSource.query(`DELETE FROM users WHERE id = $1`, [userId]);
    await dataSource.destroy();
  });

  it('merekonsiliasi total per pelanggan ke GL, menyertakan akun custom, mengabaikan baris non-piutang, dan menyembunyikan saldo nol', async () => {
    const result = await service.getAgingReport();

    const oldRow = result.rows.find((r) => r.partyId === customerOldId);
    expect(oldRow).toBeDefined();
    // Noise kredit di akun bukan-piutang TIDAK mengurangi saldo -- total
    // tetap persis debit aslinya (700.000), bukan 400.000.
    expect(oldRow!.total).toBe(700_000);
    expect(oldRow!.bucket2).toBe(700_000);
    expect(oldRow!.bucket1).toBe(0);
    expect(oldRow!.bucket3).toBe(0);
    expect(oldRow!.bucket4).toBe(0);

    const customArRow = result.rows.find(
      (r) => r.partyId === customerCustomArId,
    );
    expect(customArRow).toBeDefined();
    expect(customArRow!.total).toBe(250_000);
    expect(customArRow!.bucket1).toBe(250_000);

    const paidOffRow = result.rows.find((r) => r.partyId === customerPaidOffId);
    expect(paidOffRow).toBeUndefined();

    const lastRow = result.rows[result.rows.length - 1];
    expect(lastRow.isGrandTotal).toBe(true);
    expect(lastRow.partyName).toBe('GRAND TOTAL');

    const oldDetail = result.detail.find((d) => d.partyId === customerOldId);
    expect(oldDetail).toBeDefined();
    expect(oldDetail!.amount).toBe(700_000);
    expect(oldDetail!.invoiceId).not.toBeNull();
    expect(oldDetail!.sourceLabel).toBe('Faktur');
  });
});
