import { IsNotEmpty, IsString } from 'class-validator';

export class CancelSalesOrderDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
