import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class PostManualJournalLineDto {
  @IsUUID()
  accountId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  debit: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  credit: number;

  @IsOptional()
  @IsString()
  description?: string;
}

// sourceType/createdBy SENGAJA tidak ada di sini — service selalu memaksa
// sourceType 'MANUAL' dan createdBy dari req.user, tidak boleh dikontrol
// client (CLAUDE.md §5: Jurnal Manual MASTER only, tapi tetap tidak boleh
// mengaku-aku sebagai sourceType lain).
export class PostManualJournalDto {
  @IsDateString()
  entryDate: string;

  @IsOptional()
  @IsString()
  description?: string;

  @ArrayMinSize(2, {
    message: 'Jurnal minimal harus punya 2 baris.',
  })
  @ValidateNested({ each: true })
  @Type(() => PostManualJournalLineDto)
  lines: PostManualJournalLineDto[];
}
