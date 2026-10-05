import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { DeliveryOrderDeliveryStatus } from '../entities/delivery-order.entity';

export class DeliveryOrderQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  salesInvoiceId?: string;

  // Dipakai ulang untuk daftar "belum terkirim" (?deliveryStatus=POSTPONED) —
  // tidak ada endpoint /delivery-orders/pending-list terpisah, sama seperti
  // Pengecekan Invoice Harian yang memakai ulang GET dengan filter
  // (KONTEKS_REVISI §2.2: "jangan membuat keluarga endpoint terpisah").
  @IsOptional()
  @IsEnum(DeliveryOrderDeliveryStatus)
  deliveryStatus?: DeliveryOrderDeliveryStatus;
}
