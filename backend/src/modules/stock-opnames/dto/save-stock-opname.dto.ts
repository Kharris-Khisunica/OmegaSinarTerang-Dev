import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class StockOpnameLineDto {
  @IsUUID()
  productId: string;

  /** Hasil hitung fisik dalam SATUAN DASAR (FE mengonversi dari angka + satuan). */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  physicalQtyBase: number;
}

// Dipakai create (POST) dan ubah DRAFT (PATCH) — baris diganti penuh.
export class SaveStockOpnameDto {
  @IsDateString()
  countDate: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockOpnameLineDto)
  lines: StockOpnameLineDto[];
}
