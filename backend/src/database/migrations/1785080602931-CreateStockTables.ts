import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStockTables1785080602931 implements MigrationInterface {
  name = 'CreateStockTables1785080602931';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE stock_movement_type AS ENUM (
        'purchase', 'sale', 'transfer', 'return_in', 'return_out', 'adjustment', 'opening'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE stock_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id),
        warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        movement_type stock_movement_type NOT NULL,
        qty_base_unit NUMERIC(16,4) NOT NULL,
        unit_cost NUMERIC(16,4) NOT NULL,
        source_type VARCHAR(100) NOT NULL,
        source_id UUID,
        movement_date DATE NOT NULL,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (qty_base_unit <> 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_stock_movements_product_warehouse ON stock_movements (product_id, warehouse_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_stock_movements_source ON stock_movements (source_type, source_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_stock_movements_date ON stock_movements (movement_date);
    `);
    await queryRunner.query(`
      CREATE TRIGGER stock_movements_set_updated_at
      BEFORE UPDATE ON stock_movements
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    // CACHE turunan dari SUM(stock_movements.qty_base_unit), BUKAN sumber
    // kebenaran (CLAUDE.md §2.5) — StockRecorderService.reconcile() membanding-
    // kan keduanya. Boleh negatif (stok minus diizinkan, §2.8).
    await queryRunner.query(`
      CREATE TABLE product_stock_balance (
        product_id UUID NOT NULL REFERENCES products(id),
        warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        qty_base_unit NUMERIC(16,4) NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (product_id, warehouse_id)
      );
    `);
    await queryRunner.query(`
      CREATE TRIGGER product_stock_balance_set_updated_at
      BEFORE UPDATE ON product_stock_balance
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      CREATE TABLE stock_cost_lots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id),
        warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        lot_date DATE NOT NULL,
        qty_in NUMERIC(16,4) NOT NULL,
        qty_remaining NUMERIC(16,4) NOT NULL,
        unit_cost NUMERIC(16,4) NOT NULL,
        supplier_id UUID REFERENCES suppliers(id),
        source_type VARCHAR(100) NOT NULL,
        source_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (qty_in >= 0),
        CHECK (qty_remaining >= 0)
      );
    `);
    // Urutan kolom index PERSIS urutan ORDER BY FIFO (CLAUDE.md §2.7) — lot_date
    // tertua dulu, id sebagai tie-breaker. Dipakai bareng WHERE qty_remaining > 0
    // FOR UPDATE di StockRecorderService.consumeFifo().
    await queryRunner.query(`
      CREATE INDEX idx_stock_cost_lots_fifo ON stock_cost_lots (product_id, warehouse_id, lot_date, id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_stock_cost_lots_supplier ON stock_cost_lots (supplier_id);
    `);
    await queryRunner.query(`
      CREATE TRIGGER stock_cost_lots_set_updated_at
      BEFORE UPDATE ON stock_cost_lots
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    // Append-only (pola journal_entry_lines) — tanpa updated_at/trigger,
    // baris konsumsi tidak pernah di-UPDATE setelah ditulis.
    await queryRunner.query(`
      CREATE TABLE stock_cost_consumptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lot_id UUID NOT NULL REFERENCES stock_cost_lots(id) ON DELETE CASCADE,
        movement_id UUID NOT NULL REFERENCES stock_movements(id) ON DELETE CASCADE,
        qty NUMERIC(16,4) NOT NULL,
        unit_cost NUMERIC(16,4) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (qty > 0)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_stock_cost_consumptions_lot ON stock_cost_consumptions (lot_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_stock_cost_consumptions_movement ON stock_cost_consumptions (movement_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_stock_cost_consumptions_movement;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_stock_cost_consumptions_lot;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS stock_cost_consumptions;`);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS stock_cost_lots_set_updated_at ON stock_cost_lots;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_stock_cost_lots_supplier;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_cost_lots_fifo;`);
    await queryRunner.query(`DROP TABLE IF EXISTS stock_cost_lots;`);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS product_stock_balance_set_updated_at ON product_stock_balance;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS product_stock_balance;`);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS stock_movements_set_updated_at ON stock_movements;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_movements_date;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_movements_source;`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_stock_movements_product_warehouse;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS stock_movements;`);

    await queryRunner.query(`DROP TYPE IF EXISTS stock_movement_type;`);
  }
}
