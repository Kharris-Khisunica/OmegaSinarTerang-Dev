import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ExportColumn,
  ExportableResponse,
} from '../../core/export/export.types';

export interface OperationalExpenseReportRow extends Record<string, unknown> {
  accountId: string | null;
  accountCode: string | null;
  accountName: string;
  amount: number;
  isGrandTotal?: boolean;
}

interface OperationalExpenseReportRowSql {
  account_id: string;
  account_code: string;
  account_name: string;
  amount: string;
}

/**
 * Laporan Biaya Operasional (Hari 32A tugas 10, CLAUDE.md §3 "Biaya
 * Operasional") — rekap per akun EXPENSE, bulan berjalan. Kasbon (akun
 * `is_employee_receivable_account`, ASSET bukan EXPENSE) TIDAK ikut —
 * itu bukan biaya, dilihat dari buku besar akunnya sendiri (Piutang
 * Karyawan). Akun tanpa transaksi bulan itu TIDAK ditampilkan (beda dari
 * laporan lain yang menampilkan 0 — rekap sesederhana ini tidak berguna
 * dengan baris kosong).
 */
@Injectable()
export class OperationalExpenseReportService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getMonthlyReport(
    month: string,
  ): Promise<ExportableResponse<OperationalExpenseReportRow>> {
    const [year, monthNum] = month.split('-').map(Number);
    const rangeStart = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const rangeEndExclusive = new Date(Date.UTC(year, monthNum, 1))
      .toISOString()
      .slice(0, 10);

    const rows: OperationalExpenseReportRowSql[] = await this.dataSource.query(
      `SELECT coa.id AS account_id, coa.code AS account_code, coa.name AS account_name,
              SUM(l.amount) AS amount
       FROM operational_expense_lines l
       JOIN operational_expense_documents d ON d.id = l.document_id
       JOIN chart_of_accounts coa ON coa.id = l.expense_account_id
       WHERE l.posting_status = 'POSTED'
         AND coa.account_type = 'EXPENSE'
         AND d.expense_date >= $1
         AND d.expense_date < $2
       GROUP BY coa.id, coa.code, coa.name
       ORDER BY coa.code ASC`,
      [rangeStart, rangeEndExclusive],
    );

    const dataRows: OperationalExpenseReportRow[] = rows.map((row) => ({
      accountId: row.account_id,
      accountCode: row.account_code,
      accountName: row.account_name,
      amount: Number(row.amount),
    }));

    const grandTotal: OperationalExpenseReportRow = {
      accountId: null,
      accountCode: null,
      accountName: 'GRAND TOTAL',
      amount: dataRows.reduce((sum, row) => sum + row.amount, 0),
      isGrandTotal: true,
    };

    return {
      rows: [...dataRows, grandTotal],
      columns: buildColumns(),
      meta: {
        title: 'Laporan Biaya Operasional',
        subtitle: `Bulan ${month}`,
      },
    };
  }
}

function buildColumns(): ExportColumn[] {
  return [
    { key: 'accountName', label: 'Nama Biaya', width: 36, format: 'text' },
    { key: 'amount', label: 'Jumlah', width: 18, format: 'currency' },
  ];
}
