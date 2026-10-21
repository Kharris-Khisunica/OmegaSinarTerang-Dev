import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCustomerDto {
  // Opsional — kosongkan untuk dibangkitkan otomatis (CustomersService.create()).
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsBoolean()
  isPkp?: boolean;

  @IsOptional()
  @IsUUID()
  arAccountId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
