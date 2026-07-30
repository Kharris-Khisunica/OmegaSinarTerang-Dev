import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupChartOfAccountsSeed1785080602922 implements MigrationInterface {
  name = 'CleanupChartOfAccountsSeed1785080602922';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Pembulatan dicabut (CLAUDE.md §2.10) — akun ini sudah mati. Dicek
    // manual dulu di DB dev sebelum menulis migration ini: 0 baris
    // journal_entry_lines memakainya, jadi aman DIHAPUS (bukan sekadar
    // dinonaktifkan) sesuai instruksi.
    await queryRunner.query(
      `DELETE FROM chart_of_accounts WHERE code = '4102';`,
    );

    // Tiga akun yang dibutuhkan v2/v3 dan belum ada (CLAUDE.md §3):
    // - Diskon Penjualan: kontra pendapatan metode bruto (Hari 21), disatukan
    //   ke seri 4xxx (INCOME) mengikuti pola "Retur Penjualan" (4103) yang
    //   juga kontra-pendapatan bertipe INCOME.
    // - Selisih Pembayaran & Selisih Retur Pembelian: dua arah (bisa jadi
    //   untung atau rugi), tidak pas masuk ASSET/LIABILITY/EQUITY — ditaruh
    //   di seri 5xxx (EXPENSE) sebagai akun "lain-lain" P&L.
    await queryRunner.query(`
      INSERT INTO chart_of_accounts (code, name, account_type, is_cash_account) VALUES
      ('4104', 'Diskon Penjualan', 'INCOME', false),
      ('5103', 'Selisih Pembayaran', 'EXPENSE', false),
      ('5104', 'Selisih Retur Pembelian', 'EXPENSE', false);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM chart_of_accounts WHERE code IN ('4104', '5103', '5104');
    `);

    await queryRunner.query(`
      INSERT INTO chart_of_accounts (code, name, account_type, is_cash_account) VALUES
      ('4102', 'Pendapatan Pembulatan', 'INCOME', false);
    `);
  }
}
