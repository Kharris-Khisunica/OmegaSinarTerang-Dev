import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VoidSalesInvoiceDto {
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @IsString()
  @IsNotEmpty()
  reasonNote: string;

  // Dipakai sebagai alasan UNLOCK_PRINT kalau faktur sudah PRINTED (lihat
  // PrintLockService) — kalau kosong, reasonNote dipakai ulang (pola sama
  // VoidPurchaseInvoiceDto).
  @IsOptional()
  @IsString()
  unlockReason?: string;
}
