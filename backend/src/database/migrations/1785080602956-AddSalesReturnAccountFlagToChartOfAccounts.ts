import { MigrationInterface, QueryRunner } from 'typeorm';

// Retur Penjualan (Hari 23, CLAUDE.md §3 "Akun (COA)": "Akun Retur Penjualan
// TETAP ADA (kontra pendapatan)") butuh meresolve akun itu tanpa hardcode kode
// akun — pola identik 1785080602943-AddPurchaseReturnDiffFlagToChartOfAccounts
// (flag + UPDATE satu baris). account_subtype CONTRA_REVENUE tidak unik
// (dipegang juga oleh '04.110.00003' Diskon Penjualan, lihat komentar
// 1785080602953), jadi perlu flag singular sendiri. Akun "Retur Penjualan"
// sudah di-seed sebagai '04.110.00002' oleh RestructureChartOfAccountsV2
// (1785080602948).
export class AddSalesReturnAccountFlagToChartOfAccounts1785080602956 implements MigrationInterface {
  name = 'AddSalesReturnAccountFlagToChartOfAccounts1785080602956';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
      ADD COLUMN is_sales_return_account BOOLEAN NOT NULL DEFAULT false;
    `);
    await queryRunner.query(
      `UPDATE chart_of_accounts SET is_sales_return_account = true WHERE code = '04.110.00002';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
      DROP COLUMN is_sales_return_account;
    `);
  }
}
