import { MigrationInterface, QueryRunner } from 'typeorm';

// Paket R6 (docs/RENCANA_REVISI_TESTING_KLIEN.md §3, DocumentReviseService) —
// stock_cost_lots sebelumnya HANYA bisa diidentifikasi lewat
// (product_id, warehouse_id, source_type, source_id), yaitu tingkat DOKUMEN.
// Itu cukup selama satu dokumen hanya pernah di-posting SEKALI (create atau
// VOID) — begitu revisi in-place (K1) mengizinkan dokumen yang sama
// memposting ulang recordIn() berkali-kali untuk PRODUK YANG SAMA (harga
// dikoreksi, produk tetap), lot dari posting lama (sudah dibalik
// reverseIn()) dan lot dari posting baru jadi tidak bisa dibedakan lagi oleh
// StockRecorderService.reverseIn()/assertLotsUnconsumed() — keduanya salah
// mengira lot lama yang sudah nol (bekas dibalik) sebagai "barang sudah
// terjual", memblokir revisi/VOID berikutnya secara permanen padahal tidak
// ada penjualan sama sekali.
//
// movement_id mengikat satu lot ke movement recordIn() PERSIS yang
// membentuknya (pola sama stock_cost_consumptions yang sudah mengikat
// konsumsi ke movement recordOut() secara presisi) — reverseIn() dan
// assertLotsUnconsumed() disempitkan Hari revisi ini untuk memakai kunci ini,
// bukan lagi product+warehouse+source dokumen.
//
// Backfill AMAN dijalankan sekarang: sebelum fitur revisi ini ada, tidak ada
// dokumen yang pernah diposting dua kali, jadi pasangan
// (product_id, warehouse_id, source_type, source_id, qty, unit_cost, tanggal)
// masih 1:1 dengan movement pembentuknya. Lot hasil transfer() (mutasi
// gudang) SENGAJA tidak ikut ter-backfill — movement TRANSFER ditolak
// eksplisit oleh reverseIn(), jadi movement_id NULL di sana tidak pernah
// dibaca. `IS NOT DISTINCT FROM` (bukan `=`) untuk source_id — Saldo Awal
// (OPENING_BALANCE) menulis source_id NULL di kedua tabel, dan `NULL = NULL`
// di SQL evaluasi ke NULL (tidak match), bukan true.
export class AddMovementIdToStockCostLots1785080602969 implements MigrationInterface {
  name = 'AddMovementIdToStockCostLots1785080602969';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_cost_lots
      ADD COLUMN movement_id UUID NULL REFERENCES stock_movements(id);
    `);
    await queryRunner.query(`
      UPDATE stock_cost_lots l
      SET movement_id = m.id
      FROM stock_movements m
      WHERE l.movement_id IS NULL
        AND m.source_type = l.source_type
        AND m.source_id IS NOT DISTINCT FROM l.source_id
        AND m.product_id = l.product_id
        AND m.warehouse_id = l.warehouse_id
        AND m.qty_base_unit::numeric = l.qty_in::numeric
        AND m.unit_cost::numeric = l.unit_cost::numeric
        AND m.movement_date = l.lot_date;
    `);
    await queryRunner.query(`
      CREATE INDEX idx_stock_cost_lots_movement_id ON stock_cost_lots (movement_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_stock_cost_lots_movement_id;
    `);
    await queryRunner.query(`
      ALTER TABLE stock_cost_lots DROP COLUMN movement_id;
    `);
  }
}
