import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DeliveryOrderDeliveryStatus } from '../entities/delivery-order.entity';

// Satu-satunya "edit" yang ada untuk surat jalan hari ini (Hari 25) —
// tidak ada edit baris/agen/kendaraan, hanya status pengiriman. Digerbangi
// PrintLockService: kalau SJ sudah PRINTED, `reason` wajib dan approval
// UNLOCK_PRINT dikonsumsi sebelum status berubah (CLAUDE.md §2.16 — sopir
// sudah membawa lembar itu ke jalan).
export class UpdateDeliveryOrderStatusDto {
  @IsEnum(DeliveryOrderDeliveryStatus)
  deliveryStatus: DeliveryOrderDeliveryStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
