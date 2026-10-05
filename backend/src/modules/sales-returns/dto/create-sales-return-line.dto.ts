import { Type } from 'class-transformer';
import { IsNumber, IsPositive, IsUUID } from 'class-validator';

// TIDAK ADA unitId di sini dengan sengaja — satuan diwariskan dari baris
// faktur asal (salesInvoiceLineId), qtyInput dibaca dalam satuan YANG SAMA
// dengan qty_input baris itu. Menghindari resolve ulang konversi produk yang
// bisa berbeda dari yang tercatat di faktur (CLAUDE.md §3 "Lain-lain").
export class CreateSalesReturnLineDto {
  @IsUUID()
  salesInvoiceLineId: string;

  // Qty yang diretur, dalam satuan baris faktur asal — boleh sebagian dari
  // qty_input baris itu (retur parsial diizinkan).
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  qtyInput: number;
}
