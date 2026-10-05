import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWorkerDto {
  // Opsional — kosongkan untuk dibangkitkan otomatis (WorkersService.create()).
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
