import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { OperationalExpenseDocumentReviewStatus } from '../entities/operational-expense-document.entity';

export class OperationalExpenseQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  // `date` + `reviewStatus` (Hari 32A tugas 5, tab Biaya Operasional di
  // Pengecekan Invoice Harian) — pola sama CashTransferQueryDto: `date`
  // menyaring expenseDate PERSIS (bukan rentang seperti dateFrom/dateTo).
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(OperationalExpenseDocumentReviewStatus)
  reviewStatus?: OperationalExpenseDocumentReviewStatus;
}
