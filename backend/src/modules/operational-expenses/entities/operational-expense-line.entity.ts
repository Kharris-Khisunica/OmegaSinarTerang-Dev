import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OperationalExpenseDocument } from './operational-expense-document.entity';

export enum OperationalExpenseLinePostingStatus {
  POSTED = 'POSTED',
  VOIDED = 'VOIDED',
}

// VOID beroperasi per BARIS (sourceId dipakai JournalPosterService/
// VoidEngineService = operational_expense_lines.id), BUKAN per header —
// kontrak VoidEngineService: satu sourceId <-> satu JournalEntry. Kalau
// dipetakan ke header, membatalkan satu baris salah ketik berarti membalik
// seluruh bukti hari itu.
@Entity('operational_expense_lines')
export class OperationalExpenseLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @ManyToOne(() => OperationalExpenseDocument, (doc) => doc.lines)
  @JoinColumn({ name: 'document_id' })
  document: OperationalExpenseDocument;

  @Column({ name: 'line_order' })
  lineOrder: number;

  // Wajib akun bertipe EXPENSE (divalidasi di service) — Piutang/Hutang/
  // Persediaan diblokir eksplisit (docs/PERTANYAAN_KLIEN_BIAYA_OPERASIONAL.md
  // §6: pembayaran supplier adalah modul Pembayaran terpisah, Hari 26-27).
  @Column({ name: 'expense_account_id', type: 'uuid' })
  expenseAccountId: string;

  @Column({ type: 'numeric', precision: 16, scale: 2 })
  amount: string;

  // Teks bebas — menampung nama tukang angkut per baris (docs/
  // PERTANYAAN_KLIEN_BIAYA_OPERASIONAL.md §3, belum jadi master data),
  // catatan ongkir, dsb.
  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Nomor kwitansi fisik, opsional (§11.2 dokumen klien — "nominal saja +
  // keterangan", tanpa lampiran file).
  @Column({ name: 'reference_number', type: 'varchar', nullable: true })
  referenceNumber: string | null;

  // Hari 32A (migration 1785080602975) — dipakai baris Gaji Tukang Angkut &
  // Kasbon (akun is_employee_receivable_account). TIDAK wajib diisi di
  // service — keputusan FE menampilkan field ini hanya kalau akunnya cocok.
  @Column({ name: 'worker_id', type: 'uuid', nullable: true })
  workerId: string | null;

  // Hari 32A (migration 1785080602975) — dipakai baris BBM/Servis dan Suku
  // Cadang/Pajak dan Perizinan Kendaraan (06.110.00006/07/08).
  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId: string | null;

  @Column({
    name: 'posting_status',
    type: 'enum',
    enum: OperationalExpenseLinePostingStatus,
    enumName: 'operational_expense_line_posting_status',
    default: OperationalExpenseLinePostingStatus.POSTED,
  })
  postingStatus: OperationalExpenseLinePostingStatus;

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
