import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { ActionType } from '../../modules/authorization-requests/action-type.enum';
import { AuthenticatedUser } from '../../modules/auth/types/jwt-payload.interface';
import { StepUpService } from '../step-up/step-up.service';
import { assertPrintLockTable, PrintLockTable } from './print-lock-tables';

export type PrintLockIntent = 'EDIT' | 'VOID';

interface PrintLockDocRef {
  table: PrintLockTable;
  /** sourceType dipakai identik dengan stock_movements/journal_entries (mis. 'PURCHASE_INVOICE') — payload UNLOCK_PRINT memakai nilai yang sama supaya satu kontrak sourceId dipahami di seluruh sistem. */
  sourceType: string;
  documentId: string;
}

export interface RegisterPrintResult {
  printCount: number;
  revisionNumber: number;
  postingStatus: string;
  printStatus: string;
}

interface PreflightParams extends PrintLockDocRef {
  documentLabel: string;
  intent: PrintLockIntent;
  reason: string | undefined;
  user: AuthenticatedUser;
  authorizationRequestId?: string;
}

interface ConsumeParams extends PrintLockDocRef {
  documentLabel: string;
  intent: PrintLockIntent;
  reason: string | undefined;
  user: AuthenticatedUser;
  authorizationRequestId?: string;
  manager: EntityManager;
}

/**
 * Mekanisme kunci-cetak generik (CLAUDE.md §2.16) — satu mekanisme, tujuh
 * pemakai (JL/B1/GD/SJ/RJ/RB/PAY). Bekerja lewat raw SQL terhadap kontrak
 * kolom bersama (lihat print-lock-tables.ts), pola sama
 * StockRecorderService.getLatestCostBasis/reverseIn yang juga raw-SQL untuk
 * operasi lintas-tabel generik dan juga meng-inject DataSource langsung
 * untuk operasi baca di luar transaction pemanggil — supaya modul dokumen
 * baru (Hari 16-27) tinggal memanggil service ini begitu tabelnya ada, tanpa
 * entity/repository bertipe generic yang rumit.
 *
 * Tiga sumbu status TIDAK PERNAH dicampur: service ini HANYA menyentuh
 * print_status/print_count/printed_at/revision_number. posting_status
 * (VOID) tetap tanggung jawab VoidEngineService/VoidHook modul masing-
 * masing — dipanggil belakangan oleh service dokumen setelah consume()
 * berhasil, bukan oleh PrintLockService.
 */
@Injectable()
export class PrintLockService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly stepUpService: StepUpService,
  ) {}

  /**
   * Cetak ulang identik — bebas, tanpa izin (CLAUDE.md §2.16). Tidak menolak
   * dokumen VOIDED (boleh dicetak ulang untuk arsip) — watermark VOID adalah
   * urusan render nota, bukan backend; caller cukup baca postingStatus dari
   * hasil ini. print_count masuk audit_logs lewat @Audit('PRINT', ...) di
   * controller pemanggil (interceptor global), bukan lewat AuditService di
   * sini.
   */
  async registerPrint(
    ref: PrintLockDocRef,
    manager?: EntityManager,
  ): Promise<RegisterPrintResult> {
    assertPrintLockTable(ref.table);
    const runner = manager ?? this.dataSource.manager;
    // UPDATE ... RETURNING lewat query() mentah mengembalikan tuple
    // [rows, rowCount] (khusus UPDATE/DELETE — beda dari SELECT/INSERT yang
    // langsung mengembalikan rows), lihat PostgresQueryRunner.query().
    const [rows]: [
      {
        print_count: number;
        revision_number: number;
        posting_status: string;
        print_status: string;
      }[],
      number,
    ] = await runner.query(
      `UPDATE ${ref.table}
       SET print_count = print_count + 1, print_status = 'PRINTED', printed_at = now()
       WHERE id = $1
       RETURNING print_count, revision_number, posting_status, print_status`,
      [ref.documentId],
    );
    if (rows.length === 0) {
      throw new BadRequestException('Dokumen tidak ditemukan untuk dicetak.');
    }
    return {
      printCount: rows[0].print_count,
      revisionNumber: rows[0].revision_number,
      postingStatus: rows[0].posting_status,
      printStatus: rows[0].print_status,
    };
  }

  /**
   * WAJIB dipanggil SEBELUM transaction dibuka (pola identik
   * WarehouseMutationsService.create() untuk BS_TO_STORE) — kalau dokumen
   * PRINTED dan belum ada authorizationRequestId, StepUpService.
   * requireApproval() membuat baris authorization_requests baru lalu
   * melempar 412; baris itu TIDAK BOLEH ikut rollback transaction pemanggil,
   * jadi panggilan ini murni tanpa EntityManager transactional (baca lewat
   * this.dataSource.manager langsung, tanpa lock — hanya untuk keputusan
   * awal, dikonfirmasi ulang dengan FOR UPDATE di consume()). Kalau dokumen
   * belum pernah dicetak, atau authorizationRequestId sudah dibawa pemanggil,
   * method ini resolve tanpa efek — konsumsi sungguhan terjadi di consume().
   */
  async preflight(params: PreflightParams): Promise<void> {
    assertPrintLockTable(params.table);
    const printStatus = await this.readPrintStatus(
      params.table,
      params.documentId,
    );
    if (printStatus !== 'PRINTED') {
      return;
    }
    if (params.authorizationRequestId) {
      return;
    }
    if (!params.reason || params.reason.trim().length === 0) {
      throw new BadRequestException(
        'Alasan wajib diisi untuk membatalkan cetak dokumen yang sudah dicetak.',
      );
    }
    await this.stepUpService.requireApproval({
      user: params.user,
      actionType: ActionType.UNLOCK_PRINT,
      payload: this.buildPayload(params),
      contextSummary: this.buildContextSummary(params),
    });
  }

  /**
   * WAJIB dipanggil DI DALAM transaction dokumen (manager wajib). Kalau
   * dokumen belum pernah dicetak, no-op — edit/VOID dokumen yang belum
   * dicetak bebas tanpa approval apa pun (CLAUDE.md §2.16 literal). Kalau
   * PRINTED, mengonsumsi approval (atomic dengan sisa transaction, pola sama
   * BS_TO_STORE) lalu memindahkan print_status -> PRINT_CANCELLED dan
   * menaikkan revision_number HANYA untuk intent EDIT (VOID membuat dokumen
   * VOIDED, tidak pernah "direvisi").
   */
  async consume(params: ConsumeParams): Promise<void> {
    assertPrintLockTable(params.table);
    const rows: { print_status: string }[] = await params.manager.query(
      `SELECT print_status FROM ${params.table} WHERE id = $1 FOR UPDATE`,
      [params.documentId],
    );
    if (rows.length === 0) {
      throw new BadRequestException('Dokumen tidak ditemukan.');
    }
    if (rows[0].print_status !== 'PRINTED') {
      return;
    }
    if (!params.reason || params.reason.trim().length === 0) {
      throw new BadRequestException(
        'Alasan wajib diisi untuk membatalkan cetak dokumen yang sudah dicetak.',
      );
    }

    await this.stepUpService.requireApproval({
      user: params.user,
      actionType: ActionType.UNLOCK_PRINT,
      payload: this.buildPayload(params),
      contextSummary: this.buildContextSummary(params),
      authorizationRequestId: params.authorizationRequestId,
      manager: params.manager,
    });

    await params.manager.query(
      `UPDATE ${params.table}
       SET print_status = 'PRINT_CANCELLED',
           revision_number = revision_number + CASE WHEN $2 = 'EDIT' THEN 1 ELSE 0 END
       WHERE id = $1`,
      [params.documentId, params.intent],
    );
  }

  private buildPayload(ref: PrintLockDocRef & { intent: PrintLockIntent }) {
    return {
      sourceType: ref.sourceType,
      sourceId: ref.documentId,
      intent: ref.intent,
    };
  }

  private buildContextSummary(params: PreflightParams | ConsumeParams): string {
    const action = params.intent === 'EDIT' ? 'edit' : 'VOID';
    return `Batal cetak ${params.documentLabel} untuk ${action}: ${params.reason}`;
  }

  private async readPrintStatus(
    table: PrintLockTable,
    documentId: string,
  ): Promise<string> {
    const rows: { print_status: string }[] = await this.dataSource.query(
      `SELECT print_status FROM ${table} WHERE id = $1`,
      [documentId],
    );
    if (rows.length === 0) {
      throw new BadRequestException('Dokumen tidak ditemukan.');
    }
    return rows[0].print_status;
  }
}
