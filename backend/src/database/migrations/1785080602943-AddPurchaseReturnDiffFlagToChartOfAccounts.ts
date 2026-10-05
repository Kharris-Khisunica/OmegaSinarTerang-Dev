import { MigrationInterface, QueryRunner } from 'typeorm';

// Retur Pembelian (Hari 16, CLAUDE.md §4 "Retur Pembelian") butuh meresolve
// akun "Selisih Retur Pembelian" (kode 5104, sudah di-seed
// 1785080602922-CleanupChartOfAccountsSeed) tanpa hardcode kode akun — pola
// identik 1785080602940-AddInputVatFlagToChartOfAccounts (flag + UPDATE satu
// baris), dipakai lewat AccountResolverService.resolveSingleActive() yang
// sudah ada, tidak ada service baru.
export class AddPurchaseReturnDiffFlagToChartOfAccounts1785080602943 implements MigrationInterface {
  name = 'AddPurchaseReturnDiffFlagToChartOfAccounts1785080602943';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
      ADD COLUMN is_purchase_return_diff_account BOOLEAN NOT NULL DEFAULT false;
    `);
    await queryRunner.query(
      `UPDATE chart_of_accounts SET is_purchase_return_diff_account = true WHERE code = '5104';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
      DROP COLUMN is_purchase_return_diff_account;
    `);
  }
}
