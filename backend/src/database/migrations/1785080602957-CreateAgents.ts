import { MigrationInterface, QueryRunner } from 'typeorm';

// Master Agen (sopir) — Hari 24, CLAUDE.md §1 "sopir adalah orang yang
// menagih dengan nota". Master kecil, pola PERSIS Salesman (Hari 8):
// kode (sequence tak-reset, prefix AGN), nama, aktif. Dipakai Surat Jalan
// (delivery_orders.agent_id) untuk membawa siapa yang mengantar & menagih.
// Rekap setoran agen SUDAH DIPOTONG (28 Juli) — tabel ini TIDAK membawa
// kolom apa pun untuk itu, penggantinya kontrol manual (Hari 28).
export class CreateAgents1785080602957 implements MigrationInterface {
  name = 'CreateAgents1785080602957';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TRIGGER agents_set_updated_at
      BEFORE UPDATE ON agents
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`CREATE SEQUENCE agent_code_seq;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE IF EXISTS agent_code_seq;`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS agents_set_updated_at ON agents;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS agents;`);
  }
}
