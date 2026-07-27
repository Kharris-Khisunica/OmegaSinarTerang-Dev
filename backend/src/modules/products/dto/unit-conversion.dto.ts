import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class UnitConversionDto {
  @IsString()
  @IsNotEmpty()
  unitName: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  qtyInBaseUnit: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  level: number;
}
