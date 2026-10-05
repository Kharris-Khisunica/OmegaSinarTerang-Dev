import { Module } from '@nestjs/common';
import { TaxRatesModule as TaxRateResolverModule } from '../../core/tax-rates/tax-rates.module';
import { TaxRatesController } from './tax-rates.controller';

// Modul HTTP tipis di atas src/core/tax-rates (engine service, tanpa
// controller — konvensi src/core/ CLAUDE.md §6). Dinamai *Http* untuk
// menghindari tabrakan nama import dengan modul core di app.module.ts.
@Module({
  imports: [TaxRateResolverModule],
  controllers: [TaxRatesController],
})
export class TaxRatesHttpModule {}
