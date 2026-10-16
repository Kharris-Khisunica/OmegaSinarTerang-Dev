import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum KasbonRepaymentPostingStatus {
  POSTED = 'POSTED',
  VOIDED = 'VOIDED',
}

// Pelunasan Kasbon (need_fixing.md #26) — setoran tunai satu pekerja ke Kas
// Kecil, melunasi (sebagian) kasbon yang dicatat sebagai baris Biaya
// Operasional berakun Piutang Karyawan (CLAUDE.md §3 "Biaya Operasional").
// Tidak ikut kunci cetak §2.16 & Laporan Kontinuitas (pola cash_transfers).
@Entity('kasbon_repayments')
export class KasbonRepayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_number', unique: true })
  documentNumber: string;

  @Column({ name: 'repayment_date', type: 'date' })
  repaymentDate: string;

  @Column({ name: 'worker_id', type: 'uuid' })
  workerId: string;

  @Column({ name: 'cash_account_id', type: 'uuid' })
  cashAccountId: string;

  @Column({ type: 'numeric', precision: 16, scale: 2 })
  amount: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({
    name: 'posting_status',
    type: 'enum',
    enum: KasbonRepaymentPostingStatus,
    enumName: 'kasbon_repayment_posting_status',
    default: KasbonRepaymentPostingStatus.POSTED,
  })
  postingStatus: KasbonRepaymentPostingStatus;

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
}
