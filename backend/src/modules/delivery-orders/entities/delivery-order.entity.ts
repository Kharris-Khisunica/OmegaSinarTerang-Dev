import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DeliveryOrderLine } from './delivery-order-line.entity';

export enum DeliveryOrderPostingStatus {
  POSTED = 'POSTED',
  VOIDED = 'VOIDED',
}

export enum DeliveryOrderPrintStatus {
  NOT_PRINTED = 'NOT_PRINTED',
  PRINTED = 'PRINTED',
  PRINT_CANCELLED = 'PRINT_CANCELLED',
}

// Hari 25 — status pengiriman. POSTPONED adalah yang ditarik sebagai
// daftar "belum terkirim" keesokan harinya (CLAUDE.md §0.1).
export enum DeliveryOrderDeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  POSTPONED = 'POSTPONED',
  RETURNED = 'RETURNED',
}

@Entity('delivery_orders')
export class DeliveryOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'delivery_number', unique: true })
  deliveryNumber: string;

  @Column({ name: 'delivery_date', type: 'date' })
  deliveryDate: string;

  // WAJIB terbentuk DARI satu faktur bersaluran PENGIRIMAN (CLAUDE.md §1) —
  // divalidasi di DeliveryOrdersService.create(), bukan di sini. Faktur TOKO
  // ditolak di service, bukan lewat CHECK constraint (channel hidup di
  // sales_invoices, bukan didenormalisasi ke sini).
  @Column({ name: 'sales_invoice_id', type: 'uuid' })
  salesInvoiceId: string;

  // Didenormalisasi dari faktur asal saat dibuat (pola sama SalesReturn).
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  // Salesman yang mengantar & menagih (CLAUDE.md §1) — WAJIB, bukan
  // opsional. "Agen" dan "Salesman" adalah orang yang sama (koreksi 26 Sep
  // 2026) — dulu sempat dibangun sebagai master `agents` terpisah, sudah
  // digabung ke `salesmen` (migration 1785080602977).
  @Column({ name: 'salesman_id', type: 'uuid' })
  salesmanId: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @Column({
    name: 'posting_status',
    type: 'enum',
    enum: DeliveryOrderPostingStatus,
    enumName: 'delivery_order_posting_status',
    default: DeliveryOrderPostingStatus.POSTED,
  })
  postingStatus: DeliveryOrderPostingStatus;

  // Kontrak kunci-cetak generik (CLAUDE.md §2.16) — hanya registerPrint()
  // (cetak ulang bebas) di-wire hari ini. Edit/VOID/status pengiriman
  // (PENDING/DELIVERED/POSTPONED/RETURNED) sengaja ditunda ke Hari 25.
  @Column({
    name: 'print_status',
    type: 'enum',
    enum: DeliveryOrderPrintStatus,
    enumName: 'delivery_order_print_status',
    default: DeliveryOrderPrintStatus.NOT_PRINTED,
  })
  printStatus: DeliveryOrderPrintStatus;

  @Column({
    name: 'delivery_status',
    type: 'enum',
    enum: DeliveryOrderDeliveryStatus,
    enumName: 'delivery_order_delivery_status',
    default: DeliveryOrderDeliveryStatus.PENDING,
  })
  deliveryStatus: DeliveryOrderDeliveryStatus;

  @Column({ name: 'print_count', default: 0 })
  printCount: number;

  @Column({ name: 'printed_at', type: 'timestamptz', nullable: true })
  printedAt: Date | null;

  @Column({ name: 'revision_number', default: 0 })
  revisionNumber: number;

  // Belum ada jalur yang mengisinya hari ini — VOID untuk SJ ditunda.
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

  @OneToMany(() => DeliveryOrderLine, (line) => line.deliveryOrder)
  lines: DeliveryOrderLine[];
}
