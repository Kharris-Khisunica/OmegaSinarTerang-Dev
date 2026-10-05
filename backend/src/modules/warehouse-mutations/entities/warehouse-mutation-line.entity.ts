import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WarehouseMutation } from './warehouse-mutation.entity';

// Tidak ada UpdateDateColumn/trigger dengan sengaja — baris ini append-only,
// pola sama stock_cost_consumptions: sekali ditulis (setelah StockRecorderService
// selesai memproses, atau langsung untuk cabang titipan), tidak pernah diubah.
@Entity('warehouse_mutation_lines')
export class WarehouseMutationLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'mutation_id', type: 'uuid' })
  mutationId: string;

  @ManyToOne(() => WarehouseMutation, (mutation) => mutation.lines)
  @JoinColumn({ name: 'mutation_id' })
  mutation: WarehouseMutation;

  @Column({ name: 'line_order' })
  lineOrder: number;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  // WAJIB untuk baris TITIPAN_PELANGGAN (paket R8 keputusan K7) — mengunci
  // baris titipan ke baris faktur PERSIS, bukan hanya ke produk. Ini yang
  // membuat validasi kuota (assertTitipanQtyWithinInvoiceLine()) tidak lagi
  // tertukar antar faktur berbeda untuk produk yang sama. NULL untuk cabang
  // TRANSFER.
  @Column({
    name: 'sales_invoice_line_id',
    type: 'uuid',
    nullable: true,
  })
  salesInvoiceLineId: string | null;

  @Column({ name: 'qty_base_unit', type: 'numeric', precision: 16, scale: 4 })
  qtyBaseUnit: string;

  // NULL untuk baris TITIPAN_PELANGGAN (tidak ada movement, tidak ada cost).
  // Untuk cabang transfer, TIDAK PERNAH diisi dari request body — hanya dari
  // avgUnitCost hasil StockRecorderService.transfer() setelah diproses
  // (CLAUDE.md §3 "Mutasi gudang": unit_cost read-only).
  @Column({
    name: 'unit_cost',
    type: 'numeric',
    precision: 16,
    scale: 4,
    nullable: true,
  })
  unitCost: string | null;

  @Column({ name: 'movement_out_id', type: 'uuid', nullable: true })
  movementOutId: string | null;

  @Column({ name: 'movement_in_id', type: 'uuid', nullable: true })
  movementInId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
