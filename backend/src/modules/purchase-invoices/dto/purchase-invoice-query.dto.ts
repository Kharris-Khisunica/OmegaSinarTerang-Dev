import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PurchaseInvoiceReviewStatus } from '../entities/purchase-invoice.entity';

// reviewStatus dipakai ulang oleh Pengecekan Invoice Harian (Hari 22A) lewat
// endpoint yang SAMA (KONTEKS_REVISI §2.2: "jangan membuat keluarga endpoint
// /supervisor/*") — dibentuk sekarang supaya tidak reshape API nanti.
export class PurchaseInvoiceQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsEnum(PurchaseInvoiceReviewStatus)
  reviewStatus?: PurchaseInvoiceReviewStatus;

  // Filter receiptDate persis (Hari 22A) — receiptDate = tanggal transaksi
  // yang tampil di grid ("Tgl.Bukti"), BUKAN supplierInvoiceDate. Layar
  // Pengecekan Invoice Harian menyaring per hari.
  @IsOptional()
  @IsDateString()
  date?: string;
}
