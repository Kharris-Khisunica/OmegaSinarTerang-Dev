import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsReceivableAccountToChartOfAccounts1785080602917 implements MigrationInterface {
  name = 'AddIsReceivableAccountToChartOfAccounts1785080602917';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
      ADD COLUMN is_receivable_account BOOLEAN NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      UPDATE chart_of_accounts SET is_receivable_account = true WHERE code = '1102';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts DROP COLUMN is_receivable_account;
    `);
  }
}
