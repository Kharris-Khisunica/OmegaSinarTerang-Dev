import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OperationalExpenseDocumentReviewStatus } from '../entities/operational-expense-document.entity';

// PATCH /operational-expenses/:id/review — HANYA field ini yang boleh
// ditulis (pola sama ReviewCashTransferDto/ReviewSalesInvoiceDto).
// reviewNote wajib-tidaknya divalidasi di OperationalExpensesService
// .review(), bukan di sini.
export class ReviewOperationalExpenseDocumentDto {
  @IsEnum(OperationalExpenseDocumentReviewStatus)
  reviewStatus: OperationalExpenseDocumentReviewStatus;

  @IsOptional()
  @IsString()
  reviewNote?: string;
}
