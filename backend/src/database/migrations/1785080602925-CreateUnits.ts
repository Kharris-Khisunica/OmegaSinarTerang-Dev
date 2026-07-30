import { MigrationInterface, QueryRunner } from 'typeorm';

// Master satuan jual/beli (DUS, RENCENG, SACHET, ...) — CLAUDE.md §3. TIDAK
// boleh dipakai untuk UoM kemasan deskriptif di nama produk (gr/ml/kg) —
// keduanya konsep berbeda yang sengaja dipisah, lihat products.ukuran_uom
// (free text, bagian dari nama) vs product_unit_conversions.unit_name
// (konversi qty, masih free text hari ini — belum di-FK ke tabel ini,
// lihat catatan di ReworkProducts).
export class CreateUnits1785080602925 implements MigrationInterface {
  name = 'CreateUnits1785080602925';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE units (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TRIGGER units_set_updated_at
      BEFORE UPDATE ON units
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS units_set_updated_at ON units;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS units;`);
  }
}
