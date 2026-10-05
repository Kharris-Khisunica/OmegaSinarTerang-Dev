import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

// PATCH /operational-expenses/lines/:lineId (Hari 32A tugas 6) — edit
// langsung diizinkan selama document.reviewStatus BUKAN DISETUJUI
// (CLAUDE.md §3 "Biaya Operasional", pengecualian eksplisit terhadap
// kebiasaan "koreksi selalu VOID" modul lain). cashAccountId/expenseDate
// TIDAK bisa diedit lewat sini — keduanya milik header (dokumen), pindah
// akun kas/tanggal berarti bukti berbeda, bukan koreksi baris.
export class UpdateOperationalExpenseLineDto {
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
