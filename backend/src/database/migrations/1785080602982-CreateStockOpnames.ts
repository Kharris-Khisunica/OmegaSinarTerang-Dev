import { MigrationInterface, QueryRunner } from 'typeorm';

// need_fixing.md #25 (keputusan 6 Okt 2026, opsi 2b — belum dikonfirmasi
// ulang ke klien, pola sama Payment §2.12): Stok Opname TERSIMPAN + koreksi
// stok. Dokumen `OP`:
//   DRAFT  — hitungan fisik + snapshot stok sistem STORE (MASTER/SUPERVISOR,
//            boleh diubah selama DRAFT)
//   POSTED — MASTER memposting = persetujuan: selisih jadi movement stok
//            (adjustment) + jurnal Persediaan <-> Selisih Persediaan
//   VOIDED — DRAFT dibatalkan, atau POSTED dibalik (VoidEngineService)
// Akun selisih memakai akun yang SUDAH ada sejak Hari 17A
// (05.110.00002 "Selisih Persediaan (Stok Opname)") — diberi flag supaya
// diresolve tanpa hardcode kode (CLAUDE.md §6).
export class CreateStockOpnames1785080602982 implements MigrationInterface {
  name = 'CreateStockOpnames1785080602982';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
      ADD COLUMN is_stock_opname_diff_account BOOLEAN NOT NULL DEFAULT false;
    `);
    await queryRunner.query(
      `UPDATE chart_of_accounts SET is_stock_opname_diff_account = true WHERE code = '05.110.00002';`,
    );

    await queryRunner.query(`
      CREATE TYPE stock_opname_status AS ENUM ('DRAFT', 'POSTED', 'VOIDED');
    `);
    await queryRunner.query(`
      CREATE TABLE stock_opnames (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_number VARCHAR NOT NULL UNIQUE,
        count_date DATE NOT NULL,
        warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        status stock_opname_status NOT NULL DEFAULT 'DRAFT',
        notes TEXT,
        posted_by UUID REFERENCES users(id),
        posted_at TIMESTAMPTZ,
        shortage_value NUMERIC(16,2) NOT NULL DEFAULT 0,
        surplus_value NUMERIC(16,2) NOT NULL DEFAULT 0,
        void_reason_code VARCHAR,
        void_reason_note TEXT,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE TABLE stock_opname_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        stock_opname_id UUID NOT NULL REFERENCES stock_opnames(id),
        line_order INT NOT NULL,
        product_id UUID NOT NULL REFERENCES products(id),
        system_qty_base NUMERIC(16,4) NOT NULL,
        physical_qty_base NUMERIC(16,4) NOT NULL CHECK (physical_qty_base >= 0),
        diff_qty_base NUMERIC(16,4) NOT NULL,
        unit_cost NUMERIC(16,4),
        diff_value NUMERIC(16,2),
        stock_movement_id UUID REFERENCES stock_movements(id),
        UNIQUE (stock_opname_id, product_id)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE stock_opname_lines;`);
    await queryRunner.query(`DROP TABLE stock_opnames;`);
    await queryRunner.query(`DROP TYPE stock_opname_status;`);
    await queryRunner.query(
      `ALTER TABLE chart_of_accounts DROP COLUMN is_stock_opname_diff_account;`,
    );
  }
}
