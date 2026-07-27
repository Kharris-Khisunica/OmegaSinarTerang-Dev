import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Role } from '../../../common/enums/role.enum';
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface';
import { AuthorizationRequestsService } from '../authorization-requests.service';
import { STEP_UP_KEY } from '../decorators/requires-step-up.decorator';
import { StepUpNotReadyError } from '../step-up-not-ready.error';

/**
 * Global (dipasang APP_GUARD), tapi no-op selama handler tidak dipasangi
 * @RequiresStepUp(...) — pola yang sama seperti RolesGuard terhadap @Roles().
 * Hanya OPERATOR yang kena wajib step-up (CLAUDE.md §13); MASTER/SUPERVISOR
 * lolos langsung kalau memang punya akses ke endpoint itu (diatur RolesGuard).
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

    if (!authorizationRequestId) {
      const created = await this.authorizationRequestsService.create(user, {
        actionType,
        payload: { params: request.params, body: request.body as unknown },
        reason: 'Menunggu persetujuan Supervisor/Master (step-up otomatis).',
      });
      throw new HttpException(
        {
          requiresAuthorization: true,
          authorizationRequestId: created.id,
          message: 'Aksi ini butuh persetujuan Supervisor atau Master.',
        },
        HttpStatus.PRECONDITION_REQUIRED,
      );
    }

    try {
      await this.authorizationRequestsService.consumeApproval(
        authorizationRequestId,
        user,
        actionType,
      );
      return true;
    } catch (err) {
      if (err instanceof StepUpNotReadyError) {
        throw new HttpException(
          {
            requiresAuthorization: true,
            authorizationRequestId,
            message: err.message,
          },
          HttpStatus.PRECONDITION_REQUIRED,
        );
      }
      throw err;
    }
  }
}
