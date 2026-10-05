import { IsUUID } from 'class-validator';

export class PriceSuggestionQueryDto {
  @IsUUID()
  customerId: string;

  @IsUUID()
  productId: string;

  @IsUUID()
  unitId: string;
}
