import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class OpeningStockLineDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  warehouseId: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  qtyBaseUnit: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost: number;
}

export class OpeningReceivableLineDto {
  @IsUUID()
  customerId: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class OpeningPayableLineDto {
  @IsUUID()
  supplierId: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}

// TIDAK ADA field tanggal di sini dengan sengaja — tanggal saldo awal
// SELALU dari settings.opening_balance_date (CLAUDE.md §3), tidak boleh
// dikirim client. Ini yang membuat pengecualian tanggal (PeriodLockValidator
// §2.9) tetap "satu, bernama", bukan celah untuk tanggal masa depan bebas.
export class SubmitOpeningBalanceDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpeningStockLineDto)
  stockLines?: OpeningStockLineDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpeningReceivableLineDto)
  receivableLines?: OpeningReceivableLineDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpeningPayableLineDto)
  payableLines?: OpeningPayableLineDto[];

  // Validasi "minimal salah satu array tidak kosong" dilakukan di service
  // (butuh melihat ketiga field sekaligus, class-validator per-field saja
  // tidak cukup ekspresif untuk itu tanpa custom decorator).
}
