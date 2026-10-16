import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AccountResolverService } from '../../core/account-resolver/account-resolver.service';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { JournalPosterService } from '../../core/journal-poster/journal-poster.service';
import { StepUpService } from '../../core/step-up/step-up.service';
import { VoidEngineService } from '../../core/void/void.service';
import { Role } from '../../common/enums/role.enum';
import {
  buildPaginatedResult,
  PaginatedResult,
  resolveSortColumn,
  resolveSortDir,
} from '../../common/pagination';
import { ActionType } from '../authorization-requests/action-type.enum';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import {
  AccountType,
  ChartOfAccount,
} from '../chart-of-accounts/entities/chart-of-account.entity';
import { JournalEntry } from '../journal-entries/entities/journal-entry.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { Worker } from '../workers/entities/worker.entity';
import {
  CreateOperationalExpenseBatchDto,
  CreateOperationalExpenseBatchLineDto,
} from './dto/create-operational-expense-batch.dto';
import { CreateOperationalExpenseLineDto } from './dto/create-operational-expense-line.dto';
import { OperationalExpenseQueryDto } from './dto/operational-expense-query.dto';
import { ReviewOperationalExpenseDocumentDto } from './dto/review-operational-expense-document.dto';
import { UpdateOperationalExpenseLineDto } from './dto/update-operational-expense-line.dto';
import { VoidOperationalExpenseLineDto } from './dto/void-operational-expense-line.dto';
import {
  OperationalExpenseDocument,
  OperationalExpenseDocumentReviewStatus,
} from './entities/operational-expense-document.entity';
import {
  OperationalExpenseLine,
  OperationalExpenseLinePostingStatus,
} from './entities/operational-expense-line.entity';

const SORTABLE_COLUMNS = [
  'documentNumber',
  'expenseDate',
  'createdAt',
] as const;

// Klien setuju mundur 7 hari khusus modul ini (docs/
// PERTANYAAN_KLIEN_BIAYA_OPERASIONAL.md §12 — bukti akhir pekan baru
// diketik Senin/Selasa). Modul lain tetap default settings.backdate_max_days
// (2 hari) lewat PeriodLockValidatorService.
const BACKDATE_MAX_DAYS_OVERRIDE = 7;

export interface CreateOperationalExpenseLineResult {
  document: OperationalExpenseDocument;
  line: OperationalExpenseLine;
  journalEntry: JournalEntry;
}

export interface CreateOperationalExpenseBatchResult {
  document: OperationalExpenseDocument;
  lines: OperationalExpenseLine[];
}

export type OperationalExpenseDocumentWithTotal = OperationalExpenseDocument & {
  totalAmount: number;
};

/**
 * Biaya Operasional / Pengeluaran Kas (Hari 17, CLAUDE.md §5 "Pengeluaran
 * kas besar", docs/PERTANYAAN_KLIEN_BIAYA_OPERASIONAL.md). Header + baris —
 * satu bukti `KK` per hari kalender, baris ditambahkan lewat panggilan
 * createLine() terpisah sepanjang hari (find-or-create header di dalamnya).
 * VOID beroperasi per baris lewat VoidEngineService, bukan per header.
 *
 * Step-up CASH_OUTFLOW dipanggil dua kali (pola sama WarehouseMutationsService
 * §BS_TO_STORE): sekali TANPA manager sebelum transaction (supaya baris
 * authorization_requests baru tidak ikut rollback saat 412 dilempar), sekali
 * LAGI DENGAN manager+authorizationRequestId di dalam transaction untuk
 * konsumsi atomik.
 */
@Injectable()
export class OperationalExpensesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(OperationalExpenseDocument)
    private readonly documentsRepository: Repository<OperationalExpenseDocument>,
    @InjectRepository(OperationalExpenseLine)
    private readonly linesRepository: Repository<OperationalExpenseLine>,
    @InjectRepository(ChartOfAccount)
    private readonly chartOfAccountsRepository: Repository<ChartOfAccount>,
    @InjectRepository(Worker)
    private readonly workersRepository: Repository<Worker>,
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    private readonly documentCounterService: DocumentCounterService,
    private readonly journalPosterService: JournalPosterService,
    private readonly accountResolverService: AccountResolverService,
    private readonly stepUpService: StepUpService,
    private readonly voidEngineService: VoidEngineService,
  ) {}

  async createLine(
    dto: CreateOperationalExpenseLineDto,
    user: AuthenticatedUser,
    authorizationRequestId: string | undefined,
  ): Promise<CreateOperationalExpenseLineResult> {
    const expenseDate = dto.expenseDate
      ? parseDateOnly(dto.expenseDate)
      : startOfUtcToday();

    const cashAccount = await this.resolveCashAccount(dto.cashAccountId);
    const expenseAccount = await this.resolveExpenseAccount(
      dto.expenseAccountId,
      user.role,
    );
    this.assertKasbonHasWorker(expenseAccount, dto.workerId);
    await this.assertOptionalWorkerAndVehicle(dto.workerId, dto.vehicleId);
    const threshold = await this.readCashOutflowThreshold();
    const needsApproval =
      cashAccount.requiresOutflowApproval && dto.amount > threshold;
    const contextSummary = buildContextSummary(
      cashAccount,
      expenseAccount,
      dto,
    );

    if (needsApproval && !authorizationRequestId) {
      await this.stepUpService.requireApproval({
        user,
        actionType: ActionType.CASH_OUTFLOW,
        payload: { accountId: dto.cashAccountId, amount: dto.amount },
        contextSummary,
      });
    }

    return this.dataSource.transaction(async (manager) => {
      if (needsApproval) {
        await this.stepUpService.requireApproval({
          user,
          actionType: ActionType.CASH_OUTFLOW,
          payload: { accountId: dto.cashAccountId, amount: dto.amount },
          contextSummary,
          authorizationRequestId,
          manager,
        });
      }

      const document = await this.findOrCreateDocument(
        expenseDate,
        dto.cashAccountId,
        user,
        manager,
      );

      const existingLineCount = await manager.count(OperationalExpenseLine, {
        where: { documentId: document.id },
      });

      const line = await manager.save(
        OperationalExpenseLine,
        manager.create(OperationalExpenseLine, {
          documentId: document.id,
          lineOrder: existingLineCount + 1,
          expenseAccountId: dto.expenseAccountId,
          amount: dto.amount.toFixed(2),
          description: dto.description ?? null,
          referenceNumber: dto.referenceNumber ?? null,
          workerId: dto.workerId ?? null,
          vehicleId: dto.vehicleId ?? null,
          createdBy: user.sub,
        }),
      );

      const journalEntry = await this.journalPosterService.post(
        {
          entryDate: expenseDate,
          description: dto.description
            ? `${expenseAccount.name} — ${dto.description}`
            : expenseAccount.name,
          sourceType: 'OPERATIONAL_EXPENSE',
          sourceId: line.id,
          createdBy: user.sub,
          periodLockMaxDaysOverride: BACKDATE_MAX_DAYS_OVERRIDE,
          lines: [
            {
              accountId: dto.expenseAccountId,
              debit: dto.amount,
              credit: 0,
              description: dto.description,
            },
            {
              accountId: dto.cashAccountId,
              debit: 0,
              credit: dto.amount,
              description: 'Kas keluar',
            },
          ],
        },
        manager,
      );

      return { document, line, journalEntry };
    });
  }

  /**
   * POST /operational-expenses/batch (paket R10, docs/RENCANA_REVISI_
   * TESTING_KLIEN.md §3 "R10") — entri multi-baris: `expenseDate` dan
   * `cashAccountId` GLOBAL untuk seluruh baris, SELURUH baris diproses
   * dalam SATU DB transaction (CLAUDE.md §2.3) — gagal di baris mana pun
   * berarti baris sebelumnya ikut batal (rollback penuh, tidak ada state
   * setengah jadi). Validasi akun per baris (resolveExpenseAccount) SENGAJA
   * dijalankan DI DALAM transaction, bukan pre-check di luar — supaya
   * kegagalan baris ke-N benar-benar menguji rollback, bukan cuma menolak
   * sebelum apa pun ditulis.
   *
   * Satu bukti per hari per akun kas tetap berlaku lewat findOrCreateDocument
   * yang sama dipakai createLine() — baris batch menempel ke bukti yang
   * sudah ada untuk expenseDate itu kalau sudah ada.
   *
   * Step-up CASH_OUTFLOW dievaluasi SEKALI untuk seluruh batch (bukan per
   * baris) — cashAccount + total nominal batch, pola dual-call yang sama
   * seperti createLine() (sekali tanpa manager sebelum transaction, sekali
   * lagi dengan manager di dalamnya untuk konsumsi atomik).
   */
  async createBatch(
    dto: CreateOperationalExpenseBatchDto,
    user: AuthenticatedUser,
    authorizationRequestId: string | undefined,
  ): Promise<CreateOperationalExpenseBatchResult> {
    const expenseDate = dto.expenseDate
      ? parseDateOnly(dto.expenseDate)
      : startOfUtcToday();

    const cashAccount = await this.resolveCashAccount(dto.cashAccountId);
    const threshold = await this.readCashOutflowThreshold();
    const totalAmount = dto.lines.reduce((sum, line) => sum + line.amount, 0);
    const needsApproval =
      cashAccount.requiresOutflowApproval &&
      dto.lines.some((line) => line.amount > threshold);
    const contextSummary = buildBatchContextSummary(
      cashAccount,
      dto.lines,
      totalAmount,
    );

    if (needsApproval && !authorizationRequestId) {
      await this.stepUpService.requireApproval({
        user,
        actionType: ActionType.CASH_OUTFLOW,
        payload: { accountId: dto.cashAccountId, amount: totalAmount },
        contextSummary,
      });
    }

    return this.dataSource.transaction(async (manager) => {
      if (needsApproval) {
        await this.stepUpService.requireApproval({
          user,
          actionType: ActionType.CASH_OUTFLOW,
          payload: { accountId: dto.cashAccountId, amount: totalAmount },
          contextSummary,
          authorizationRequestId,
          manager,
        });
      }

      const document = await this.findOrCreateDocument(
        expenseDate,
        dto.cashAccountId,
        user,
        manager,
      );

      let lineOrder = await manager.count(OperationalExpenseLine, {
        where: { documentId: document.id },
      });

      const lines: OperationalExpenseLine[] = [];
      for (let i = 0; i < dto.lines.length; i++) {
        const lineDto = dto.lines[i];
        // Validasi DI DALAM transaction (lihat komentar method) — akun
        // terlarang/tidak valid pada baris mana pun membatalkan seluruh
        // batch, termasuk baris yang sudah sempat diinsert sebelumnya. Pesan
        // error WAJIB menyebut baris keberapa (Hari 32A tugas FE-nya perlu
        // ini untuk menunjuk operator ke baris yang salah, bukan cuma
        // menolak seluruh batch tanpa arah) — dibungkus di sini, bukan di
        // resolveExpenseAccount()/assertOptionalWorkerAndVehicle() sendiri,
        // supaya kedua fungsi itu tetap dipakai ulang createLine()/
        // updateLine() tanpa prefiks baris yang tidak relevan di sana.
        let expenseAccount: ChartOfAccount;
        try {
          expenseAccount = await this.resolveExpenseAccount(
            lineDto.expenseAccountId,
            user.role,
          );
          this.assertKasbonHasWorker(expenseAccount, lineDto.workerId);
          await this.assertOptionalWorkerAndVehicle(
            lineDto.workerId,
            lineDto.vehicleId,
          );
        } catch (err) {
          if (err instanceof BadRequestException) {
            const response = err.getResponse();
            const message =
              typeof response === 'string'
                ? response
                : ((response as { message?: string }).message ?? err.message);
            throw new BadRequestException(`Baris ke-${i + 1}: ${message}`);
          }
          throw err;
        }

        lineOrder += 1;
        const line = await manager.save(
          OperationalExpenseLine,
          manager.create(OperationalExpenseLine, {
            documentId: document.id,
            lineOrder,
            expenseAccountId: lineDto.expenseAccountId,
            amount: lineDto.amount.toFixed(2),
            description: lineDto.description ?? null,
            referenceNumber: lineDto.referenceNumber ?? null,
            workerId: lineDto.workerId ?? null,
            vehicleId: lineDto.vehicleId ?? null,
            createdBy: user.sub,
          }),
        );

        await this.journalPosterService.post(
          {
            entryDate: expenseDate,
            description: lineDto.description
              ? `${expenseAccount.name} — ${lineDto.description}`
              : expenseAccount.name,
            sourceType: 'OPERATIONAL_EXPENSE',
            sourceId: line.id,
            createdBy: user.sub,
            periodLockMaxDaysOverride: BACKDATE_MAX_DAYS_OVERRIDE,
            lines: [
              {
                accountId: lineDto.expenseAccountId,
                debit: lineDto.amount,
                credit: 0,
                description: lineDto.description,
              },
              {
                accountId: dto.cashAccountId,
                debit: 0,
                credit: lineDto.amount,
                description: 'Kas keluar',
              },
            ],
          },
          manager,
        );

        lines.push(line);
      }

      return { document, lines };
    });
  }

  /**
   * PATCH /operational-expenses/lines/:lineId (Hari 32A tugas 6) — edit
   * langsung diizinkan selama document.reviewStatus BUKAN DISETUJUI
   * (CLAUDE.md §3 "Biaya Operasional", pengecualian eksplisit terhadap
   * kebiasaan "koreksi selalu VOID" modul lain). Desain yang dipilih:
   * BALIK jurnal lama (bertanggal HARI INI, §2.2 — BUKAN pengecualian K2
   * yang khusus paket R6 Revisi-di-Tempat Faktur) lalu POSTING ULANG
   * bertanggal expenseDate dokumen (tidak berubah), sourceType/sourceId
   * SAMA dengan baris asli — pola sama DocumentReviseService tapi tanpa
   * stok (baris biaya operasional tidak pernah menyentuh stok/lot apa pun).
   * audit_logs before/after tercatat otomatis lewat @Audit (request.body vs
   * responseBody) — tidak perlu logic tambahan di sini.
   */
  async updateLine(
    lineId: string,
    dto: UpdateOperationalExpenseLineDto,
    user: AuthenticatedUser,
  ): Promise<OperationalExpenseLine> {
    const line = await this.linesRepository.findOne({
      where: { id: lineId },
    });
    if (!line) {
      throw new BadRequestException('Baris biaya operasional tidak ditemukan.');
    }
    if (line.postingStatus === OperationalExpenseLinePostingStatus.VOIDED) {
      throw new BadRequestException(
        'Baris ini sudah VOID — tidak bisa diedit.',
      );
    }
    const document = await this.documentsRepository.findOne({
      where: { id: line.documentId },
    });
    if (!document) {
      throw new BadRequestException(
        'Bukti Kas Keluar untuk baris ini tidak ditemukan.',
      );
    }
    if (
      document.reviewStatus === OperationalExpenseDocumentReviewStatus.DISETUJUI
    ) {
      throw new BadRequestException(
        'Bukti sudah disetujui supervisor — gunakan VOID untuk koreksi.',
      );
    }

    const expenseAccount = await this.resolveExpenseAccount(
      dto.expenseAccountId,
      user.role,
    );
    this.assertKasbonHasWorker(expenseAccount, dto.workerId);
    await this.assertOptionalWorkerAndVehicle(dto.workerId, dto.vehicleId);

    return this.dataSource.transaction(async (manager) => {
      const activeEntry = await this.journalPosterService.findActiveEntry(
        'OPERATIONAL_EXPENSE',
        lineId,
        manager,
      );
      if (!activeEntry) {
        throw new BadRequestException(
          'Jurnal untuk baris ini tidak ditemukan — tidak bisa diedit.',
        );
      }

      // Debit<->kredit ditukar, nominal identik — pola sama VoidEngineService
      // .voidDocument(), bertanggal HARI INI (§2.2, bukan tanggal dokumen).
      const reversalLines = activeEntry.lines.map((entryLine) => ({
        accountId: entryLine.accountId,
        debit: Number(entryLine.creditAmount),
        credit: Number(entryLine.debitAmount),
        description: entryLine.description ?? undefined,
      }));
      await this.journalPosterService.post(
        {
          entryDate: new Date(),
          description: `Pembalik koreksi baris Biaya Operasional ${document.documentNumber}`,
          sourceType: 'OPERATIONAL_EXPENSE_EDIT_REVERSAL',
          sourceId: activeEntry.id,
          lines: reversalLines,
          createdBy: user.sub,
          isReversal: true,
          reversedEntryId: activeEntry.id,
        },
        manager,
      );

      await manager.update(OperationalExpenseLine, lineId, {
        expenseAccountId: dto.expenseAccountId,
        amount: dto.amount.toFixed(2),
        description: dto.description ?? null,
        referenceNumber: dto.referenceNumber ?? null,
        workerId: dto.workerId ?? null,
        vehicleId: dto.vehicleId ?? null,
      });

      // sourceType/sourceId SAMA dengan baris asli (bukan reversal) — entry
      // ini jadi "entry aktif" berikutnya untuk edit/VOID selanjutnya (pola
      // sama DocumentReviseService.revise()).
      await this.journalPosterService.post(
        {
          entryDate: parseDateOnly(document.expenseDate),
          description: dto.description
            ? `${expenseAccount.name} — ${dto.description}`
            : expenseAccount.name,
          sourceType: 'OPERATIONAL_EXPENSE',
          sourceId: lineId,
          createdBy: user.sub,
          periodLockMaxDaysOverride: BACKDATE_MAX_DAYS_OVERRIDE,
          lines: [
            {
              accountId: dto.expenseAccountId,
              debit: dto.amount,
              credit: 0,
              description: dto.description,
            },
            {
              accountId: document.cashAccountId,
              debit: 0,
              credit: dto.amount,
              description: 'Kas keluar (koreksi)',
            },
          ],
        },
        manager,
      );

      const updated = await manager.findOne(OperationalExpenseLine, {
        where: { id: lineId },
      });
      return updated!;
    });
  }

  /**
   * PATCH /operational-expenses/:id/review (Hari 32A tugas 5) — approval
   * SETELAH-FAKTA (pola sama SalesInvoicesService.review()/
   * CashTransfersService.review()), HANYA menyentuh 4 kolom review, tidak
   * pernah lewat createLine()/updateLine()/VoidEngine.
   */
  async review(
    id: string,
    dto: ReviewOperationalExpenseDocumentDto,
    user: AuthenticatedUser,
  ): Promise<OperationalExpenseDocumentWithTotal> {
    if (
      dto.reviewStatus === OperationalExpenseDocumentReviewStatus.BERMASALAH &&
      !dto.reviewNote?.trim()
    ) {
      throw new BadRequestException(
        'Catatan wajib diisi saat menandai Bukti Kas Keluar BERMASALAH.',
      );
    }
    await this.documentsRepository.update(id, {
      reviewStatus: dto.reviewStatus,
      reviewNote: dto.reviewNote ?? null,
      reviewedBy: user.sub,
      reviewedAt: new Date(),
    });
    return this.findOne(id);
  }

  /**
   * VOID per baris. OPERATOR wajib step-up VOID_DOCUMENT (§2.13, keputusan
   * 6 Okt 2026 need_fixing.md #14 — dulu dikecualikan). Satu gerbang saja,
   * pola PERSIS CashTransfersService.voidTransfer(): Biaya Operasional tidak
   * ikut kunci cetak (§3), jadi tidak ada UNLOCK_PRINT.
   */
  async voidLine(
    lineId: string,
    dto: VoidOperationalExpenseLineDto,
    user: AuthenticatedUser,
    voidAuthorizationRequestId?: string,
  ): Promise<OperationalExpenseLine> {
    const existing = await this.linesRepository.findOne({
      where: { id: lineId },
      relations: { document: true },
    });
    if (!existing) {
      throw new BadRequestException('Baris biaya operasional tidak ditemukan.');
    }

    const needsVoidApproval = user.role === Role.OPERATOR;
    const voidPayload = { sourceType: 'OPERATIONAL_EXPENSE', sourceId: lineId };
    let voidContextSummary = '';
    if (needsVoidApproval) {
      const account = await this.chartOfAccountsRepository.findOne({
        where: { id: existing.expenseAccountId },
      });
      const amountText = Number(existing.amount).toLocaleString('id-ID');
      voidContextSummary = `VOID baris Biaya Operasional ${existing.document.documentNumber} — ${account?.name ?? '-'} ${amountText}${existing.description ? ` (${existing.description})` : ''}: ${dto.reasonNote}`;
    }

    if (needsVoidApproval && !voidAuthorizationRequestId) {
      await this.stepUpService.requireApproval({
        user,
        actionType: ActionType.VOID_DOCUMENT,
        payload: voidPayload,
        contextSummary: voidContextSummary,
      });
    }

    await this.dataSource.transaction(async (manager) => {
      if (needsVoidApproval) {
        await this.stepUpService.requireApproval({
          user,
          actionType: ActionType.VOID_DOCUMENT,
          payload: voidPayload,
          contextSummary: voidContextSummary,
          authorizationRequestId: voidAuthorizationRequestId,
          manager,
        });
      }

      await this.voidEngineService.voidDocument({
        sourceType: 'OPERATIONAL_EXPENSE',
        sourceId: lineId,
        reasonCode: dto.reasonCode,
        reasonNote: dto.reasonNote,
        userId: user.sub,
        manager,
      });
    });
    const line = await this.linesRepository.findOne({
      where: { id: lineId },
    });
    if (!line) {
      throw new BadRequestException('Baris biaya operasional tidak ditemukan.');
    }
    return line;
  }

  async findAll(
    query: OperationalExpenseQueryDto,
  ): Promise<PaginatedResult<OperationalExpenseDocumentWithTotal>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'expenseDate',
    );
    const sortDir = resolveSortDir(query.sortDir);

    const qb = this.documentsRepository.createQueryBuilder('doc');
    if (query.search) {
      qb.andWhere('doc.documentNumber ILIKE :search', {
        search: `%${query.search}%`,
      });
    }
    if (query.dateFrom) {
      qb.andWhere('doc.expenseDate >= :dateFrom', { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      qb.andWhere('doc.expenseDate <= :dateTo', { dateTo: query.dateTo });
    }
    // `date` + `reviewStatus` (pola sama CashTransferQueryDto, tab Biaya
    // Operasional di Pengecekan Invoice Harian) — `date` menyaring PERSIS
    // (bukan rentang seperti dateFrom/dateTo di atas).
    if (query.date) {
      qb.andWhere('doc.expenseDate = :date', { date: query.date });
    }
    if (query.reviewStatus) {
      qb.andWhere('doc.reviewStatus = :reviewStatus', {
        reviewStatus: query.reviewStatus,
      });
    }
    qb.orderBy(`doc.${sortColumn}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [documents, total] = await qb.getManyAndCount();
    const withTotals = await this.attachTotals(documents);
    return buildPaginatedResult(withTotals, total, page, limit);
  }

  // Dipakai dropdown "Akun Biaya" di Entri — sama alasan comment controller:
  // OPERATOR tidak boleh GET /chart-of-accounts penuh (CLAUDE.md §5), jadi
  // butuh irisan sempit sendiri, sama pola findCashAccounts(). Hari 32A tugas
  // 8a: `isPostable: true` ditambah (header/kategori EXPENSE sebelumnya ikut
  // nongol). Tugas 8 (sekalian): OPERATOR tidak melihat akun
  // `restrictedToMaster` sama sekali, bukan cuma ditolak saat submit.
  findExpenseAccounts(role: Role): Promise<ChartOfAccount[]> {
    return this.chartOfAccountsRepository.find({
      where: {
        accountType: AccountType.EXPENSE,
        isActive: true,
        isPostable: true,
        ...(role !== Role.MASTER && { restrictedToMaster: false }),
      },
      order: { code: 'ASC' },
    });
  }

  // Dipakai FE untuk tab Kasbon (Hari 32A FE) — dropdown akun WAJIB terbatas
  // ke satu akun ini saat tab itu aktif. Akun ini SENGAJA tidak muncul di
  // findExpenseAccounts() (accountType-nya ASSET, bukan EXPENSE), jadi FE
  // butuh irisan sempit sendiri untuk OPERATOR juga bisa membacanya (pola
  // sama findExpenseAccounts()/findCashAccounts() — bukan pelonggaran GET
  // /chart-of-accounts penuh yang tetap MASTER+SUPERVISOR saja).
  findEmployeeReceivableAccount(): Promise<ChartOfAccount | null> {
    return this.chartOfAccountsRepository.findOne({
      where: { isEmployeeReceivableAccount: true, isActive: true },
    });
  }

  async findOne(id: string): Promise<OperationalExpenseDocumentWithTotal> {
    const document = await this.documentsRepository.findOne({
      where: { id },
      relations: { lines: true },
    });
    if (!document) {
      throw new BadRequestException('Bukti Kas Keluar tidak ditemukan.');
    }
    const [withTotal] = await this.attachTotals([document]);
    return withTotal;
  }

  // --- Helper --------------------------------------------------------------

  private async resolveCashAccount(accountId: string): Promise<ChartOfAccount> {
    await this.accountResolverService.assertAccountHasFlag(
      accountId,
      'is_cash_account',
      'Kas/Bank',
    );
    const account = await this.chartOfAccountsRepository.findOne({
      where: { id: accountId },
    });
    if (!account) {
      throw new BadRequestException(`Akun kas ${accountId} tidak ditemukan.`);
    }
    return account;
  }

  // Hari 32A tugas 8b: SEMULA menolak semua akun non-EXPENSE tanpa
  // kecuali — Kasbon butuh 01.120.00002 (ASSET + isEmployeeReceivableAccount)
  // bisa lolos. Piutang/Hutang/Persediaan LAIN tetap ditolak (hanya SATU
  // akun spesifik yang dilonggarkan, bukan seluruh ASSET). `role` menggerbangi
  // restrictedToMaster — defense in depth kalau OPERATOR memilih akun ini
  // tanpa lolos dari dropdown findExpenseAccounts() (pola sama supplier
  // masking, CLAUDE.md §3 "Lain-lain").
  private async resolveExpenseAccount(
    accountId: string,
    role: Role,
  ): Promise<ChartOfAccount> {
    const account = await this.chartOfAccountsRepository.findOne({
      where: { id: accountId },
    });
    if (!account) {
      throw new BadRequestException(`Akun biaya ${accountId} tidak ditemukan.`);
    }
    if (!account.isActive) {
      throw new BadRequestException(`Akun ${account.name} tidak aktif.`);
    }
    const isPlainExpense = account.accountType === AccountType.EXPENSE;
    const isEmployeeReceivable =
      account.accountType === AccountType.ASSET &&
      account.isEmployeeReceivableAccount;
    if (!isPlainExpense && !isEmployeeReceivable) {
      throw new BadRequestException(
        `Akun ${account.name} bukan akun biaya (EXPENSE) — Biaya Operasional hanya boleh memilih akun biaya, atau akun Piutang Karyawan untuk Kasbon. Pembayaran ke supplier/pelanggan ada di modul Pembayaran (Hari 26-27).`,
      );
    }
    if (account.restrictedToMaster && role !== Role.MASTER) {
      throw new BadRequestException(
        `Akun ${account.name} hanya boleh dipilih MASTER.`,
      );
    }
    return account;
  }

  // need_fixing.md #26 — Kasbon WAJIB menyebut pekerjanya: sisa kasbon per
  // pekerja (dilunasi lewat Pelunasan Kasbon, modul kasbon-repayments)
  // dihitung dari worker_id baris ini. Kasbon tanpa pekerja tidak pernah bisa
  // dilunasi lewat jalur resmi. Baris lama tanpa pekerja tidak disentuh.
  private assertKasbonHasWorker(
    account: ChartOfAccount,
    workerId: string | undefined,
  ): void {
    if (account.isEmployeeReceivableAccount && !workerId) {
      throw new BadRequestException(
        'Kasbon wajib memilih pekerja yang menerima kasbon.',
      );
    }
  }

  // Hari 32A tugas 4 — worker_id/vehicle_id nullable & opsional, tapi kalau
  // diisi wajib FK yang benar-benar ada (integritas referensial, bukan
  // validasi "wajib diisi").
  private async assertOptionalWorkerAndVehicle(
    workerId: string | undefined,
    vehicleId: string | undefined,
  ): Promise<void> {
    if (workerId) {
      const worker = await this.workersRepository.findOne({
        where: { id: workerId },
      });
      if (!worker) {
        throw new BadRequestException(`Pekerja ${workerId} tidak ditemukan.`);
      }
    }
    if (vehicleId) {
      const vehicle = await this.vehiclesRepository.findOne({
        where: { id: vehicleId },
      });
      if (!vehicle) {
        throw new BadRequestException(
          `Kendaraan ${vehicleId} tidak ditemukan.`,
        );
      }
    }
  }

  private async readCashOutflowThreshold(): Promise<number> {
    const rows: { value: string }[] = await this.dataSource.query(
      `SELECT value FROM settings WHERE key = 'cash_outflow_approval_threshold'`,
    );
    return rows[0] ? Number(rows[0].value) : 0;
  }

  /**
   * Find-or-create header per expense_date (satu bukti per hari kalender).
   * Risiko konkurensi teoritis (dua request pertama di hari yang sama
   * bentrok UNIQUE(expense_date)) disengaja tidak ditangani dengan
   * retry/savepoint — volume ±1-8 baris/hari satu toko/satu PC membuat itu
   * over-engineering, dicatat sebagai follow-up kalau volume berubah.
   */
  private async findOrCreateDocument(
    expenseDate: Date,
    cashAccountId: string,
    user: AuthenticatedUser,
    manager: EntityManager,
  ): Promise<OperationalExpenseDocument> {
    const dateStr = toDateOnlyString(expenseDate);
    const existingRows: { id: string; cash_account_id: string }[] =
      await manager.query(
        `SELECT id, cash_account_id FROM operational_expense_documents WHERE expense_date = $1 FOR UPDATE`,
        [dateStr],
      );

    if (existingRows.length > 0) {
      if (existingRows[0].cash_account_id !== cashAccountId) {
        throw new BadRequestException(
          `Bukti Kas Keluar tanggal ${dateStr} sudah dibuat dengan akun kas berbeda — pilih akun kas yang sama untuk baris tambahan hari ini.`,
        );
      }
      const document = await manager.findOne(OperationalExpenseDocument, {
        where: { id: existingRows[0].id },
      });
      return document!;
    }

    const documentNumber = await this.documentCounterService.getNextNumber(
      'OPERATIONAL_EXPENSE',
      expenseDate,
      manager,
    );
    return manager.save(
      OperationalExpenseDocument,
      manager.create(OperationalExpenseDocument, {
        documentNumber,
        expenseDate: dateStr,
        cashAccountId,
        createdBy: user.sub,
      }),
    );
  }

  private async attachTotals(
    documents: OperationalExpenseDocument[],
  ): Promise<OperationalExpenseDocumentWithTotal[]> {
    if (documents.length === 0) {
      return [];
    }
    const ids = documents.map((doc) => doc.id);
    const rows: { document_id: string; total_amount: string }[] =
      await this.dataSource.query(
        `SELECT document_id, COALESCE(SUM(amount), 0) AS total_amount
         FROM operational_expense_lines
         WHERE document_id = ANY($1) AND posting_status = 'POSTED'
         GROUP BY document_id`,
        [ids],
      );
    const totalByDocId = new Map(
      rows.map((row) => [row.document_id, Number(row.total_amount)]),
    );
    return documents.map((doc) => ({
      ...doc,
      totalAmount: totalByDocId.get(doc.id) ?? 0,
    }));
  }
}

function buildContextSummary(
  cashAccount: ChartOfAccount,
  expenseAccount: ChartOfAccount,
  dto: CreateOperationalExpenseLineDto,
): string {
  const amountText = `Rp ${dto.amount.toLocaleString('id-ID')}`;
  const detail = dto.description ? ` (${dto.description})` : '';
  return `Pengeluaran ${cashAccount.name} ${amountText} — ${expenseAccount.name}${detail}`;
}

function buildBatchContextSummary(
  cashAccount: ChartOfAccount,
  lines: CreateOperationalExpenseBatchLineDto[],
  totalAmount: number,
): string {
  const amountText = `Rp ${totalAmount.toLocaleString('id-ID')}`;
  return `Pengeluaran ${cashAccount.name} ${amountText} (${lines.length} baris)`;
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function startOfUtcToday(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function toDateOnlyString(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
