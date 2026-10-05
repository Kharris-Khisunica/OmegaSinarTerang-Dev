import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PaymentInvoiceType } from '../entities/payment.entity';
import { ConfirmPaymentLineDto } from './confirm-payment-line.dto';

// Koreksi 26 Sep 2026 — TIDAK ADA LAGI `methods` di sini. Tiap baris di
// `lines[]` membawa metodenya sendiri (ConfirmPaymentLineDto.methods) — lihat
// PaymentsService.confirm().
export class ConfirmPaymentDto {
  @IsEnum(PaymentInvoiceType)
  invoiceType: PaymentInvoiceType;

  @IsDateString()
  paymentDate: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConfirmPaymentLineDto)
  lines: ConfirmPaymentLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
