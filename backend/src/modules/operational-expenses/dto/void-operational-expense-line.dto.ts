import { IsNotEmpty, IsString } from 'class-validator';

export class VoidOperationalExpenseLineDto {
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @IsString()
  @IsNotEmpty()
  reasonNote: string;
}
