import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateSalesOrderLineDto } from './create-sales-order-line.dto';

// customerId SENGAJA tidak bisa diubah di sini — menjaga
// assertChannelSalesOrderRequirement()'s pengecekan kecocokan pelanggan
// tetap tidak ambigu (SalesOrdersService, dikonfirmasi lewat plan Hari 19).
// Ditolak total begitu status CONVERTED (guard di service, sebelum
// transaction dibuka) — dokumen ini tidak butuh field "reason" seperti
// UpdatePurchaseInvoiceDto karena SO tidak ikut kunci cetak.
export class UpdateSalesOrderDto {
  @IsOptional()
  @IsDateString()
  orderDate?: string;

  // PJ boleh dikoreksi selama SO masih OPEN — belum mengikat apa pun
  // (§3 "Sales Order tidak menahan stok"), beda dari sales_invoices yang
  // menguncinya setelah SO terpakai.
  @IsOptional()
  @IsUUID()
  salesmanId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderLineDto)
  lines?: CreateSalesOrderLineDto[];
}
