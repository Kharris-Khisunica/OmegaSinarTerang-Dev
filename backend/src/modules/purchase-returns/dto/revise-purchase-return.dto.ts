import { IsOptional, IsString } from 'class-validator';
import { CreatePurchaseReturnDto } from './create-purchase-return.dto';

// need_fixing.md #19 — revisi-di-tempat (§2.16a); supplierId WAJIB sama
// dengan retur asli (dicek di service).
export class RevisePurchaseReturnDto extends CreatePurchaseReturnDto {
  // Wajib hanya kalau retur sudah PRINTED (alasan UNLOCK_PRINT intent EDIT).
  @IsOptional()
  @IsString()
  reason?: string;
}
