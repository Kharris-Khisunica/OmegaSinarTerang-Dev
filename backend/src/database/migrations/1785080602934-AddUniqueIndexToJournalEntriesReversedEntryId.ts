import { MigrationInterface, QueryRunner } from 'typeorm';

// Penjaga level-DB terhadap VOID ganda BERSAMAAN (dua request voidDocument()
// pada dokumen yang sama nyaris berbarengan) — pengecekan idempotensi di
// VoidEngineService (SELECT biasa, bukan SELECT ... FOR UPDATE) bisa lolos
// untuk keduanya kalau keduanya membaca sebelum salah satu menulis. Index
// unik parsial ini membuat percobaan kedua GAGAL di level constraint,
// bukan diam-diam membuat dua jurnal pembalik.
export class AddUniqueIndexToJournalEntriesReversedEntryId1785080602934 implements MigrationInterface {
  name = 'AddUniqueIndexToJournalEntriesReversedEntryId1785080602934';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_journal_entries_reversed_entry_id_unique
        ON journal_entries (reversed_entry_id)
        WHERE reversed_entry_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_journal_entries_reversed_entry_id_unique;
    `);
  }
}
