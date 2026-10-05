import { DataSource } from 'typeorm';
import { OperationalExpenseReportService } from './operational-expense-report.service';

/**
 * Integration test terhadap Postgres asli. Fixture ditulis langsung lewat
 * SQL (bukan lewat OperationalExpensesService.createLine(), yang sudah
 * diuji sendiri di operational-expenses.service.spec.ts) — di sini fokusnya
 * murni query agregasi laporan. Bulan 2024-01 dipilih SENGAJA (jauh dari
 * "hari ini" 2026-09) supaya tidak bercampur dengan data pengembangan nyata
 * di omega_dev yang jatuh di bulan berjalan.
 */
describe('OperationalExpenseReportService', () => {
  let dataSource: DataSource;
  let service: OperationalExpenseReportService;

  let userId: string;
  let cashAccountId: string;
  let expenseAccountAId: string;
  let expenseAccountBId: string;
  let employeeReceivableAccountId: string;
  const documentIds: string[] = [];
  const lineIds: string[] = [];

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
    service = new OperationalExpenseReportService(dataSource);

    const userRows: { id: string }[] = await dataSource.query(
      `SELECT id FROM users LIMIT 1`,
    );
    userId = userRows[0].id;

    const cashRows: { id: string }[] = await dataSource.query(
      `SELECT id FROM chart_of_accounts WHERE is_cash_account = true AND is_active = true LIMIT 1`,
    );
    cashAccountId = cashRows[0].id;

    const expenseRows: { id: string }[] = await dataSource.query(
      `SELECT id FROM chart_of_accounts WHERE account_type = 'EXPENSE' AND is_postable = true AND is_active = true ORDER BY code LIMIT 2`,
    );
    expenseAccountAId = expenseRows[0].id;
    expenseAccountBId = expenseRows[1].id;

    const employeeReceivableRows: { id: string }[] = await dataSource.query(
      `SELECT id FROM chart_of_accounts WHERE is_employee_receivable_account = true LIMIT 1`,
    );
    employeeReceivableAccountId = employeeReceivableRows[0].id;

    const suffix = Date.now();
    const docRows: { id: string }[] = await dataSource.query(
      `INSERT INTO operational_expense_documents (document_number, expense_date, cash_account_id, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [`KK/TEST-${suffix}`, '2024-01-15', cashAccountId, userId],
    );
    const documentId = docRows[0].id;
    documentIds.push(documentId);

    const lineRows: { id: string }[] = await dataSource.query(
      `INSERT INTO operational_expense_lines (document_id, line_order, expense_account_id, amount, created_by)
       VALUES
         ($1, 1, $2, 100000, $4),
         ($1, 2, $3, 50000, $4),
         ($1, 3, $2, 25000, $4),
         ($1, 4, $5, 999999, $4)
       RETURNING id`,
      [
        documentId,
        expenseAccountAId,
        expenseAccountBId,
        userId,
        employeeReceivableAccountId,
      ],
    );
    lineIds.push(...lineRows.map((r) => r.id));

    // Baris VOIDED tidak boleh ikut rekap.
    const voidedRows: { id: string }[] = await dataSource.query(
      `INSERT INTO operational_expense_lines (document_id, line_order, expense_account_id, amount, posting_status, created_by)
       VALUES ($1, 5, $2, 777777, 'VOIDED', $3) RETURNING id`,
      [documentId, expenseAccountAId, userId],
    );
    lineIds.push(...voidedRows.map((r) => r.id));
  });

  afterAll(async () => {
    if (lineIds.length > 0) {
      await dataSource.query(
        `DELETE FROM operational_expense_lines WHERE id = ANY($1)`,
        [lineIds],
      );
    }
    if (documentIds.length > 0) {
      await dataSource.query(
        `DELETE FROM operational_expense_documents WHERE id = ANY($1)`,
        [documentIds],
      );
    }
    await dataSource.destroy();
  });

  it('rekap per akun EXPENSE bulan 2024-01: benar dibanding SUM manual, Kasbon & baris VOIDED tidak ikut', async () => {
    const result = await service.getMonthlyReport('2024-01');

    const dataRows = result.rows.filter((r) => !r.isGrandTotal);
    const rowA = dataRows.find((r) => r.accountId === expenseAccountAId);
    const rowB = dataRows.find((r) => r.accountId === expenseAccountBId);
    const rowKasbon = dataRows.find(
      (r) => r.accountId === employeeReceivableAccountId,
    );

    expect(rowA?.amount).toBe(125000); // 100000 + 25000, VOIDED (777777) tidak ikut
    expect(rowB?.amount).toBe(50000);
    expect(rowKasbon).toBeUndefined(); // Kasbon bukan EXPENSE, tidak ikut rekap

    const grandTotal = result.rows.find((r) => r.isGrandTotal);
    expect(grandTotal?.amount).toBe(175000);
    expect(result.columns.map((c) => c.key)).toEqual(['accountName', 'amount']);
  });

  it('bulan tanpa transaksi -> hanya GRAND TOTAL (0), akun tanpa transaksi tidak ditampilkan', async () => {
    const result = await service.getMonthlyReport('2023-05');
    const dataRows = result.rows.filter((r) => !r.isGrandTotal);
    expect(dataRows).toHaveLength(0);
    const grandTotal = result.rows.find((r) => r.isGrandTotal);
    expect(grandTotal?.amount).toBe(0);
  });
});
