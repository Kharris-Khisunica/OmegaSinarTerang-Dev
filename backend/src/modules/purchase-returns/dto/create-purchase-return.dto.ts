import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import {
  PurchaseReturnSettlementType,
  PurchaseReturnUnitMode,
} from '../entities/purchase-return.entity';
import { CreatePurchaseReturnLineDto } from './create-purchase-return-line.dto';

export class CreatePurchaseReturnDto {
  @IsUUID()
  supplierId: string;

  @IsDateString()
  returnDate: string;

  // Dikunci untuk SELURUH dokumen (CLAUDE.md §3 "klien tidak pernah
  // mencampur satuan dalam satu transaksi") — divalidasi di service,
  // bukan per baris.
  @IsEnum(PurchaseReturnUnitMode)
  unitMode: PurchaseReturnUnitMode;

  @IsEnum(PurchaseReturnSettlementType)
  settlementType: PurchaseReturnSettlementType;

  // WAJIB kalau settlementType=CASH, WAJIB kosong kalau REDUCE_INVOICE —
  // divalidasi di service (pola sama OpeningBalanceService, bukan custom
  // class-validator decorator).
  @IsOptional()
  @IsUUID()
  cashAccountId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseReturnLineDto)
  lines: CreatePurchaseReturnLineDto[];
}
