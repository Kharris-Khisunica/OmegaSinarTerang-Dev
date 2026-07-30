import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';
import { UnitConversionDto } from './unit-conversion.dto';

const CODE_PATTERN = /^[0-9]{10}$/;
const CODE_MESSAGE = 'code harus 10 digit format YYMMDDXXXX.';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @Matches(CODE_PATTERN, { message: CODE_MESSAGE })
  code?: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsOptional()
  @IsString()
  keterangan?: string;

  @IsOptional()
  @IsString()
  kemasan?: string;

  @IsOptional()
  @IsString()
  ukuranUom?: string;

  @IsOptional()
  @IsBoolean()
  isBkp?: boolean;

  @IsOptional()
  @IsString()
  eanBarcode?: string;

  @IsOptional()
  @IsString()
  baseUnit?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnitConversionDto)
  unitConversions?: UnitConversionDto[];
}
