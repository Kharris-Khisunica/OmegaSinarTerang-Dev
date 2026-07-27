import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { JournalEntryLine } from './journal-entry-line.entity';

// Tidak ada UpdateDateColumn/trigger set_updated_at dengan sengaja: jurnal
// tidak pernah diubah setelah dibuat (CLAUDE.md §2.1/§2.6) — pembatalan lewat
// jurnal pembalik baru (VoidEngine, Hari 8), bukan UPDATE baris ini.
@Entity('journal_entries')
export class JournalEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entry_number', unique: true })
  entryNumber: string;

  // Disimpan/dibaca sebagai string 'YYYY-MM-DD' (bukan Date) — JournalPosterService
  // yang mengonversi dari Date pemanggil, supaya tidak bergantung konversi
  // timezone implisit driver pg untuk kolom DATE.
  @Column({ name: 'entry_date', type: 'date' })
  entryDate: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'source_type' })
  sourceType: string;

  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId: string | null;

  @Column({ name: 'is_reversal', default: false })
  isReversal: boolean;

  @Column({ name: 'reversed_entry_id', type: 'uuid', nullable: true })
  reversedEntryId: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => JournalEntryLine, (line) => line.journalEntry)
  lines: JournalEntryLine[];
}
