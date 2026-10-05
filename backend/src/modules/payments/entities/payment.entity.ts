import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentBatch } from './payment-batch.entity';
import { PaymentMethod } from './payment-method.entity';

export enum PaymentInvoiceType {
  SALES = 'SALES',
  PURCHASE = 'PURCHASE',
}

// Baris pelunasan per faktur ("per nota", CLAUDE.md/KONTEKS_REVISI §2.12 poin 5) —
// amount BOLEH lebih kecil dari sisa faktur (pembayaran sebagian, tidak
// menghasilkan selisih). invoice_id POLIMORFIK (invoice_type menentukan tabel
// sales_invoices/purchase_invoices) — pola sama journal_entries.source_type/
// source_id, TIDAK ADA FK lintas dua tabel berbeda, divalidasi di service layer.
// Party (customer/supplier) di-resolve dari sini -> faktur, TIDAK disimpan
// redundan di baris ini maupun di header batch (lihat PaymentBatch).
//
// Tidak ada UpdateDateColumn dengan sengaja — append-only.
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_batch_id', type: 'uuid' })
  paymentBatchId: string;

  @ManyToOne(() => PaymentBatch, (batch) => batch.payments)
  @JoinColumn({ name: 'payment_batch_id' })
  paymentBatch: PaymentBatch;

  @Column({
    name: 'invoice_type',
    type: 'enum',
    enum: PaymentInvoiceType,
    enumName: 'payment_invoice_type',
  })
  invoiceType: PaymentInvoiceType;

  @Column({ name: 'invoice_id', type: 'uuid' })
  invoiceId: string;

  // Jumlah yang MELUNASI Piutang/Hutang faktur ini — pola normal sama dengan
  // kas yang benar-benar dibayar, TAPI kalau settled_in_full=true nilainya
  // SELALU sama dengan outstandingBefore (faktur ditutup penuh), bukan kas
  // yang diterima/dibayar. Lihat discrepancy_amount untuk selisihnya.
  @Column({
    name: 'allocated_amount',
    type: 'numeric',
    precision: 16,
    scale: 2,
  })
  allocatedAmount: string;

  // Hari 27 (CLAUDE.md §2.18 "Selisih Pembayaran") — true HANYA kalau operator
  // eksplisit menyatakan faktur ini lunas (bukan disimpulkan dari nominal).
  // Pembayaran sebagian SELALU false, tidak peduli seberapa dekat nominalnya
  // dengan sisa faktur.
  @Column({ name: 'settled_in_full', default: false })
  settledInFull: boolean;

  // Signed: outstandingBefore - kas yang dibayar. 0 kalau settled_in_full
  // false ATAU kas persis sama dengan sisa faktur. TIDAK ADA pembulatan/
  // pembatasan nominal (keputusan klien eksplisit) — nilai berapa pun disimpan
  // apa adanya, hanya DITANDAI (bukan diblokir) di faktur kalau |nilai| > 10rb.
  @Column({
    name: 'discrepancy_amount',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  discrepancyAmount: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Koreksi 26 Sep 2026 — metode pembayaran pindah dari payment_batches ke
  // sini (lihat komentar PaymentMethod): satu faktur boleh dilunasi dari
  // lebih dari satu akun kas/bank.
  @OneToMany(() => PaymentMethod, (method) => method.payment)
  methods: PaymentMethod[];
}
