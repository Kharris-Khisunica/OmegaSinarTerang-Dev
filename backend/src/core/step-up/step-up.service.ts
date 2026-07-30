import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ActionType } from '../../modules/authorization-requests/action-type.enum';
import { AuthorizationRequestsService } from '../../modules/authorization-requests/authorization-requests.service';
import { StepUpNotReadyError } from '../../modules/authorization-requests/step-up-not-ready.error';
import { stepUpRequiredException } from '../../modules/authorization-requests/step-up-response';
import { AuthenticatedUser } from '../../modules/auth/types/jwt-payload.interface';

export interface RequireApprovalParams {
  user: AuthenticatedUser;
  actionType: ActionType;
  /** Isi transaksi yang menentukan aksi ini — WAJIB cocok persis dengan yang disetujui saat dieksekusi (CLAUDE.md §19). */
  payload: Record<string, unknown>;
  /** Kalimat yang dibaca Supervisor/Master di layar approval, mis. "VOID faktur JL/RM01-26070042 ke Toko Makmur, Rp 4.250.000". */
  contextSummary: string;
  /** Nilai header `x-authorization-request-id` dari request yang sedang dieksekusi, kalau operator sudah punya approval. */
  authorizationRequestId?: string;
  /** EntityManager transaction pemanggil, supaya konsumsi approval ikut rollback bareng aksi bisnisnya (CLAUDE.md §6). */
  manager?: EntityManager;
}

/**
 * Dipanggil DARI DALAM service bisnis (bukan guard) untuk aksi yang syarat
 * step-up-nya bergantung pada ISI transaksi, bukan sekadar role — mis.
 * pengeluaran kas di atas ambang (CLAUDE.md §5), VOID dokumen, batas jual di
 * bawah harga pokok. Melempar HttpException 412 dengan kontrak response
 * IDENTIK dengan StepUpGuard (lewat helper stepUpRequiredException() yang
 * sama persis) supaya frontend cukup punya satu jalur penanganan untuk
 * kedua sumber step-up ini.
 *
 * Belum ada pemanggil produksi hari ini (Hari 9) — pemanggil pertama
 * menyusul Hari 13 (BS->STORE), 15 (UNLOCK_PRINT), 17 (CASH_OUTFLOW), 21
 * (SELL_BELOW_COST/VOID_DOCUMENT). Dibuat sekarang meski begitu, sama seperti
 * ArAccountResolverService (Hari 8) dan pola stateless DocumentCounterService
 * — "buat sekarang meski baru satu pemanggil (test)".
 */
@Injectable()
export class StepUpService {
  constructor(
    private readonly authorizationRequestsService: AuthorizationRequestsService,
  ) {}

  async requireApproval(params: RequireApprovalParams): Promise<void> {
    const {
      user,
      actionType,
      payload,
      contextSummary,
      authorizationRequestId,
      manager,
    } = params;

    if (!authorizationRequestId) {
      const created = await this.authorizationRequestsService.create(
        user,
        {
          actionType,
          payload,
          contextSummary,
          reason: contextSummary,
        },
        manager,
      );
      throw stepUpRequiredException(
        created.id,
        'Aksi ini butuh persetujuan Supervisor atau Master.',
      );
    }

    try {
      await this.authorizationRequestsService.consumeApproval(
        authorizationRequestId,
        user,
        actionType,
        payload,
        manager,
      );
    } catch (err) {
      if (err instanceof StepUpNotReadyError) {
        throw stepUpRequiredException(authorizationRequestId, err.message);
      }
      throw err;
    }
  }
}
