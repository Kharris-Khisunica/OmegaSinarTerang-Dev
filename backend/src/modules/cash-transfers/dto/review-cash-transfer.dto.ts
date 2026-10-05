import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CashTransferReviewStatus } from '../entities/cash-transfer.entity';

// PATCH /cash-transfers/:id/review — HANYA field ini yang boleh ditulis
// (pola sama ReviewSalesInvoiceDto). reviewNote wajib-tidaknya divalidasi di
// CashTransfersService.review(), bukan di sini.
export class ReviewCashTransferDto {
  @IsEnum(CashTransferReviewStatus)
  reviewStatus: CashTransferReviewStatus;

  @IsOptional()
  @IsString()
  reviewNote?: string;
}
