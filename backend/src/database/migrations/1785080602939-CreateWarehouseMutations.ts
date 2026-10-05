import { MigrationInterface, QueryRunner } from 'typeorm';

// Dokumen pertama yang membawa void_reason_code/void_reason_note (CLAUDE.md
// §2 poin 4, dicatat sejak Hari 7 sebagai "baru ditempelkan saat tabel
// dokumennya dibuat") — warehouse_mutations adalah tabel dokumen pertama yang
// benar-benar ada, jadi ini titik pemasangannya. Teks bebas (VARCHAR/TEXT),
// BUKAN enum — keputusan user 29/30 Juli, pola sama migration 1785080602933
// (journal_entries).
//
// print_status/print_count/printed_at disiapkan sekarang (kolom saja) untuk
// mekanisme kunci-cetak generik yang baru dibangun Hari 15 — GD termasuk 7
// dokumen berkunci cetak (CLAUDE.md §2.16). Tidak ada logic yang memakainya
// hari ini.
//
// posting_status disiapkan untuk VOID di masa depan. VOID sungguhan untuk
// WAREHOUSE_MUTATION belum dikerjakan Hari 13 — lihat komentar di
// stock-recorder.service.ts (reverseIn/reverseOut, guard TRANSFER) dan
// void.service.spec.ts, yang keduanya sengaja dibiarkan apa adanya.
export class CreateWarehouseMutations1785080602939 implements MigrationInterface {
  name = 'CreateWarehouseMutations1785080602939';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE warehouse_mutation_type AS ENUM ('TITIPAN_PELANGGAN', 'TRANSFER');
    `);
    await queryRunner.query(`
      CREATE TYPE warehouse_mutation_posting_status AS ENUM ('POSTED', 'VOIDED');
    `);
    await queryRunner.query(`
      CREATE TYPE warehouse_mutation_print_status AS ENUM ('NOT_PRINTED', 'PRINTED', 'PRINT_CANCELLED');
    `);

    await queryRunner.query(`
      CREATE TABLE warehouse_mutations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mutation_number VARCHAR(50) NOT NULL UNIQUE,
        mutation_date DATE NOT NULL,
        mutation_type warehouse_mutation_type NOT NULL,
        from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        to_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        notes TEXT,
        posting_status warehouse_mutation_posting_status NOT NULL DEFAULT 'POSTED',
        print_status warehouse_mutation_print_status NOT NULL DEFAULT 'NOT_PRINTED',
        print_count INTEGER NOT NULL DEFAULT 0,
        printed_at TIMESTAMPTZ,
        void_reason_code VARCHAR(100),
        void_reason_note TEXT,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_warehouse_mutations_date ON warehouse_mutations (mutation_date);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_warehouse_mutations_from_warehouse ON warehouse_mutations (from_warehouse_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_warehouse_mutations_to_warehouse ON warehouse_mutations (to_warehouse_id);
    `);
    await queryRunner.query(`
      CREATE TRIGGER warehouse_mutations_set_updated_at
      BEFORE UPDATE ON warehouse_mutations
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      CREATE TABLE warehouse_mutation_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mutation_id UUID NOT NULL REFERENCES warehouse_mutations(id) ON DELETE CASCADE,
        line_order INTEGER NOT NULL,
        product_id UUID NOT NULL REFERENCES products(id),
        qty_base_unit NUMERIC(16,4) NOT NULL,
        unit_cost NUMERIC(16,4),
        movement_out_id UUID REFERENCES stock_movements(id),
        movement_in_id UUID REFERENCES stock_movements(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (qty_base_unit > 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_warehouse_mutation_lines_mutation ON warehouse_mutation_lines (mutation_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_warehouse_mutation_lines_product ON warehouse_mutation_lines (product_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_warehouse_mutation_lines_product;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_warehouse_mutation_lines_mutation;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS warehouse_mutation_lines;`);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS warehouse_mutations_set_updated_at ON warehouse_mutations;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_warehouse_mutations_to_warehouse;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_warehouse_mutations_from_warehouse;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_warehouse_mutations_date;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS warehouse_mutations;`);

    await queryRunner.query(
      `DROP TYPE IF EXISTS warehouse_mutation_print_status;`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS warehouse_mutation_posting_status;`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS warehouse_mutation_type;`);
  }
}
