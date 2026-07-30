import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Role } from '../../../common/enums/role.enum';
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface';
import { AuthorizationRequestsService } from '../authorization-requests.service';
import { STEP_UP_KEY } from '../decorators/requires-step-up.decorator';
import { StepUpNotReadyError } from '../step-up-not-ready.error';
import { stepUpRequiredException } from '../step-up-response';

/**
 * Global (dipasang APP_GUARD), tapi no-op selama handler tidak dipasangi
 * @RequiresStepUp(...) — pola yang sama seperti RolesGuard terhadap @Roles().
 * Hanya OPERATOR yang kena wajib step-up (CLAUDE.md §13); MASTER/SUPERVISOR
 * lolos langsung kalau memang punya akses ke endpoint itu (diatur RolesGuard).
 *
 * Ini jalur GENERIK berbasis HTTP request (tidak tahu konteks bisnis apa pun)
 * — dipakai untuk aksi yang syarat step-up-nya cukup "role OPERATOR + endpoint
 * ini". Untuk aksi yang syaratnya bergantung pada ISI transaksi (nominal,
 * status dokumen, dst — mis. pengeluaran kas di atas ambang), pakai
 * StepUpService.requireApproval() dari DALAM service (src/core/step-up),
 * yang melempar response 412 identik lewat helper yang sama
 * (stepUpRequiredException) supaya frontend tetap satu jalur penanganan.
 */
@Injectable()
export class StepUpGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationRequestsService: AuthorizationRequestsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const actionType = this.reflector.getAllAndOverride<string | undefined>(
      STEP_UP_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!actionType) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user || user.role !== Role.OPERATOR) {
      return true;
    }

    const headerId = request.headers['x-authorization-request-id'];
    const authorizationRequestId = Array.isArray(headerId)
      ? headerId[0]
      : headerId;
    const payload = { params: request.params, body: request.body as unknown };

    if (!authorizationRequestId) {
      const created = await this.authorizationRequestsService.create(user, {
        actionType,
        payload,
        contextSummary: `${actionType} — permintaan step-up otomatis (${request.method} ${request.originalUrl}).`,
        reason: 'Menunggu persetujuan Supervisor/Master (step-up otomatis).',
      });
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
      );
      return true;
    } catch (err) {
      if (err instanceof StepUpNotReadyError) {
        throw stepUpRequiredException(authorizationRequestId, err.message);
      }
      throw err;
    }
  }
}
