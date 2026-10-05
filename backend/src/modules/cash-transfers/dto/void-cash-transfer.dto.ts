import { IsNotEmpty, IsString } from 'class-validator';

// Tidak ada `unlockReason` (beda dari VoidPaymentDto/VoidSalesInvoiceDto) —
// cash_transfers TIDAK ikut kunci cetak §2.16, jadi tidak ada gerbang
// UNLOCK_PRINT untuk di-void di sini.
export class VoidCashTransferDto {
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @IsString()
  @IsNotEmpty()
  reasonNote: string;
}
