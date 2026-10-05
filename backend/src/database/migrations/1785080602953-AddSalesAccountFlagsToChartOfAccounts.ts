import { MigrationInterface, QueryRunner } from 'typeorm';

// Pola persis 1785080602940 (is_input_vat_account) — sisi pembelian sudah
// punya flag singular (is_inventory_account/is_payable_account/
// is_input_vat_account), sisi penjualan (Hari 21) belum. account_subtype
// TIDAK bisa dipakai untuk resolveSingleActive() di sini karena tidak unik
// (mis. CONTRA_REVENUE dipegang baik '04.110.00002' Retur Penjualan maupun
// '04.110.00003' Diskon Penjualan; COGS dipegang baik header '05.110.00000'
// maupun leaf '05.110.00001'/'05.110.00002').
//
// PENTING: kode final di up() RestructureChartOfAccountsV2 (1785080602948)
// TETAP format panjang (GG.KKK.JJJJJ) — blok UPDATE "Kembalikan 13 kode
// lama" (mis. code='4101') yang terlihat di file itu ada di dalam down(),
// bukan up(), jadi TIDAK berlaku di DB hasil migrasi maju. Dikonfirmasi
// langsung dari DB scratch hasil migration:run: akun header "Pendapatan
// Penjualan" (04.110.00000) TIDAK postable — leaf postable-nya adalah
// '04.110.00001' "Penjualan Barang Dagang"; header "Harga Pokok Penjualan"
// (05.110.00000) juga tidak postable — leaf-nya '05.110.00001'.
export class AddSalesAccountFlagsToChartOfAccounts1785080602953 implements MigrationInterface {
  name = 'AddSalesAccountFlagsToChartOfAccounts1785080602953';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
      ADD COLUMN is_revenue_account BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN is_sales_discount_account BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN is_cogs_account BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN is_output_vat_account BOOLEAN NOT NULL DEFAULT false;
    `);
    await queryRunner.query(
      `UPDATE chart_of_accounts SET is_revenue_account = true WHERE code = '04.110.00001';`,
    );
    await queryRunner.query(
      `UPDATE chart_of_accounts SET is_sales_discount_account = true WHERE code = '04.110.00003';`,
    );
    await queryRunner.query(
      `UPDATE chart_of_accounts SET is_cogs_account = true WHERE code = '05.110.00001';`,
    );
    await queryRunner.query(
      `UPDATE chart_of_accounts SET is_output_vat_account = true WHERE code = '02.110.00022';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
      DROP COLUMN is_revenue_account,
      DROP COLUMN is_sales_discount_account,
      DROP COLUMN is_cogs_account,
      DROP COLUMN is_output_vat_account;
    `);
  }
}
