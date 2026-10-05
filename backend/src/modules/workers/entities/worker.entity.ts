import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Pekerja/Tukang Angkut (Hari 32A, migration 1785080602974). Master kecil,
// pola PERSIS Vehicle/Salesman — orangnya karyawan tetap (klien konfirmasi
// 05 Sep), bukan teks bebas. Dipakai operational_expense_lines.worker_id
// (Gaji Tukang Angkut & Kasbon, CLAUDE.md §3 "Biaya Operasional").
@Entity('workers')
export class Worker {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
