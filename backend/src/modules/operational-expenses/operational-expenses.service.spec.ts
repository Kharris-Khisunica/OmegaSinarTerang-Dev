import { HttpException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { AccountResolverService } from '../../core/account-resolver/account-resolver.service';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { JournalPosterService } from '../../core/journal-poster/journal-poster.service';
import { PeriodLockValidatorService } from '../../core/period-lock/period-lock-validator.service';
import { StepUpService } from '../../core/step-up/step-up.service';
import { StockRecorderService } from '../../core/stock-recorder/stock-recorder.service';
import { VoidEngineService } from '../../core/void/void.service';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { AuthorizationRequestsService } from '../authorization-requests/authorization-requests.service';
import { AuthorizationRequest } from '../authorization-requests/entities/authorization-request.entity';
import { StepUpRequiredBody } from '../authorization-requests/step-up-response';
import { Brand } from '../brands/entities/brand.entity';
import {
  AccountSubtype,
  AccountType,
  ChartOfAccount,
  NormalBalance,
} from '../chart-of-accounts/entities/chart-of-account.entity';
import { JournalEntryLine } from '../journal-entries/entities/journal-entry-line.entity';
import { JournalEntry } from '../journal-entries/entities/journal-entry.entity';
import { ProductUnitConversion } from '../products/entities/product-unit-conversion.entity';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { StockCostConsumption } from '../stock/entities/stock-cost-consumption.entity';
import { StockCostLot } from '../stock/entities/stock-cost-lot.entity';
import { StockMovement } from '../stock/entities/stock-movement.entity';
import { User } from '../users/entities/user.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { Worker } from '../workers/entities/worker.entity';
import { CreateOperationalExpenseBatchDto } from './dto/create-operational-expense-batch.dto';
import { CreateOperationalExpenseLineDto } from './dto/create-operational-expense-line.dto';
import { UpdateOperationalExpenseLineDto } from './dto/update-operational-expense-line.dto';
import {
  OperationalExpenseDocument,
  OperationalExpenseDocumentReviewStatus,
} from './entities/operational-expense-document.entity';
import {
  OperationalExpenseLine,
  OperationalExpenseLinePostingStatus,
} from './entities/operational-expense-line.entity';
import { OperationalExpenseVoidHook } from './operational-expense-void.hook';
import { OperationalExpensesService } from './operational-expenses.service';

/**
 * Integration test terhadap Postgres asli (Hari 17), pola sama
 * warehouse-mutations.service.spec.ts (step-up dual-call) +
 * purchase-invoices.service.spec.ts (VoidEngineService + hook manual
 * onModuleInit()) — semua service dikonstruksi manual lewat `new` (bypass
 * Nest DI).
 */
describe('OperationalExpensesService', () => {
  let dataSource: DataSource;
  let journalPosterService: JournalPosterService;
  let authorizationRequestsService: AuthorizationRequestsService;
  let service: OperationalExpensesService;

  let masterUserId: string;
  let operatorUserId: string;
  let supervisorUserId: string;
  let flaggedCashAccountId: string;
  let unflaggedCashAccountId: string;
  let expenseAccountId: string;
  let restrictedExpenseAccountId: string;
  let headerExpenseAccountId: string;
  let receivableAccountId: string;
  let inventoryAccountId: string;
  let employeeReceivableAccountId: string;
  let workerId: string;

  const createdDocumentIds: string[] = [];
  const createdLineIds: string[] = [];
  const createdAccountIds: string[] = [];
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
        Warehouse,
        ChartOfAccount,
        JournalEntry,
        JournalEntryLine,
        StockMovement,
        StockCostLot,
        StockCostConsumption,
        AuthorizationRequest,
        OperationalExpenseDocument,
        OperationalExpenseLine,
        Worker,
        Vehicle,
      ],
    });
    await dataSource.initialize();

    const productsService = new ProductsService(
      dataSource.getRepository(Product),
      dataSource.getRepository(Brand),
      dataSource,
    );
    const stockRecorderService = new StockRecorderService(
      dataSource,
      productsService,
    );
    const documentCounterService = new DocumentCounterService();
    const periodLockValidatorService = new PeriodLockValidatorService();
    journalPosterService = new JournalPosterService(
      documentCounterService,
      periodLockValidatorService,
    );
    const accountResolverService = new AccountResolverService(dataSource);
    authorizationRequestsService = new AuthorizationRequestsService(
      dataSource.getRepository(AuthorizationRequest),
    );
    const stepUpService = new StepUpService(authorizationRequestsService);
    const voidEngineService = new VoidEngineService(
      journalPosterService,
      stockRecorderService,
    );
    const voidHook = new OperationalExpenseVoidHook(voidEngineService);
    voidHook.onModuleInit();

    service = new OperationalExpensesService(
      dataSource,
      dataSource.getRepository(OperationalExpenseDocument),
      dataSource.getRepository(OperationalExpenseLine),
      dataSource.getRepository(ChartOfAccount),
      dataSource.getRepository(Worker),
      dataSource.getRepository(Vehicle),
      documentCounterService,
      journalPosterService,
      accountResolverService,
      stepUpService,
      voidEngineService,
    );

    const suffix = Date.now();
    const usersRepo = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('test-password', 4);

    const master = await usersRepo.save(
      usersRepo.create({
        username: `test_oe_master_${suffix}`,
        passwordHash,
        fullName: 'Test OperationalExpenses Master',
        role: Role.MASTER,
        isActive: true,
      }),
    );
    masterUserId = master.id;
    masterUser.sub = masterUserId;

    const operator = await usersRepo.save(
      usersRepo.create({
        username: `test_oe_operator_${suffix}`,
        passwordHash,
        fullName: 'Test OperationalExpenses Operator',
        role: Role.OPERATOR,
        isActive: true,
      }),
    );
    operatorUserId = operator.id;
    operatorUser.sub = operatorUserId;

    const supervisor = await usersRepo.save(
      usersRepo.create({
        username: `test_oe_supervisor_${suffix}`,
        passwordHash,
        fullName: 'Test OperationalExpenses Supervisor',
        role: Role.SUPERVISOR,
        isActive: true,
      }),
    );
    supervisorUserId = supervisor.id;
    supervisorUser.sub = supervisorUserId;

    const coaRepo = dataSource.getRepository(ChartOfAccount);
    const flaggedCash = await coaRepo.save(
      coaRepo.create({
        code: `KASBSR-TOE-${suffix.toString().slice(-8)}`,
        name: 'Kas Besar Uji',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.CURRENT_ASSET,
        isCashAccount: true,
        requiresOutflowApproval: true,
        isActive: true,
      }),
    );
    flaggedCashAccountId = flaggedCash.id;
    createdAccountIds.push(flaggedCashAccountId);

    const unflaggedCash = await coaRepo.save(
      coaRepo.create({
        code: `KASKCL-TOE-${suffix.toString().slice(-8)}`,
        name: 'Kas Kecil Uji',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.CURRENT_ASSET,
        isCashAccount: true,
        requiresOutflowApproval: false,
        isActive: true,
      }),
    );
    unflaggedCashAccountId = unflaggedCash.id;
    createdAccountIds.push(unflaggedCashAccountId);

    const expenseAccount = await coaRepo.save(
      coaRepo.create({
        code: `BIAYA-TOE-${suffix.toString().slice(-8)}`,
        name: 'Biaya Uji Operasional',
        accountType: AccountType.EXPENSE,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.ADMIN_EXPENSE,
        isActive: true,
      }),
    );
    expenseAccountId = expenseAccount.id;
    createdAccountIds.push(expenseAccountId);

    const restrictedExpenseAccount = await coaRepo.save(
      coaRepo.create({
        code: `BRSTR-TOE-${suffix.toString().slice(-8)}`,
        name: 'Biaya Uji Restricted Master',
        accountType: AccountType.EXPENSE,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.ADMIN_EXPENSE,
        isActive: true,
        restrictedToMaster: true,
      }),
    );
    restrictedExpenseAccountId = restrictedExpenseAccount.id;
    createdAccountIds.push(restrictedExpenseAccountId);

    const headerExpenseAccount = await coaRepo.save(
      coaRepo.create({
        code: `BHDR-TOE-${suffix.toString().slice(-8)}`,
        name: 'Header Biaya Uji (bukan is_postable)',
        accountType: AccountType.EXPENSE,
        normalBalance: NormalBalance.DEBIT,
        accountSubtype: AccountSubtype.ADMIN_EXPENSE,
        isActive: true,
        isPostable: false,
      }),
    );
    headerExpenseAccountId = headerExpenseAccount.id;
    createdAccountIds.push(headerExpenseAccountId);

    receivableAccountId = await accountResolverService.resolveSingleActive(
      'is_receivable_account = true',
      'Piutang Usaha',
    );
    inventoryAccountId = await accountResolverService.resolveSingleActive(
      'is_inventory_account = true',
      'Persediaan',
    );
    employeeReceivableAccountId =
      await accountResolverService.resolveSingleActive(
        'is_employee_receivable_account = true',
        'Piutang Karyawan',
      );
    const workerRows: { id: string }[] = await dataSource.query(
      `SELECT id FROM workers WHERE code = 'PKR-001' LIMIT 1`,
    );
    workerId = workerRows[0].id;

    // Ambang uji Rp 500.000 — dipulihkan ke default migration (0) di afterAll.
    await dataSource.query(
      `UPDATE settings SET value = '500000' WHERE key = 'cash_outflow_approval_threshold'`,
    );
  });

  afterAll(async () => {
    await dataSource.query(
      `UPDATE settings SET value = '0' WHERE key = 'cash_outflow_approval_threshold'`,
    );

    if (createdRequestIds.length > 0) {
      await dataSource.query(
        `DELETE FROM authorization_requests WHERE id = ANY($1)`,
        [createdRequestIds],
      );
    }
    if (createdLineIds.length > 0) {
      // VOID menulis reversal ber-reversed_entry_id menunjuk entry asli
      // (self-FK) — anak dulu, baru induk (pola sama purchase-invoices spec).
      await dataSource.query(
        `DELETE FROM journal_entry_lines WHERE journal_entry_id IN (
           SELECT id FROM journal_entries WHERE source_type = 'OPERATIONAL_EXPENSE' AND source_id = ANY($1)
           UNION
           SELECT id FROM journal_entries WHERE reversed_entry_id IN (
             SELECT id FROM journal_entries WHERE source_type = 'OPERATIONAL_EXPENSE' AND source_id = ANY($1)
           )
         )`,
        [createdLineIds],
      );
      await dataSource.query(
        `DELETE FROM journal_entries WHERE reversed_entry_id IN (
           SELECT id FROM journal_entries WHERE source_type = 'OPERATIONAL_EXPENSE' AND source_id = ANY($1)
         )`,
        [createdLineIds],
      );
      await dataSource.query(
        `DELETE FROM journal_entries WHERE source_type = 'OPERATIONAL_EXPENSE' AND source_id = ANY($1)`,
        [createdLineIds],
      );
      await dataSource.query(
        `DELETE FROM operational_expense_lines WHERE id = ANY($1)`,
        [createdLineIds],
      );
    }
    if (createdDocumentIds.length > 0) {
      await dataSource.query(
        `DELETE FROM operational_expense_lines WHERE document_id = ANY($1)`,
        [createdDocumentIds],
      );
      await dataSource.query(
        `DELETE FROM operational_expense_documents WHERE id = ANY($1)`,
        [createdDocumentIds],
      );
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

  function isoTodayMinus(days: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  }

  // node-postgres mem-parse kolom `date` sebagai tengah malam LOKAL (bukan
  // UTC) sebelum membungkusnya jadi objek Date — dipakai untuk mem-format
  // balik nilai DATE hasil raw query supaya cocok dengan string yang
  // ditulis (toDateOnlyString() di JournalPosterService, yang UTC-based).
  function toLocalDateOnlyString(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function trackResult(result: {
    document: OperationalExpenseDocument;
    line: OperationalExpenseLine;
  }): void {
    if (!createdDocumentIds.includes(result.document.id)) {
      createdDocumentIds.push(result.document.id);
    }
    createdLineIds.push(result.line.id);
  }

  it('baris di bawah ambang dari akun kas bertanda requiresOutflowApproval -> sukses langsung, jurnal balance Biaya(D)/Kas(K)', async () => {
    const dto: CreateOperationalExpenseLineDto = {
      expenseDate: isoTodayMinus(0),
      cashAccountId: flaggedCashAccountId,
      expenseAccountId,
      amount: 300000, // < ambang 500.000
      description: 'Parkir uji',
    };

    const result = await service.createLine(dto, operatorUser, undefined);
    trackResult(result);

    expect(result.document.documentNumber).toMatch(/^KK\/[^/]+-\d{8}$/);
    const lines = result.journalEntry.lines;
    expect(lines).toHaveLength(2);
    const debitLine = lines.find((l) => l.accountId === expenseAccountId);
    const creditLine = lines.find((l) => l.accountId === flaggedCashAccountId);
    expect(Number(debitLine!.debitAmount)).toBe(300000);
    expect(Number(creditLine!.creditAmount)).toBe(300000);
    const totalDebit = lines.reduce((s, l) => s + Number(l.debitAmount), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.creditAmount), 0);
    expect(totalDebit).toBe(totalCredit);
  });

  it('baris di atas ambang dari akun bertanda -> 412 dengan context_summary memuat nama akun+nominal; approve + retry -> sukses, jurnal balance', async () => {
    const dto: CreateOperationalExpenseLineDto = {
      expenseDate: isoTodayMinus(0),
      cashAccountId: flaggedCashAccountId,
      expenseAccountId,
      amount: 1000000, // > ambang 500.000
      description: 'Gaji Mang Icung',
    };

    let stepUpBody: StepUpRequiredBody | undefined;
    try {
      await service.createLine(dto, operatorUser, undefined);
      throw new Error('Seharusnya melempar 412 sebelum approval.');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(412);
      stepUpBody = httpErr.getResponse() as StepUpRequiredBody;
    }
    expect(stepUpBody?.requiresAuthorization).toBe(true);
    const authorizationRequestId = stepUpBody.authorizationRequestId;
    createdRequestIds.push(authorizationRequestId);

    const pending = await dataSource
      .getRepository(AuthorizationRequest)
      .findOneOrFail({ where: { id: authorizationRequestId } });
    expect(pending.contextSummary).toContain('Kas Besar Uji');
    expect(pending.contextSummary).toContain('1.000.000');

    await authorizationRequestsService.approve(
      authorizationRequestId,
      supervisorUser,
    );

    const result = await service.createLine(
      dto,
      operatorUser,
      authorizationRequestId,
    );
    trackResult(result);

    const lines = result.journalEntry.lines;
    const totalDebit = lines.reduce((s, l) => s + Number(l.debitAmount), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.creditAmount), 0);
    expect(totalDebit).toBe(totalCredit);
    expect(totalDebit).toBe(1000000);
  });

  it('baris di atas ambang dari akun kas TIDAK bertanda -> sukses langsung (kontrol tidur)', async () => {
    const dto: CreateOperationalExpenseLineDto = {
      expenseDate: isoTodayMinus(1),
      cashAccountId: unflaggedCashAccountId,
      expenseAccountId,
      amount: 2000000, // jauh di atas ambang, tapi akun tidak dicentang
      description: 'Sewa uji',
    };

    const result = await service.createLine(dto, operatorUser, undefined);
    trackResult(result);

    expect(Number(result.line.amount)).toBe(2000000);
  });

  it('VOID satu baris -> jurnal pembalik bertanggal HARI INI (bukan expenseDate asli), baris asli tetap ada, posting_status jadi VOIDED; baris lain di header sama tidak ikut ter-VOID', async () => {
    const expenseDate = isoTodayMinus(2);
    const dtoA: CreateOperationalExpenseLineDto = {
      expenseDate,
      cashAccountId: unflaggedCashAccountId,
      expenseAccountId,
      amount: 50000,
      description: 'Baris A',
    };
    const dtoB: CreateOperationalExpenseLineDto = {
      expenseDate,
      cashAccountId: unflaggedCashAccountId,
      expenseAccountId,
      amount: 75000,
      description: 'Baris B',
    };

    const resultA = await service.createLine(dtoA, operatorUser, undefined);
    trackResult(resultA);
    const resultB = await service.createLine(dtoB, operatorUser, undefined);
    trackResult(resultB);

    expect(resultA.document.id).toBe(resultB.document.id);
    expect(resultB.line.lineOrder).toBe(resultA.line.lineOrder + 1);

    // Diambil TEPAT sebelum voidLine() (yang menulis entryDate: new Date()
    // di dalamnya) supaya perbandingan tidak rentan meleset kalau test ini
    // kebetulan berjalan pas melewati batas hari UTC.
    const referenceToday = isoTodayMinus(0);
    const voided = await service.voidLine(
      resultA.line.id,
      { reasonCode: 'SALAH_KETIK', reasonNote: 'Salah ketik nominal' },
      masterUser,
    );
    expect(voided.postingStatus).toBe(
      OperationalExpenseLinePostingStatus.VOIDED,
    );

    // node-postgres mem-parse kolom DATE sebagai tengah malam LOKAL lalu
    // membungkusnya jadi objek Date — .toISOString() (yang selalu UTC) jadi
    // mundur satu hari di timezone UTC+ (mis. WIB/ICT). Baca komponen lokal,
    // bukan UTC, supaya cocok dengan cara driver membungkusnya.
    const reversalRows: { entry_date: Date }[] = await dataSource.query(
      `SELECT entry_date FROM journal_entries WHERE source_type = 'VOID_REVERSAL' AND source_id = (
         SELECT id FROM journal_entries WHERE source_type = 'OPERATIONAL_EXPENSE' AND source_id = $1
       )`,
      [resultA.line.id],
    );
    expect(reversalRows).toHaveLength(1);
    const reversalDateStr = toLocalDateOnlyString(reversalRows[0].entry_date);
    expect(reversalDateStr).toBe(referenceToday);
    expect(reversalDateStr).not.toBe(expenseDate);

    const originalStillExists: { id: string }[] = await dataSource.query(
      `SELECT id FROM journal_entries WHERE source_type = 'OPERATIONAL_EXPENSE' AND source_id = $1`,
      [resultA.line.id],
    );
    expect(originalStillExists).toHaveLength(1);

    const lineB = await dataSource
      .getRepository(OperationalExpenseLine)
      .findOneOrFail({ where: { id: resultB.line.id } });
    expect(lineB.postingStatus).toBe(
      OperationalExpenseLinePostingStatus.POSTED,
    );
  });

  it('dua baris ditambahkan ke tanggal yang sama lewat dua panggilan createLine() terpisah -> satu document_number, line_order 1 dan 2', async () => {
    const expenseDate = isoTodayMinus(3);
    const resultA = await service.createLine(
      {
        expenseDate,
        cashAccountId: unflaggedCashAccountId,
        expenseAccountId,
        amount: 21000,
        description: 'Parkir toko A',
      },
      operatorUser,
      undefined,
    );
    trackResult(resultA);

    const resultB = await service.createLine(
      {
        expenseDate,
        cashAccountId: unflaggedCashAccountId,
        expenseAccountId,
        amount: 21000,
        description: 'Parkir toko B',
      },
      operatorUser,
      undefined,
    );
    trackResult(resultB);

    expect(resultA.document.id).toBe(resultB.document.id);
    expect(resultA.document.documentNumber).toBe(
      resultB.document.documentNumber,
    );
    expect(resultA.line.lineOrder).toBe(1);
    expect(resultB.line.lineOrder).toBe(2);
  });

  it('cashAccountId beda dari akun kas header yang sudah ada di tanggal yang sama -> 400', async () => {
    const expenseDate = isoTodayMinus(4);
    const first = await service.createLine(
      {
        expenseDate,
        cashAccountId: unflaggedCashAccountId,
        expenseAccountId,
        amount: 10000,
      },
      operatorUser,
      undefined,
    );
    trackResult(first);

    await expect(
      service.createLine(
        {
          expenseDate,
          cashAccountId: flaggedCashAccountId, // beda akun kas dari header yang sudah ada
          expenseAccountId,
          amount: 10000,
        },
        operatorUser,
        undefined,
      ),
    ).rejects.toThrow(/akun kas berbeda/);
  });

  it('expenseAccountId bukan tipe EXPENSE (mis. Piutang Usaha) -> 400, pesan menyebut alasan', async () => {
    await expect(
      service.createLine(
        {
          expenseDate: isoTodayMinus(0),
          cashAccountId: unflaggedCashAccountId,
          expenseAccountId: receivableAccountId,
          amount: 10000,
        },
        operatorUser,
        undefined,
      ),
    ).rejects.toThrow(/bukan akun biaya \(EXPENSE\)/);
  });

  it('expenseAccountId ke akun Persediaan (is_inventory_account) -> 400 juga ditolak (invarian ke-5 tidak pernah tersentuh modul ini)', async () => {
    await expect(
      service.createLine(
        {
          expenseDate: isoTodayMinus(0),
          cashAccountId: unflaggedCashAccountId,
          expenseAccountId: inventoryAccountId,
          amount: 10000,
        },
        operatorUser,
        undefined,
      ),
    ).rejects.toThrow(/bukan akun biaya \(EXPENSE\)/);
  });

  it('backdate 5 hari (dalam batas 7 hari khusus modul ini) -> sukses; backdate 8 hari -> ditolak PeriodLockValidatorService', async () => {
    const okResult = await service.createLine(
      {
        expenseDate: isoTodayMinus(5),
        cashAccountId: unflaggedCashAccountId,
        expenseAccountId,
        amount: 15000,
      },
      operatorUser,
      undefined,
    );
    trackResult(okResult);

    await expect(
      service.createLine(
        {
          expenseDate: isoTodayMinus(8),
          cashAccountId: unflaggedCashAccountId,
          expenseAccountId,
          amount: 15000,
        },
        operatorUser,
        undefined,
      ),
    ).rejects.toThrow(/maksimal mundur/);
  });

  it('regresi: override 7 hari tidak bocor ke modul lain — JournalPosterService.post() TANPA periodLockMaxDaysOverride tetap memakai default 2 hari', async () => {
    const entryDate = new Date();
    entryDate.setUTCDate(entryDate.getUTCDate() - 3); // 3 hari, di luar default 2 hari

    await expect(
      dataSource.transaction(async (manager) =>
        journalPosterService.post(
          {
            entryDate,
            description: 'Regresi backdate default',
            sourceType: 'MANUAL',
            createdBy: masterUserId,
            lines: [
              { accountId: expenseAccountId, debit: 1000, credit: 0 },
              { accountId: unflaggedCashAccountId, debit: 0, credit: 1000 },
            ],
          },
          manager,
        ),
      ),
    ).rejects.toThrow(/maksimal mundur/);
  });

  // --- Hari 32A tugas 8 (findExpenseAccounts/resolveExpenseAccount) -------

  it('findExpenseAccounts: OPERATOR tidak melihat akun restrictedToMaster maupun header (isPostable=false); MASTER melihat restrictedToMaster tapi tetap tidak melihat header', async () => {
    const operatorAccounts = await service.findExpenseAccounts(Role.OPERATOR);
    const operatorIds = operatorAccounts.map((a) => a.id);
    expect(operatorIds).not.toContain(restrictedExpenseAccountId);
    expect(operatorIds).not.toContain(headerExpenseAccountId);
    expect(operatorIds).toContain(expenseAccountId);

    const masterAccounts = await service.findExpenseAccounts(Role.MASTER);
    const masterIds = masterAccounts.map((a) => a.id);
    expect(masterIds).toContain(restrictedExpenseAccountId);
    expect(masterIds).not.toContain(headerExpenseAccountId);
  });

  // offset(0) sudah "diklaim" flaggedCashAccountId oleh test paling atas
  // (ambang) — pakai akun kas yang sama di sini (bukan unflaggedCashAccountId)
  // supaya tidak bentrok "akun kas berbeda" di findOrCreateDocument(). Nominal
  // di bawah ambang uji (500.000) jadi tidak memicu step-up meski akunnya
  // requiresOutflowApproval=true (pola sama test "kontrol tidur").
  it('createLine dengan akun restrictedToMaster: OPERATOR -> 400; MASTER -> sukses', async () => {
    await expect(
      service.createLine(
        {
          expenseDate: isoTodayMinus(0),
          cashAccountId: flaggedCashAccountId,
          expenseAccountId: restrictedExpenseAccountId,
          amount: 10000,
        },
        operatorUser,
        undefined,
      ),
    ).rejects.toThrow(/hanya boleh dipilih MASTER/);

    const result = await service.createLine(
      {
        expenseDate: isoTodayMinus(0),
        cashAccountId: flaggedCashAccountId,
        expenseAccountId: restrictedExpenseAccountId,
        amount: 10000,
      },
      masterUser,
      undefined,
    );
    trackResult(result);
  });

  it('Kasbon: expenseAccountId = Piutang Karyawan (is_employee_receivable_account) + workerId -> sukses, baris tercatat workerId-nya', async () => {
    const result = await service.createLine(
      {
        expenseDate: isoTodayMinus(0),
        cashAccountId: flaggedCashAccountId,
        expenseAccountId: employeeReceivableAccountId,
        amount: 200000,
        workerId,
      },
      operatorUser,
      undefined,
    );
    trackResult(result);
    expect(result.line.workerId).toBe(workerId);
    expect(result.line.expenseAccountId).toBe(employeeReceivableAccountId);
  });

  // --- Hari 32A tugas 6 (PATCH lines/:lineId) ------------------------------

  it('updateLine sebelum review disetujui -> 200, jurnal lama dibalik (bertanggal hari ini) + posting ulang; sesudah DISETUJUI -> 400', async () => {
    const created = await service.createLine(
      {
        expenseDate: isoTodayMinus(1),
        cashAccountId: unflaggedCashAccountId,
        expenseAccountId,
        amount: 50000,
        description: 'Sebelum edit',
      },
      operatorUser,
      undefined,
    );
    trackResult(created);

    const updateDto: UpdateOperationalExpenseLineDto = {
      expenseAccountId,
      amount: 75000,
      description: 'Sesudah edit',
    };
    const updated = await service.updateLine(
      created.line.id,
      updateDto,
      operatorUser,
    );
    expect(Number(updated.amount)).toBe(75000);
    expect(updated.description).toBe('Sesudah edit');

    const activeEntry = await journalPosterService.findActiveEntry(
      'OPERATIONAL_EXPENSE',
      created.line.id,
      dataSource.manager,
    );
    expect(activeEntry).not.toBeNull();
    expect(Number(activeEntry!.lines[0].debitAmount)).toBe(75000);
    const todayStr = isoTodayMinus(0);
    const reversalRows: { entry_date: Date }[] = await dataSource.query(
      `SELECT entry_date FROM journal_entries WHERE source_type = 'OPERATIONAL_EXPENSE_EDIT_REVERSAL' AND is_reversal = true ORDER BY created_at DESC LIMIT 1`,
    );
    expect(toLocalDateOnlyString(reversalRows[0].entry_date)).toBe(todayStr);

    await service.review(
      created.document.id,
      { reviewStatus: OperationalExpenseDocumentReviewStatus.DISETUJUI },
      supervisorUser,
    );

    await expect(
      service.updateLine(created.line.id, updateDto, operatorUser),
    ).rejects.toThrow(/sudah disetujui supervisor/);
  });

  // --- Hari 32A tugas 5 (PATCH :id/review) --------------------------------

  it('review: BERMASALAH tanpa catatan -> 400; DISETUJUI mencatat reviewedBy/reviewedAt', async () => {
    const created = await service.createLine(
      {
        expenseDate: isoTodayMinus(0),
        cashAccountId: flaggedCashAccountId,
        expenseAccountId,
        amount: 12000,
      },
      operatorUser,
      undefined,
    );
    trackResult(created);

    await expect(
      service.review(
        created.document.id,
        { reviewStatus: OperationalExpenseDocumentReviewStatus.BERMASALAH },
        supervisorUser,
      ),
    ).rejects.toThrow(/Catatan wajib diisi/);

    const reviewed = await service.review(
      created.document.id,
      {
        reviewStatus: OperationalExpenseDocumentReviewStatus.DISETUJUI,
        reviewNote: 'Sudah dicek',
      },
      supervisorUser,
    );
    expect(reviewed.reviewStatus).toBe(
      OperationalExpenseDocumentReviewStatus.DISETUJUI,
    );
    expect(reviewed.reviewedBy).toBe(supervisorUserId);
    expect(reviewed.reviewedAt).not.toBeNull();
  });

  // --- Paket R10 (POST /operational-expenses/batch) -----------------------

  it('createBatch dengan 4 baris -> satu dokumen, 4 baris, satu tanggal, satu akun kas', async () => {
    const dto: CreateOperationalExpenseBatchDto = {
      expenseDate: isoTodayMinus(7), // offset segar, belum diklaim test lain
      cashAccountId: unflaggedCashAccountId,
      lines: [
        { expenseAccountId, amount: 10000, description: 'Baris 1' },
        { expenseAccountId, amount: 20000, description: 'Baris 2' },
        { expenseAccountId, amount: 30000, description: 'Baris 3' },
        { expenseAccountId, amount: 40000, description: 'Baris 4' },
      ],
    };
    const result = await service.createBatch(dto, operatorUser, undefined);
    createdDocumentIds.push(result.document.id);
    result.lines.forEach((line) => createdLineIds.push(line.id));

    expect(result.lines).toHaveLength(4);
    expect(new Set(result.lines.map((l) => l.documentId)).size).toBe(1);
    expect(result.lines.map((l) => l.lineOrder)).toEqual([1, 2, 3, 4]);
    expect(result.document.cashAccountId).toBe(unflaggedCashAccountId);
  });

  it('createBatch: baris ke-3 memakai akun terlarang -> 400, TIDAK ADA satu baris pun tersimpan (rollback penuh)', async () => {
    const expenseDate = isoTodayMinus(6);
    const dto: CreateOperationalExpenseBatchDto = {
      expenseDate,
      cashAccountId: unflaggedCashAccountId,
      lines: [
        { expenseAccountId, amount: 10000, description: 'Baris 1' },
        { expenseAccountId, amount: 20000, description: 'Baris 2' },
        {
          expenseAccountId: restrictedExpenseAccountId, // OPERATOR dilarang
          amount: 30000,
          description: 'Baris 3 (terlarang)',
        },
      ],
    };

    // Pesan WAJIB menyebut baris keberapa (Hari 32A FE perlu ini untuk
    // menunjuk operator ke baris yang salah, bukan cuma menolak seluruh batch).
    await expect(
      service.createBatch(dto, operatorUser, undefined),
    ).rejects.toThrow(/Baris ke-3: .*hanya boleh dipilih MASTER/);

    const countRows: { count: string }[] = await dataSource.query(
      `SELECT COUNT(*)::int AS count FROM operational_expense_lines l
       JOIN operational_expense_documents d ON d.id = l.document_id
       WHERE d.expense_date = $1`,
      [expenseDate],
    );
    expect(Number(countRows[0].count)).toBe(0);

    const docRows: { count: string }[] = await dataSource.query(
      `SELECT COUNT(*)::int AS count FROM operational_expense_documents WHERE expense_date = $1`,
      [expenseDate],
    );
    expect(Number(docRows[0].count)).toBe(0);
  });

  it('createBatch untuk tanggal yang bukti-nya sudah ada -> baris menempel ke bukti yang sama, bukan bukti kedua', async () => {
    const expenseDate = isoTodayMinus(7); // sama seperti test "4 baris" di atas

    const dto: CreateOperationalExpenseBatchDto = {
      expenseDate,
      cashAccountId: unflaggedCashAccountId,
      lines: [{ expenseAccountId, amount: 5000, description: 'Baris ke-5' }],
    };
    const result = await service.createBatch(dto, operatorUser, undefined);
    result.lines.forEach((line) => createdLineIds.push(line.id));

    const docRows: { count: string }[] = await dataSource.query(
      `SELECT COUNT(*)::int AS count FROM operational_expense_documents WHERE expense_date = $1`,
      [expenseDate],
    );
    expect(Number(docRows[0].count)).toBe(1);
    expect(result.lines[0].lineOrder).toBe(5); // lanjutan dari 4 baris sebelumnya
  });

  it('endpoint satu-baris (createLine) tetap berfungsi setelah batch ditambahkan', async () => {
    const result = await service.createLine(
      {
        expenseDate: isoTodayMinus(0),
        cashAccountId: flaggedCashAccountId,
        expenseAccountId,
        amount: 9999,
        description: 'Regresi single-line',
      },
      operatorUser,
      undefined,
    );
    trackResult(result);
    expect(Number(result.line.amount)).toBe(9999);
  });

  it('findEmployeeReceivableAccount: mengembalikan akun Piutang Karyawan (dipakai FE tab Kasbon)', async () => {
    const account = await service.findEmployeeReceivableAccount();
    expect(account?.id).toBe(employeeReceivableAccountId);
    expect(account?.isEmployeeReceivableAccount).toBe(true);
  });
});
