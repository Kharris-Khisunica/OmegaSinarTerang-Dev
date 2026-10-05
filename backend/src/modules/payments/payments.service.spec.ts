import * as bcrypt from 'bcrypt';
import { HttpException } from '@nestjs/common';
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
import { StepUpRequiredBody } from '../authorization-requests/step-up-response';
import { StockRecorderService } from '../../core/stock-recorder/stock-recorder.service';
import { VoidEngineService } from '../../core/void/void.service';
import { AuthorizationRequestsService } from '../authorization-requests/authorization-requests.service';
import { AuthorizationRequest } from '../authorization-requests/entities/authorization-request.entity';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import {
  AccountSubtype,
  AccountType,
  ChartOfAccount,
  NormalBalance,
} from '../chart-of-accounts/entities/chart-of-account.entity';
import { Customer } from '../customers/entities/customer.entity';
import { JournalEntryLine } from '../journal-entries/entities/journal-entry-line.entity';
import { JournalEntry } from '../journal-entries/entities/journal-entry.entity';
import { Brand } from '../brands/entities/brand.entity';
import { ProductUnitConversion } from '../products/entities/product-unit-conversion.entity';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { PurchaseInvoiceLine } from '../purchase-invoices/entities/purchase-invoice-line.entity';
import { PurchaseInvoice } from '../purchase-invoices/entities/purchase-invoice.entity';
import { Salesman } from '../salesmen/entities/salesman.entity';
import { SalesInvoiceLine } from '../sales-invoices/entities/sales-invoice-line.entity';
import { SalesInvoice } from '../sales-invoices/entities/sales-invoice.entity';
import { StockMovement } from '../stock/entities/stock-movement.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { User } from '../users/entities/user.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentBatch } from './entities/payment-batch.entity';
import { Payment, PaymentInvoiceType } from './entities/payment.entity';
import { PaymentBatchVoidHook } from './payment-batch-void.hook';
import { PaymentsService } from './payments.service';

/**
 * Integration test terhadap Postgres asli, pola sama
 * purchase-returns.service.spec.ts/sales-returns.service.spec.ts — semua
 * service dikonstruksi manual lewat `new` (bypass Nest DI). Faktur uji dibuat
 * LANGSUNG lewat repository (bukan SalesInvoicesService/PurchaseInvoicesService)
 * karena PaymentsService.confirm()/findOpenInvoicesList() hanya membaca header
 * faktur (customer_id/supplier_id, total_amount, posting_status) — tidak
 * pernah menyentuh baris, jadi tidak perlu produk/stok sungguhan.
 */
describe('PaymentsService', () => {
  let dataSource: DataSource;
  let service: PaymentsService;

  let masterUserId: string;
  let operatorUserId: string;
  let supervisorUserId: string;
  let masterUser: AuthenticatedUser;
  let operatorUser: AuthenticatedUser;
  let supervisorUser: AuthenticatedUser;
  let cashAccountId: string;
  let transferAccountId: string;
  let nonCashAccountId: string;
  let outflowApprovalAccountId: string;
  let cashOutflowThreshold: number;
  let authorizationRequestsService: AuthorizationRequestsService;
  let stepUpService: StepUpService;

  const createdCustomerIds: string[] = [];
  const createdSupplierIds: string[] = [];
  const createdSalesmanIds: string[] = [];
  const createdSalesInvoiceIds: string[] = [];
  const createdPurchaseInvoiceIds: string[] = [];
  const createdSalesReturnIds: string[] = [];
  const createdPaymentBatchIds: string[] = [];
  const createdAccountIds: string[] = [];

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
        Customer,
        Supplier,
        Salesman,
        ChartOfAccount,
        SalesInvoice,
        SalesInvoiceLine,
        PurchaseInvoice,
        PurchaseInvoiceLine,
        PaymentBatch,
        PaymentMethod,
        Payment,
        JournalEntry,
        JournalEntryLine,
        AuthorizationRequest,
        StockMovement,
        Brand,
        Product,
        ProductUnitConversion,
      ],
    });
    await dataSource.initialize();

    const accountResolverService = new AccountResolverService(dataSource);
    const documentCounterService = new DocumentCounterService();
    const periodLockValidatorService = new PeriodLockValidatorService();
    const journalPosterService = new JournalPosterService(
      documentCounterService,
      periodLockValidatorService,
    );
    const arAccountResolverService = new ArAccountResolverService(dataSource);
    authorizationRequestsService = new AuthorizationRequestsService(
      dataSource.getRepository(AuthorizationRequest),
    );
    stepUpService = new StepUpService(authorizationRequestsService);
    const productsService = new ProductsService(
      dataSource.getRepository(Product),
      dataSource.getRepository(Brand),
      dataSource,
    );
    const stockRecorderService = new StockRecorderService(
      dataSource,
      productsService,
    );
    const voidEngineService = new VoidEngineService(
      journalPosterService,
      stockRecorderService,
    );
    const printLockService = new PrintLockService(dataSource, stepUpService);

    service = new PaymentsService(
      dataSource,
      accountResolverService,
      documentCounterService,
      journalPosterService,
      arAccountResolverService,
      stepUpService,
      voidEngineService,
      printLockService,
    );

    // Self-registrasi hook VOID yang biasanya terjadi lewat OnModuleInit di
    // Nest DI (pola sama sales-returns.service.spec.ts) — di sini dipanggil
    // manual karena semua service dikonstruksi lewat `new`, bukan Nest.
    new PaymentBatchVoidHook(voidEngineService).onModuleInit();

    const suffix = Date.now();
    const usersRepo = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('test-password', 4);
    const master = await usersRepo.save(
      usersRepo.create({
        username: `test_pay_master_${suffix}`,
        passwordHash,
        fullName: 'Test Payments Master',
        role: Role.MASTER,
        isActive: true,
      }),
    );
    masterUserId = master.id;
    masterUser = {
      sub: masterUserId,
      username: master.username,
      role: Role.MASTER,
    };

    const operator = await usersRepo.save(
      usersRepo.create({
        username: `test_pay_operator_${suffix}`,
        passwordHash,
        fullName: 'Test Payments Operator',
        role: Role.OPERATOR,
        isActive: true,
      }),
    );
    operatorUserId = operator.id;
    operatorUser = {
      sub: operatorUserId,
      username: operator.username,
      role: Role.OPERATOR,
    };

    const supervisor = await usersRepo.save(
      usersRepo.create({
        username: `test_pay_supervisor_${suffix}`,
        passwordHash,
        fullName: 'Test Payments Supervisor',
        role: Role.SUPERVISOR,
        isActive: true,
      }),
    );
    supervisorUserId = supervisor.id;
    supervisorUser = {
      sub: supervisorUserId,
      username: supervisor.username,
      role: Role.SUPERVISOR,
    };

    const coaRepo = dataSource.getRepository(ChartOfAccount);
    const cashAccount = await coaRepo.save(
      coaRepo.create({
        code: `KAS-PAY-${suffix.toString().slice(-8)}`,
        name: 'Kas Uji Payment',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.CURRENT_ASSET,
        isCashAccount: true,
        isActive: true,
      }),
    );
    cashAccountId = cashAccount.id;
    createdAccountIds.push(cashAccountId);

    const transferAccount = await coaRepo.save(
      coaRepo.create({
        code: `BANK-PAY-${suffix.toString().slice(-8)}`,
        name: 'Bank Uji Payment',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.CURRENT_ASSET,
        isCashAccount: true,
        isActive: true,
      }),
    );
    transferAccountId = transferAccount.id;
    createdAccountIds.push(transferAccountId);

    const outflowApprovalAccount = await coaRepo.save(
      coaRepo.create({
        code: `KB-PAY-${suffix.toString().slice(-8)}`,
        name: 'Kas Besar Uji Payment',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.CURRENT_ASSET,
        isCashAccount: true,
        requiresOutflowApproval: true,
        isActive: true,
      }),
    );
    outflowApprovalAccountId = outflowApprovalAccount.id;
    createdAccountIds.push(outflowApprovalAccountId);

    const thresholdRows: { value: string }[] = await dataSource.query(
      `SELECT value FROM settings WHERE key = 'cash_outflow_approval_threshold'`,
    );
    cashOutflowThreshold = thresholdRows[0]
      ? Number(thresholdRows[0].value)
      : 0;

    const inventoryAccountId = await accountResolverService.resolveSingleActive(
      'is_inventory_account = true',
      'Persediaan',
    );
    nonCashAccountId = inventoryAccountId; // akun nyata tapi is_cash_account=false
  });

  afterAll(async () => {
    if (createdPaymentBatchIds.length > 0) {
      await dataSource.query(
        `DELETE FROM journal_entry_lines WHERE journal_entry_id IN (
           SELECT id FROM journal_entries
           WHERE (source_type = 'PAYMENT' AND source_id = ANY($1))
              OR (source_type = 'VOID_REVERSAL' AND source_id IN (
                    SELECT id FROM journal_entries WHERE source_type = 'PAYMENT' AND source_id = ANY($1)
                  ))
         )`,
        [createdPaymentBatchIds],
      );
      await dataSource.query(
        `DELETE FROM journal_entries
         WHERE (source_type = 'PAYMENT' AND source_id = ANY($1))
            OR (source_type = 'VOID_REVERSAL' AND source_id IN (
                  SELECT id FROM journal_entries WHERE source_type = 'PAYMENT' AND source_id = ANY($1)
                ))`,
        [createdPaymentBatchIds],
      );
      await dataSource.query(
        `DELETE FROM payment_methods WHERE payment_id IN (
           SELECT id FROM payments WHERE payment_batch_id = ANY($1)
         )`,
        [createdPaymentBatchIds],
      );
      await dataSource.query(
        `DELETE FROM payments WHERE payment_batch_id = ANY($1)`,
        [createdPaymentBatchIds],
      );
      await dataSource.query(`DELETE FROM payment_batches WHERE id = ANY($1)`, [
        createdPaymentBatchIds,
      ]);
    }
    await dataSource.query(
      `DELETE FROM authorization_requests WHERE requester_id = ANY($1) OR approver_id = ANY($1)`,
      [[masterUserId, operatorUserId, supervisorUserId]],
    );
    if (createdSalesReturnIds.length > 0) {
      await dataSource.query(`DELETE FROM sales_returns WHERE id = ANY($1)`, [
        createdSalesReturnIds,
      ]);
    }
    if (createdSalesInvoiceIds.length > 0) {
      await dataSource.query(`DELETE FROM sales_invoices WHERE id = ANY($1)`, [
        createdSalesInvoiceIds,
      ]);
    }
    if (createdPurchaseInvoiceIds.length > 0) {
      await dataSource.query(
        `DELETE FROM purchase_invoices WHERE id = ANY($1)`,
        [createdPurchaseInvoiceIds],
      );
    }
    if (createdCustomerIds.length > 0) {
      await dataSource.query(`DELETE FROM customers WHERE id = ANY($1)`, [
        createdCustomerIds,
      ]);
    }
    if (createdSupplierIds.length > 0) {
      await dataSource.query(`DELETE FROM suppliers WHERE id = ANY($1)`, [
        createdSupplierIds,
      ]);
    }
    if (createdSalesmanIds.length > 0) {
      await dataSource.query(`DELETE FROM salesmen WHERE id = ANY($1)`, [
        createdSalesmanIds,
      ]);
    }
    if (createdAccountIds.length > 0) {
      await dataSource.query(
        `DELETE FROM chart_of_accounts WHERE id = ANY($1)`,
        [createdAccountIds],
      );
    }
    await dataSource.query('DELETE FROM audit_logs WHERE user_id = ANY($1)', [
      [masterUserId, operatorUserId, supervisorUserId],
    ]);
    await dataSource.query('DELETE FROM users WHERE id = ANY($1)', [
      [masterUserId, operatorUserId, supervisorUserId],
    ]);
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
        code: `CUST-PAY-${suffix}`,
        name: `Pelanggan Uji Payment ${suffix}`,
        isPkp: false,
        isActive: true,
      }),
    );
    createdCustomerIds.push(customer.id);
    return customer.id;
  }

  async function createTestSupplier(): Promise<string> {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const supplier = await dataSource.getRepository(Supplier).save(
      dataSource.getRepository(Supplier).create({
        displayCode: `SUP-PAY-${suffix}`,
        name: `Supplier Uji Payment ${suffix}`,
        isPkp: false,
        isActive: true,
      }),
    );
    createdSupplierIds.push(supplier.id);
    return supplier.id;
  }

  async function createTestSalesman(): Promise<string> {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const salesman = await dataSource.getRepository(Salesman).save(
      dataSource.getRepository(Salesman).create({
        code: `SLM-PAY-${suffix}`,
        name: `Salesman Uji ${suffix}`,
        isActive: true,
      }),
    );
    createdSalesmanIds.push(salesman.id);
    return salesman.id;
  }

  async function createTestSalesInvoice(params: {
    customerId: string;
    salesmanId: string;
    totalAmount: number;
    invoiceDate?: string;
  }): Promise<SalesInvoice> {
    const invoiceDate = params.invoiceDate ?? daysAgoIso(0);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const invoicesRepo = dataSource.getRepository(SalesInvoice);
    const invoice = await invoicesRepo.save(
      invoicesRepo.create({
        invoiceNumber: `JL/TPAY-${suffix}`,
        invoiceDate,
        customerId: params.customerId,
        salesChannel: SalesChannel.TOKO,
        salesOrderId: null,
        salesmanId: params.salesmanId,
        termDays: 0,
        dueDate: invoiceDate,
        subtotal: params.totalAmount.toFixed(2),
        totalAmount: params.totalAmount.toFixed(2),
        createdBy: masterUserId,
      }),
    );
    createdSalesInvoiceIds.push(invoice.id);
    return invoice;
  }

  async function createTestPurchaseInvoice(params: {
    supplierId: string;
    totalAmount: number;
    receiptDate?: string;
  }): Promise<PurchaseInvoice> {
    const receiptDate = params.receiptDate ?? daysAgoIso(0);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const invoicesRepo = dataSource.getRepository(PurchaseInvoice);
    const invoice = await invoicesRepo.save(
      invoicesRepo.create({
        invoiceNumber: `B1/TPAY-${suffix}`,
        supplierId: params.supplierId,
        supplierInvoiceNo: `SUP-INV-${suffix}`,
        receiptDate,
        supplierInvoiceDate: receiptDate,
        dueDate: receiptDate,
        termDays: 0,
        subtotal: params.totalAmount.toFixed(2),
        totalAmount: params.totalAmount.toFixed(2),
        createdBy: masterUserId,
      }),
    );
    createdPurchaseInvoiceIds.push(invoice.id);
    return invoice;
  }

  /** Seed payment_batches + payments LANGSUNG (di luar PaymentsService.confirm(), untuk skenario "sudah ada pembayaran lain sebelumnya" tanpa perlu isi payment_methods). */
  async function seedExistingPayment(params: {
    invoiceType: PaymentInvoiceType;
    invoiceId: string;
    allocatedAmount: number;
  }): Promise<void> {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const [batch]: { id: string }[] = await dataSource.query(
      `INSERT INTO payment_batches (batch_number, payment_date, total_amount, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [
        `PAY/TPAY-${suffix}`,
        daysAgoIso(0),
        params.allocatedAmount,
        masterUserId,
      ],
    );
    createdPaymentBatchIds.push(batch.id);
    await dataSource.query(
      `INSERT INTO payments (payment_batch_id, invoice_type, invoice_id, allocated_amount)
       VALUES ($1, $2, $3, $4)`,
      [batch.id, params.invoiceType, params.invoiceId, params.allocatedAmount],
    );
  }

  async function seedReduceInvoiceReturn(params: {
    salesInvoiceId: string;
    customerId: string;
    totalAmount: number;
  }): Promise<void> {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const [ret]: { id: string }[] = await dataSource.query(
      `INSERT INTO sales_returns
         (return_number, sales_invoice_id, customer_id, return_date, settlement_type,
          dpp_amount, output_vat_amount, total_amount, cost_basis_amount, created_by)
       VALUES ($1, $2, $3, $4, 'REDUCE_INVOICE', $5, 0, $5, 0, $6)
       RETURNING id`,
      [
        `RJ/TPAY-${suffix}`,
        params.salesInvoiceId,
        params.customerId,
        daysAgoIso(0),
        params.totalAmount,
        masterUserId,
      ],
    );
    createdSalesReturnIds.push(ret.id);
  }

  it('DoD (koreksi 26 Sep 2026): metode per BARIS -- satu faktur 100jt dibayar 30jt kas + 50jt transfer -> sisa 20jt outstanding', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const invoice = await createTestSalesInvoice({
      customerId,
      salesmanId,
      totalAmount: 100_000_000,
    });

    const result = await service.confirm(
      {
        invoiceType: PaymentInvoiceType.SALES,
        paymentDate: daysAgoIso(0),
        lines: [
          {
            invoiceId: invoice.id,
            methods: [
              { cashAccountId, amount: 30_000_000 },
              { cashAccountId: transferAccountId, amount: 50_000_000 },
            ],
          },
        ],
      },
      masterUser,
    );
    createdPaymentBatchIds.push(result.paymentBatch.id);

    expect(Number(result.payments[0].allocatedAmount)).toBe(80_000_000);
    expect(Number(result.paymentBatch.totalAmount)).toBe(80_000_000);

    const open = await service.findOpenInvoicesList({
      invoiceType: PaymentInvoiceType.SALES,
      partyId: customerId,
    });
    const row = open.invoices.find((i) => i.invoiceId === invoice.id);
    expect(row?.outstanding).toBe(20_000_000);

    // Kedua metode benar-benar tersimpan TERPISAH milik baris faktur ini
    // (payment_methods, bukan lagi satu pool di level batch).
    const detail = await service.findOne(result.paymentBatch.id);
    expect(detail.lines[0].methods).toHaveLength(2);
    const cashMethod = detail.lines[0].methods.find(
      (m) => m.cashAccountId === cashAccountId,
    );
    const transferMethod = detail.lines[0].methods.find(
      (m) => m.cashAccountId === transferAccountId,
    );
    expect(cashMethod?.amount).toBe(30_000_000);
    expect(transferMethod?.amount).toBe(50_000_000);
  });

  it('cashAccountId bukan akun is_cash_account -> ditolak', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const invoice = await createTestSalesInvoice({
      customerId,
      salesmanId,
      totalAmount: 10_000_000,
    });

    await expect(
      service.confirm(
        {
          invoiceType: PaymentInvoiceType.SALES,
          paymentDate: daysAgoIso(0),
          lines: [
            {
              invoiceId: invoice.id,
              methods: [{ cashAccountId: nonCashAccountId, amount: 1_000_000 }],
            },
          ],
        },
        masterUser,
      ),
    ).rejects.toThrow(/Kas\/Bank/i);
  });

  it('faktur yang sudah sebagian dibayar -> outstanding di findOpenInvoicesList memperhitungkannya', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const invoice = await createTestSalesInvoice({
      customerId,
      salesmanId,
      totalAmount: 10_000_000,
    });
    await seedExistingPayment({
      invoiceType: PaymentInvoiceType.SALES,
      invoiceId: invoice.id,
      allocatedAmount: 4_000_000,
    });

    const open = await service.findOpenInvoicesList({
      invoiceType: PaymentInvoiceType.SALES,
      partyId: customerId,
    });
    const row = open.invoices.find((i) => i.invoiceId === invoice.id);
    expect(row?.outstanding).toBe(6_000_000);
  });

  it('retur penjualan REDUCE_INVOICE mengurangi sisa faktur asal', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const invoice = await createTestSalesInvoice({
      customerId,
      salesmanId,
      totalAmount: 10_000_000,
    });
    await seedReduceInvoiceReturn({
      salesInvoiceId: invoice.id,
      customerId,
      totalAmount: 3_000_000,
    });

    const open = await service.findOpenInvoicesList({
      invoiceType: PaymentInvoiceType.SALES,
      partyId: customerId,
    });
    const row = open.invoices.find((i) => i.invoiceId === invoice.id);
    expect(row?.outstanding).toBe(7_000_000);
  });

  // --- Hari 27: POST /payments/confirm — Selisih Pembayaran + VOID ---------

  async function getJournalLines(
    sourceId: string,
  ): Promise<
    { account_id: string; debit_amount: string; credit_amount: string }[]
  > {
    return dataSource.query(
      `SELECT jel.account_id, jel.debit_amount, jel.credit_amount
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.id = jel.journal_entry_id
       WHERE je.source_type = 'PAYMENT' AND je.source_id = $1
       ORDER BY jel.line_order`,
      [sourceId],
    );
  }

  it('DoD #1: 33.253.125 dibayar 33.253.000, tandai lunas -> selisih 125 debit, jurnal balance', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const invoice = await createTestSalesInvoice({
      customerId,
      salesmanId,
      totalAmount: 33_253_125,
    });

    const result = await service.confirm(
      {
        invoiceType: PaymentInvoiceType.SALES,
        paymentDate: daysAgoIso(0),
        lines: [
          {
            invoiceId: invoice.id,
            settleInFull: true,
            methods: [{ cashAccountId, amount: 33_253_000 }],
          },
        ],
      },
      masterUser,
    );
    createdPaymentBatchIds.push(result.paymentBatch.id);

    expect(Number(result.payments[0].allocatedAmount)).toBe(33_253_125);
    expect(Number(result.payments[0].discrepancyAmount)).toBe(125);

    const lines = await getJournalLines(result.paymentBatch.id);
    const totalDebit = lines.reduce((s, l) => s + Number(l.debit_amount), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.credit_amount), 0);
    expect(totalDebit).toBeCloseTo(totalCredit, 2);
    expect(totalDebit).toBeCloseTo(33_253_125, 2);

    const cashLine = lines.find((l) => l.account_id === cashAccountId);
    expect(Number(cashLine?.debit_amount)).toBe(33_253_000);
    const diffAccountId = await new AccountResolverService(
      dataSource,
    ).resolveSingleActive(
      'is_payment_diff_account = true',
      'Selisih Pembayaran',
    );
    const diffLine = lines.find((l) => l.account_id === diffAccountId);
    expect(Number(diffLine?.debit_amount)).toBe(125);
    expect(Number(diffLine?.credit_amount)).toBe(0);
  });

  it('DoD #2: 33.253.125 dibayar 33.254.000, tandai lunas -> selisih 875 kredit, jurnal balance', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const invoice = await createTestSalesInvoice({
      customerId,
      salesmanId,
      totalAmount: 33_253_125,
    });

    const result = await service.confirm(
      {
        invoiceType: PaymentInvoiceType.SALES,
        paymentDate: daysAgoIso(0),
        lines: [
          {
            invoiceId: invoice.id,
            settleInFull: true,
            methods: [{ cashAccountId, amount: 33_254_000 }],
          },
        ],
      },
      masterUser,
    );
    createdPaymentBatchIds.push(result.paymentBatch.id);

    expect(Number(result.payments[0].discrepancyAmount)).toBe(-875);

    const lines = await getJournalLines(result.paymentBatch.id);
    const totalDebit = lines.reduce((s, l) => s + Number(l.debit_amount), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.credit_amount), 0);
    expect(totalDebit).toBeCloseTo(totalCredit, 2);
    expect(totalDebit).toBeCloseTo(33_254_000, 2);

    const diffAccountId = await new AccountResolverService(
      dataSource,
    ).resolveSingleActive(
      'is_payment_diff_account = true',
      'Selisih Pembayaran',
    );
    const diffLine = lines.find((l) => l.account_id === diffAccountId);
    expect(Number(diffLine?.credit_amount)).toBe(875);
    expect(Number(diffLine?.debit_amount)).toBe(0);
  });

  it('DoD #3: pembayaran sebagian -> TIDAK ada baris selisih apa pun', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const invoice = await createTestSalesInvoice({
      customerId,
      salesmanId,
      totalAmount: 10_000_000,
    });

    const result = await service.confirm(
      {
        invoiceType: PaymentInvoiceType.SALES,
        paymentDate: daysAgoIso(0),
        lines: [
          {
            invoiceId: invoice.id,
            methods: [{ cashAccountId, amount: 6_000_000 }],
          },
        ],
      },
      masterUser,
    );
    createdPaymentBatchIds.push(result.paymentBatch.id);

    expect(Number(result.payments[0].discrepancyAmount)).toBe(0);
    expect(result.payments[0].settledInFull).toBe(false);

    const diffAccountId = await new AccountResolverService(
      dataSource,
    ).resolveSingleActive(
      'is_payment_diff_account = true',
      'Selisih Pembayaran',
    );
    const lines = await getJournalLines(result.paymentBatch.id);
    expect(lines.some((l) => l.account_id === diffAccountId)).toBe(false);
  });

  it('DoD #4: selisih Rp 15.000 -> faktur ditandai, batch tetap sukses tanpa step-up', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const invoice = await createTestSalesInvoice({
      customerId,
      salesmanId,
      totalAmount: 1_000_000,
    });

    const result = await service.confirm(
      {
        invoiceType: PaymentInvoiceType.SALES,
        paymentDate: daysAgoIso(0),
        lines: [
          {
            invoiceId: invoice.id,
            settleInFull: true,
            methods: [{ cashAccountId, amount: 985_000 }],
          },
        ],
      },
      masterUser,
    );
    createdPaymentBatchIds.push(result.paymentBatch.id);

    const updated = await dataSource.getRepository(SalesInvoice).findOne({
      where: { id: invoice.id },
    });
    expect(updated?.paymentDiscrepancyFlagged).toBe(true);
  });

  it('selisih Rp 10.000 tepat (bukan "di atas") -> TIDAK ditandai', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const invoice = await createTestSalesInvoice({
      customerId,
      salesmanId,
      totalAmount: 1_000_000,
    });

    const result = await service.confirm(
      {
        invoiceType: PaymentInvoiceType.SALES,
        paymentDate: daysAgoIso(0),
        lines: [
          {
            invoiceId: invoice.id,
            settleInFull: true,
            methods: [{ cashAccountId, amount: 990_000 }],
          },
        ],
      },
      masterUser,
    );
    createdPaymentBatchIds.push(result.paymentBatch.id);

    const updated = await dataSource.getRepository(SalesInvoice).findOne({
      where: { id: invoice.id },
    });
    expect(updated?.paymentDiscrepancyFlagged).toBe(false);
  });

  it('overpayment TANPA settleInFull -> ditolak', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const invoice = await createTestSalesInvoice({
      customerId,
      salesmanId,
      totalAmount: 1_000_000,
    });

    await expect(
      service.confirm(
        {
          invoiceType: PaymentInvoiceType.SALES,
          paymentDate: daysAgoIso(0),
          lines: [
            {
              invoiceId: invoice.id,
              methods: [{ cashAccountId, amount: 1_500_000 }],
            },
          ],
        },
        masterUser,
      ),
    ).rejects.toThrow(/melebihi sisa faktur/i);
  });

  it('DoD #5: VOID membalik jurnal + alokasi, sisa faktur pulih sepenuhnya', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const invoice = await createTestSalesInvoice({
      customerId,
      salesmanId,
      totalAmount: 5_000_000,
    });

    const confirmResult = await service.confirm(
      {
        invoiceType: PaymentInvoiceType.SALES,
        paymentDate: daysAgoIso(0),
        lines: [
          {
            invoiceId: invoice.id,
            settleInFull: true,
            methods: [{ cashAccountId, amount: 4_900_000 }],
          },
        ],
      },
      masterUser,
    );
    createdPaymentBatchIds.push(confirmResult.paymentBatch.id);

    const flaggedBefore = await dataSource
      .getRepository(SalesInvoice)
      .findOne({ where: { id: invoice.id } });
    expect(flaggedBefore?.paymentDiscrepancyFlagged).toBe(true); // 100rb > 10rb

    const voidResult = await service.voidBatch(
      confirmResult.paymentBatch.id,
      { reasonCode: 'SALAH_INPUT', reasonNote: 'Uji VOID batch pembayaran' },
      masterUser,
      undefined,
      undefined,
    );
    expect(voidResult.paymentBatch.postingStatus).toBe('VOIDED');

    const reversalLines: {
      debit_amount: string;
      credit_amount: string;
    }[] = await dataSource.query(
      `SELECT jel.debit_amount, jel.credit_amount
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.id = jel.journal_entry_id
       WHERE je.source_type = 'VOID_REVERSAL'
         AND je.source_id = (SELECT id FROM journal_entries WHERE source_type = 'PAYMENT' AND source_id = $1)`,
      [confirmResult.paymentBatch.id],
    );
    const reversalDebit = reversalLines.reduce(
      (s, l) => s + Number(l.debit_amount),
      0,
    );
    const reversalCredit = reversalLines.reduce(
      (s, l) => s + Number(l.credit_amount),
      0,
    );
    expect(reversalDebit).toBeCloseTo(reversalCredit, 2);
    expect(reversalDebit).toBeCloseTo(5_000_000, 2);

    const flaggedAfter = await dataSource
      .getRepository(SalesInvoice)
      .findOne({ where: { id: invoice.id } });
    expect(flaggedAfter?.paymentDiscrepancyFlagged).toBe(false);

    // Sisa faktur pulih sepenuhnya, dibuktikan lewat findOpenInvoicesList
    // sendiri (bukan asersi terisolasi) — batch yang di-VOID tidak lagi
    // terhitung.
    const open = await service.findOpenInvoicesList({
      invoiceType: PaymentInvoiceType.SALES,
      partyId: customerId,
    });
    const row = open.invoices.find((i) => i.invoiceId === invoice.id);
    expect(row?.outstanding).toBe(5_000_000);
  });

  it('VOID oleh OPERATOR tanpa approval -> 412; dengan approval MASTER -> sukses', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const invoice = await createTestSalesInvoice({
      customerId,
      salesmanId,
      totalAmount: 2_000_000,
    });
    const confirmResult = await service.confirm(
      {
        invoiceType: PaymentInvoiceType.SALES,
        paymentDate: daysAgoIso(0),
        lines: [
          {
            invoiceId: invoice.id,
            methods: [{ cashAccountId, amount: 2_000_000 }],
          },
        ],
      },
      masterUser,
    );
    createdPaymentBatchIds.push(confirmResult.paymentBatch.id);

    let stepUpBody: StepUpRequiredBody | undefined;
    try {
      await service.voidBatch(
        confirmResult.paymentBatch.id,
        { reasonCode: 'SALAH_INPUT', reasonNote: 'Uji step-up VOID' },
        operatorUser,
        undefined,
        undefined,
      );
      throw new Error('Seharusnya melempar 412 sebelum approval.');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(412);
      stepUpBody = httpErr.getResponse() as StepUpRequiredBody;
    }
    const authorizationRequestId = stepUpBody.authorizationRequestId;

    await authorizationRequestsService.approve(
      authorizationRequestId,
      masterUser,
    );

    const voidResult = await service.voidBatch(
      confirmResult.paymentBatch.id,
      { reasonCode: 'SALAH_INPUT', reasonNote: 'Uji step-up VOID' },
      operatorUser,
      undefined,
      authorizationRequestId,
    );
    expect(voidResult.paymentBatch.postingStatus).toBe('VOIDED');
  });

  it('PURCHASE dari akun requires_outflow_approval di atas ambang -> 412 lalu sukses setelah disetujui', async () => {
    const supplierId = await createTestSupplier();
    const invoice = await createTestPurchaseInvoice({
      supplierId,
      totalAmount: cashOutflowThreshold + 500_000,
    });
    const amount = cashOutflowThreshold + 500_000;

    let stepUpBody: StepUpRequiredBody | undefined;
    try {
      await service.confirm(
        {
          invoiceType: PaymentInvoiceType.PURCHASE,
          paymentDate: daysAgoIso(0),
          lines: [
            {
              invoiceId: invoice.id,
              methods: [{ cashAccountId: outflowApprovalAccountId, amount }],
            },
          ],
        },
        masterUser,
      );
      throw new Error('Seharusnya melempar 412 sebelum approval.');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(412);
      stepUpBody = httpErr.getResponse() as StepUpRequiredBody;
    }
    const authorizationRequestId = stepUpBody.authorizationRequestId;
    await authorizationRequestsService.approve(
      authorizationRequestId,
      supervisorUser,
    );

    const result = await service.confirm(
      {
        invoiceType: PaymentInvoiceType.PURCHASE,
        paymentDate: daysAgoIso(0),
        lines: [
          {
            invoiceId: invoice.id,
            methods: [
              {
                cashAccountId: outflowApprovalAccountId,
                amount,
                authorizationRequestId,
              },
            ],
          },
        ],
      },
      masterUser,
    );
    createdPaymentBatchIds.push(result.paymentBatch.id);

    const payableAccountId = await new AccountResolverService(
      dataSource,
    ).resolveSingleActive('is_payable_account = true', 'Hutang Usaha');
    const lines: { account_id: string; debit_amount: string }[] =
      await dataSource.query(
        `SELECT jel.account_id, jel.debit_amount, jel.credit_amount
         FROM journal_entry_lines jel
         JOIN journal_entries je ON je.id = jel.journal_entry_id
         WHERE je.source_type = 'PAYMENT' AND je.source_id = $1`,
        [result.paymentBatch.id],
      );
    const payableLine = lines.find((l) => l.account_id === payableAccountId);
    expect(Number(payableLine?.debit_amount)).toBe(amount);
  });

  it('customer dengan ar_account_id kustom -> jurnal posting ke akun itu, bukan default', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const coaRepo = dataSource.getRepository(ChartOfAccount);
    const customArAccount = await coaRepo.save(
      coaRepo.create({
        code: `AR-CUST-${suffix.slice(-8)}`,
        name: 'Piutang Kustom Uji Payment',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.CURRENT_ASSET,
        isReceivableAccount: true,
        isActive: true,
      }),
    );
    createdAccountIds.push(customArAccount.id);

    const customerId = await createTestCustomer();
    await dataSource
      .getRepository(Customer)
      .update(customerId, { arAccountId: customArAccount.id });
    const salesmanId = await createTestSalesman();
    const invoice = await createTestSalesInvoice({
      customerId,
      salesmanId,
      totalAmount: 1_000_000,
    });

    const result = await service.confirm(
      {
        invoiceType: PaymentInvoiceType.SALES,
        paymentDate: daysAgoIso(0),
        lines: [
          {
            invoiceId: invoice.id,
            methods: [{ cashAccountId, amount: 1_000_000 }],
          },
        ],
      },
      masterUser,
    );
    createdPaymentBatchIds.push(result.paymentBatch.id);

    const lines = await getJournalLines(result.paymentBatch.id);
    const arLine = lines.find((l) => l.account_id === customArAccount.id);
    expect(arLine).toBeTruthy();
    expect(Number(arLine?.credit_amount)).toBe(1_000_000);
  });

  // --- Paket R9 (KB1): satu batch, 3 baris, 2 pelanggan berbeda -----------

  it('DoD R9: confirm() 3 baris dari 2 pelanggan berbeda dalam SATU batch -> jurnal balance, AR masing-masing pelanggan berkurang benar', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const coaRepo = dataSource.getRepository(ChartOfAccount);
    const customArAccountA = await coaRepo.save(
      coaRepo.create({
        code: `AR-MULTI-A-${suffix.slice(-8)}`,
        name: 'Piutang Pelanggan A Uji Multi-Pihak',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.CURRENT_ASSET,
        isReceivableAccount: true,
        isActive: true,
      }),
    );
    createdAccountIds.push(customArAccountA.id);

    const salesmanId = await createTestSalesman();
    const customerA = await createTestCustomer();
    await dataSource
      .getRepository(Customer)
      .update(customerA, { arAccountId: customArAccountA.id });
    const customerB = await createTestCustomer(); // akun AR default

    const defaultArAccountId = await new ArAccountResolverService(
      dataSource,
    ).resolve({ arAccountId: null });

    const invoiceA1 = await createTestSalesInvoice({
      customerId: customerA,
      salesmanId,
      totalAmount: 1_000_000,
    });
    const invoiceA2 = await createTestSalesInvoice({
      customerId: customerA,
      salesmanId,
      totalAmount: 2_000_000,
    });
    const invoiceB1 = await createTestSalesInvoice({
      customerId: customerB,
      salesmanId,
      totalAmount: 3_000_000,
    });

    const result = await service.confirm(
      {
        invoiceType: PaymentInvoiceType.SALES,
        paymentDate: daysAgoIso(0),
        lines: [
          {
            invoiceId: invoiceA1.id,
            methods: [{ cashAccountId, amount: 1_000_000 }],
          },
          {
            invoiceId: invoiceA2.id,
            methods: [{ cashAccountId, amount: 2_000_000 }],
          },
          {
            invoiceId: invoiceB1.id,
            methods: [{ cashAccountId, amount: 3_000_000 }],
          },
        ],
      },
      masterUser,
    );
    createdPaymentBatchIds.push(result.paymentBatch.id);

    expect(result.payments).toHaveLength(3);

    const lines = await getJournalLines(result.paymentBatch.id);
    const totalDebit = lines.reduce((s, l) => s + Number(l.debit_amount), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.credit_amount), 0);
    expect(totalDebit).toBeCloseTo(totalCredit, 2);
    expect(totalDebit).toBeCloseTo(6_000_000, 2);

    // AR pelanggan A (akun kustom): 1jt + 2jt = 3jt lewat DUA baris jurnal
    // terpisah (satu per faktur -- TIDAK diagregasi seperti baris kas,
    // lihat komentar cashCentsByAccount di atas), terpisah dari AR default.
    const arLinesA = lines.filter((l) => l.account_id === customArAccountA.id);
    const arCreditA = arLinesA.reduce((s, l) => s + Number(l.credit_amount), 0);
    expect(arCreditA).toBe(3_000_000);

    // AR pelanggan B (akun default): 3jt, TIDAK bercampur dengan akun A.
    const arLinesDefault = lines.filter(
      (l) => l.account_id === defaultArAccountId,
    );
    const defaultCredit = arLinesDefault.reduce(
      (s, l) => s + Number(l.credit_amount),
      0,
    );
    expect(defaultCredit).toBe(3_000_000);

    // Kas: satu baris jurnal debit 6jt -- diagregasi dari 3 baris faktur yang
    // masing-masing punya payment_methods sendiri ke akun yang sama (koreksi
    // 26 Sep 2026, lihat cashCentsByAccount di PaymentsService.confirm()).
    const cashLine = lines.find((l) => l.account_id === cashAccountId);
    expect(Number(cashLine?.debit_amount)).toBe(6_000_000);
  });

  it('DoD R9: findAll() batch multi-pihak -> partyNames gabungan nama (<=3 pihak)', async () => {
    const salesmanId = await createTestSalesman();
    const customerA = await createTestCustomer();
    const customerB = await createTestCustomer();
    const invoiceA = await createTestSalesInvoice({
      customerId: customerA,
      salesmanId,
      totalAmount: 1_000_000,
    });
    const invoiceB = await createTestSalesInvoice({
      customerId: customerB,
      salesmanId,
      totalAmount: 2_000_000,
    });

    const result = await service.confirm(
      {
        invoiceType: PaymentInvoiceType.SALES,
        paymentDate: daysAgoIso(0),
        lines: [
          {
            invoiceId: invoiceA.id,
            methods: [{ cashAccountId, amount: 1_000_000 }],
          },
          {
            invoiceId: invoiceB.id,
            methods: [{ cashAccountId, amount: 2_000_000 }],
          },
        ],
      },
      masterUser,
    );
    createdPaymentBatchIds.push(result.paymentBatch.id);

    const list = await service.findAll({
      invoiceType: PaymentInvoiceType.SALES,
    });
    const row = list.data.find((r) => r.id === result.paymentBatch.id);
    expect(row?.partyNames).toBeTruthy();
    const customerARepo = await dataSource
      .getRepository(Customer)
      .findOne({ where: { id: customerA } });
    const customerBRepo = await dataSource
      .getRepository(Customer)
      .findOne({ where: { id: customerB } });
    expect(row?.partyNames).toContain(customerARepo!.name);
    expect(row?.partyNames).toContain(customerBRepo!.name);
  });

  it('DoD R9: findAll() batch lebih dari 3 pihak -> partyNames diringkas "N pelanggan"', async () => {
    const salesmanId = await createTestSalesman();
    const customers = await Promise.all(
      [1, 2, 3, 4].map(() => createTestCustomer()),
    );
    const invoices = await Promise.all(
      customers.map((customerId) =>
        createTestSalesInvoice({
          customerId,
          salesmanId,
          totalAmount: 1_000_000,
        }),
      ),
    );

    const result = await service.confirm(
      {
        invoiceType: PaymentInvoiceType.SALES,
        paymentDate: daysAgoIso(0),
        lines: invoices.map((inv) => ({
          invoiceId: inv.id,
          methods: [{ cashAccountId, amount: 1_000_000 }],
        })),
      },
      masterUser,
    );
    createdPaymentBatchIds.push(result.paymentBatch.id);

    const list = await service.findAll({
      invoiceType: PaymentInvoiceType.SALES,
    });
    const row = list.data.find((r) => r.id === result.paymentBatch.id);
    expect(row?.partyNames).toBe('4 pelanggan');
  });

  // --- Hari 27 FE-support: open-invoices, findAll/findOne, print-lock ------

  it('findOpenInvoicesList: mengembalikan SEMUA faktur terbuka satu pihak, tidak dibatasi jumlah', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const older = await createTestSalesInvoice({
      customerId,
      salesmanId,
      totalAmount: 1_000_000,
      invoiceDate: daysAgoIso(5),
    });
    const newer = await createTestSalesInvoice({
      customerId,
      salesmanId,
      totalAmount: 2_000_000,
      invoiceDate: daysAgoIso(1),
    });

    const result = await service.findOpenInvoicesList({
      invoiceType: PaymentInvoiceType.SALES,
      partyId: customerId,
    });

    expect(result.invoices).toHaveLength(2);
    const invoiceIds = result.invoices.map((i) => i.invoiceId);
    expect(invoiceIds).toContain(older.id);
    expect(invoiceIds).toContain(newer.id);
    const newerRow = result.invoices.find((i) => i.invoiceId === newer.id);
    expect(newerRow?.outstanding).toBe(2_000_000);
    expect(newerRow?.partyId).toBe(customerId);
  });

  it('findOpenInvoicesList: TANPA partyId -> lintas pihak, tiap baris memuat partyId+partyName sendiri', async () => {
    const salesmanId = await createTestSalesman();
    const customerA = await createTestCustomer();
    const customerB = await createTestCustomer();
    const invoiceA = await createTestSalesInvoice({
      customerId: customerA,
      salesmanId,
      totalAmount: 1_000_000,
    });
    const invoiceB = await createTestSalesInvoice({
      customerId: customerB,
      salesmanId,
      totalAmount: 2_000_000,
    });

    // limit tinggi -- DB dev/test sudah bertahun-tahun terisi faktur terbuka
    // dari sesi lain (tidak ikut dibersihkan afterAll file ini), dan default
    // limit=50 (urut invoice_date ASC lalu invoice_number ASC) bisa
    // menyisihkan faktur baru dari test ini kalau tidak diberi ruang lebih.
    const result = await service.findOpenInvoicesList({
      invoiceType: PaymentInvoiceType.SALES,
      limit: 200,
    });

    const rowA = result.invoices.find((i) => i.invoiceId === invoiceA.id);
    const rowB = result.invoices.find((i) => i.invoiceId === invoiceB.id);
    expect(rowA?.partyId).toBe(customerA);
    expect(rowB?.partyId).toBe(customerB);
    expect(rowA?.partyName).toBeTruthy();
    expect(rowB?.partyName).toBeTruthy();
    expect(rowA?.partyName).not.toBe(rowB?.partyName);
  });

  it('findOpenInvoicesList: search menyaring nomor faktur, limit membatasi jumlah baris', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const invoice = await createTestSalesInvoice({
      customerId,
      salesmanId,
      totalAmount: 500_000,
    });

    const bySearch = await service.findOpenInvoicesList({
      invoiceType: PaymentInvoiceType.SALES,
      search: invoice.invoiceNumber.slice(-6),
    });
    expect(bySearch.invoices.some((i) => i.invoiceId === invoice.id)).toBe(
      true,
    );

    const limited = await service.findOpenInvoicesList({
      invoiceType: PaymentInvoiceType.SALES,
      limit: 1,
    });
    expect(limited.invoices.length).toBeLessThanOrEqual(1);
  });

  it('confirm() dengan alokasi manual ke faktur BUKAN yang tertua -> tersimpan sesuai editan, bukan FIFO', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const older = await createTestSalesInvoice({
      customerId,
      salesmanId,
      totalAmount: 1_000_000,
      invoiceDate: daysAgoIso(5),
    });
    const newer = await createTestSalesInvoice({
      customerId,
      salesmanId,
      totalAmount: 2_000_000,
      invoiceDate: daysAgoIso(1),
    });

    // Operator sengaja membayar faktur yang LEBIH BARU dulu, melewati yang
    // lebih tua -- keputusan bisnis operator, bukan FIFO otomatis.
    const result = await service.confirm(
      {
        invoiceType: PaymentInvoiceType.SALES,
        paymentDate: daysAgoIso(0),
        lines: [
          {
            invoiceId: newer.id,
            methods: [{ cashAccountId, amount: 2_000_000 }],
          },
        ],
      },
      masterUser,
    );
    createdPaymentBatchIds.push(result.paymentBatch.id);

    expect(result.payments).toHaveLength(1);
    expect(result.payments[0].invoiceId).toBe(newer.id);

    const open = await service.findOpenInvoicesList({
      invoiceType: PaymentInvoiceType.SALES,
      partyId: customerId,
    });
    const olderRow = open.invoices.find((i) => i.invoiceId === older.id);
    expect(olderRow?.outstanding).toBe(1_000_000);
  });

  it('findAll/findOne: batch muncul di riwayat dengan party name + baris lengkap', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const invoice = await createTestSalesInvoice({
      customerId,
      salesmanId,
      totalAmount: 1_500_000,
    });
    const result = await service.confirm(
      {
        invoiceType: PaymentInvoiceType.SALES,
        paymentDate: daysAgoIso(0),
        lines: [
          {
            invoiceId: invoice.id,
            methods: [{ cashAccountId, amount: 1_500_000 }],
          },
        ],
      },
      masterUser,
    );
    createdPaymentBatchIds.push(result.paymentBatch.id);

    const list = await service.findAll({
      invoiceType: PaymentInvoiceType.SALES,
    });
    const row = list.data.find((r) => r.id === result.paymentBatch.id);
    expect(row).toBeTruthy();
    expect(row?.invoiceType).toBe(PaymentInvoiceType.SALES);

    const detail = await service.findOne(result.paymentBatch.id);
    expect(detail.methodsSummary).toHaveLength(1);
    expect(detail.methodsSummary[0].cashAccountId).toBe(cashAccountId);
    expect(detail.lines).toHaveLength(1);
    expect(detail.lines[0].invoiceNumber).toBe(invoice.invoiceNumber);
    expect(detail.lines[0].methods).toHaveLength(1);
    expect(detail.lines[0].methods[0].cashAccountId).toBe(cashAccountId);
    expect(detail.lines[0].methods[0].amount).toBe(1_500_000);
  });

  it('kunci cetak: cetak lalu VOID tanpa batal cetak -> 412; batal cetak + VOID -> sukses', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const invoice = await createTestSalesInvoice({
      customerId,
      salesmanId,
      totalAmount: 750_000,
    });
    const confirmResult = await service.confirm(
      {
        invoiceType: PaymentInvoiceType.SALES,
        paymentDate: daysAgoIso(0),
        lines: [
          {
            invoiceId: invoice.id,
            methods: [{ cashAccountId, amount: 750_000 }],
          },
        ],
      },
      masterUser,
    );
    createdPaymentBatchIds.push(confirmResult.paymentBatch.id);

    const printed = await service.registerPrint(confirmResult.paymentBatch.id);
    expect(printed.paymentBatch.printStatus).toBe('PRINTED');

    let stepUpBody: StepUpRequiredBody | undefined;
    try {
      await service.voidBatch(
        confirmResult.paymentBatch.id,
        { reasonCode: 'SALAH_INPUT', reasonNote: 'Uji kunci cetak' },
        masterUser,
        undefined,
        undefined,
      );
      throw new Error('Seharusnya melempar 412 (batal cetak dulu).');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(412);
      stepUpBody = httpErr.getResponse() as StepUpRequiredBody;
    }
    const unlockAuthorizationRequestId = stepUpBody.authorizationRequestId;

    await authorizationRequestsService.approve(
      unlockAuthorizationRequestId,
      supervisorUser,
    );

    const voidResult = await service.voidBatch(
      confirmResult.paymentBatch.id,
      { reasonCode: 'SALAH_INPUT', reasonNote: 'Uji kunci cetak' },
      masterUser,
      unlockAuthorizationRequestId,
      undefined,
    );
    expect(voidResult.paymentBatch.postingStatus).toBe('VOIDED');
  });
});
