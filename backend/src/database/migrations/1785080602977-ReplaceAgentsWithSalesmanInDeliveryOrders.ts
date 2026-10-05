import { MigrationInterface, QueryRunner } from 'typeorm';

// Koreksi pemahaman (26 Sep 2026): "Agen" (sopir yang mengantar & menagih,
// CLAUDE.md §1) dan "Salesman" adalah ORANG YANG SAMA di proyek ini —
// istilahnya dipakai bertukar tanpa diperjelas, dan Hari 24 keliru
// membangun `agents` sebagai master TERPISAH ("pola PERSIS Salesman: kode,
// nama, aktif" — lihat komentar lama CreateAgents1785080602957) padahal
// seharusnya Surat Jalan langsung memakai `salesmen` yang sudah ada.
//
// AMAN dijalankan tanpa migrasi data: `agents` dan `delivery_orders` sama-
// sama 0 baris di semua environment yang diverifikasi (dev, per 26 Sep
// 2026) — modul Surat Jalan baru dipakai testing, belum ada transaksi
// sungguhan yang menunjuk agent_id. Kalau suatu saat ada environment lain
// dengan baris terisi, guard di bawah menolak migrasi dan minta migrasi
// data manual dulu, BUKAN diam-diam menjatuhkan FK ke nilai yang tidak
// pernah dipetakan ke salesmen mana pun.
export class ReplaceAgentsWithSalesmanInDeliveryOrders1785080602977 implements MigrationInterface {
  name = 'ReplaceAgentsWithSalesmanInDeliveryOrders1785080602977';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(
      `SELECT COUNT(*)::text AS count FROM delivery_orders`,
    )) as { count: string }[];
    if (Number(rows[0].count) > 0) {
      throw new Error(
        'delivery_orders sudah punya baris — migrasi ini mengasumsikan 0 baris ' +
          '(diverifikasi 26 Sep 2026). Petakan agent_id -> salesman_id secara ' +
          'manual dulu sebelum menjalankan migrasi ini.',
      );
    }

    await queryRunner.query(
      `ALTER TABLE delivery_orders DROP CONSTRAINT delivery_orders_agent_id_fkey;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_delivery_orders_agent;`);
    await queryRunner.query(
      `ALTER TABLE delivery_orders RENAME COLUMN agent_id TO salesman_id;`,
    );
    await queryRunner.query(`
      ALTER TABLE delivery_orders
      ADD CONSTRAINT delivery_orders_salesman_id_fkey
      FOREIGN KEY (salesman_id) REFERENCES salesmen(id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_delivery_orders_salesman ON delivery_orders (salesman_id);
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS agents_set_updated_at ON agents;`,
    );
    await queryRunner.query(`DROP SEQUENCE IF EXISTS agent_code_seq;`);
    await queryRunner.query(`DROP TABLE IF EXISTS agents;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Pulihkan `agents` persis bentuk CreateAgents1785080602957 supaya
    // down() konsisten dengan riwayat migration — TIDAK memulihkan baris
    // (tidak ada yang hilang, lihat guard di up()).
    await queryRunner.query(`
      CREATE TABLE agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE TRIGGER agents_set_updated_at
      BEFORE UPDATE ON agents
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);
    await queryRunner.query(`CREATE SEQUENCE agent_code_seq;`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_delivery_orders_salesman;`,
    );
    await queryRunner.query(
      `ALTER TABLE delivery_orders DROP CONSTRAINT delivery_orders_salesman_id_fkey;`,
    );
    await queryRunner.query(
      `ALTER TABLE delivery_orders RENAME COLUMN salesman_id TO agent_id;`,
    );
    await queryRunner.query(`
      ALTER TABLE delivery_orders
      ADD CONSTRAINT delivery_orders_agent_id_fkey
      FOREIGN KEY (agent_id) REFERENCES agents(id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_delivery_orders_agent ON delivery_orders (agent_id);
    `);
  }
}
