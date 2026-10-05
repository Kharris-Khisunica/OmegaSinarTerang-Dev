import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SalesReturn } from './sales-return.entity';

// Tidak ada UpdateDateColumn dengan sengaja — append-only, pola sama
// purchase_return_lines/sales_invoice_lines.
@Entity('sales_return_lines')
export class SalesReturnLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sales_return_id', type: 'uuid' })
  salesReturnId: string;

  @ManyToOne(() => SalesReturn, (ret) => ret.lines)
  @JoinColumn({ name: 'sales_return_id' })
  salesReturn: SalesReturn;

  @Column({ name: 'line_order' })
  lineOrder: number;

  // Anchor per baris ke faktur asal (CLAUDE.md §3 "Lain-lain") — inilah yang
  // membuat "wajib menunjuk faktur asal" konkret di level baris, dan yang
  // dipakai query sisa-qty (cegah retur melebihi qty yang pernah dijual).
  @Column({ name: 'sales_invoice_line_id', type: 'uuid' })
  salesInvoiceLineId: string;

  // Didenormalisasi dari baris faktur asal.
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  // Qty yang diretur, dalam SATUAN YANG SAMA dengan baris faktur asal — TIDAK
  // ADA unit_id di sini, sengaja: satuan diwariskan dari
  // sales_invoice_line_id, menghindari resolve ulang faktor konversi yang
  // bisa (secara teori) berbeda dari yang tercatat di faktur.
  @Column({ name: 'qty_input', type: 'numeric', precision: 16, scale: 4 })
  qtyInput: string;

  @Column({ name: 'qty_base_unit', type: 'numeric', precision: 16, scale: 4 })
  qtyBaseUnit: string;

  // DISALIN APA ADANYA dari sales_invoice_lines.unit_cost_fifo baris asal —
  // TIDAK PERNAH dihitung ulang (CLAUDE.md §3 "Lain-lain", ini syarat utama
  // DoD Hari 23).
  @Column({
    name: 'unit_cost_fifo',
    type: 'numeric',
    precision: 16,
    scale: 4,
    default: 0,
  })
  unitCostFifo: string;

  // Prorata net_amount baris asli terhadap fraksi qty yang diretur — belum
  // dikurangi diskon faktur (itu diprorata sekali di header, lihat
  // SalesReturn.dppAmount).
  @Column({
    name: 'dpp_amount',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  dppAmount: string;

  @Column({
    name: 'cost_amount',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  costAmount: string;

  @Column({ name: 'stock_movement_id', type: 'uuid' })
  stockMovementId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
