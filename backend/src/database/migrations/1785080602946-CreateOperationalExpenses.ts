import { MigrationInterface, QueryRunner } from 'typeorm';

// Biaya Operasional (Hari 17, CLAUDE.md §3 "Pembelian" ongkir + jawaban klien
// docs/PERTANYAAN_KLIEN_BIAYA_OPERASIONAL.md §1) — bentuk HEADER + BARIS, satu
// bukti (`KK/RM01-YYMMXXXX`) per HARI KALENDER (expense_date UNIQUE), baris
// ditambahkan ke bukti yang sama sepanjang hari lewat request terpisah-pisah
// ("ditambahkan ke bukti yang sama" — jawaban klien §1.2). TIDAK ada
// total_amount didenormalisasi di header — dihitung SUM(amount) baris POSTED
// saat baca, volume ±180 baris/bulan membuat agregasi live lebih murah
// daripada menjaga running-total benar lintas banyak request terpisah.
//
// VOID beroperasi per BARIS (sourceId = operational_expense_lines.id), BUKAN
// per header — kontrak VoidEngineService satu sourceId <-> satu JournalEntry.
// Kalau dipetakan ke header, membatalkan satu baris salah ketik berarti
// membalik seluruh bukti hari itu (persis konsekuensi yang dihindari jawaban
// klien §1 "Kenapa ini menentukan kode").
//
// Risiko konkurensi disengaja tidak ditangani (dicatat, bukan diam-diam):
// find-or-create header (SELECT...FOR UPDATE lalu INSERT kalau belum ada)
// secara teoritis bisa bentrok UNIQUE(expense_date) kalau dua request untuk
// tanggal baru yang sama nyaris bersamaan — diterima untuk volume ±1-8
// baris/hari satu toko/satu PC, sama seperti risiko yang diakui komentar
// DocumentCounterService sendiri.
export class CreateOperationalExpenses1785080602946 implements MigrationInterface {
  name = 'CreateOperationalExpenses1785080602946';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE operational_expense_line_posting_status AS ENUM ('POSTED', 'VOIDED');
    `);

    await queryRunner.query(`
      CREATE TABLE operational_expense_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_number VARCHAR(50) NOT NULL UNIQUE,
        expense_date DATE NOT NULL UNIQUE,
        cash_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE TRIGGER operational_expense_documents_set_updated_at
      BEFORE UPDATE ON operational_expense_documents
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      CREATE TABLE operational_expense_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES operational_expense_documents(id),
        line_order INTEGER NOT NULL,
        expense_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
        amount NUMERIC(16,2) NOT NULL,
        description TEXT,
        reference_number VARCHAR(60),
        posting_status operational_expense_line_posting_status NOT NULL DEFAULT 'POSTED',
        void_reason_code VARCHAR(100),
        void_reason_note TEXT,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (amount > 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_operational_expense_lines_document ON operational_expense_lines (document_id);
    `);
    await queryRunner.query(`
      CREATE TRIGGER operational_expense_lines_set_updated_at
      BEFORE UPDATE ON operational_expense_lines
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS operational_expense_lines_set_updated_at ON operational_expense_lines;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_operational_expense_lines_document;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS operational_expense_lines;`);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS operational_expense_documents_set_updated_at ON operational_expense_documents;`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS operational_expense_documents;`,
    );

    await queryRunner.query(
      `DROP TYPE IF EXISTS operational_expense_line_posting_status;`,
    );
  }
}
