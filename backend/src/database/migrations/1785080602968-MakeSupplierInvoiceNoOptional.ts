import { MigrationInterface, QueryRunner } from 'typeorm';

// Paket R7 (docs/RENCANA_REVISI_TESTING_KLIEN.md §2B, asumsi A3, FB1) —
// klien tidak selalu menerima nota bernomor dari supplier. Kolom
// DIPERTAHANKAN (bukan dihapus) supaya supplier yang memang menerbitkan nota
// tetap bisa dicatat — satu-satunya pegangan rekonsiliasi yang tersisa
// (CLAUDE.md §3 "Pembelian"). Pola down() sama
// 1785080602938-MakeProductKeteranganOptional: backfill string kosong dulu
// sebelum SET NOT NULL, supaya rollback aman walau ada baris NULL.
export class MakeSupplierInvoiceNoOptional1785080602968 implements MigrationInterface {
  name = 'MakeSupplierInvoiceNoOptional1785080602968';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_invoices ALTER COLUMN supplier_invoice_no DROP NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE purchase_invoices SET supplier_invoice_no = '' WHERE supplier_invoice_no IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE purchase_invoices ALTER COLUMN supplier_invoice_no SET NOT NULL;
    `);
  }
}
