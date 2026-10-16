import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DeliveryOrderDeliveryStatus } from '../entities/delivery-order.entity';

// Satu-satunya "edit" yang ada untuk surat jalan (Hari 25) — tidak ada edit
// baris/agen/kendaraan, hanya status pengiriman. TIDAK digerbangi kunci
// cetak sejak 6 Okt 2026 (need_fixing.md #18): status kirim adalah status
// sub-ledger, bukan isi dokumen. `reason` opsional, tercatat di audit_logs.
export class UpdateDeliveryOrderStatusDto {
  @IsEnum(DeliveryOrderDeliveryStatus)
  deliveryStatus: DeliveryOrderDeliveryStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
