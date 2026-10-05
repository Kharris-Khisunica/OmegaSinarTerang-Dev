import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ConfirmPaymentMethodDto } from './confirm-payment-method.dto';

export class ConfirmPaymentLineDto {
  @IsUUID()
  invoiceId: string;

  // Koreksi 26 Sep 2026 — kas yang diterapkan ke faktur ini TIDAK LAGI satu
  // angka `amount`, tapi Σ methods[].amount (metode/akun kas-bank per BARIS
  // FAKTUR, bukan satu pool di level batch — lihat PaymentsService.confirm()
  // dan PaymentMethod). Boleh lebih dari satu baris (sebagian kas, sebagian
  // transfer, untuk faktur yang SAMA).
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConfirmPaymentMethodDto)
  methods: ConfirmPaymentMethodDto[];

  // Operator SECARA EKSPLISIT menyatakan faktur ini lunas (CLAUDE.md §2.18
  // "muncul hanya saat operator menyatakan faktur lunas") — TIDAK PERNAH
  // disimpulkan dari amount mendekati sisa faktur. Default false: amount
  // WAJIB <= sisa faktur, tidak ada baris selisih.
  @IsOptional()
  @IsBoolean()
  settleInFull?: boolean;
}
