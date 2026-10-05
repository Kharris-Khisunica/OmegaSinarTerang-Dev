import { IsOptional, IsString } from 'class-validator';
import { CreatePurchaseInvoiceDto } from './create-purchase-invoice.dto';

// Layar edit PENUH (paket R6, docs/RENCANA_REVISI_TESTING_KLIEN.md §3,
// keputusan K1) — bukan header sempit seperti UpdatePurchaseInvoiceDto.
// Warisi SELURUH validasi CreatePurchaseInvoiceDto (supplierId,
// supplierInvoiceNo, receiptDate, supplierInvoiceDate, termDays,
// invoiceDiscountAmount, lines[]) apa adanya — pola sama
// ReviseSalesInvoiceDto.
export class RevisePurchaseInvoiceDto extends CreatePurchaseInvoiceDto {
  // Wajib diisi HANYA kalau faktur sudah PRINTED — pola sama
  // UpdatePurchaseInvoiceDto.reason.
  @IsOptional()
  @IsString()
  reason?: string;
}
