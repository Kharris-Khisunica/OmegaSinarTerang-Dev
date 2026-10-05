import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

export type SalesReportGroupBy = 'CUSTOMER' | 'SALESMAN' | 'INVOICE';

const GROUP_BY_VALUES: SalesReportGroupBy[] = [
  'CUSTOMER',
  'SALESMAN',
  'INVOICE',
];

// Laporan Penjualan (Hari 30, CLAUDE.md §0) — "per periode, per pelanggan,
// PER SALESMAN" (salesman dipilih per faktur, CLAUDE.md §3 "Salesman"), TANPA
// komisi (murni lihat kinerja). `groupBy=INVOICE` = mode Detail (satu baris
// per faktur), CUSTOMER/SALESMAN = mode Rekap (satu baris per pihak) — pola
// radio TIPE Rekap/Detail §14.1 PANDUAN_UI.
export class SalesReportQueryDto {
  @IsDateString()
  dateFrom: string;

  @IsDateString()
  dateTo: string;

  @IsOptional()
  @IsIn(GROUP_BY_VALUES)
  groupBy?: SalesReportGroupBy;

  // R11/L2 (20 Sep 2026) — filter opsional, hanya berarti bersama
  // groupBy=INVOICE: menampilkan faktur mana yang dipegang salesman ini,
  // tanpa perlu mode groupBy keempat. Diabaikan di service untuk mode Rekap.
  @IsOptional()
  @IsUUID()
  salesmanId?: string;
}
