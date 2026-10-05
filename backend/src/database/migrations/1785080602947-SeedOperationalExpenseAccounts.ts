import { MigrationInterface, QueryRunner } from 'typeorm';

// Biaya Operasional (Hari 17) — daftar akun 08.xxx nyata dari Affari BELUM
// didapat (docs/PERTANYAAN_KLIEN_BIAYA_OPERASIONAL.md §2, jawaban tidak
// berarti: "sd"/"asd"). Ini DEFAULT eksplisit yang ditulis dokumen itu
// sendiri: 11 akun EXPENSE generik di seri baru 52xx (lanjut dari 5104,
// akun terakhir di 1785080602922-CleanupChartOfAccountsSeed), MASTER
// memperbaikinya sendiri lewat CRUD COA Hari 18 sebelum cut-over. Akun lama
// 5102 "Biaya Operasional" TIDAK dihapus — tetap fallback generik.
//
// 5201 dan 5202 mewakili dua kebutuhan yang SUDAH PASTI hari ini (task
// prompt): gaji harian tukang angkut & ongkos kirim pembelian (tidak
// dikapitalisasi ke harga pokok, CLAUDE.md §3 "Pembelian").
export class SeedOperationalExpenseAccounts1785080602947 implements MigrationInterface {
  name = 'SeedOperationalExpenseAccounts1785080602947';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO chart_of_accounts (code, name, account_type, is_cash_account) VALUES
      ('5201', 'Gaji Harian Tukang Angkut', 'EXPENSE', false),
      ('5202', 'Ongkos Kirim Pembelian', 'EXPENSE', false),
      ('5203', 'BBM & Transportasi', 'EXPENSE', false),
      ('5204', 'Parkir & Retribusi', 'EXPENSE', false),
      ('5205', 'Angkut/Bongkar Muat', 'EXPENSE', false),
      ('5206', 'Listrik & Air', 'EXPENSE', false),
      ('5207', 'Telepon & Internet', 'EXPENSE', false),
      ('5208', 'Sewa', 'EXPENSE', false),
      ('5209', 'Perlengkapan Kantor', 'EXPENSE', false),
      ('5210', 'Perbaikan & Pemeliharaan', 'EXPENSE', false),
      ('5211', 'Biaya Operasional Lain-lain', 'EXPENSE', false);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM chart_of_accounts
      WHERE code IN ('5201','5202','5203','5204','5205','5206','5207','5208','5209','5210','5211');
    `);
  }
}
