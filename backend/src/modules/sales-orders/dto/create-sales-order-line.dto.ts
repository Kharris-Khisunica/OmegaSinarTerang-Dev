import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsUUID, Min } from 'class-validator';

// unitPrice opsional — murni tampilan (PANDUAN_UI.md §7.2), SO belum
// mengikat uang sama sekali (CLAUDE.md §2.16).
export class CreateSalesOrderLineDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  unitId: string;

  // Qty dalam satuan yang dipilih (unitId), BUKAN satuan dasar.
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  qtyInput: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}
