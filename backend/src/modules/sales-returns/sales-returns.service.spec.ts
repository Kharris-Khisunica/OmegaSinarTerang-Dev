import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { SalesChannel } from '../../common/enums/sales-channel.enum';
import { AccountResolverService } from '../../core/account-resolver/account-resolver.service';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { JournalPosterService } from '../../core/journal-poster/journal-poster.service';
import { PeriodLockValidatorService } from '../../core/period-lock/period-lock-validator.service';
import { PrintLockService } from '../../core/print-lock/print-lock.service';
import { ArAccountResolverService } from '../../core/receivables/ar-account-resolver.service';
import { StepUpService } from '../../core/step-up/step-up.service';
import { StockRecorderService } from '../../core/stock-recorder/stock-recorder.service';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { AuthorizationRequestsService } from '../authorization-requests/authorization-requests.service';
import { AuthorizationRequest } from '../authorization-requests/entities/authorization-request.entity';
import { Brand } from '../brands/entities/brand.entity';
import { ChartOfAccount } from '../chart-of-accounts/entities/chart-of-account.entity';
import { Customer } from '../customers/entities/customer.entity';
import { JournalEntryLine } from '../journal-entries/entities/journal-entry-line.entity';
import { JournalEntry } from '../journal-entries/entities/journal-entry.entity';
import { ProductUnitConversion } from '../products/entities/product-unit-conversion.entity';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { Salesman } from '../salesmen/entities/salesman.entity';
import { SalesInvoiceLine } from '../sales-invoices/entities/sales-invoice-line.entity';
import {
  SalesInvoice,
  SalesInvoicePostingStatus,
  SalesInvoicePrintStatus,
  SalesInvoiceReviewStatus,
} from '../sales-invoices/entities/sales-invoice.entity';
import { StockCostConsumption } from '../stock/entities/stock-cost-consumption.entity';
import { StockCostLot } from '../stock/entities/stock-cost-lot.entity';
import { StockMovement } from '../stock/entities/stock-movement.entity';
import { Unit } from '../units/entities/unit.entity';
import { User } from '../users/entities/user.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { SalesReturnLine } from './entities/sales-return-line.entity';
import {
  SalesReturn,
  SalesReturnPostingStatus,
  SalesReturnSettlementType,
} from './entities/sales-return.entity';
import { SalesReturnsService } from './sales-returns.service';

interface SeedLineInput {
  productId: string;
  unitId: string;
  qtyInput: number;
  qtyBaseUnit: number;
  unitPrice: number;
  discountAmount?: number;
  unitCostFifo: number;
}

/**
 * Integration test terhadap Postgres asli, pola sama
 * sales-invoices.service.spec.ts/purchase-returns.service.spec.ts — semua
 * service dikonstruksi manual lewat `new` (bypass Nest DI). Faktur asal
 * DISEED LANGSUNG lewat repository (bukan lewat SalesInvoicesService.create())
 * supaya angka subtotal/invoiceDiscountAmount/outputVatAmount/unitCostFifo
 * bisa dikontrol presisi untuk menguji rumus prorata Retur Penjualan —
 * korektnes SalesInvoicesService sendiri sudah diuji di spec-nya sendiri.
 */
describe('SalesReturnsService', () => {
  let dataSource: DataSource;
  let productsService: ProductsService;
  let stockRecorderService: StockRecorderService;
  let service: SalesReturnsService;

  let masterUserId: string;
  let brandId: string;
  let unitId: string;
  let cashAccountId: string;
  let nonCashAccountId: string;

  const createdProductIds: string[] = [];
  const createdCustomerIds: string[] = [];
  const createdSalesmanIds: string[] = [];
  const createdInvoiceIds: string[] = [];
  const createdReturnIds: string[] = [];

  const masterUser: AuthenticatedUser = {
    sub: '',
    username: 'master',
    role: Role.MASTER,
  };
  const operatorUser: AuthenticatedUser = {
    sub: '',
    username: 'operator',
    role: Role.OPERATOR,
  };

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
        Salesman,
        Warehouse,
        Unit,
        ChartOfAccount,
        JournalEntry,
        JournalEntryLine,
        StockMovement,
        StockCostLot,
        StockCostConsumption,
        SalesInvoice,
        SalesInvoiceLine,
        SalesReturn,
        SalesReturnLine,
        AuthorizationRequest,
      ],
    });
    await dataSource.initialize();

    productsService = new ProductsService(
      dataSource.getRepository(Product),
      dataSource.getRepository(Brand),
      dataSource,
    );
    stockRecorderService = new StockRecorderService(
      dataSource,
      productsService,
    );
    const documentCounterService = new DocumentCounterService();
    const periodLockValidatorService = new PeriodLockValidatorService();
    const journalPosterService = new JournalPosterService(
      documentCounterService,
      periodLockValidatorService,
    );
    const accountResolverService = new AccountResolverService(dataSource);
    const arAccountResolverService = new ArAccountResolverService(dataSource);
    const authorizationRequestsService = new AuthorizationRequestsService(
      dataSource.getRepository(AuthorizationRequest),
    );
    const stepUpService = new StepUpService(authorizationRequestsService);
    const printLockService = new PrintLockService(dataSource, stepUpService);

    service = new SalesReturnsService(
      dataSource,
      dataSource.getRepository(SalesReturn),
      dataSource.getRepository(Warehouse),
      documentCounterService,
      stockRecorderService,
      journalPosterService,
      accountResolverService,
      arAccountResolverService,
      printLockService,
    );

    const suffix = Date.now();

    const usersRepo = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('test-password', 4);
    const master = await usersRepo.save(
      usersRepo.create({
        username: `test_sr_master_${suffix}`,
        passwordHash,
        fullName: 'Test SalesReturns Master',
        role: Role.MASTER,
        isActive: true,
      }),
    );
    masterUserId = master.id;
    masterUser.sub = masterUserId;
    operatorUser.sub = masterUserId;

    const brandsRepo = dataSource.getRepository(Brand);
    const brand = await brandsRepo.save(
      brandsRepo.create({
        code: `TSR-${suffix.toString().slice(-8)}`,
        name: 'Merek Uji Retur Penjualan',
        isActive: true,
      }),
    );
    brandId = brand.id;

    const unitsRepo = dataSource.getRepository(Unit);
    const pcsUnit = await unitsRepo.save(
      unitsRepo.create({
        code: `PCS-TSR-${suffix.toString().slice(-6)}`,
        name: 'PCS',
        isActive: true,
      }),
    );
    unitId = pcsUnit.id;

    const cashRows: { id: string }[] = await dataSource.query(
      `SELECT id FROM chart_of_accounts WHERE is_cash_account = true AND is_active = true LIMIT 1`,
    );
    cashAccountId = cashRows[0].id;
    const revenueRows: { id: string }[] = await dataSource.query(
      `SELECT id FROM chart_of_accounts WHERE is_revenue_account = true AND is_active = true LIMIT 1`,
    );
    nonCashAccountId = revenueRows[0].id;
  });

  afterAll(async () => {
    if (createdReturnIds.length > 0) {
      await dataSource.query(
        `DELETE FROM journal_entry_lines WHERE journal_entry_id IN (
           SELECT id FROM journal_entries WHERE source_type = 'SALES_RETURN' AND source_id = ANY($1)
         )`,
        [createdReturnIds],
      );
      await dataSource.query(
        `DELETE FROM journal_entries WHERE source_type = 'SALES_RETURN' AND source_id = ANY($1)`,
        [createdReturnIds],
      );
      await dataSource.query(
        `DELETE FROM sales_return_lines WHERE sales_return_id = ANY($1)`,
        [createdReturnIds],
      );
      await dataSource.query(`DELETE FROM sales_returns WHERE id = ANY($1)`, [
        createdReturnIds,
      ]);
    }
    if (createdInvoiceIds.length > 0) {
      await dataSource.query(
        `DELETE FROM sales_invoice_lines WHERE sales_invoice_id = ANY($1)`,
        [createdInvoiceIds],
      );
      await dataSource.query(`DELETE FROM sales_invoices WHERE id = ANY($1)`, [
        createdInvoiceIds,
      ]);
    }
    if (createdProductIds.length > 0) {
      await dataSource.query(
        `DELETE FROM stock_cost_consumptions WHERE lot_id IN (SELECT id FROM stock_cost_lots WHERE product_id = ANY($1))`,
        [createdProductIds],
      );
      await dataSource.query(
        `DELETE FROM stock_cost_lots WHERE product_id = ANY($1)`,
        [createdProductIds],
      );
      await dataSource.query(
        `DELETE FROM stock_movements WHERE product_id = ANY($1)`,
        [createdProductIds],
      );
      await dataSource.query(
        `DELETE FROM product_stock_balance WHERE product_id = ANY($1)`,
        [createdProductIds],
      );
      await dataSource.query(`DELETE FROM products WHERE id = ANY($1)`, [
        createdProductIds,
      ]);
    }
    if (createdCustomerIds.length > 0) {
      await dataSource.query(`DELETE FROM customers WHERE id = ANY($1)`, [
        createdCustomerIds,
      ]);
    }
    if (createdSalesmanIds.length > 0) {
      await dataSource.query(`DELETE FROM salesmen WHERE id = ANY($1)`, [
        createdSalesmanIds,
      ]);
    }
    await dataSource.query(`DELETE FROM units WHERE id = $1`, [unitId]);
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

  async function createTestProduct(label: string): Promise<string> {
    const product = await productsService.create({
      brandId,
      keterangan: `${label} ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      baseUnit: 'PCS',
      isBkp: true,
      unitConversions: [],
    });
    createdProductIds.push(product.id);
    return product.id;
  }

  async function createTestCustomer(): Promise<string> {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const customer = await dataSource.getRepository(Customer).save(
      dataSource.getRepository(Customer).create({
        code: `CUST-TSR-${suffix}`,
        name: `Pelanggan Uji Retur Penjualan ${suffix}`,
        isPkp: false,
        isActive: true,
      }),
    );
    createdCustomerIds.push(customer.id);
    return customer.id;
  }

  async function createTestSalesman(): Promise<string> {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const salesman = await dataSource.getRepository(Salesman).save(
      dataSource.getRepository(Salesman).create({
        code: `SLM-TSR-${suffix}`,
        name: `Salesman Uji ${suffix}`,
        isActive: true,
      }),
    );
    createdSalesmanIds.push(salesman.id);
    return salesman.id;
  }

  /**
   * Seed faktur penjualan LANGSUNG lewat repository (bukan
   * SalesInvoicesService.create()) supaya subtotal/invoiceDiscountAmount/
   * outputVatAmount/unitCostFifo bisa dikontrol presisi untuk menguji rumus
   * prorata Retur Penjualan secara terisolasi.
   */
  async function seedInvoice(params: {
    customerId: string;
    salesmanId: string;
    invoiceDiscountAmount?: number;
    outputVatAmount?: number;
    lines: SeedLineInput[];
  }): Promise<{ invoice: SalesInvoice; lines: SalesInvoiceLine[] }> {
    const invoiceDate = daysAgoIso(0);
    let subtotalCents = 0;
    let lineDiscountTotalCents = 0;
    const lineData = params.lines.map((l) => {
      const grossCents = Math.round(l.qtyInput * l.unitPrice * 100);
      const discCents = Math.round((l.discountAmount ?? 0) * 100);
      const netCents = grossCents - discCents;
      subtotalCents += netCents;
      lineDiscountTotalCents += discCents;
      return { ...l, grossCents, discCents, netCents };
    });
    const invoiceDiscountCents = Math.round(
      (params.invoiceDiscountAmount ?? 0) * 100,
    );
    const outputVatCents = Math.round((params.outputVatAmount ?? 0) * 100);
    const totalCents = subtotalCents - invoiceDiscountCents + outputVatCents;

    const invoicesRepo = dataSource.getRepository(SalesInvoice);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const invoice = await invoicesRepo.save(
      invoicesRepo.create({
        invoiceNumber: `JL/TSR-${suffix}`,
        invoiceDate,
        customerId: params.customerId,
        salesChannel: SalesChannel.TOKO,
        salesOrderId: null,
        salesmanId: params.salesmanId,
        termDays: 0,
        dueDate: invoiceDate,
        subtotal: (subtotalCents / 100).toFixed(2),
        lineDiscountTotal: (lineDiscountTotalCents / 100).toFixed(2),
        invoiceDiscountAmount: (invoiceDiscountCents / 100).toFixed(2),
        invoiceDiscountPercent: null,
        outputVatAmount: (outputVatCents / 100).toFixed(2),
        totalAmount: (totalCents / 100).toFixed(2),
        postingStatus: SalesInvoicePostingStatus.POSTED,
        printStatus: SalesInvoicePrintStatus.NOT_PRINTED,
        reviewStatus: SalesInvoiceReviewStatus.BELUM_DICEK,
        createdBy: masterUserId,
      }),
    );
    createdInvoiceIds.push(invoice.id);

    const linesRepo = dataSource.getRepository(SalesInvoiceLine);
    const savedLines: SalesInvoiceLine[] = [];
    for (let i = 0; i < lineData.length; i++) {
      const l = lineData[i];
      const saved = await linesRepo.save(
        linesRepo.create({
          salesInvoiceId: invoice.id,
          customerId: params.customerId,
          lineOrder: i + 1,
          productId: l.productId,
          unitId: l.unitId,
          qtyInput: l.qtyInput.toFixed(4),
          qtyBaseUnit: l.qtyBaseUnit.toFixed(4),
          unitPrice: l.unitPrice.toFixed(2),
          discountAmount: (l.discountAmount ?? 0).toFixed(2),
          grossAmount: (l.grossCents / 100).toFixed(2),
          netAmount: (l.netCents / 100).toFixed(2),
          unitCostFifo: l.unitCostFifo.toFixed(4),
        }),
      );
      savedLines.push(saved);
    }
    return { invoice, lines: savedLines };
  }

  it('retur tanpa faktur asal (id tidak ada) -> ditolak', async () => {
    await expect(
      service.create(
        {
          salesInvoiceId: randomUUID(),
          returnDate: daysAgoIso(0),
          settlementType: SalesReturnSettlementType.REDUCE_INVOICE,
          lines: [{ salesInvoiceLineId: randomUUID(), qtyInput: 1 }],
        },
        masterUser,
      ),
    ).rejects.toThrow(/tidak ditemukan/i);
  });

  it('retur atas faktur yang sudah VOID -> ditolak', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Voided');
    const { invoice, lines } = await seedInvoice({
      customerId,
      salesmanId,
      lines: [
        {
          productId,
          unitId,
          qtyInput: 5,
          qtyBaseUnit: 5,
          unitPrice: 10000,
          unitCostFifo: 6000,
        },
      ],
    });
    await dataSource.query(
      `UPDATE sales_invoices SET posting_status = 'VOIDED' WHERE id = $1`,
      [invoice.id],
    );

    await expect(
      service.create(
        {
          salesInvoiceId: invoice.id,
          returnDate: daysAgoIso(0),
          settlementType: SalesReturnSettlementType.REDUCE_INVOICE,
          lines: [{ salesInvoiceLineId: lines[0].id, qtyInput: 1 }],
        },
        masterUser,
      ),
    ).rejects.toThrow(/dibatalkan/i);
  });

  it('lot BAD_STOCK ber-unit_cost SAMA PERSIS dengan unit_cost_fifo faktur asal', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Lot Sama');
    const { invoice, lines } = await seedInvoice({
      customerId,
      salesmanId,
      lines: [
        {
          productId,
          unitId,
          qtyInput: 10,
          qtyBaseUnit: 10,
          unitPrice: 20000,
          unitCostFifo: 12345.6789,
        },
      ],
    });

    const result = await service.create(
      {
        salesInvoiceId: invoice.id,
        returnDate: daysAgoIso(0),
        settlementType: SalesReturnSettlementType.REDUCE_INVOICE,
        lines: [{ salesInvoiceLineId: lines[0].id, qtyInput: 10 }],
      },
      masterUser,
    );
    createdReturnIds.push(result.salesReturn.id);

    const lotRows: { unit_cost: string }[] = await dataSource.query(
      `SELECT unit_cost FROM stock_cost_lots WHERE source_type = 'SALES_RETURN' AND source_id = $1`,
      [result.salesReturn.id],
    );
    expect(lotRows).toHaveLength(1);
    expect(Number(lotRows[0].unit_cost)).toBe(12345.6789);
    expect(Number(result.lines[0].unitCostFifo)).toBe(12345.6789);
  });

  it('qty retur melebihi sisa qty faktur untuk satu baris -> ditolak (sekaligus dan berturut-turut)', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Sisa Qty');
    const { invoice, lines } = await seedInvoice({
      customerId,
      salesmanId,
      lines: [
        {
          productId,
          unitId,
          qtyInput: 10,
          qtyBaseUnit: 10,
          unitPrice: 10000,
          unitCostFifo: 5000,
        },
      ],
    });

    await expect(
      service.create(
        {
          salesInvoiceId: invoice.id,
          returnDate: daysAgoIso(0),
          settlementType: SalesReturnSettlementType.REDUCE_INVOICE,
          lines: [{ salesInvoiceLineId: lines[0].id, qtyInput: 15 }],
        },
        masterUser,
      ),
    ).rejects.toThrow(/melebihi sisa qty/i);

    const first = await service.create(
      {
        salesInvoiceId: invoice.id,
        returnDate: daysAgoIso(0),
        settlementType: SalesReturnSettlementType.REDUCE_INVOICE,
        lines: [{ salesInvoiceLineId: lines[0].id, qtyInput: 6 }],
      },
      masterUser,
    );
    createdReturnIds.push(first.salesReturn.id);

    await expect(
      service.create(
        {
          salesInvoiceId: invoice.id,
          returnDate: daysAgoIso(0),
          settlementType: SalesReturnSettlementType.REDUCE_INVOICE,
          lines: [{ salesInvoiceLineId: lines[0].id, qtyInput: 5 }],
        },
        masterUser,
      ),
    ).rejects.toThrow(/melebihi sisa qty/i);
  });

  it('retur SELURUH baris pada qty penuh -> mereproduksi total_amount faktur asal PERSIS', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const productA = await createTestProduct('Produk Penuh A');
    const productB = await createTestProduct('Produk Penuh B');
    const { invoice, lines } = await seedInvoice({
      customerId,
      salesmanId,
      invoiceDiscountAmount: 10000,
      outputVatAmount: 9900, // 11% x (subtotal 100.000 - diskon 10.000) = 9.900
      lines: [
        {
          productId: productA,
          unitId,
          qtyInput: 5,
          qtyBaseUnit: 5,
          unitPrice: 10000,
          unitCostFifo: 6000,
        }, // gross/net 50.000
        {
          productId: productB,
          unitId,
          qtyInput: 5,
          qtyBaseUnit: 5,
          unitPrice: 10000,
          unitCostFifo: 7000,
        }, // gross/net 50.000
      ],
    });
    expect(Number(invoice.totalAmount)).toBe(99900); // 100.000-10.000+9.900

    const result = await service.create(
      {
        salesInvoiceId: invoice.id,
        returnDate: daysAgoIso(0),
        settlementType: SalesReturnSettlementType.REDUCE_INVOICE,
        lines: [
          { salesInvoiceLineId: lines[0].id, qtyInput: 5 },
          { salesInvoiceLineId: lines[1].id, qtyInput: 5 },
        ],
      },
      masterUser,
    );
    createdReturnIds.push(result.salesReturn.id);

    expect(Number(result.salesReturn.totalAmount)).toBe(
      Number(invoice.totalAmount),
    );
    expect(
      Number(result.salesReturn.dppAmount) +
        Number(result.salesReturn.outputVatAmount),
    ).toBe(Number(result.salesReturn.totalAmount));

    const totalDebit = result.journalEntry!.lines.reduce(
      (sum, l) => sum + Number(l.debitAmount),
      0,
    );
    const totalCredit = result.journalEntry!.lines.reduce(
      (sum, l) => sum + Number(l.creditAmount),
      0,
    );
    expect(totalDebit).toBe(totalCredit);
  });

  it('retur PARSIAL satu baris dengan diskon faktur + PPN -> prorata tarif efektif faktur asli', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Prorata');
    // subtotal 100.000, diskon faktur 10.000 (rasio 10%), PPN 11% x 90.000 = 9.900.
    const { invoice, lines } = await seedInvoice({
      customerId,
      salesmanId,
      invoiceDiscountAmount: 10000,
      outputVatAmount: 9900,
      lines: [
        {
          productId,
          unitId,
          qtyInput: 10,
          qtyBaseUnit: 10,
          unitPrice: 10000,
          unitCostFifo: 4000,
        },
      ],
    });

    const result = await service.create(
      {
        salesInvoiceId: invoice.id,
        returnDate: daysAgoIso(0),
        settlementType: SalesReturnSettlementType.REDUCE_INVOICE,
        // Retur separuh qty (5 dari 10).
        lines: [{ salesInvoiceLineId: lines[0].id, qtyInput: 5 }],
      },
      masterUser,
    );
    createdReturnIds.push(result.salesReturn.id);

    // lineDppRaw = 50.000 (separuh netAmount 100.000) x (1 - 10.000/100.000) = 45.000.
    expect(Number(result.salesReturn.dppAmount)).toBe(45000);
    // effectiveVatRate = 9.900/90.000 = 0.11 -> outputVat = 45.000 x 0.11 = 4.950.
    expect(Number(result.salesReturn.outputVatAmount)).toBe(4950);
    expect(Number(result.salesReturn.totalAmount)).toBe(49950);
    // costBasis = 5 x 4.000 = 20.000.
    expect(Number(result.salesReturn.costBasisAmount)).toBe(20000);
  });

  it('validasi kumulatif: retur tidak boleh melebihi total_amount faktur asal (pengganti paid_amount)', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Kumulatif');
    const { invoice, lines } = await seedInvoice({
      customerId,
      salesmanId,
      lines: [
        {
          productId,
          unitId,
          qtyInput: 10,
          qtyBaseUnit: 10,
          unitPrice: 10000,
          unitCostFifo: 5000,
        },
      ],
    });

    // Suntik baris sales_returns "hantu" (tanpa sales_return_lines) senilai
    // PERSIS total_amount faktur -- mengisolasi guard kumulatif dari
    // pengecekan sisa-qty per baris (yang tidak akan melihat baris hantu ini
    // sama sekali karena tidak ada sales_return_lines yang menunjuknya).
    await dataSource.query(
      `INSERT INTO sales_returns (
         id, return_number, sales_invoice_id, customer_id, return_date,
         settlement_type, dpp_amount, output_vat_amount, total_amount,
         cost_basis_amount, posting_status, print_status, created_by
       ) VALUES ($1, $2, $3, $4, $5, 'REDUCE_INVOICE', $6, 0, $6, 0, 'POSTED', 'NOT_PRINTED', $7)`,
      [
        randomUUID(),
        `RJ/GHOST-${Date.now()}`,
        invoice.id,
        customerId,
        daysAgoIso(0),
        Number(invoice.totalAmount),
        masterUserId,
      ],
    );

    await expect(
      service.create(
        {
          salesInvoiceId: invoice.id,
          returnDate: daysAgoIso(0),
          settlementType: SalesReturnSettlementType.REDUCE_INVOICE,
          lines: [{ salesInvoiceLineId: lines[0].id, qtyInput: 1 }],
        },
        masterUser,
      ),
    ).rejects.toThrow(/melebihi total faktur asal/i);

    // Bersihkan baris hantu.
    await dataSource.query(
      `DELETE FROM sales_returns WHERE sales_invoice_id = $1 AND return_number LIKE 'RJ/GHOST-%'`,
      [invoice.id],
    );
  });

  it('settlementType CASH wajib cashAccountId, REDUCE_INVOICE wajib kosong', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Settlement');
    const { invoice, lines } = await seedInvoice({
      customerId,
      salesmanId,
      lines: [
        {
          productId,
          unitId,
          qtyInput: 5,
          qtyBaseUnit: 5,
          unitPrice: 10000,
          unitCostFifo: 5000,
        },
      ],
    });

    await expect(
      service.create(
        {
          salesInvoiceId: invoice.id,
          returnDate: daysAgoIso(0),
          settlementType: SalesReturnSettlementType.CASH,
          lines: [{ salesInvoiceLineId: lines[0].id, qtyInput: 1 }],
        },
        masterUser,
      ),
    ).rejects.toThrow(/cashAccountId wajib diisi/i);

    await expect(
      service.create(
        {
          salesInvoiceId: invoice.id,
          returnDate: daysAgoIso(0),
          settlementType: SalesReturnSettlementType.REDUCE_INVOICE,
          cashAccountId,
          lines: [{ salesInvoiceLineId: lines[0].id, qtyInput: 1 }],
        },
        masterUser,
      ),
    ).rejects.toThrow(/cashAccountId wajib kosong/i);

    await expect(
      service.create(
        {
          salesInvoiceId: invoice.id,
          returnDate: daysAgoIso(0),
          settlementType: SalesReturnSettlementType.CASH,
          cashAccountId: nonCashAccountId,
          lines: [{ salesInvoiceLineId: lines[0].id, qtyInput: 1 }],
        },
        masterUser,
      ),
    ).rejects.toThrow(/bukan akun Kas\/Bank/i);
  });

  it('settlementType CASH -> jurnal mengkredit akun kas, TIDAK ada baris ber-customerId', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Cash');
    const { invoice, lines } = await seedInvoice({
      customerId,
      salesmanId,
      lines: [
        {
          productId,
          unitId,
          qtyInput: 5,
          qtyBaseUnit: 5,
          unitPrice: 10000,
          unitCostFifo: 5000,
        },
      ],
    });

    const result = await service.create(
      {
        salesInvoiceId: invoice.id,
        returnDate: daysAgoIso(0),
        settlementType: SalesReturnSettlementType.CASH,
        cashAccountId,
        lines: [{ salesInvoiceLineId: lines[0].id, qtyInput: 5 }],
      },
      masterUser,
    );
    createdReturnIds.push(result.salesReturn.id);

    const creditLine = result.journalEntry!.lines.find(
      (l) => Number(l.creditAmount) === 50000,
    );
    expect(creditLine).toBeDefined();
    expect(creditLine!.accountId).toBe(cashAccountId);

    const taggedRows: { customer_id: string | null }[] = await dataSource.query(
      `SELECT customer_id FROM journal_entry_lines WHERE journal_entry_id = $1 AND customer_id IS NOT NULL`,
      [result.journalEntry!.id],
    );
    expect(taggedRows).toHaveLength(0);
  });

  it('settlementType REDUCE_INVOICE -> baris kredit Piutang ber-customerId, jurnal balance', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Reduce Invoice');
    const { invoice, lines } = await seedInvoice({
      customerId,
      salesmanId,
      lines: [
        {
          productId,
          unitId,
          qtyInput: 5,
          qtyBaseUnit: 5,
          unitPrice: 10000,
          unitCostFifo: 5000,
        },
      ],
    });

    const result = await service.create(
      {
        salesInvoiceId: invoice.id,
        returnDate: daysAgoIso(0),
        settlementType: SalesReturnSettlementType.REDUCE_INVOICE,
        lines: [{ salesInvoiceLineId: lines[0].id, qtyInput: 5 }],
      },
      masterUser,
    );
    createdReturnIds.push(result.salesReturn.id);

    const taggedRows: { customer_id: string }[] = await dataSource.query(
      `SELECT customer_id FROM journal_entry_lines WHERE journal_entry_id = $1 AND customer_id IS NOT NULL`,
      [result.journalEntry!.id],
    );
    expect(taggedRows).toHaveLength(1);
    expect(taggedRows[0].customer_id).toBe(customerId);

    const totalDebit = result.journalEntry!.lines.reduce(
      (sum, l) => sum + Number(l.debitAmount),
      0,
    );
    const totalCredit = result.journalEntry!.lines.reduce(
      (sum, l) => sum + Number(l.creditAmount),
      0,
    );
    expect(totalDebit).toBe(totalCredit);
  });

  it('baris bonus (unit_price=0, unit_cost_fifo=0) -> retur sukses tanpa jurnal (tidak ada apa pun untuk dijurnal)', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Bonus Retur');
    const { invoice, lines } = await seedInvoice({
      customerId,
      salesmanId,
      lines: [
        {
          productId,
          unitId,
          qtyInput: 5,
          qtyBaseUnit: 5,
          unitPrice: 0,
          unitCostFifo: 0,
        },
      ],
    });

    const result = await service.create(
      {
        salesInvoiceId: invoice.id,
        returnDate: daysAgoIso(0),
        settlementType: SalesReturnSettlementType.REDUCE_INVOICE,
        lines: [{ salesInvoiceLineId: lines[0].id, qtyInput: 5 }],
      },
      masterUser,
    );
    createdReturnIds.push(result.salesReturn.id);

    expect(result.journalEntry).toBeNull();
    expect(Number(result.salesReturn.totalAmount)).toBe(0);

    const lotRows: { unit_cost: string }[] = await dataSource.query(
      `SELECT unit_cost FROM stock_cost_lots WHERE source_type = 'SALES_RETURN' AND source_id = $1`,
      [result.salesReturn.id],
    );
    expect(lotRows).toHaveLength(1);
    expect(Number(lotRows[0].unit_cost)).toBe(0);
  });

  it('registerPrint(): cetak ulang bebas, print_count naik tanpa approval', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Cetak Retur');
    const { invoice, lines } = await seedInvoice({
      customerId,
      salesmanId,
      lines: [
        {
          productId,
          unitId,
          qtyInput: 2,
          qtyBaseUnit: 2,
          unitPrice: 10000,
          unitCostFifo: 5000,
        },
      ],
    });
    const result = await service.create(
      {
        salesInvoiceId: invoice.id,
        returnDate: daysAgoIso(0),
        settlementType: SalesReturnSettlementType.REDUCE_INVOICE,
        lines: [{ salesInvoiceLineId: lines[0].id, qtyInput: 2 }],
      },
      masterUser,
    );
    createdReturnIds.push(result.salesReturn.id);

    const first = await service.registerPrint(result.salesReturn.id);
    expect(first.printCount).toBe(1);
    const second = await service.registerPrint(result.salesReturn.id);
    expect(second.printCount).toBe(2);
    expect(second.postingStatus).toBe(SalesReturnPostingStatus.POSTED);
  });

  it('OPERATOR bisa membuat retur (bukan hanya MASTER) -- guard role sesungguhnya ada di controller', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Operator');
    const { invoice, lines } = await seedInvoice({
      customerId,
      salesmanId,
      lines: [
        {
          productId,
          unitId,
          qtyInput: 2,
          qtyBaseUnit: 2,
          unitPrice: 10000,
          unitCostFifo: 5000,
        },
      ],
    });

    const result = await service.create(
      {
        salesInvoiceId: invoice.id,
        returnDate: daysAgoIso(0),
        settlementType: SalesReturnSettlementType.REDUCE_INVOICE,
        lines: [{ salesInvoiceLineId: lines[0].id, qtyInput: 2 }],
      },
      operatorUser,
    );
    createdReturnIds.push(result.salesReturn.id);
    expect(result.salesReturn.createdBy).toBe(operatorUser.sub);
  });
});
