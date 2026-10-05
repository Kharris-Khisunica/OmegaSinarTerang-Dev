import { MigrationInterface, QueryRunner } from 'typeorm';

// Hari 20 — skema Faktur Penjualan. Migration ini SAJA (bukan POST
// /sales-invoices, itu Hari 21): kolom kunci-cetak/void/review disiapkan
// sekarang (pola identik 1785080602941 purchase_invoices) supaya Hari 21/22
// tidak butuh migration susulan untuk itu.
//
// customer_id DIDENORMALISASI ke sales_invoice_lines DI SINI, bukan nanti —
// CLAUDE.md §3 "Riwayat harga": menambahkannya setelah tabel berisi data
// berarti backfill + reindex di mesin klien yang HDD. Index komposit
// (customer_id, product_id, unit_id, id DESC) adalah jalur terpanas aplikasi
// (GET /price-suggestion, Hari 20).
//
// unit_cost_fifo (BUKAN unit_cost_result seperti purchase_invoice_lines) —
// nama ini literal karena CLAUDE.md §3 "Lain-lain" merujuknya persis
// `sales_invoice_lines.unit_cost_fifo` untuk retur penjualan Hari 23. Diisi
// Hari 21 dari StockRecorderService.recordOut(), default 0 hari ini.
//
// sales_channel/sales_order_id disediakan untuk SalesOrdersService
// .assertChannelSalesOrderRequirement()/markConverted() (sudah dibangun &
// diuji Hari 19, menunggu kolom ini) — dipanggil Hari 21, bukan hari ini.
export class CreateSalesInvoices1785080602952 implements MigrationInterface {
  name = 'CreateSalesInvoices1785080602952';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE sales_invoice_channel AS ENUM ('PENGIRIMAN', 'TOKO');
    `);
    await queryRunner.query(`
      CREATE TYPE sales_invoice_posting_status AS ENUM ('POSTED', 'VOIDED');
    `);
    await queryRunner.query(`
      CREATE TYPE sales_invoice_print_status AS ENUM ('NOT_PRINTED', 'PRINTED', 'PRINT_CANCELLED');
    `);
    await queryRunner.query(`
      CREATE TYPE sales_invoice_review_status AS ENUM ('BELUM_DICEK', 'DISETUJUI', 'BERMASALAH');
    `);

    await queryRunner.query(`
      CREATE TABLE sales_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        invoice_date DATE NOT NULL,
        customer_id UUID NOT NULL REFERENCES customers(id),
        sales_channel sales_invoice_channel NOT NULL,
        sales_order_id UUID REFERENCES sales_orders(id),
        salesman_id UUID NOT NULL REFERENCES salesmen(id),
        term_days INTEGER NOT NULL DEFAULT 0,
        due_date DATE NOT NULL,
        subtotal NUMERIC(16,2) NOT NULL,
        line_discount_total NUMERIC(16,2) NOT NULL DEFAULT 0,
        invoice_discount_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        invoice_discount_percent NUMERIC(5,2),
        output_vat_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        total_amount NUMERIC(16,2) NOT NULL,
        posting_status sales_invoice_posting_status NOT NULL DEFAULT 'POSTED',
        print_status sales_invoice_print_status NOT NULL DEFAULT 'NOT_PRINTED',
        print_count INTEGER NOT NULL DEFAULT 0,
        printed_at TIMESTAMPTZ,
        revision_number INTEGER NOT NULL DEFAULT 0,
        review_status sales_invoice_review_status NOT NULL DEFAULT 'BELUM_DICEK',
        void_reason_code VARCHAR(100),
        void_reason_note TEXT,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_sales_invoices_customer ON sales_invoices (customer_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_sales_invoices_invoice_date ON sales_invoices (invoice_date);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_sales_invoices_review_status ON sales_invoices (review_status);
    `);
    await queryRunner.query(`
      CREATE TRIGGER sales_invoices_set_updated_at
      BEFORE UPDATE ON sales_invoices
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      CREATE TABLE sales_invoice_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sales_invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
        customer_id UUID NOT NULL REFERENCES customers(id),
        line_order INTEGER NOT NULL,
        product_id UUID NOT NULL REFERENCES products(id),
        unit_id UUID NOT NULL REFERENCES units(id),
        qty_input NUMERIC(16,4) NOT NULL,
        qty_base_unit NUMERIC(16,4) NOT NULL,
        unit_price NUMERIC(16,2) NOT NULL DEFAULT 0,
        discount_percent NUMERIC(5,2),
        discount_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        gross_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        net_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        unit_cost_fifo NUMERIC(16,4) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (qty_input > 0),
        CHECK (qty_base_unit > 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_sales_invoice_lines_invoice ON sales_invoice_lines (sales_invoice_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_sales_invoice_lines_product ON sales_invoice_lines (product_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_sales_invoice_lines_price_lookup
      ON sales_invoice_lines (customer_id, product_id, unit_id, id DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_invoice_lines_price_lookup;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_invoice_lines_product;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_invoice_lines_invoice;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS sales_invoice_lines;`);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS sales_invoices_set_updated_at ON sales_invoices;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_invoices_review_status;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_invoices_invoice_date;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_invoices_customer;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS sales_invoices;`);

    await queryRunner.query(`DROP TYPE IF EXISTS sales_invoice_review_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS sales_invoice_print_status;`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS sales_invoice_posting_status;`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS sales_invoice_channel;`);
  }
}
