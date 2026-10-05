import { MigrationInterface, QueryRunner } from 'typeorm';

// Hari 32A tugas 4 — dua kolom FK nullable baru di operational_expense_lines:
// worker_id (Gaji Tukang Angkut & Kasbon) dan vehicle_id (BBM/Servis-Suku
// Cadang/Pajak-Perizinan Kendaraan, akun 06.110.00006/07/08). Validasi TIDAK
// memaksa keduanya wajib diisi di service (keputusan FE: tampilkan field
// kalau akunnya cocok) — backend cukup terima kalau ada.
export class AddWorkerAndVehicleToOperationalExpenseLines1785080602975 implements MigrationInterface {
  name = 'AddWorkerAndVehicleToOperationalExpenseLines1785080602975';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE operational_expense_lines
      ADD COLUMN worker_id UUID REFERENCES workers(id),
      ADD COLUMN vehicle_id UUID REFERENCES vehicles(id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE operational_expense_lines
      DROP COLUMN vehicle_id,
      DROP COLUMN worker_id;
    `);
  }
}
