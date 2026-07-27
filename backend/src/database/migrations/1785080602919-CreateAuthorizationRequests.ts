import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthorizationRequests1785080602919 implements MigrationInterface {
  name = 'CreateAuthorizationRequests1785080602919';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE authorization_request_status AS ENUM (
        'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'EXECUTED'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE authorization_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_id UUID NOT NULL REFERENCES users(id),
        approver_id UUID REFERENCES users(id),
        action_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        status authorization_request_status NOT NULL DEFAULT 'PENDING',
        reason TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        approved_at TIMESTAMPTZ,
        executed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_authorization_requests_status
      ON authorization_requests(status);
    `);

    await queryRunner.query(`
      CREATE TRIGGER authorization_requests_set_updated_at
      BEFORE UPDATE ON authorization_requests
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS authorization_requests_set_updated_at ON authorization_requests;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_authorization_requests_status;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS authorization_requests;`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS authorization_request_status;`,
    );
  }
}
