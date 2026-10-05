import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, QueryFailedError } from 'typeorm';
import { JournalEntry } from '../../modules/journal-entries/entities/journal-entry.entity';
import { StockMovement } from '../../modules/stock/entities/stock-movement.entity';
import { JournalPosterService } from '../journal-poster/journal-poster.service';
import { StockRecorderService } from '../stock-recorder/stock-recorder.service';
import { VoidHook } from './void-hook.interface';

export interface VoidDocumentParams {
  sourceType: string;
  sourceId: string;
  reasonCode: string;
  reasonNote: string;
  userId: string;
  manager: EntityManager;
}

export interface VoidDocumentResult {
  reversalEntry: JournalEntry;
  reversedMovements: StockMovement[];
}

/**
 * VOID generik di atas journal_entries + stock_movements/stock_cost_lots
 * (CLAUDE.md §2.1, §2.2, §2.16) — satu jalur dipakai semua modul dokumen
 * lewat sourceType/sourceId yang SAMA dengan yang dipakai JournalPosterService
 * / StockRecorderService saat posting asli. Tidak pernah UPDATE/DELETE baris
 * asli — VOID selalu berupa baris pembalik baru, bertanggal HARI INI (bukan
 * tanggal dokumen asli) supaya VOID dokumen bulan lalu tidak pernah mengubah
 * angka bulan yang sudah ditutup (§2.2, §2.15).
 *
 * WAJIB dipanggil dengan EntityManager dari transaction pemanggil (pola sama
 * JournalPosterService/StockRecorderService) — kalau reverseIn/reverseOut
 * gagal di tengah (mis. lot sudah terkonsumsi), seluruh transaction termasuk
 * jurnal pembalik yang sudah "ditulis" ikut rollback, jadi tidak ada state
 * setengah jadi.
 *
 * Hook per modul (checkVoidable/markVoided) FAIL-CLOSED kalau sourceType
 * belum register hook — meniru payload-matchers.ts (StepUpService) yang
 * sudah menganut pola ini lebih dulu di codebase ini. Modul dokumen Hari 13+
 * WAJIB registerHook() begitu tabel dokumennya ada.
 *
 * Lingkup Hari 11 sengaja TIDAK mencakup VOID untuk transfer() (mutasi
 * gudang, baru relevan Hari 13) atau dokumen tanpa jurnal sama sekali.
 */
@Injectable()
export class VoidEngineService {
  private readonly hooks = new Map<string, VoidHook>();

  constructor(
    private readonly journalPosterService: JournalPosterService,
    private readonly stockRecorderService: StockRecorderService,
  ) {}

  registerHook(sourceType: string, hook: VoidHook): void {
    this.hooks.set(sourceType, hook);
  }

  async voidDocument(params: VoidDocumentParams): Promise<VoidDocumentResult> {
    const { sourceType, sourceId, reasonCode, reasonNote, userId, manager } =
      params;

    if (!reasonNote || reasonNote.trim().length === 0) {
      throw new BadRequestException(
        'Alasan pembatalan (void_reason_note) wajib diisi.',
      );
    }
    if (!reasonCode || reasonCode.trim().length === 0) {
      throw new BadRequestException(
        'Kode alasan pembatalan (void_reason_code) wajib diisi.',
      );
    }

    // Urutan sesuai spesifikasi tugas: (1) idempotensi/eksistensi dulu — ini
    // milik VoidEngineService sendiri, murah (tidak melibatkan modul lain) —
    // baru (2) prasyarat modul lewat hook. Kalau dibalik, dokumen yang sudah
    // di-VOID atau tidak ada sama sekali tetap memanggil hook modul dulu
    // sebelum ditolak — mubazir, dan berisiko kalau suatu hook nanti
    // ternyata tidak murni read-only (kontrak VoidHook mewajibkan itu, tapi
    // urutan ini tidak menggantungkan diri padanya).
    // findActiveEntry() (bukan findOne polos) — WAJIB begitu paket R6
    // (revisi in-place) ada: satu dokumen bisa punya lebih dari satu baris
    // isReversal=false (entry asli + entry hasil posting-ulang tiap
    // revisi). findOne tanpa ORDER BY akan mengambil salah satu SEMBARANGAN,
    // berisiko membalik entry yang sudah kadaluarsa (sudah dibalik revisi
    // sebelumnya) alih-alih entry yang sungguh berlaku sekarang. Untuk
    // dokumen yang belum pernah direvisi, hasilnya identik dengan findOne
    // lama (selalu cuma satu baris yang cocok) — perilaku VOID untuk jalur
    // yang sudah ada TIDAK berubah.
    const originalEntry = await this.journalPosterService.findActiveEntry(
      sourceType,
      sourceId,
      manager,
    );
    if (!originalEntry) {
      // findActiveEntry() tidak membedakan "dokumen ini tidak pernah
      // diposting" dari "entry-nya sudah dibalik" (VOID sebelumnya, atau —
      // paket R6 — direvisi lalu tetap tidak pernah diposting ulang, kasus
      // yang tidak mungkin terjadi lewat DocumentReviseService tapi tetap
      // diperiksa di sini demi pesan error yang jelas). Bedakan lewat query
      // terpisah, murni untuk pesan — TIDAK dipakai untuk keputusan reversal
      // (itu tetap originalEntry/findActiveEntry di atas).
      const everPosted = await manager.findOne(JournalEntry, {
        where: { sourceType, sourceId, isReversal: false },
      });
      if (everPosted) {
        throw new BadRequestException(
          'Dokumen ini sudah pernah di-VOID sebelumnya.',
        );
      }
      throw new NotFoundException(
        'Jurnal untuk dokumen ini tidak ditemukan — tidak bisa di-VOID.',
      );
    }

    const hook = this.hooks.get(sourceType);
    if (!hook) {
      throw new Error(
        `Belum ada VoidHook terdaftar untuk sourceType "${sourceType}". ` +
          'Panggil VoidEngineService.registerHook() sebelum sourceType ini dipakai untuk VOID.',
      );
    }
    await hook.checkVoidable(sourceId, manager);

    // Debit<->kredit ditukar, nominal identik, urutan baris dipertahankan.
    // customerId WAJIB ikut diteruskan (Hari 18) — kalau tidak, jurnal
    // pembalik dokumen yang menyentuh piutang pelanggan diam-diam kehilangan
    // tag pelanggannya dan ArAccountResolverService.getCustomerBalance() jadi
    // salah hitung tanpa error apa pun (persis pola kebocoran yang coba
    // dicegah invarian ini).
    const reversalLines = originalEntry.lines.map((line) => ({
      accountId: line.accountId,
      debit: Number(line.creditAmount),
      credit: Number(line.debitAmount),
      description: line.description ?? undefined,
      customerId: line.customerId ?? undefined,
    }));

    // Penjaga idempotensi di atas TIDAK cukup sendirian kalau dua panggilan
    // voidDocument() atas dokumen yang sama nyaris bersamaan (keduanya lolos
    // SELECT sebelum salah satu sempat menulis) — index unik parsial di
    // journal_entries.reversed_entry_id (migration 1785080602934) yang jadi
    // penjaga terakhir. Panggilan yang kalah GAGAL di sini, diterjemahkan ke
    // pesan yang sama seperti pengecekan di atas supaya pemanggil tidak
    // perlu tahu jalur mana yang menangkapnya.
    let reversalEntry: JournalEntry;
    try {
      reversalEntry = await this.journalPosterService.post(
        {
          entryDate: new Date(),
          description: reasonNote,
          sourceType: 'VOID_REVERSAL',
          sourceId: originalEntry.id,
          lines: reversalLines,
          createdBy: userId,
          isReversal: true,
          reversedEntryId: originalEntry.id,
          voidReasonCode: reasonCode,
          voidReasonNote: reasonNote,
        },
        manager,
      );
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err as unknown as { constraint?: string }).constraint ===
          'idx_journal_entries_reversed_entry_id_unique'
      ) {
        throw new BadRequestException(
          'Dokumen ini sudah pernah di-VOID sebelumnya.',
        );
      }
      throw err;
    }

    // findActiveMovements() (bukan find polos) — pasangan alasan yang sama
    // dengan findActiveEntry() di atas: query polos akan ikut menangkap
    // movement RONDE LAMA yang sudah dibalik revisi sebelumnya, membaliknya
    // dua kali atau (reverseIn) salah mengira lot lama yang sudah nol
    // sebagai "sudah terjual". Untuk dokumen yang belum pernah direvisi,
    // hasilnya identik dengan find() lama.
    const movements = await this.stockRecorderService.findActiveMovements(
      sourceType,
      sourceId,
      manager,
    );

    const reversedMovements: StockMovement[] = [];
    for (const movement of movements) {
      if (Number(movement.qtyBaseUnit) > 0) {
        reversedMovements.push(
          await this.stockRecorderService.reverseIn(
            movement.id,
            userId,
            manager,
          ),
        );
      } else {
        reversedMovements.push(
          await this.stockRecorderService.reverseOut(
            movement.id,
            userId,
            manager,
          ),
        );
      }
    }

    await hook.markVoided(sourceId, reasonCode, reasonNote, userId, manager);

    return { reversalEntry, reversedMovements };
  }
}
