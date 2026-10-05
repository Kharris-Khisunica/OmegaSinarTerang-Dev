import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { TaxRateResolverService } from '../../core/tax-rates/tax-rate-resolver.service';

/**
 * Endpoint baca-saja, tanpa @Roles (semua role login boleh baca — dipakai
 * Faktur Pembelian FE untuk preview PPN masukan LIVE sebelum submit, CLAUDE.md
 * §4). Tarif yang sesungguhnya dipakai dihitung ulang server-side di
 * PurchaseInvoicesService.create() lewat service yang sama
 * (TaxRateResolverService) — endpoint ini murni cermin baca untuk preview,
 * tidak pernah jadi sumber kebenaran transaksi.
 */
@Controller('tax-rates')
export class TaxRatesController {
  constructor(
    private readonly taxRateResolverService: TaxRateResolverService,
  ) {}

  @Get('effective')
  async getEffective(@Query('date') date?: string) {
    const target = date ? parseDateOnly(date) : new Date();
    const rate = await this.taxRateResolverService.getEffectiveRate(target);
    return { rate };
  }
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    throw new BadRequestException(
      'Parameter date tidak valid, format YYYY-MM-DD.',
    );
  }
  return new Date(Date.UTC(year, month - 1, day));
}
