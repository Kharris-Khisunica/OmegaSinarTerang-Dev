import { MigrationInterface, QueryRunner } from 'typeorm';

// Koreksi desain (26 Sep 2026): metode pembayaran (kas/bank + nominal) SEHARUSNYA
// per BARIS FAKTUR (`payments`), bukan per BATCH (`payment_batches`) seperti
// `payment_batch_methods` (Hari 26, CreatePayments1785080602961). Operator perlu
// bisa membagi pelunasan SATU faktur ke lebih dari satu akun kas/bank, dan
// sebaliknya satu batch (yang boleh lintas banyak faktur/pihak, lihat komentar
// migration Hari 26) tidak lagi punya satu pool metode bersama — tiap baris
// faktur membawa metodenya sendiri, dicek sendiri (tidak ada lagi cross-check
// "total metode == total baris").
//
// `payment_methods` menggantikan `payment_batch_methods`: FK ke `payments.id`
// (bukan `payment_batches.id`), akun tetap SELALU dari
// `chart_of_accounts.is_cash_account` (tidak berubah, divalidasi di service).
//
// AMAN dijalankan tanpa migrasi data: `payment_batch_methods` tidak menyimpan
// asosiasi ke baris faktur mana pun (itu sendiri sebabnya kolom ini diganti),
// jadi tidak ada cara BENAR memetakan baris lama ke skema baru. Guard di bawah
// menolak migrasi kalau tabel lama sudah terisi, supaya data yang tidak bisa
// dipetakan tidak diam-diam hilang.
export class MovePaymentMethodsToLineLevel1785080602978 implements MigrationInterface {
  name = 'MovePaymentMethodsToLineLevel1785080602978';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(
      `SELECT COUNT(*)::text AS count FROM payment_batch_methods`,
    )) as { count: string }[];
    if (Number(rows[0].count) > 0) {
      throw new Error(
        'payment_batch_methods sudah punya baris — migrasi ini tidak bisa ' +
          'memetakannya ke payment_methods (tidak ada asosiasi ke payments.id ' +
          'di skema lama). Kosongkan/arsipkan data lama secara manual dulu ' +
          'sebelum menjalankan migrasi ini.',
      );
    }

    await queryRunner.query(`
      CREATE TABLE payment_methods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
        cash_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
        amount NUMERIC(16,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (amount > 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_payment_methods_payment ON payment_methods (payment_id);
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_payment_batch_methods_batch;`,
    );
    await queryRunner.query(`DROP TABLE payment_batch_methods;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE payment_batch_methods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_batch_id UUID NOT NULL REFERENCES payment_batches(id) ON DELETE CASCADE,
        cash_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
        amount NUMERIC(16,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (amount > 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_payment_batch_methods_batch ON payment_batch_methods (payment_batch_id);
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_payment_methods_payment;`,
    );
    await queryRunner.query(`DROP TABLE payment_methods;`);
  }
}
