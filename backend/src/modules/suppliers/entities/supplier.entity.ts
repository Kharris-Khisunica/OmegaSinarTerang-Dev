import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'display_code', unique: true })
  displayCode: string;

  @Column()
  name: string;

  @Column({ name: 'contact_phone', nullable: true, type: 'varchar' })
  contactPhone: string | null;

  @Column({ name: 'contact_address', nullable: true, type: 'text' })
  contactAddress: string | null;

  // Menggerbangi PPN masukan bersama products.is_bkp (CLAUDE.md §2.11) —
  // PPN masukan hanya dihitung kalau supplier.is_pkp DAN product.is_bkp.
  @Column({ name: 'is_pkp', default: false })
  isPkp: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
