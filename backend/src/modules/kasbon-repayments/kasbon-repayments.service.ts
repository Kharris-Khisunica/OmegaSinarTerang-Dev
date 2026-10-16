import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
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
import { Worker } from '../workers/entities/worker.entity';
import { CreateKasbonRepaymentDto } from './dto/create-kasbon-repayment.dto';
import { KasbonRepaymentQueryDto } from './dto/kasbon-repayment-query.dto';
import { VoidKasbonRepaymentDto } from './dto/void-kasbon-repayment.dto';
import { KasbonRepayment } from './entities/kasbon-repayment.entity';

const SORTABLE_COLUMNS = [
  'documentNumber',
  'repaymentDate',
  'createdAt',
] as const;
const SORT_COLUMN_SQL: Record<(typeof SORTABLE_COLUMNS)[number], string> = {
  documentNumber: 'kr.document_number',
  repaymentDate: 'kr.repayment_date',
  createdAt: 'kr.created_at',
};

export interface KasbonBalanceRow {
  workerId: string;
  workerCode: string;
  workerName: string;
  /** Σ baris Biaya Operasional POSTED berakun Piutang Karyawan untuk pekerja ini. */
  totalKasbon: number;
  /** Σ pelunasan POSTED. */
  totalRepaid: number;
  outstanding: number;
}

export interface KasbonRepaymentListRow {
  id: string;
  documentNumber: string;
  repaymentDate: string;
  workerId: string;
  workerName: string;
  cashAccountId: string;
  cashAccountName: string;
  amount: number;
  note: string | null;
  postingStatus: string;
  voidReasonCode: string | null;
  voidReasonNote: string | null;
  createdAt: string;
}

interface ListRowSql {
  id: string;
  document_number: string;
  repayment_date: string;
  worker_id: string;
  worker_name: string;
  cash_account_id: string;
  cash_account_name: string;
  amount: string;
  note: string | null;
  posting_status: string;
  void_reason_code: string | null;
  void_reason_note: string | null;
  created_at: string;
}

export interface CreateKasbonRepaymentResult {
  repayment: KasbonRepayment;
  journalEntry: JournalEntry;
}

/**
 * Pelunasan Kasbon (need_fixing.md #26, opsi 3a — belum dikonfirmasi ulang
 * ke klien, pola sama Payment §2.12). Kasbon dicatat sebagai baris Biaya
 * Operasional berakun Piutang Karyawan (CLAUDE.md §3) dan dilunasi SETOR
 * TUNAI ke Kas Kecil lewat dokumen ini: Kas (D) / Piutang Karyawan (K).
 *
 * Sisa kasbon per pekerja dihitung LANGSUNG dari baris sumber (bukan
 * kolom saldo yang disimpan) — satu query bersama (`balanceSql()`) dipakai
 * layar dan validasi create(), supaya keduanya tidak pernah bisa beda.
 * Backdate default settings (2 hari, §2.9) — BUKAN pengecualian 7 hari
 * Biaya Operasional/Pindah Buku Kas; pengecualian itu hanya untuk dua modul
 * yang disebut eksplisit di CLAUDE.md §0.
 */
@Injectable()
export class KasbonRepaymentsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly accountResolverService: AccountResolverService,
    private readonly documentCounterService: DocumentCounterService,
    private readonly journalPosterService: JournalPosterService,
    private readonly voidEngineService: VoidEngineService,
    private readonly stepUpService: StepUpService,
  ) {}

  async getBalances(workerId?: string): Promise<KasbonBalanceRow[]> {
    return this.queryBalances(this.dataSource.manager, workerId);
  }

  async create(
    dto: CreateKasbonRepaymentDto,
    user: AuthenticatedUser,
  ): Promise<CreateKasbonRepaymentResult> {
    await this.accountResolverService.assertAccountHasFlag(
      dto.cashAccountId,
      'is_cash_account',
      'Kas/Bank',
    );
    const worker = await this.dataSource.manager.findOne(Worker, {
      where: { id: dto.workerId },
    });
    if (!worker) {
      throw new BadRequestException('Pekerja tidak ditemukan.');
    }
    const repaymentDate = parseDateOnly(dto.repaymentDate);

    return this.dataSource.transaction(async (manager) => {
      const employeeReceivableId =
        await this.accountResolverService.resolveSingleActive(
          'is_employee_receivable_account = true',
          'Piutang Karyawan',
          manager,
        );

      // Kunci baris pekerja supaya dua setoran bersamaan untuk pekerja yang
      // sama tidak sama-sama lolos validasi sisa kasbon.
      await manager.query(`SELECT id FROM workers WHERE id = $1 FOR UPDATE`, [
        worker.id,
      ]);
      const [balance] = await this.queryBalances(manager, worker.id);
      const outstanding = balance?.outstanding ?? 0;
      if (toCents(dto.amount) > toCents(outstanding)) {
        throw new BadRequestException(
          outstanding > 0
            ? `Setoran melebihi sisa kasbon ${worker.name} (sisa Rp ${outstanding.toLocaleString('id-ID')}).`
            : `${worker.name} tidak punya sisa kasbon.`,
        );
      }

      const documentNumber = await this.documentCounterService.getNextNumber(
        'KASBON_REPAYMENT',
        repaymentDate,
        manager,
      );
      const repayment = await manager.save(
        KasbonRepayment,
        manager.create(KasbonRepayment, {
          documentNumber,
          repaymentDate: dto.repaymentDate,
          workerId: worker.id,
          cashAccountId: dto.cashAccountId,
          amount: dto.amount.toFixed(2),
          note: dto.note ?? null,
          createdBy: user.sub,
        }),
      );

      const journalEntry = await this.journalPosterService.post(
        {
          entryDate: repaymentDate,
          description: `Pelunasan kasbon ${worker.name} ${documentNumber}${dto.note ? ` — ${dto.note}` : ''}`,
          sourceType: 'KASBON_REPAYMENT',
          sourceId: repayment.id,
          createdBy: user.sub,
          lines: [
            {
              accountId: dto.cashAccountId,
              debit: dto.amount,
              credit: 0,
              description: `Setoran pelunasan kasbon ${worker.name}`,
            },
            {
              accountId: employeeReceivableId,
              debit: 0,
              credit: dto.amount,
              description: `Pelunasan kasbon ${worker.name}`,
            },
          ],
        },
        manager,
      );

      return { repayment, journalEntry };
    });
  }

  /** VOID — hanya VOID_DOCUMENT untuk OPERATOR (§2.13), pola voidTransfer(). */
  async voidRepayment(
    id: string,
    dto: VoidKasbonRepaymentDto,
    user: AuthenticatedUser,
    voidAuthorizationRequestId: string | undefined,
  ): Promise<KasbonRepaymentListRow> {
    const existing = await this.findOne(id);
    const needsVoidApproval = user.role === Role.OPERATOR;
    const voidPayload = { sourceType: 'KASBON_REPAYMENT', sourceId: id };
    const voidContextSummary = `VOID Pelunasan Kasbon ${existing.documentNumber} — ${existing.workerName} Rp ${existing.amount.toLocaleString('id-ID')}: ${dto.reasonNote}`;

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
        sourceType: 'KASBON_REPAYMENT',
        sourceId: id,
        reasonCode: dto.reasonCode,
        reasonNote: dto.reasonNote,
        userId: user.sub,
        manager,
      });
    });

    return this.findOne(id);
  }

  async findAll(
    query: KasbonRepaymentQueryDto,
  ): Promise<PaginatedResult<KasbonRepaymentListRow>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'repaymentDate',
    );
    const sortDir = resolveSortDir(query.sortDir);

    const params: unknown[] = [];
    const where: string[] = [];
    if (query.search) {
      params.push(`%${query.search}%`);
      where.push(
        `(kr.document_number ILIKE $${params.length} OR w.name ILIKE $${params.length})`,
      );
    }
    if (query.dateFrom) {
      params.push(query.dateFrom);
      where.push(`kr.repayment_date >= $${params.length}`);
    }
    if (query.dateTo) {
      params.push(query.dateTo);
      where.push(`kr.repayment_date <= $${params.length}`);
    }
    if (query.workerId) {
      params.push(query.workerId);
      where.push(`kr.worker_id = $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRows: { count: string }[] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count FROM kasbon_repayments kr
       JOIN workers w ON w.id = kr.worker_id ${whereSql}`,
      params,
    );
    params.push(limit, (page - 1) * limit);
    const rows: ListRowSql[] = await this.dataSource.query(
      `${SELECT_ROW_SQL} ${whereSql}
       ORDER BY ${SORT_COLUMN_SQL[sortColumn as (typeof SORTABLE_COLUMNS)[number]]} ${sortDir}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return buildPaginatedResult(
      rows.map(mapRow),
      Number(countRows[0]?.count ?? 0),
      page,
      limit,
    );
  }

  async findOne(id: string): Promise<KasbonRepaymentListRow> {
    const rows: ListRowSql[] = await this.dataSource.query(
      `${SELECT_ROW_SQL} WHERE kr.id = $1`,
      [id],
    );
    if (rows.length === 0) {
      throw new BadRequestException('Pelunasan kasbon tidak ditemukan.');
    }
    return mapRow(rows[0]);
  }

  private async queryBalances(
    manager: EntityManager,
    workerId?: string,
  ): Promise<KasbonBalanceRow[]> {
    const params: unknown[] = [];
    let workerFilter = '';
    if (workerId) {
      params.push(workerId);
      workerFilter = `AND w.id = $1`;
    }
    const rows: {
      worker_id: string;
      worker_code: string;
      worker_name: string;
      total_kasbon: string;
      total_repaid: string;
    }[] = await manager.query(
      `SELECT w.id AS worker_id, w.code AS worker_code, w.name AS worker_name,
              COALESCE(k.total, 0) AS total_kasbon,
              COALESCE(r.total, 0) AS total_repaid
       FROM workers w
       LEFT JOIN (
         SELECT oel.worker_id, SUM(oel.amount) AS total
         FROM operational_expense_lines oel
         JOIN chart_of_accounts coa ON coa.id = oel.expense_account_id
         WHERE oel.posting_status = 'POSTED'
           AND coa.is_employee_receivable_account = true
           AND oel.worker_id IS NOT NULL
         GROUP BY oel.worker_id
       ) k ON k.worker_id = w.id
       LEFT JOIN (
         SELECT worker_id, SUM(amount) AS total
         FROM kasbon_repayments
         WHERE posting_status = 'POSTED'
         GROUP BY worker_id
       ) r ON r.worker_id = w.id
       WHERE (k.total IS NOT NULL OR r.total IS NOT NULL) ${workerFilter}
       ORDER BY w.name`,
      params,
    );
    return rows.map((r) => {
      const totalKasbon = Number(r.total_kasbon);
      const totalRepaid = Number(r.total_repaid);
      return {
        workerId: r.worker_id,
        workerCode: r.worker_code,
        workerName: r.worker_name,
        totalKasbon,
        totalRepaid,
        outstanding: fromCents(toCents(totalKasbon) - toCents(totalRepaid)),
      };
    });
  }
}

// `repayment_date::text` — hindari pergeseran timezone kolom DATE (pola
// cash-transfers.service.ts SELECT_ROW_SQL).
const SELECT_ROW_SQL = `
  SELECT kr.id, kr.document_number, kr.repayment_date::text AS repayment_date,
         kr.worker_id, w.name AS worker_name,
         kr.cash_account_id, coa.name AS cash_account_name,
         kr.amount, kr.note, kr.posting_status,
         kr.void_reason_code, kr.void_reason_note, kr.created_at
  FROM kasbon_repayments kr
  JOIN workers w ON w.id = kr.worker_id
  JOIN chart_of_accounts coa ON coa.id = kr.cash_account_id
`;

function mapRow(r: ListRowSql): KasbonRepaymentListRow {
  return {
    id: r.id,
    documentNumber: r.document_number,
    repaymentDate: r.repayment_date,
    workerId: r.worker_id,
    workerName: r.worker_name,
    cashAccountId: r.cash_account_id,
    cashAccountName: r.cash_account_name,
    amount: Number(r.amount),
    note: r.note,
    postingStatus: r.posting_status,
    voidReasonCode: r.void_reason_code,
    voidReasonNote: r.void_reason_note,
    createdAt: r.created_at,
  };
}

function toCents(value: number): number {
  return Math.round(value * 100);
}
function fromCents(cents: number): number {
  return cents / 100;
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
