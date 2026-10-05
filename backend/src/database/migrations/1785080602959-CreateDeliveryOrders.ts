import { MigrationInterface, QueryRunner } from 'typeorm';

// Surat Jalan (Hari 24, CLAUDE.md §2.16/§3) — terbentuk DARI satu faktur
// penjualan bersaluran PENGIRIMAN (sales_channel divalidasi di service, BUKAN
// di sini), membawa agent_id (sopir) & vehicle_id. SATU faktur -> PALING
// BANYAK SATU surat jalan aktif (dijaga di service, bukan constraint DB —
// pola sama "retur tidak boleh melebihi total faktur" di sales-returns,
// supaya kalau VOID SJ dibangun nanti aturannya tinggal baca posting_status).
//
// TIDAK ADA kolom rupiah sama sekali di header maupun baris — surat jalan
// bukan dokumen uang (nota sudah dibawa sopir untuk menagih, CLAUDE.md §1).
// Baris murni menyalin product_id/unit_id/qty dari sales_invoice_lines
// (sales_invoice_line_id sebagai anchor, pola sama sales_return_lines) —
// TIDAK ADA harga/diskon/HPP.
//
// Kunci-cetak penuh disiapkan (posting_status, print_status, print_count,
// printed_at, revision_number, void_reason_code, void_reason_note) sebagai
// kontrak PRINT_LOCK_TABLES (CLAUDE.md §2.16, 7 dokumen JL/B1/GD/SJ/RJ/RB/PAY)
// — hanya registerPrint() yang di-wire hari ini (pola sama sales_returns
// Hari 23), EDIT/VOID/status pengiriman (PENDING/DELIVERED/POSTPONED/
// RETURNED) sengaja ditunda ke Hari 25 (PROGRESS.md §0.1).
export class CreateDeliveryOrders1785080602959 implements MigrationInterface {
  name = 'CreateDeliveryOrders1785080602959';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE delivery_order_posting_status AS ENUM ('POSTED', 'VOIDED');
    `);
    await queryRunner.query(`
      CREATE TYPE delivery_order_print_status AS ENUM ('NOT_PRINTED', 'PRINTED', 'PRINT_CANCELLED');
    `);

    await queryRunner.query(`
      CREATE TABLE delivery_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        delivery_number VARCHAR(50) NOT NULL UNIQUE,
        delivery_date DATE NOT NULL,
        sales_invoice_id UUID NOT NULL REFERENCES sales_invoices(id),
        customer_id UUID NOT NULL REFERENCES customers(id),
        agent_id UUID NOT NULL REFERENCES agents(id),
        vehicle_id UUID NOT NULL REFERENCES vehicles(id),
        posting_status delivery_order_posting_status NOT NULL DEFAULT 'POSTED',
        print_status delivery_order_print_status NOT NULL DEFAULT 'NOT_PRINTED',
        print_count INTEGER NOT NULL DEFAULT 0,
        printed_at TIMESTAMPTZ,
        revision_number INTEGER NOT NULL DEFAULT 0,
        void_reason_code VARCHAR(100),
        void_reason_note TEXT,
        notes TEXT,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_delivery_orders_sales_invoice ON delivery_orders (sales_invoice_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_delivery_orders_delivery_date ON delivery_orders (delivery_date);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_delivery_orders_agent ON delivery_orders (agent_id);
    `);
    await queryRunner.query(`
      CREATE TRIGGER delivery_orders_set_updated_at
      BEFORE UPDATE ON delivery_orders
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      CREATE TABLE delivery_order_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        delivery_order_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
        line_order INTEGER NOT NULL,
        sales_invoice_line_id UUID NOT NULL REFERENCES sales_invoice_lines(id),
        product_id UUID NOT NULL REFERENCES products(id),
        unit_id UUID NOT NULL REFERENCES units(id),
        qty_input NUMERIC(16,4) NOT NULL,
        qty_base_unit NUMERIC(16,4) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (qty_input > 0),
        CHECK (qty_base_unit > 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_delivery_order_lines_order ON delivery_order_lines (delivery_order_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_delivery_order_lines_invoice_line ON delivery_order_lines (sales_invoice_line_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_delivery_order_lines_invoice_line;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_delivery_order_lines_order;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS delivery_order_lines;`);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS delivery_orders_set_updated_at ON delivery_orders;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_delivery_orders_agent;`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_delivery_orders_delivery_date;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_delivery_orders_sales_invoice;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS delivery_orders;`);

    await queryRunner.query(`DROP TYPE IF EXISTS delivery_order_print_status;`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS delivery_order_posting_status;`,
    );
  }
}
