import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateOperationalExpenseLineDto {
  // Default hari ini kalau kosong (service). Backdate maksimum 7 hari khusus
  // modul ini (docs/PERTANYAAN_KLIEN_BIAYA_OPERASIONAL.md §12).
  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  // Sumber kas bukti hari itu — kalau bukti untuk expenseDate sudah ada,
  // WAJIB sama dengan cash_account_id header yang sudah tersimpan.
  @IsUUID()
  cashAccountId: string;

  // Wajib akun bertipe EXPENSE, divalidasi di service.
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

  // Hari 32A — dipakai baris Gaji Tukang Angkut & Kasbon. Opsional, tidak
  // divalidasi wajib di sini (keputusan FE menampilkan field kalau akunnya
  // cocok) — service memvalidasi FK-nya ada kalau diisi.
  @IsOptional()
  @IsUUID()
  workerId?: string;

  // Hari 32A — dipakai baris BBM/Servis-Suku Cadang/Pajak-Perizinan
  // Kendaraan (06.110.00006/07/08).
  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}
