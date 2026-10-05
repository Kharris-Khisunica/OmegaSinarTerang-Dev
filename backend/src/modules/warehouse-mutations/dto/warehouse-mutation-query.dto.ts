import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { WarehouseMutationType } from '../entities/warehouse-mutation.entity';

export class WarehouseMutationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(WarehouseMutationType)
  mutationType?: WarehouseMutationType;
}
