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
}
