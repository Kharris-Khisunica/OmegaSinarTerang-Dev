import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJournalEntries1785080602920 implements MigrationInterface {
  name = 'CreateJournalEntries1785080602920';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE journal_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entry_number VARCHAR(30) NOT NULL UNIQUE,
        entry_date DATE NOT NULL,
        description TEXT,
        source_type VARCHAR(100) NOT NULL,
        source_id UUID,
        is_reversal BOOLEAN NOT NULL DEFAULT false,
        reversed_entry_id UUID REFERENCES journal_entries(id),
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_journal_entries_entry_date ON journal_entries (entry_date);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_journal_entries_source ON journal_entries (source_type, source_id);
    `);

    // debit_amount/credit_amount default 0 dipakai bareng CHECK di bawah: baris
    // yang tidak eksplisit mengisi salah satu sisi (mis. lupa) otomatis 0/0 dan
    // DITOLAK constraint, bukan lolos diam-diam sebagai baris kosong.
    await queryRunner.query(`
      CREATE TABLE journal_entry_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
        account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
        debit_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        credit_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        description TEXT,
        line_order INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK ((debit_amount > 0) <> (credit_amount > 0))
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_journal_entry_lines_entry ON journal_entry_lines (journal_entry_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_journal_entry_lines_account ON journal_entry_lines (account_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_journal_entry_lines_account;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_journal_entry_lines_entry;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS journal_entry_lines;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_journal_entries_source;`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_journal_entries_entry_date;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS journal_entries;`);
  }
}
