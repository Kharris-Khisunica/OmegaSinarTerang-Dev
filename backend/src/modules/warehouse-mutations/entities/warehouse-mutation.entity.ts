import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WarehouseMutationLine } from './warehouse-mutation-line.entity';

export enum WarehouseMutationType {
  TITIPAN_PELANGGAN = 'TITIPAN_PELANGGAN',
  TRANSFER = 'TRANSFER',
}

export enum WarehouseMutationPostingStatus {
  POSTED = 'POSTED',
  VOIDED = 'VOIDED',
}

export enum WarehouseMutationPrintStatus {
  NOT_PRINTED = 'NOT_PRINTED',
  PRINTED = 'PRINTED',
  PRINT_CANCELLED = 'PRINT_CANCELLED',
}

@Entity('warehouse_mutations')
export class WarehouseMutation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'mutation_number', unique: true })
  mutationNumber: string;

  @Column({ name: 'mutation_date', type: 'date' })
  mutationDate: string;

  @Column({
    name: 'mutation_type',
    type: 'enum',
    enum: WarehouseMutationType,
    enumName: 'warehouse_mutation_type',
  })
  mutationType: WarehouseMutationType;

  @Column({ name: 'from_warehouse_id', type: 'uuid' })
  fromWarehouseId: string;

  @Column({ name: 'to_warehouse_id', type: 'uuid' })
  toWarehouseId: string;

  // WAJIB untuk cabang TITIPAN_PELANGGAN (CLAUDE.md §3 "Gudang", paket R8
  // keputusan K7) — satu dokumen mutasi titipan merujuk tepat satu faktur
  // penjualan. NULL untuk cabang TRANSFER (STORE<->BAD_STOCK), yang tidak
  // memakainya sama sekali. Kewajibannya diperiksa di
  // WarehouseMutationsService.processTitipan(), bukan di skema.
  @Column({ name: 'sales_invoice_id', type: 'uuid', nullable: true })
  salesInvoiceId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({
    name: 'posting_status',
    type: 'enum',
    enum: WarehouseMutationPostingStatus,
    enumName: 'warehouse_mutation_posting_status',
    default: WarehouseMutationPostingStatus.POSTED,
  })
  postingStatus: WarehouseMutationPostingStatus;

  // Kolom disiapkan untuk mekanisme kunci-cetak generik Hari 15 (CLAUDE.md
  // §2.16) — belum ada logic yang mengubahnya hari ini.
  @Column({
    name: 'print_status',
    type: 'enum',
    enum: WarehouseMutationPrintStatus,
    enumName: 'warehouse_mutation_print_status',
    default: WarehouseMutationPrintStatus.NOT_PRINTED,
  })
  printStatus: WarehouseMutationPrintStatus;

  @Column({ name: 'print_count', default: 0 })
  printCount: number;

  @Column({ name: 'printed_at', type: 'timestamptz', nullable: true })
  printedAt: Date | null;

  // Kolom disiapkan untuk kunci-cetak generik (Hari 15, src/core/print-lock/
  // — GD ikut kunci cetak per CLAUDE.md §2.16) — belum ada wiring edit/VOID
  // untuk WAREHOUSE_MUTATION hari ini, jadi kolom ini belum pernah naik.
  @Column({ name: 'revision_number', default: 0 })
  revisionNumber: number;

  // Teks bebas, BUKAN enum (keputusan user 29/30 Jul, CLAUDE.md §2 poin 4) —
  // belum ada jalur yang mengisinya hari ini (VOID mutasi ditunda, lihat
  // catatan di stock-recorder.service.ts).
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

  @OneToMany(() => WarehouseMutationLine, (line) => line.mutation)
  lines: WarehouseMutationLine[];
}
