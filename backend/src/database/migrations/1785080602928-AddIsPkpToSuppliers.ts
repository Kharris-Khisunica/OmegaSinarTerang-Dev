import { MigrationInterface, QueryRunner } from 'typeorm';

// suppliers.is_pkp (CLAUDE.md §3) — menggerbangi perhitungan PPN masukan
// bersama products.is_bkp (§2.11): PPN masukan dihitung hanya kalau
// supplier.is_pkp DAN product.is_bkp sama-sama true.
export class AddIsPkpToSuppliers1785080602928 implements MigrationInterface {
  name = 'AddIsPkpToSuppliers1785080602928';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE suppliers
        ADD COLUMN is_pkp BOOLEAN NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE suppliers DROP COLUMN IF EXISTS is_pkp;
    `);
  }
}
