import { MigrationInterface, QueryRunner } from 'typeorm';

// Hari 18 — kunci customers.ar_account_id (CLAUDE.md §3) butuh tahu "saldo
// pelanggan", tapi tidak ada satu pun tabel yang menyimpannya per pelanggan:
// sales_invoices/payments/sales_returns belum dibangun (Hari 21-27), dan
// baris piutang Saldo Awal (Hari 12) melebur jadi satu baris jurnal per akun
// — jejak per-pelanggannya hilang setelah posting. Keputusan user (Hari 18):
// tag customer_id langsung di journal_entry_lines.
//
// INVARIAN BARU, berdampingan dengan resolveArAccount() (ArAccountResolverService,
// Hari 8): setiap baris jurnal yang menyentuh akun piutang seorang pelanggan
// WAJIB mengisi kolom ini. Hari ini baru OpeningBalanceService (piutang) dan
// VoidEngineService (reversal) yang mengisi/meneruskannya. WAJIB diisi juga
// oleh: Faktur Penjualan (Hari 21), Retur Penjualan (Hari 23), alokasi
// Pembayaran (Hari 26-27) begitu modul itu dibangun — satu tempat saja lupa
// mengisi -> ArAccountResolverService.getCustomerBalance() salah hitung
// tanpa error apa pun, persis pola kebocoran yang sudah diperingatkan
// CLAUDE.md §3 untuk resolveArAccount().
//
// Nullable & tanpa relation object di entity (bare FK column) — baris jurnal
// non-piutang (mayoritas) tidak mengisinya sama sekali.
export class AddCustomerIdToJournalEntryLines1785080602950 implements MigrationInterface {
  name = 'AddCustomerIdToJournalEntryLines1785080602950';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE journal_entry_lines
      ADD COLUMN customer_id UUID REFERENCES customers(id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_journal_entry_lines_customer_id
      ON journal_entry_lines(customer_id)
      WHERE customer_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_journal_entry_lines_customer_id;`,
    );
    await queryRunner.query(`
      ALTER TABLE journal_entry_lines
      DROP COLUMN customer_id;
    `);
  }
}
