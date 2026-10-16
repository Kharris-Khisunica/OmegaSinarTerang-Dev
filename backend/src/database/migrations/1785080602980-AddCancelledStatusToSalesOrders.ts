import { MigrationInterface, QueryRunner } from 'typeorm';

// need_fixing.md #20 (6 Okt 2026): SO yang tidak jadi sebelumnya tidak punya
// jalan keluar — tetap OPEN selamanya dan ikut terhitung di "qty terikat SO
// terbuka". Ditambah status CANCELLED + alasan + siapa/kapan. BUKAN VOID:
// SO tidak mengikat uang/stok (CLAUDE.md §2.16/§3), tidak ada jurnal yang
// perlu dibalik dan SO tetap di luar Laporan Kontinuitas Nomor.
export class AddCancelledStatusToSalesOrders1785080602980 implements MigrationInterface {
  name = 'AddCancelledStatusToSalesOrders1785080602980';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE sales_order_status ADD VALUE IF NOT EXISTS 'CANCELLED';`,
    );
    await queryRunner.query(`
      ALTER TABLE sales_orders
        ADD COLUMN cancelled_at TIMESTAMPTZ,
        ADD COLUMN cancelled_by UUID REFERENCES users(id),
        ADD COLUMN cancel_reason TEXT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sales_orders
        DROP COLUMN cancel_reason,
        DROP COLUMN cancelled_by,
        DROP COLUMN cancelled_at;
    `);
    // Postgres tidak bisa DROP VALUE dari enum — tipe dibangun ulang tanpa
    // CANCELLED. Baris CANCELLED dikembalikan ke OPEN dulu supaya cast aman.
    await queryRunner.query(
      `ALTER TABLE sales_orders ALTER COLUMN status DROP DEFAULT;`,
    );
    await queryRunner.query(
      `ALTER TABLE sales_orders ALTER COLUMN status TYPE TEXT USING status::text;`,
    );
    await queryRunner.query(
      `UPDATE sales_orders SET status = 'OPEN' WHERE status = 'CANCELLED';`,
    );
    await queryRunner.query(`DROP TYPE sales_order_status;`);
    await queryRunner.query(
      `CREATE TYPE sales_order_status AS ENUM ('OPEN', 'CONVERTED');`,
    );
    await queryRunner.query(`
      ALTER TABLE sales_orders
        ALTER COLUMN status TYPE sales_order_status USING status::sales_order_status,
        ALTER COLUMN status SET DEFAULT 'OPEN';
    `);
  }
}
