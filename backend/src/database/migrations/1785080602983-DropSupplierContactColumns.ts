import { MigrationInterface, QueryRunner } from 'typeorm';

// Revisi akhir klien 17 Okt 2026 (Hari 44): master supplier cukup NAMA saja —
// kontak (telepon/alamat) tidak dipakai lagi, sekaligus masking OPERATOR
// (SupplierMaskingInterceptor) dicabut karena tidak ada lagi yang disensor.
// display_code (dibangkitkan supplier_code_seq) dan is_pkp (gerbang PPN
// masukan, CLAUDE.md §2.11) TETAP.
//
// down() mengembalikan kolomnya (nullable, tipe sama dengan
// CreateSuppliers1785080602912) — isi lamanya tidak bisa dipulihkan.
export class DropSupplierContactColumns1785080602983 implements MigrationInterface {
  name = 'DropSupplierContactColumns1785080602983';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE suppliers
      DROP COLUMN contact_phone,
      DROP COLUMN contact_address;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE suppliers
      ADD COLUMN contact_phone VARCHAR(30),
      ADD COLUMN contact_address TEXT;
    `);
  }
}
