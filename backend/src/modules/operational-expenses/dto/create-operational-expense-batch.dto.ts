import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

// POST /operational-expenses/batch (paket R10, docs/RENCANA_REVISI_TESTING_
// KLIEN.md §3 "R10" — klien: "sekali entri dapat melakukan beberapa input
// biaya operasional... tanggal dapat diinput sebagai data global").
// expenseDate & cashAccountId GLOBAL untuk seluruh baris — beda dari
// CreateOperationalExpenseLineDto yang membawa keduanya PER BARIS.
export class CreateOperationalExpenseBatchLineDto {
  @IsUUID()
  expenseAccountId: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsUUID()
  workerId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}

export class CreateOperationalExpenseBatchDto {
  // Default hari ini kalau kosong (service) — sama seperti
  // CreateOperationalExpenseLineDto.expenseDate, tapi di sini berlaku untuk
  // SELURUH baris, bukan per baris.
  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @IsUUID()
  cashAccountId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOperationalExpenseBatchLineDto)
  lines: CreateOperationalExpenseBatchLineDto[];
}
