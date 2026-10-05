import { DataSource } from 'typeorm';
import { ProductsService } from '../../modules/products/products.service';
import { StockRecorderService } from '../../core/stock-recorder/stock-recorder.service';
import { StockReportsService } from './stock-reports.service';

/**
 * Integration test terhadap Postgres asli (pola sama
 * document-continuity.service.spec.ts) — fixture dibuat lewat INSERT
 * langsung (bukan lewat WarehouseMutationsService penuh) supaya fokus pada
 * logic laporan itu sendiri: agregasi product_stock_balance per warehouse
 * type, dan pivot warehouse_mutation_lines per pelanggan.
 */
describe('StockReportsService', () => {
  let dataSource: DataSource;
  let service: StockReportsService;

  let userId: string;
  let brandId: string;
  let productBreakdownId: string; // punya konversi DUS=20 RENCENG
  let productSimpleId: string; // tanpa konversi, base unit PCS
  let productMismatchId: string; // sengaja dibuat balance != SUM(movements)
  let storeWarehouseId: string;
  let badStockWarehouseId: string;
  let customerAId: string;
  let customerBId: string;
  let titipanWarehouseAId: string;
  let titipanWarehouseBId: string;
  let salesmanId: string;
  let invoiceAId: string;
  let invoiceANumber: string;
  let invoiceBId: string;
  let invoiceBNumber: string;
  const mutationIds: string[] = [];
  const stockMovementIds: string[] = [];
  const salesInvoiceIds: string[] = [];

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
    // reconcile() (satu-satunya method StockRecorderService dipakai di sini)
    // tidak menyentuh ProductsService — cast kosong aman, hindari
    // menginstansiasi seluruh dependency chain ProductsService di test ini.
    const stockRecorderService = new StockRecorderService(
      dataSource,
      null as unknown as ProductsService,
    );
    service = new StockReportsService(dataSource, stockRecorderService);

    const stamp = Date.now();
    const codeBase = String(stamp).slice(-9);

    const userRows: { id: string }[] = await dataSource.query(
      `INSERT INTO users (username, password_hash, full_name, role)
       VALUES ($1, 'x', 'Test Hari 29', 'MASTER') RETURNING id`,
      [`test_stock_report_${stamp}`],
    );
    userId = userRows[0].id;

    const brandRows: { id: string }[] = await dataSource.query(
      `INSERT INTO brands (code, name) VALUES ($1, 'Merek Uji Hari 29') RETURNING id`,
      [`BRD${stamp}`],
    );
    brandId = brandRows[0].id;

    const p1: { id: string }[] = await dataSource.query(
      `INSERT INTO products (code, brand_id, keterangan, display_name, base_unit)
       VALUES ($1, $2, 'Uji Pecahan', 'Produk Uji Pecahan Hari 29', 'RENCENG')
       RETURNING id`,
      [`${codeBase}1`, brandId],
    );
    productBreakdownId = p1[0].id;
    await dataSource.query(
      `INSERT INTO product_unit_conversions (product_id, unit_name, qty_in_base_unit, level)
       VALUES ($1, 'DUS', 20, 1)`,
      [productBreakdownId],
    );

    const p2: { id: string }[] = await dataSource.query(
      `INSERT INTO products (code, brand_id, keterangan, display_name, base_unit)
       VALUES ($1, $2, 'Uji Sederhana', 'Produk Uji Sederhana Hari 29', 'PCS')
       RETURNING id`,
      [`${codeBase}2`, brandId],
    );
    productSimpleId = p2[0].id;

    const p3: { id: string }[] = await dataSource.query(
      `INSERT INTO products (code, brand_id, keterangan, display_name, base_unit)
       VALUES ($1, $2, 'Uji Selisih', 'Produk Uji Rekonsiliasi Hari 32', 'PCS')
       RETURNING id`,
      [`${codeBase}3`, brandId],
    );
    productMismatchId = p3[0].id;

    const storeWh: { id: string }[] = await dataSource.query(
      `INSERT INTO warehouses (name, warehouse_type) VALUES ($1, 'STORE') RETURNING id`,
      [`Toko Uji Hari 29 ${stamp}`],
    );
    storeWarehouseId = storeWh[0].id;
    const bsWh: { id: string }[] = await dataSource.query(
      `INSERT INTO warehouses (name, warehouse_type) VALUES ($1, 'BAD_STOCK') RETURNING id`,
      [`BS Uji Hari 29 ${stamp}`],
    );
    badStockWarehouseId = bsWh[0].id;

    const custA: { id: string }[] = await dataSource.query(
      `INSERT INTO customers (code, name) VALUES ($1, 'Pelanggan A Uji Hari 29') RETURNING id`,
      [`CTA${stamp}`],
    );
    customerAId = custA[0].id;
    const custB: { id: string }[] = await dataSource.query(
      `INSERT INTO customers (code, name) VALUES ($1, 'Pelanggan B Uji Hari 29') RETURNING id`,
      [`CTB${stamp}`],
    );
    customerBId = custB[0].id;

    const titipanA: { id: string }[] = await dataSource.query(
      `INSERT INTO warehouses (name, warehouse_type, customer_id)
       VALUES ($1, 'TITIPAN_PELANGGAN', $2) RETURNING id`,
      [`Titipan Pelanggan - Pelanggan A Uji Hari 29`, customerAId],
    );
    titipanWarehouseAId = titipanA[0].id;
    const titipanB: { id: string }[] = await dataSource.query(
      `INSERT INTO warehouses (name, warehouse_type, customer_id)
       VALUES ($1, 'TITIPAN_PELANGGAN', $2) RETURNING id`,
      [`Titipan Pelanggan - Pelanggan B Uji Hari 29`, customerBId],
    );
    titipanWarehouseBId = titipanB[0].id;

    // Saldo stok: produk pecahan 255 RENCENG di STORE (-> "12 DUS 15 RENCENG"),
    // 20 di BAD_STOCK (-> "1 DUS"). Produk sederhana 0 di STORE (-> "-"),
    // 5 di BAD_STOCK. Produk uji-selisih: 90 di STORE, SENGAJA tidak cocok
    // dengan SUM(stock_movements)=100 di bawah (lihat blok movements).
    await dataSource.query(
      `INSERT INTO product_stock_balance (product_id, warehouse_id, qty_base_unit)
       VALUES ($1, $2, 255), ($1, $3, 20), ($4, $3, 5), ($5, $2, 90)`,
      [
        productBreakdownId,
        storeWarehouseId,
        badStockWarehouseId,
        productSimpleId,
        productMismatchId,
      ],
    );

    // stock_movements ledger yang cocok (Hari 32 "DB sehat" -> reconcile()
    // harus melaporkan difference=0) untuk productBreakdown & productSimple,
    // plus SATU baris movement untuk productMismatch yang SENGAJA tidak
    // dijumlahkan sama dengan balance di atas (100 vs cache 90).
    const movementRows: { id: string }[] = await dataSource.query(
      `INSERT INTO stock_movements
        (product_id, warehouse_id, movement_type, qty_base_unit, unit_cost, source_type, movement_date, created_by)
       VALUES
        ($1, $2, 'opening', 255, 1000, 'OPENING_BALANCE', CURRENT_DATE, $6),
        ($1, $3, 'opening', 20, 1000, 'OPENING_BALANCE', CURRENT_DATE, $6),
        ($4, $3, 'opening', 5, 500, 'OPENING_BALANCE', CURRENT_DATE, $6),
        ($5, $2, 'opening', 100, 750, 'OPENING_BALANCE', CURRENT_DATE, $6)
       RETURNING id`,
      [
        productBreakdownId,
        storeWarehouseId,
        badStockWarehouseId,
        productSimpleId,
        productMismatchId,
        userId,
      ],
    );
    stockMovementIds.push(...movementRows.map((r) => r.id));

    // Paket R8 (docs/RENCANA_REVISI_TESTING_KLIEN.md §2A K7) — mutasi titipan
    // sekarang merujuk tepat satu faktur penjualan (warehouse_mutations
    // .sales_invoice_id), dipakai getTitipanRawRows() untuk menampilkan
    // No./Tanggal Faktur di Laporan Barang Titipan.
    const salesmanRows: { id: string }[] = await dataSource.query(
      `INSERT INTO salesmen (code, name) VALUES ($1, 'Salesman Uji Hari 29') RETURNING id`,
      [`SLM${stamp}`],
    );
    salesmanId = salesmanRows[0].id;

    async function insertSalesInvoice(
      customerId: string,
      invoiceDate: string,
    ): Promise<{ id: string; invoiceNumber: string }> {
      const invoiceNumber = `JL-TESTH29-${salesInvoiceIds.length + 1}-${stamp}`;
      const rows: { id: string }[] = await dataSource.query(
        `INSERT INTO sales_invoices
           (invoice_number, invoice_date, customer_id, sales_channel, salesman_id, due_date, subtotal, total_amount, created_by)
         VALUES ($1, $2, $3, 'TOKO', $4, $2, 0, 0, $5)
         RETURNING id`,
        [invoiceNumber, invoiceDate, customerId, salesmanId, userId],
      );
      salesInvoiceIds.push(rows[0].id);
      return { id: rows[0].id, invoiceNumber };
    }

    const invoiceA = await insertSalesInvoice(customerAId, '2026-08-07');
    invoiceAId = invoiceA.id;
    invoiceANumber = invoiceA.invoiceNumber;
    const invoiceB = await insertSalesInvoice(customerBId, '2026-08-08');
    invoiceBId = invoiceB.id;
    invoiceBNumber = invoiceB.invoiceNumber;

    // Titipan: produk pecahan 20 RENCENG ke A atas invoiceA ("1 DUS"), 5
    // RENCENG ke B atas invoiceB ("5 RENCENG"); produk sederhana 3 PCS ke A
    // (atas invoiceA juga) saja (B tidak menitip produk ini sama sekali ->
    // harus tampil "-", bukan 0 dianggap ada baris).
    async function insertTitipan(
      customerToWarehouseId: string,
      productId: string,
      qty: number,
      salesInvoiceId: string,
    ): Promise<void> {
      const mutRows: { id: string }[] = await dataSource.query(
        `INSERT INTO warehouse_mutations
          (mutation_number, mutation_date, mutation_type, from_warehouse_id, to_warehouse_id, sales_invoice_id, created_by)
         VALUES ($1, CURRENT_DATE, 'TITIPAN_PELANGGAN', $2, $3, $4, $5)
         RETURNING id`,
        [
          `GD/RM01-TESTH29-${mutationIds.length + 1}-${stamp}`,
          storeWarehouseId,
          customerToWarehouseId,
          salesInvoiceId,
          userId,
        ],
      );
      const mutationId = mutRows[0].id;
      mutationIds.push(mutationId);
      await dataSource.query(
        `INSERT INTO warehouse_mutation_lines (mutation_id, line_order, product_id, qty_base_unit)
         VALUES ($1, 1, $2, $3)`,
        [mutationId, productId, qty],
      );
    }

    await insertTitipan(
      titipanWarehouseAId,
      productBreakdownId,
      20,
      invoiceAId,
    );
    await insertTitipan(titipanWarehouseBId, productBreakdownId, 5, invoiceBId);
    await insertTitipan(titipanWarehouseAId, productSimpleId, 3, invoiceAId);
  });

  afterAll(async () => {
    // warehouse_mutations.sales_invoice_id (paket R8) mengunci FK ke
    // sales_invoices — mutasi HARUS dihapus dulu sebelum faktur.
    await dataSource.query(
      `DELETE FROM warehouse_mutation_lines WHERE mutation_id = ANY($1)`,
      [mutationIds],
    );
    await dataSource.query(
      `DELETE FROM warehouse_mutations WHERE id = ANY($1)`,
      [mutationIds],
    );
    if (salesInvoiceIds.length > 0) {
      await dataSource.query(`DELETE FROM sales_invoices WHERE id = ANY($1)`, [
        salesInvoiceIds,
      ]);
    }
    if (salesmanId) {
      await dataSource.query(`DELETE FROM salesmen WHERE id = $1`, [
        salesmanId,
      ]);
    }
    await dataSource.query(`DELETE FROM stock_movements WHERE id = ANY($1)`, [
      stockMovementIds,
    ]);
    await dataSource.query(
      `DELETE FROM product_stock_balance WHERE product_id IN ($1, $2, $3)`,
      [productBreakdownId, productSimpleId, productMismatchId],
    );
    await dataSource.query(
      `DELETE FROM warehouses WHERE id IN ($1, $2, $3, $4)`,
      [
        storeWarehouseId,
        badStockWarehouseId,
        titipanWarehouseAId,
        titipanWarehouseBId,
      ],
    );
    await dataSource.query(`DELETE FROM customers WHERE id IN ($1, $2)`, [
      customerAId,
      customerBId,
    ]);
    await dataSource.query(
      `DELETE FROM product_unit_conversions WHERE product_id = $1`,
      [productBreakdownId],
    );
    await dataSource.query(`DELETE FROM products WHERE id IN ($1, $2, $3)`, [
      productBreakdownId,
      productSimpleId,
      productMismatchId,
    ]);
    await dataSource.query(`DELETE FROM brands WHERE id = $1`, [brandId]);
    await dataSource.query(`DELETE FROM users WHERE id = $1`, [userId]);
    await dataSource.destroy();
  });

  it('Laporan Stok: satuan dipecah per gudang (STORE, BAD_STOCK, Total), nol tampil "-"', async () => {
    const result = await service.getStockBalanceReport();

    const rowBreakdown = result.rows.find(
      (r) => r.productId === productBreakdownId,
    );
    expect(rowBreakdown?.storeQty).toBe('12 DUS 15 RENCENG');
    expect(rowBreakdown?.badStockQty).toBe('1 DUS');
    expect(rowBreakdown?.totalQty).toBe('13 DUS 15 RENCENG');

    const rowSimple = result.rows.find((r) => r.productId === productSimpleId);
    expect(rowSimple?.storeQty).toBe('-');
    expect(rowSimple?.badStockQty).toBe('5 PCS');
    expect(rowSimple?.totalQty).toBe('5 PCS');
  });

  it('Laporan Barang Titipan: flat per pelanggan PER FAKTUR (paket R8 K7), bukan lagi pivot per produk', async () => {
    const result = await service.getTitipanPivotReport();

    const columnLabels = result.columns.map((c) => c.label);
    expect(columnLabels).toEqual([
      'Pelanggan',
      'No. Faktur',
      'Tanggal Faktur',
      'Nama Barang',
      'Qty Titipan',
    ]);

    // customer A menitip 2 produk, KEDUANYA atas invoiceA yang sama.
    const rowABreakdown = result.rows.find(
      (r) => r.customerId === customerAId && r.productId === productBreakdownId,
    )!;
    expect(rowABreakdown.invoiceNumber).toBe(invoiceANumber);
    expect(rowABreakdown.qtyText).toBe('1 DUS');

    const rowASimple = result.rows.find(
      (r) => r.customerId === customerAId && r.productId === productSimpleId,
    )!;
    expect(rowASimple.invoiceNumber).toBe(invoiceANumber);
    expect(rowASimple.qtyText).toBe('3 PCS');

    // customer B hanya menitip produk pecahan, atas invoiceB -- TIDAK ada
    // baris "-" untuk produk yang tidak dititipkan (beda dari pivot lama:
    // baris flat, bukan sel kosong).
    const rowB = result.rows.find(
      (r) => r.customerId === customerBId && r.productId === productBreakdownId,
    )!;
    expect(rowB.invoiceNumber).toBe(invoiceBNumber);
    expect(rowB.qtyText).toBe('5 RENCENG');
    expect(
      result.rows.some(
        (r) => r.customerId === customerBId && r.productId === productSimpleId,
      ),
    ).toBe(false);
  });

  it('Stok Opname: titipan tampil sebagai penjelas selisih fisik, cocok dengan warehouse_mutation_lines', async () => {
    const result = await service.getStockOpnameWorksheet();

    const rowBreakdown = result.rows.find(
      (r) => r.productId === productBreakdownId,
    )!;
    expect(rowBreakdown.systemQtyText).toBe('12 DUS 15 RENCENG');
    // Total titipan produk pecahan lintas pelanggan: 20 + 5 = 25 RENCENG.
    expect(rowBreakdown.titipanQtyBase).toBe(25);
    expect(rowBreakdown.titipanQtyText).toBe('1 DUS 5 RENCENG');
    expect(rowBreakdown.titipanDetail).toEqual(
      expect.arrayContaining([
        { customerName: 'Pelanggan A Uji Hari 29', qtyText: '1 DUS' },
        { customerName: 'Pelanggan B Uji Hari 29', qtyText: '5 RENCENG' },
      ]),
    );

    const rowSimple = result.rows.find((r) => r.productId === productSimpleId)!;
    expect(rowSimple.systemQtyText).toBe('-');
    expect(rowSimple.titipanQtyBase).toBe(3);
    expect(rowSimple.titipanDetail).toEqual([
      { customerName: 'Pelanggan A Uji Hari 29', qtyText: '3 PCS' },
    ]);
  });

  it('Rekonsiliasi Stok: selisih 0 pada baris ledger yang sehat (movement_sum = balance)', async () => {
    const result = await service.getStockReconciliationReport();

    const rowStore = result.rows.find(
      (r) =>
        r.productId === productBreakdownId &&
        r.warehouseId === storeWarehouseId,
    )!;
    expect(rowStore.movementSumText).toBe('12 DUS 15 RENCENG');
    expect(rowStore.balanceQtyText).toBe('12 DUS 15 RENCENG');
    expect(rowStore.differenceText).toBe('-'); // 0 tampil "-", CLAUDE.md/PANDUAN_UI §14.2
    expect(rowStore.hasDifference).toBe(false);

    const rowBadStock = result.rows.find(
      (r) =>
        r.productId === productSimpleId &&
        r.warehouseId === badStockWarehouseId,
    )!;
    expect(rowBadStock.hasDifference).toBe(false);
  });

  it('Rekonsiliasi Stok: selisih ledger vs cache terdeteksi (bukan disebabkan titipan)', async () => {
    const result = await service.getStockReconciliationReport();

    const rowMismatch = result.rows.find(
      (r) => r.productId === productMismatchId,
    )!;
    expect(rowMismatch.movementSumText).toBe('100 PCS');
    expect(rowMismatch.balanceQtyText).toBe('90 PCS');
    expect(rowMismatch.differenceText).toBe('-10 PCS'); // balance(90) - movement(100)
    expect(rowMismatch.hasDifference).toBe(true);
    // Produk ini tidak pernah dititip -- kolom Titipan tidak "menjelaskan"
    // selisih ledger, murni konteks kosong.
    expect(rowMismatch.titipanQtyText).toBe('-');
    expect(rowMismatch.titipanDetail).toEqual([]);
  });

  it('Rekonsiliasi Stok: kolom Titipan (penjelas) hanya terisi untuk baris gudang STORE', async () => {
    const result = await service.getStockReconciliationReport();

    const rowStore = result.rows.find(
      (r) =>
        r.productId === productBreakdownId &&
        r.warehouseId === storeWarehouseId,
    )!;
    expect(rowStore.titipanQtyText).toBe('1 DUS 5 RENCENG');
    expect(rowStore.titipanDetail).toEqual(
      expect.arrayContaining([
        { customerName: 'Pelanggan A Uji Hari 29', qtyText: '1 DUS' },
        { customerName: 'Pelanggan B Uji Hari 29', qtyText: '5 RENCENG' },
      ]),
    );

    const rowBadStock = result.rows.find(
      (r) =>
        r.productId === productBreakdownId &&
        r.warehouseId === badStockWarehouseId,
    )!;
    expect(rowBadStock.titipanQtyText).toBe('-');
    expect(rowBadStock.titipanDetail).toEqual([]);
  });
});
