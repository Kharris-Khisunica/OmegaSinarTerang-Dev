import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StockOpnameLine } from './stock-opname-line.entity';

export enum StockOpnameStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  VOIDED = 'VOIDED',
}

// Stok Opname tersimpan (need_fixing.md #25) — lihat komentar migration
// CreateStockOpnames untuk siklus DRAFT -> POSTED -> VOIDED.
@Entity('stock_opnames')
export class StockOpname {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_number', unique: true })
  documentNumber: string;

  @Column({ name: 'count_date', type: 'date' })
  countDate: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({
    type: 'enum',
    enum: StockOpnameStatus,
    enumName: 'stock_opname_status',
    default: StockOpnameStatus.DRAFT,
  })
  status: StockOpnameStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'posted_by', type: 'uuid', nullable: true })
  postedBy: string | null;

  @Column({ name: 'posted_at', type: 'timestamptz', nullable: true })
  postedAt: Date | null;

  @Column({
    name: 'shortage_value',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  shortageValue: string;

  @Column({
    name: 'surplus_value',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  surplusValue: string;

  @Column({ name: 'void_reason_code', type: 'varchar', nullable: true })
  voidReasonCode: string | null;

  @Column({ name: 'void_reason_note', type: 'text', nullable: true })
  voidReasonNote: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => StockOpnameLine, (line) => line.stockOpname)
  lines: StockOpnameLine[];
}
