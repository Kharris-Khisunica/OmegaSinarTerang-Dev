import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager, QueryFailedError } from 'typeorm';
import { JournalEntry } from '../../modules/journal-entries/entities/journal-entry.entity';
import { StockMovement } from '../../modules/stock/entities/stock-movement.entity';
import {
  JournalSourceType,
  PostJournalLineDto,
} from '../journal-poster/dto/post-journal.dto';
import { JournalPosterService } from '../journal-poster/journal-poster.service';
import { PeriodLockValidatorService } from '../period-lock/period-lock-validator.service';
import { StockRecorderService } from '../stock-recorder/stock-recorder.service';

export interface ApplyChangesResult {
  /**
   * Tanggal posting ulang — SAMA dengan originalDate kalau tanggal dokumen
   * tidak ikut diedit, BEDA kalau modul mengizinkan tanggal dokumen itu
   * sendiri dikoreksi (mis. receiptDate faktur pembelian). Jurnal/stok
   * pembalik (langkah d) SELALU bertanggal originalDate — inilah yang
   * dibalik. Posting baru (langkah f) bertanggal repostDate — tanggal yang
   * BENAR untuk koreksi ini.
   */
  repostDate: Date;
  journalDescription: string;
  journalLines: PostJournalLineDto[];
}

export interface ReviseDocumentParams {
  sourceType: JournalSourceType;
  sourceId: string;
  /**
   * Tanggal dokumen SEBELUM revisi ini (bukan tanggal baru kalau operator
   * juga mengoreksi tanggal) — dipakai gerbang jendela 2 hari (K3) dan
   * tanggal jurnal/stok PEMBALIK (K2, CLAUDE.md §2.2 pengecualian jalur
   * revisi). Wajib dibaca dari kolom tersimpan dokumen SEBELUM applyChanges
   * menuliskan nilai baru.
   */
  originalDate: Date;
  userId: string;
  /** EntityManager transaction pemanggil (CLAUDE.md §6) — service ini sendiri TIDAK PERNAH membuka transaction. */
  manager: EntityManager;
  /**
   * Gerbang tambahan SEBELUM reversal dimulai (mis.
   * StockRecorderService.assertLotsUnconsumed untuk faktur pembelian —
   * barang yang sudah terjual sebagian tidak boleh direvisi). Opsional.
   */
  beforeReverse?: (manager: EntityManager) => Promise<void>;
  /**
   * Modul menulis ulang header+baris dokumennya sendiri DAN memposting stok
   * baru (recordIn/recordOut per baris, movementDate = repostDate yang
   * dikembalikan) — DocumentReviseService tidak tahu bentuk baris dokumen
   * per modul, jadi bagian ini SEPENUHNYA milik pemanggil. Yang dikembalikan
   * hanya baris jurnal pengganti, supaya posting jurnal tetap lewat SATU
   * jalur (JournalPosterService.post) di sini.
   */
  applyChanges: (manager: EntityManager) => Promise<ApplyChangesResult>;
  /** Deskripsi baris jurnal pembalik, mis. "Pembalik revisi faktur JL/RM01-26090001". */
  reversalDescription: string;
}

export interface ReviseDocumentResult {
  reversalEntry: JournalEntry;
  repostEntry: JournalEntry;
  reversedMovements: StockMovement[];
}

/**
 * Mesin revisi-di-tempat generik (paket R6,
 * docs/RENCANA_REVISI_TESTING_KLIEN.md §2A K1-K4, §3) — dipakai
 * SalesInvoicesService.reviseInvoice() dan
 * PurchaseInvoicesService.reviseInvoice(). Stateless seperti
 * VoidEngineService: menerima EntityManager dari transaction pemanggil,
 * tidak pernah membuka transaction sendiri (CLAUDE.md §6).
 *
 * BEDA dari VoidEngineService secara sengaja (§2.2 CLAUDE.md, pengecualian
 * jalur revisi K2): jurnal/stok pembalik DAN posting ulang di sini bertanggal
 * TANGGAL DOKUMEN, bukan hari ini — VOID sendiri (void.service.ts) TIDAK
 * disentuh dan tetap bertanggal hari ini.
 *
 * Urutan WAJIB (§3 R6), seluruhnya dipanggil dalam SATU transaction milik
 * pemanggil:
 *   1. PeriodLockValidator atas originalDate (K3, jendela 2 hari) — pesan
 *      error menyebut jalan keluar (VOID + faktur baru), bukan cuma menolak.
 *   2. beforeReverse (opsional) — gerbang tambahan per modul.
 *   3. Balik jurnal AKTIF (findActiveEntry — lihat catatan di sana kenapa ini
 *      BUKAN sekadar findOne isReversal=false) + movement stok AKTIF
 *      (findActiveMovements), bertanggal originalDate.
 *   4. applyChanges — modul menulis ulang dokumen + stok baru, mengembalikan
 *      baris jurnal pengganti.
 *   5. Posting jurnal baru bertanggal repostDate, sourceType/sourceId SAMA
 *      dengan dokumen (bukan sourceType reversal) — inilah yang membuatnya
 *      jadi "entry aktif" berikutnya untuk revisi/VOID selanjutnya.
 *
 * revision_number++ SENGAJA TIDAK di sini — itu tanggung jawab pemanggil
 * (lihat PrintLockService.consume(): untuk dokumen PRINTED sudah dinaikkan
 * di sana; NOT_PRINTED perlu dinaikkan manual oleh pemanggil supaya tidak
 * naik dua kali, K4).
 */
@Injectable()
export class DocumentReviseService {
  constructor(
    private readonly journalPosterService: JournalPosterService,
    private readonly stockRecorderService: StockRecorderService,
    private readonly periodLockValidatorService: PeriodLockValidatorService,
  ) {}

  async revise(params: ReviseDocumentParams): Promise<ReviseDocumentResult> {
    const {
      sourceType,
      sourceId,
      originalDate,
      userId,
      manager,
      beforeReverse,
      applyChanges,
      reversalDescription,
    } = params;

    // K3: satu titik masuk PeriodLockValidator (§2.9 CLAUDE.md) — TIDAK
    // menulis pemeriksaan tanggal sendiri di sini, hanya menerjemahkan
    // pesan error generiknya jadi pesan yang menyebut jalan keluar revisi
    // (VOID + faktur baru), sesuai instruksi tugas.
    try {
      await this.periodLockValidatorService.validate(originalDate, manager);
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw new BadRequestException(
          'Faktur berumur lebih dari 2 hari tidak bisa direvisi. Gunakan VOID lalu terbitkan faktur baru.',
        );
      }
      throw err;
    }

    if (beforeReverse) {
      await beforeReverse(manager);
    }

    const activeEntry = await this.journalPosterService.findActiveEntry(
      sourceType,
      sourceId,
      manager,
    );
    if (!activeEntry) {
      throw new BadRequestException(
        'Jurnal untuk dokumen ini tidak ditemukan — tidak bisa direvisi.',
      );
    }

    // Debit<->kredit ditukar, nominal identik, urutan baris dipertahankan —
    // pola sama VoidEngineService.voidDocument(). customerId WAJIB ikut
    // diteruskan (CLAUDE.md §3 "lima/enam tempat menyentuh akun piutang").
    const reversalLines: PostJournalLineDto[] = activeEntry.lines.map(
      (line) => ({
        accountId: line.accountId,
        debit: Number(line.creditAmount),
        credit: Number(line.debitAmount),
        description: line.description ?? undefined,
        customerId: line.customerId ?? undefined,
      }),
    );

    let reversalEntry: JournalEntry;
    try {
      reversalEntry = await this.journalPosterService.post(
        {
          entryDate: originalDate,
          description: reversalDescription,
          sourceType: 'REVISION_REVERSAL',
          sourceId: activeEntry.id,
          lines: reversalLines,
          createdBy: userId,
          isReversal: true,
          reversedEntryId: activeEntry.id,
        },
        manager,
      );
    } catch (err) {
      // Penjaga idempotensi terakhir — index unik parsial di
      // journal_entries.reversed_entry_id (pola sama VoidEngineService):
      // dua percobaan revisi/VOID nyaris bersamaan atas entry aktif yang
      // sama, yang kalah gagal di sini.
      if (
        err instanceof QueryFailedError &&
        (err as unknown as { constraint?: string }).constraint ===
          'idx_journal_entries_reversed_entry_id_unique'
      ) {
        throw new BadRequestException(
          'Dokumen ini sedang direvisi atau dibatalkan oleh proses lain — coba lagi.',
        );
      }
      throw err;
    }

    const activeMovements = await this.stockRecorderService.findActiveMovements(
      sourceType,
      sourceId,
      manager,
    );
    const reversedMovements: StockMovement[] = [];
    for (const movement of activeMovements) {
      if (Number(movement.qtyBaseUnit) > 0) {
        reversedMovements.push(
          await this.stockRecorderService.reverseIn(
            movement.id,
            userId,
            manager,
            {
              movementDate: originalDate,
              reversalSourceType: 'REVISION_REVERSAL',
            },
          ),
        );
      } else {
        reversedMovements.push(
          await this.stockRecorderService.reverseOut(
            movement.id,
            userId,
            manager,
            {
              movementDate: originalDate,
              reversalSourceType: 'REVISION_REVERSAL',
            },
          ),
        );
      }
    }

    const { repostDate, journalDescription, journalLines } =
      await applyChanges(manager);

    // sourceType/sourceId SAMA dengan dokumen asli (bukan 'REVISION_REVERSAL')
    // — entry ini jadi "entry aktif" berikutnya untuk findActiveEntry() pada
    // revisi/VOID selanjutnya.
    const repostEntry = await this.journalPosterService.post(
      {
        entryDate: repostDate,
        description: journalDescription,
        sourceType,
        sourceId,
        createdBy: userId,
        lines: journalLines,
      },
      manager,
    );

    return { reversalEntry, repostEntry, reversedMovements };
  }
}
