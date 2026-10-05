import { MigrationInterface, QueryRunner } from 'typeorm';

// Kolom ini HANYA terisi pada baris reversal (is_reversal=true) yang dibuat
// VoidEngineService (Hari 11) — voided_by/voided_at sengaja TIDAK jadi kolom
// terpisah, cukup pakai created_by/created_at baris reversal itu sendiri
// karena baris reversal ITU SENDIRI adalah peristiwa VOID-nya. Ini melengkapi
// (bukan menggantikan) rencana CLAUDE.md §2.16 yang menaruh void_reason_code/
// void_reason_note di tiap tabel dokumen begitu tabel itu dibuat Hari 14+.
export class AddVoidReasonToJournalEntries1785080602933 implements MigrationInterface {
  name = 'AddVoidReasonToJournalEntries1785080602933';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE journal_entries
        ADD COLUMN void_reason_code VARCHAR(100),
        ADD COLUMN void_reason_note TEXT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE journal_entries
        DROP COLUMN void_reason_note,
        DROP COLUMN void_reason_code;
    `);
  }
}
