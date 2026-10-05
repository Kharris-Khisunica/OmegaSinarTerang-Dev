import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SalesInvoiceReviewStatus } from '../entities/sales-invoice.entity';

// PATCH /sales-invoices/:id/review (Hari 22A) — HANYA field ini yang boleh
// ditulis oleh endpoint ini, tidak pernah isi faktur (CLAUDE.md §5).
// reviewNote wajib-tidaknya divalidasi di SalesInvoicesService.review(),
// bukan di sini — lihat komentar di service.
export class ReviewSalesInvoiceDto {
  @IsEnum(SalesInvoiceReviewStatus)
  reviewStatus: SalesInvoiceReviewStatus;

  @IsOptional()
  @IsString()
  reviewNote?: string;
}
