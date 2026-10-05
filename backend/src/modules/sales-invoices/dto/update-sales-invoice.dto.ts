import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

// Scope sengaja SEMPIT (pola sama UpdatePurchaseInvoiceDto, Hari 15) — hanya
// field header yang TIDAK menyentuh stok/jurnal. Beda dari faktur pembelian:
// faktur penjualan cuma punya SATU tanggal (invoiceDate), dan itu ditulis
// verbatim jadi journal_entries.entry_date saat posting — tidak ada tanggal
// "administratif" terpisah yang aman diedit di sini. customerId/salesChannel/
// salesOrderId juga tidak diedit (mengubahnya membatalkan resolusi akun
// piutang & status konversi SO yang sudah terjadi saat posting). Yang aman:
// salesmanId (koreksi, tidak menyentuh stok/jurnal) dan termDays (hanya
// mengubah dueDate untuk laporan umur piutang, tidak pernah dijurnal).
export class UpdateSalesInvoiceDto {
  @IsOptional()
  @IsUUID()
  salesmanId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  termDays?: number;

  // Wajib diisi HANYA kalau faktur sudah PRINTED (divalidasi di
  // PrintLockService.preflight/consume, bukan di sini).
  @IsOptional()
  @IsString()
  reason?: string;
}
