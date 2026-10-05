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
import { SalesReturnSettlementType } from '../entities/sales-return.entity';
import { CreateSalesReturnLineDto } from './create-sales-return-line.dto';

export class CreateSalesReturnDto {
  // WAJIB menunjuk faktur asal (CLAUDE.md §3 "Lain-lain") — tanpa ini,
  // ditolak di service (invoice tidak ditemukan).
  @IsUUID()
  salesInvoiceId: string;

  @IsDateString()
  returnDate: string;

  @IsEnum(SalesReturnSettlementType)
  settlementType: SalesReturnSettlementType;

  // WAJIB kalau settlementType=CASH, WAJIB kosong kalau REDUCE_INVOICE —
  // divalidasi di service (pola sama PurchaseReturnsService).
  @IsOptional()
  @IsUUID()
  cashAccountId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSalesReturnLineDto)
  lines: CreateSalesReturnLineDto[];
}
