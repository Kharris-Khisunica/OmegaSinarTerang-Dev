import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SalesOrder } from './sales-order.entity';

// Tidak ada UpdateDateColumn dengan sengaja — SalesOrdersService.update()
// mengganti SELURUH baris (delete+recreate) selama SO masih OPEN, bukan
// mengedit baris satu-satu (beda dari purchase_invoice_lines yang
// append-only karena sudah membentuk lot FIFO — SO belum mengikat stok
// sama sekali, replace penuh aman).
@Entity('sales_order_lines')
export class SalesOrderLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sales_order_id', type: 'uuid' })
  salesOrderId: string;

  @ManyToOne(() => SalesOrder, (order) => order.lines)
  @JoinColumn({ name: 'sales_order_id' })
  salesOrder: SalesOrder;

  @Column({ name: 'line_order' })
  lineOrder: number;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'unit_id', type: 'uuid' })
  unitId: string;

  // Qty dalam satuan yang dipilih (unitId), BUKAN satuan dasar.
  @Column({ name: 'qty_input', type: 'numeric', precision: 16, scale: 4 })
  qtyInput: string;

  // Turunan qty_input x faktor konversi unit_id -> base_unit produk — murni
  // informatif (CLAUDE.md §2.16/§3: "qty terikat SO hanya ditampilkan"),
  // TIDAK PERNAH dikonsumsi StockRecorderService.
  @Column({ name: 'qty_base_unit', type: 'numeric', precision: 16, scale: 4 })
  qtyBaseUnit: string;

  // Opsional, murni tampilan (PANDUAN_UI.md §2 baris 10 & §7.2: grid SO
  // punya kolom Total). Tidak pernah dibaca Journal Poster/Stock Recorder,
  // tidak pernah masuk jurnal — CLAUDE.md §2.16 "SO bukan dokumen yang
  // mengikat uang".
  @Column({
    name: 'unit_price',
    type: 'numeric',
    precision: 16,
    scale: 2,
    nullable: true,
  })
  unitPrice: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
