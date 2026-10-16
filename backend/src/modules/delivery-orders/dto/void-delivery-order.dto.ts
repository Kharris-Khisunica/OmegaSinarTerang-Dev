import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Pola sama VoidSalesInvoiceDto (need_fixing.md #18).
export class VoidDeliveryOrderDto {
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @IsString()
  @IsNotEmpty()
  reasonNote: string;

  // Dipakai sebagai alasan UNLOCK_PRINT kalau SJ sudah PRINTED — kalau
  // kosong, reasonNote dipakai ulang.
  @IsOptional()
  @IsString()
  unlockReason?: string;
}
