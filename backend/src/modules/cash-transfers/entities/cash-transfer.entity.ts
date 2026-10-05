import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CashTransferPostingStatus {
  POSTED = 'POSTED',
  VOIDED = 'VOIDED',
}

// Approval setelah-fakta (CLAUDE.md §3 "Biaya Operasional") — BUKAN gerbang
// StepUp 412, transaksi jalan dulu lalu ditandai Supervisor/Master di layar
// terpisah, pola sama SalesInvoiceReviewStatus.
export enum CashTransferReviewStatus {
  BELUM_DICEK = 'BELUM_DICEK',
  DISETUJUI = 'DISETUJUI',
  BERMASALAH = 'BERMASALAH',
}

// Pindah Buku Kas (paket R9, `docs/RENCANA_REVISI_TESTING_KLIEN.md` §3 "R9",
// menyerap Hari 32A tugas 7). Pemindahan antar akun kas/bank MILIK SENDIRI —
// SENGAJA TIDAK ikut kunci cetak §2.16 (tidak ada print_status/print_count/
// revision_number di sini) dan TIDAK ikut Laporan Kontinuitas Nomor Dokumen
// (lihat document-continuity-registry.ts), pola sama operational_expense_*.
@Entity('cash_transfers')
export class CashTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_number', unique: true })
  documentNumber: string;

  @Column({ name: 'transfer_date', type: 'date' })
  transferDate: string;

  @Column({ name: 'from_cash_account_id', type: 'uuid' })
  fromCashAccountId: string;

  @Column({ name: 'to_cash_account_id', type: 'uuid' })
  toCashAccountId: string;

  @Column({ type: 'numeric', precision: 16, scale: 2 })
  amount: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({
    name: 'posting_status',
    type: 'enum',
    enum: CashTransferPostingStatus,
    enumName: 'cash_transfer_posting_status',
    default: CashTransferPostingStatus.POSTED,
  })
  postingStatus: CashTransferPostingStatus;

  @Column({
    name: 'review_status',
    type: 'enum',
    enum: CashTransferReviewStatus,
    enumName: 'cash_transfer_review_status',
    default: CashTransferReviewStatus.BELUM_DICEK,
  })
  reviewStatus: CashTransferReviewStatus;

  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote: string | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

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
