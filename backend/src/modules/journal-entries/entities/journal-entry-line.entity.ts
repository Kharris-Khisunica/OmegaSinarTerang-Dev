import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChartOfAccount } from '../../chart-of-accounts/entities/chart-of-account.entity';
import { JournalEntry } from './journal-entry.entity';

@Entity('journal_entry_lines')
export class JournalEntryLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'journal_entry_id', type: 'uuid' })
  journalEntryId: string;

  @ManyToOne(() => JournalEntry, (entry) => entry.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'journal_entry_id' })
  journalEntry: JournalEntry;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => ChartOfAccount)
  @JoinColumn({ name: 'account_id' })
  account: ChartOfAccount;

  // NUMERIC(16,2) — dibaca/ditulis sebagai string (konvensi CLAUDE.md §2.14),
  // jangan konversi ke `number` di sini supaya tidak ada presisi float hilang.
  @Column({ name: 'debit_amount', type: 'numeric', precision: 16, scale: 2 })
  debitAmount: string;

  @Column({ name: 'credit_amount', type: 'numeric', precision: 16, scale: 2 })
  creditAmount: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'line_order', type: 'int' })
  lineOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
