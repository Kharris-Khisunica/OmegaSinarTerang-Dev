import { Controller, Get, Query } from '@nestjs/common';
import { PriceSuggestionQueryDto } from './dto/price-suggestion-query.dto';
import { PriceSuggestionService } from './price-suggestion.service';

// Tanpa @Roles — baca-saja, dipakai OPERATOR & MASTER saat entri Faktur
// Penjualan (pola sama GET /products/:id/committed-qty).
@Controller('price-suggestion')
export class PriceSuggestionController {
  constructor(
    private readonly priceSuggestionService: PriceSuggestionService,
  ) {}

  @Get()
  async get(@Query() query: PriceSuggestionQueryDto) {
    return this.priceSuggestionService.getSuggestions(
      query.customerId,
      query.productId,
      query.unitId,
    );
  }
}
