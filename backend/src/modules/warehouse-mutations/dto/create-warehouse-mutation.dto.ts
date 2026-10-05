import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CreateWarehouseMutationLineDto {
  @IsUUID()
  productId: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  qtyBaseUnit: number;

  // WAJIB untuk cabang titipan (dto.customerId terisi) — diperiksa di
  // WarehouseMutationsService.processTitipan(), bukan di sini, karena
  // class-validator per-item tidak punya akses bersih ke customerId di DTO
  // induk. Baris faktur mana yang ditunjuk (paket R8 keputusan K7).
  @IsOptional()
  @IsUUID()
  salesInvoiceLineId?: string;
}

// TIDAK ADA field unitCost di sini dengan sengaja (CLAUDE.md §3 "Mutasi
// gudang": unit_cost WAJIB read-only, tidak pernah bisa diketik dari layar
// atau endpoint mana pun — nilainya hanya boleh berasal dari lot asal lewat
// StockRecorderService.transfer()).
export class CreateWarehouseMutationDto {
  @IsOptional()
  @IsDateString()
  mutationDate?: string;

  // Kosong = gudang STORE aktif default (CLAUDE.md §3: "Lokasi selalu default
  // STORE").
  @IsOptional()
  @IsUUID()
  fromWarehouseId?: string;

  // Cabang B/C (STORE<->BAD_STOCK). Persis satu dari toWarehouseId/customerId
  // wajib diisi — divalidasi di service (pola sama OpeningBalanceService),
  // bukan custom class-validator decorator.
  @IsOptional()
  @IsUUID()
  toWarehouseId?: string;

  // Cabang A (titipan pelanggan) — service resolve/create gudang
  // TITIPAN_PELANGGAN milik customer ini.
  @IsOptional()
  @IsUUID()
  customerId?: string;

  // WAJIB kalau customerId terisi (paket R8 keputusan K7 — satu dokumen
  // mutasi titipan merujuk tepat satu faktur penjualan). Tidak dipakai sama
  // sekali untuk cabang B/C.
  @ValidateIf((o: CreateWarehouseMutationDto) => !!o.customerId)
  @IsUUID()
  salesInvoiceId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateWarehouseMutationLineDto)
  lines: CreateWarehouseMutationLineDto[];
}
