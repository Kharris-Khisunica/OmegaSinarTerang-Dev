import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  Equals,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreatePurchaseInvoiceLineDto } from './create-purchase-invoice-line.dto';

// Diskon faktur RUPIAH SAJA sejak paket R7 (docs/RENCANA_REVISI_TESTING_KLIEN.md
// §2A, keputusan K5) — mode persen di tingkat faktur DI-DROP. Field TETAP ada
// (faktur lama masih menyimpan nilainya) tapi faktur BARU wajib mengirim 0
// atau tidak mengirim sama sekali. Pola sama
// create-sales-invoice.dto.ts (paket R5, asumsi A1).
const INVOICE_DISCOUNT_PERCENT_DROPPED_MESSAGE =
  'Diskon faktur persen sudah tidak dipakai — isi nominal rupiah di kolom Diskon Faktur.';

export class CreatePurchaseInvoiceDto {
  @IsUUID()
  supplierId: string;

  // Opsional sejak paket R7 (asumsi A3) — supplier tidak selalu menerbitkan
  // nota bernomor.
  @IsOptional()
  @IsString()
  supplierInvoiceNo?: string;

  // Tanggal barang diterima -> lot_date FIFO (CLAUDE.md §3). Juga dipakai
  // sebagai tanggal posting jurnal & periode nomor dokumen (satu tanggal
  // transaksi, konsisten dengan "jurnal ditulis di detik yang sama").
  @IsDateString()
  receiptDate: string;

  // Dasar hitung jatuh tempo & tarif PPN — BUKAN dipakai untuk lot_date.
  @IsDateString()
  supplierInvoiceDate: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  termDays: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Equals(0, { message: INVOICE_DISCOUNT_PERCENT_DROPPED_MESSAGE })
  invoiceDiscountPercent?: number;

  // Satu-satunya mode diskon faktur yang tersisa (K5) — TIDAK menyentuh
  // harga pokok/lot.unit_cost, jadi baris jurnal kredit "Diskon Pembelian"
  // tersendiri (CLAUDE.md §4 "Faktur Pembelian").
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  invoiceDiscountAmount?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseInvoiceLineDto)
  lines: CreatePurchaseInvoiceLineDto[];
}
