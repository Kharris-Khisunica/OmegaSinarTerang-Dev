import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

/**
 * Satu fungsi bersama untuk "cari akun aktif tunggal yang ditandai flag X"
 * di `chart_of_accounts` — dipakai tiap kali sebuah modul perlu resolve akun
 * tujuan tanpa hardcode kode akun (CLAUDE.md §6). Diekstrak dari
 * `OpeningBalanceService.resolveSingleAccount()` (Hari 12) supaya tidak ada
 * copy kedua dari query yang sama saat Faktur Pembelian (Hari 14) butuh
 * `is_inventory_account`/`is_payable_account` juga — perilaku TIDAK berubah,
 * murni relokasi.
 */
@Injectable()
export class AccountResolverService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async resolveSingleActive(
    whereSql: string,
    label: string,
    manager?: EntityManager,
  ): Promise<string> {
    const runner = manager ?? this.dataSource.manager;
    const rows: { id: string }[] = await runner.query(
      `SELECT id FROM chart_of_accounts WHERE ${whereSql} AND is_active = true`,
    );
    if (rows.length !== 1) {
      throw new BadRequestException(
        `Akun ${label} harus tepat satu dan aktif di chart_of_accounts (ditemukan ${rows.length}) — periksa COA sebelum melanjutkan.`,
      );
    }
    return rows[0].id;
  }

  /**
   * Melengkapi resolveSingleActive() — dipakai saat akun tujuan DIPILIH
   * pemanggil (bukan diresolve otomatis), karena flag-nya bisa dimiliki
   * lebih dari satu akun aktif sekaligus (mis. is_cash_account: bisa ada
   * "Kas Besar" DAN "Bank BCA"). Validasi id yang sudah dipilih itu memang
   * berflag X dan aktif — dipakai pertama kali Retur Pembelian (Hari 16,
   * cashAccountId saat settlementType=CASH), akan dipakai ulang modul
   * Payment (Hari 26-27) untuk kebutuhan sama. `flagColumn` SELALU literal
   * hardcode dari kode pemanggil (pola sama `whereSql` di atas), tidak
   * pernah dari input user.
   */
  async assertAccountHasFlag(
    accountId: string,
    flagColumn: string,
    label: string,
    manager?: EntityManager,
  ): Promise<void> {
    const runner = manager ?? this.dataSource.manager;
    const rows: { id: string }[] = await runner.query(
      `SELECT id FROM chart_of_accounts WHERE id = $1 AND ${flagColumn} = true AND is_active = true`,
      [accountId],
    );
    if (rows.length === 0) {
      throw new BadRequestException(
        `Akun yang dipilih bukan akun ${label} yang aktif — periksa COA.`,
      );
    }
  }
}
