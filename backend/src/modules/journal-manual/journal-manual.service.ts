import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { JournalPosterService } from '../../core/journal-poster/journal-poster.service';
import { JournalEntry } from '../journal-entries/entities/journal-entry.entity';
import { PostManualJournalDto } from './dto/post-manual-journal.dto';

interface RestrictedAccountRow {
  id: string;
  code: string;
  name: string;
  is_inventory_account: boolean;
  is_receivable_account: boolean;
  is_payable_account: boolean;
}

/**
 * Jurnal Manual (CLAUDE.md §5: MASTER only, tapi DITOLAK untuk akun
 * Persediaan/Piutang/Hutang meski Master). Larangan ini SENGAJA tidak
 * ditaruh di JournalPosterService.post() itu sendiri — OpeningBalanceService
 * (Hari 12, sourceType OPENING_BALANCE) justru WAJIB bisa menulis ke akun
 * yang sama lewat post() yang sama. Larangan hidup satu lapis di atas, cuma
 * untuk jalur Manual Journal ini.
 */
@Injectable()
export class JournalManualService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly journalPosterService: JournalPosterService,
  ) {}

  async postManual(
    dto: PostManualJournalDto,
    userId: string,
  ): Promise<JournalEntry> {
    return this.dataSource.transaction(async (manager) => {
      await this.assertNoRestrictedAccounts(dto, manager);

      return this.journalPosterService.post(
        {
          entryDate: new Date(dto.entryDate),
          description: dto.description,
          sourceType: 'MANUAL',
          sourceId: null,
          createdBy: userId,
          lines: dto.lines,
        },
        manager,
      );
    });
  }

  private async assertNoRestrictedAccounts(
    dto: PostManualJournalDto,
    manager: EntityManager,
  ): Promise<void> {
    const uniqueIds = Array.from(
      new Set(dto.lines.map((line) => line.accountId)),
    );
    const rows: RestrictedAccountRow[] = await manager.query(
      `SELECT id, code, name, is_inventory_account, is_receivable_account, is_payable_account
       FROM chart_of_accounts WHERE id = ANY($1)`,
      [uniqueIds],
    );

    const restricted = rows.filter(
      (row) =>
        row.is_inventory_account ||
        row.is_receivable_account ||
        row.is_payable_account,
    );
    if (restricted.length > 0) {
      const names = restricted
        .map((row) => `${row.code} - ${row.name}`)
        .join(', ');
      throw new ForbiddenException(
        `Jurnal manual tidak boleh menyentuh akun Persediaan/Piutang/Hutang (${names}) — ` +
          'akun-akun ini punya sub-ledger sendiri (lot FIFO/piutang per pelanggan/hutang ' +
          'per supplier) yang akan terpisah dari buku besar tanpa diketahui kalau ditulis manual.',
      );
    }
  }
}
