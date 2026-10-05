import { Type } from 'class-transformer';
import { IsNumber, IsPositive, IsUUID } from 'class-validator';

// TIDAK ADA unitId di sini dengan sengaja — satuan dikunci di header
// (CreatePurchaseReturnDto.unitMode), satuan besar produk di-resolve
// server-side dari product_unit_conversions (CLAUDE.md §3: 1 produk = 1
// satuan besar).
export class CreatePurchaseReturnLineDto {
  @IsUUID()
  productId: string;

  // Angka mentah sesuai unitMode dokumen (qty DUS kalau BESAR, qty base unit
  // kalau KECIL) — dikonversi ke qtyBaseUnit di service.
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  qtyInput: number;

  // Rupiah PER qtyInput (per DUS kalau BESAR, per PCS kalau KECIL) — nilai
  // retur yang DINEGOSIASIKAN dengan supplier, bisa beda dari harga pokok
  // FIFO (CLAUDE.md §4 "Retur Pembelian").
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  agreedUnitPrice: number;
}
