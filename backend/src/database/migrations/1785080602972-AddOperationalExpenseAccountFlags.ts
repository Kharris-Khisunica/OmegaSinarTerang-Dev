import { MigrationInterface, QueryRunner } from 'typeorm';

// Hari 32A tugas 1 (docs/PROMPTS_HARIAN.md, diserap paket R10) — DUA FLAG
// BARU di chart_of_accounts, BUKAN migration akun baru (akunnya sudah ada
// sejak Hari 17A/1785080602948). Pola sama flag singleton yang sudah ada
// (is_payment_diff_account dkk, 1785080602962) — plain boolean column, TIDAK
// masuk daftar SINGULAR_FLAGS di chart-of-accounts.service.ts karena
// keduanya (beda dari is_payment_diff_account) tidak pernah di-resolve
// tunggal lewat AccountResolverService.resolveSingleActive() — dipakai untuk
// MEMVALIDASI akun yang sudah dipilih (pola sama is_receivable_account, yang
// juga sengaja di luar SINGULAR_FLAGS).
//
// restricted_to_master: dropdown "Akun Biaya" OPERATOR (findExpenseAccounts)
// wajib menyaring akun ini keluar — B. Gaji Salesman hanya boleh dipilih
// MASTER (gaji salesman bukan urusan operator harian).
// is_employee_receivable_account: menggerbangi Kasbon — satu-satunya akun
// ASSET yang boleh lolos validasi createLine() selain EXPENSE murni
// (docs/PERTANYAAN_KLIEN_BIAYA_OPERASIONAL.md, jawaban 05 Sep — Kasbon
// karyawan dicatat di baris Biaya Operasional meski akunnya Piutang).
export class AddOperationalExpenseAccountFlags1785080602972 implements MigrationInterface {
  name = 'AddOperationalExpenseAccountFlags1785080602972';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
      ADD COLUMN restricted_to_master BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN is_employee_receivable_account BOOLEAN NOT NULL DEFAULT false;
    `);
    await queryRunner.query(
      `UPDATE chart_of_accounts SET restricted_to_master = true WHERE code = '06.110.00001';`,
    );
    await queryRunner.query(
      `UPDATE chart_of_accounts SET is_employee_receivable_account = true WHERE code = '01.120.00002';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
      DROP COLUMN is_employee_receivable_account,
      DROP COLUMN restricted_to_master;
    `);
  }
}
