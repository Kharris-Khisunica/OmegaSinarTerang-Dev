import { MigrationInterface, QueryRunner } from 'typeorm';

// Payment (Hari 27, CLAUDE.md §2.18 "Selisih Pembayaran") butuh meresolve akun
// "Selisih Pembayaran" tanpa hardcode kode akun — pola identik
// 1785080602943-AddPurchaseReturnDiffFlagToChartOfAccounts (flag + UPDATE satu
// baris), dipakai lewat AccountResolverService.resolveSingleActive() yang sudah
// ada, tidak ada service baru.
//
// Kode akun ini SUDAH BERUBAH dua kali sebelum migration ini jalan: seed awal
// 1785080602922 pakai '5103', lalu 1785080602948 (RestructureChartOfAccountsV2)
// merestrukturisasi ke '07.210.00004' — dan migration INI (602962) jalan
// SETELAH 602948, jadi kodenya SUDAH '07.210.00004' di titik ini, BUKAN '5103'
// lagi (kode pendek itu cuma muncul lagi di blok down() 602948 untuk rollback,
// bukan status hidup). Dikonfirmasi lewat migration:run + SELECT langsung di
// omega_dev sebelum menulis WHERE ini — pelajaran dari catatan PROGRESS.md
// Hari 21 (draft migration COA lain pernah salah pakai kode dari blok down()).
export class AddPaymentDiffFlagToChartOfAccounts1785080602962 implements MigrationInterface {
  name = 'AddPaymentDiffFlagToChartOfAccounts1785080602962';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
      ADD COLUMN is_payment_diff_account BOOLEAN NOT NULL DEFAULT false;
    `);
    await queryRunner.query(
      `UPDATE chart_of_accounts SET is_payment_diff_account = true WHERE code = '07.210.00004';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
      DROP COLUMN is_payment_diff_account;
    `);
  }
}
