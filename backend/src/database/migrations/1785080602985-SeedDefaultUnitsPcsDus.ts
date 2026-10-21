import { MigrationInterface, QueryRunner } from 'typeorm';

// Revisi akhir klien 17 Okt 2026 (Hari 44): form produk baru default satuan
// kecil PCS dan satuan besar DUS. Transaksi mencocokkan satuan produk ke
// master `units` BERDASARKAN NAMA (normalizeUnitName — lihat
// SalesOrdersService), jadi kedua default itu wajib ada di master supaya
// produk yang memakainya bisa langsung dijual/dibeli.
//
// Hanya disisipkan kalau belum ada satuan bernama sama (case-insensitive)
// ATAU berkode sama — data yang sudah diinput operator tidak disentuh.
export class SeedDefaultUnitsPcsDus1785080602985 implements MigrationInterface {
  name = 'SeedDefaultUnitsPcsDus1785080602985';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO units (code, name, is_active)
      SELECT d.name, d.name, true
      FROM (VALUES ('PCS'), ('DUS')) AS d(name)
      WHERE NOT EXISTS (
        SELECT 1 FROM units u
        WHERE LOWER(TRIM(u.name)) = LOWER(d.name) OR u.code = d.name
      );
    `);
  }

  // Menghapus baris berkode persis 'PCS'/'DUS' bernama sama — bentuk yang
  // disisipkan up(). Kode satuan buatan operator memakai pola 'SAT-xxx'
  // (unit_code_seq), jadi tidak ikut terhapus. product_unit_conversions
  // tidak ber-FK ke units, sehingga tidak ada rujukan yang patah.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM units WHERE code IN ('PCS', 'DUS') AND name = code;`,
    );
  }
}
