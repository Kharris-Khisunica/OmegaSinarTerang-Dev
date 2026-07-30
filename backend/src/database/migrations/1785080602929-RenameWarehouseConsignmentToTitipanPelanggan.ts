import { MigrationInterface, QueryRunner } from 'typeorm';

// CLAUDE.md §3: nama `CUSTOMER_CONSIGNMENT` salah dan menyesatkan — klien
// TIDAK menerima konsinyasi dari supplier. "Barang titipan" berarti
// pelanggan sudah membeli & sudah bayar, belum mengambil barang. Mekanisme
// (customer_id wajib, validasi qty kumulatif) sudah benar sejak awal, cuma
// namanya yang diganti. Rename label enum di tempat — OID enum tidak
// berubah, jadi CHECK constraint & baris existing tetap valid tanpa
// disentuh (lihat catatan CreateWarehouses).
export class RenameWarehouseConsignmentToTitipanPelanggan1785080602929 implements MigrationInterface {
  name = 'RenameWarehouseConsignmentToTitipanPelanggan1785080602929';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE warehouse_type RENAME VALUE 'CUSTOMER_CONSIGNMENT' TO 'TITIPAN_PELANGGAN';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE warehouse_type RENAME VALUE 'TITIPAN_PELANGGAN' TO 'CUSTOMER_CONSIGNMENT';
    `);
  }
}
