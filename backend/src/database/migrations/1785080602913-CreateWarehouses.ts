import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWarehouses1785080602913 implements MigrationInterface {
  name = 'CreateWarehouses1785080602913';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE warehouse_type AS ENUM ('STORE', 'CUSTOMER_CONSIGNMENT', 'BAD_STOCK');
    `);

    await queryRunner.query(`
      CREATE TABLE warehouses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(150) NOT NULL,
        warehouse_type warehouse_type NOT NULL,
        customer_id UUID REFERENCES customers(id),
        is_default BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT chk_warehouse_consignment_customer CHECK (
          (warehouse_type = 'CUSTOMER_CONSIGNMENT' AND customer_id IS NOT NULL)
          OR (warehouse_type != 'CUSTOMER_CONSIGNMENT' AND customer_id IS NULL)
        )
      );
    `);

    await queryRunner.query(`
      CREATE TRIGGER warehouses_set_updated_at
      BEFORE UPDATE ON warehouses
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS warehouses_set_updated_at ON warehouses;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS warehouses;`);
    await queryRunner.query(`DROP TYPE IF EXISTS warehouse_type;`);
  }
}
