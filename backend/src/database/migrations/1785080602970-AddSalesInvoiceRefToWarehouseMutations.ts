import { MigrationInterface, QueryRunner } from 'typeorm';

// Paket R8 (docs/RENCANA_REVISI_TESTING_KLIEN.md §2A K7, §3 "R8") — mutasi
// titipan sebelumnya memvalidasi kuota titipan per PRODUK lintas semua
// faktur pelanggan (`assertTitipanQtyWithinPurchased()`), yang salah kalau
// pelanggan membeli produk yang sama di dua faktur berbeda: titipan atas
// faktur baru bisa "menghabiskan" kuota dari faktur lama atau sebaliknya.
// K7 mengunci setiap dokumen mutasi titipan ke TEPAT SATU faktur penjualan,
// dan setiap baris titipan ke TEPAT SATU baris faktur — kuota jadi per baris
// faktur, bukan per produk.
//
// Nullable di kedua kolom karena dua cabang mutasi lain (STORE<->BAD_STOCK,
// WarehouseMutationsService.processTransfer()) tidak pernah memakainya;
// service-lah yang mewajibkannya untuk cabang TITIPAN_PELANGGAN
// (WarehouseMutationsService.processTitipan()).
//
// Tidak ada backfill: satu baris titipan lama di DB dev (GD/RM01-26080018,
// fixture manual Hari 29) dihapus manual sebelum migration ini ditulis —
// tidak ada satu pun sales_invoice_lines yang cocok untuknya (bukan data
// klien nyata, tidak ada kandidat faktur untuk dirujuk). Diputuskan user,
// dicatat di PROGRESS.md, bukan otomatis di sini.
export class AddSalesInvoiceRefToWarehouseMutations1785080602970 implements MigrationInterface {
  name = 'AddSalesInvoiceRefToWarehouseMutations1785080602970';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE warehouse_mutations
      ADD COLUMN sales_invoice_id UUID NULL REFERENCES sales_invoices(id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_warehouse_mutations_sales_invoice ON warehouse_mutations (sales_invoice_id);
    `);

    await queryRunner.query(`
      ALTER TABLE warehouse_mutation_lines
      ADD COLUMN sales_invoice_line_id UUID NULL REFERENCES sales_invoice_lines(id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_warehouse_mutation_lines_sales_invoice_line ON warehouse_mutation_lines (sales_invoice_line_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_warehouse_mutation_lines_sales_invoice_line;`,
    );
    await queryRunner.query(
      `ALTER TABLE warehouse_mutation_lines DROP COLUMN sales_invoice_line_id;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_warehouse_mutations_sales_invoice;`,
    );
    await queryRunner.query(
      `ALTER TABLE warehouse_mutations DROP COLUMN sales_invoice_id;`,
    );
  }
}
