import { BadRequestException, HttpException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../../modules/auth/types/jwt-payload.interface';
import { AuthorizationRequestsService } from '../../modules/authorization-requests/authorization-requests.service';
import { AuthorizationRequest } from '../../modules/authorization-requests/entities/authorization-request.entity';
import { StepUpRequiredBody } from '../../modules/authorization-requests/step-up-response';
import { Supplier } from '../../modules/suppliers/entities/supplier.entity';
import { User } from '../../modules/users/entities/user.entity';
import { StepUpService } from '../step-up/step-up.service';
import { PrintLockService } from './print-lock.service';

/**
 * Integration test terhadap Postgres asli, pola sama void.service.spec.ts /
 * warehouse-mutations.service.spec.ts. Sengaja BUKAN memakai
 * PurchaseInvoicesService sama sekali — PrintLockService generik lewat raw
 * SQL terhadap kontrak kolom (print-lock-tables.ts), jadi fixture di sini
 * insert langsung ke purchase_invoices tanpa menyentuh modul dokumen apa
 * pun, membuktikan mekanismenya benar-benar tidak terikat satu modul.
 */
describe('PrintLockService', () => {
  let dataSource: DataSource;
  let printLockService: PrintLockService;
  let authorizationRequestsService: AuthorizationRequestsService;

  let requesterUserId: string;
  let approverUserId: string;
  let supplierId: string;

  const createdInvoiceIds: string[] = [];
  const createdRequestIds: string[] = [];

  const requesterUser: AuthenticatedUser = {
    sub: '',
    username: 'requester',
    role: Role.OPERATOR,
  };
  const approverUser: AuthenticatedUser = {
    sub: '',
    username: 'approver',
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
      entities: [User, Supplier, AuthorizationRequest],
    });
    await dataSource.initialize();

    authorizationRequestsService = new AuthorizationRequestsService(
      dataSource.getRepository(AuthorizationRequest),
    );
    const stepUpService = new StepUpService(authorizationRequestsService);
    printLockService = new PrintLockService(dataSource, stepUpService);

    const usersRepo = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('test-password', 4);
    const suffix = Date.now();
    const requester = await usersRepo.save(
      usersRepo.create({
        username: `test_pl_requester_${suffix}`,
        passwordHash,
        fullName: 'Test PrintLock Requester',
        role: Role.OPERATOR,
        isActive: true,
      }),
    );
    requesterUserId = requester.id;
    requesterUser.sub = requesterUserId;

    const approver = await usersRepo.save(
      usersRepo.create({
        username: `test_pl_approver_${suffix}`,
        passwordHash,
        fullName: 'Test PrintLock Approver',
        role: Role.SUPERVISOR,
        isActive: true,
      }),
    );
    approverUserId = approver.id;
    approverUser.sub = approverUserId;

    const supplier = await dataSource.getRepository(Supplier).save(
      dataSource.getRepository(Supplier).create({
        displayCode: `SUP-TPL-${suffix.toString().slice(-6)}`,
        name: 'Supplier Uji PrintLock',
        isPkp: false,
        isActive: true,
      }),
    );
    supplierId = supplier.id;
  });

  afterAll(async () => {
    if (createdRequestIds.length > 0) {
      await dataSource.query(
        `DELETE FROM authorization_requests WHERE id = ANY($1)`,
        [createdRequestIds],
      );
    }
    if (createdInvoiceIds.length > 0) {
      await dataSource.query(
        `DELETE FROM purchase_invoices WHERE id = ANY($1)`,
        [createdInvoiceIds],
      );
    }
    await dataSource.query('DELETE FROM suppliers WHERE id = $1', [supplierId]);
    await dataSource.query('DELETE FROM audit_logs WHERE user_id = ANY($1)', [
      [requesterUserId, approverUserId],
    ]);
    await dataSource.query('DELETE FROM users WHERE id = ANY($1)', [
      [requesterUserId, approverUserId],
    ]);
    await dataSource.destroy();
  });

  async function createFixtureInvoice(): Promise<string> {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const rows: { id: string }[] = await dataSource.query(
      `INSERT INTO purchase_invoices
        (invoice_number, supplier_id, supplier_invoice_no, receipt_date,
         supplier_invoice_date, due_date, term_days, subtotal, total_amount, created_by)
       VALUES ($1, $2, 'SUP-INV-TPL', '2026-08-01', '2026-08-01', '2026-08-15', 14, 100000, 100000, $3)
       RETURNING id`,
      [`B1/TPL-${suffix}`, supplierId, requesterUserId],
    );
    const id = rows[0].id;
    createdInvoiceIds.push(id);
    return id;
  }

  interface PrintLockRow {
    print_status: string;
    print_count: number;
    revision_number: number;
    posting_status: string;
  }

  async function readRow(id: string): Promise<PrintLockRow> {
    const rows: PrintLockRow[] = await dataSource.query(
      `SELECT print_status, print_count, revision_number, posting_status FROM purchase_invoices WHERE id = $1`,
      [id],
    );
    return rows[0];
  }

  it('registerPrint: NOT_PRINTED -> PRINTED, print_count naik tiap panggilan, tanpa approval', async () => {
    const id = await createFixtureInvoice();

    const first = await printLockService.registerPrint({
      table: 'purchase_invoices',
      sourceType: 'PURCHASE_INVOICE',
      documentId: id,
    });
    expect(first.printCount).toBe(1);
    expect(first.printStatus).toBe('PRINTED');

    const second = await printLockService.registerPrint({
      table: 'purchase_invoices',
      sourceType: 'PURCHASE_INVOICE',
      documentId: id,
    });
    expect(second.printCount).toBe(2);

    const requests: unknown[] = await dataSource.query(
      `SELECT id FROM authorization_requests WHERE requester_id = $1`,
      [requesterUserId],
    );
    expect(requests).toHaveLength(0);
  });

  it('preflight/consume no-op kalau dokumen belum pernah dicetak — tidak ada authorization_request dibuat', async () => {
    const id = await createFixtureInvoice();

    await printLockService.preflight({
      table: 'purchase_invoices',
      sourceType: 'PURCHASE_INVOICE',
      documentId: id,
      documentLabel: 'B1/TPL-uji',
      intent: 'EDIT',
      reason: undefined,
      user: requesterUser,
      authorizationRequestId: undefined,
    });

    await dataSource.transaction((manager) =>
      printLockService.consume({
        table: 'purchase_invoices',
        sourceType: 'PURCHASE_INVOICE',
        documentId: id,
        documentLabel: 'B1/TPL-uji',
        intent: 'EDIT',
        reason: undefined,
        user: requesterUser,
        authorizationRequestId: undefined,
        manager,
      }),
    );

    const row = await readRow(id);
    expect(row.print_status).toBe('NOT_PRINTED');
    expect(row.revision_number).toBe(0);

    const requests: unknown[] = await dataSource.query(
      `SELECT id FROM authorization_requests WHERE requester_id = $1`,
      [requesterUserId],
    );
    expect(requests).toHaveLength(0);
  });

  it('preflight tanpa reason pada dokumen PRINTED -> BadRequestException (bukan 412)', async () => {
    const id = await createFixtureInvoice();
    await printLockService.registerPrint({
      table: 'purchase_invoices',
      sourceType: 'PURCHASE_INVOICE',
      documentId: id,
    });

    await expect(
      printLockService.preflight({
        table: 'purchase_invoices',
        sourceType: 'PURCHASE_INVOICE',
        documentId: id,
        documentLabel: 'B1/TPL-uji',
        intent: 'EDIT',
        reason: undefined,
        user: requesterUser,
        authorizationRequestId: undefined,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('unlock PRINTED tanpa authorizationRequestId -> 412 + PENDING authorization_request; approve+retry -> PRINT_CANCELLED, revision_number naik untuk EDIT', async () => {
    const id = await createFixtureInvoice();
    await printLockService.registerPrint({
      table: 'purchase_invoices',
      sourceType: 'PURCHASE_INVOICE',
      documentId: id,
    });

    let stepUpBody: StepUpRequiredBody | undefined;
    try {
      await printLockService.preflight({
        table: 'purchase_invoices',
        sourceType: 'PURCHASE_INVOICE',
        documentId: id,
        documentLabel: 'B1/TPL-uji',
        intent: 'EDIT',
        reason: 'salah ketik',
        user: requesterUser,
        authorizationRequestId: undefined,
      });
      throw new Error('Seharusnya melempar 412.');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(412);
      stepUpBody = httpErr.getResponse() as StepUpRequiredBody;
    }
    expect(stepUpBody?.requiresAuthorization).toBe(true);
    const authorizationRequestId = stepUpBody.authorizationRequestId;
    createdRequestIds.push(authorizationRequestId);

    const pending: { payload: Record<string, unknown>; status: string }[] =
      await dataSource.query(
        `SELECT payload, status FROM authorization_requests WHERE id = $1`,
        [authorizationRequestId],
      );
    expect(pending[0].status).toBe('PENDING');
    expect(pending[0].payload).toEqual({
      sourceType: 'PURCHASE_INVOICE',
      sourceId: id,
      intent: 'EDIT',
    });

    await authorizationRequestsService.approve(
      authorizationRequestId,
      approverUser,
    );

    await dataSource.transaction((manager) =>
      printLockService.consume({
        table: 'purchase_invoices',
        sourceType: 'PURCHASE_INVOICE',
        documentId: id,
        documentLabel: 'B1/TPL-uji',
        intent: 'EDIT',
        reason: 'salah ketik',
        user: requesterUser,
        authorizationRequestId,
        manager,
      }),
    );

    const row = await readRow(id);
    expect(row.print_status).toBe('PRINT_CANCELLED');
    expect(row.revision_number).toBe(1);
  });

  it('unlock intent VOID setelah approve+consume -> PRINT_CANCELLED, revision_number TIDAK naik', async () => {
    const id = await createFixtureInvoice();
    await printLockService.registerPrint({
      table: 'purchase_invoices',
      sourceType: 'PURCHASE_INVOICE',
      documentId: id,
    });

    let authorizationRequestId = '';
    try {
      await printLockService.preflight({
        table: 'purchase_invoices',
        sourceType: 'PURCHASE_INVOICE',
        documentId: id,
        documentLabel: 'B1/TPL-uji',
        intent: 'VOID',
        reason: 'mau batalkan',
        user: requesterUser,
        authorizationRequestId: undefined,
      });
      throw new Error('Seharusnya melempar 412.');
    } catch (err) {
      const body = (err as HttpException).getResponse() as StepUpRequiredBody;
      authorizationRequestId = body.authorizationRequestId;
      createdRequestIds.push(authorizationRequestId);
    }
    await authorizationRequestsService.approve(
      authorizationRequestId,
      approverUser,
    );

    await dataSource.transaction((manager) =>
      printLockService.consume({
        table: 'purchase_invoices',
        sourceType: 'PURCHASE_INVOICE',
        documentId: id,
        documentLabel: 'B1/TPL-uji',
        intent: 'VOID',
        reason: 'mau batalkan',
        user: requesterUser,
        authorizationRequestId,
        manager,
      }),
    );

    const row = await readRow(id);
    expect(row.print_status).toBe('PRINT_CANCELLED');
    expect(row.revision_number).toBe(0);
  });

  it('token intent EDIT dipakai untuk consume intent VOID -> payload mismatch, tetap 412 (approval tidak terkonsumsi)', async () => {
    const id = await createFixtureInvoice();
    await printLockService.registerPrint({
      table: 'purchase_invoices',
      sourceType: 'PURCHASE_INVOICE',
      documentId: id,
    });

    let authorizationRequestId = '';
    try {
      await printLockService.preflight({
        table: 'purchase_invoices',
        sourceType: 'PURCHASE_INVOICE',
        documentId: id,
        documentLabel: 'B1/TPL-uji',
        intent: 'EDIT',
        reason: 'edit dulu',
        user: requesterUser,
        authorizationRequestId: undefined,
      });
      throw new Error('Seharusnya melempar 412.');
    } catch (err) {
      const body = (err as HttpException).getResponse() as StepUpRequiredBody;
      authorizationRequestId = body.authorizationRequestId;
      createdRequestIds.push(authorizationRequestId);
    }
    await authorizationRequestsService.approve(
      authorizationRequestId,
      approverUser,
    );

    try {
      await dataSource.transaction((manager) =>
        printLockService.consume({
          table: 'purchase_invoices',
          sourceType: 'PURCHASE_INVOICE',
          documentId: id,
          documentLabel: 'B1/TPL-uji',
          intent: 'VOID',
          reason: 'coba tembus',
          user: requesterUser,
          authorizationRequestId,
          manager,
        }),
      );
      throw new Error('Seharusnya melempar 412 (payload mismatch).');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(412);
    }

    // Approval tidak terkonsumsi (masih APPROVED, bukan EXECUTED) — masih
    // bisa dipakai untuk intent yang benar-benar disetujui (EDIT).
    const stillApproved: { status: string }[] = await dataSource.query(
      `SELECT status FROM authorization_requests WHERE id = $1`,
      [authorizationRequestId],
    );
    expect(stillApproved[0].status).toBe('APPROVED');

    const row = await readRow(id);
    expect(row.print_status).toBe('PRINTED');
  });

  it('token dokumen A dipakai untuk consume dokumen B -> payload mismatch, tetap 412', async () => {
    const idA = await createFixtureInvoice();
    const idB = await createFixtureInvoice();
    await printLockService.registerPrint({
      table: 'purchase_invoices',
      sourceType: 'PURCHASE_INVOICE',
      documentId: idA,
    });
    await printLockService.registerPrint({
      table: 'purchase_invoices',
      sourceType: 'PURCHASE_INVOICE',
      documentId: idB,
    });

    let authorizationRequestId = '';
    try {
      await printLockService.preflight({
        table: 'purchase_invoices',
        sourceType: 'PURCHASE_INVOICE',
        documentId: idA,
        documentLabel: 'B1/TPL-A',
        intent: 'EDIT',
        reason: 'edit A',
        user: requesterUser,
        authorizationRequestId: undefined,
      });
      throw new Error('Seharusnya melempar 412.');
    } catch (err) {
      const body = (err as HttpException).getResponse() as StepUpRequiredBody;
      authorizationRequestId = body.authorizationRequestId;
      createdRequestIds.push(authorizationRequestId);
    }
    await authorizationRequestsService.approve(
      authorizationRequestId,
      approverUser,
    );

    try {
      await dataSource.transaction((manager) =>
        printLockService.consume({
          table: 'purchase_invoices',
          sourceType: 'PURCHASE_INVOICE',
          documentId: idB,
          documentLabel: 'B1/TPL-B',
          intent: 'EDIT',
          reason: 'coba tembus di B',
          user: requesterUser,
          authorizationRequestId,
          manager,
        }),
      );
      throw new Error('Seharusnya melempar 412 (payload mismatch).');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(412);
    }

    const rowB = await readRow(idB);
    expect(rowB.print_status).toBe('PRINTED');
  });

  it('registerPrint tetap sukses untuk dokumen VOIDED (arsip), mengembalikan postingStatus VOIDED', async () => {
    const id = await createFixtureInvoice();
    await dataSource.query(
      `UPDATE purchase_invoices SET posting_status = 'VOIDED' WHERE id = $1`,
      [id],
    );

    const result = await printLockService.registerPrint({
      table: 'purchase_invoices',
      sourceType: 'PURCHASE_INVOICE',
      documentId: id,
    });
    expect(result.printCount).toBe(1);
    expect(result.postingStatus).toBe('VOIDED');
  });
});
