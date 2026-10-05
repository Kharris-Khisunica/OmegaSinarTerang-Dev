import { MigrationInterface, QueryRunner } from 'typeorm';

// Hotfix: "keterangan" pada produk tidak wajib diisi — beberapa produk cukup
// diwakili Merek + Kemasan + Ukuran tanpa keterangan tambahan.
export class MakeProductKeteranganOptional1785080602938 implements MigrationInterface {
  name = 'MakeProductKeteranganOptional1785080602938';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products ALTER COLUMN keterangan DROP NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE products SET keterangan = '' WHERE keterangan IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE products ALTER COLUMN keterangan SET NOT NULL;
    `);
  }
}
