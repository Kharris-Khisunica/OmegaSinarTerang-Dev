import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SalesInvoice } from './sales-invoice.entity';

// Tidak ada UpdateDateColumn dengan sengaja — sekali ditulis (posting Hari 21)
// baris ini tidak pernah diubah, sama seperti purchase_invoice_lines.
@Entity('sales_invoice_lines')
export class SalesInvoiceLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sales_invoice_id', type: 'uuid' })
  salesInvoiceId: string;

  @ManyToOne(() => SalesInvoice, (invoice) => invoice.lines)
  @JoinColumn({ name: 'sales_invoice_id' })
  salesInvoice: SalesInvoice;

  // Didenormalisasi dari header (CLAUDE.md §3 "Riwayat harga") — jalur
  // terpanas aplikasi. GET /price-suggestion butuh index
  // (customer_id, product_id, unit_id, id DESC) tanpa join ke sales_invoices
  // dulu untuk predikat customer_id-nya. Ditulis di migration pembuat tabel
  // ini, bukan ditambahkan belakangan (backfill+reindex di mesin klien HDD).
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Column({ name: 'line_order' })
  lineOrder: number;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'unit_id', type: 'uuid' })
  unitId: string;

  @Column({ name: 'qty_input', type: 'numeric', precision: 16, scale: 4 })
  qtyInput: string;

  @Column({ name: 'qty_base_unit', type: 'numeric', precision: 16, scale: 4 })
  qtyBaseUnit: string;

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

  // baris_kotor (CLAUDE.md §4) = qty x unit_price.
  @Column({
    name: 'gross_amount',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  grossAmount: string;

  // baris_bersih = baris_kotor - diskon_baris.
  @Column({
    name: 'net_amount',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  netAmount: string;

  // Diisi Hari 21 dari StockRecorderService.recordOut() saat posting — retur
  // penjualan (Hari 23) WAJIB memakai angka ini sebagai harga pokok, bukan
  // menghitung ulang (CLAUDE.md §3 "Lain-lain"). Nama kolom literal karena
  // CLAUDE.md merujuknya persis `sales_invoice_lines.unit_cost_fifo`.
  @Column({
    name: 'unit_cost_fifo',
    type: 'numeric',
    precision: 16,
    scale: 4,
    default: 0,
  })
  unitCostFifo: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
