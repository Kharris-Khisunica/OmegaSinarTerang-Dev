import { MigrationInterface, QueryRunner } from 'typeorm';

// Hari 32A tugas 2 — DUA akun baru genuinely (TIDAK ada di 108 akun Hari
// 17A/1785080602948, dicek dulu lewat SELECT sebelum menulis migration ini,
// lihat catatan docs/PROMPTS_HARIAN.md "Hari 32A"): ongkos kirim pembelian
// dan ongkos bongkar barang masuk (CLAUDE.md §3 "Biaya Operasional") TIDAK
// dikapitalisasi ke harga pokok — keduanya masuk biaya operasional biasa,
// kode lanjutan setelah 06.110.00009. Kolom+pola INSERT identik
// 1785080602948 langkah 4 (Kas/Bank + akun lain).
export class AddFreightAndUnloadingExpenseAccounts1785080602973 implements MigrationInterface {
  name = 'AddFreightAndUnloadingExpenseAccounts1785080602973';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO chart_of_accounts
        (code, name, account_type, parent_id, is_cash_account, is_active, normal_balance, account_subtype, is_postable, requires_outflow_approval)
      VALUES
        ('06.110.00010', 'B. Ongkos Kirim Pembelian', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.110.00000'), false, true, 'DEBIT', 'SELLING_EXPENSE', true, false),
        ('06.110.00011', 'B. Bongkar Barang Masuk', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.110.00000'), false, true, 'DEBIT', 'SELLING_EXPENSE', true, false);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM chart_of_accounts WHERE code IN ('06.110.00010', '06.110.00011');
    `);
  }
}
