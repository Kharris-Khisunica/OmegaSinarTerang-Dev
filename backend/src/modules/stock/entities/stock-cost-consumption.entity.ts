import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Jejak audit FIFO: movement mana mengonsumsi berapa qty dari lot mana pada
// unit_cost berapa. Append-only, tidak pernah di-UPDATE — konsisten pola
// journal_entry_lines (tanpa updated_at/trigger).
@Entity('stock_cost_consumptions')
export class StockCostConsumption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lot_id' })
  lotId: string;

  @Column({ name: 'movement_id' })
  movementId: string;

  @Column({ type: 'numeric', precision: 16, scale: 4 })
  qty: string;

  @Column({ name: 'unit_cost', type: 'numeric', precision: 16, scale: 4 })
  unitCost: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
