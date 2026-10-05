import { MigrationInterface, QueryRunner } from 'typeorm';

// Payment confirm() (Hari 27, CLAUDE.md §2.18 "Selisih Pembayaran") — payments
// dari Hari 26 hanya punya allocated_amount (jumlah yang MELUNASI Piutang/Hutang
// faktur, bukan selalu sama dengan kas yang benar-benar mengalir). Dua kolom
// baru ini menyimpan APAKAH baris ini menutup faktur sekaligus ("Tandai Lunas"
// dari operator, bukan disimpulkan dari nominal) dan BERAPA selisihnya (signed:
// outstandingBefore - kas yang dibayar) — dibutuhkan VOID (Hari 27) untuk tahu
// baris mana yang harus me-reset payment_discrepancy_flagged pada faktur, dan
// supaya nilainya bisa dilacak lagi tanpa menghitung ulang.
export class AddSettlementFieldsToPayments1785080602963 implements MigrationInterface {
  name = 'AddSettlementFieldsToPayments1785080602963';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payments
        ADD COLUMN settled_in_full BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN discrepancy_amount NUMERIC(16,2) NOT NULL DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payments
        DROP COLUMN discrepancy_amount,
        DROP COLUMN settled_in_full;
    `);
  }
}
