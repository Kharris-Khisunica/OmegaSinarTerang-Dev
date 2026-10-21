import { MigrationInterface, QueryRunner } from 'typeorm';

// Revisi akhir klien 17 Okt 2026 (Hari 44): master pelanggan cukup NAMA +
// KOTA. Telepon & alamat rinci (alamat/kecamatan/provinsi) tidak dipakai lagi.
// code (customer_code_seq), is_pkp, dan ar_account_id (akun piutang khusus,
// MASTER saja — CLAUDE.md §3) TETAP.
//
// down() mengembalikan kolomnya (nullable, tipe sama dengan
// CreateCustomers1785080602911 + AddAddressDetailsToCustomers1785080602918)
// — isi lamanya tidak bisa dipulihkan.
export class DropCustomerContactColumns1785080602984 implements MigrationInterface {
  name = 'DropCustomerContactColumns1785080602984';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customers
      DROP COLUMN phone,
      DROP COLUMN address,
      DROP COLUMN district,
      DROP COLUMN province;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customers
      ADD COLUMN phone VARCHAR(30),
      ADD COLUMN address TEXT,
      ADD COLUMN district VARCHAR(120),
      ADD COLUMN province VARCHAR(120);
    `);
  }
}
