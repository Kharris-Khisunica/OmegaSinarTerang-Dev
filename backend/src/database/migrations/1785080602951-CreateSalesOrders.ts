import { MigrationInterface, QueryRunner } from 'typeorm';

// Hari 19 — Sales Order (CLAUDE.md §8: satu-satunya modul di daftar potong
// yang TIDAK BOLEH dipotong; sistem lama 0 record, order selama ini ditulis
// di kertas). SO sengaja TIDAK punya print_status/print_count/printed_at/
// revision_number (dikecualikan dari kunci cetak generik, CLAUDE.md §2.16)
// dan TIDAK punya posting_status/void_reason_*/journal apa pun (SO tidak
// pernah menyentuh stok atau uang — §3 "Sales Order tidak menahan stok",
// §2.16 "SO bukan dokumen yang mengikat uang atau stok"). unit_price di
// sales_order_lines murni tampilan (PANDUAN_UI.md §2/§7.2: grid SO punya
// kolom Total) — tidak pernah dibaca Journal Poster/Stock Recorder.
export class CreateSalesOrders1785080602951 implements MigrationInterface {
  name = 'CreateSalesOrders1785080602951';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE sales_order_status AS ENUM ('OPEN', 'CONVERTED');
    `);

    await queryRunner.query(`
      CREATE TABLE sales_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number VARCHAR(50) NOT NULL UNIQUE,
        order_date DATE NOT NULL,
        customer_id UUID NOT NULL REFERENCES customers(id),
        status sales_order_status NOT NULL DEFAULT 'OPEN',
        notes TEXT,
        converted_at TIMESTAMPTZ,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_sales_orders_customer ON sales_orders (customer_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_sales_orders_status ON sales_orders (status);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_sales_orders_order_date ON sales_orders (order_date);
    `);
    await queryRunner.query(`
      CREATE TRIGGER sales_orders_set_updated_at
      BEFORE UPDATE ON sales_orders
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      CREATE TABLE sales_order_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
        line_order INTEGER NOT NULL,
        product_id UUID NOT NULL REFERENCES products(id),
        unit_id UUID NOT NULL REFERENCES units(id),
        qty_input NUMERIC(16,4) NOT NULL,
        qty_base_unit NUMERIC(16,4) NOT NULL,
        unit_price NUMERIC(16,2),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (qty_input > 0),
        CHECK (qty_base_unit > 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_sales_order_lines_order ON sales_order_lines (sales_order_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_sales_order_lines_product ON sales_order_lines (product_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_order_lines_product;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_order_lines_order;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS sales_order_lines;`);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS sales_orders_set_updated_at ON sales_orders;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_orders_order_date;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sales_orders_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sales_orders_customer;`);
    await queryRunner.query(`DROP TABLE IF EXISTS sales_orders;`);

    await queryRunner.query(`DROP TYPE IF EXISTS sales_order_status;`);
  }
}
