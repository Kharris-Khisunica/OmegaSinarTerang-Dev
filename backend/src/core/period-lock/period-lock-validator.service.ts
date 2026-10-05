import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

/**
 * Satu titik masuk pemeriksaan tanggal transaksi (CLAUDE.md §2.9, §0). Untuk
 * MVP hanya memeriksa backdate — pemeriksaan periode tertutup menyusul
 * pasca-MVP (§0/§2.15), diselipkan ke `validate()` ini, bukan disebar ke
 * modul lain.
 *
 * Stateless (tanpa constructor dependency), persis DocumentCounterService —
 * supaya bisa `new` langsung di test tanpa Nest DI.
 */
@Injectable()
export class PeriodLockValidatorService {
  /**
   * `maxDaysOverride` dipakai HANYA oleh JournalPosterService.post() lewat
   * `PostJournalDto.periodLockMaxDaysOverride` (Hari 17, operational-expenses
   * — klien setuju mundur 7 hari khusus modul ini, docs/
   * PERTANYAAN_KLIEN_BIAYA_OPERASIONAL.md §12). Modul lain tidak mengisi
   * field itu sehingga tetap memakai default `settings.backdate_max_days` —
   * satu titik masuk (§2.9) tetap satu, override tidak bocor ke modul lain.
   */
  async validate(
    date: Date,
    manager: EntityManager,
    maxDaysOverride?: number,
  ): Promise<void> {
    const rows: { value: string }[] = await manager.query(
      `SELECT value FROM settings WHERE key = 'backdate_max_days'`,
    );
    const maxDays = maxDaysOverride ?? (rows[0] ? Number(rows[0].value) : 2);

    const today = startOfUtcDay(new Date());
    const target = startOfUtcDay(date);
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

  /**
   * Satu-satunya pengecualian tanggal yang diizinkan di seluruh sistem
   * (CLAUDE.md §3 "Saldo Awal"): saldo awal diinput Hari 36 (29 Agustus)
   * tapi bertanggal `settings.opening_balance_date` (cut-over, 1 September) —
   * ada DI DEPAN tanggal input. Dipanggil HANYA oleh OpeningBalanceService,
   * tidak pernah oleh JournalPosterService.post() — jangan dipakai di luar
   * itu, atau pengecualian bernama ini diam-diam jadi lubang.
   */
  async assertOpeningBalanceDate(
    date: Date,
    manager: EntityManager,
  ): Promise<void> {
    const rows: { value: string }[] = await manager.query(
      `SELECT value FROM settings WHERE key = 'opening_balance_date'`,
    );
    const configured = rows[0]?.value;
    if (!configured) {
      throw new BadRequestException(
        'settings.opening_balance_date belum diisi — tidak bisa memvalidasi tanggal saldo awal.',
      );
    }
    if (toDateOnlyString(date) !== configured) {
      throw new BadRequestException(
        `Tanggal saldo awal harus persis ${configured} (settings.opening_balance_date).`,
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
