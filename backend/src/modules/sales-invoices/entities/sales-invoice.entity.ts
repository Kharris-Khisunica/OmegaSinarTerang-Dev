import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SalesChannel } from '../../../common/enums/sales-channel.enum';
import { SalesInvoiceLine } from './sales-invoice-line.entity';

export enum SalesInvoicePostingStatus {
  POSTED = 'POSTED',
  VOIDED = 'VOIDED',
}

export enum SalesInvoicePrintStatus {
  NOT_PRINTED = 'NOT_PRINTED',
  PRINTED = 'PRINTED',
  PRINT_CANCELLED = 'PRINT_CANCELLED',
}

export enum SalesInvoiceReviewStatus {
  BELUM_DICEK = 'BELUM_DICEK',
  DISETUJUI = 'DISETUJUI',
  BERMASALAH = 'BERMASALAH',
}

@Entity('sales_invoices')
export class SalesInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'invoice_number', unique: true })
  invoiceNumber: string;

  @Column({ name: 'invoice_date', type: 'date' })
  invoiceDate: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Column({
    name: 'sales_channel',
    type: 'enum',
    enum: SalesChannel,
    enumName: 'sales_invoice_channel',
  })
  salesChannel: SalesChannel;

  // Wajib terisi untuk salesChannel=PENGIRIMAN, tidak dipakai untuk TOKO —
  // divalidasi SalesOrdersService.assertChannelSalesOrderRequirement()
  // (dibangun & diuji Hari 19), dipanggil dari POST /sales-invoices Hari 21.
  @Column({ name: 'sales_order_id', type: 'uuid', nullable: true })
  salesOrderId: string | null;

  @Column({ name: 'salesman_id', type: 'uuid' })
  salesmanId: string;

  // Diinput PER FAKTUR (CLAUDE.md §3 "Pelanggan & Supplier"), BUKAN dari
  // master pelanggan — nilai default boleh diambil dari faktur terakhir
  // pelanggan itu (logic Hari 21, bukan kolom ini).
  @Column({ name: 'term_days', default: 0 })
  termDays: number;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

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
    name: 'output_vat_amount',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  outputVatAmount: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 16, scale: 2 })
  totalAmount: string;

  @Column({
    name: 'posting_status',
    type: 'enum',
    enum: SalesInvoicePostingStatus,
    enumName: 'sales_invoice_posting_status',
    default: SalesInvoicePostingStatus.POSTED,
  })
  postingStatus: SalesInvoicePostingStatus;

  // Kolom disiapkan untuk mekanisme kunci-cetak generik (CLAUDE.md §2.16) —
  // belum didaftarkan ke PRINT_LOCK_TABLES hari ini, itu Hari 21/22.
  @Column({
    name: 'print_status',
    type: 'enum',
    enum: SalesInvoicePrintStatus,
    enumName: 'sales_invoice_print_status',
    default: SalesInvoicePrintStatus.NOT_PRINTED,
  })
  printStatus: SalesInvoicePrintStatus;

  @Column({ name: 'print_count', default: 0 })
  printCount: number;

  @Column({ name: 'printed_at', type: 'timestamptz', nullable: true })
  printedAt: Date | null;

  @Column({ name: 'revision_number', default: 0 })
  revisionNumber: number;

  // Dipakai Pengecekan Invoice Harian (Hari 22A) lewat GET /sales-invoices
  // ?reviewStatus=... yang dipakai ulang (KONTEKS_REVISI §2.2) — tidak ada
  // logic penanda otomatis hari ini.
  @Column({
    name: 'review_status',
    type: 'enum',
    enum: SalesInvoiceReviewStatus,
    enumName: 'sales_invoice_review_status',
    default: SalesInvoiceReviewStatus.BELUM_DICEK,
  })
  reviewStatus: SalesInvoiceReviewStatus;

  // Diisi PATCH /:id/review (Hari 22A) — HANYA lewat SalesInvoicesService
  // .review(), tidak pernah lewat update() (supervisor tidak pernah menulis
  // isi faktur, CLAUDE.md §5).
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
  // belum ada jalur yang mengisinya hari ini (VOID Hari 22).
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

  @OneToMany(() => SalesInvoiceLine, (line) => line.salesInvoice)
  lines: SalesInvoiceLine[];
}
