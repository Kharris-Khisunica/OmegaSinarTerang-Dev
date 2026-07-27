import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateIf,
} from 'class-validator';

const PHONE_PATTERN = /^(\+?62|0)8[0-9]{7,11}$/;
const PHONE_MESSAGE =
  'phone tidak valid — format Indonesia, contoh 081234567890 atau +6281234567890.';

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(PHONE_PATTERN, { message: PHONE_MESSAGE })
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsBoolean()
  isPkp?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  arAccountId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
