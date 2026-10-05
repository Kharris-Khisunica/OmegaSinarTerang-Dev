import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCashTransferDto {
  @IsDateString()
  transferDate: string;

  @IsUUID()
  fromCashAccountId: string;

  @IsUUID()
  toCashAccountId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;
}
