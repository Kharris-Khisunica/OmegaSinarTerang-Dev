import { IsNotEmpty, IsString } from 'class-validator';

export class VoidKasbonRepaymentDto {
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @IsString()
  @IsNotEmpty()
  reasonNote: string;
}
