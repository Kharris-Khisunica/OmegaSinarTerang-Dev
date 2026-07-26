import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomers1785080602911 implements MigrationInterface {
  name = 'CreateCustomers1785080602911';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(200) NOT NULL,
        phone VARCHAR(30),
        address TEXT,
        is_pkp BOOLEAN NOT NULL DEFAULT false,
        ar_account_id UUID REFERENCES chart_of_accounts(id),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TRIGGER customers_set_updated_at
      BEFORE UPDATE ON customers
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS customers_set_updated_at ON customers;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS customers;`);
  }
}
