import { MigrationInterface, QueryRunner } from 'typeorm';

// need_fixing.md #26 (keputusan 6 Okt 2026, opsi 3a — belum dikonfirmasi
// ulang ke klien, pola sama Payment §2.12): pelunasan kasbon karyawan
// (setor tunai) — sebelumnya belum punya jalur sama sekali. Satu dokumen =
// satu setoran satu pekerja ke Kas Kecil. Jurnal Kas (D) / Piutang Karyawan
// (K). Nomor `PK` lewat DocumentCounterService; tidak ikut kunci cetak §2.16
// maupun Laporan Kontinuitas (pola KK/PB).
export class CreateKasbonRepayments1785080602981 implements MigrationInterface {
  name = 'CreateKasbonRepayments1785080602981';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE kasbon_repayment_posting_status AS ENUM ('POSTED', 'VOIDED');
    `);
    await queryRunner.query(`
      CREATE TABLE kasbon_repayments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_number VARCHAR NOT NULL UNIQUE,
        repayment_date DATE NOT NULL,
        worker_id UUID NOT NULL REFERENCES workers(id),
        cash_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
        amount NUMERIC(16,2) NOT NULL CHECK (amount > 0),
        note TEXT,
        posting_status kasbon_repayment_posting_status NOT NULL DEFAULT 'POSTED',
        void_reason_code VARCHAR,
        void_reason_note TEXT,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_kasbon_repayments_worker ON kasbon_repayments (worker_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE kasbon_repayments;`);
    await queryRunner.query(`DROP TYPE kasbon_repayment_posting_status;`);
  }
}
