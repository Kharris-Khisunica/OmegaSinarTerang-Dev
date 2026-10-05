import { MigrationInterface, QueryRunner } from 'typeorm';

// Hari 25 (CLAUDE.md §0.1) — status pengiriman surat jalan, sengaja
// ditunda dari Hari 24 (PROGRESS.md §0.1: "EDIT/VOID/status pengiriman
// sengaja ditunda ke Hari 25"). PENDING = belum berangkat/belum ada
// kabar, DELIVERED = sampai, POSTPONED = gagal terkirim hari itu (masuk
// daftar "belum terkirim" untuk ditarik besok), RETURNED = barang dibawa
// balik oleh sopir. Tidak ada state machine ketat antar status — operator
// toko yang menilai lapangan, bukan sistem (sama longgarnya dengan
// reviewStatus faktur pembelian).
export class AddDeliveryStatusToDeliveryOrders1785080602960 implements MigrationInterface {
  name = 'AddDeliveryStatusToDeliveryOrders1785080602960';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE delivery_order_delivery_status AS ENUM ('PENDING', 'DELIVERED', 'POSTPONED', 'RETURNED');
    `);
    await queryRunner.query(`
      ALTER TABLE delivery_orders
      ADD COLUMN delivery_status delivery_order_delivery_status NOT NULL DEFAULT 'PENDING';
    `);
    await queryRunner.query(`
      CREATE INDEX idx_delivery_orders_delivery_status ON delivery_orders (delivery_status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_delivery_orders_delivery_status;`,
    );
    await queryRunner.query(
      `ALTER TABLE delivery_orders DROP COLUMN IF EXISTS delivery_status;`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS delivery_order_delivery_status;`,
    );
  }
}
