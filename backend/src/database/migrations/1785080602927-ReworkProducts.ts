import { MigrationInterface, QueryRunner } from 'typeorm';

// Rework skema Produk (Hari 8, CLAUDE.md §3):
// - Kode = barcode YYMMDDXXXX, dibangkitkan dari product_code_seq kalau
//   kosong, dikunci (is_code_locked) begitu dipakai transaksi pertama
//   (StockRecorder/Faktur/dsb Hari 10+ akan memanggil ProductsService.lockCode()).
// - Nama lama (kolom tunggal `name`) diganti 4 bagian: brand_id (FK master
//   Merek baru) + keterangan + kemasan + ukuran_uom, plus display_name
//   gabungan TERINDEKS (jalur pencarian faktur — CLAUDE.md §3).
// - is_bkp menggerbangi PPN masukan (§2.11). ean_barcode opsional, tidak
//   dipakai MVP.
//
// `base_unit`/`product_unit_conversions.unit_name` SENGAJA belum di-FK ke
// tabel `units` baru hari ini — di luar lingkup rework Hari 8 (units master
// baru berdiri sebagai CRUD kecil; wiring ke konversi produk menyusul kalau
// diminta eksplisit, lihat catatan di ReworkProducts di PROGRESS.md).
export class ReworkProducts1785080602927 implements MigrationInterface {
  name = 'ReworkProducts1785080602927';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Baris yang ada hari ini di DB dev cuma sisa smoke test Hari 3/4
    // (dicek manual: TEST-SMOKE-*, P--02/Royco) — bukan data klien (input
    // master data klien baru dimulai hari ini, Hari 8). Aman dikosongkan
    // supaya kolom brand_id/keterangan bisa langsung NOT NULL tanpa backfill.
    await queryRunner.query(
      `TRUNCATE TABLE product_unit_conversions, products;`,
    );

    await queryRunner.query(`CREATE SEQUENCE product_code_seq;`);

    await queryRunner.query(`
      ALTER TABLE products
        DROP COLUMN name,
        ADD COLUMN brand_id UUID NOT NULL REFERENCES brands(id),
        ADD COLUMN keterangan VARCHAR(150) NOT NULL,
        ADD COLUMN kemasan VARCHAR(100),
        ADD COLUMN ukuran_uom VARCHAR(50),
        ADD COLUMN display_name VARCHAR(500) NOT NULL,
        ADD COLUMN is_bkp BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN ean_barcode VARCHAR(50),
        ADD COLUMN is_code_locked BOOLEAN NOT NULL DEFAULT false,
        ADD CONSTRAINT chk_products_code_format CHECK (code ~ '^[0-9]{10}$');
    `);

    await queryRunner.query(`
      CREATE INDEX idx_products_display_name ON products (display_name);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_display_name;`);
    await queryRunner.query(`
      ALTER TABLE products
        DROP CONSTRAINT IF EXISTS chk_products_code_format,
        DROP COLUMN IF EXISTS is_code_locked,
        DROP COLUMN IF EXISTS ean_barcode,
        DROP COLUMN IF EXISTS is_bkp,
        DROP COLUMN IF EXISTS display_name,
        DROP COLUMN IF EXISTS ukuran_uom,
        DROP COLUMN IF EXISTS kemasan,
        DROP COLUMN IF EXISTS keterangan,
        DROP COLUMN IF EXISTS brand_id,
        ADD COLUMN name VARCHAR(200) NOT NULL DEFAULT '';
    `);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS product_code_seq;`);
  }
}
