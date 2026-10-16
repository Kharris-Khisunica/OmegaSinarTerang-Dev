import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { StockOpnameStatus } from '../entities/stock-opname.entity';

export class StockOpnameQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(StockOpnameStatus)
  status?: StockOpnameStatus;
}
