// Dipakai BERSAMA ReceivablesReportService dan PayablesReportService (Hari 30,
// CLAUDE.md §0 "BUCKET UMUR") — satu fungsi lebar-bucket, supaya piutang dan
// hutang selalu memakai definisi umur yang identik. Jumlah bucket TETAP 4;
// hanya lebarnya (`bucketDays`, dari settings.aging_bucket_days) yang
// dikonfigurasi, tidak pernah angka mati di kode.

/**
 * Kolom `date` Postgres, dibaca lewat `DataSource.query()` mentah (bukan
 * repository), datang sebagai objek `Date` JS -- BUKAN string "YYYY-MM-DD"
 * seperti yang diasumsikan banyak kode lain di modul ini (`pg-types`
 * mem-parse OID `date` jadi `new Date(y, m-1, d)` di ZONA WAKTU LOKAL server).
 * Dibuktikan lewat query manual: `SELECT CURRENT_DATE` di mesin ini (WIB,
 * UTC+7) mengembalikan objek Date yang `.toISOString()`-nya mundur satu hari
 * ("...T17:00:00.000Z") -- kalau dibaca lewat `.toISOString().slice(0,10)`
 * atau getter UTC mana pun, tanggalnya SALAH MUNDUR SATU HARI.
 *
 * `toIsoDate()` WAJIB jadi satu-satunya titik masuk untuk mengubah nilai
 * tanggal mentah (Date ATAU string) jadi "YYYY-MM-DD" di modul laporan ini --
 * pakai getter LOKAL (`getFullYear`/`getMonth`/`getDate`), simetris dengan
 * cara `pg-types` membentuk Date-nya, supaya round-trip-nya utuh.
 */
export function toIsoDate(value: string | Date): string {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return value.slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm, td] = toIso.split('-').map(Number);
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

// Getter LOKAL (bukan `toISOString()`, yang membaca UTC) -- "hari ini" wajib
// mengikuti kalender lokal server (WIB), bukan mundur satu hari kalau dibaca
// dini hari UTC (mis. jam 02:00 WIB = masih 19:00 UTC hari sebelumnya).
export function todayIso(): string {
  return toIsoDate(new Date());
}

// ageDays <= bucketDays -> bucket 0 ("1-N"), dst. Tanggal di masa depan
// (belum jatuh tempo, ageDays < 0) DAN hari ini (ageDays = 0) sama-sama
// masuk bucket 0 -- keduanya "belum lewat" sejauh apa pun bucket pertama.
export function bucketIndexFor(ageDays: number, bucketDays: number): number {
  const effective = Math.max(ageDays, 0);
  return Math.min(3, Math.floor(Math.max(effective - 1, 0) / bucketDays));
}

export function bucketLabels(
  bucketDays: number,
): [string, string, string, string] {
  const n = bucketDays;
  return [`1-${n}`, `${n + 1}-${2 * n}`, `${2 * n + 1}-${3 * n}`, `>${3 * n}`];
}
