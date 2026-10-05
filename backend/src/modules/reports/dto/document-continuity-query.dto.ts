import { Type } from 'class-transformer';
import { IsIn, IsInt, Max, Min } from 'class-validator';
import { DOCUMENT_CONTINUITY_TYPE_KEYS } from '../document-continuity-registry';
import type { DocumentContinuityType } from '../document-continuity-registry';

export class DocumentContinuityQueryDto {
  @IsIn(DOCUMENT_CONTINUITY_TYPE_KEYS, {
    message: `type harus salah satu dari: ${DOCUMENT_CONTINUITY_TYPE_KEYS.join(', ')}`,
  })
  type: DocumentContinuityType;

  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;
}
