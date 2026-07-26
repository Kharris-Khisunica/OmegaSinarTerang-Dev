import { DataSource } from 'typeorm';
import { DocumentCounterService } from './document-counter.service';

describe('DocumentCounterService', () => {
  let dataSource: DataSource;
  let service: DocumentCounterService;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'omega_dev',
    });
    await dataSource.initialize();
    service = new DocumentCounterService();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.query(
      `DELETE FROM document_counters WHERE doc_type = 'SALES_INVOICE' AND period IN ('2609', '2610')`,
    );
  });

  it("menghasilkan nomor pertama 'INV/2609/0001'", async () => {
    const number = await dataSource.transaction((manager) =>
      service.getNextNumber('SALES_INVOICE', new Date('2026-09-01'), manager),
    );
    expect(number).toBe('INV/2609/0001');
  });

  it("panggilan kedua menghasilkan 'INV/2609/0002'", async () => {
    await dataSource.transaction((manager) =>
      service.getNextNumber('SALES_INVOICE', new Date('2026-09-01'), manager),
    );
    const second = await dataSource.transaction((manager) =>
      service.getNextNumber('SALES_INVOICE', new Date('2026-09-01'), manager),
    );
    expect(second).toBe('INV/2609/0002');
  });

  it("reset ke 'INV/2610/0001' saat ganti bulan ke Oktober", async () => {
    await dataSource.transaction((manager) =>
      service.getNextNumber('SALES_INVOICE', new Date('2026-09-01'), manager),
    );
    const october = await dataSource.transaction((manager) =>
      service.getNextNumber('SALES_INVOICE', new Date('2026-10-01'), manager),
    );
    expect(october).toBe('INV/2610/0001');
  });

  it('20 pemanggilan paralel dalam transaction terpisah menghasilkan 20 nomor unik berurutan', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        dataSource.transaction((manager) =>
          service.getNextNumber(
            'SALES_INVOICE',
            new Date('2026-09-01'),
            manager,
          ),
        ),
      ),
    );

    expect(new Set(results).size).toBe(20);

    const numbers = results
      .map((r) => Number(r.split('/')[2]))
      .sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });
});
