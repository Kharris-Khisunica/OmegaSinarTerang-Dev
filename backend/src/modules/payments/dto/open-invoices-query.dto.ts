import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PaymentInvoiceType } from '../entities/payment.entity';

export class OpenInvoicesQueryDto {
  @IsEnum(PaymentInvoiceType)
  invoiceType: PaymentInvoiceType;

  // OPSIONAL (paket R9, KB1) — kosong = daftar faktur terbuka LINTAS PIHAK,
  // dipakai layar Kas & Bank multi-baris (satu batch boleh lintas banyak
  // pelanggan/supplier, PaymentsService.confirm() sudah mendukungnya sejak
  // Hari 27). Diisi = perilaku lama, daftar satu pihak saja.
  @IsOptional()
  @IsUUID()
  partyId?: string;

  // Nomor faktur (ILIKE) — supaya daftar lintas pihak tidak membanjiri
  // layar begitu partyId dikosongkan.
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
