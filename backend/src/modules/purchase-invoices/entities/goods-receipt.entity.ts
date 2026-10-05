import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GoodsReceiptLine } from './goods-receipt-line.entity';

// Dibuat OTOMATIS dari faktur pembelian, tidak ada input terpisah
// (CLAUDE.md/prompt Hari 14) — murni jejak "barang apa diterima dari baris
// mana", 1:1 dengan purchase_invoices. Tidak punya nomor dokumen sendiri.
@Entity('goods_receipts')
export class GoodsReceipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'purchase_invoice_id', type: 'uuid', unique: true })
  purchaseInvoiceId: string;

  @Column({ name: 'receipt_date', type: 'date' })
  receiptDate: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => GoodsReceiptLine, (line) => line.goodsReceipt)
  lines: GoodsReceiptLine[];
}
