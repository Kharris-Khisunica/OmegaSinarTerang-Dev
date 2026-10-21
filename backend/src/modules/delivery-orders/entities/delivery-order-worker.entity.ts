import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DeliveryOrder } from './delivery-order.entity';

// Pekerja yang ikut mengantar surat jalan (Hari 44, migration
// 1785080602986). Diganti utuh lewat DeliveryOrdersService.updateWorkers()
// — tidak ada UpdateDateColumn, satu baris = satu pekerja.
@Entity('delivery_order_workers')
export class DeliveryOrderWorker {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'delivery_order_id', type: 'uuid' })
  deliveryOrderId: string;

  @ManyToOne(() => DeliveryOrder, (order) => order.workers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'delivery_order_id' })
  deliveryOrder: DeliveryOrder;

  @Column({ name: 'worker_id', type: 'uuid' })
  workerId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
