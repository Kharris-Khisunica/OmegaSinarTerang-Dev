import { IsOptional, IsString } from 'class-validator';
import { CreateSalesReturnDto } from './create-sales-return.dto';

// need_fixing.md #19 — revisi-di-tempat (§2.16a). Mewarisi SELURUH validasi
// create; salesInvoiceId WAJIB sama dengan retur asli (dicek di service).
export class ReviseSalesReturnDto extends CreateSalesReturnDto {
  // Wajib hanya kalau retur sudah PRINTED (alasan UNLOCK_PRINT intent EDIT).
  @IsOptional()
  @IsString()
  reason?: string;
}
