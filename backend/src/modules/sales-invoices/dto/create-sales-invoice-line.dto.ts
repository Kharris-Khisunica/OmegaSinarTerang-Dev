import { Type } from 'class-transformer';
import {
  Equals,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
} from 'class-validator';

// Diskon baris DI-DROP (docs/RENCANA_REVISI_TESTING_KLIEN.md §2B A1, paket
// R5) — kolom TETAP ada (faktur lama masih menyimpan nilainya), tapi baris
// faktur BARU wajib 0 atau tidak dikirim sama sekali. Tidak ada isBonus —
// konsep bonus khusus pembelian dari supplier (CLAUDE.md §3 "Bonus"), tidak
// ada di penjualan.
const SALES_DISCOUNT_DROPPED_MESSAGE =
  'Diskon penjualan sudah tidak dipakai — masukkan harga bersih langsung di kolom Harga.';

export class CreateSalesInvoiceLineDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  unitId: string;

  // Qty dalam satuan yang dipilih (unitId), BUKAN satuan dasar.
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  qtyInput: number;

  // WAJIB (beda dari pembelian yang mengizinkan 0 untuk baris bonus) —
  // tidak ada baris bonus di penjualan.
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  unitPrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Equals(0, { message: SALES_DISCOUNT_DROPPED_MESSAGE })
  discountPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Equals(0, { message: SALES_DISCOUNT_DROPPED_MESSAGE })
  discountAmount?: number;
}
