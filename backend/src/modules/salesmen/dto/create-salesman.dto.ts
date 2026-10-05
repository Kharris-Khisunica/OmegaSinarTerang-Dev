import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSalesmanDto {
  // Opsional — kosongkan untuk dibangkitkan otomatis (SalesmenService.create()).
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
