import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSalesmen1785080602926 implements MigrationInterface {
  name = 'CreateSalesmen1785080602926';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE salesmen (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TRIGGER salesmen_set_updated_at
      BEFORE UPDATE ON salesmen
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS salesmen_set_updated_at ON salesmen;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS salesmen;`);
  }
}
