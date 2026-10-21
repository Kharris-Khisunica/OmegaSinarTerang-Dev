import { MigrationInterface, QueryRunner } from 'typeorm';

// Revisi akhir klien 17 Okt 2026 (Hari 44): Surat Jalan mencatat pekerja
// (tukang angkut, master `workers`) yang ikut mengantar — WAJIB minimal satu,
// boleh lebih dari satu, level header (bukan per baris produk). Tabel anak
// eksplisit (bukan @ManyToMany), pola sama delivery_order_lines.
//
// SJ yang sudah terbit sebelum migration ini tidak punya pekerja — aturan
// "minimal satu" hanya ditegakkan service saat create()/updateWorkers().
// Daftar pekerja BEBAS kunci cetak (pola sama delivery_status, need_fixing
// #18) — lihat DeliveryOrdersService.updateWorkers().
export class CreateDeliveryOrderWorkers1785080602986 implements MigrationInterface {
  name = 'CreateDeliveryOrderWorkers1785080602986';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE delivery_order_workers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        delivery_order_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
        worker_id UUID NOT NULL REFERENCES workers(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (delivery_order_id, worker_id)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_delivery_order_workers_worker ON delivery_order_workers (worker_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_delivery_order_workers_worker;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS delivery_order_workers;`);
  }
}
