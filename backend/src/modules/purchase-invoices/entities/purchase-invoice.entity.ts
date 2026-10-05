import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PurchaseInvoiceLine } from './purchase-invoice-line.entity';

export enum PurchaseInvoicePostingStatus {
  POSTED = 'POSTED',
  VOIDED = 'VOIDED',
}

export enum PurchaseInvoicePrintStatus {
  NOT_PRINTED = 'NOT_PRINTED',
  PRINTED = 'PRINTED',
  PRINT_CANCELLED = 'PRINT_CANCELLED',
}

export enum PurchaseInvoiceReviewStatus {
  BELUM_DICEK = 'BELUM_DICEK',
  DISETUJUI = 'DISETUJUI',
  BERMASALAH = 'BERMASALAH',
}

@Entity('purchase_invoices')
export class PurchaseInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'invoice_number', unique: true })
  invoiceNumber: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  // Opsional sejak paket R7 (asumsi A3, migration 1785080602968) — supplier
  // tidak selalu menerbitkan nota bernomor. Kalau ada, tetap satu-satunya
  // pegangan rekonsiliasi (CLAUDE.md §3 "Pembelian").
  @Column({ name: 'supplier_invoice_no', type: 'varchar', nullable: true })
  supplierInvoiceNo: string | null;

  // -> lot_date FIFO (CLAUDE.md §3 "Pembelian"). BUKAN supplier_invoice_date.
  @Column({ name: 'receipt_date', type: 'date' })
  receiptDate: string;

  // Dasar hitung jatuh tempo — BUKAN dipakai untuk lot_date.
  @Column({ name: 'supplier_invoice_date', type: 'date' })
  supplierInvoiceDate: string;

  // = supplier_invoice_date + term_days, BUKAN receipt_date + term_days.
  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({ name: 'term_days', default: 0 })
  termDays: number;

  @Column({ type: 'numeric', precision: 16, scale: 2 })
  subtotal: string;

  @Column({
    name: 'line_discount_total',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  lineDiscountTotal: string;

  @Column({
    name: 'invoice_discount_amount',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  invoiceDiscountAmount: string;

  @Column({
    name: 'invoice_discount_percent',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  invoiceDiscountPercent: string | null;

  @Column({
    name: 'input_vat_amount',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  inputVatAmount: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 16, scale: 2 })
  totalAmount: string;

  @Column({
    name: 'posting_status',
    type: 'enum',
    enum: PurchaseInvoicePostingStatus,
    enumName: 'purchase_invoice_posting_status',
    default: PurchaseInvoicePostingStatus.POSTED,
  })
  postingStatus: PurchaseInvoicePostingStatus;

  // Kolom disiapkan untuk mekanisme kunci-cetak generik Hari 15 (CLAUDE.md
  // §2.16) — belum ada logic yang mengubahnya hari ini.
  @Column({
    name: 'print_status',
    type: 'enum',
    enum: PurchaseInvoicePrintStatus,
    enumName: 'purchase_invoice_print_status',
    default: PurchaseInvoicePrintStatus.NOT_PRINTED,
  })
  printStatus: PurchaseInvoicePrintStatus;

  @Column({ name: 'print_count', default: 0 })
  printCount: number;

  @Column({ name: 'printed_at', type: 'timestamptz', nullable: true })
  printedAt: Date | null;

  // Naik setiap kali UNLOCK_PRINT intent EDIT dikonsumsi (Hari 15,
  // PrintLockService.consume()) — nota cetak menampilkan "Revisi N" bila > 0
  // (CLAUDE.md §2.16 "Nota hasil revisi wajib mencantumkan nomor revisi").
  @Column({ name: 'revision_number', default: 0 })
  revisionNumber: number;

  // Dipakai Pengecekan Invoice Harian (Hari 22A) lewat GET /purchase-invoices
  // ?reviewStatus=... yang dipakai ulang (KONTEKS_REVISI §2.2) — tidak ada
  // logic penanda otomatis hari ini.
  @Column({
    name: 'review_status',
    type: 'enum',
    enum: PurchaseInvoiceReviewStatus,
    enumName: 'purchase_invoice_review_status',
    default: PurchaseInvoiceReviewStatus.BELUM_DICEK,
  })
  reviewStatus: PurchaseInvoiceReviewStatus;

  // Diisi PATCH /:id/review (Hari 22A) — HANYA lewat
  // PurchaseInvoicesService.review(), tidak pernah lewat update() (supervisor
  // tidak pernah menulis isi faktur, CLAUDE.md §5).
  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote: string | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  // Kolom skema saja — diisi Payment module (Hari 26-27) saat selisih
  // pelunasan > Rp 10.000 (CLAUDE.md §2.18). Tidak ada logic yang mengisinya
  // hari ini.
  @Column({ name: 'payment_discrepancy_flagged', default: false })
  paymentDiscrepancyFlagged: boolean;

  // Teks bebas, BUKAN enum (keputusan user 29/30 Jul, CLAUDE.md §2 poin 4) —
  // belum ada jalur yang mengisinya hari ini (VOID Hari 15/16).
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

  @OneToMany(() => PurchaseInvoiceLine, (line) => line.purchaseInvoice)
  lines: PurchaseInvoiceLine[];
}
