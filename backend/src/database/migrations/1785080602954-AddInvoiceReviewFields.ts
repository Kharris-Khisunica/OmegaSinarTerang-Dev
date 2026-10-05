import { MigrationInterface, QueryRunner } from 'typeorm';

// Pengecekan Invoice Harian (Hari 22A, CLAUDE.md §5). review_status sudah ada
// sejak migration CreatePurchaseInvoices/CreateSalesInvoices (sengaja ditanam
// lebih dulu supaya GET .../?reviewStatus= tidak reshape API hari ini) — yang
// ditambah sekarang cuma kolom pendukungnya: siapa & kapan menandai, catatan
// bebas (dibaca operator untuk memperbaiki BERMASALAH), dan penanda selisih
// pembayaran > Rp 10.000 (CLAUDE.md §2.18) yang baru diisi Payment module Hari
// 26-27 — kolom disiapkan sekarang, TANPA logic yang mengisinya hari ini.
export class AddInvoiceReviewFields1785080602954 implements MigrationInterface {
  name = 'AddInvoiceReviewFields1785080602954';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sales_invoices
      ADD COLUMN review_note TEXT,
      ADD COLUMN reviewed_by UUID REFERENCES users(id),
      ADD COLUMN reviewed_at TIMESTAMPTZ,
      ADD COLUMN payment_discrepancy_flagged BOOLEAN NOT NULL DEFAULT false;
    `);
    await queryRunner.query(`
      ALTER TABLE purchase_invoices
      ADD COLUMN review_note TEXT,
      ADD COLUMN reviewed_by UUID REFERENCES users(id),
      ADD COLUMN reviewed_at TIMESTAMPTZ,
      ADD COLUMN payment_discrepancy_flagged BOOLEAN NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_invoices
      DROP COLUMN payment_discrepancy_flagged,
      DROP COLUMN reviewed_at,
      DROP COLUMN reviewed_by,
      DROP COLUMN review_note;
    `);
    await queryRunner.query(`
      ALTER TABLE sales_invoices
      DROP COLUMN payment_discrepancy_flagged,
      DROP COLUMN reviewed_at,
      DROP COLUMN reviewed_by,
      DROP COLUMN review_note;
    `);
  }
}
