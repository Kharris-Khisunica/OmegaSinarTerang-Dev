import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Payment } from './payment.entity';

export enum PaymentBatchPostingStatus {
  POSTED = 'POSTED',
  VOIDED = 'VOIDED',
}

export enum PaymentBatchPrintStatus {
  NOT_PRINTED = 'NOT_PRINTED',
  PRINTED = 'PRINTED',
  PRINT_CANCELLED = 'PRINT_CANCELLED',
}

// SENGAJA TIDAK ADA customer_id/supplier_id/agent_id/vehicle_id — lihat komentar
// migration 1785080602961 dan KONTEKS_REVISI_2026-07-28.md §2.12. Party
// di-resolve PER BARIS (lihat Payment entity), bukan di header batch.
@Entity('payment_batches')
export class PaymentBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'batch_number', unique: true })
  batchNumber: string;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 16, scale: 2 })
  totalAmount: string;

  @Column({
    name: 'posting_status',
    type: 'enum',
    enum: PaymentBatchPostingStatus,
    enumName: 'payment_batch_posting_status',
    default: PaymentBatchPostingStatus.POSTED,
  })
  postingStatus: PaymentBatchPostingStatus;

  // Kontrak kunci-cetak generik (CLAUDE.md §2.16, PAY salah satu dari 7 dokumen) —
  // belum ada wiring hari ini (pola sama purchase_returns Hari 16).
  @Column({
    name: 'print_status',
    type: 'enum',
    enum: PaymentBatchPrintStatus,
    enumName: 'payment_batch_print_status',
    default: PaymentBatchPrintStatus.NOT_PRINTED,
  })
  printStatus: PaymentBatchPrintStatus;

  @Column({ name: 'print_count', default: 0 })
  printCount: number;

  @Column({ name: 'printed_at', type: 'timestamptz', nullable: true })
  printedAt: Date | null;

  @Column({ name: 'revision_number', default: 0 })
  revisionNumber: number;

  @Column({ name: 'void_reason_code', type: 'varchar', nullable: true })
  voidReasonCode: string | null;

  @Column({ name: 'void_reason_note', type: 'text', nullable: true })
  voidReasonNote: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Koreksi 26 Sep 2026 — TIDAK ADA LAGI relasi methods di sini. Metode
  // pembayaran sekarang per baris faktur (lihat Payment.methods /
  // PaymentMethod), bukan satu pool di level batch.
  @OneToMany(() => Payment, (payment) => payment.paymentBatch)
  payments: Payment[];
}
