import { IsOptional, IsString } from 'class-validator';
import { CreateSalesInvoiceDto } from './create-sales-invoice.dto';

// Layar edit PENUH (paket R6, docs/RENCANA_REVISI_TESTING_KLIEN.md §3,
// keputusan K1) — bukan modal dua field seperti UpdateSalesInvoiceDto. Warisi
// SELURUH validasi CreateSalesInvoiceDto (customerId, salesChannel,
// salesOrderId, salesmanId, invoiceDate, termDays, lines[]) apa adanya:
// operator mengetik ulang faktur yang SUDAH TERISI dari data lama, sama
// seperti mengisi faktur baru — bukan patch parsial, supaya tidak ada field
// yang diam-diam "warisan" dari nilai lama tanpa operator sadar sedang
// melihat nilai lama itu.
export class ReviseSalesInvoiceDto extends CreateSalesInvoiceDto {
  // Wajib diisi HANYA kalau faktur sudah PRINTED (divalidasi di
  // PrintLockService.preflight/consume, bukan di sini) — pola sama
  // UpdateSalesInvoiceDto.reason.
  @IsOptional()
  @IsString()
  reason?: string;
}
