import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PurchaseInvoice } from './purchase-invoice.entity';

// Tidak ada UpdateDateColumn/trigger dengan sengaja — append-only, pola sama
// warehouse_mutation_lines/stock_cost_consumptions: sekali ditulis oleh
// PurchaseInvoicesService, tidak pernah diubah.
@Entity('purchase_invoice_lines')
export class PurchaseInvoiceLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'purchase_invoice_id', type: 'uuid' })
  purchaseInvoiceId: string;

  @ManyToOne(() => PurchaseInvoice, (invoice) => invoice.lines)
  @JoinColumn({ name: 'purchase_invoice_id' })
  purchaseInvoice: PurchaseInvoice;

  @Column({ name: 'line_order' })
  lineOrder: number;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'unit_id', type: 'uuid' })
  unitId: string;

  // Qty & harga dalam SATUAN YANG DIPILIH (mis. per DUS) — sesuai cara
  // operator mengetik (CLAUDE.md §3), bukan satuan dasar.
  @Column({ name: 'qty_input', type: 'numeric', precision: 16, scale: 4 })
  qtyInput: string;

  @Column({
    name: 'unit_price',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  unitPrice: string;

  @Column({
    name: 'discount_percent',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  discountPercent: string | null;

  @Column({
    name: 'discount_amount',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  discountAmount: string;

  // Turunan qty_input x faktor konversi unit_id -> base_unit produk — dipakai
  // StockRecorderService, BUKAN untuk perhitungan uang (CLAUDE.md §4).
  @Column({ name: 'qty_base_unit', type: 'numeric', precision: 16, scale: 4 })
  qtyBaseUnit: string;

  @Column({
    name: 'allocated_invoice_discount',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  allocatedInvoiceDiscount: string;

  @Column({
    name: 'line_final_amount',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  lineFinalAmount: string;

  @Column({
    name: 'input_vat',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  inputVat: string;

  // Harga pokok per satuan dasar -> jadi stock_cost_lots.unit_cost
  // (CLAUDE.md §14: presisi 4, bukan presisi uang 2).
  @Column({
    name: 'unit_cost_result',
    type: 'numeric',
    precision: 16,
    scale: 4,
    default: 0,
  })
  unitCostResult: string;

  @Column({ name: 'is_bonus', default: false })
  isBonus: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
