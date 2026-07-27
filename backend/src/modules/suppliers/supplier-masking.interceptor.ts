import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Role } from '../../common/enums/role.enum';
import { PaginatedResult } from '../../common/pagination';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { Supplier } from './entities/supplier.entity';
import { isSupplierShaped, maskSupplier } from './supplier-masking';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

/**
 * Masking dilakukan di response (bukan query) supaya tidak ada jalur bocor
 * lain (search, export, dsb) — lihat CLAUDE.md §3. Berlaku di seluruh
 * controller Suppliers, untuk semua bentuk response (single, list {data,meta}).
 */
@Injectable()
export class SupplierMaskingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const isOperator = request.user?.role === Role.OPERATOR;

    return next.handle().pipe(
      map((body: unknown) => {
        if (!isOperator) {
          return body;
        }

        if (isSupplierShaped(body)) {
          return maskSupplier(body);
        }

        if (isPaginatedSuppliers(body)) {
          return {
            ...body,
            data: body.data.map((row) => maskSupplier(row)),
          };
        }

        return body;
      }),
    );
  }
}

function isPaginatedSuppliers(
  value: unknown,
): value is PaginatedResult<Supplier> {
  return (
    !!value &&
    typeof value === 'object' &&
    'data' in value &&
    Array.isArray((value as PaginatedResult<Supplier>).data)
  );
}
