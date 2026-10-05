import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// Scope sengaja SEMPIT (Hari 15, dikonfirmasi user) — hanya field header
// yang TIDAK menyentuh stok/jurnal. qty/harga/diskon/baris TETAP tidak bisa
// diedit di sini; koreksinya lewat VOID + faktur B1 baru. Mengizinkan edit
// baris berarti me-reverse+repost jurnal & lot yang sudah ada, yang
// bertabrakan dengan asumsi VoidEngineService (satu journal_entry original
// per sourceType+sourceId) — lihat catatan PROGRESS.md Hari 15.
export class UpdatePurchaseInvoiceDto {
  @IsOptional()
  @IsString()
  supplierInvoiceNo?: string;

  // dueDate dihitung ulang dari sini + termDays kalau salah satunya berubah.
  @IsOptional()
  @IsDateString()
  supplierInvoiceDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  termDays?: number;

  // Wajib diisi HANYA kalau faktur sudah PRINTED (divalidasi di
  // PrintLockService.preflight/consume, bukan di sini — kondisional
  // terhadap state, bukan bentuk).
  @IsOptional()
  @IsString()
  reason?: string;
}
