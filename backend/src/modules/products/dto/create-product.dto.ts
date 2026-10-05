import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';
import { UnitConversionDto } from './unit-conversion.dto';

const CODE_PATTERN = /^[0-9]{10}$/;
const CODE_MESSAGE =
  'code harus 10 digit format YYMMDDXXXX (kosongkan untuk dibangkitkan otomatis).';

export class CreateProductDto {
  @IsOptional()
  @IsString()
  @Matches(CODE_PATTERN, { message: CODE_MESSAGE })
  code?: string;

  @IsUUID()
  brandId: string;

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

  @IsString()
  @IsNotEmpty()
  baseUnit: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnitConversionDto)
  unitConversions?: UnitConversionDto[];
}
