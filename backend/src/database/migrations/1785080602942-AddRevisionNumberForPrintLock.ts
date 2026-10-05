import { MigrationInterface, QueryRunner } from 'typeorm';

// Kunci cetak generik (Hari 15, CLAUDE.md §2.16, src/core/print-lock/) —
// "Nota hasil revisi wajib mencantumkan nomor revisi". revision_number naik
// setiap kali UNLOCK_PRINT dengan intent EDIT dikonsumsi (PrintLockService.
// consume()); nota cetak membaca kolom ini untuk menampilkan "Revisi N" bila
// > 0. Ditambahkan ke purchase_invoices (wiring penuh hari ini) DAN
// warehouse_mutations (kolom saja, pola sama print_status/print_count/
// printed_at yang sudah ditanam lebih dulu di 1785080602939/1785080602941 —
// GD ikut kunci cetak per CLAUDE.md §2.16 tapi belum ada wiring edit/VOID
// hari ini).
export class AddRevisionNumberForPrintLock1785080602942 implements MigrationInterface {
  name = 'AddRevisionNumberForPrintLock1785080602942';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_invoices
      ADD COLUMN revision_number INTEGER NOT NULL DEFAULT 0;
    `);
    await queryRunner.query(`
      ALTER TABLE warehouse_mutations
      ADD COLUMN revision_number INTEGER NOT NULL DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE warehouse_mutations DROP COLUMN revision_number;
    `);
    await queryRunner.query(`
      ALTER TABLE purchase_invoices DROP COLUMN revision_number;
    `);
  }
}
