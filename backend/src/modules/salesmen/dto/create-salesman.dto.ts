import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSalesmanDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
