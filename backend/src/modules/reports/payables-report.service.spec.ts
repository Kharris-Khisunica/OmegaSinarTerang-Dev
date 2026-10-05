import { DataSource } from 'typeorm';
import { AccountResolverService } from '../../core/account-resolver/account-resolver.service';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { JournalPosterService } from '../../core/journal-poster/journal-poster.service';
import { PeriodLockValidatorService } from '../../core/period-lock/period-lock-validator.service';
import { ArAccountResolverService } from '../../core/receivables/ar-account-resolver.service';
import { StepUpService } from '../../core/step-up/step-up.service';
import { VoidEngineService } from '../../core/void/void.service';
import { PrintLockService } from '../../core/print-lock/print-lock.service';
import { PaymentsService } from '../payments/payments.service';
import { Setting } from '../settings/entities/setting.entity';
import { SettingsService } from '../settings/settings.service';
import { PayablesReportService } from './payables-report.service';

/**
 * Integration test terhadap Postgres asli. `PaymentsService` dikonstruksi
 * manual (pola sama payments.service.spec.ts) tapi HANYA method
 * `getOutstandingInvoicesForReport()` yang dipakai di sini -- dependency yang
 * tidak tersentuh method itu (step-up/void/print-lock) di-stub `as unknown`
 * supaya setup tetap ringan, bukan menarik seluruh grafik dependency
 * VoidEngineService->StockRecorderService->ProductsService yang tidak relevan.
 */
describe('PayablesReportService', () => {
  let dataSource: DataSource;
  let service: PayablesReportService;
  let bucketDays: number;

  let userId: string;
  let supplierOldId: string;
  let supplierNotYetDueId: string;
  let supplierPaidOffId: string;
  const purchaseInvoiceIds: string[] = [];
  const paymentBatchIds: string[] = [];

  function isoDaysAgo(days: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  }
  function isoDaysAhead(days: number): string {
    return isoDaysAgo(-days);
  }

  async function insertSupplier(name: string, stamp: number): Promise<string> {
    const rows: { id: string }[] = await dataSource.query(
      `INSERT INTO suppliers (display_code, name) VALUES ($1, $2) RETURNING id`,
      [`PYB${stamp}${Math.random().toString(36).slice(2, 6)}`, name],
    );
    return rows[0].id;
  }

  async function insertPurchaseInvoice(
    supplierId: string,
    dueDate: string,
    amount: number,
    stamp: number,
  ): Promise<string> {
    const rows: { id: string }[] = await dataSource.query(
      `INSERT INTO purchase_invoices
         (invoice_number, supplier_id, supplier_invoice_no, receipt_date, supplier_invoice_date, due_date, subtotal, total_amount, created_by)
       VALUES ($1, $2, 'SUP-INV-TEST', $3, $3, $4, $5, $5, $6)
       RETURNING id`,
      [
        `B1-TEST-${stamp}-${Math.random().toString(36).slice(2, 8)}`,
        supplierId,
        dueDate,
        dueDate,
        amount,
        userId,
      ],
    );
    purchaseInvoiceIds.push(rows[0].id);
    return rows[0].id;
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

    const accountResolverService = new AccountResolverService(dataSource);
    const documentCounterService = new DocumentCounterService();
    const periodLockValidatorService = new PeriodLockValidatorService();
    const journalPosterService = new JournalPosterService(
      documentCounterService,
      periodLockValidatorService,
    );
    const arAccountResolverService = new ArAccountResolverService(dataSource);
    const paymentsService = new PaymentsService(
      dataSource,
      accountResolverService,
      documentCounterService,
      journalPosterService,
      arAccountResolverService,
      {} as unknown as StepUpService,
      {} as unknown as VoidEngineService,
      {} as unknown as PrintLockService,
    );
    const settingsService = new SettingsService(
      dataSource.getRepository(Setting),
    );
    service = new PayablesReportService(
      dataSource,
      settingsService,
      paymentsService,
    );

    const settings = await settingsService.findAll();
    bucketDays = Number(
      settings.find((s) => s.key === 'aging_bucket_days')?.value ?? 30,
    );

    const stamp = Date.now();
    const userRows: { id: string }[] = await dataSource.query(
      `INSERT INTO users (username, password_hash, full_name, role)
       VALUES ($1, 'x', 'Test Hari 30 Hutang', 'MASTER') RETURNING id`,
      [`test_payables_report_${stamp}`],
    );
    userId = userRows[0].id;

    supplierOldId = await insertSupplier(
      'Supplier Lewat Jatuh Tempo Uji',
      stamp,
    );
    supplierNotYetDueId = await insertSupplier(
      'Supplier Belum Jatuh Tempo Uji',
      stamp,
    );
    supplierPaidOffId = await insertSupplier('Supplier Lunas Uji', stamp);

    // supplierOld: jatuh tempo (bucketDays+5) hari lalu -> bucket index 1
    await insertPurchaseInvoice(
      supplierOldId,
      isoDaysAgo(bucketDays + 5),
      500_000,
      stamp,
    );

    // supplierNotYetDue: jatuh tempo 10 hari LAGI (belum lewat) -> bucket index 0
    await insertPurchaseInvoice(
      supplierNotYetDueId,
      isoDaysAhead(10),
      300_000,
      stamp,
    );

    // supplierPaidOff: faktur lunas penuh lewat payments -- wajib TIDAK muncul
    const paidInvoiceId = await insertPurchaseInvoice(
      supplierPaidOffId,
      isoDaysAgo(bucketDays + 20),
      400_000,
      stamp,
    );
    const batchRows: { id: string }[] = await dataSource.query(
      `INSERT INTO payment_batches (batch_number, payment_date, total_amount, created_by)
       VALUES ($1, $2, 400000, $3) RETURNING id`,
      [`PAY-TEST-${stamp}`, isoDaysAgo(0), userId],
    );
    const batchId = batchRows[0].id;
    paymentBatchIds.push(batchId);
    await dataSource.query(
      `INSERT INTO payments (payment_batch_id, invoice_type, invoice_id, allocated_amount)
       VALUES ($1, 'PURCHASE', $2, 400000)`,
      [batchId, paidInvoiceId],
    );
  });

  afterAll(async () => {
    await dataSource.query(
      `DELETE FROM payments WHERE payment_batch_id = ANY($1)`,
      [paymentBatchIds],
    );
    await dataSource.query(`DELETE FROM payment_batches WHERE id = ANY($1)`, [
      paymentBatchIds,
    ]);
    await dataSource.query(`DELETE FROM purchase_invoices WHERE id = ANY($1)`, [
      purchaseInvoiceIds,
    ]);
    await dataSource.query(`DELETE FROM suppliers WHERE id = ANY($1)`, [
      [supplierOldId, supplierNotYetDueId, supplierPaidOffId],
    ]);
    await dataSource.query(`DELETE FROM users WHERE id = $1`, [userId]);
    await dataSource.destroy();
  });

  it('mengambil umur dari due_date (bukan receipt_date), lewat logika outstanding yang sama dengan layar Pembayaran, dan menyembunyikan faktur lunas', async () => {
    const result = await service.getAgingReport();

    const oldRow = result.rows.find((r) => r.partyId === supplierOldId);
    expect(oldRow).toBeDefined();
    expect(oldRow!.total).toBe(500_000);
    expect(oldRow!.bucket2).toBe(500_000);
    expect(oldRow!.bucket1).toBe(0);

    const notYetDueRow = result.rows.find(
      (r) => r.partyId === supplierNotYetDueId,
    );
    expect(notYetDueRow).toBeDefined();
    expect(notYetDueRow!.total).toBe(300_000);
    // Belum jatuh tempo (due_date di masa depan) tetap masuk bucket 0, bukan
    // dikeluarkan dari laporan.
    expect(notYetDueRow!.bucket1).toBe(300_000);

    const paidOffRow = result.rows.find((r) => r.partyId === supplierPaidOffId);
    expect(paidOffRow).toBeUndefined();

    const lastRow = result.rows[result.rows.length - 1];
    expect(lastRow.isGrandTotal).toBe(true);

    const oldDetail = result.detail.find((d) => d.partyId === supplierOldId);
    expect(oldDetail).toBeDefined();
    expect(oldDetail!.amount).toBe(500_000);
    expect(typeof oldDetail!.invoiceNumber).toBe('string');
  });
});
