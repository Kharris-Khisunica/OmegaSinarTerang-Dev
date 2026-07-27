import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthenticatedUser } from '../../modules/auth/types/jwt-payload.interface';
import { ExportService } from './export.service';
import { ExportableResponse } from './export.types';

type ExportFormat = 'xlsx' | 'pdf';

const CONTENT_TYPES: Record<ExportFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

/**
 * Dipasang di endpoint laporan mana pun (lewat @UseInterceptors(ExportInterceptor)).
 * Handler tetap mengembalikan JSON biasa { rows, columns, meta } — kalau request
 * datang tanpa ?format= (atau format lain), respons JSON diteruskan apa adanya.
 * Cuma ketika ?format=xlsx|pdf, hasilnya diubah jadi Buffer file dan header
 * response diganti supaya browser men-download-nya.
 */
@Injectable()
export class ExportInterceptor implements NestInterceptor {
  constructor(private readonly exportService: ExportService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const rawFormat = (request.query as Record<string, unknown> | undefined)
      ?.format;
    const format = (
      typeof rawFormat === 'string' ? rawFormat : ''
    ).toLowerCase();

    if (format !== 'xlsx' && format !== 'pdf') {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      switchMap(async (result: ExportableResponse) => {
        const title = result.meta?.title ?? 'Laporan';
        const meta = {
          title,
          subtitle: result.meta?.subtitle,
          filters: result.meta?.filters,
          printedBy: request.user?.username ?? 'sistem',
          printedAt: new Date(),
        };

        const buffer =
          format === 'xlsx'
            ? await this.exportService.exportToExcel(
                result.rows,
                result.columns,
                meta,
              )
            : await this.exportService.exportToPdf(
                result.rows,
                result.columns,
                meta,
              );

        response.set({
          'Content-Type': CONTENT_TYPES[format],
          'Content-Disposition': `attachment; filename="${buildFilename(title, format)}"`,
        });

        return buffer;
      }),
    );
  }
}

function buildFilename(title: string, format: ExportFormat): string {
  const slug =
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'laporan';
  const stamp = new Date().toISOString().slice(0, 10);
  return `${slug}-${stamp}.${format}`;
}
