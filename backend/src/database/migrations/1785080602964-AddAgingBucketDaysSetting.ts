import { MigrationInterface, QueryRunner } from 'typeorm';

// Lebar satu bucket umur piutang/hutang (Hari 30, CLAUDE.md §0 "Laporan
// penjualan/piutang/hutang") — dibaca oleh ReceivablesReportService dan
// PayablesReportService tiap request laporan dipanggil (SettingsService,
// bukan angka mati di kode), supaya MASTER bisa mengubahnya lewat
// PATCH /settings/aging_bucket_days tanpa redeploy. Jumlah bucket TETAP 4;
// hanya lebarnya yang dikonfigurasi.
export class AddAgingBucketDaysSetting1785080602964 implements MigrationInterface {
  name = 'AddAgingBucketDaysSetting1785080602964';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO settings (key, value, value_type) VALUES
      ('aging_bucket_days', '30', 'NUMBER');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM settings WHERE key = 'aging_bucket_days';
    `);
  }
}
