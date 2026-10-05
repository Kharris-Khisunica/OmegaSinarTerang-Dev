import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SalesInvoiceReviewStatus } from '../entities/sales-invoice.entity';

// reviewStatus dipakai ulang oleh Pengecekan Invoice Harian (Hari 22A) lewat
// endpoint yang SAMA (KONTEKS_REVISI §2.2: "jangan membuat keluarga endpoint
// /supervisor/*") — dibentuk sekarang supaya tidak reshape API nanti.
export class SalesInvoiceQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsEnum(SalesInvoiceReviewStatus)
  reviewStatus?: SalesInvoiceReviewStatus;

  // Filter invoiceDate persis (Hari 22A) — layar Pengecekan Invoice Harian
  // menyaring per hari.
  @IsOptional()
  @IsDateString()
  date?: string;
}
