import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AUDIT_KEY, AuditMeta } from '../decorators/audit.decorator';
import { AuditService } from '../audit.service';

interface RequestWithAudit extends Request {
  user?: { sub: string };
  auditUserId?: string;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta | undefined>(
      AUDIT_KEY,
      context.getHandler(),
    );
    if (!meta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithAudit>();

    return next.handle().pipe(
      tap((responseBody: unknown) => {
        const userId = request.auditUserId ?? request.user?.sub ?? null;

        this.auditService
          .record({
            userId,
            action: meta.action,
            entity: meta.entity,
            entityId: this.extractEntityId(responseBody),
            before: request.body,
            after: responseBody,
            ip: request.ip ?? null,
          })
          .catch((error: unknown) => {
            // Kegagalan mencatat audit tidak boleh menggagalkan response ke client.
            console.error('Gagal mencatat audit log', error);
          });
      }),
    );
  }

  private extractEntityId(body: unknown): string | null {
    if (body && typeof body === 'object') {
      if ('id' in body && typeof (body as { id?: unknown }).id === 'string') {
        return (body as { id: string }).id;
      }
      if ('user' in body) {
        const user = (body as { user?: { id?: unknown } }).user;
        if (user && typeof user === 'object' && typeof user.id === 'string') {
          return user.id;
        }
      }
    }
    return null;
  }
}
