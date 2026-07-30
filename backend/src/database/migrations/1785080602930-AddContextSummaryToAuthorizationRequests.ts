import { MigrationInterface, QueryRunner } from 'typeorm';

// context_summary (CLAUDE.md §19) — kalimat yang dibaca Supervisor/Master di
// layar approval, mis. "VOID faktur JL/RM01-26070042 ke Toko Makmur,
// Rp 4.250.000". Ditambah NOT NULL tanpa default permanen (pola sama seperti
// `payload`) supaya setiap authorization_request baru wajib menyertakannya
// secara eksplisit dari aplikasi — dua langkah (ADD nullable -> backfill ->
// SET NOT NULL) dipakai supaya migration ini aman dijalankan di DB yang sudah
// punya baris lama tanpa kolom ini.
export class AddContextSummaryToAuthorizationRequests1785080602930 implements MigrationInterface {
  name = 'AddContextSummaryToAuthorizationRequests1785080602930';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE authorization_requests ADD COLUMN context_summary TEXT;
    `);
    await queryRunner.query(`
      UPDATE authorization_requests SET context_summary = '' WHERE context_summary IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE authorization_requests ALTER COLUMN context_summary SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE authorization_requests DROP COLUMN IF EXISTS context_summary;
    `);
  }
}
