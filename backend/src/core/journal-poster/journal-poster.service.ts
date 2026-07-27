import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { DocumentCounterService } from '../document-counter/document-counter.service';
import { PostJournalDto, PostJournalLineDto } from './dto/post-journal.dto';
import { JournalEntryLine } from '../../modules/journal-entries/entities/journal-entry-line.entity';
import { JournalEntry } from '../../modules/journal-entries/entities/journal-entry.entity';

/**
 * Satu-satunya jalur resmi menulis jurnal (CLAUDE.md §2.6). WAJIB dipanggil
 * dengan EntityManager dari transaction pemanggil — service ini sendiri
 * TIDAK PERNAH membuka transaction (§2.3: stok+jurnal harus satu DB
 * transaction dengan operasi lain di pemanggil, mis. StockRecorder).
 *
 * Urutan validasi sengaja: struktur baris dulu (murah, tanpa query DB) baru
 * validasi yang butuh DB (backdate butuh settings, akun butuh chart_of_accounts).
 * `entry_number` (DocumentCounterService) BARU diambil setelah SEMUA validasi
 * lolos — supaya percobaan posting yang gagal tidak pernah menaikkan
 * `document_counters` sama sekali (bukan cuma "di-rollback").
 */
@Injectable()
export class JournalPosterService {
  constructor(
    private readonly documentCounterService: DocumentCounterService,
  ) {}

  async post(
    dto: PostJournalDto,
    manager: EntityManager,
  ): Promise<JournalEntry> {
    this.validateMinLines(dto.lines);
    this.validateLineSides(dto.lines);
    this.validateBalance(dto.lines);
    await this.validateBackdate(dto.entryDate, manager);
    await this.validateAccountsActive(dto.lines, manager);

    const entryNumber = await this.documentCounterService.getNextNumber(
      'JOURNAL_ENTRY',
      dto.entryDate,
      manager,
    );

    const entry = manager.create(JournalEntry, {
      entryNumber,
      entryDate: toDateOnlyString(dto.entryDate),
      description: dto.description ?? null,
      sourceType: dto.sourceType,
      sourceId: dto.sourceId ?? null,
      isReversal: false,
      reversedEntryId: null,
      createdBy: dto.createdBy,
    });
    const savedEntry = await manager.save(JournalEntry, entry);

    const lines = dto.lines.map((line, index) =>
      manager.create(JournalEntryLine, {
        journalEntryId: savedEntry.id,
        accountId: line.accountId,
        debitAmount: line.debit.toFixed(2),
        creditAmount: line.credit.toFixed(2),
        description: line.description ?? null,
        lineOrder: index + 1,
      }),
    );
    await manager.save(JournalEntryLine, lines);

    const result = await manager.findOne(JournalEntry, {
      where: { id: savedEntry.id },
      relations: { lines: true },
      order: { lines: { lineOrder: 'ASC' } },
    });
    if (!result) {
      throw new BadRequestException('Gagal membuat jurnal.');
    }
    return result;
  }

  private validateMinLines(lines: PostJournalLineDto[]): void {
    if (!lines || lines.length < 2) {
      throw new BadRequestException('Jurnal minimal harus punya 2 baris.');
    }
  }

  private validateLineSides(lines: PostJournalLineDto[]): void {
    lines.forEach((line, index) => {
      if (line.debit < 0 || line.credit < 0) {
        throw new BadRequestException(
          `Baris ${index + 1}: debit/kredit tidak boleh negatif.`,
        );
      }
      const hasDebit = line.debit > 0;
      const hasCredit = line.credit > 0;
      if (hasDebit === hasCredit) {
        throw new BadRequestException(
          `Baris ${index + 1}: harus mengisi tepat salah satu, debit atau kredit (tidak boleh kosong dua-duanya atau terisi dua-duanya).`,
        );
      }
    });
  }

  private validateBalance(lines: PostJournalLineDto[]): void {
    // Dibandingkan sebagai integer sen — hindari float (mis. 0.1 + 0.2 !== 0.3).
    const totalDebitCents = lines.reduce(
      (sum, line) => sum + Math.round(line.debit * 100),
      0,
    );
    const totalCreditCents = lines.reduce(
      (sum, line) => sum + Math.round(line.credit * 100),
      0,
    );
    if (totalDebitCents !== totalCreditCents) {
      throw new BadRequestException(
        `Jurnal tidak balance: total debit Rp${(totalDebitCents / 100).toFixed(2)} tidak sama dengan total kredit Rp${(totalCreditCents / 100).toFixed(2)}.`,
      );
    }
  }

  private async validateBackdate(
    entryDate: Date,
    manager: EntityManager,
  ): Promise<void> {
    const rows: { value: string }[] = await manager.query(
      `SELECT value FROM settings WHERE key = 'backdate_max_days'`,
    );
    const maxDays = rows[0] ? Number(rows[0].value) : 2;

    const today = startOfUtcDay(new Date());
    const target = startOfUtcDay(entryDate);
    const diffDays = Math.round(
      (today.getTime() - target.getTime()) / 86_400_000,
    );

    if (diffDays < 0) {
      throw new BadRequestException(
        'Tanggal jurnal tidak boleh di masa depan.',
      );
    }
    if (diffDays > maxDays) {
      throw new BadRequestException(
        `Tanggal jurnal maksimal mundur ${maxDays} hari dari hari ini.`,
      );
    }
  }

  private async validateAccountsActive(
    lines: PostJournalLineDto[],
    manager: EntityManager,
  ): Promise<void> {
    const uniqueIds = Array.from(new Set(lines.map((line) => line.accountId)));
    const rows: { id: string; is_active: boolean }[] = await manager.query(
      `SELECT id, is_active FROM chart_of_accounts WHERE id = ANY($1)`,
      [uniqueIds],
    );

    const foundIds = new Set(rows.map((row) => row.id));
    const missing = uniqueIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Akun tidak ditemukan: ${missing.join(', ')}.`,
      );
    }

    const inactive = rows.filter((row) => !row.is_active).map((row) => row.id);
    if (inactive.length > 0) {
      throw new BadRequestException(
        `Akun tidak aktif tidak boleh dipakai untuk jurnal: ${inactive.join(', ')}.`,
      );
    }
  }
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function toDateOnlyString(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
