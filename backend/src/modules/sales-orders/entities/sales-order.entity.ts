import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SalesOrderLine } from './sales-order-line.entity';

export enum SalesOrderStatus {
  OPEN = 'OPEN',
  CONVERTED = 'CONVERTED',
}

// CLAUDE.md §2.16/§3 "Sales Order": SO tidak mengikat uang atau stok, jadi
// dikecualikan dari kunci cetak generik dan VOID engine SENGAJA — bukan
// belum sempat, lihat sales-orders.service.ts. Tidak ada
// print_status/print_count/printed_at/revision_number (kunci cetak) dan
// tidak ada posting_status/void_reason_*/journal apa pun di sini — bukti
// struktural pengecualian, bukan cuma komentar.
@Entity('sales_orders')
export class SalesOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_number', unique: true })
  orderNumber: string;

  @Column({ name: 'order_date', type: 'date' })
  orderDate: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  // PJ (penanggung jawab) atas Sales Order ini (koreksi 02 Okt 2026) —
  // diteruskan ke sales_invoices.salesman_id saat "Jadikan Faktur" (terkunci
  // ikut SO, SalesInvoicesService.resolveSalesman()), BUKAN diketik ulang
  // manual oleh operator di layar faktur. Dasarnya praktik segregasi tugas
  // klien: orang yang menjadi PJ SO harus beda dari yang mengecek barang
  // saat diangkut — sistem ini belum membangun pengecekan itu, field ini
  // murni pondasi pencatatan siapa PJ-nya.
  @Column({ name: 'salesman_id', type: 'uuid' })
  salesmanId: string;

  @Column({
    type: 'enum',
    enum: SalesOrderStatus,
    enumName: 'sales_order_status',
    default: SalesOrderStatus.OPEN,
  })
  status: SalesOrderStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'converted_at', type: 'timestamptz', nullable: true })
  convertedAt: Date | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => SalesOrderLine, (line) => line.salesOrder)
  lines: SalesOrderLine[];
}
