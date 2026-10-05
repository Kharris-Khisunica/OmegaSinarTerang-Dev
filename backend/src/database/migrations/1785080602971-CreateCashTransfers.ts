import { MigrationInterface, QueryRunner } from 'typeorm';

// Pindah Buku Kas (paket R9, menyerap Hari 32A tugas 7 yang belum
// dikerjakan — docs/RENCANA_REVISI_TESTING_KLIEN.md §3 "R9"). Pemindahan
// antar akun kas/bank MILIK SENDIRI (mis. Kas Toko -> Kas Besar), BUKAN
// pengeluaran ke pihak luar — karena itu SENGAJA TIDAK lewat
// StepUpService/CASH_OUTFLOW meski salah satu sisinya Kas Besar
// (requires_outflow_approval). Approval-nya setelah-fakta lewat
// review_status, pola sama Biaya Operasional/Pengecekan Invoice Harian
// (CLAUDE.md §3 "Biaya Operasional").
//
// TIDAK ikut kunci cetak §2.16 dan TIDAK masuk Laporan Kontinuitas Nomor
// Dokumen (lihat DOCUMENT_CONTINUITY_TYPES) — pola sama OPERATIONAL_EXPENSE.
// Backdate 7 hari lewat PeriodLockValidatorService.validate() ->
// maxDaysOverride yang SUDAH ADA (PostJournalDto.periodLockMaxDaysOverride),
// bukan mekanisme baru.
export class CreateCashTransfers1785080602971 implements MigrationInterface {
  name = 'CreateCashTransfers1785080602971';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE cash_transfer_posting_status AS ENUM ('POSTED', 'VOIDED');
    `);
    await queryRunner.query(`
      CREATE TYPE cash_transfer_review_status AS ENUM ('BELUM_DICEK', 'DISETUJUI', 'BERMASALAH');
    `);

    await queryRunner.query(`
      CREATE TABLE cash_transfers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_number VARCHAR(50) NOT NULL UNIQUE,
        transfer_date DATE NOT NULL,
        from_cash_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
        to_cash_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
        amount NUMERIC(16,2) NOT NULL,
        note TEXT,
        posting_status cash_transfer_posting_status NOT NULL DEFAULT 'POSTED',
        review_status cash_transfer_review_status NOT NULL DEFAULT 'BELUM_DICEK',
        review_note TEXT,
        reviewed_by UUID,
        reviewed_at TIMESTAMPTZ,
        void_reason_code VARCHAR(100),
        void_reason_note TEXT,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (amount > 0),
        CHECK (from_cash_account_id <> to_cash_account_id)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_cash_transfers_transfer_date ON cash_transfers (transfer_date);
    `);
    await queryRunner.query(`
      CREATE TRIGGER cash_transfers_set_updated_at
      BEFORE UPDATE ON cash_transfers
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS cash_transfers_set_updated_at ON cash_transfers;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_cash_transfers_transfer_date;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS cash_transfers;`);
    await queryRunner.query(`DROP TYPE IF EXISTS cash_transfer_review_status;`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS cash_transfer_posting_status;`,
    );
  }
}
