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

  // Barcode YYMMDDXXXX (CLAUDE.md §3) — manual atau dibangkitkan dari
  // product_code_seq. Dikunci (isCodeLocked) begitu dipakai transaksi
  // pertama, sudah tercetak di nota yang beredar.
  @Column({ unique: true })
  code: string;

  @Column({ name: 'is_code_locked', default: false })
  isCodeLocked: boolean;

  @Column({ name: 'brand_id', type: 'uuid' })
  brandId: string;

  @Column()
  keterangan: string;

  @Column({ nullable: true, type: 'varchar' })
  kemasan: string | null;

  // Ukuran + UoM kemasan digabung satu field teks (mis. "37 gr") — deskriptif,
  // bagian dari nama, TIDAK pernah dihitung. Jangan disamakan dengan satuan
  // jual/beli (baseUnit/unitConversions di bawah).
  @Column({ name: 'ukuran_uom', nullable: true, type: 'varchar' })
  ukuranUom: string | null;

  // Merek + keterangan + kemasan + ukuran_uom digabung, dihitung ulang di
  // ProductsService setiap create/update (butuh join ke brands.name) —
  // disimpan (bukan generated column DB) supaya bisa diindeks & dicari cepat.
  @Column({ name: 'display_name' })
  displayName: string;

  @Column({ name: 'is_bkp', default: false })
  isBkp: boolean;

  @Column({ name: 'ean_barcode', nullable: true, type: 'varchar' })
  eanBarcode: string | null;

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
