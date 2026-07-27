import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum WarehouseType {
  STORE = 'STORE',
  CUSTOMER_CONSIGNMENT = 'CUSTOMER_CONSIGNMENT',
  BAD_STOCK = 'BAD_STOCK',
}

@Entity('warehouses')
export class Warehouse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    name: 'warehouse_type',
    type: 'enum',
    enum: WarehouseType,
    enumName: 'warehouse_type',
  })
  warehouseType: WarehouseType;

  @Column({ name: 'customer_id', nullable: true, type: 'uuid' })
  customerId: string | null;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
