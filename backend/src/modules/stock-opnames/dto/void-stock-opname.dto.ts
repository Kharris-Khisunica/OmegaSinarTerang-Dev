import { IsNotEmpty, IsString } from 'class-validator';

export class VoidStockOpnameDto {
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @IsString()
  @IsNotEmpty()
  reasonNote: string;
}
