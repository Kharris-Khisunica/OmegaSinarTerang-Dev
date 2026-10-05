import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hari 17A — Versi B (docs/COA_USULAN.md §0 "Yang membedakan Versi A dan
 * Versi B"). SENGAJA ditaruh DI LUAR src/database/migrations/ — data-source.ts
 * hanya men-glob `src/database/migrations/*.ts`, jadi file ini TIDAK
 * dijalankan oleh `migration:run` sampai klien memilih Versi A atau B
 * (docs/PERTANYAAN_KLIEN_COA.md).
 *
 * Kalau klien memilih Versi B: PINDAHKAN file ini ke src/database/migrations/
 * (rename timestamp bila perlu supaya tetap urut setelah migration terakhir
 * saat itu), lalu jalankan migration:run seperti biasa. Prasyarat:
 * 1785080602948-RestructureChartOfAccountsV2 sudah jalan (kategori
 * 06.120.00000 harus sudah ada sebagai parent).
 *
 * Bedanya dari Versi A cuma 6 baris (1 header kategori + 5 akun jenis) —
 * yang mahal bukan membuatnya, melainkan memindahkan transaksi yang
 * terlanjur masuk ke akun yang salah (Prive) kalau baru diputuskan
 * belakangan. Kalau klien akhirnya memilih Versi B SETELAH ada transaksi
 * nyata yang sudah menjurnal ke 03.110.00002 Prive untuk lima pos ini,
 * migrasi datanya di luar cakupan file ini — perlu jurnal pemindahan
 * manual, bukan sekadar menjalankan migration ini.
 */
export class SeedOwnerExpenseAccountsVersiB1785080602949 implements MigrationInterface {
  name = 'SeedOwnerExpenseAccountsVersiB1785080602949';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    INSERT INTO chart_of_accounts
      (code, name, account_type, parent_id, is_cash_account, is_active, normal_balance, account_subtype, is_postable, requires_outflow_approval)
    VALUES
      ('06.130.00000', 'Beban Pribadi Pemilik', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.000.00000'), false, true, 'DEBIT', 'OWNER_EXPENSE', false, false);
    `);
    await queryRunner.query(`
    INSERT INTO chart_of_accounts
      (code, name, account_type, parent_id, is_cash_account, is_active, normal_balance, account_subtype, is_postable, requires_outflow_approval)
    VALUES
      ('06.130.00001', 'B. Asuransi Jiwa Pemilik', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.130.00000'), false, true, 'DEBIT', 'OWNER_EXPENSE', true, false),
      ('06.130.00002', 'B. Iuran dan Pengelolaan Properti Pemilik', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.130.00000'), false, true, 'DEBIT', 'OWNER_EXPENSE', true, false),
      ('06.130.00003', 'B. Perpuluhan', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.130.00000'), false, true, 'DEBIT', 'OWNER_EXPENSE', true, false),
      ('06.130.00004', 'B. Representasi dan Pergaulan', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.130.00000'), false, true, 'DEBIT', 'OWNER_EXPENSE', true, false),
      ('06.130.00005', 'B. Kartu Kredit Pemilik', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.130.00000'), false, true, 'DEBIT', 'OWNER_EXPENSE', true, false);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM chart_of_accounts WHERE code IN (
        '06.130.00001', '06.130.00002', '06.130.00003', '06.130.00004', '06.130.00005'
      );
    `);
    await queryRunner.query(`
      DELETE FROM chart_of_accounts WHERE code = '06.130.00000';
    `);
  }
}
