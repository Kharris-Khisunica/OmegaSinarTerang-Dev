import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { DocumentCounterService } from '../document-counter/document-counter.service';
import { PeriodLockValidatorService } from '../period-lock/period-lock-validator.service';
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
    private readonly periodLockValidatorService: PeriodLockValidatorService,
  ) {}

  async post(
    dto: PostJournalDto,
    manager: EntityManager,
  ): Promise<JournalEntry> {
    this.validateMinLines(dto.lines);
    this.validateLineSides(dto.lines);
    this.validateBalance(dto.lines);
    if (dto.sourceType === 'OPENING_BALANCE') {
      // Pengecualian bernama satu-satunya (CLAUDE.md §3 "Saldo Awal") —
      // tanggalnya sudah divalidasi OpeningBalanceService lewat
      // PeriodLockValidatorService.assertOpeningBalanceDate() SEBELUM
      // memanggil post() ini. Tidak melonggarkan validate() untuk
      // sourceType lain mana pun.
    } else {
      await this.periodLockValidatorService.validate(
        dto.entryDate,
        manager,
        dto.periodLockMaxDaysOverride,
      );
    }
    await this.validateAccountsActive(dto.lines, manager);
    await this.validateAccountsPostable(dto.lines, manager);

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
      isReversal: dto.isReversal ?? false,
      reversedEntryId: dto.reversedEntryId ?? null,
      voidReasonCode: dto.voidReasonCode ?? null,
      voidReasonNote: dto.voidReasonNote ?? null,
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
        customerId: line.customerId ?? null,
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

  /**
   * Entry AKTIF (belum pernah dibalik) untuk satu sourceType+sourceId —
   * dipakai VoidEngineService DAN DocumentReviseService (paket R6) untuk
   * menemukan jurnal mana yang harus dibalik sekarang. TIDAK CUKUP mencari
   * `isReversal=false` + `sourceType/sourceId` saja (sebelum revisi ada,
   * itu selalu unik) — begitu sebuah dokumen sudah direvisi sekali, ada DUA
   * baris begitu (entry asli + entry posting-ulang), keduanya isReversal=
   * false dan sourceType/sourceId sama. Yang benar adalah entry yang BELUM
   * punya baris lain menunjuknya lewat reversed_entry_id — itulah definisi
   * "masih berlaku sekarang", tidak peduli sudah berapa kali direvisi.
   */
  async findActiveEntry(
    sourceType: string,
    sourceId: string,
    manager: EntityManager,
  ): Promise<JournalEntry | null> {
    const rows: { id: string }[] = await manager.query(
      `SELECT je.id FROM journal_entries je
       WHERE je.source_type = $1 AND je.source_id = $2 AND je.is_reversal = false
         AND NOT EXISTS (
           SELECT 1 FROM journal_entries r WHERE r.reversed_entry_id = je.id
         )
       ORDER BY je.created_at DESC
       LIMIT 1`,
      [sourceType, sourceId],
    );
    if (rows.length === 0) {
      return null;
    }
    return manager.findOne(JournalEntry, {
      where: { id: rows[0].id },
      relations: { lines: true },
      order: { lines: { lineOrder: 'ASC' } },
    });
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

  // Validasi KEENAM (Hari 17A, COA_USULAN §7.3) — menambah lima yang
  // terkunci di CLAUDE.md §2.6, memperketat bukan melonggarkan. Header
  // (Grup/Kategori, is_postable=false) tidak boleh dijurnal: kalau operator
  // bisa menjurnal ke akun header, saldo menumpuk di induk dan rincian di
  // anaknya tidak lagi menjelaskan apa-apa (COA_USULAN §2).
  private async validateAccountsPostable(
    lines: PostJournalLineDto[],
    manager: EntityManager,
  ): Promise<void> {
    const uniqueIds = Array.from(new Set(lines.map((line) => line.accountId)));
    const rows: { id: string; code: string; is_postable: boolean }[] =
      await manager.query(
        `SELECT id, code, is_postable FROM chart_of_accounts WHERE id = ANY($1)`,
        [uniqueIds],
      );

    const headerAccounts = rows.filter((row) => !row.is_postable);
    if (headerAccounts.length > 0) {
      const codes = headerAccounts.map((row) => row.code).join(', ');
      throw new BadRequestException(
        `Akun header tidak bisa dijurnal (${codes}) — pilih akun Jenis (anak) yang sesuai.`,
      );
    }
  }
}

function toDateOnlyString(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
