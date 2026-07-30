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

  it("menghasilkan nomor pertama 'JL/RM01-26090001'", async () => {
    const number = await dataSource.transaction((manager) =>
      service.getNextNumber('SALES_INVOICE', new Date('2026-09-01'), manager),
    );
    expect(number).toBe('JL/RM01-26090001');
  });

  it("panggilan kedua menghasilkan 'JL/RM01-26090002'", async () => {
    await dataSource.transaction((manager) =>
      service.getNextNumber('SALES_INVOICE', new Date('2026-09-01'), manager),
    );
    const second = await dataSource.transaction((manager) =>
      service.getNextNumber('SALES_INVOICE', new Date('2026-09-01'), manager),
    );
    expect(second).toBe('JL/RM01-26090002');
  });

  it("reset ke 'JL/RM01-26100001' saat ganti bulan ke Oktober", async () => {
    await dataSource.transaction((manager) =>
      service.getNextNumber('SALES_INVOICE', new Date('2026-09-01'), manager),
    );
    const october = await dataSource.transaction((manager) =>
      service.getNextNumber('SALES_INVOICE', new Date('2026-10-01'), manager),
    );
    expect(october).toBe('JL/RM01-26100001');
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

    // Format baru: 'JL/RM01-26090001' — hanya satu slash (prefix vs
    // storeCode+period+sequence), 4 digit terakhir adalah nomor urut.
    const numbers = results
      .map((r) => Number(r.split('/')[1].slice(-4)))
      .sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it('transaksi yang di-rollback TIDAK menaikkan last_number', async () => {
    const before: { last_number: number }[] = await dataSource.query(
      `SELECT last_number FROM document_counters WHERE doc_type = 'SALES_INVOICE' AND period = '2609'`,
    );
    const beforeNumber = before[0]?.last_number ?? 0;

    await expect(
      dataSource.transaction(async (manager) => {
        await service.getNextNumber(
          'SALES_INVOICE',
          new Date('2026-09-01'),
          manager,
        );
        throw new Error('rollback sengaja untuk uji nomor tidak hilang');
      }),
    ).rejects.toThrow('rollback sengaja');

    const after: { last_number: number }[] = await dataSource.query(
      `SELECT last_number FROM document_counters WHERE doc_type = 'SALES_INVOICE' AND period = '2609'`,
    );
    const afterNumber = after[0]?.last_number ?? 0;

    expect(afterNumber).toBe(beforeNumber);
  });
});
