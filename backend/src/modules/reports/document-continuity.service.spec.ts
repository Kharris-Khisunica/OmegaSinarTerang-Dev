import { DataSource } from 'typeorm';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { DocumentContinuityService } from './document-continuity.service';
import { assertDocumentContinuityType } from './document-continuity-registry';

/**
 * Integration test terhadap Postgres asli (pola sama
 * document-counter.service.spec.ts) — fixture dokumen dibuat lewat INSERT
 * langsung + DocumentCounterService.getNextNumber() (bukan lewat
 * SalesInvoicesService penuh, yang membutuhkan produk/stok/gudang) supaya
 * fokus test ini murni pada logic laporan: pembacaan document_counters +
 * pencocokan baris dokumen, bukan mengulang test alur invoice.
 *
 * Setiap skenario memakai period (YYMM) yang jauh dari data spec lain
 * (tahun 2031) supaya tidak bentrok dengan fixture test lain yang memakai
 * tahun 2026.
 */
describe('DocumentContinuityService', () => {
  let dataSource: DataSource;
  let documentCounterService: DocumentCounterService;
  let service: DocumentContinuityService;

  let userId: string;
  let customerId: string;
  let salesmanId: string;
  let fromWarehouseId: string;
  let toWarehouseId: string;

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
    documentCounterService = new DocumentCounterService();
    service = new DocumentContinuityService(dataSource);

    const stamp = Date.now();
    const userRows: { id: string }[] = await dataSource.query(
      `INSERT INTO users (username, password_hash, full_name, role)
       VALUES ($1, 'x', 'Test Hari 28', 'MASTER') RETURNING id`,
      [`test_continuity_${stamp}`],
    );
    userId = userRows[0].id;

    const customerRows: { id: string }[] = await dataSource.query(
      `INSERT INTO customers (code, name) VALUES ($1, $2) RETURNING id`,
      [`CTY${stamp}`, 'Toko A (Uji Kontinuitas)'],
    );
    customerId = customerRows[0].id;

    const salesmanRows: { id: string }[] = await dataSource.query(
      `INSERT INTO salesmen (code, name) VALUES ($1, 'Sales Uji') RETURNING id`,
      [`SLM${stamp}`],
    );
    salesmanId = salesmanRows[0].id;

    const fromWh: { id: string }[] = await dataSource.query(
      `INSERT INTO warehouses (name, warehouse_type) VALUES ($1, 'BAD_STOCK') RETURNING id`,
      [`Gudang Asal Uji ${stamp}`],
    );
    fromWarehouseId = fromWh[0].id;
    const toWh: { id: string }[] = await dataSource.query(
      `INSERT INTO warehouses (name, warehouse_type) VALUES ($1, 'BAD_STOCK') RETURNING id`,
      [`Gudang Tujuan Uji ${stamp}`],
    );
    toWarehouseId = toWh[0].id;
  });

  afterAll(async () => {
    await dataSource.query(
      `DELETE FROM sales_invoices WHERE customer_id = $1`,
      [customerId],
    );
    await dataSource.query(
      `DELETE FROM warehouse_mutations WHERE from_warehouse_id = $1 OR to_warehouse_id = $1`,
      [fromWarehouseId],
    );
    await dataSource.query(`DELETE FROM warehouses WHERE id IN ($1, $2)`, [
      fromWarehouseId,
      toWarehouseId,
    ]);
    await dataSource.query(`DELETE FROM salesmen WHERE id = $1`, [salesmanId]);
    await dataSource.query(`DELETE FROM customers WHERE id = $1`, [customerId]);
    await dataSource.query(`DELETE FROM users WHERE id = $1`, [userId]);
    await dataSource.query(
      `DELETE FROM document_counters WHERE period LIKE '31%'`,
    );
    await dataSource.destroy();
  });

  async function insertSalesInvoice(
    invoiceNumber: string,
    invoiceDate: string,
    opts?: {
      voided?: boolean;
      voidReasonCode?: string;
      voidReasonNote?: string;
    },
  ): Promise<void> {
    await dataSource.query(
      `INSERT INTO sales_invoices
        (invoice_number, invoice_date, customer_id, sales_channel, salesman_id,
         due_date, subtotal, total_amount, created_by, posting_status,
         void_reason_code, void_reason_note)
       VALUES ($1, $2, $3, 'TOKO', $4, $2, 100000, 100000, $5, $6, $7, $8)`,
      [
        invoiceNumber,
        invoiceDate,
        customerId,
        salesmanId,
        userId,
        opts?.voided ? 'VOIDED' : 'POSTED',
        opts?.voidReasonCode ?? null,
        opts?.voidReasonNote ?? null,
      ],
    );
  }

  it('VOID di tengah bulan tetap muncul dengan alasannya, tanpa lubang', async () => {
    const period = '3103';
    await dataSource.query(
      `DELETE FROM sales_invoices WHERE invoice_number LIKE $1`,
      [`JL/RM01-${period}%`],
    );
    await dataSource.query(
      `DELETE FROM document_counters WHERE doc_type = 'SALES_INVOICE' AND period = $1`,
      [period],
    );

    const date = new Date('2031-03-10');
    const n1 = await dataSource.transaction((m) =>
      documentCounterService.getNextNumber('SALES_INVOICE', date, m),
    );
    const n2 = await dataSource.transaction((m) =>
      documentCounterService.getNextNumber('SALES_INVOICE', date, m),
    );
    const n3 = await dataSource.transaction((m) =>
      documentCounterService.getNextNumber('SALES_INVOICE', date, m),
    );

    await insertSalesInvoice(n1, '2031-03-10');
    await insertSalesInvoice(n2, '2031-03-10', {
      voided: true,
      voidReasonCode: 'PELANGGAN_BATAL',
      voidReasonNote: 'Toko tutup, batal kirim (uji Hari 28).',
    });
    await insertSalesInvoice(n3, '2031-03-11');

    const result = await service.getContinuity('SALES_INVOICE', 2031, 3);

    expect(result.summary.lastNumber).toBe(3);
    expect(result.summary.gapCount).toBe(0);
    expect(result.rows).toHaveLength(3);
    expect(result.rows.every((r) => !r.isGap)).toBe(true);

    expect(result.rows[0].documentNumber).toBe(n1);
    expect(result.rows[0].status).toBe('POSTED');

    expect(result.rows[1].documentNumber).toBe(n2);
    expect(result.rows[1].status).toBe('VOIDED');
    expect(result.rows[1].voidReasonCode).toBe('PELANGGAN_BATAL');
    expect(result.rows[1].voidReasonNote).toBe(
      'Toko tutup, batal kirim (uji Hari 28).',
    );

    expect(result.rows[2].documentNumber).toBe(n3);
    expect(result.rows[2].status).toBe('POSTED');
  });

  it('nomor yang barisnya hilang ditandai MISSING (lubang)', async () => {
    const period = '3104';
    await dataSource.query(
      `DELETE FROM sales_invoices WHERE invoice_number LIKE $1`,
      [`JL/RM01-${period}%`],
    );
    await dataSource.query(
      `DELETE FROM document_counters WHERE doc_type = 'SALES_INVOICE' AND period = $1`,
      [period],
    );

    const date = new Date('2031-04-05');
    const n1 = await dataSource.transaction((m) =>
      documentCounterService.getNextNumber('SALES_INVOICE', date, m),
    );
    const n2 = await dataSource.transaction((m) =>
      documentCounterService.getNextNumber('SALES_INVOICE', date, m),
    );
    // n3 sengaja TIDAK diinsert — mensimulasikan baris yang hilang tanpa
    // penjelasan (secara desain tidak boleh terjadi, tapi laporan ini ada
    // untuk membuktikannya, bukan mengasumsikannya — lihat CLAUDE.md §2.4).
    const n3 = await dataSource.transaction((m) =>
      documentCounterService.getNextNumber('SALES_INVOICE', date, m),
    );
    const n4 = await dataSource.transaction((m) =>
      documentCounterService.getNextNumber('SALES_INVOICE', date, m),
    );
    void n3;

    await insertSalesInvoice(n1, '2031-04-05');
    await insertSalesInvoice(n2, '2031-04-05');
    await insertSalesInvoice(n4, '2031-04-06');

    const result = await service.getContinuity('SALES_INVOICE', 2031, 4);

    expect(result.summary.lastNumber).toBe(4);
    expect(result.summary.gapCount).toBe(1);
    expect(result.rows).toHaveLength(4);

    expect(result.rows[0].isGap).toBe(false);
    expect(result.rows[1].isGap).toBe(false);
    expect(result.rows[2].isGap).toBe(true);
    expect(result.rows[2].status).toBe('MISSING');
    expect(result.rows[2].documentNumber).toBe('JL/RM01-31040003');
    expect(result.rows[3].isGap).toBe(false);
    expect(result.rows[3].documentNumber).toBe(n4);
  });

  it('5 faktur, gagal di tengah transaksi ke-3 (rollback) -> tetap 1-2-3-4 berurutan tanpa lubang', async () => {
    const period = '3105';
    await dataSource.query(
      `DELETE FROM sales_invoices WHERE invoice_number LIKE $1`,
      [`JL/RM01-${period}%`],
    );
    await dataSource.query(
      `DELETE FROM document_counters WHERE doc_type = 'SALES_INVOICE' AND period = $1`,
      [period],
    );

    const date = new Date('2031-05-01');

    const n1 = await dataSource.transaction((m) =>
      documentCounterService.getNextNumber('SALES_INVOICE', date, m),
    );
    await insertSalesInvoice(n1, '2031-05-01');

    const n2 = await dataSource.transaction((m) =>
      documentCounterService.getNextNumber('SALES_INVOICE', date, m),
    );
    await insertSalesInvoice(n2, '2031-05-01');

    // Faktur ke-3: dipaksa gagal DI TENGAH transaction (setelah nomor
    // diambil, sebelum commit) — persis skenario DoD Hari 28. Karena
    // document_counters ikut transaction yang sama (CLAUDE.md §2.4),
    // rollback ini mengembalikan nomornya, TIDAK menaikkan last_number.
    await expect(
      dataSource.transaction(async (m) => {
        await documentCounterService.getNextNumber('SALES_INVOICE', date, m);
        throw new Error('gagal sengaja di tengah faktur ke-3 (uji Hari 28)');
      }),
    ).rejects.toThrow('gagal sengaja di tengah faktur ke-3');

    // Faktur ke-4 dan ke-5 (klien): berhasil normal, otomatis mengambil
    // nomor urut 3 dan 4 — bukan 4 dan 5 — karena percobaan yang gagal di
    // atas tidak pernah menaikkan counter.
    const n3 = await dataSource.transaction((m) =>
      documentCounterService.getNextNumber('SALES_INVOICE', date, m),
    );
    await insertSalesInvoice(n3, '2031-05-01');

    const n4 = await dataSource.transaction((m) =>
      documentCounterService.getNextNumber('SALES_INVOICE', date, m),
    );
    await insertSalesInvoice(n4, '2031-05-01');

    const result = await service.getContinuity('SALES_INVOICE', 2031, 5);

    expect(result.summary.lastNumber).toBe(4);
    expect(result.summary.gapCount).toBe(0);
    expect(result.rows.map((r) => r.documentNumber)).toEqual([
      'JL/RM01-31050001',
      'JL/RM01-31050002',
      'JL/RM01-31050003',
      'JL/RM01-31050004',
    ]);
    expect(result.rows.every((r) => r.status === 'POSTED' && !r.isGap)).toBe(
      true,
    );
  });

  it('periode tanpa dokumen sama sekali -> daftar kosong, tanpa error', async () => {
    const result = await service.getContinuity('SALES_INVOICE', 2031, 12);
    expect(result.summary.lastNumber).toBe(0);
    expect(result.summary.gapCount).toBe(0);
    expect(result.rows).toEqual([]);
  });

  it('berlaku untuk jenis dokumen lain (WAREHOUSE_MUTATION) — pihak & nominal generik', async () => {
    const period = '3106';
    await dataSource.query(
      `DELETE FROM warehouse_mutations WHERE mutation_number LIKE $1`,
      [`GD/RM01-${period}%`],
    );
    await dataSource.query(
      `DELETE FROM document_counters WHERE doc_type = 'WAREHOUSE_MUTATION' AND period = $1`,
      [period],
    );

    const date = new Date('2031-06-01');
    const n1 = await dataSource.transaction((m) =>
      documentCounterService.getNextNumber('WAREHOUSE_MUTATION', date, m),
    );
    await dataSource.query(
      `INSERT INTO warehouse_mutations
        (mutation_number, mutation_date, mutation_type, from_warehouse_id, to_warehouse_id, created_by)
       VALUES ($1, $2, 'TRANSFER', $3, $4, $5)`,
      [n1, '2031-06-01', fromWarehouseId, toWarehouseId, userId],
    );

    const result = await service.getContinuity('WAREHOUSE_MUTATION', 2031, 6);

    expect(result.summary.lastNumber).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].documentNumber).toBe(n1);
    // GD tidak menyentuh uang (CLAUDE.md §3 "Mutasi gudang") — nominal NULL.
    expect(result.rows[0].amount).toBeNull();
    expect(result.rows[0].party).toContain('->');
  });

  it('Sales Order ditolak — keputusan 29 Juli, tidak masuk laporan ini', async () => {
    expect(() => assertDocumentContinuityType('SALES_ORDER')).toThrow();
    await expect(
      service.getContinuity('SALES_ORDER', 2031, 3),
    ).rejects.toThrow();
  });
});
