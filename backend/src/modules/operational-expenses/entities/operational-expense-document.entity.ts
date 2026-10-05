import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OperationalExpenseLine } from './operational-expense-line.entity';

// Pengecekan Invoice Harian untuk Biaya Operasional (Hari 32A, migration
// 1785080602976) — pola PERSIS SalesInvoiceReviewStatus/
// CashTransferReviewStatus. Beda konsekuensi dari dua itu (CLAUDE.md §3
// "Biaya Operasional"): sesudah DISETUJUI, koreksi BARIS wajib VOID + jurnal
// pembalik, PATCH lines/:lineId ditolak 400.
export enum OperationalExpenseDocumentReviewStatus {
  BELUM_DICEK = 'BELUM_DICEK',
  DISETUJUI = 'DISETUJUI',
  BERMASALAH = 'BERMASALAH',
}

// Satu bukti (`KK/RM01-YYMMXXXX`) per HARI KALENDER (expense_date UNIQUE) —
// baris ditambahkan ke bukti yang sama sepanjang hari lewat request
// terpisah-pisah (docs/PERTANYAAN_KLIEN_BIAYA_OPERASIONAL.md §1, jawaban
// klien "ditambahkan ke bukti yang sama"). Tidak ada total_amount
// didenormalisasi — dihitung SUM(amount) baris POSTED saat baca.
@Entity('operational_expense_documents')
export class OperationalExpenseDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_number', unique: true })
  documentNumber: string;

  @Column({ name: 'expense_date', type: 'date', unique: true })
  expenseDate: string;

  // Sumber kas satu bukti = satu akun (Kas Kecil/Toko/Besar), tetap sama
  // sepanjang hari itu — divalidasi di service saat baris baru ditambahkan
  // ke bukti yang sudah ada (CreateOperationalExpenseLineDto.cashAccountId
  // wajib cocok).
  @Column({ name: 'cash_account_id', type: 'uuid' })
  cashAccountId: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  // Diisi PATCH /:id/review — HANYA lewat OperationalExpensesService.review(),
  // pola sama SalesInvoicesService.review()/CashTransfersService.review().
  @Column({
    name: 'review_status',
    type: 'enum',
    enum: OperationalExpenseDocumentReviewStatus,
    enumName: 'operational_expense_document_review_status',
    default: OperationalExpenseDocumentReviewStatus.BELUM_DICEK,
  })
  reviewStatus: OperationalExpenseDocumentReviewStatus;

  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote: string | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => OperationalExpenseLine, (line) => line.document)
  lines: OperationalExpenseLine[];
}
