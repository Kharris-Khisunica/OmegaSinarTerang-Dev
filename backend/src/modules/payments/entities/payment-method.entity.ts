import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Payment } from './payment.entity';

// Koreksi 26 Sep 2026 (menggantikan PaymentBatchMethod/payment_batch_methods,
// lihat migration MovePaymentMethodsToLineLevel1785080602978): metode
// pembayaran per BARIS FAKTUR, bukan per batch — satu faktur boleh dilunasi
// dari lebih dari satu akun kas/bank (sebagian kas, sebagian transfer).
// Tidak ada UpdateDateColumn dengan sengaja — append-only, pola sama
// purchase_return_lines/warehouse_mutation_lines. cash_account_id SELALU dari
// chart_of_accounts.is_cash_account = true (Hari 18), divalidasi via
// AccountResolverService.assertAccountHasFlag(), tidak pernah hardcode.
@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId: string;

  @ManyToOne(() => Payment, (payment) => payment.methods)
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Column({ name: 'cash_account_id', type: 'uuid' })
  cashAccountId: string;

  @Column({ type: 'numeric', precision: 16, scale: 2 })
  amount: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
