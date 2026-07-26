import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSettings1785080602915 implements MigrationInterface {
  name = 'CreateSettings1785080602915';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        value_type VARCHAR(20) NOT NULL CHECK (value_type IN ('BOOLEAN', 'NUMBER', 'STRING')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TRIGGER settings_set_updated_at
      BEFORE UPDATE ON settings
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      INSERT INTO settings (key, value, value_type) VALUES
      ('company_is_pkp', 'false', 'BOOLEAN'),
      ('rounding_multiple', '100', 'NUMBER'),
      ('tax_calculation_mode', 'EXCLUDE', 'STRING'),
      ('backdate_max_days', '2', 'NUMBER');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS settings_set_updated_at ON settings;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS settings;`);
  }
}
