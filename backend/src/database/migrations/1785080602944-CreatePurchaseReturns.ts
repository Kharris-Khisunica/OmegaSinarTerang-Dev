import { MigrationInterface, QueryRunner } from 'typeorm';

// Retur Pembelian (Hari 16, CLAUDE.md §3 "Bad stock" + §4 "Retur Pembelian")
// — SELALU dari gudang BAD_STOCK, nilai retur DINEGOSIASIKAN (bisa beda dari
// harga pokok FIFO), selisihnya ke akun dua-arah "Selisih Retur Pembelian"
// (5104, lihat 1785080602943). Kunci-cetak penuh (posting_status,
// print_status, print_count, printed_at, revision_number, void_reason_code,
// void_reason_note) disiapkan sebagai kontrak PRINT_LOCK_TABLES — hanya
// registerPrint() (cetak ulang bebas) yang di-wire hari ini, EDIT/VOID
// sengaja ditunda (pola sama warehouse_mutations Hari 13: GD ikut kunci
// cetak tapi belum ada wiring edit/VOID). Tidak ada review_status (preseden
// warehouse_mutations juga tidak punya kolom ini).
//
// unit_mode ('BESAR'/'KECIL') dikunci di HEADER, bukan per baris — CLAUDE.md
// §3 "klien tidak pernah mencampur satuan dalam satu transaksi", dan format
// data produk selalu "1 satuan besar = X satuan dasar" (dikonfirmasi user,
// bukan seperti contoh migrasi lama "dus=12 renceng=10" yang mewakili produk
// 3-tingkat legacy). qty_input = angka mentah sesuai unit_mode dokumen
// (satuan besar produk kalau BESAR, base unit kalau KECIL); qty_base_unit =
// hasil konversi server-side. agreed_unit_price WAJIB dibaca sebagai "per
// qty_input", BUKAN per base unit (pola sama purchase_invoice_lines.unit_price).
export class CreatePurchaseReturns1785080602944 implements MigrationInterface {
  name = 'CreatePurchaseReturns1785080602944';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE purchase_return_posting_status AS ENUM ('POSTED', 'VOIDED');
    `);
    await queryRunner.query(`
      CREATE TYPE purchase_return_print_status AS ENUM ('NOT_PRINTED', 'PRINTED', 'PRINT_CANCELLED');
    `);
    await queryRunner.query(`
      CREATE TYPE purchase_return_unit_mode AS ENUM ('BESAR', 'KECIL');
    `);
    await queryRunner.query(`
      CREATE TYPE purchase_return_settlement_type AS ENUM ('REDUCE_INVOICE', 'CASH');
    `);

    await queryRunner.query(`
      CREATE TABLE purchase_returns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_number VARCHAR(50) NOT NULL UNIQUE,
        supplier_id UUID NOT NULL REFERENCES suppliers(id),
        return_date DATE NOT NULL,
        unit_mode purchase_return_unit_mode NOT NULL,
        settlement_type purchase_return_settlement_type NOT NULL,
        cash_account_id UUID REFERENCES chart_of_accounts(id),
        subtotal_agreed_amount NUMERIC(16,2) NOT NULL,
        total_cost_basis NUMERIC(16,2) NOT NULL,
        difference_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        posting_status purchase_return_posting_status NOT NULL DEFAULT 'POSTED',
        print_status purchase_return_print_status NOT NULL DEFAULT 'NOT_PRINTED',
        print_count INTEGER NOT NULL DEFAULT 0,
        printed_at TIMESTAMPTZ,
        revision_number INTEGER NOT NULL DEFAULT 0,
        void_reason_code VARCHAR(100),
        void_reason_note TEXT,
        notes TEXT,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK ((settlement_type = 'CASH') = (cash_account_id IS NOT NULL))
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_purchase_returns_supplier ON purchase_returns (supplier_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_purchase_returns_return_date ON purchase_returns (return_date);
    `);
    await queryRunner.query(`
      CREATE TRIGGER purchase_returns_set_updated_at
      BEFORE UPDATE ON purchase_returns
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      CREATE TABLE purchase_return_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_return_id UUID NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
        line_order INTEGER NOT NULL,
        product_id UUID NOT NULL REFERENCES products(id),
        qty_input NUMERIC(16,4) NOT NULL,
        qty_base_unit NUMERIC(16,4) NOT NULL,
        agreed_unit_price NUMERIC(16,2) NOT NULL,
        agreed_amount NUMERIC(16,2) NOT NULL,
        cost_basis_unit_cost NUMERIC(16,4) NOT NULL DEFAULT 0,
        cost_basis_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        stock_movement_id UUID NOT NULL REFERENCES stock_movements(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (qty_input > 0),
        CHECK (qty_base_unit > 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_purchase_return_lines_return ON purchase_return_lines (purchase_return_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_purchase_return_lines_product ON purchase_return_lines (product_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_return_lines_product;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_return_lines_return;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_return_lines;`);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS purchase_returns_set_updated_at ON purchase_returns;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_returns_return_date;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_returns_supplier;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_returns;`);

    await queryRunner.query(
      `DROP TYPE IF EXISTS purchase_return_settlement_type;`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS purchase_return_unit_mode;`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS purchase_return_print_status;`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS purchase_return_posting_status;`,
    );
  }
}
