import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { CashTransferReviewStatus } from '../entities/cash-transfer.entity';

export class CashTransferQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  // `reviewStatus` + `date` (paket R9, tab Pindah Buku Kas di Pengecekan
  // Invoice Harian) -- pola SAMA SalesInvoiceQueryDto/PurchaseInvoiceQueryDto
  // (Hari 22A): `date` menyaring transferDate PERSIS (bukan rentang seperti
  // dateFrom/dateTo di atas, yang dipakai layar Riwayat biasa), endpoint
  // yang SAMA dipakai ulang oleh halaman operator DAN Supervisor.
  @IsOptional()
  @IsEnum(CashTransferReviewStatus)
  reviewStatus?: CashTransferReviewStatus;

  @IsOptional()
  @IsDateString()
  date?: string;
}
