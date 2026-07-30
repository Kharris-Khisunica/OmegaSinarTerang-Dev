import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Master satuan jual/beli (DUS, RENCENG, SACHET, ...) — CLAUDE.md §3.
// TIDAK dipakai untuk UoM kemasan deskriptif (gr/ml/kg) di nama produk;
// dua konsep itu sengaja tidak boleh tertukar.
@Entity('units')
export class Unit {
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
