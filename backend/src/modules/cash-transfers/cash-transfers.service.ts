import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
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
import { JournalEntry } from '../journal-entries/entities/journal-entry.entity';
import { CashTransferQueryDto } from './dto/cash-transfer-query.dto';
import { CreateCashTransferDto } from './dto/create-cash-transfer.dto';
import { ReviewCashTransferDto } from './dto/review-cash-transfer.dto';
import { VoidCashTransferDto } from './dto/void-cash-transfer.dto';
import {
  CashTransfer,
  CashTransferReviewStatus,
} from './entities/cash-transfer.entity';

// Klien setuju mundur 7 hari khusus Biaya Operasional DAN Pindah Buku Kas
// (CLAUDE.md §3 "Biaya Operasional") — bukti/setoran akhir pekan sering baru
// diketik Senin/Selasa. Modul lain tetap default settings.backdate_max_days
// (2 hari) lewat PeriodLockValidatorService — override ini TIDAK bocor ke
// modul lain karena periodLockMaxDaysOverride hanya diisi di sini.
const BACKDATE_MAX_DAYS_OVERRIDE = 7;

const SORTABLE_COLUMNS = [
  'documentNumber',
  'transferDate',
  'createdAt',
] as const;
const SORT_COLUMN_SQL: Record<(typeof SORTABLE_COLUMNS)[number], string> = {
  documentNumber: 'ct.document_number',
  transferDate: 'ct.transfer_date',
  createdAt: 'ct.created_at',
};

export interface CreateCashTransferResult {
  cashTransfer: CashTransfer;
  journalEntry: JournalEntry;
}

export interface CashTransferListRow {
  id: string;
  documentNumber: string;
  transferDate: string;
  amount: number;
  fromCashAccountId: string;
  fromCashAccountName: string;
  toCashAccountId: string;
  toCashAccountName: string;
  note: string | null;
  postingStatus: string;
  reviewStatus: string;
  createdAt: string;
}

interface CashTransferRowSql {
  id: string;
  document_number: string;
  transfer_date: string;
  amount: string;
  from_cash_account_id: string;
  from_cash_account_name: string;
  to_cash_account_id: string;
  to_cash_account_name: string;
  note: string | null;
  posting_status: string;
  review_status: string;
  created_at: string;
}

/**
 * Pindah Buku Kas (paket R9, `docs/RENCANA_REVISI_TESTING_KLIEN.md` §3 "R9",
 * menyerap Hari 32A tugas 7). Dr akun tujuan / Cr akun asal — dua akun kas
 * milik toko sendiri, BUKAN pengeluaran ke pihak luar, sehingga SENGAJA
 * TIDAK pernah lewat StepUpService/CASH_OUTFLOW meski salah satu sisinya
 * Kas Besar (`requires_outflow_approval`). Approval-nya setelah-fakta lewat
 * `review_status` (PATCH /:id/review), pola sama Pengecekan Invoice Harian.
 */
@Injectable()
export class CashTransfersService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly accountResolverService: AccountResolverService,
    private readonly documentCounterService: DocumentCounterService,
    private readonly journalPosterService: JournalPosterService,
    private readonly voidEngineService: VoidEngineService,
    private readonly stepUpService: StepUpService,
  ) {}

  async create(
    dto: CreateCashTransferDto,
    user: AuthenticatedUser,
  ): Promise<CreateCashTransferResult> {
    if (dto.fromCashAccountId === dto.toCashAccountId) {
      throw new BadRequestException(
        'Akun kas asal dan tujuan tidak boleh sama.',
      );
    }
    await this.accountResolverService.assertAccountHasFlag(
      dto.fromCashAccountId,
      'is_cash_account',
      'Kas/Bank (asal)',
    );
    await this.accountResolverService.assertAccountHasFlag(
      dto.toCashAccountId,
      'is_cash_account',
      'Kas/Bank (tujuan)',
    );

    const transferDate = parseDateOnly(dto.transferDate);

    return this.dataSource.transaction(async (manager) => {
      const documentNumber = await this.documentCounterService.getNextNumber(
        'CASH_TRANSFER',
        transferDate,
        manager,
      );

      const cashTransfer = await manager.save(
        CashTransfer,
        manager.create(CashTransfer, {
          documentNumber,
          transferDate: dto.transferDate,
          fromCashAccountId: dto.fromCashAccountId,
          toCashAccountId: dto.toCashAccountId,
          amount: dto.amount.toFixed(2),
          note: dto.note ?? null,
          createdBy: user.sub,
        }),
      );

      const journalEntry = await this.journalPosterService.post(
        {
          entryDate: transferDate,
          description: dto.note
            ? `Pindah Buku Kas ${documentNumber} — ${dto.note}`
            : `Pindah Buku Kas ${documentNumber}`,
          sourceType: 'CASH_TRANSFER',
          sourceId: cashTransfer.id,
          createdBy: user.sub,
          periodLockMaxDaysOverride: BACKDATE_MAX_DAYS_OVERRIDE,
          lines: [
            {
              accountId: dto.toCashAccountId,
              debit: dto.amount,
              credit: 0,
              description: 'Kas masuk (Pindah Buku Kas)',
            },
            {
              accountId: dto.fromCashAccountId,
              debit: 0,
              credit: dto.amount,
              description: 'Kas keluar (Pindah Buku Kas)',
            },
          ],
        },
        manager,
      );

      return { cashTransfer, journalEntry };
    });
  }

  /**
   * VOID lewat VoidEngineService + CashTransferVoidHook, digerbangi HANYA
   * VOID_DOCUMENT (CLAUDE.md §2.13, "VOID oleh Operator wajib step-up") —
   * TIDAK ada gerbang UNLOCK_PRINT di sini karena cash_transfers tidak ikut
   * kunci cetak §2.16 (beda dari PaymentsService.voidBatch()/
   * SalesInvoicesService.voidInvoice() yang punya dua gerbang).
   */
  async voidTransfer(
    id: string,
    dto: VoidCashTransferDto,
    user: AuthenticatedUser,
    voidAuthorizationRequestId: string | undefined,
  ): Promise<CashTransfer> {
    const existing = await this.findOneEntity(id);

    const needsVoidApproval = user.role === Role.OPERATOR;
    const voidPayload = { sourceType: 'CASH_TRANSFER', sourceId: id };
    const voidContextSummary = `VOID Pindah Buku Kas ${existing.documentNumber}: ${dto.reasonNote}`;

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
        // authorizationRequestId DIJAMIN terisi kalau sampai sini — kalau
        // tidak, cabang di atas sudah melempar 412 duluan.
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
        sourceType: 'CASH_TRANSFER',
        sourceId: id,
        reasonCode: dto.reasonCode,
        reasonNote: dto.reasonNote,
        userId: user.sub,
        manager,
      });
    });

    return this.findOneEntity(id);
  }

  /**
   * Approval SETELAH-FAKTA (CLAUDE.md §3 "Biaya Operasional") — transaksi
   * sudah jalan sebelum ini dipanggil, TIDAK PERNAH lewat StepUp 412 karena
   * ini pemindahan antar kas milik sendiri, bukan pengeluaran ke pihak luar.
   * Pola sama SalesInvoicesService.review(): HANYA 4 kolom review yang
   * disentuh, tidak pernah lewat create()/VoidEngine.
   */
  async review(
    id: string,
    dto: ReviewCashTransferDto,
    user: AuthenticatedUser,
  ): Promise<CashTransfer> {
    if (
      dto.reviewStatus === CashTransferReviewStatus.BERMASALAH &&
      !dto.reviewNote?.trim()
    ) {
      throw new BadRequestException(
        'Catatan wajib diisi saat menandai Pindah Buku Kas BERMASALAH.',
      );
    }
    await this.dataSource.getRepository(CashTransfer).update(id, {
      reviewStatus: dto.reviewStatus,
      reviewNote: dto.reviewNote ?? null,
      reviewedBy: user.sub,
      reviewedAt: new Date(),
    });
    return this.findOneEntity(id);
  }

  async findAll(
    query: CashTransferQueryDto,
  ): Promise<PaginatedResult<CashTransferListRow>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'transferDate',
    );
    const sortDir = resolveSortDir(query.sortDir);

    const params: unknown[] = [];
    const whereClauses: string[] = [];
    if (query.search) {
      params.push(`%${query.search}%`);
      whereClauses.push(`ct.document_number ILIKE $${params.length}`);
    }
    if (query.dateFrom) {
      params.push(query.dateFrom);
      whereClauses.push(`ct.transfer_date >= $${params.length}`);
    }
    if (query.dateTo) {
      params.push(query.dateTo);
      whereClauses.push(`ct.transfer_date <= $${params.length}`);
    }
    if (query.date) {
      params.push(query.date);
      whereClauses.push(`ct.transfer_date = $${params.length}`);
    }
    if (query.reviewStatus) {
      params.push(query.reviewStatus);
      whereClauses.push(`ct.review_status = $${params.length}`);
    }
    const whereSql = whereClauses.length
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    const countRows: { count: string }[] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count FROM cash_transfers ct ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.count ?? 0);

    params.push(limit, (page - 1) * limit);
    const rows: CashTransferRowSql[] = await this.dataSource.query(
      `${SELECT_ROW_SQL}
       ${whereSql}
       ORDER BY ${SORT_COLUMN_SQL[sortColumn as (typeof SORTABLE_COLUMNS)[number]]} ${sortDir}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return buildPaginatedResult(rows.map(mapRow), total, page, limit);
  }

  async findOne(id: string): Promise<CashTransferListRow> {
    const rows: CashTransferRowSql[] = await this.dataSource.query(
      `${SELECT_ROW_SQL} WHERE ct.id = $1`,
      [id],
    );
    if (rows.length === 0) {
      throw new BadRequestException('Pindah Buku Kas tidak ditemukan.');
    }
    return mapRow(rows[0]);
  }

  private async findOneEntity(id: string): Promise<CashTransfer> {
    const transfer = await this.dataSource.manager.findOne(CashTransfer, {
      where: { id },
    });
    if (!transfer) {
      throw new BadRequestException('Pindah Buku Kas tidak ditemukan.');
    }
    return transfer;
  }
}

// `ct.transfer_date::text` (bukan kolom `date` polos) -- `pg` mem-parse OID
// `date` jadi objek JS `Date` di zona waktu LOKAL server, lalu serialisasi
// JSON NestJS memanggil `.toISOString()` (UTC), yang di WIB (UTC+7) mundur
// satu hari ("...T17:00:00.000Z"). Cast ke text di SQL membuat Postgres
// sendiri yang membentuk string "YYYY-MM-DD", sebelum objek Date JS pernah
// ada -- menghindari bug yang sama seperti dicatat di
// `reports/aging-bucket.util.ts` (`toIsoDate()`) dan BELUM ditambal di
// `PaymentsService.findOpenInvoices()` (PROGRESS.md §3 "Hari 30").
const SELECT_ROW_SQL = `
  SELECT ct.id, ct.document_number, ct.transfer_date::text AS transfer_date,
         ct.amount, ct.note,
         ct.from_cash_account_id, fromAcc.name AS from_cash_account_name,
         ct.to_cash_account_id, toAcc.name AS to_cash_account_name,
         ct.posting_status, ct.review_status, ct.created_at
  FROM cash_transfers ct
  JOIN chart_of_accounts fromAcc ON fromAcc.id = ct.from_cash_account_id
  JOIN chart_of_accounts toAcc ON toAcc.id = ct.to_cash_account_id
`;

function mapRow(row: CashTransferRowSql): CashTransferListRow {
  return {
    id: row.id,
    documentNumber: row.document_number,
    transferDate: row.transfer_date,
    amount: Number(row.amount),
    fromCashAccountId: row.from_cash_account_id,
    fromCashAccountName: row.from_cash_account_name,
    toCashAccountId: row.to_cash_account_id,
    toCashAccountName: row.to_cash_account_name,
    note: row.note,
    postingStatus: row.posting_status,
    reviewStatus: row.review_status,
    createdAt: row.created_at,
  };
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
