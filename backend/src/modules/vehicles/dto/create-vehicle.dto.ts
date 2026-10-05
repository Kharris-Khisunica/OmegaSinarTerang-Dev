import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVehicleDto {
  // Opsional — kosongkan untuk dibangkitkan otomatis (VehiclesService.create()).
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
