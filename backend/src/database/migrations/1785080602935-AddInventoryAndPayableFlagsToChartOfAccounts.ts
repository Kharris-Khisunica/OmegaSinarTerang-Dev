import { MigrationInterface, QueryRunner } from 'typeorm';

// Pola persis 1785080602917 (is_receivable_account) — kali ini untuk
// Persediaan dan Hutang Usaha. Dipakai JournalManualService untuk menolak
// baris jurnal manual yang menyentuh akun bersub-ledger (CLAUDE.md §5) dan
// OpeningBalanceService untuk resolve akun tujuan tanpa hardcode kode akun.
export class AddInventoryAndPayableFlagsToChartOfAccounts1785080602935 implements MigrationInterface {
  name = 'AddInventoryAndPayableFlagsToChartOfAccounts1785080602935';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
      ADD COLUMN is_inventory_account BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN is_payable_account BOOLEAN NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      UPDATE chart_of_accounts SET is_inventory_account = true WHERE code = '1101';
    `);
    await queryRunner.query(`
      UPDATE chart_of_accounts SET is_payable_account = true WHERE code = '2101';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
      DROP COLUMN is_inventory_account,
      DROP COLUMN is_payable_account;
    `);
  }
}
