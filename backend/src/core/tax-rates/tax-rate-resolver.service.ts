import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

/**
 * Tarif PPN dari tabel `tax_rates` (`effective_from`/`effective_to`) —
 * CLAUDE.md §2.11/§4: BUKAN dari master produk, BUKAN dari config. Dipakai
 * Faktur Pembelian (Hari 14, PPN masukan) dan nanti Faktur Penjualan
 * (Hari 21, PPN keluaran) — satu fungsi bersama supaya lookup tanggal-efektif
 * tidak diduplikasi dua kali.
 *
 * Tidak pernah diam-diam jatuh ke 0 kalau tidak ada tarif aktif — itu akan
 * membuat kewajiban PPN masukan berhenti terhitung tanpa error apa pun
 * (persis pola bahaya yang CLAUDE.md ingatkan untuk lot bonus/akun default).
 * Errornya jelas: "atur dulu di tax_rates sebelum lanjut."
 */
@Injectable()
export class TaxRateResolverService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getEffectiveRate(date: Date, manager?: EntityManager): Promise<number> {
    const runner = manager ?? this.dataSource.manager;
    const dateOnly = toDateOnlyString(date);
    const rows: { rate: string }[] = await runner.query(
      `SELECT rate FROM tax_rates
       WHERE effective_from <= $1 AND (effective_to IS NULL OR effective_to >= $1)
       ORDER BY effective_from DESC
       LIMIT 1`,
      [dateOnly],
    );
    if (!rows[0]) {
      throw new BadRequestException(
        `Tarif PPN belum diset di tax_rates untuk tanggal ${dateOnly} — atur dulu sebelum memproses dokumen ini.`,
      );
    }
    return Number(rows[0].rate);
  }
}

function toDateOnlyString(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
