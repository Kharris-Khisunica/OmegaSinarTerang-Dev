import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsBoolean()
  isPkp?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
