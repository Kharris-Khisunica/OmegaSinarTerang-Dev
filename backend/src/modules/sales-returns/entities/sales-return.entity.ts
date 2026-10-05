import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SalesReturnLine } from './sales-return-line.entity';

export enum SalesReturnPostingStatus {
  POSTED = 'POSTED',
  VOIDED = 'VOIDED',
}

export enum SalesReturnPrintStatus {
  NOT_PRINTED = 'NOT_PRINTED',
  PRINTED = 'PRINTED',
  PRINT_CANCELLED = 'PRINT_CANCELLED',
}

export enum SalesReturnSettlementType {
  REDUCE_INVOICE = 'REDUCE_INVOICE',
  CASH = 'CASH',
}

@Entity('sales_returns')
export class SalesReturn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'return_number', unique: true })
  returnNumber: string;

  // WAJIB menunjuk faktur asal (CLAUDE.md §3 "Lain-lain") — beda dari
  // Retur Pembelian yang menunjuk supplier, bukan faktur pembelian tertentu.
  @Column({ name: 'sales_invoice_id', type: 'uuid' })
  salesInvoiceId: string;

  // Didenormalisasi dari faktur asal saat dibuat — dibutuhkan
  // ArAccountResolverService.resolve() dan tag customerId di jurnal (invarian
  // Hari 18, CLAUDE.md §3).
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Column({ name: 'return_date', type: 'date' })
  returnDate: string;

  @Column({
    name: 'settlement_type',
    type: 'enum',
    enum: SalesReturnSettlementType,
    enumName: 'sales_return_settlement_type',
  })
  settlementType: SalesReturnSettlementType;

  // Terisi HANYA kalau settlementType=CASH (CHECK constraint di migration).
  @Column({ name: 'cash_account_id', type: 'uuid', nullable: true })
  cashAccountId: string | null;

  // Hasil prorata dari subtotal/invoice_discount_amount faktur ASLI, bukan
  // renegosiasi (CLAUDE.md §4 "Retur Penjualan") — debit akun "Retur Penjualan".
  @Column({ name: 'dpp_amount', type: 'numeric', precision: 16, scale: 2 })
  dppAmount: string;

  // Prorata dari output_vat_amount faktur asli lewat tarif efektif faktur itu
  // sendiri (bukan tax_rates hari ini) — debit akun "PPN Keluaran".
  @Column({
    name: 'output_vat_amount',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  outputVatAmount: string;

  // dppAmount + outputVatAmount — kredit ke Piutang/Kas. Dipakai juga sebagai
  // dasar validasi kumulatif "retur tidak boleh melebihi total_amount faktur
  // asal" (pengganti paid_amount yang belum ada, Payment module Hari 26-27).
  @Column({ name: 'total_amount', type: 'numeric', precision: 16, scale: 2 })
  totalAmount: string;

  // Σ qty_base_unit x unit_cost_fifo per baris — debit Persediaan / kredit HPP.
  @Column({
    name: 'cost_basis_amount',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  costBasisAmount: string;

  @Column({
    name: 'posting_status',
    type: 'enum',
    enum: SalesReturnPostingStatus,
    enumName: 'sales_return_posting_status',
    default: SalesReturnPostingStatus.POSTED,
  })
  postingStatus: SalesReturnPostingStatus;

  // Kontrak kunci-cetak generik (CLAUDE.md §2.16) — hanya registerPrint()
  // (cetak ulang bebas) di-wire hari ini. Edit/VOID sengaja ditunda (pola
  // sama purchase_returns Hari 16).
  @Column({
    name: 'print_status',
    type: 'enum',
    enum: SalesReturnPrintStatus,
    enumName: 'sales_return_print_status',
    default: SalesReturnPrintStatus.NOT_PRINTED,
  })
  printStatus: SalesReturnPrintStatus;

  @Column({ name: 'print_count', default: 0 })
  printCount: number;

  @Column({ name: 'printed_at', type: 'timestamptz', nullable: true })
  printedAt: Date | null;

  @Column({ name: 'revision_number', default: 0 })
  revisionNumber: number;

  // Belum ada jalur yang mengisinya hari ini — VOID untuk RJ ditunda.
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

  @OneToMany(() => SalesReturnLine, (line) => line.salesReturn)
  lines: SalesReturnLine[];
}
