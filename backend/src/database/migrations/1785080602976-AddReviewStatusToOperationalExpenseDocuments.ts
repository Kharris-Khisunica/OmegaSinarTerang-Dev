import { MigrationInterface, QueryRunner } from 'typeorm';

// Hari 32A tugas 5 — Pengecekan Invoice Harian untuk Biaya Operasional.
// Pola PERSIS SalesInvoiceReviewStatus/CashTransferReviewStatus: enum BELUM_
// DICEK/DISETUJUI/BERMASALAH + review_note/reviewed_by/reviewed_at. Beda dari
// sales_invoices (yang review_status-nya sudah ditanam sejak CREATE table,
// lihat AddInvoiceReviewFields 1785080602954) — operational_expense_documents
// belum punya kolom ini sama sekali, jadi migration ini menambah enum
// SEKALIGUS kolomnya, pola sama CreateCashTransfers (1785080602971).
//
// review_status di sini bergerak DUA ARAH beda dari cash_transfers/sales
// invoices: sesudah DISETUJUI, koreksi baris WAJIB VOID (bukan lagi PATCH
// lines/:lineId) — CLAUDE.md §3 "Biaya Operasional", pengecualian eksplisit
// terhadap kebiasaan modul lain.
export class AddReviewStatusToOperationalExpenseDocuments1785080602976 implements MigrationInterface {
  name = 'AddReviewStatusToOperationalExpenseDocuments1785080602976';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE operational_expense_document_review_status AS ENUM ('BELUM_DICEK', 'DISETUJUI', 'BERMASALAH');
    `);
    await queryRunner.query(`
      ALTER TABLE operational_expense_documents
      ADD COLUMN review_status operational_expense_document_review_status NOT NULL DEFAULT 'BELUM_DICEK',
      ADD COLUMN review_note TEXT,
      ADD COLUMN reviewed_by UUID REFERENCES users(id),
      ADD COLUMN reviewed_at TIMESTAMPTZ;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE operational_expense_documents
      DROP COLUMN reviewed_at,
      DROP COLUMN reviewed_by,
      DROP COLUMN review_note,
      DROP COLUMN review_status;
    `);
    await queryRunner.query(
      `DROP TYPE IF EXISTS operational_expense_document_review_status;`,
    );
  }
}
