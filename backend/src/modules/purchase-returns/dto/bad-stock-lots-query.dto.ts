import { IsUUID } from 'class-validator';

// Alur WAJIB "pilih supplier dulu" (CLAUDE.md §3 "Bad stock") — supplierId
// wajib, tidak ada mode "semua supplier sekaligus".
export class BadStockLotsQueryDto {
  @IsUUID()
  supplierId: string;
}
