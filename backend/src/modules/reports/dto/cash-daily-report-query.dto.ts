import { IsDateString, IsOptional, IsUUID } from 'class-validator';

// Rekap Kas Harian (Hari 31, CLAUDE.md §0 "rekap kas harian" -- eksplisit
// TIDAK ikut daftar yang ditunda ke pasca-MVP, beda dari Laporan Biaya
// Operasional). `accountId` opsional -- kosong berarti semua akun kas
// (chart_of_accounts.is_cash_account = true), diisi berarti satu akun saja
// (DoD FE "bisa ditarik per tanggal DAN per akun").
export class CashDailyReportQueryDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;
}
