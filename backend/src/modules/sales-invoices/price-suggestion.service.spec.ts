import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { SalesChannel } from '../../common/enums/sales-channel.enum';
import { Brand } from '../brands/entities/brand.entity';
import { Customer } from '../customers/entities/customer.entity';
import { ProductUnitConversion } from '../products/entities/product-unit-conversion.entity';
import { Product } from '../products/entities/product.entity';
import { Salesman } from '../salesmen/entities/salesman.entity';
import { Unit } from '../units/entities/unit.entity';
import { User } from '../users/entities/user.entity';
import { SalesInvoiceLine } from './entities/sales-invoice-line.entity';
import {
  SalesInvoice,
  SalesInvoicePostingStatus,
} from './entities/sales-invoice.entity';
import { PriceSuggestionService } from './price-suggestion.service';

/**
 * Integration test terhadap Postgres asli, pola sama sales-orders.service.spec.ts
 * — semua service dikonstruksi manual lewat `new` (bypass Nest DI). Belum ada
 * POST /sales-invoices (Hari 21), jadi baris uji diseed LANGSUNG lewat
 * repository (satu sales_invoices + satu sales_invoice_lines per baris histori
 * — cukup untuk menguji query baca, tidak perlu total/diskon yang akurat).
 */
describe('PriceSuggestionService', () => {
  let dataSource: DataSource;
  let service: PriceSuggestionService;

  let masterUserId: string;
  let brandId: string;
  let salesmanId: string;
  let dusUnitId: string;
  let rencengUnitId: string;

  const createdInvoiceIds: string[] = [];
  const createdProductIds: string[] = [];
  const createdCustomerIds: string[] = [];
  let invoiceSeq = 0;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'omega_dev',
      entities: [
        User,
        Brand,
        Product,
        ProductUnitConversion,
        Customer,
        Unit,
        Salesman,
        SalesInvoice,
        SalesInvoiceLine,
      ],
    });
    await dataSource.initialize();
    service = new PriceSuggestionService(dataSource);

    const suffix = Date.now();

    const usersRepo = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('test-password', 4);
    const master = await usersRepo.save(
      usersRepo.create({
        username: `test_price_sugg_${suffix}`,
        passwordHash,
        fullName: 'Test PriceSuggestion Master',
        role: Role.MASTER,
        isActive: true,
      }),
    );
    masterUserId = master.id;

    const brandsRepo = dataSource.getRepository(Brand);
    const brand = await brandsRepo.save(
      brandsRepo.create({
        code: `TPS-${suffix.toString().slice(-8)}`,
        name: 'Merek Uji Price Suggestion',
        isActive: true,
      }),
    );
    brandId = brand.id;

    const salesmenRepo = dataSource.getRepository(Salesman);
    const salesman = await salesmenRepo.save(
      salesmenRepo.create({
        code: `SLS-TPS-${suffix.toString().slice(-6)}`,
        name: 'Salesman Uji',
        isActive: true,
      }),
    );
    salesmanId = salesman.id;

    const unitsRepo = dataSource.getRepository(Unit);
    const dus = await unitsRepo.save(
      unitsRepo.create({
        code: `DUS-TPS-${suffix.toString().slice(-6)}`,
        name: 'DUS',
        isActive: true,
      }),
    );
    dusUnitId = dus.id;
    const renceng = await unitsRepo.save(
      unitsRepo.create({
        code: `RCG-TPS-${suffix.toString().slice(-6)}`,
        name: 'RENCENG',
        isActive: true,
      }),
    );
    rencengUnitId = renceng.id;
  });

  afterAll(async () => {
    if (createdInvoiceIds.length > 0) {
      // sales_invoice_lines ikut terhapus lewat ON DELETE CASCADE
      await dataSource.query(`DELETE FROM sales_invoices WHERE id = ANY($1)`, [
        createdInvoiceIds,
      ]);
    }
    if (createdProductIds.length > 0) {
      await dataSource.query(`DELETE FROM products WHERE id = ANY($1)`, [
        createdProductIds,
      ]);
    }
    if (createdCustomerIds.length > 0) {
      await dataSource.query(`DELETE FROM customers WHERE id = ANY($1)`, [
        createdCustomerIds,
      ]);
    }
    await dataSource.query(`DELETE FROM units WHERE id = ANY($1)`, [
      [dusUnitId, rencengUnitId],
    ]);
    await dataSource.query(`DELETE FROM salesmen WHERE id = $1`, [salesmanId]);
    await dataSource.query(`DELETE FROM brands WHERE id = $1`, [brandId]);
    await dataSource.query('DELETE FROM audit_logs WHERE user_id = $1', [
      masterUserId,
    ]);
    await dataSource.query('DELETE FROM users WHERE id = $1', [masterUserId]);
    await dataSource.destroy();
  });

  function daysAgoIso(days: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  }

  async function createTestCustomer(): Promise<string> {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const customer = await dataSource.getRepository(Customer).save(
      dataSource.getRepository(Customer).create({
        code: `CUST-TPS-${suffix}`,
        name: `Pelanggan Uji Price Suggestion ${suffix}`,
        isActive: true,
      }),
    );
    createdCustomerIds.push(customer.id);
    return customer.id;
  }

  // products.code terkunci format YYMMDDXXXX oleh chk_products_code_format
  // (CLAUDE.md §3) — replikasi ProductsService.generateCode() (product_code_seq)
  // supaya tidak perlu construct ProductsService penuh hanya untuk seed test.
  async function generateProductCode(): Promise<string> {
    const rows: { nextval: string }[] = await dataSource.query(
      `SELECT nextval('product_code_seq') AS nextval`,
    );
    const sequence = String(Number(rows[0].nextval)).padStart(4, '0');
    const now = new Date();
    const yy = String(now.getFullYear() % 100).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}${sequence}`;
  }

  async function createTestProduct(): Promise<string> {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const code = await generateProductCode();
    const product = await dataSource.getRepository(Product).save(
      dataSource.getRepository(Product).create({
        code,
        isCodeLocked: false,
        brandId,
        displayName: `Produk Uji Price Suggestion ${suffix}`,
        isBkp: false,
        baseUnit: 'PCS',
        isActive: true,
      }),
    );
    createdProductIds.push(product.id);
    return product.id;
  }

  async function createInvoiceLine(params: {
    customerId: string;
    productId: string;
    unitId: string;
    invoiceDate: string;
    qty: number;
    unitPrice: number;
    postingStatus?: SalesInvoicePostingStatus;
  }): Promise<void> {
    invoiceSeq += 1;
    const suffix = `${Date.now()}-${invoiceSeq}-${Math.random().toString(36).slice(2, 6)}`;
    const invoice = await dataSource.getRepository(SalesInvoice).save(
      dataSource.getRepository(SalesInvoice).create({
        invoiceNumber: `JL/TPS-${suffix}`,
        invoiceDate: params.invoiceDate,
        customerId: params.customerId,
        salesChannel: SalesChannel.TOKO,
        salesOrderId: null,
        salesmanId,
        termDays: 0,
        dueDate: params.invoiceDate,
        subtotal: String(params.qty * params.unitPrice),
        totalAmount: String(params.qty * params.unitPrice),
        postingStatus: params.postingStatus ?? SalesInvoicePostingStatus.POSTED,
        createdBy: masterUserId,
      }),
    );
    createdInvoiceIds.push(invoice.id);

    await dataSource.getRepository(SalesInvoiceLine).save(
      dataSource.getRepository(SalesInvoiceLine).create({
        salesInvoiceId: invoice.id,
        customerId: params.customerId,
        lineOrder: 1,
        productId: params.productId,
        unitId: params.unitId,
        qtyInput: String(params.qty),
        qtyBaseUnit: String(params.qty),
        unitPrice: String(params.unitPrice),
        grossAmount: String(params.qty * params.unitPrice),
        netAmount: String(params.qty * params.unitPrice),
      }),
    );
  }

  it('tier 1: 10 baris terbaru pelanggan+produk+satuan (id DESC), faktur VOID tidak pernah muncul', async () => {
    const customerId = await createTestCustomer();
    const productId = await createTestProduct();

    for (let i = 0; i < 11; i++) {
      await createInvoiceLine({
        customerId,
        productId,
        unitId: dusUnitId,
        invoiceDate: daysAgoIso(11 - i),
        qty: 1,
        unitPrice: 100000 + i * 1000,
      });
    }
    // Baris VOID ditulis TERAKHIR (id tertinggi) — kalau filter posting_status
    // bocor, ini yang akan salah muncul sebagai baris "terbaru".
    await createInvoiceLine({
      customerId,
      productId,
      unitId: dusUnitId,
      invoiceDate: daysAgoIso(0),
      qty: 99,
      unitPrice: 999999,
      postingStatus: SalesInvoicePostingStatus.VOIDED,
    });

    const result = await service.getSuggestions(
      customerId,
      productId,
      dusUnitId,
    );

    expect(result.source).toBe('CUSTOMER_PRODUCT_UNIT');
    expect(result.suggestions).toHaveLength(10);
    expect(result.suggestions.some((s) => s.unitPrice === 999999)).toBe(false);
    expect(result.suggestions[0].unitPrice).toBe(110000); // baris terakhir non-VOID (i=10)
  });

  it('ganti satuan DUS -> RENCENG mengubah isi panel (bahaya harga dus vs renceng, CLAUDE.md §2.5)', async () => {
    const customerId = await createTestCustomer();
    const productId = await createTestProduct();

    await createInvoiceLine({
      customerId,
      productId,
      unitId: dusUnitId,
      invoiceDate: daysAgoIso(1),
      qty: 2,
      unitPrice: 150000,
    });
    await createInvoiceLine({
      customerId,
      productId,
      unitId: rencengUnitId,
      invoiceDate: daysAgoIso(1),
      qty: 3,
      unitPrice: 6000,
    });

    const dusResult = await service.getSuggestions(
      customerId,
      productId,
      dusUnitId,
    );
    const rencengResult = await service.getSuggestions(
      customerId,
      productId,
      rencengUnitId,
    );

    expect(dusResult.suggestions).toHaveLength(1);
    expect(dusResult.suggestions[0].unitPrice).toBe(150000);
    expect(rencengResult.suggestions).toHaveLength(1);
    expect(rencengResult.suggestions[0].unitPrice).toBe(6000);
  });

  it('tier 2: kombinasi pelanggan+produk+satuan kosong -> fallback produk+satuan ke pelanggan lain', async () => {
    const otherCustomerId = await createTestCustomer();
    const emptyCustomerId = await createTestCustomer();
    const productId = await createTestProduct();

    await createInvoiceLine({
      customerId: otherCustomerId,
      productId,
      unitId: dusUnitId,
      invoiceDate: daysAgoIso(1),
      qty: 1,
      unitPrice: 175000,
    });

    const result = await service.getSuggestions(
      emptyCustomerId,
      productId,
      dusUnitId,
    );

    expect(result.source).toBe('PRODUCT_UNIT');
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].unitPrice).toBe(175000);
  });

  it('tidak ada histori sama sekali -> source NONE, bukan error (tidak ada tier 3 — keputusan final PR #3, KONTEKS_REVISI §4.2)', async () => {
    const customerId = await createTestCustomer();
    const productId = await createTestProduct();

    const result = await service.getSuggestions(
      customerId,
      productId,
      dusUnitId,
    );

    expect(result.source).toBe('NONE');
    expect(result.suggestions).toEqual([]);
  });

  // TIDAK ADA test EXPLAIN otomatis di sini dengan sengaja. Dicoba saat
  // implementasi: bahkan dengan `enable_seqscan = off`, di tabel sekecil ini
  // (puluhan baris) planner kadang memilih index LAIN (mis.
  // idx_sales_invoice_lines_invoice via join order berbeda) karena estimasi
  // biaya antar-index nyaris identik di N sekecil itu — hasilnya flaky,
  // tergantung urutan test lain yang kebetulan menambah baris ke tabel yang
  // sama. Postgres tidak punya index hint (beda dari MySQL) untuk memaksa
  // index tertentu. Bukti pemakaian idx_sales_invoice_lines_price_lookup di
  // volume realistis dilakukan MANUAL terhadap omega_dev (bukan test
  // otomatis ini) — outputnya ditempel di laporan DoD.
});
