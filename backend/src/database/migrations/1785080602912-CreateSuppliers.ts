import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSuppliers1785080602912 implements MigrationInterface {
  name = 'CreateSuppliers1785080602912';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE SEQUENCE supplier_code_seq;
    `);

    await queryRunner.query(`
      CREATE TABLE suppliers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        display_code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(200) NOT NULL,
        contact_phone VARCHAR(30),
        contact_address TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TRIGGER suppliers_set_updated_at
      BEFORE UPDATE ON suppliers
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS suppliers_set_updated_at ON suppliers;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS suppliers;`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS supplier_code_seq;`);
  }
}
