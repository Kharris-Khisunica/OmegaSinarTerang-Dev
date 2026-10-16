import { randomUUID } from 'crypto';
import { HttpException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { SalesChannel } from '../../common/enums/sales-channel.enum';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { PrintLockService } from '../../core/print-lock/print-lock.service';
import { StepUpService } from '../../core/step-up/step-up.service';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { AuthorizationRequestsService } from '../authorization-requests/authorization-requests.service';
import { AuthorizationRequest } from '../authorization-requests/entities/authorization-request.entity';
import { StepUpRequiredBody } from '../authorization-requests/step-up-response';
import { Brand } from '../brands/entities/brand.entity';
import { Customer } from '../customers/entities/customer.entity';
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
import { Unit } from '../units/entities/unit.entity';
import { User } from '../users/entities/user.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { DeliveryOrdersService } from './delivery-orders.service';
import { DeliveryOrderLine } from './entities/delivery-order-line.entity';
import {
  DeliveryOrder,
  DeliveryOrderDeliveryStatus,
  DeliveryOrderPostingStatus,
  DeliveryOrderPrintStatus,
} from './entities/delivery-order.entity';

interface SeedLineInput {
  productId: string;
  unitId: string;
  qtyInput: number;
  qtyBaseUnit: number;
}

/**
 * Integration test terhadap Postgres asli, pola sama sales-returns.service.spec.ts
 * — faktur asal DISEED LANGSUNG lewat repository (bukan
 * SalesInvoicesService.create()) supaya salesChannel/postingStatus bisa
 * dikontrol presisi tanpa membangun ulang seluruh alur faktur.
 */
describe('DeliveryOrdersService', () => {
  let dataSource: DataSource;
  let productsService: ProductsService;
  let authorizationRequestsService: AuthorizationRequestsService;
  let service: DeliveryOrdersService;

  let masterUserId: string;
  let supervisorUserId: string;
  let brandId: string;
  let unitId: string;
  // Salesman yang berperan sebagai sopir pengantar/penagih (CLAUDE.md §1) --
  // SENGAJA salesman TERPISAH dari salesman faktur (createTestSalesman() per
  // test) supaya assert di bawah tidak diam-diam lolos kalau service keliru
  // memakai invoice.salesmanId, bukan dto.salesmanId, sebagai sumbernya.
  let driverSalesmanId: string;
  let vehicleId: string;

  const createdProductIds: string[] = [];
  const createdCustomerIds: string[] = [];
  const createdSalesmanIds: string[] = [];
  const createdInvoiceIds: string[] = [];
  const createdDeliveryOrderIds: string[] = [];
  const createdRequestIds: string[] = [];

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
  const supervisorUser: AuthenticatedUser = {
    sub: '',
    username: 'supervisor',
    role: Role.SUPERVISOR,
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
        Unit,
        SalesInvoice,
        SalesInvoiceLine,
        Vehicle,
        DeliveryOrder,
        DeliveryOrderLine,
        AuthorizationRequest,
      ],
    });
    await dataSource.initialize();

    productsService = new ProductsService(
      dataSource.getRepository(Product),
      dataSource.getRepository(Brand),
      dataSource,
    );
    const documentCounterService = new DocumentCounterService();
    authorizationRequestsService = new AuthorizationRequestsService(
      dataSource.getRepository(AuthorizationRequest),
    );
    const stepUpService = new StepUpService(authorizationRequestsService);
    const printLockService = new PrintLockService(dataSource, stepUpService);

    service = new DeliveryOrdersService(
      dataSource,
      dataSource.getRepository(DeliveryOrder),
      dataSource.getRepository(Salesman),
      dataSource.getRepository(Vehicle),
      documentCounterService,
      printLockService,
      stepUpService,
    );

    const suffix = Date.now();

    const usersRepo = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('test-password', 4);
    const master = await usersRepo.save(
      usersRepo.create({
        username: `test_do_master_${suffix}`,
        passwordHash,
        fullName: 'Test DeliveryOrders Master',
        role: Role.MASTER,
        isActive: true,
      }),
    );
    masterUserId = master.id;
    masterUser.sub = masterUserId;

    const operator = await usersRepo.save(
      usersRepo.create({
        username: `test_do_operator_${suffix}`,
        passwordHash,
        fullName: 'Test DeliveryOrders Operator',
        role: Role.OPERATOR,
        isActive: true,
      }),
    );
    operatorUser.sub = operator.id;

    const supervisor = await usersRepo.save(
      usersRepo.create({
        username: `test_do_supervisor_${suffix}`,
        passwordHash,
        fullName: 'Test DeliveryOrders Supervisor',
        role: Role.SUPERVISOR,
        isActive: true,
      }),
    );
    supervisorUserId = supervisor.id;
    supervisorUser.sub = supervisorUserId;

    const brandsRepo = dataSource.getRepository(Brand);
    const brand = await brandsRepo.save(
      brandsRepo.create({
        code: `TDO-${suffix.toString().slice(-8)}`,
        name: 'Merek Uji Surat Jalan',
        isActive: true,
      }),
    );
    brandId = brand.id;

    const unitsRepo = dataSource.getRepository(Unit);
    const pcsUnit = await unitsRepo.save(
      unitsRepo.create({
        code: `PCS-TDO-${suffix.toString().slice(-6)}`,
        name: 'PCS',
        isActive: true,
      }),
    );
    unitId = pcsUnit.id;

    const driverSalesmanRepo = dataSource.getRepository(Salesman);
    const driverSalesman = await driverSalesmanRepo.save(
      driverSalesmanRepo.create({
        code: `SLM-TDO-DRV-${suffix.toString().slice(-6)}`,
        name: 'Sopir Uji',
        isActive: true,
      }),
    );
    driverSalesmanId = driverSalesman.id;

    const vehiclesRepo = dataSource.getRepository(Vehicle);
    const vehicle = await vehiclesRepo.save(
      vehiclesRepo.create({
        code: `KND-TDO-${suffix.toString().slice(-6)}`,
        name: 'B 1234 XY - Truk Uji',
        isActive: true,
      }),
    );
    vehicleId = vehicle.id;
  });

  afterAll(async () => {
    if (createdDeliveryOrderIds.length > 0) {
      await dataSource.query(
        `DELETE FROM delivery_order_lines WHERE delivery_order_id = ANY($1)`,
        [createdDeliveryOrderIds],
      );
      await dataSource.query(`DELETE FROM delivery_orders WHERE id = ANY($1)`, [
        createdDeliveryOrderIds,
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
    await dataSource.query(`DELETE FROM vehicles WHERE id = $1`, [vehicleId]);
    await dataSource.query(`DELETE FROM salesmen WHERE id = $1`, [
      driverSalesmanId,
    ]);
    await dataSource.query(`DELETE FROM units WHERE id = $1`, [unitId]);
    await dataSource.query(`DELETE FROM brands WHERE id = $1`, [brandId]);
    if (createdRequestIds.length > 0) {
      await dataSource.query(
        `DELETE FROM authorization_requests WHERE id = ANY($1)`,
        [createdRequestIds],
      );
    }
    await dataSource.query('DELETE FROM audit_logs WHERE user_id = ANY($1)', [
      [masterUserId, operatorUser.sub, supervisorUserId],
    ]);
    await dataSource.query('DELETE FROM users WHERE id = ANY($1)', [
      [masterUserId, operatorUser.sub, supervisorUserId],
    ]);
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
        code: `CUST-TDO-${suffix}`,
        name: `Pelanggan Uji Surat Jalan ${suffix}`,
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
        code: `SLM-TDO-${suffix}`,
        name: `Salesman Uji ${suffix}`,
        isActive: true,
      }),
    );
    createdSalesmanIds.push(salesman.id);
    return salesman.id;
  }

  async function seedInvoice(params: {
    customerId: string;
    salesmanId: string;
    salesChannel: SalesChannel;
    postingStatus?: SalesInvoicePostingStatus;
    lines: SeedLineInput[];
  }): Promise<{ invoice: SalesInvoice; lines: SalesInvoiceLine[] }> {
    const invoiceDate = daysAgoIso(0);
    const invoicesRepo = dataSource.getRepository(SalesInvoice);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const invoice = await invoicesRepo.save(
      invoicesRepo.create({
        invoiceNumber: `JL/TDO-${suffix}`,
        invoiceDate,
        customerId: params.customerId,
        salesChannel: params.salesChannel,
        salesOrderId: null,
        salesmanId: params.salesmanId,
        termDays: 0,
        dueDate: invoiceDate,
        subtotal: '100000.00',
        lineDiscountTotal: '0.00',
        invoiceDiscountAmount: '0.00',
        invoiceDiscountPercent: null,
        outputVatAmount: '0.00',
        totalAmount: '100000.00',
        postingStatus: params.postingStatus ?? SalesInvoicePostingStatus.POSTED,
        printStatus: SalesInvoicePrintStatus.NOT_PRINTED,
        reviewStatus: SalesInvoiceReviewStatus.BELUM_DICEK,
        createdBy: masterUserId,
      }),
    );
    createdInvoiceIds.push(invoice.id);

    const linesRepo = dataSource.getRepository(SalesInvoiceLine);
    const savedLines: SalesInvoiceLine[] = [];
    for (let i = 0; i < params.lines.length; i++) {
      const l = params.lines[i];
      const saved = await linesRepo.save(
        linesRepo.create({
          salesInvoiceId: invoice.id,
          customerId: params.customerId,
          lineOrder: i + 1,
          productId: l.productId,
          unitId: l.unitId,
          qtyInput: l.qtyInput.toFixed(4),
          qtyBaseUnit: l.qtyBaseUnit.toFixed(4),
          unitPrice: '10000.00',
          discountAmount: '0.00',
          grossAmount: (l.qtyInput * 10000).toFixed(2),
          netAmount: (l.qtyInput * 10000).toFixed(2),
          unitCostFifo: '5000.0000',
        }),
      );
      savedLines.push(saved);
    }
    return { invoice, lines: savedLines };
  }

  it('faktur tidak ditemukan -> ditolak', async () => {
    await expect(
      service.create(
        {
          salesInvoiceId: randomUUID(),
          deliveryDate: daysAgoIso(0),
          salesmanId: driverSalesmanId,
          vehicleId,
        },
        masterUser,
      ),
    ).rejects.toThrow(/tidak ditemukan/i);
  });

  it('faktur bersaluran TOKO -> ditolak, tidak bisa dibuatkan surat jalan', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Toko');
    const { invoice } = await seedInvoice({
      customerId,
      salesmanId,
      salesChannel: SalesChannel.TOKO,
      lines: [{ productId, unitId, qtyInput: 5, qtyBaseUnit: 5 }],
    });

    await expect(
      service.create(
        {
          salesInvoiceId: invoice.id,
          deliveryDate: daysAgoIso(0),
          salesmanId: driverSalesmanId,
          vehicleId,
        },
        masterUser,
      ),
    ).rejects.toThrow(/TOKO tidak bisa dibuatkan surat jalan/i);
  });

  it('faktur bersaluran PENGIRIMAN sudah VOID -> ditolak', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Voided');
    const { invoice } = await seedInvoice({
      customerId,
      salesmanId,
      salesChannel: SalesChannel.PENGIRIMAN,
      postingStatus: SalesInvoicePostingStatus.VOIDED,
      lines: [{ productId, unitId, qtyInput: 5, qtyBaseUnit: 5 }],
    });

    await expect(
      service.create(
        {
          salesInvoiceId: invoice.id,
          deliveryDate: daysAgoIso(0),
          salesmanId: driverSalesmanId,
          vehicleId,
        },
        masterUser,
      ),
    ).rejects.toThrow(/dibatalkan/i);
  });

  it('faktur PENGIRIMAN -> surat jalan terbentuk, membawa salesman_id/vehicle_id, nomor format baku SJ/RM01-YYMMXXXX', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const productA = await createTestProduct('Produk SJ A');
    const productB = await createTestProduct('Produk SJ B');
    const { invoice, lines } = await seedInvoice({
      customerId,
      salesmanId,
      salesChannel: SalesChannel.PENGIRIMAN,
      lines: [
        { productId: productA, unitId, qtyInput: 3, qtyBaseUnit: 3 },
        { productId: productB, unitId, qtyInput: 7, qtyBaseUnit: 7 },
      ],
    });

    const result = await service.create(
      {
        salesInvoiceId: invoice.id,
        deliveryDate: daysAgoIso(0),
        salesmanId: driverSalesmanId,
        vehicleId,
        notes: 'Uji surat jalan',
      },
      masterUser,
    );
    createdDeliveryOrderIds.push(result.deliveryOrder.id);

    expect(result.deliveryOrder.salesmanId).toBe(driverSalesmanId);
    expect(result.deliveryOrder.vehicleId).toBe(vehicleId);
    expect(result.deliveryOrder.customerId).toBe(customerId);
    expect(result.deliveryOrder.deliveryNumber).toMatch(
      /^SJ\/[A-Z0-9]+-\d{4}\d{4}$/,
    );
    expect(result.lines).toHaveLength(2);
    expect(result.lines.map((l) => l.productId).sort()).toEqual(
      [productA, productB].sort(),
    );
    expect(
      result.lines.find((l) => l.salesInvoiceLineId === lines[0].id),
    ).toBeDefined();
  });

  it('faktur yang sudah punya surat jalan aktif -> ditolak dibuatkan surat jalan kedua', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk SJ Dobel');
    const { invoice } = await seedInvoice({
      customerId,
      salesmanId,
      salesChannel: SalesChannel.PENGIRIMAN,
      lines: [{ productId, unitId, qtyInput: 2, qtyBaseUnit: 2 }],
    });

    const first = await service.create(
      {
        salesInvoiceId: invoice.id,
        deliveryDate: daysAgoIso(0),
        salesmanId: driverSalesmanId,
        vehicleId,
      },
      masterUser,
    );
    createdDeliveryOrderIds.push(first.deliveryOrder.id);

    await expect(
      service.create(
        {
          salesInvoiceId: invoice.id,
          deliveryDate: daysAgoIso(0),
          salesmanId: driverSalesmanId,
          vehicleId,
        },
        masterUser,
      ),
    ).rejects.toThrow(/sudah punya surat jalan aktif/i);
  });

  it('salesman/vehicle tidak ditemukan -> ditolak', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Salesman Invalid');
    const { invoice } = await seedInvoice({
      customerId,
      salesmanId,
      salesChannel: SalesChannel.PENGIRIMAN,
      lines: [{ productId, unitId, qtyInput: 2, qtyBaseUnit: 2 }],
    });

    await expect(
      service.create(
        {
          salesInvoiceId: invoice.id,
          deliveryDate: daysAgoIso(0),
          salesmanId: randomUUID(),
          vehicleId,
        },
        masterUser,
      ),
    ).rejects.toThrow(/Salesman tidak ditemukan/i);

    await expect(
      service.create(
        {
          salesInvoiceId: invoice.id,
          deliveryDate: daysAgoIso(0),
          salesmanId: driverSalesmanId,
          vehicleId: randomUUID(),
        },
        masterUser,
      ),
    ).rejects.toThrow(/Kendaraan tidak ditemukan/i);
  });

  it('registerPrint(): cetak ulang bebas, print_count naik tanpa approval', async () => {
    const customerId = await createTestCustomer();
    const salesmanId = await createTestSalesman();
    const productId = await createTestProduct('Produk Cetak SJ');
    const { invoice } = await seedInvoice({
      customerId,
      salesmanId,
      salesChannel: SalesChannel.PENGIRIMAN,
      lines: [{ productId, unitId, qtyInput: 2, qtyBaseUnit: 2 }],
    });

    const result = await service.create(
      {
        salesInvoiceId: invoice.id,
        deliveryDate: daysAgoIso(0),
        salesmanId: driverSalesmanId,
        vehicleId,
      },
      masterUser,
    );
    createdDeliveryOrderIds.push(result.deliveryOrder.id);

    const first = await service.registerPrint(result.deliveryOrder.id);
    expect(first.printCount).toBe(1);
    const second = await service.registerPrint(result.deliveryOrder.id);
    expect(second.printCount).toBe(2);
  });

  describe('updateStatus() bebas kunci cetak + VOID SJ (need_fixing.md #18)', () => {
    async function createSimpleDeliveryOrder(): Promise<DeliveryOrder> {
      const customerId = await createTestCustomer();
      const salesmanId = await createTestSalesman();
      const productId = await createTestProduct('Produk Status SJ');
      const { invoice } = await seedInvoice({
        customerId,
        salesmanId,
        salesChannel: SalesChannel.PENGIRIMAN,
        lines: [{ productId, unitId, qtyInput: 2, qtyBaseUnit: 2 }],
      });
      const result = await service.create(
        {
          salesInvoiceId: invoice.id,
          deliveryDate: daysAgoIso(0),
          salesmanId: driverSalesmanId,
          vehicleId,
        },
        masterUser,
      );
      createdDeliveryOrderIds.push(result.deliveryOrder.id);
      return result.deliveryOrder;
    }

    it('status berubah sebelum dicetak: langsung sukses, tidak membuat authorization_request', async () => {
      const deliveryOrder = await createSimpleDeliveryOrder();

      const updated = await service.updateStatus(deliveryOrder.id, {
        deliveryStatus: DeliveryOrderDeliveryStatus.POSTPONED,
      });
      expect(updated.deliveryStatus).toBe(
        DeliveryOrderDeliveryStatus.POSTPONED,
      );
      expect(updated.printStatus).toBe(DeliveryOrderPrintStatus.NOT_PRINTED);

      const requests: unknown[] = await dataSource.query(
        `SELECT id FROM authorization_requests WHERE requester_id = $1`,
        [masterUserId],
      );
      expect(requests).toHaveLength(0);
    });

    it('edit status setelah dicetak -> langsung sukses TANPA approval; printStatus tetap PRINTED, revisionNumber tidak naik', async () => {
      const deliveryOrder = await createSimpleDeliveryOrder();
      await service.registerPrint(deliveryOrder.id);

      const updated = await service.updateStatus(deliveryOrder.id, {
        deliveryStatus: DeliveryOrderDeliveryStatus.RETURNED,
      });
      expect(updated.deliveryStatus).toBe(DeliveryOrderDeliveryStatus.RETURNED);
      expect(updated.printStatus).toBe(DeliveryOrderPrintStatus.PRINTED);
      expect(updated.revisionNumber).toBe(0);

      const requests: unknown[] = await dataSource.query(
        `SELECT id FROM authorization_requests WHERE payload->>'sourceId' = $1`,
        [deliveryOrder.id],
      );
      expect(requests).toHaveLength(0);
    });

    async function approveStepUp(
      promise: Promise<unknown>,
      expectedActionType: string,
    ): Promise<string> {
      let body: StepUpRequiredBody | undefined;
      try {
        await promise;
        throw new Error('Seharusnya melempar 412.');
      } catch (err) {
        expect(err).toBeInstanceOf(HttpException);
        expect((err as HttpException).getStatus()).toBe(412);
        body = (err as HttpException).getResponse() as StepUpRequiredBody;
      }
      const requestId = body.authorizationRequestId;
      createdRequestIds.push(requestId);
      const rows: { action_type: string }[] = await dataSource.query(
        `SELECT action_type FROM authorization_requests WHERE id = $1`,
        [requestId],
      );
      expect(rows[0]?.action_type).toBe(expectedActionType);
      await authorizationRequestsService.approve(requestId, supervisorUser);
      return requestId;
    }

    const voidDto = {
      reasonCode: 'SALAH_INPUT',
      reasonNote: 'SJ salah kendaraan',
    };

    it('VOID SJ oleh MASTER belum dicetak -> langsung VOIDED; faktur asal boleh dibuatkan SJ baru', async () => {
      const deliveryOrder = await createSimpleDeliveryOrder();
      const voided = await service.voidDeliveryOrder(
        deliveryOrder.id,
        voidDto,
        masterUser,
        undefined,
      );
      expect(voided.postingStatus).toBe(DeliveryOrderPostingStatus.VOIDED);
      expect(voided.voidReasonCode).toBe('SALAH_INPUT');

      const again = await service.create(
        {
          salesInvoiceId: deliveryOrder.salesInvoiceId,
          deliveryDate: daysAgoIso(0),
          salesmanId: driverSalesmanId,
          vehicleId,
        },
        masterUser,
      );
      createdDeliveryOrderIds.push(again.deliveryOrder.id);
      expect(again.deliveryOrder.postingStatus).toBe(
        DeliveryOrderPostingStatus.POSTED,
      );

      await expect(
        service.updateStatus(deliveryOrder.id, {
          deliveryStatus: DeliveryOrderDeliveryStatus.DELIVERED,
        }),
      ).rejects.toThrow(/sudah VOID/i);
      await expect(
        service.voidDeliveryOrder(
          deliveryOrder.id,
          voidDto,
          masterUser,
          undefined,
        ),
      ).rejects.toThrow(/sudah pernah di-VOID/i);
    });

    it('VOID SJ oleh OPERATOR belum dicetak -> 412 VOID_DOCUMENT; approve + retry -> VOIDED', async () => {
      const deliveryOrder = await createSimpleDeliveryOrder();
      const voidRequestId = await approveStepUp(
        service.voidDeliveryOrder(
          deliveryOrder.id,
          voidDto,
          operatorUser,
          undefined,
        ),
        'VOID_DOCUMENT',
      );
      const voided = await service.voidDeliveryOrder(
        deliveryOrder.id,
        voidDto,
        operatorUser,
        undefined,
        voidRequestId,
      );
      expect(voided.postingStatus).toBe(DeliveryOrderPostingStatus.VOIDED);
    });

    it('VOID SJ oleh OPERATOR sudah dicetak -> 412 UNLOCK_PRINT, lalu 412 VOID_DOCUMENT, lalu VOIDED (PRINT_CANCELLED)', async () => {
      const deliveryOrder = await createSimpleDeliveryOrder();
      await service.registerPrint(deliveryOrder.id);

      const printRequestId = await approveStepUp(
        service.voidDeliveryOrder(
          deliveryOrder.id,
          voidDto,
          operatorUser,
          undefined,
        ),
        'UNLOCK_PRINT',
      );
      const voidRequestId = await approveStepUp(
        service.voidDeliveryOrder(
          deliveryOrder.id,
          voidDto,
          operatorUser,
          printRequestId,
        ),
        'VOID_DOCUMENT',
      );
      const voided = await service.voidDeliveryOrder(
        deliveryOrder.id,
        voidDto,
        operatorUser,
        printRequestId,
        voidRequestId,
      );
      expect(voided.postingStatus).toBe(DeliveryOrderPostingStatus.VOIDED);
      expect(voided.printStatus).toBe(DeliveryOrderPrintStatus.PRINT_CANCELLED);
    });

    it('daftar "belum terkirim" (?deliveryStatus=POSTPONED) menampilkan SJ ber-status POSTPONED, tidak menampilkan yang lain', async () => {
      const postponed = await createSimpleDeliveryOrder();
      await service.updateStatus(postponed.id, {
        deliveryStatus: DeliveryOrderDeliveryStatus.POSTPONED,
      });
      const delivered = await createSimpleDeliveryOrder();
      await service.updateStatus(delivered.id, {
        deliveryStatus: DeliveryOrderDeliveryStatus.DELIVERED,
      });

      const result = await service.findAll({
        deliveryStatus: DeliveryOrderDeliveryStatus.POSTPONED,
        page: 1,
        limit: 50,
      });
      const ids = result.data.map((d) => d.id);
      expect(ids).toContain(postponed.id);
      expect(ids).not.toContain(delivered.id);
    });
  });
});
