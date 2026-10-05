import { MigrationInterface, QueryRunner } from 'typeorm';

// Payment / Kas & Bank (Hari 26, CLAUDE.md §2.12 lewat KONTEKS_REVISI_2026-07-28.md
// §2.12 + memory hari26-payment-module-design) — skema DITUTUP 29 Agustus 2026 dari
// screenshot sistem lama (`docs/referensi/penerimaan-kas`/`pengeluaran-kas`), BUKAN
// dari asumsi. Dua keputusan yang mengikat bentuk tabel ini:
//
// 1. `payment_batches` SENGAJA TIDAK punya customer_id/supplier_id di header. Satu
//    batch (satu pergerakan kas/bank) boleh melunasi faktur dari BANYAK pelanggan
//    atau supplier berbeda sekaligus (bukti nyata: batch `PJK-26070025` di sistem
//    lama, 7 baris lintas ~6 pelanggan berbeda, header `Dari:` kosong). Party
//    di-resolve PER BARIS lewat `payments.invoice_id` -> faktur -> customer/supplier,
//    bukan disimpan di header.
// 2. `payment_batches` SENGAJA TIDAK punya agent_id/vehicle_id. Rekap "penjualan per
//    sopir" yang diminta klien adalah laporan penjualan (Hari 30, sumber data faktur,
//    saat ini ⏸ pasca-MVP), bukan urusan skema Payment.
//
// `payment_batch_methods` = multi-metode (sebagian kas, sebagian transfer) — akun
// SELALU dipilih dari chart_of_accounts.is_cash_account (Hari 18), tidak pernah
// hardcode. `payments` = baris per faktur (invoice_type + invoice_id POLIMORFIK,
// pola sama journal_entries.source_type/source_id — TIDAK ada FK lintas dua tabel
// berbeda, divalidasi di service layer).
//
// Kunci-cetak penuh (posting_status, print_status, print_count, printed_at,
// revision_number, void_reason_code, void_reason_note) disiapkan sebagai kontrak
// PRINT_LOCK_TABLES (PAY adalah satu dari 7 dokumen kunci-cetak, CLAUDE.md §2.16) —
// TIDAK ada wiring hari ini, pola sama purchase_returns Hari 16 (kolom disiapkan,
// logic menyusul).
//
// Preview alokasi (Hari 26, POST /payments/preview-allocation) TIDAK menulis ke
// tabel-tabel ini — murni membaca sales_invoices/purchase_invoices + payments yang
// sudah ada. Penulisan baris sungguhan (POST /payments/confirm) menyusul Hari 27.
export class CreatePayments1785080602961 implements MigrationInterface {
  name = 'CreatePayments1785080602961';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE payment_batch_posting_status AS ENUM ('POSTED', 'VOIDED');
    `);
    await queryRunner.query(`
      CREATE TYPE payment_batch_print_status AS ENUM ('NOT_PRINTED', 'PRINTED', 'PRINT_CANCELLED');
    `);
    await queryRunner.query(`
      CREATE TYPE payment_invoice_type AS ENUM ('SALES', 'PURCHASE');
    `);

    await queryRunner.query(`
      CREATE TABLE payment_batches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        batch_number VARCHAR(50) NOT NULL UNIQUE,
        payment_date DATE NOT NULL,
        total_amount NUMERIC(16,2) NOT NULL,
        posting_status payment_batch_posting_status NOT NULL DEFAULT 'POSTED',
        print_status payment_batch_print_status NOT NULL DEFAULT 'NOT_PRINTED',
        print_count INTEGER NOT NULL DEFAULT 0,
        printed_at TIMESTAMPTZ,
        revision_number INTEGER NOT NULL DEFAULT 0,
        void_reason_code VARCHAR(100),
        void_reason_note TEXT,
        notes TEXT,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (total_amount > 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_payment_batches_payment_date ON payment_batches (payment_date);
    `);
    await queryRunner.query(`
      CREATE TRIGGER payment_batches_set_updated_at
      BEFORE UPDATE ON payment_batches
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

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

    await queryRunner.query(`
      CREATE TABLE payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_batch_id UUID NOT NULL REFERENCES payment_batches(id) ON DELETE CASCADE,
        invoice_type payment_invoice_type NOT NULL,
        invoice_id UUID NOT NULL,
        allocated_amount NUMERIC(16,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (allocated_amount > 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_payments_batch ON payments (payment_batch_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_payments_invoice ON payments (invoice_type, invoice_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payments_invoice;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payments_batch;`);
    await queryRunner.query(`DROP TABLE IF EXISTS payments;`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_payment_batch_methods_batch;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS payment_batch_methods;`);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS payment_batches_set_updated_at ON payment_batches;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_payment_batches_payment_date;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS payment_batches;`);

    await queryRunner.query(`DROP TYPE IF EXISTS payment_invoice_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_batch_print_status;`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS payment_batch_posting_status;`,
    );
  }
}
