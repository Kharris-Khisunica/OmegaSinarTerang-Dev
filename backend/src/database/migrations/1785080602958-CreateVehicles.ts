import { MigrationInterface, QueryRunner } from 'typeorm';

// Master Kendaraan — Hari 24, dipakai Surat Jalan (delivery_orders.vehicle_id)
// membawa kendaraan pengantar. Pola PERSIS Salesman/Agent: kode (sequence
// tak-reset, prefix KND), nama (mis. "B 1234 XY - Truk Engkel"), aktif.
export class CreateVehicles1785080602958 implements MigrationInterface {
  name = 'CreateVehicles1785080602958';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE vehicles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TRIGGER vehicles_set_updated_at
      BEFORE UPDATE ON vehicles
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`CREATE SEQUENCE vehicle_code_seq;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE IF EXISTS vehicle_code_seq;`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS vehicles_set_updated_at ON vehicles;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS vehicles;`);
  }
}
