import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

export interface ArAccountCustomer {
  arAccountId: string | null;
}

/**
 * Satu fungsi bersama untuk akun piutang efektif seorang pelanggan
 * (CLAUDE.md §3): `customer.ar_account_id ?? settings.default_ar_account_id`.
 *
 * WAJIB dipanggil dari lima tempat nanti — Faktur Penjualan (Hari 21),
 * alokasi Pembayaran (Hari 26-27), Retur Penjualan (Hari 23), pembalikan
 * VOID, dan Saldo Awal piutang (Hari 12). Satu tempat saja yang menuliskan
 * `settings.default_ar_account_id` secara langsung (tanpa lewat sini) →
 * saldo pelanggan bocor tanpa error apa pun. Jangan duplikasi logika ini.
 */
@Injectable()
export class ArAccountResolverService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async resolve(
    customer: ArAccountCustomer,
    manager?: EntityManager,
  ): Promise<string> {
    if (customer.arAccountId) {
      return customer.arAccountId;
    }

    const runner = manager ?? this.dataSource.manager;
    const rows: { value: string }[] = await runner.query(
      `SELECT value FROM settings WHERE key = 'default_ar_account_id'`,
    );
    const defaultAccountId = rows[0]?.value;
    if (!defaultAccountId) {
      throw new BadRequestException(
        'settings.default_ar_account_id belum diisi — tidak bisa menentukan akun piutang.',
      );
    }
    return defaultAccountId;
  }

  /**
   * Pasangan `resolve()`: baca balik saldo piutang seorang pelanggan dari
   * baris jurnal yang di-tag `customer_id` (invarian Hari 18, lihat
   * `journal_entry_lines.customer_id` + `PostJournalLineDto.customerId`).
   * Sengaja TIDAK difilter per `account_id` — pemindahan `ar_account_id`
   * pelanggan di tengah jalan tidak boleh membelah histori jadi dua "akun"
   * berbeda, yang justru bikin saldo pelanggan itu sendiri tidak pernah bisa
   * dijumlah utuh lagi.
   *
   * WAJIB dipakai CustomersService sebelum mengizinkan perubahan
   * `ar_account_id` (CLAUDE.md §3: "Dikunci selama saldo pelanggan belum nol").
   */
  async getCustomerBalance(
    customerId: string,
    manager?: EntityManager,
  ): Promise<number> {
    const runner = manager ?? this.dataSource.manager;
    const rows: { balance: string | null }[] = await runner.query(
      `SELECT SUM(debit_amount - credit_amount) AS balance
       FROM journal_entry_lines
       WHERE customer_id = $1`,
      [customerId],
    );
    return Number(rows[0]?.balance ?? 0);
  }
}
