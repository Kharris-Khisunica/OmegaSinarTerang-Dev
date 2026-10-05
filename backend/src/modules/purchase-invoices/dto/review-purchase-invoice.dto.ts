import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PurchaseInvoiceReviewStatus } from '../entities/purchase-invoice.entity';

// PATCH /purchase-invoices/:id/review (Hari 22A) — HANYA field ini yang boleh
// ditulis oleh endpoint ini, tidak pernah isi faktur (CLAUDE.md §5).
// reviewNote wajib-tidaknya divalidasi di PurchaseInvoicesService.review(),
// bukan di sini — lihat komentar di service.
export class ReviewPurchaseInvoiceDto {
  @IsEnum(PurchaseInvoiceReviewStatus)
  reviewStatus: PurchaseInvoiceReviewStatus;

  @IsOptional()
  @IsString()
  reviewNote?: string;
}
