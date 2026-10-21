import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

// Surat jalan terbentuk DARI faktur — TIDAK ADA array `lines` di sini
// (beda dari CreateSalesReturnDto). Seluruh baris faktur PENGIRIMAN disalin
// otomatis oleh DeliveryOrdersService.create(), operator hanya memilih
// faktur + salesman + kendaraan + pekerja.
export class CreateDeliveryOrderDto {
  @IsUUID()
  salesInvoiceId: string;

  @IsDateString()
  deliveryDate: string;

  @IsUUID()
  salesmanId: string;

  @IsUUID()
  vehicleId: string;

  // Hari 44 — pekerja (tukang angkut) yang ikut mengantar, minimal satu.
  @IsArray()
  @ArrayMinSize(1, { message: 'Pilih minimal satu pekerja.' })
  @ArrayUnique({ message: 'Pekerja tidak boleh dipilih dua kali.' })
  @IsUUID('4', { each: true })
  workerIds: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
