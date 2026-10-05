import { MigrationInterface, QueryRunner } from 'typeorm';

// Master Pekerja/Tukang Angkut (Hari 32A tugas 3) — pola PERSIS
// Vehicles/Salesmen (kode dari sequence tak-reset, nama, aktif). Orangnya
// karyawan tetap (klien konfirmasi 05 Sep, docs/PERTANYAAN_KLIEN_BIAYA_
// OPERASIONAL.md), jadi layak jadi data bukan teks bebas — dipakai baris
// Gaji Tukang Angkut DAN Kasbon (operational_expense_lines.worker_id,
// migration 1785080602975). Seed 2 baris dari saldo Piutang Karyawan Juli
// (docs/COA_USULAN.md) — MASTER menambah sisanya lewat CRUD.
export class CreateWorkers1785080602974 implements MigrationInterface {
  name = 'CreateWorkers1785080602974';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE workers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TRIGGER workers_set_updated_at
      BEFORE UPDATE ON workers
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`CREATE SEQUENCE worker_code_seq;`);

    await queryRunner.query(`
      INSERT INTO workers (code, name) VALUES
        ('PKR-' || lpad(nextval('worker_code_seq')::text, 3, '0'), 'ICUNG'),
        ('PKR-' || lpad(nextval('worker_code_seq')::text, 3, '0'), 'FIRMAN');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE IF EXISTS worker_code_seq;`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS workers_set_updated_at ON workers;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS workers;`);
  }
}
