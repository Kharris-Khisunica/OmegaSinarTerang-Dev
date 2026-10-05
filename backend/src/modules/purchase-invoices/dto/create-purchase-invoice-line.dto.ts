import { Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  Min,
} from 'class-validator';

// Diskon baris DI-DROP sejak paket R7 (docs/RENCANA_REVISI_TESTING_KLIEN.md
// §2A, keputusan K5) — hanya diskon faktur (rupiah) yang tersisa. Kolom
// TETAP ada (faktur lama masih menyimpan nilainya), tapi baris faktur BARU
// wajib 0 atau tidak dikirim sama sekali. Pola sama
// create-sales-invoice-line.dto.ts (paket R5, asumsi A1).
const LINE_DISCOUNT_DROPPED_MESSAGE =
  'Diskon baris pembelian sudah tidak dipakai — isi diskon di tingkat faktur (rupiah) kalau perlu.';

export class CreatePurchaseInvoiceLineDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  unitId: string;

  // Qty dalam satuan yang dipilih (unitId), BUKAN satuan dasar.
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  qtyInput: number;

  // Wajib untuk baris non-bonus; diabaikan (dipaksa 0) untuk baris bonus di
  // service (CLAUDE.md §3 "Bonus").
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Equals(0, { message: LINE_DISCOUNT_DROPPED_MESSAGE })
  discountPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Equals(0, { message: LINE_DISCOUNT_DROPPED_MESSAGE })
  discountAmount?: number;

  @IsOptional()
  @IsBoolean()
  isBonus?: boolean;
}
