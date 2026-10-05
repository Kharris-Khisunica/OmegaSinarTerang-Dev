import { MigrationInterface, QueryRunner } from 'typeorm';

// Hari 14 — dokumen pertama yang menerbitkan nomor B1 sungguhan (CLAUDE.md
// §2 poin 4). Tiga tanggal disimpan terpisah (receipt_date -> lot_date FIFO,
// supplier_invoice_date -> dasar jatuh tempo, due_date = supplier_invoice_date
// + term_days) — CLAUDE.md §3 "Pembelian", menggabungkannya jadi satu kolom
// akan membuat urutan FIFO mengikuti tanggal yang salah tanpa error apa pun.
//
// print_status/print_count/printed_at dan posting_status/void_reason_*
// disiapkan (kolom saja, pola sama 1785080602939 warehouse_mutations) untuk
// kunci-cetak generik dan VOID Hari 15/16 — tidak ada logic yang memakainya
// hari ini. review_status untuk Pengecekan Invoice Harian (Hari 22A) —
// KONTEKS_REVISI §2.2 bilang endpoint itu memakai ulang GET /purchase-invoices
// dengan filter reviewStatus, bukan endpoint /supervisor/* baru.
//
// goods_receipts/goods_receipt_lines dibuat OTOMATIS dari faktur (tidak ada
// input terpisah) — murni jejak "barang apa yang diterima dari baris mana",
// 1:1 dengan purchase_invoices lewat purchase_invoice_id UNIQUE.
export class CreatePurchaseInvoices1785080602941 implements MigrationInterface {
  name = 'CreatePurchaseInvoices1785080602941';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE purchase_invoice_posting_status AS ENUM ('POSTED', 'VOIDED');
    `);
    await queryRunner.query(`
      CREATE TYPE purchase_invoice_print_status AS ENUM ('NOT_PRINTED', 'PRINTED', 'PRINT_CANCELLED');
    `);
    await queryRunner.query(`
      CREATE TYPE purchase_invoice_review_status AS ENUM ('BELUM_DICEK', 'DISETUJUI', 'BERMASALAH');
    `);

    await queryRunner.query(`
      CREATE TABLE purchase_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        supplier_id UUID NOT NULL REFERENCES suppliers(id),
        supplier_invoice_no VARCHAR(100) NOT NULL,
        receipt_date DATE NOT NULL,
        supplier_invoice_date DATE NOT NULL,
        due_date DATE NOT NULL,
        term_days INTEGER NOT NULL DEFAULT 0,
        subtotal NUMERIC(16,2) NOT NULL,
        line_discount_total NUMERIC(16,2) NOT NULL DEFAULT 0,
        invoice_discount_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        invoice_discount_percent NUMERIC(5,2),
        input_vat_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        total_amount NUMERIC(16,2) NOT NULL,
        posting_status purchase_invoice_posting_status NOT NULL DEFAULT 'POSTED',
        print_status purchase_invoice_print_status NOT NULL DEFAULT 'NOT_PRINTED',
        print_count INTEGER NOT NULL DEFAULT 0,
        printed_at TIMESTAMPTZ,
        review_status purchase_invoice_review_status NOT NULL DEFAULT 'BELUM_DICEK',
        void_reason_code VARCHAR(100),
        void_reason_note TEXT,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_purchase_invoices_supplier ON purchase_invoices (supplier_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_purchase_invoices_receipt_date ON purchase_invoices (receipt_date);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_purchase_invoices_review_status ON purchase_invoices (review_status);
    `);
    await queryRunner.query(`
      CREATE TRIGGER purchase_invoices_set_updated_at
      BEFORE UPDATE ON purchase_invoices
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      CREATE TABLE purchase_invoice_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
        line_order INTEGER NOT NULL,
        product_id UUID NOT NULL REFERENCES products(id),
        unit_id UUID NOT NULL REFERENCES units(id),
        qty_input NUMERIC(16,4) NOT NULL,
        unit_price NUMERIC(16,2) NOT NULL DEFAULT 0,
        discount_percent NUMERIC(5,2),
        discount_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        qty_base_unit NUMERIC(16,4) NOT NULL,
        allocated_invoice_discount NUMERIC(16,2) NOT NULL DEFAULT 0,
        line_final_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        input_vat NUMERIC(16,2) NOT NULL DEFAULT 0,
        unit_cost_result NUMERIC(16,4) NOT NULL DEFAULT 0,
        is_bonus BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (qty_input > 0),
        CHECK (qty_base_unit > 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_purchase_invoice_lines_invoice ON purchase_invoice_lines (purchase_invoice_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_purchase_invoice_lines_product ON purchase_invoice_lines (product_id);
    `);

    await queryRunner.query(`
      CREATE TABLE goods_receipts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_invoice_id UUID NOT NULL UNIQUE REFERENCES purchase_invoices(id) ON DELETE CASCADE,
        receipt_date DATE NOT NULL,
        supplier_id UUID NOT NULL REFERENCES suppliers(id),
        warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE goods_receipt_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        goods_receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
        purchase_invoice_line_id UUID NOT NULL REFERENCES purchase_invoice_lines(id),
        product_id UUID NOT NULL REFERENCES products(id),
        qty_base_unit NUMERIC(16,4) NOT NULL,
        unit_cost NUMERIC(16,4) NOT NULL DEFAULT 0,
        stock_movement_id UUID NOT NULL REFERENCES stock_movements(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (qty_base_unit > 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_goods_receipt_lines_receipt ON goods_receipt_lines (goods_receipt_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_goods_receipt_lines_receipt;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS goods_receipt_lines;`);
    await queryRunner.query(`DROP TABLE IF EXISTS goods_receipts;`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_invoice_lines_product;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_invoice_lines_invoice;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_invoice_lines;`);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS purchase_invoices_set_updated_at ON purchase_invoices;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_invoices_review_status;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_invoices_receipt_date;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_invoices_supplier;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_invoices;`);

    await queryRunner.query(
      `DROP TYPE IF EXISTS purchase_invoice_review_status;`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS purchase_invoice_print_status;`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS purchase_invoice_posting_status;`,
    );
  }
}
