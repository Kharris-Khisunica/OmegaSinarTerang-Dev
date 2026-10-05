# Hari 30 — Laporan Penjualan, Piutang, Hutang

**Tanggal pengerjaan:** 03 September 2026
**Status:** Selesai, DoD hijau (lihat §6). `PROGRESS.md` **belum** diperbarui — lihat §7.

---

## 1. Konteks — kenapa hari ini dikerjakan padahal ditunda

`CLAUDE.md` §0 dan `PROGRESS.md` §2 secara eksplisit menandai Hari 30
(laporan penjualan/piutang/hutang) **⏸ DITUNDA KE PASCA-MVP**, dengan
tenggat "bulan pertama operasi" — bukan hari ini.

Di awal sesi ini, sebelum menulis kode, saya membandingkan status resmi itu
dengan `PROGRESS.md` §1 yang ternyata sudah mencatat **keputusan kerja
03 Sep 2026** tentang bentuk Laporan Piutang/Hutang (bucket umur 30 hari
dari `settings`, layar generik §14 PANDUAN_UI) — dua sumber yang saling
bertentangan dalam file yang sama. Saya berhenti dan menanyakan ini secara
eksplisit sebelum mulai (sesuai `CLAUDE.md` §9 poin 2: "kalau ada yang
bertabrakan, berhenti dan tanya"). User kemudian memberi **prompt tugas
penuh untuk Hari 30**, yang saya baca sebagai keputusan eksplisit untuk
mencabut penundaan khusus untuk tiga laporan ini (bukan seluruh §0 — Laporan
Biaya Operasional/Hari 31 tetap ditunda).

**Ini keputusan kerja, belum dikonfirmasi ke klien** — pola yang sama
dengan desain skema Payment Hari 26 (`KONTEKS_REVISI_2026-07-28.md` §2.12)
dan isi Laporan Stok/Titipan Hari 29. Kalau klien memberi arahan berbeda,
ini yang perlu direvisi.

---

## 2. Ruang lingkup tugas

1. **Laporan Penjualan** — per periode, per pelanggan, per salesman
   (salesman dipilih per faktur, bukan per pelanggan — `CLAUDE.md` §3).
   **Tanpa komisi** — murni rekap kinerja.
2. **Laporan Piutang (umur piutang)** — akun piutang lewat resolver yang
   sama dengan transaksi. Pelanggan ber-`ar_account_id` custom wajib tetap
   muncul. Total per pelanggan **wajib** direkonsiliasi ke buku besar
   (`journal_entry_lines.customer_id`), **bukan** dihitung ulang dari
   `sales_invoices`.
3. **Laporan Hutang (umur hutang)** — umur dari `due_date` (bukan
   `receipt_date`). Karena `journal_entry_lines` **tidak** punya
   `supplier_id`, sumber kebenaran saldo per-supplier **wajib** dari
   `purchase_invoices` + `payments`, memakai ulang logika yang sama dengan
   layar Pembayaran (`PaymentsService`) — bukan query outstanding baru.
4. **Bucket umur** (piutang & hutang) — lebar 30 hari per bucket, tapi
   angka "30" wajib dibaca dari `settings.aging_bucket_days` (baru,
   `NUMBER`, seed default `'30'`), bukan angka mati di kode. 4 bucket
   tetap: `1-N`, `N+1-2N`, `2N+1-3N`, `>3N`.
5. **Frontend**: 3 halaman laporan + export Excel, pola generik §14
   PANDUAN_UI (panel parameter, kepala hasil, baris GRAND TOTAL). Angka
   bisa diklik sampai ke dokumen sumbernya. Header kolom bucket dibentuk
   dari angka yang dikembalikan BE, bukan teks manual.

---

## 3. Desain kunci & alasannya

### 3.1 Piutang — FIFO murni di level buku besar (bukan invoice-based)

Karena `sales_invoices` **dilarang** jadi sumber total (bisa menyimpang dari
GL kalau ada VOID/retur yang tidak tersentuh), pendekatannya:

- Ambil **seluruh** `journal_entry_lines` yang ditag `customer_id` **DAN**
  akunnya `chart_of_accounts.is_receivable_account = true` (bukan
  `account_id = default_ar_account_id` — supaya pelanggan ber-akun custom
  tidak hilang, dan baris non-piutang yang kebetulan ditag `customer_id`
  juga seperti baris Selisih Pembayaran di `PaymentsService.confirm()`
  ikut tersaring keluar).
- FIFO murni per pelanggan: baris debit = lot baru, baris kredit
  mengonsumsi lot **tertua** dulu (`sourceType`/`sourceId` dari
  `journal_entries.source_type/source_id` ikut terbawa per lot).
- **Invarian**: total lot tersisa per pelanggan == `SUM(debit-credit)` GL
  persis, karena FIFO cuma memindahkan "siapa dikonsumsi", tidak pernah
  mengubah total. Ini yang menjamin rekonsiliasi ke GL tanpa langkah
  tambahan.
- Lot bersumber `SALES_INVOICE` → `source_id` PERSIS `sales_invoices.id`,
  jadi FE bisa menautkan nominal ke faktur sumbernya langsung. Lot dari
  `OPENING_BALANCE` tidak punya faktur di baliknya → ditandai "Saldo Awal",
  tidak diklikkan.

### 3.2 Hutang — reuse `PaymentsService`, bukan resolver GL tandingan

`PaymentsService.findOpenInvoices()`/`getOutstandingInvoices()` (dipakai
layar Pembayaran Hari 26–27) digeneralisasi: `partyId` jadi opsional —
kosong berarti **semua** supplier sekaligus (mode laporan), bukan hanya
satu pihak. Method publik baru `getOutstandingInvoicesForReport()`
menambahkan proyeksi `dueDate`/`partyId` di atas logika "sisa faktur" yang
identik dengan layar Pembayaran. `PaymentsService` diekspor dari
`PaymentsModule` supaya `ReportsModule` bisa menyuntiknya.

Umur dihitung dari `due_date` (jatuh tempo di masa depan → bucket 1,
bukan dikeluarkan dari laporan).

### 3.3 Bucket umur

`aging-bucket.util.ts` (baru) — satu fungsi bersama dipakai kedua laporan:
`bucketIndexFor(ageDays, bucketDays)`, `bucketLabels(bucketDays)`,
`daysBetween()`. Migration `1785080602964` men-seed
`settings.aging_bucket_days = '30'`, dibaca `SettingsService` tiap request
laporan dipanggil (bukan di-cache). Halaman Pengaturan (`pengaturan/index.vue`)
diperluas supaya MASTER bisa mengubahnya tanpa migration baru.

### 3.4 Drill-down "klik nominal → buka faktur"

Karena laporan piutang/hutang berbentuk pivot (satu baris per pihak, kolom
per bucket — bukan satu baris per faktur), klik ke SATU faktur dari sel
pivot itu ambigu. Solusinya: setiap endpoint mengembalikan `detail[]`
(daftar faktur/lot pembentuk) di samping `rows` pivot-nya. FE: klik baris
pelanggan/supplier menampilkan tabel rincian di bawahnya, tiap baris
rincian bisa diklik ke `/penjualan/faktur/:id` atau `/pembelian/faktur/:id`.

---

## 4. Bug nyata yang ditemukan & diperbaiki: Date vs string dari `DataSource.query()`

Ditemukan lewat test integration (bukan lewat review kode) — bukan
hipotetis, langsung membuat test pertama gagal dengan
`TypeError: fromIso.split is not a function`.

**Akar masalah:** kolom Postgres bertipe `date`, dibaca lewat
`DataSource.query()` MENTAH (bukan repository/entity), datang sebagai
objek JS `Date` — BUKAN string `"YYYY-MM-DD"` seperti yang diasumsikan
kontrak FE (`formatDate()` FE eksplisit berkomentar "kontrak kolom DATE
backend"). `pg-types` mem-parse `date` jadi `new Date(y, m-1, d)` di **zona
waktu lokal server**. Mesin dev ini WIB (UTC+7) — dibuktikan lewat
`SELECT CURRENT_DATE` yang `.toISOString()`-nya balik `"...T17:00:00.000Z"`
(mundur satu hari kalau dibaca lewat getter UTC).

**Dampak kalau tidak ditangkap:** setiap kali kode laporan membaca tanggal
mentah lalu memakai `.toISOString().slice(0,10)` atau getter UTC lain,
tanggalnya **mundur satu hari** — di laporan umur, itu bisa memindahkan
sebuah saldo ke bucket yang salah, atau di laporan penjualan, tanggal
faktur yang tercetak salah tanggal.

**Perbaikan:** `toIsoDate(value: string | Date)` di `aging-bucket.util.ts`
— membaca objek Date lewat getter **LOKAL** (`getFullYear`/`getMonth`/
`getDate`), simetris dengan cara `pg-types` membentuknya, supaya
round-trip-nya utuh. Dipasang di titik masuk raw-query manapun yang
menyentuh tanggal di ketiga service baru (piutang, hutang, penjualan).
`todayIso()` juga diperbaiki jadi berbasis getter lokal (bukan
`toISOString()`), supaya "hari ini" mengikuti kalender WIB server, bukan
mundur satu hari kalau dipanggil dini hari.

**Dicatat, sengaja TIDAK diperbaiki (di luar lingkup hari ini):**
`PaymentsService.findOpenInvoices()` yang sudah ada sejak Hari 26–27 punya
mistyping yang sama (`invoiceDate`/`dueDate` dideklarasikan `string` tapi
runtime-nya `Date`) — belum pernah ketahuan karena kode yang sudah ada
tidak pernah memanggil `.split()` langsung di atasnya. Berpotensi
memengaruhi tanggal yang ditampilkan di layar Penerimaan/Pengeluaran Kas.
Perlu ditinjau terpisah, bukan bagian Hari 30.

---

## 5. File yang dibuat/diubah

**Backend — baru:**
- `backend/src/database/migrations/1785080602964-AddAgingBucketDaysSetting.ts`
- `backend/src/modules/reports/aging-bucket.util.ts` (+ `.spec.ts`, 10 test)
- `backend/src/modules/reports/dto/sales-report-query.dto.ts`
- `backend/src/modules/reports/sales-reports.service.ts`
- `backend/src/modules/reports/receivables-report.service.ts` (+ `.spec.ts`)
- `backend/src/modules/reports/payables-report.service.ts` (+ `.spec.ts`)

**Backend — diubah:**
- `backend/src/modules/reports/reports.controller.ts` — 3 endpoint baru:
  `GET /reports/sales`, `/reports/receivables-aging`, `/reports/payables-aging`
- `backend/src/modules/reports/reports.module.ts` — import `PaymentsModule`+`SettingsModule`
- `backend/src/modules/payments/payments.service.ts` — `findOpenInvoices()`
  digeneralisasi (partyId opsional) + method publik baru
  `getOutstandingInvoicesForReport()`
- `backend/src/modules/payments/payments.module.ts` — ekspor `PaymentsService`
- `backend/src/modules/settings/settings.module.ts` — ekspor `SettingsService`

**Frontend — baru:**
- `frontend/app/pages/laporan/penjualan.vue`
- `frontend/app/pages/laporan/piutang.vue`
- `frontend/app/pages/laporan/hutang.vue`

**Frontend — diubah:**
- `frontend/app/pages/laporan/index.vue` — 3 kartu baru, placeholder
  "belum tersedia" dipersempit hanya untuk Biaya Operasional
- `frontend/app/pages/pengaturan/index.vue` — `aging_bucket_days` bisa diedit

---

## 6. Verifikasi & DoD

| Item | Status |
|---|---|
| `npm run build` BE (0 error TS) | ✅ |
| `npm run build` FE (0 error TS) | ✅ (lihat catatan OOM di bawah) |
| `npm run lint` BE + FE | ✅ bersih |
| `npm run test` BE | ✅ **276/276** (264 lama + 12 baru) |
| Migration `up → down → up` di DB bersih | ✅ |
| `GET /health` = 200 | ✅ |
| `./scripts/verify.sh` | ✅ 9/10 (lihat catatan di bawah) |
| Uji manual 1 happy path + 1 error path | ✅ lewat test integration (lihat §6.1) |

**Catatan build FE via `verify.sh`:** gagal SATU kali di langkah build
karena `nuxt build`/Nitro packaging kehabisan heap V8 default — mesin dev
ini cuma 8 GB RAM total dengan ±1,2 GB bebas saat itu (kendala mesin yang
sudah didokumentasikan di `PROGRESS.md` sejak Hari 1, bukan disebabkan
perubahan hari ini: client+server bundle sendiri sudah kompil bersih 0
error TypeScript sebelum crash-nya). Diverifikasi ulang dengan
`NODE_OPTIONS=--max-old-space-size=6144 npm run build` → **Build complete**,
exit 0.

### 6.1 Yang dibuktikan lewat test integration (Postgres asli, `omega_dev`)

- **Rekonsiliasi GL**: total piutang per pelanggan = `SUM(debit-credit)`
  baris `journal_entry_lines.customer_id` miliknya, tidak berkurang oleh
  baris non-piutang (Selisih Pembayaran) yang kebetulan ditag
  `customer_id` yang sama.
- **Akun piutang custom**: pelanggan dengan `ar_account_id` menunjuk akun
  BUKAN akun piutang default tetap muncul di laporan (dibuktikan dengan
  akun piutang kedua yang sengaja bukan default manapun).
- **Saldo nol disembunyikan**: pelanggan/supplier lunas penuh tidak
  muncul di laporan sama sekali.
- **Umur hutang dari `due_date`**: dibuktikan dengan faktur yang
  `due_date`-nya beda dari `receipt_date`, dan faktur yang belum jatuh
  tempo (due_date di masa depan) tetap masuk bucket pertama, bukan hilang.
- **Reuse `PaymentsService`**: `PayablesReportService` memanggil method
  publik `PaymentsService.getOutstandingInvoicesForReport()` yang sama,
  bukan query tandingan.
- **Bucket umur dari `bucketDays` dinamis**: seluruh test membaca
  `aging_bucket_days` aktual dari DB dulu (bukan hardcode 30), lalu
  menghitung ekspektasi bucket dari situ — jadi tetap valid kalau nilai
  setting-nya diubah.
- **`toIsoDate()`**: dibuktikan simetris dengan cara `pg-types` membentuk
  `Date` (getter lokal, bukan UTC).

---

## 7. Yang belum dikerjakan / perlu tindak lanjut

1. **`PROGRESS.md` §0/§1/§2 belum diperbarui** untuk mencerminkan Hari 30
   selesai — sengaja tidak saya sentuh karena kalimat "keputusan kerja,
   belum dikonfirmasi klien" perlu kata-kata dari Anda, bukan saya yang
   menulis atas nama keputusan bisnis.
2. **Belum ada commit git** — sesuai instruksi, hanya commit kalau diminta.
3. **`PaymentsService` date-mistyping** (§4 di atas) — layak ditinjau
   sebelum modul Pembayaran dipakai produksi sungguhan, di luar Hari 30.
4. Laporan Penjualan belum diberi test integration khusus (hanya
   diverifikasi lewat build+lint+manual review kode) — risikonya lebih
   rendah dari Piutang/Hutang karena murni agregasi SQL tanpa FIFO/bucket.
5. Tiga laporan ini **belum dikonfirmasi ke klien** — kalau nanti ada
   arahan berbeda soal bentuk laporan (kolom, basis tanggal umur piutang,
   dll.), ini yang perlu direvisi duluan.
