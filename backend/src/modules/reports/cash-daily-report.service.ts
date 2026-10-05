import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AccountResolverService } from '../../core/account-resolver/account-resolver.service';
import {
  ExportColumn,
  ExportableResponse,
} from '../../core/export/export.types';

export interface CashDailyRow extends Record<string, unknown> {
  accountId: string | null;
  accountCode: string | null;
  accountName: string;
  openingBalance: number;
  cashIn: number;
  cashOut: number;
  closingBalance: number;
  isGrandTotal?: boolean;
}

interface CashAccountRow {
  id: string;
  code: string;
  name: string;
}

const CASH_DAILY_COLUMNS: ExportColumn[] = [
  { key: 'accountCode', label: 'Kode', width: 14, format: 'text' },
  { key: 'accountName', label: 'Akun Kas/Bank', width: 30, format: 'text' },
  { key: 'openingBalance', label: 'Saldo Awal', width: 18, format: 'currency' },
  { key: 'cashIn', label: 'Masuk', width: 18, format: 'currency' },
  { key: 'cashOut', label: 'Keluar', width: 18, format: 'currency' },
  {
    key: 'closingBalance',
    label: 'Saldo Akhir',
    width: 18,
    format: 'currency',
  },
];

/**
 * Rekap Kas Harian per akun (Hari 31, CLAUDE.md §0) — pengganti cash opname
 * yang dipotong (`docs/PROMPTS_HARIAN.md` Hari 31). Saldo awal/akhir dibaca
 * LANGSUNG dari `journal_entry_lines` (akun manapun ber-`is_cash_account =
 * true`) — BUKAN dari `payment_batches`/`payments`, karena kas juga
 * bergerak lewat jalur lain (Biaya Operasional, retur tunai, dsb — semuanya
 * lewat `JournalPosterService` yang sama, jadi buku besar SELALU sumber
 * kebenaran tunggal untuk "apa saja yang menyentuh akun kas ini").
 *
 * `entry_date` TIDAK PERNAH dibaca balik ke JS di sini (hanya dipakai
 * sebagai kriteria SQL `<`/`=` terhadap parameter string yang dikirim
 * FE) — jadi tidak kena isu Date-object dari `DataSource.query()` yang
 * ditemukan Hari 30 (`aging-bucket.util.ts`); tidak perlu `toIsoDate()`.
 *
 * Saldo awal = SUM(debit-credit) SEMUA baris sebelum tanggal ini (tanpa
 * batas bawah) — volume rendah (11-12 transaksi/hari, CLAUDE.md §1)
 * membuat full-scan per akun ini tidak masalah performanya. DoD "saldo
 * akhir hari N = saldo awal hari N+1" otomatis benar oleh konstruksi:
 * keduanya sama-sama SUM(debit-credit) dengan batas atas hari N (satunya
 * `< N+1`, satunya `<= N` yang notasinya `< N` untuk kueri hari N+1
 * ditambah pergerakan hari N -- lihat test).
 */
@Injectable()
export class CashDailyReportService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly accountResolverService: AccountResolverService,
  ) {}

  async getDailyCashReport(
    date: string,
    accountId?: string,
  ): Promise<ExportableResponse<CashDailyRow>> {
    const accounts = await this.loadCashAccounts(accountId);
    if (accounts.length === 0) {
      return {
        rows: [],
        columns: CASH_DAILY_COLUMNS,
        meta: { title: 'Rekap Kas Harian', subtitle: `Tanggal ${date}` },
      };
    }
    const accountIds = accounts.map((a) => a.id);

    const openingRows: { account_id: string; balance: string | null }[] =
      await this.dataSource.query(
        `SELECT jel.account_id, SUM(jel.debit_amount - jel.credit_amount) AS balance
           FROM journal_entry_lines jel
           JOIN journal_entries je ON je.id = jel.journal_entry_id
          WHERE jel.account_id = ANY($1) AND je.entry_date < $2
          GROUP BY jel.account_id`,
        [accountIds, date],
      );
    const openingByAccount = new Map(
      openingRows.map((r) => [r.account_id, Number(r.balance ?? 0)]),
    );

    const movementRows: {
      account_id: string;
      debit_total: string | null;
      credit_total: string | null;
    }[] = await this.dataSource.query(
      `SELECT jel.account_id, SUM(jel.debit_amount) AS debit_total, SUM(jel.credit_amount) AS credit_total
         FROM journal_entry_lines jel
         JOIN journal_entries je ON je.id = jel.journal_entry_id
        WHERE jel.account_id = ANY($1) AND je.entry_date = $2
        GROUP BY jel.account_id`,
      [accountIds, date],
    );
    const movementByAccount = new Map(
      movementRows.map((r) => [
        r.account_id,
        {
          debitTotal: Number(r.debit_total ?? 0),
          creditTotal: Number(r.credit_total ?? 0),
        },
      ]),
    );

    const rows: CashDailyRow[] = accounts
      .map((acc) => {
        const openingBalance = openingByAccount.get(acc.id) ?? 0;
        const movement = movementByAccount.get(acc.id) ?? {
          debitTotal: 0,
          creditTotal: 0,
        };
        return {
          accountId: acc.id,
          accountCode: acc.code,
          accountName: acc.name,
          openingBalance,
          cashIn: movement.debitTotal,
          cashOut: movement.creditTotal,
          closingBalance:
            openingBalance + movement.debitTotal - movement.creditTotal,
        };
      })
      .sort((a, b) => (a.accountCode ?? '').localeCompare(b.accountCode ?? ''));

    const grandTotal: CashDailyRow = {
      accountId: null,
      accountCode: null,
      accountName: 'GRAND TOTAL',
      openingBalance: sumBy(rows, 'openingBalance'),
      cashIn: sumBy(rows, 'cashIn'),
      cashOut: sumBy(rows, 'cashOut'),
      closingBalance: sumBy(rows, 'closingBalance'),
      isGrandTotal: true,
    };

    return {
      rows: [...rows, grandTotal],
      columns: CASH_DAILY_COLUMNS,
      meta: { title: 'Rekap Kas Harian', subtitle: `Tanggal ${date}` },
    };
  }

  /**
   * `accountId` diisi -> divalidasi WAJIB akun kas aktif lewat
   * `AccountResolverService.assertAccountHasFlag()` (pola sama
   * Retur Pembelian/Payment untuk `cashAccountId`), bukan pengecekan
   * ad-hoc baru. Kosong -> semua akun kas aktif.
   */
  private async loadCashAccounts(
    accountId?: string,
  ): Promise<CashAccountRow[]> {
    if (accountId) {
      await this.accountResolverService.assertAccountHasFlag(
        accountId,
        'is_cash_account',
        'Kas/Bank',
      );
      return this.dataSource.query(
        `SELECT id, code, name FROM chart_of_accounts WHERE id = $1`,
        [accountId],
      );
    }
    return this.dataSource.query(
      `SELECT id, code, name FROM chart_of_accounts
        WHERE is_cash_account = true AND is_active = true
        ORDER BY code`,
    );
  }
}

function sumBy(rows: CashDailyRow[], key: keyof CashDailyRow): number {
  return rows.reduce((sum, r) => sum + (r[key] as number), 0);
}
