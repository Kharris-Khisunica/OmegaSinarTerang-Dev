import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateKasbonRepaymentDto {
  @IsDateString()
  repaymentDate: string;

  @IsUUID()
  workerId: string;

  // Kas penerima — FE mengunci ke Kas Kecil (need_fixing.md #26 opsi 3a);
  // backend memvalidasi is_cash_account.
  @IsUUID()
  cashAccountId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;
}
