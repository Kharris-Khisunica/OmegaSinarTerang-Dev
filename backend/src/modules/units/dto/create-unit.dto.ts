import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUnitDto {
  // Opsional — kosongkan untuk dibangkitkan otomatis (UnitsService.create()).
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
