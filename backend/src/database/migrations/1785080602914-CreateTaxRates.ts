import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTaxRates1785080602914 implements MigrationInterface {
  name = 'CreateTaxRates1785080602914';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE tax_rates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        rate NUMERIC(5,2) NOT NULL,
        effective_from DATE NOT NULL,
        effective_to DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TRIGGER tax_rates_set_updated_at
      BEFORE UPDATE ON tax_rates
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS tax_rates_set_updated_at ON tax_rates;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS tax_rates;`);
  }
}
