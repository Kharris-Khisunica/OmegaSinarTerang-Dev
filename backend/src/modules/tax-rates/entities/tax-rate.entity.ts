import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Tabel sudah ada sejak migration 1785080602914 (Hari 3) tapi belum pernah
// punya entity/service — Faktur Pembelian (Hari 14) adalah konsumen
// pertama, lewat TaxRateResolverService (src/core/tax-rates). Belum ada
// CRUD/admin screen (di luar lingkup hari ini); baris diisi manual lewat
// repository ini sampai ada layar sungguhan.
@Entity('tax_rates')
export class TaxRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  rate: string;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: string;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
