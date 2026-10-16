import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// need_fixing.md #19 — pola sama VoidSalesInvoiceDto.
export class VoidPurchaseReturnDto {
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @IsString()
  @IsNotEmpty()
  reasonNote: string;

  @IsOptional()
  @IsString()
  unlockReason?: string;
}
