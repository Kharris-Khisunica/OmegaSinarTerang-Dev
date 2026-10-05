import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class ConfirmPaymentMethodDto {
  @IsUUID()
  cashAccountId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  // Token step-up CASH_OUTFLOW (CLAUDE.md §5) UNTUK BARIS METODE INI SAJA —
  // per baris, bukan satu header HTTP, karena satu batch bisa punya lebih
  // dari satu akun kas/bank dan masing-masing bisa butuh approval independen
  // (beda dari UNLOCK_PRINT/VOID_DOCUMENT yang selalu tepat satu gerbang per
  // panggilan). Hanya relevan kalau invoiceType=PURCHASE dan akun ini
  // requiresOutflowApproval + amount melebihi ambang.
  @IsOptional()
  @IsString()
  authorizationRequestId?: string;
}
