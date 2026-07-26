import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocumentCounters1785080602916 implements MigrationInterface {
  name = 'CreateDocumentCounters1785080602916';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE document_counters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doc_type VARCHAR(50) NOT NULL,
        period VARCHAR(4) NOT NULL,
        last_number INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (doc_type, period)
      );
    `);

    await queryRunner.query(`
      CREATE TRIGGER document_counters_set_updated_at
      BEFORE UPDATE ON document_counters
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS document_counters_set_updated_at ON document_counters;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS document_counters;`);
  }
}
