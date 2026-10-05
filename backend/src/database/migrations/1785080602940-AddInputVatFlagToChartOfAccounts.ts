import { MigrationInterface, QueryRunner } from 'typeorm';

// Pola persis 1785080602935 (is_inventory_account/is_payable_account) —
// menandai akun PPN Masukan supaya PurchaseInvoicesService bisa resolve
// lewat AccountResolverService tanpa hardcode kode akun (CLAUDE.md §6).
// Kode '1103' (PPN Masukan, ASSET) sudah ada sejak seed COA awal
// (1785080602909) — hanya dipakai nanti kalau settings.company_is_pkp = true
// (cabang yang disiapkan tapi belum aktif hari ini, CLAUDE.md §2.11).
export class AddInputVatFlagToChartOfAccounts1785080602940 implements MigrationInterface {
  name = 'AddInputVatFlagToChartOfAccounts1785080602940';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
      ADD COLUMN is_input_vat_account BOOLEAN NOT NULL DEFAULT false;
    `);
    await queryRunner.query(
      `UPDATE chart_of_accounts SET is_input_vat_account = true WHERE code = '1103';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
      DROP COLUMN is_input_vat_account;
    `);
  }
}
