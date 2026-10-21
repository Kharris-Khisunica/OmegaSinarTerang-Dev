import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isPkp?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
