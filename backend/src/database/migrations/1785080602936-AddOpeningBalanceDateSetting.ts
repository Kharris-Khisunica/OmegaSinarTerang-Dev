import { MigrationInterface, QueryRunner } from 'typeorm';

// Saldo awal bertanggal cut-over (CLAUDE.md §3 "Saldo Awal") — dibaca oleh
// PeriodLockValidatorService.assertOpeningBalanceDate() dan
// OpeningBalanceService, TIDAK di-hardcode di kode. "Dapat dikonfigurasi"
// (CLAUDE.md) berarti MASTER bisa mengubahnya lewat PATCH /settings/:key
// yang sudah ada, bukan lewat migration baru tiap kali tanggalnya berubah.
export class AddOpeningBalanceDateSetting1785080602936 implements MigrationInterface {
  name = 'AddOpeningBalanceDateSetting1785080602936';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO settings (key, value, value_type) VALUES
      ('opening_balance_date', '2026-09-01', 'STRING');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM settings WHERE key = 'opening_balance_date';
    `);
  }
}
