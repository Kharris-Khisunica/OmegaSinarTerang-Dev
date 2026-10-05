import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateSalesOrderLineDto } from './create-sales-order-line.dto';

export class CreateSalesOrderDto {
  @IsUUID()
  customerId: string;

  @IsDateString()
  orderDate: string;

  // PJ (penanggung jawab) atas SO ini — koreksi 02 Okt 2026, lihat komentar
  // SalesOrder entity.
  @IsUUID()
  salesmanId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderLineDto)
  lines: CreateSalesOrderLineDto[];
}
