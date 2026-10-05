import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  Equals,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { SalesChannel } from '../../../common/enums/sales-channel.enum';
import { CreateSalesInvoiceLineDto } from './create-sales-invoice-line.dto';

// Diskon penjualan DI-DROP (docs/RENCANA_REVISI_TESTING_KLIEN.md §2B A1,
// paket R5) — harga sudah diketik bebas per pelanggan (CLAUDE.md §3), jadi
// diskon jadi jalur kedua untuk hal yang sama. Kolom TETAP ada (faktur lama
// masih menyimpan nilainya) tapi faktur BARU wajib mengirim 0 atau tidak
// mengirim sama sekali.
const SALES_DISCOUNT_DROPPED_MESSAGE =
  'Diskon penjualan sudah tidak dipakai — masukkan harga bersih langsung di kolom Harga.';

// Field HARUS persis cocok dengan buildPayload() yang sudah dikirim FE
// (frontend/app/pages/penjualan/faktur/index.vue, dibangun Hari 20) — jangan
// ganti nama field di sini tanpa mengubah FE juga.
export class CreateSalesInvoiceDto {
  @IsUUID()
  customerId: string;

  @IsEnum(SalesChannel)
  salesChannel: SalesChannel;

  // Wajib untuk salesChannel=PENGIRIMAN, diabaikan untuk TOKO — divalidasi
  // SalesOrdersService.assertChannelSalesOrderRequirement() di service,
  // bukan di DTO (butuh baca DB).
  @IsOptional()
  @IsUUID()
  salesOrderId?: string;

  // WAJIB untuk saluran TOKO (tidak ada SO yang membawa salesman) —
  // DIABAIKAN untuk PENGIRIMAN, yang salesman-nya SELALU ikut Sales Order
  // (koreksi 02 Okt 2026, "terkunci ikut SO" — lihat
  // SalesInvoicesService.resolveSalesman()). Divalidasi di service (butuh
  // tahu salesChannel/salesOrderId dulu), bukan di DTO.
  @IsOptional()
  @IsUUID()
  salesmanId?: string;

  @IsDateString()
  invoiceDate: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  termDays: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Equals(0, { message: SALES_DISCOUNT_DROPPED_MESSAGE })
  invoiceDiscountPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Equals(0, { message: SALES_DISCOUNT_DROPPED_MESSAGE })
  invoiceDiscountAmount?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSalesInvoiceLineDto)
  lines: CreateSalesInvoiceLineDto[];
}
