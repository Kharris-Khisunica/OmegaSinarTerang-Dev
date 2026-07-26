import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProducts1785080602910 implements MigrationInterface {
  name = 'CreateProducts1785080602910';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(200) NOT NULL,
        base_unit VARCHAR(20) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TRIGGER products_set_updated_at
      BEFORE UPDATE ON products
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      CREATE TABLE product_unit_conversions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        unit_name VARCHAR(20) NOT NULL,
        qty_in_base_unit NUMERIC(16,4) NOT NULL,
        level INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (product_id, unit_name)
      );
    `);

    await queryRunner.query(`
      CREATE TRIGGER product_unit_conversions_set_updated_at
      BEFORE UPDATE ON product_unit_conversions
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS product_unit_conversions_set_updated_at ON product_unit_conversions;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS product_unit_conversions;`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS products_set_updated_at ON products;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS products;`);
  }
}
