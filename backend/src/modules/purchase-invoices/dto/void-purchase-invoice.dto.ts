import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VoidPurchaseInvoiceDto {
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @IsString()
  @IsNotEmpty()
  reasonNote: string;

  // Dipakai sebagai alasan UNLOCK_PRINT kalau faktur sudah PRINTED (lihat
  // PrintLockService) — kalau kosong, reasonNote dipakai ulang (VOID hampir
  // selalu punya alasan yang sama untuk keduanya).
  @IsOptional()
  @IsString()
  unlockReason?: string;
}
