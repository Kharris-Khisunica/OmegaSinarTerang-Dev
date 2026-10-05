import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from './entities/setting.entity';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Setting])],
  controllers: [SettingsController],
  providers: [SettingsService],
  // Diekspor Hari 30 — ReceivablesReportService/PayablesReportService (modul
  // reports) membaca aging_bucket_days lewat SettingsService, bukan raw query
  // baru ke tabel settings.
  exports: [SettingsService],
})
export class SettingsModule {}
