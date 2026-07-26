import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChartOfAccounts1785080602909 implements MigrationInterface {
  name = 'CreateChartOfAccounts1785080602909';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE account_type AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');
    `);

    await queryRunner.query(`
      CREATE TABLE chart_of_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        account_type account_type NOT NULL,
        parent_id UUID REFERENCES chart_of_accounts(id),
        is_cash_account BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TRIGGER chart_of_accounts_set_updated_at
      BEFORE UPDATE ON chart_of_accounts
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      INSERT INTO chart_of_accounts (code, name, account_type, is_cash_account) VALUES
      ('1101', 'Persediaan', 'ASSET', false),
      ('1102', 'Piutang Usaha', 'ASSET', false),
      ('1103', 'PPN Masukan', 'ASSET', false),
      ('2101', 'Hutang Usaha', 'LIABILITY', false),
      ('2102', 'PPN Keluaran', 'LIABILITY', false),
      ('3101', 'Modal', 'EQUITY', false),
      ('4101', 'Pendapatan Penjualan', 'INCOME', false),
      ('4102', 'Pendapatan Pembulatan', 'INCOME', false),
      ('4103', 'Retur Penjualan', 'INCOME', false),
      ('5101', 'HPP', 'EXPENSE', false),
      ('5102', 'Biaya Operasional', 'EXPENSE', false);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS chart_of_accounts_set_updated_at ON chart_of_accounts;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS chart_of_accounts;`);
    await queryRunner.query(`DROP TYPE IF EXISTS account_type;`);
  }
}
