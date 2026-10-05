import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

// Surat jalan terbentuk DARI faktur — TIDAK ADA array `lines` di sini
// (beda dari CreateSalesReturnDto). Seluruh baris faktur PENGIRIMAN disalin
// otomatis oleh DeliveryOrdersService.create(), operator hanya memilih
// faktur + salesman + kendaraan.
export class CreateDeliveryOrderDto {
  @IsUUID()
  salesInvoiceId: string;

  @IsDateString()
  deliveryDate: string;

  @IsUUID()
  salesmanId: string;

  @IsUUID()
  vehicleId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
