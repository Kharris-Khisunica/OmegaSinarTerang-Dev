import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductUnitConversion } from './product-unit-conversion.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ name: 'base_unit' })
  baseUnit: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => ProductUnitConversion, (conversion) => conversion.product, {
    cascade: false,
  })
  unitConversions: ProductUnitConversion[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
