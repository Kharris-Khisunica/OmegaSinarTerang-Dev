import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSetUpdatedAtFunction1785080602906 implements MigrationInterface {
  name = 'CreateSetUpdatedAtFunction1785080602906';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS set_updated_at();`);
  }
}
