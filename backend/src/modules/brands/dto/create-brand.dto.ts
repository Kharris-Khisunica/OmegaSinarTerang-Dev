import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBrandDto {
  // Opsional — kosongkan untuk dibangkitkan otomatis (BrandsService.create()).
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
