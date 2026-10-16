import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// need_fixing.md #19 — pola sama VoidSalesInvoiceDto.
export class VoidSalesReturnDto {
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @IsString()
  @IsNotEmpty()
  reasonNote: string;

  // Alasan UNLOCK_PRINT kalau retur sudah PRINTED — kosong = reasonNote.
  @IsOptional()
  @IsString()
  unlockReason?: string;
}
