import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Satu baris = satu batch masuk dengan unit_cost sendiri — dasar FIFO
// (CLAUDE.md §2.7). lot_date DIISI PEMANGGIL: untuk pembelian itu
// receipt_date (tanggal terima barang), BUKAN tanggal faktur supplier —
// tertukar berarti urutan FIFO ikut tanggal yang salah tanpa error apa pun.
@Entity('stock_cost_lots')
export class StockCostLot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'warehouse_id' })
  warehouseId: string;

  @Column({ name: 'lot_date', type: 'date' })
  lotDate: string;

  @Column({ name: 'qty_in', type: 'numeric', precision: 16, scale: 4 })
  qtyIn: string;

  @Column({
    name: 'qty_remaining',
    type: 'numeric',
    precision: 16,
    scale: 4,
  })
  qtyRemaining: string;

  // Boleh 0 untuk baris bonus supplier (CLAUDE.md §3) — lot berharga nol
  // WAJIB dilewati tiap kali dicari sebagai dasar biaya
  // (StockRecorderService.getLatestCostBasis).
  @Column({ name: 'unit_cost', type: 'numeric', precision: 16, scale: 4 })
  unitCost: string;

  // Melacak supplier asal untuk retur pembelian (Hari 16) — pilih supplier
  // dulu, lalu daftar bad stock disaring ke produk yang pernah dibeli dari
  // supplier itu. NULL untuk lot dari retur pelanggan (PR #2, KONTEKS_REVISI §4.2).
  @Column({ name: 'supplier_id', nullable: true, type: 'uuid' })
  supplierId: string | null;

  @Column({ name: 'source_type' })
  sourceType: string;

  @Column({ name: 'source_id', nullable: true, type: 'uuid' })
  sourceId: string | null;

  // Movement recordIn() PERSIS yang membentuk lot ini (migration paket R6,
  // DocumentReviseService) — kunci yang dipakai reverseIn()/
  // assertLotsUnconsumed() untuk membedakan lot dari posting SEKARANG vs.
  // posting lama yang sudah dibalik revisi sebelumnya. product+warehouse+
  // source dokumen saja tidak cukup begitu satu dokumen bisa recordIn()
  // produk yang sama lebih dari sekali (revisi in-place). NULL untuk lot
  // hasil transfer() (mutasi gudang) — reverseIn() menolak movement TRANSFER
  // secara eksplisit, jadi kolom ini tidak pernah dibaca untuk lot tersebut.
  @Column({ name: 'movement_id', nullable: true, type: 'uuid' })
  movementId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
