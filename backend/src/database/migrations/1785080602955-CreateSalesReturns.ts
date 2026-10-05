import { MigrationInterface, QueryRunner } from 'typeorm';

// Retur Penjualan (Hari 23, CLAUDE.md §3 "Lain-lain" + §4 "Retur Penjualan") —
// BEDA dari Retur Pembelian (1785080602944): WAJIB menunjuk faktur asal
// (sales_invoice_id + per-baris sales_invoice_line_id), harga pokok WAJIB
// unit_cost_fifo faktur asal (tidak dinegosiasikan, tidak ada akun "Selisih").
// Barang SELALU masuk BAD_STOCK (StockRecorderService.recordIn(), bukan
// transfer()). Kunci-cetak penuh disiapkan (posting_status, print_status,
// print_count, printed_at, revision_number, void_reason_code, void_reason_note)
// sebagai kontrak PRINT_LOCK_TABLES — hanya registerPrint() yang di-wire hari
// ini, EDIT/VOID sengaja ditunda (pola sama purchase_returns Hari 16).
//
// dpp_amount/output_vat_amount/total_amount di HEADER adalah hasil prorata
// dari angka ASLI faktur (subtotal/invoice_discount_amount/output_vat_amount)
// — tidak pernah dihitung ulang dari tax_rates hari ini. total_amount dipakai
// untuk validasi kumulatif "retur tidak boleh melebihi total faktur asal"
// (pengganti sementara paid_amount yang belum ada — Payment module Hari 26-27).
export class CreateSalesReturns1785080602955 implements MigrationInterface {
  name = 'CreateSalesReturns1785080602955';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE sales_return_posting_status AS ENUM ('POSTED', 'VOIDED');
    `);
    await queryRunner.query(`
      CREATE TYPE sales_return_print_status AS ENUM ('NOT_PRINTED', 'PRINTED', 'PRINT_CANCELLED');
    `);
    await queryRunner.query(`
      CREATE TYPE sales_return_settlement_type AS ENUM ('REDUCE_INVOICE', 'CASH');
    `);

    await queryRunner.query(`
      CREATE TABLE sales_returns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_number VARCHAR(50) NOT NULL UNIQUE,
        sales_invoice_id UUID NOT NULL REFERENCES sales_invoices(id),
        customer_id UUID NOT NULL REFERENCES customers(id),
        return_date DATE NOT NULL,
        settlement_type sales_return_settlement_type NOT NULL,
        cash_account_id UUID REFERENCES chart_of_accounts(id),
        dpp_amount NUMERIC(16,2) NOT NULL,
        output_vat_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        total_amount NUMERIC(16,2) NOT NULL,
        cost_basis_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        posting_status sales_return_posting_status NOT NULL DEFAULT 'POSTED',
        print_status sales_return_print_status NOT NULL DEFAULT 'NOT_PRINTED',
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
      CREATE INDEX idx_sales_returns_sales_invoice ON sales_returns (sales_invoice_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_sales_returns_return_date ON sales_returns (return_date);
    `);
    await queryRunner.query(`
      CREATE TRIGGER sales_returns_set_updated_at
      BEFORE UPDATE ON sales_returns
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      CREATE TABLE sales_return_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sales_return_id UUID NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
        line_order INTEGER NOT NULL,
        sales_invoice_line_id UUID NOT NULL REFERENCES sales_invoice_lines(id),
        product_id UUID NOT NULL REFERENCES products(id),
        qty_input NUMERIC(16,4) NOT NULL,
        qty_base_unit NUMERIC(16,4) NOT NULL,
        unit_cost_fifo NUMERIC(16,4) NOT NULL DEFAULT 0,
        dpp_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        cost_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        stock_movement_id UUID NOT NULL REFERENCES stock_movements(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (qty_input > 0),
        CHECK (qty_base_unit > 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_sales_return_lines_return ON sales_return_lines (sales_return_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_sales_return_lines_invoice_line ON sales_return_lines (sales_invoice_line_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_sales_return_lines_product ON sales_return_lines (product_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_return_lines_product;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_return_lines_invoice_line;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_return_lines_return;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS sales_return_lines;`);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS sales_returns_set_updated_at ON sales_returns;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_returns_return_date;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_returns_sales_invoice;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS sales_returns;`);

    await queryRunner.query(
      `DROP TYPE IF EXISTS sales_return_settlement_type;`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS sales_return_print_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS sales_return_posting_status;`);
  }
}
