import { MigrationInterface, QueryRunner } from 'typeorm';

// Paket R7 (docs/RENCANA_REVISI_TESTING_KLIEN.md §2A, keputusan K6) — diskon
// faktur pembelian TIDAK LAGI larut ke harga pokok (K5): ia jadi baris jurnal
// kredit tersendiri. '07.110.00005 Diskon Pembelian' sejajar
// '07.110.00004 Selisih Retur Pembelian' di bawah '07.110.00000 Pendapatan
// Lain-lain' — pola INSERT disalin persis dari 07.110.00001/00002/00003 di
// 1785080602948-RestructureChartOfAccountsV2.
//
// Flag singleton is_purchase_discount_account (pola sama
// is_payment_diff_account / is_purchase_return_diff_account) supaya
// PurchaseInvoicesService.resolveSingleActive() tidak pernah hardcode kode
// akun — konsisten dengan seluruh resolve akun lain di codebase ini.
export class AddPurchaseDiscountAccount1785080602967 implements MigrationInterface {
  name = 'AddPurchaseDiscountAccount1785080602967';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
      ADD COLUMN is_purchase_discount_account BOOLEAN NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      INSERT INTO chart_of_accounts
        (code, name, account_type, parent_id, is_cash_account, is_active, normal_balance, account_subtype, is_postable, requires_outflow_approval)
      VALUES
        ('07.110.00005', 'Diskon Pembelian', 'INCOME', (SELECT id FROM chart_of_accounts WHERE code = '07.110.00000'), false, true, 'CREDIT', 'OTHER_INCOME', true, false);
    `);

    await queryRunner.query(
      `UPDATE chart_of_accounts SET is_purchase_discount_account = true WHERE code = '07.110.00005';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM chart_of_accounts WHERE code = '07.110.00005';`,
    );
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
      DROP COLUMN is_purchase_discount_account;
    `);
  }
}
