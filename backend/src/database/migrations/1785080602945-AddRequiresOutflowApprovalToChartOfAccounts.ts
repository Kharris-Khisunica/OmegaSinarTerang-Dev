import { MigrationInterface, QueryRunner } from 'typeorm';

// Modul Biaya Operasional (Hari 17, CLAUDE.md §5 "Pengeluaran kas besar") butuh
// menandai akun kas mana yang wajib step-up sebelum dipakai — MASTER mencentang
// akun Kas Besar lewat CRUD COA (baru penuh Hari 18; sampai saat itu kolom ini
// hanya bisa diisi lewat SQL langsung, sama seperti gap suppliers.isPkp di
// Hari 14). Default false = kontrol tidur sampai MASTER menyalakannya, bukan
// menyalakan approval untuk semua akun kas begitu kolom ini ada.
export class AddRequiresOutflowApprovalToChartOfAccounts1785080602945 implements MigrationInterface {
  name = 'AddRequiresOutflowApprovalToChartOfAccounts1785080602945';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
      ADD COLUMN requires_outflow_approval BOOLEAN NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
      DROP COLUMN requires_outflow_approval;
    `);
  }
}
