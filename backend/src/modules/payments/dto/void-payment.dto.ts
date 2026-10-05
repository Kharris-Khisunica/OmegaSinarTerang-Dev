import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VoidPaymentDto {
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @IsString()
  @IsNotEmpty()
  reasonNote: string;

  // Dipakai sebagai alasan UNLOCK_PRINT kalau batch sudah PRINTED (lihat
  // PrintLockService) — kalau kosong, reasonNote dipakai ulang (pola sama
  // VoidPurchaseInvoiceDto/VoidSalesInvoiceDto).
  @IsOptional()
  @IsString()
  unlockReason?: string;
}
