import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StockOpname } from './stock-opname.entity';

@Entity('stock_opname_lines')
export class StockOpnameLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'stock_opname_id', type: 'uuid' })
  stockOpnameId: string;

  @ManyToOne(() => StockOpname, (opname) => opname.lines)
  @JoinColumn({ name: 'stock_opname_id' })
  stockOpname: StockOpname;

  @Column({ name: 'line_order' })
  lineOrder: number;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  /** Snapshot stok sistem gudang STORE saat hitungan disimpan. */
  @Column({ name: 'system_qty_base', type: 'numeric', precision: 16, scale: 4 })
  systemQtyBase: string;

  @Column({
    name: 'physical_qty_base',
    type: 'numeric',
    precision: 16,
    scale: 4,
  })
  physicalQtyBase: string;

  /** physical − system. Negatif = kurang (hilang/rusak), positif = lebih. */
  @Column({ name: 'diff_qty_base', type: 'numeric', precision: 16, scale: 4 })
  diffQtyBase: string;

  /** Terisi saat POSTING: harga pokok per satuan dasar yang dipakai koreksi. */
  @Column({
    name: 'unit_cost',
    type: 'numeric',
    precision: 16,
    scale: 4,
    nullable: true,
  })
  unitCost: string | null;

  @Column({
    name: 'diff_value',
    type: 'numeric',
    precision: 16,
    scale: 2,
    nullable: true,
  })
  diffValue: string | null;

  @Column({ name: 'stock_movement_id', type: 'uuid', nullable: true })
  stockMovementId: string | null;
}
