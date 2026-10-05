import { Module } from '@nestjs/common';
import { TaxRateResolverService } from './tax-rate-resolver.service';

@Module({
  providers: [TaxRateResolverService],
  exports: [TaxRateResolverService],
})
export class TaxRatesModule {}
