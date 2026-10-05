import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PurchaseReturnLine } from './purchase-return-line.entity';

export enum PurchaseReturnPostingStatus {
  POSTED = 'POSTED',
  VOIDED = 'VOIDED',
}

export enum PurchaseReturnPrintStatus {
  NOT_PRINTED = 'NOT_PRINTED',
  PRINTED = 'PRINTED',
  PRINT_CANCELLED = 'PRINT_CANCELLED',
}

// Dikunci di HEADER, bukan per baris — CLAUDE.md §3 "klien tidak pernah
// mencampur satuan dalam satu transaksi". BESAR = satuan besar produk (mis.
// DUS), KECIL = base unit produk (mis. PCS).
export enum PurchaseReturnUnitMode {
  BESAR = 'BESAR',
  KECIL = 'KECIL',
}

export enum PurchaseReturnSettlementType {
  REDUCE_INVOICE = 'REDUCE_INVOICE',
  CASH = 'CASH',
}

@Entity('purchase_returns')
export class PurchaseReturn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'return_number', unique: true })
  returnNumber: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @Column({ name: 'return_date', type: 'date' })
  returnDate: string;

  @Column({
    name: 'unit_mode',
    type: 'enum',
    enum: PurchaseReturnUnitMode,
    enumName: 'purchase_return_unit_mode',
  })
  unitMode: PurchaseReturnUnitMode;

  @Column({
    name: 'settlement_type',
    type: 'enum',
    enum: PurchaseReturnSettlementType,
    enumName: 'purchase_return_settlement_type',
  })
  settlementType: PurchaseReturnSettlementType;

  // Terisi HANYA kalau settlementType=CASH (CHECK constraint di migration).
  // Dipilih eksplisit oleh pemanggil (AccountResolverService.
  // assertAccountHasFlag), bukan auto-resolve — bisa ada >1 akun kas/bank.
  @Column({ name: 'cash_account_id', type: 'uuid', nullable: true })
  cashAccountId: string | null;

  @Column({
    name: 'subtotal_agreed_amount',
    type: 'numeric',
    precision: 16,
    scale: 2,
  })
  subtotalAgreedAmount: string;

  @Column({
    name: 'total_cost_basis',
    type: 'numeric',
    precision: 16,
    scale: 2,
  })
  totalCostBasis: string;

  // Signed: + = kredit "Selisih Retur Pembelian" (nilai retur > harga pokok),
  // - = debit (nilai retur < harga pokok). CLAUDE.md §4 "Retur Pembelian".
  @Column({
    name: 'difference_amount',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  differenceAmount: string;

  @Column({
    name: 'posting_status',
    type: 'enum',
    enum: PurchaseReturnPostingStatus,
    enumName: 'purchase_return_posting_status',
    default: PurchaseReturnPostingStatus.POSTED,
  })
  postingStatus: PurchaseReturnPostingStatus;

  // Kontrak kunci-cetak generik (CLAUDE.md §2.16) — hanya registerPrint()
  // (cetak ulang bebas) di-wire hari ini. Edit/VOID sengaja ditunda (pola
  // sama warehouse_mutations Hari 13).
  @Column({
    name: 'print_status',
    type: 'enum',
    enum: PurchaseReturnPrintStatus,
    enumName: 'purchase_return_print_status',
    default: PurchaseReturnPrintStatus.NOT_PRINTED,
  })
  printStatus: PurchaseReturnPrintStatus;

  @Column({ name: 'print_count', default: 0 })
  printCount: number;

  @Column({ name: 'printed_at', type: 'timestamptz', nullable: true })
  printedAt: Date | null;

  @Column({ name: 'revision_number', default: 0 })
  revisionNumber: number;

  // Belum ada jalur yang mengisinya hari ini — VOID untuk RB ditunda.
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

  @OneToMany(() => PurchaseReturnLine, (line) => line.purchaseReturn)
  lines: PurchaseReturnLine[];
}
