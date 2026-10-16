import { DataSource } from 'typeorm';
import { Setting } from '../settings/entities/setting.entity';
import { SettingsService } from '../settings/settings.service';
import { DashboardService } from './dashboard.service';
import { ReceivablesReportService } from './receivables-report.service';

/**
 * Ringkasan beranda (need_fixing.md #9) — read-only terhadap DB dev. Yang
 * diuji: angka KONSISTEN dengan sumbernya (Laporan Piutang & saldo stok),
 * bukan nilai absolut (data dev berubah-ubah).
 */
describe('DashboardService', () => {
  let dataSource: DataSource;
  let receivables: ReceivablesReportService;
  let service: DashboardService;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'omega_dev',
      entities: [Setting],
    });
    await dataSource.initialize();
    receivables = new ReceivablesReportService(
      dataSource,
      new SettingsService(dataSource.getRepository(Setting)),
    );
    service = new DashboardService(dataSource, receivables);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('total piutang = Σ total Laporan Piutang; jatuh tempo <= total; stok minus = hitungan langsung', async () => {
    const summary = await service.getSummary();
    const aging = await receivables.getAgingReport();
    const agingTotal = aging.rows
      .filter((r) => r.partyId !== null)
      .reduce((s, r) => s + r.total, 0);

    expect(summary.receivables.outstandingTotal).toBeCloseTo(agingTotal, 2);
    expect(summary.receivables.overdueTotal).toBeLessThanOrEqual(
      summary.receivables.outstandingTotal + 0.01,
    );
    expect(summary.salesToday.count).toBeGreaterThanOrEqual(0);

    const neg: { count: number }[] = await dataSource.query(
      `SELECT COUNT(*)::int AS count FROM (
         SELECT b.product_id FROM product_stock_balance b
         JOIN warehouses w ON w.id = b.warehouse_id
         WHERE w.warehouse_type = 'STORE'
         GROUP BY b.product_id HAVING SUM(b.qty_base_unit) < 0) n`,
    );
    expect(summary.negativeStockCount).toBe(Number(neg[0].count));
  });
});
