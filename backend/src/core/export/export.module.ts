import { Module } from '@nestjs/common';
import { ExportInterceptor } from './export.interceptor';
import { ExportService } from './export.service';

@Module({
  providers: [ExportService, ExportInterceptor],
  exports: [ExportService, ExportInterceptor],
})
export class ExportModule {}
