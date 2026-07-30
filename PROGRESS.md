# Progress Tracker v3 — Website Operasional FMCG

Pendamping `Development_Plan_v2`, `CLAUDE.md` v2, dan `KONTEKS_REVISI_2026-07-28.md`.

> **Versi 3 — 29 Juli 2026.** Menggantikan v2. Perubahan: spine hari digeser +3 untuk
> menampung rework Hari 7–9 (buah revisi klien 28–29 Juli), scope BARU masuk lewat hari
> sisipan berhuruf (22A, 23A), drift `-5` dicabut jadi `0`, dan seluruh DoD yang memuat
> aturan lama (pembulatan, `INV/`, `CONSIGNMENT`, `tax_status`, Docker) ditulis ulang.
> **Cut-over 1 September tidak bergerak.**

**Cara pakai:**
1. Simpan file ini **di dalam repo** dan commit setiap hari. Ini audit trail proyek.
2. Isi **Tgl Aktual** saat sub-item selesai & lolos DoD. Kalau kosong padahal tanggalnya lewat, itu drift.
3. Update **§0 Papan Status** setiap pagi sebelum mulai kerja.
4. Salin bagian "Modul Selesai" (§4) ke context prompt AI berikutnya.
5. Nomor hari **berubah** dari v2. Pakai §0.1 untuk menerjemahkan referensi lama.

---

## 0. Papan Status (update tiap pagi)

| | |
|---|---|
| Hari ke- | `8` dari 37 (+2 hari sisipan) |
| Tanggal hari ini | `30 Juli 2026` |
| Rencana hari terakhir | **30 Agustus 2026** — serah terima (31 Agu = cadangan) |
| Cadangan eksplisit | **27–28 Agustus** (2 hari kosong, hasil penundaan pelaporan) |
| Cut-over | **1 September 2026** |
| **Drift kumulatif** | `0` hari |
| **Margin** | **+2,65 hari** — dipulihkan sore 29 Juli dengan menunda pelaporan ke pasca-MVP (§7). Sebelumnya nol |
| Buffer tersisa | Hari 34 + cadangan 27–28 Agu → `3` hari (Hari 18 terpakai CRUD COA; Hari 36 terpakai input saldo awal) |

**Neraca kapasitas (dari `KONTEKS_REVISI` §1, dibukukan di sini):**

| | Hari |
|---|---|
| Keunggulan jadwal per 27 Juli | +5,00 |
| Buffer plan (15, 31, 33 lama) | +3,00 |
| Potongan darurat item 1–4 | +2,25 |
| **Tersedia** | **+10,25** |
| Rework Hari 7–9 | −3,00 |
| Hari sisipan 22A (Pengecekan Invoice) + 23A (Tutup Bulan) | −2,00 |
| Delta yang menumpang di hari existing (§3 KONTEKS) | ≈ −5,35 |
| Sub-total | ≈ −0,10 → praktis nol |
| **Penundaan pelaporan ke pasca-MVP (§7)** | **+2,65** |
| **Sisa** | **≈ +2,55** |

**Aturan drift** (tetap diperketat meski margin pulih — margin ini punya pemilik: modul
Pembayaran Hari 26–27 yang belum pernah dibahas klien)**:**
- Drift ≥ 0,5 hari → catat di §3 hari itu juga, jangan tunggu genap sehari
- Drift ≥ 1 hari → pakai buffer terdekat (Hari 34 atau 36)
- Drift ≥ 2 hari → **tidak ada lagi daftar potong.** Yang tersisa hanya dua tuas:
  tukar scope dengan klien, atau geser cut-over. Bawa ke klien hari itu juga
- Penundaan ke pasca-MVP **bukan** tuas yang bisa dipakai lagi. Yang tersisa untuk ditunda
  hanya hal yang direkam saat transaksi terjadi — dan itu justru yang tidak boleh ditunda

---

## 0.1 Peta Penomoran Hari (v2 → v3)

Rework menempati Hari 7–9, sisanya bergeser +3. Referensi lama di `CLAUDE.md`,
`Development_Plan_v2`, dan catatan §3/§4 di bawah dibaca lewat tabel ini.

| v2 | v3 | Isi |
|---|---|---|
| — | **7** | 🆕 Rework: format nomor dokumen + `settings.store_code` + alasan VOID |
| — | **8** | 🆕 Rework: master data v2 (produk, merek, UoM, salesman, gudang) |
| — | **9** | 🆕 Rework: `authorization_requests` berpayload + `StepUpService` dinamis |
| 7 | 10 | Stock Recorder + FIFO |
| **8** | **11** | Integration test 4 invarian + VOID Engine ← `CLAUDE.md` §7 & §8 menyebutnya "Hari 8" |
| 9 | 12 | Jurnal Manual + Saldo Awal |
| 10 | 13 | Mutasi Gudang bercabang |
| 11 | 14 | Faktur Pembelian |
| 12 | 15 | Edit/VOID Pembelian + **kunci cetak generik** |
| 13 | 16 | Retur Pembelian (dari BAD_STOCK) |
| 14 | 17 | Biaya Operasional + approval kas besar |
| 15 | 18 | BUFFER + CRUD COA penuh |
| 16 | 19 | Sales Order + saluran penjualan |
| 17 | 20 | Price Suggestion + skema Faktur Penjualan |
| 18 | 21 | `POST /sales-invoices` + batas jual di bawah harga pokok |
| 19 | 22 | Edit/VOID Penjualan + cetak nota A5 |
| — | **22A** | 🆕 Halaman Pengecekan Invoice Harian (supervisor) |
| 20 | 23 | Retur Penjualan |
| — | **23A** | 🆕 Tutup Bulan + buka kembali |
| 21 | 24 | Agen, Kendaraan, skema Surat Jalan |
| 22 | 25 | Endpoint + cetak Surat Jalan |
| 23 | 26 | Payment: skema + preview alokasi |
| 24 | 27 | Payment: confirm + selisih pembayaran |
| 25 | 28 | ~~Rekap setoran agen~~ **dipotong** → Laporan Kontinuitas Nomor Dokumen |
| 26 | 29 | Laporan Stok & Barang Titipan |
| 27 | 30 | Laporan Penjualan, Piutang, Hutang |
| 28 | 31 | Laporan Biaya + Rekap Kas Harian (~~cash opname~~ dipotong) |
| 29 | 32 | Rekonsiliasi stok (~~laporan retur & stok minus~~ dipotong) |
| 30 | 33 | **Deploy Windows-native** + export Excel (~~PDF~~ dipotong) |
| 31 | 34 | BUFFER |
| 32 | 35 | Audit Permission Matrix |
| 33 | 36 | BUFFER |
| 34 | 37 | Smoke test, dokumentasi, serah terima |

> ⚠️ **Patch yang perlu kamu terapkan ke `CLAUDE.md`:** §7 ("termasuk 4 invarian setelah
> Hari 8") dan §8 ("integration test Hari 8") sekarang menunjuk **Hari 11**.

---

## 1. Menunggu Klien (cek tiap hari)

| Item | Dibutuhkan sebelum | Diminta tgl | Diterima tgl | Status |
|---|---|---|---|---|
| **Format nota A5** (penjualan, pembelian, surat jalan, retur, kwitansi, mutasi) | Hari 22 & 25 | 27 Jul | | ⏳ **lewat tenggat.** Aturan cadangan: lewat Hari 15 (±6 Agu) → pakai layout standar, revisi pasca-MVP |
| PR #2 — lot retur pelanggan `supplier_id` NULL: boleh diretur ke supplier mana pun atau diblokir? | **Hari 16** | 29 Jul | | ⏳ **prioritas tinggi** |
| PR #3 — panel harga kosong untuk satuan yang belum pernah dipakai: fallback ke harga master atau kosongkan? | Hari 20 | 29 Jul | | ⏳ |
| Modul **Pembayaran / Kas & Bank** — belum dibahas sama sekali | **Hari 26** | 29 Jul | | ⏳ **prioritas tinggi**, plan menandainya bagian tersulit |
| Modul **Biaya Operasional** (termasuk gaji harian salesman + ongkir pembelian) | Hari 17 | 29 Jul | | ⏳ ditunda klien |
| **Bentuk closing**: baris Saldo Awal/Saldo Akhir = jurnal sungguhan atau konstruksi tampilan? | **Hari 23A** | 29 Jul | | ⏳ **prioritas tinggi** — menentukan skema, bukan tampilan |
| Bentuk input **Saldo Awal** (file, ketik manual, atau impor) | Hari 12 | 29 Jul | | ⏳ tanggalnya sudah pasti: **1 Sep 2026** |
| **Angka saldo awal** stok + piutang + hutang dari klien | **Hari 36** (29 Agu) | | | ⏳ |
| Cara menyesuaikan selisih 29–31 Agustus (ulang input, atau masuk sebagai transaksi biasa) | Hari 36 | 29 Jul | | ⏳ |
| Isi **Laporan** yang benar-benar dipakai | Hari 29 | 29 Jul | | ⏳ ditunda klien |
| ~~Keputusan hosting final~~ | Hari 4 | | **28 Jul** | ✅ PC operator merangkap server, tanpa Docker, tanpa mini PC |
| **Pengadaan UPS** (satu-satunya belanja wajib) | Hari 33 | 28 Jul | | ⏳ ingatkan tiap minggu |
| Ekspor data Affari — dorong sekali lagi (menu Laporan / tanya vendor / baca file DB) | Cut-over | 28 Jul | | ⏳ sementara dianggap **tidak ada** |
| `REC(s): 61` dan `260` — total atau tampilan terfilter? | Hari 13 | 28 Jul | | ⏳ menentukan migrasi setengah hari atau berminggu |
| Input master data oleh klien (produk, pelanggan, merek, UoM, salesman, supplier) | **±20 Agu** (tenggat internal) | 28 Jul | | ⏳ bisa mulai setelah Hari 8, paralel |
| Saldo awal stok + harga pokok per produk | Hari 12 | | | ⏳ |
| Saldo awal piutang per pelanggan, hutang per supplier | Hari 12 | | | ⏳ |
| Konfirmasi tarif PPN (konsultan pajak) | Hari 14 | | | ⏳ masuk tabel `tax_rates`, bukan config |
| Nama & waktu **kontrol pengganti rekap setoran agen** (siapa mencocokkan uang sopir, kapan) | Hari 28 | 28 Jul | | ⏳ lihat `KONTEKS_REVISI` §4.4 |
| Repo dipindah ke akun klien | Hari 37 | | | ⏳ **sarankan hari ini** |

> Item ⏳ yang melewati tanggal "dibutuhkan sebelum" otomatis jadi risiko jadwal. Catat di §3.
> Empat item bertanda **prioritas tinggi** menghambat hari yang sudah dekat — kejar duluan.

---
## 2. Checklist Harian

Legenda: `[ ]` belum · `[~]` jalan · `[x]` selesai & lolos DoD · ⚠️ risiko tinggi · 🔒 blocker
· 🆕 hari baru dari revisi 28–29 Juli · ♻️ isinya diubah revisi · 🛑 ada gerbang "berhenti & tanya"

### Fase 1 — Fondasi (Hari 1–4) · 26–27 Juli · **SELESAI**

> ⚠️ Output Hari 3, 4, dan 5 **sebagian digantikan** oleh rework Hari 7–9. Checkbox di bawah
> tetap `[x]` karena memang selesai sesuai DoD yang berlaku saat itu — bukan dihapus, tapi
> dilanjutkan. Jangan membaca §4 Modul Selesai tanpa membaca Hari 7–9 dulu.

**Hari 1** — Rencana: 27 Jul · Aktual: `26 Jul 2026`
- [x] BE: scaffold NestJS modular + TypeORM + `pgcrypto` + git + env
- [x] FE: scaffold Nuxt + Nuxt UI + layout (sidebar/topbar) + struktur `pages/`
- **DoD:** `npm run dev` jalan di BE & FE, koneksi DB sukses, commit pertama masuk repo

**Hari 2** — Rencana: 28 Jul · Aktual: `26 Jul 2026`
- [x] BE: `users` + JWT/refresh + bcrypt + RBAC Guard + login/refresh/logout
- [x] BE: seed 3 user + **rate-limit login**
- [x] FE: login page + auth composable + route middleware + logout
- **DoD:** 3 role bisa login, token tersimpan, halaman terproteksi menolak akses tanpa token
  *(BE terverifikasi lewat curl; FE terverifikasi manual di browser — login 3 role,
  token tersimpan di cookie, halaman terproteksi redirect ke `/login` tanpa token,
  halaman ber-`roles` menolak role yang salah, logout menghapus sesi.)*

**Hari 3** 🔒 — Rencana: 29 Jul · Aktual: `27 Jul 2026`
- [x] BE: migration `products`(+conversions), `customers`, `suppliers`, `warehouses`, `tax_rates`
- [x] BE: migration `chart_of_accounts` + seed 11 akun
- [x] BE: migration `settings` + `document_counters` + **generator nomor** (`FOR UPDATE`)
- [x] FE: ⚠️ `<DataTable>` (list+search+pagination server-side)
- [x] FE: ⚠️ `<CrudFormPage>` (layout create/edit generik)
- **DoD:** generator nomor menghasilkan `INV/2609/0001` dan reset benar saat ganti bulan; kedua komponen dipakai 1 halaman percontohan tanpa copy-paste
  *(FE terverifikasi manual di browser — search/sort/filter/pagination/state-di-URL,
  create dengan validasi client+server per-field, edit memuat data lama, Ctrl+S, Esc,
  "Simpan & Tambah Lagi". BE terverifikasi: build 0 error, lint bersih, 13 test hijau
  (termasuk 4 test `DocumentCounterService`, salah satunya 20 pemanggilan paralel
  menghasilkan 20 nomor unik berurutan tanpa duplikat), migration up→down→up sukses
  di DB sementara, `GET /health` 200.)*

**Hari 4** — Rencana: 30 Jul · Aktual: `27 Jul 2026`
- [x] BE: CRUD Products (+konversi satuan 1 layar)
- [x] BE: CRUD Customers (+`is_pkp`, `ar_account_id`)
- [x] BE: CRUD Suppliers (auto-code + masking Operator) + Warehouses + Settings
- [x] FE: halaman Products, Customers, Settings
- [x] **Beri tahu klien: input master data boleh dimulai** (FE terverifikasi visual di
  browser sore ini — lihat DoD di bawah — aman untuk dikabari)
- **DoD:** Operator melihat supplier ter-mask, Master melihat penuh (✅ BE, dibuktikan lewat
  test otomatis + curl manual); klien sudah bisa masuk & input produk (✅ **diuji visual
  langsung di browser** — ekstensi Chrome konek sore ini: login Master, create Produk 2
  baris konversi via keyboard murni — Enter pindah kolom, Enter di kolom terakhir menambah
  baris + auto-fokus — simpan sukses & tampil di list; edit produk 3-tingkat lama
  (dus/renceng) merekonstruksi rasio dengan benar (dus=12, renceng=10, cocok data DB);
  create Customer dengan "Aktif" default ON, submit nomor telepon format salah → error
  400 ter-mapping ke field yang benar, submit format benar + 4 field alamat terpisah →
  tersimpan sukses.)
- **Revisi (27 Jul, sore):** guardrail nomor telepon Customer, alamat Customer dipecah 4
  field, default "Aktif"=aktif, urutan input konversi satuan Produk dibalik besar→kecil.
  Detail lengkap di §4.


### Fase 2 — Engine Inti (Hari 5–6) · 27 Juli · **SELESAI**

**Hari 5** — Rencana: 31 Jul · Aktual: `27 Jul 2026`
- [x] BE: export generik ExcelJS + PDFKit
- [x] BE: `authorization_requests` + guard step-up + `expires_at` (TTL 15 menit)
- [x] FE: halaman Suppliers, Warehouses (pilih `warehouse_type`)
- **DoD:** request step-up kedaluwarsa setelah 15 menit dan ditolak saat dieksekusi
  *(dibuktikan lewat test otomatis yang memundurkan `expires_at` 16 menit lalu
  eksekusi ulang — bukan menunggu 15 menit sungguhan; `./scripts/verify.sh` 10/10
  lulus: build+lint+test BE, migration up→down→up, `GET /health` 200, build+lint FE,
  tidak ada `@Delete()`, `.env` tidak ter-stage. FE diuji manual di browser — lihat
  detail di §4.)*

**Hari 6** 🔒 — Rencana: 1 Agu · Aktual: `27 Jul 2026`
- [x] BE: `journal_entries` + `journal_entry_lines`
- [x] BE: **Journal Poster** + 5 validasi (min 2 baris, satu sisi > 0, balance, akun aktif, nomor)
- [x] FE: halaman COA (tree, view only)
- **DoD:** posting tidak balance → error & rollback; `entry_number` format `JE/YYMM/NNNN`
  *(dibuktikan lewat 7 unit test `journal-poster.service.spec.ts` — integration test
  terhadap Postgres asli, pola sama dengan `DocumentCounterService` — termasuk bukti
  eksplisit `document_counters` tidak naik (`last_number` sama sebelum/sesudah)
  setelah percobaan posting yang sengaja tidak balance selisih Rp0,01. `./scripts/
  verify.sh` 10/10 lulus. Endpoint `GET /journal-entries` + `GET /journal-entries/:id`
  diuji manual lewat curl: MASTER/SUPERVISOR/OPERATOR semua 200 (RBAC direvisi susulan,
  lihat §4), id tidak ada → 404. Detail lengkap FE COA/Jurnal susulan di §4.)*


### Fase 2B — Rework Pasca-Revisi Klien (Hari 7–9) 🆕 · 29–31 Juli

> Tiga hari ini membayar utang yang dibuat revisi klien 28–29 Juli terhadap pekerjaan yang
> sudah selesai. Urutannya sengaja: **nomor dokumen dulu** (Hari 7) karena setelah Hari 14
> dokumen mulai terbit dengan nomor sungguhan dan format tidak bisa diubah lagi tanpa
> migrasi data; **step-up terakhir** (Hari 9) karena ia fondasi kunci cetak, kas besar,
> dan batas jual-rugi yang semuanya datang setelah ini.

**Hari 7** 🆕🔒 — Rencana: 29 Jul · Aktual: `____` (BE selesai; FE menyusul)
- [x] BE: format nomor `KODE/{settings.store_code}-YYMMXXXX` menggantikan `PREFIX/YYMM/NNNN`
- [x] BE: `settings.store_code` (`RM01`) + identitas toko (nama, kota, telepon) — **tidak di-hardcode**
- [x] BE: tabel kode dokumen disesuaikan — `JL`, `B1`, `GD`, `SO`, `SJ`, `RJ`, `RB`, `PAY`, `JE`
- [~] BE: `void_reason_code` (**teks bebas, BUKAN enum** — keputusan user 29/30 Jul, lihat §3) +
  `void_reason_note` (teks, wajib) — belum ada kolom sungguhan karena belum ada satu pun
  tabel dokumen (faktur dll mulai Hari 14+); baru ditempelkan saat tabel itu dibuat
- [x] BE: **bersih-bersih aturan yang dicabut** — akun Pendapatan Pembulatan **dihapus**
  (dicek 0 pemakaian di jurnal dev) + `settings.rounding_multiple` dihapus; akun Diskon
  Penjualan/Selisih Pembayaran/Selisih Retur Pembelian ditambah; `settings.default_ar_account_id`
  (auto-diisi id akun Piutang Usaha 1102) & `cash_outflow_approval_threshold` (default 0) ditambah
- [x] BE: migrasi ulang data dev — `document_counters` di-**truncate** (bukan dipetakan ulang),
  aman karena belum ada dokumen sungguhan bernomor lama
- [ ] FE: halaman Settings menampilkan identitas toko + `store_code` (read-only setelah dokumen
  pertama terbit) — **belum dikerjakan, di luar lingkup prompt BE hari ini**
- **DoD:** generator menghasilkan `JL/RM01-26070001`; ganti bulan mereset ke `0001`;
  20 pemanggilan paralel tetap menghasilkan 20 nomor unik berurutan; rollback transaksi
  **mengembalikan** nomor (dibuktikan: `last_number` sama sebelum/sesudah percobaan gagal) —
  **kelima poin ini sudah terbukti lewat test otomatis**, lihat §3 & §4

**Hari 8** 🆕♻️ — Rencana: 30 Jul · Aktual: `30 Jul 2026` (BE + FE selesai)
- [x] BE: master **Merek** + master **UoM** + master **Salesman** (kode, nama, aktif)
- [x] BE: `products` — kode = barcode `YYMMDDXXXX` (**dikunci setelah transaksi pertama**),
  `is_bkp`, nama tersusun 4 bagian + `display_name` **terindeks**, kolom `Isi`
- [x] BE: `customers.ar_account_id` (nullable, sudah ada sejak Hari 3) + **satu fungsi
  bersama** pembaca akun piutang (`ArAccountResolverService`)
- [x] BE: `suppliers.is_pkp`
- [x] BE: rename `warehouse_type` `CUSTOMER_CONSIGNMENT` → **`TITIPAN_PELANGGAN`**
  (migration + backend + FE Warehouses ikut disesuaikan supaya tidak ada value mati)
- [x] FE: halaman Merek, UoM, Salesman (`useSimpleMasterSchema` bersama, bukan copy-paste
  3x — lihat §4); form Produk dirombak total (Merek dropdown/Keterangan/Kemasan/
  Ukuran+Satuan Ukuran) dengan **pratinjau `display_name` besar live**, kode manual +
  tombol "Bangkitkan" + terkunci read-only kalau `isCodeLocked`, `is_bkp` berlabel awam
- [x] FE: `arAccountId` di form Customer digerbangi ke **schema level** (bukan `showIf`)
  supaya benar-benar tidak ada di DOM untuk Operator — sekaligus **memperbaiki bug laten**
  Hari 4 yang membaca `/chart-of-accounts` seolah `{data,meta}` padahal endpoint itu flat
  array (baru ketahuan karena endpoint aslinya baru sungguh dipakai hari ini)
- [ ] **Beri tahu klien: pengisian master data boleh dimulai** (tenggat internal ±20 Agu)
  — **masih belum dilakukan**, sekarang layarnya sudah ada (item FE di atas selesai),
  tinggal dikabari
- **DoD BE:** membuat produk "Bendera Putih Sachet 37 gr" dari 4 bagian terpisah menghasilkan
  `display_name` yang benar dan bisa dicari ✅ (test otomatis + curl manual); kode produk
  yang sudah dipakai transaksi ditolak saat diubah ✅ (test otomatis + curl manual,
  `lockCode()` disimulasikan manual — belum ada pemanggil produksi, StockRecorder/Faktur
  Hari 10+ yang akan memanggilnya); `ar_account_id` NULL jatuh ke
  `settings.default_ar_account_id` lewat fungsi bersama, bukan literal di modul ✅
  (3 test integrasi `ArAccountResolverService`). `./scripts/verify.sh` 10/10 lulus.
- **DoD FE:** mengetik 4 field Produk di browser (Master, login sungguhan) → pratinjau live
  persis **"Bendera Putih Sachet 37 gr"** (contoh baku CLAUDE.md §3), disimpan → kode
  auto-generate, konversi dus=12 pcs benar ✅; login Operator, `GET /master-data/
  customers/create` → teks "Akun Piutang" **tidak ada sama sekali** di `get_page_text`
  (bukan cuma tersembunyi CSS) ✅; login Master → dropdown Akun Piutang hanya berisi
  **"1102 - Piutang Usaha"** (satu-satunya akun `isReceivableAccount && isActive`) ✅.
  `pnpm run build`/`lint` FE 0 error, `npm run build` BE 0 error. Data uji dihapus lagi
  dari DB dev setelah verifikasi (skrip sekali-jalan, konsisten pola Hari 4/5/8).
  **Catatan sesi**: login browser sempat 401 sampai `npm run seed` dijalankan ulang
  (idempotent) — kemungkinan hash password di DB dev sempat basi dari sesi sebelumnya.

**Hari 9** 🆕🔒 — Rencana: 31 Jul · Aktual: `30 Jul 2026` (BE + FE selesai — FE menyusul sore ini)
- [x] BE: `authorization_requests` + `payload` (JSONB, sudah ada sejak Hari 5) + `context_summary` (teks, baru)
- [x] BE: `consumeApproval` **memvalidasi ulang body request terhadap payload yang disetujui**
- [x] BE: `StepUpService.requireApproval()` — dipanggil **dari dalam service**, melempar 412
  dengan kontrak yang sama seperti guard
- [x] BE: `expires_at` dicek **saat eksekusi**, bukan hanya saat approve (sudah ada sejak Hari 5, dipertahankan)
- [x] BE: seragamkan kode status step-up ke **412** (Hari 5 memakai 428)
- [x] BE (susulan sore): `reject()` wajib `reason` + `GET /authorization-requests/:id`
  ownership-gated (dibutuhkan FE untuk polling status milik sendiri) — lihat §3 & §4
- [x] FE (susulan sore): antrian persetujuan menampilkan `context_summary`; polling 5 detik
  (bukan WebSocket) + `<StepUpDialog>` global menangani 412 dari guard maupun service lewat
  satu jalur — lihat §3 & §4 untuk detail dan 2 bug yang ditemukan+diperbaiki saat verifikasi manual
- **DoD:** approval untuk payload Rp 1 juta **ditolak** saat dipakai mengeksekusi Rp 100 juta ✅
  (`authorization-requests.service.spec.ts`, actionType `CASH_OUTFLOW`); request kedaluwarsa
  16 menit ditolak saat eksekusi ✅ (sudah ada dari Hari 5, `authorization-requests.spec.ts`);
  frontend menangani 412 dari guard dan dari dalam service lewat **satu jalur** yang sama ✅
  (dibuktikan `step-up.service.spec.ts` — 412 dari `StepUpGuard` lewat HTTP sungguhan dan dari
  `StepUpService.requireApproval()` dipanggil langsung dibandingkan berdampingan, key set +
  tipe field identik, keduanya lewat helper `stepUpRequiredException()` yang sama persis);
  **FE ✅ diverifikasi manual dua sisi** (operator via browser sungguhan, supervisor via token
  JWT langsung — lihat §3): trigger → modal + countdown → approve → modal lanjut otomatis
  <5 detik tanpa refresh; reject dengan alasan wajib → modal tampilkan alasannya; Batalkan →
  request tetap `PENDING` (tidak menggantung)

### Fase 3 — Engine Inti, lanjutan (Hari 10–13) · 1–4 Agustus

**Hari 10** 🔒 — Rencana: 1 Agu · Aktual: `____`  *(v2: Hari 7)*
- [ ] BE: `stock_movements`, `product_stock_balance`, `stock_cost_lots`, `stock_cost_consumptions`
- [ ] BE: **Stock Recorder + FIFO + row-lock `SELECT ... FOR UPDATE`** urut `lot_date` tertua
- [ ] BE: `stock_cost_lots.supplier_id` (nullable) — melacak supplier asal untuk retur pembelian
- [ ] BE: stok minus diizinkan (`stockWarning`), fallback cost = lot terakhir **yang `unit_cost > 0`**
- [x] FE: halaman Authorization Requests — **sudah selesai lebih awal** sore 30 Jul sebagai
  susulan Hari 9 (lihat Hari 9 §3/§4), bukan menunggu hari ini betulan tiba
- **DoD:** konsumsi FIFO mengambil lot tertua; stok minus jalan dengan warning, tidak ditolak;
  **lot berharga nol dilewati** saat mencari lot terakhir sebagai dasar biaya

**Hari 11** ⚠️🔒 — Rencana: 2 Agu · Aktual: `____`  *(v2: Hari 8 — ini yang dirujuk `CLAUDE.md` §7 & §8)*
- [ ] BE: **integration test 4 invarian** (jurnal balance · FIFO urut · VOID simetris · stok rekonsiliasi)
- [ ] BE: invarian ke-5: **Σ nilai `stock_cost_lots` = saldo akun Persediaan** — inilah yang
  merah duluan kalau diskon pembelian salah masuk jurnal
- [ ] BE: VOID Engine generik + reversing journal **bertanggal hari ini**, bukan tanggal dokumen
- [ ] BE: wiring step-up end-to-end (dummy action) lewat `StepUpService`
- [ ] FE: dashboard placeholder (**Master & Operator saja** — supervisor tidak punya dashboard)
- [ ] **Minta review kode eksternal 2 jam** (engine lengkap — ROI tertinggi)
- **DoD:** 5 test hijau dan jalan otomatis; VOID dokumen bulan lalu **tidak mengubah** angka
  bulan itu (dibuktikan dengan membandingkan saldo sebelum/sesudah)

**Hari 12** — Rencana: 3 Agu · Aktual: `____`  *(v2: Hari 9)* 🛑
- [ ] BE: **Jurnal Manual** endpoint (Master only; tolak akun Persediaan/Piutang/Hutang) —
  **layarnya ⏸ pasca-MVP**
- [ ] BE: **alur Saldo Awal terpadu** (jurnal pembuka + lot FIFO dari angka yang sama),
  bertanggal **1 September 2026**, dengan pengecualian tanggal yang **dinamai eksplisit**
  (diinput Hari 36 untuk tanggal di depannya)
- [ ] FE: halaman Saldo Awal (halaman Jurnal Manual ⏸ pasca-MVP)
- 🛑 **Berhenti & tanya:** bentuk Saldo Awal belum dibahas klien (§1). Kerjakan skema +
  endpoint; layar impornya tunggu jawaban
- **DoD:** jurnal manual ke Persediaan → 403; saldo awal menghasilkan lot yang nilainya
  **persis sama** dengan jurnal pembuka (dibuktikan lewat invarian ke-5 Hari 11)

**Hari 13** ♻️ — Rencana: 4 Agu · Aktual: `____`  *(v2: Hari 10)*
- [ ] BE: Mutasi Gudang bercabang + nomor **`GD`**
- [ ] BE: `TITIPAN_PELANGGAN` → **hanya** insert `warehouse_mutations`, tanpa movement/lot/jurnal;
  validasi qty kumulatif ≤ qty yang sudah dibeli pelanggan itu
- [ ] BE: `STORE` ↔ `BAD_STOCK` → 2 baris `transfer`, lot ikut pindah dengan `unit_cost` sama, tanpa jurnal
- [ ] BE: **`BAD_STOCK` → `STORE` wajib otorisasi supervisor**; arah sebaliknya bebas
- [ ] FE: halaman Mutasi Gudang — **`unit_cost` read-only**, lokasi default `STORE`
- [ ] Uji manual CRUD end-to-end di browser
- **DoD:** mutasi ke titipan tidak membuat satu pun `stock_movements`; mutasi BS→STORE tanpa
  approval → 412; `unit_cost` tidak bisa diketik dari layar mana pun

### Fase 4 — Pembelian (Hari 14–18) · 5–9 Agustus

**Hari 14** ⚠️♻️ — Rencana: 5 Agu · Aktual: `____`  *(v2: Hari 11)*
- [ ] BE: `purchase_invoices`(+lines), `goods_receipts`(+lines) — **tiga tanggal terpisah**
  (`receipt_date` → `lot_date`, `supplier_invoice_date`, `due_date`) + `supplier_invoice_no`
- [ ] BE: urutan hitung baku 9 langkah (`CLAUDE.md` §4) — diskon baris → **diskon faktur
  pro-rata nilai baris**, sisa pembulatan ke baris terakhir
- [ ] BE: **PPN masukan** digerbangi `supplier.is_pkp` × `product.is_bkp`, tarif dari `tax_rates`;
  `company_is_pkp = false` → PPN **masuk `unit_cost` lot**
- [ ] BE: baris **bonus** `is_bonus` — `unit_price = 0`, alokasi diskon 0, PPN 0, `lot.unit_cost = 0`
- [ ] BE: faktur pembelian **selalu ke gudang `STORE`**; ongkir **tidak** dikapitalisasi
- [ ] FE: form Purchase Invoice multi-baris + kolom `Isi` + subtotal/total live
- **DoD:** 1 faktur 3 baris + 1 bonus → jurnal balance, 4 lot terbentuk (satu ber-`unit_cost` 0),
  `total_amount` **persis** sama dengan nota supplier tanpa pembulatan, invarian ke-5 tetap hijau

**Hari 15** ♻️ — Rencana: 6 Agu · Aktual: `____`  *(v2: Hari 12)*
- [ ] BE: **mekanisme kunci cetak generik** — `print_status` (`NOT_PRINTED` → `PRINTED` →
  `PRINT_CANCELLED`), `print_count`, nomor revisi; dipakai **7 dokumen** (`JL`, `B1`, `GD`,
  `SJ`, `RJ`, `RB`, `PAY`)
- [ ] BE: batal cetak = `authorization_requests` `actionType: UNLOCK_PRINT` dengan
  **`intent: EDIT | VOID` dideklarasikan di depan**; token `VOID` hanya bisa dipakai untuk VOID
- [ ] BE: edit bersyarat + VOID Purchase Invoice + reversing journal & stock
- [ ] FE: detail Purchase Invoice + tombol Cetak / Batal Cetak / Edit / VOID sesuai status
- **DoD:** cetak ulang identik jalan tanpa izin (`print_count++`, masuk `audit_logs`); edit
  setelah dicetak tanpa batal cetak → ditolak; token ber-`intent: EDIT` dipakai untuk VOID → ditolak

**Hari 16** ♻️🛑 — Rencana: 7 Agu · Aktual: `____`  *(v2: Hari 13)*
- [ ] BE: `purchase_returns`(+lines) + nomor `RB` — **selalu dari gudang `BAD_STOCK`**
- [ ] BE: alur pilih **supplier dulu** → daftar BS **disaring ke produk yang pernah dibeli
  dari supplier itu** (tidak menunjuk faktur pembelian asal)
- [ ] BE: nilai retur **dinegosiasikan**; Persediaan selalu dikredit sebesar harga pokok lot;
  selisih ke akun **`Selisih Retur Pembelian`** (dua arah)
- [ ] BE: `settlement_type` (`REDUCE_INVOICE` / `CASH`)
- [ ] FE: halaman Retur Pembelian + cetak A5
- 🛑 **Berhenti & tanya (PR #2):** lot dari retur pelanggan punya `supplier_id` NULL —
  boleh diretur ke supplier mana pun, atau diblokir? Jangan menebak
- **DoD:** retur senilai di atas harga pokok → `Selisih Retur Pembelian` **kredit**; di bawah
  harga pokok → **debit**, dan keduanya tetap balance; stok BS berkurang dari lot yang benar

**Hari 17** 🛑 — Rencana: 8 Agu · Aktual: `____`  *(v2: Hari 14)*
- [ ] BE: `operational_expenses` + CRUD + journal + VOID
- [ ] BE: **approval pengeluaran kas besar** — `chart_of_accounts.requires_outflow_approval` +
  `settings.cash_outflow_approval_threshold`, lewat `StepUpService.requireApproval()`
- [ ] FE: halaman Biaya Operasional
- 🛑 **Berhenti & tanya:** modul ini ditunda klien (§1). Yang **pasti** dibutuhkan: ongkir
  pembelian dan gaji harian salesman. Bangun itu dulu, sisanya tunggu jawaban
- **DoD:** pengeluaran di atas ambang dari akun bertanda → 412 dengan `context_summary` terisi;
  VOID menghasilkan jurnal pembalik, baris asli tetap ada

**Hari 18** — Rencana: 9 Agu · Aktual: `____` — **BUFFER TERPAKAI**  *(v2: Hari 15)*
- [ ] BE: CRUD COA penuh untuk Master (akun kas/bank `is_cash_account`, akun piutang custom)
- [ ] FE: form tambah/ubah akun COA + dropdown `ar_account_id` **tersaring hanya akun piutang aktif**
- [ ] Limpahan sisa pekerjaan Fase 4
- **DoD:** Master membuat akun kas baru → langsung terpilih di form pembayaran; `ar_account_id`
  pelanggan **terkunci** selama saldo pelanggan belum nol

### Fase 5 — Penjualan (Hari 19–23A) · 10–16 Agustus

**Hari 19** ♻️ — Rencana: 10 Agu · Aktual: `____`  *(v2: Hari 16)*
- [ ] BE: `sales_orders`(+lines) + CRUD + `convert-to-invoice`
- [ ] BE: **saluran penjualan** sebagai field eksplisit (`PENGIRIMAN` / `TOKO`);
  SO **wajib** untuk `PENGIRIMAN`, tidak perlu untuk `TOKO`
- [ ] BE: **SO tidak menahan stok** — qty terikat SO terbuka hanya ditampilkan sebagai informasi
- [ ] FE: halaman Sales Order + penanda qty terikat
- **DoD:** faktur `PENGIRIMAN` tanpa SO → ditolak; SO terbuka **tidak** mengurangi stok
  tersedia di layar mana pun; SO yang sudah `CONVERTED` tidak bisa diubah

**Hari 20** ⚠️🛑 — Rencana: 11 Agu · Aktual: `____`  *(v2: Hari 17)*
- [ ] BE: `price-suggestion` — **10 transaksi terakhir** untuk pelanggan + produk +
  **satuan yang sedang diketik**, dari faktur yang **tidak VOID**
- [ ] BE: `customer_id` **didenormalisasi** ke `sales_invoice_lines` + indeks
  `(customer_id, product_id, unit_id, id DESC)` — **ditulis di migration ini, bukan nanti**
- [ ] BE: fallback bertingkat (1) pelanggan+produk+satuan → (2) produk+satuan → (3) harga master
- [ ] BE: `sales_invoices`(+lines) migration
- [ ] FE: mulai form Sales Invoice — autocomplete produk by `display_name`, panel riwayat harga
  (Tanggal · Qty · Satuan · @Harga), sisa stok tampil saat mengetik
- [ ] FE: **modal tambah pelanggan dari dalam form** (menyimpan `ar_account_id` NULL)
- 🛑 **Berhenti & tanya (PR #3):** panel kosong untuk satuan yang belum pernah dipakai —
  fallback ke harga master (yang klien bilang tidak dipakai) atau tampilkan kosong?
- **DoD:** pilih pelanggan + produk → 10 harga terakhir muncul < 300 ms **dengan kolom satuan
  terlihat**; ganti satuan dari DUS ke RENCENG → isi panel ikut berganti

**Hari 21** ⚠️♻️ — Rencana: 12 Agu · Aktual: `____`  *(v2: Hari 18)*
- [ ] BE: `POST /sales-invoices` alur penuh (Stock Recorder + Journal Poster, satu transaction)
- [ ] BE: **tidak ada pembulatan** — `total_amount` eksak sampai rupiah
- [ ] BE: diskon **baris + faktur**, keduanya persen ATAU rupiah (alternatif, bukan bertingkat);
  metode **bruto** dengan akun kontra Diskon Penjualan
- [ ] BE: PPN keluaran digerbangi **`company_is_pkp` saja** (status PKP pelanggan tidak menentukan)
- [ ] BE: **batas jual di bawah harga pokok** — `unit_cost` lot terbaru **yang > 0** × konversi,
  dibanding **harga bersih setelah diskon**; `SELL_BELOW_COST`, **satu permintaan per faktur**
  yang memuat semua baris pelanggar; nilai batas **tidak ditampilkan**
- [ ] FE: lanjut form + preview total live + Ctrl+H (ubah harga) & Ctrl+D (ubah diskon)
  **dengan petunjuk yang terlihat di layar**
- **DoD:** faktur bertotal Rp 33.253.125 tersimpan **apa adanya**; produk yang lot terbarunya
  bonus (`unit_cost = 0`) tetap memakai lot berbayar terakhir sebagai batas; produk yang belum
  pernah dibeli → tidak ada batas, tidak error

**Hari 22** ♻️ — Rencana: 13 Agu · Aktual: `____`  *(v2: Hari 19)*
- [ ] BE: edit bersyarat + VOID Sales Invoice (lewat mekanisme kunci cetak Hari 15)
- [ ] FE: detail Sales Invoice
- [ ] FE: **cetak nota A5 landscape, 2-up di A4 portrait**, 14 baris/halaman, `Hal. 1/2`
- [ ] FE: kepala nota dari `settings` (nama toko, kota, telepon) + nama & kota pelanggan;
  kaki nota baris audit cetak (siapa & kapan); nota revisi mencantumkan **nomor revisi**
- [ ] FE: dokumen `VOIDED` **boleh dicetak ulang dengan tanda VOID** untuk arsip
- **DoD:** nota 16 baris pecah ke 2 halaman dengan benar; dua nota A5 muat presisi di satu A4;
  VOID mengembalikan stok & lot; hasil cetak ulang identik tidak meminta izin apa pun

**Hari 22A** 🆕 — Rencana: 14 Agu · Aktual: `____`
- [ ] BE: `review_status` (`BELUM_DICEK` → `DISETUJUI` / `BERMASALAH`) + catatan supervisor
- [ ] BE: **pakai ulang** `GET /sales-invoices` & `GET /purchase-invoices` dengan filter
  `reviewStatus` — **dilarang** membuat keluarga endpoint `/supervisor/*`
- [ ] FE: **Halaman Pengecekan Invoice Harian** — nomor, toko/pelanggan, nominal, status, detail
- [ ] FE: navigasi supervisor **3 item saja**: Pengecekan Invoice · Antrian Persetujuan · Laporan.
  **Tidak ada dashboard**
- [ ] FE: polling 5 detik untuk antrian persetujuan
- **DoD:** supervisor menandai `BERMASALAH` → **tidak** bisa mengedit faktur (403), hanya
  menandai; operator melihat penandaan itu dan memperbaikinya; pengecekan **tidak memblokir**
  operator mencetak nota kapan pun

**Hari 23** ♻️ — Rencana: 15 Agu · Aktual: `____`  *(v2: Hari 20)*
- [ ] BE: `sales_returns`(+lines) + nomor `RJ` — **wajib menunjuk faktur asal**
- [ ] BE: harga pokok **wajib** dari `sales_invoice_lines.unit_cost_fifo`, bukan harga baru
- [ ] BE: barang retur **selalu masuk `BAD_STOCK`**, tidak pernah kembali ke stok jual
- [ ] BE: jurnal 4 sisi + `settlement_type` (`REDUCE_INVOICE` / `CASH`)
- [ ] FE: halaman Retur Penjualan + cetak A5 + kunci cetak
- **DoD:** retur atas faktur **lunas** dengan `CASH` → jurnal kas benar dan `paid_amount`
  tidak pernah melebihi `total_amount`; lot yang terbentuk di BS ber-`unit_cost` sama dengan
  `unit_cost_fifo` faktur asal

**Hari 23A** ⏸ — **DITUNDA KE PASCA-MVP** (§7) · bekas rencana 16 Agu
- [ ] BE: `accounting_periods` + **tutup bulan oleh MASTER**
- [ ] BE: **closing** — akun laba-rugi ditutup (tidak terbawa), akun neraca saldo akhir →
  saldo awal bulan berikutnya
- [ ] BE: **pembayaran & retur atas faktur bulan tertutup tetap jalan** (yang diblokir hanya
  edit & VOID) — ada test khususnya
- [ ] BE: **satu validator bersama** yang menggabungkan backdate maks 2 hari **dan** periode
  tertutup — dipanggil semua modul transaksi
- [ ] BE: setelah ditutup: edit **dan** VOID dokumen bulan itu sama-sama ditolak; tidak ada
  transaksi baru bertanggal di dalamnya
- [ ] BE: **buka kembali** oleh MASTER — alasan wajib, masuk `audit_logs`, periode diberi
  **penanda permanen** di daftar
- [ ] FE: halaman Periode + peringatan eksplisit bahwa laporan yang sudah diserahkan bisa berubah
- **DoD:** VOID dokumen bulan tertutup → ditolak; VOID dokumen bulan **berjalan** atas dokumen
  lama tetap jalan dan jurnal pembaliknya **bertanggal hari ini** sehingga angka bulan tertutup
  tidak bergerak sepeser pun

### Fase 6 — Pengiriman & Pembayaran (Hari 24–28) · 17–21 Agustus

**Hari 24** — Rencana: 16 Agu · Aktual: `____`  *(v2: Hari 21)*
- [ ] BE: `agents`, `vehicles` + CRUD (tetap dibangun — surat jalan membawa keduanya
  meski rekap setoran dipotong)
- [ ] BE: `delivery_orders`(+lines) + nomor `SJ`
- [ ] FE: halaman Agen, Kendaraan
- **DoD:** surat jalan terbentuk dari faktur bersaluran `PENGIRIMAN`, membawa agen & kendaraan

**Hari 25** ♻️ — Rencana: 17 Agu · Aktual: `____`  *(v2: Hari 22)*
- [ ] BE: endpoint surat jalan + status (`PENDING`/`DELIVERED`/`POSTPONED`/`RETURNED`)
- [ ] FE: halaman Surat Jalan + **cetak A5** + ikut kunci cetak
- **DoD:** status `POSTPONED` muncul sebagai daftar "belum terkirim"; surat jalan yang sudah
  dicetak tidak bisa diedit tanpa batal cetak

**Hari 26** ⚠️🛑 — Rencana: 18 Agu · Aktual: `____`  *(v2: Hari 23)*
- [ ] BE: `payment_batches` + `payment_batch_methods` + `payments` + `agent_id`/`vehicle_id`
- [ ] BE: `POST /payments/preview-allocation` (FIFO, tolak overpayment)
- [ ] FE: Payment step 1 — pilih pihak + input **multi-metode**
- 🛑 **Berhenti & tanya:** modul ini **belum pernah dibahas klien** dan plan menandainya
  bagian tersulit. Bangun skema + preview dari plan v2, lalu **berhenti** sebelum menulis
  jurnalnya. Konfirmasi dulu: setoran sopir, pembayaran sebagian, dan pembayaran lintas faktur
- **DoD:** 30 jt kas + 50 jt transfer atas tagihan 100 jt → preview benar, sisa 20 jt outstanding

**Hari 27** ⚠️♻️🛑 — Rencana: 19 Agu · Aktual: `____`  *(v2: Hari 24)*
- [ ] BE: `POST /payments/confirm` (multi-metode, AR + AP simetris)
- [ ] BE: **selisih pembayaran** — hanya muncul saat operator menyatakan faktur **lunas**;
  pembayaran sebagian bukan selisih. **Satu akun `Selisih Pembayaran`, dipakai dua arah**
- [ ] BE: selisih di atas **Rp 10.000** otomatis **ditandai** di layar pengecekan supervisor
  (ditandai, **bukan** diblokir, **bukan** minta step-up)
- [ ] BE: VOID payment batch
- [ ] FE: Payment step 2 — alokasi dapat diedit manual + riwayat batch
- 🛑 **Berhenti & tanya:** lihat Hari 26
- **DoD:** tagihan 33.253.125 dibayar 33.253.000 → lunas, selisih 125 masuk akun Selisih
  Pembayaran sisi debit; dibayar 33.254.000 → lunas, 875 masuk sisi kredit; keduanya balance

**Hari 28** ♻️🆕 — Rencana: 20 Agu · Aktual: `____`  *(v2: Hari 25 — rekap setoran agen **dipotong**)*
- [ ] BE: **Laporan Kontinuitas Nomor Dokumen** — per jenis per periode, menampilkan **setiap**
  nomor dari `0001` sampai terakhir terbit, statusnya, dan justifikasi VOID-nya
- [ ] FE: halaman Laporan Kontinuitas + export Excel
- [ ] ~~Rekap setoran agen~~ **dipotong** — pastikan penggantinya ada di kertas: siapa
  mencocokkan setoran sopir dengan faktur terkirim, kapan, siapa memeriksa (`KONTEKS` §4.4)
- **DoD:** VOID satu faktur di tengah lalu buka laporan → nomor itu **tetap muncul** dengan
  status VOID dan alasannya terbaca; tidak ada satu pun lubang nomor di antara `0001` dan terakhir

### Fase 7 — Laporan & Serah Terima (Hari 29–37) · 21–30 Agustus
> Hari 27–28 Agustus sengaja dikosongkan sebagai cadangan. Hari 36 & 37 dipatok di
> 29 & 30 Agustus karena saldo awal butuh angka sedekat mungkin dengan cut-over.

**Hari 29** 🛑 — Rencana: 21 Agu · Aktual: `____`  *(v2: Hari 26)*
- [ ] BE: laporan stok per gudang (**satuan dipecah**: "12 dus 15 renceng", bukan desimal)
- [ ] BE: **laporan barang titipan per pelanggan** (sumber `warehouse_mutations`)
- [ ] BE: daftar titipan **muncul di proses stok opname** sebagai penjelasan selisih fisik
- [ ] FE: halaman Laporan Stok, Barang Titipan
- 🛑 **Berhenti & tanya:** isi laporan yang benar-benar dipakai klien belum dibahas (§1)
- **DoD:** stok 315 renceng dengan konversi 1 dus = 25 tampil sebagai "12 dus 15 renceng"

**Hari 30** ⏸ — **DITUNDA KE PASCA-MVP** (§7) · bekas rencana 23 Agu  *(v2: Hari 27)*
- [ ] BE: laporan penjualan (termasuk **per salesman**), piutang, hutang
- [ ] FE: halaman laporan tsb
- **DoD:** laporan piutang memakai `customer.ar_account_id ?? default` lewat fungsi bersama
  yang sama dengan faktur — bukan query akun default langsung

**Hari 31** ♻️ — Rencana: 22 Agu · Aktual: `____`  *(v2: Hari 28)*
- [ ] BE: **rekap kas harian per akun** (laporan biaya operasional ⏸ pasca-MVP)
- [ ] ~~Cash opname~~ **dipotong**
- [ ] FE: halaman Kas
- **DoD:** rekap kas harian cocok dengan mutasi akun kas di buku besar untuk tanggal yang sama

**Hari 32** ♻️ — Rencana: 23 Agu · Aktual: `____`  *(v2: Hari 29)*
- [ ] BE: endpoint rekonsiliasi stok (fisik vs sistem, dengan titipan sebagai penjelas)
- [ ] ~~Laporan retur & stok minus~~ **dipotong** — sementara pakai query manual
- [ ] FE: halaman Rekonsiliasi Stok
- **DoD:** selisih fisik yang disebabkan barang titipan terjelaskan otomatis, tidak jadi selisih

**Hari 33** ⚠️♻️ — Rencana: 24 Agu · Aktual: `____`  *(v2: Hari 30)*
- [ ] Deploy: **Postgres native + NestJS sebagai Windows service (`nssm`) + nginx** untuk FE
  statis (`ssr: false`). **Tanpa Docker** — `docker-compose.yml` tetap di repo untuk pindah mesin
- [ ] Tuning Postgres: `shared_buffers 1GB`, `effective_cache_size 3GB`, `checkpoint_timeout 15min`,
  `checkpoint_completion_target 0.9`, `max_wal_size 2GB`, `random_page_cost 4.0`,
  **`synchronous_commit` tetap `on`**
- [ ] Matikan restart otomatis Windows Update; `pg_dump` terjadwal **di luar jam kerja**;
  Postgres & NestJS auto-start
- [ ] **UPS terpasang dan diuji** (cabut listrik → mesin tetap hidup → shutdown rapi)
- [ ] BE: export **Excel** seluruh laporan (~~PDF~~ **dipotong**)
- **DoD:** cabut listrik saat 3 faktur sedang diinput → setelah listrik kembali, DB konsisten
  dan tidak ada dokumen setengah jadi; reboot mesin → aplikasi hidup sendiri tanpa disentuh

**Hari 34** — Rencana: 25 Agu · Aktual: `____` — **BUFFER**
- [ ] Perbaikan temuan UAT minggu 1–4

**Hari 35** — Rencana: 26 Agu · Aktual: `____`  *(v2: Hari 32)*
- [ ] BE: audit RBAC/Permission Matrix lintas endpoint (`CLAUDE.md` §5)
- [ ] FE: audit Permission Matrix lintas halaman
- **DoD:** login sebagai SUPERVISOR → hanya 3 menu terlihat, tidak ada dashboard, semua
  endpoint tulis faktur → 403; login sebagai OPERATOR → COA 403, supplier ter-mask

**Hari 36** — Rencana: 29 Agu · Aktual: `____` — **BUFFER TERPAKAI: INPUT SALDO AWAL**
- [ ] Input saldo awal stok, piutang, hutang — bertanggal **1 September 2026**
- [ ] `GET /opening-balance/verify` selisih 0; invarian 1–5 hijau **setelah** saldo awal masuk
- [ ] Rencana penyesuaian selisih 29–31 Agustus disepakati klien dan dicatat di §3

**Hari 37** — Rencana: 30 Agu · Aktual: `____`  *(v2: Hari 34)*
- [ ] Smoke test end-to-end (login → semua modul → logout)
- [ ] **Dokumentasi setup & deploy** + prosedur restore backup
- [ ] Serah terima + Checklist Go-Live + repo dipindah ke akun klien
- **DoD:** klien menjalankan restore dari `pg_dump` **sendiri** dengan panduan tertulis, tanpa
  dibantu — kalau tidak bisa, backup itu tidak nyata

---
## 3. Catatan Harian & Hambatan

Isi hanya kalau ada yang meleset atau ada keputusan baru. Kosong = lancar.

| Tgl | Hari ke- | Kejadian | Dampak jadwal | Tindakan |
|---|---|---|---|---|
| 26 Jul 2026 | 1 | Mesin dev hanya 7.7GB RAM (sering <1GB free). Docker Desktop jalan bareng build Nuxt/Vite memicu crash `memory allocation failed` (esbuild/Vite OOM) — sudah dibuktikan gagal saat Docker jalan, sukses setelah Docker dimatikan. | Tidak ada drift, tapi menetapkan konvensi dev harian. | Postgres native Windows (port 5432) jadi DB dev harian, bukan Docker. `docker-compose.yml` tetap di repo untuk deploy ke mini PC nanti (dipetakan ke port 5433 agar tidak bentrok kalau harus jalan bareng Postgres native). `scripts/verify.sh` diubah untuk cek Postgres native langsung, bukan lewat `docker compose exec`. |
| 27 Jul 2026 | 4 | §1 "Keputusan hosting final" dibutuhkan **sebelum Hari 4** — sampai akhir Hari 4 masih ⏳ (sementara asumsi mini PC lokal, sesuai default plan). | Belum ada drift jadwal (deploy Docker baru dipakai Hari 30+), tapi risiko menumpuk kalau dibiarkan sampai mendekati Hari 30 (pengadaan mini PC+UPS). | Tanyakan ulang ke klien besok; kalau masih belum ada jawaban di Hari 10 (buffer Fase 2), eskalasi jadi blocker eksplisit. |
| 27 Jul 2026 | 6 | Migration `CreateJournalEntries` sempat lupa dijalankan (`npm run migration:run`) di DB dev `omega_dev` setelah dibuat — ketahuan lewat integration test yang gagal `relation "journal_entries" does not exist"`, bukan lewat `verify.sh` (skrip itu cuma menguji up→down→up di DB sementara, tidak menerapkan ke DB dev harian). | Tidak ada drift, tapi berpotensi berulang tiap migration baru kalau tidak diingat manual. | Jalankan `npm run migration:run` manual segera setelah bikin migration baru, sebelum lanjut coding fitur yang bergantung padanya. Pertimbangkan tambah langkah ini ke `verify.sh` atau checklist DoD kalau kejadian lagi di Hari 7+. |
| 27 Jul 2026 | 5 & 6 | Verifikasi FE untuk kedua hari ini (Suppliers/Warehouses/ExportButton Hari 5; COA tree + Jurnal Hari 6) baru lewat pembacaan kode + kontrak API asli — ekstensi Chrome browser automation tidak konek di sesi ini. | Tidak ada drift jadwal, tapi risiko kualitas: bug visual (styling, expand/collapse tree, drawer, download filename) baru ketahuan belakangan. | Servers BE (`:3000`)/FE (`:3001`) ditinggal jalan; **wajib** uji manual di browser sebelum halaman-halaman ini dianggap benar-benar final — jadwalkan sesegera ekstensi Chrome konek lagi. |
| 28 Jul 2026 | — | **Sesi revisi klien sepanjang hari.** Sebelas putaran tanya-jawab menghasilkan perubahan yang menyentuh aturan terkunci: pembulatan dicabut, PPN masukan dikapitalisasi, penomoran dokumen ganti format, kunci cetak, tutup bulan, pengawasan supervisor, bad stock naik jadi simpul, dan volume transaksi terkoreksi dari 50–100/hari jadi 11–12/hari. Tidak ada baris kode ditulis. | **−1 hari kalender**, dan keunggulan 5 hari habis dipakai membiayai beban revisi ≈10,35 hari. | `CLAUDE.md` naik ke v2, `KONTEKS_REVISI_2026-07-28.md` dibuat, `PROGRESS.md` & `PROMPTS_HARIAN.md` naik ke v3 dengan spine digeser +3 untuk rework Hari 7–9. |
| 29 Jul 2026 | 7 | Penomoran hari berubah: rework menempati Hari 7–9, seluruh hari setelahnya bergeser +3, dan scope BARU masuk lewat hari sisipan berhuruf (22A, 23A) supaya tidak ada pergeseran kedua. Total jadi 37 hari + 2 sisipan. | Cut-over **tidak** bergerak — pergeseran diserap keunggulan 5 hari. Hari terakhir 30 Agu, menyisakan 31 Agu sebagai cadangan. | Peta penomoran ditaruh di §0.1. `CLAUDE.md` §7 & §8 masih menyebut "Hari 8" untuk integration test — **patch jadi Hari 11**. |
| 29 Jul 2026 | 7 | **Keputusan scope: posting jalan, pelaporan menyusul.** Klien setuju tutup bulan dan laporan dikerjakan setelah 30 Agustus. Yang ditunda: tutup bulan + closing (Hari 23A), laporan penjualan/piutang/hutang (Hari 30), laporan biaya operasional (bagian Hari 31), layar Jurnal Manual (bagian Hari 12). Jurnal tetap ditulis saat transaksi — itu tidak ditunda. | **+2,65 hari.** Margin pulih dari nol. Deploy (Hari 33) maju 2 hari ke 24 Agustus, dan 27–28 Agustus jadi cadangan kosong. | Prompt hari yang ditunda **disimpan utuh** bertanda ⏸, tidak dihapus. Backlog pasca-MVP dibukukan di §7. `PeriodLockValidator` tetap dibuat sebagai satu titik masuk meski baru memeriksa backdate. |
| 29 Jul 2026 | 7 | Klien menjelaskan mekanisme **closing**: akun laba-rugi ditutup dan tidak terbawa; akun neraca saldo akhirnya jadi saldo awal bulan berikutnya, dan buku besar dibuka dengan baris Saldo Awal. Contoh baku: piutang 5 jt tgl 29 → saldo akhir 5 jt kredit tgl 31 → saldo awal 5 jt debit tgl 1 → 5 jt kredit saat dibayar. | Menutup risiko terbesar yang sempat terbuka: pembayaran atas faktur bulan tertutup ternyata memang harus tetap jalan, dan itu sekarang tertulis sebagai aturan, bukan asumsi. | Masuk `CLAUDE.md` v3 §2.15 + §4. **Satu sub-keputusan masih terbuka**: baris Saldo Awal/Akhir itu jurnal sungguhan atau konstruksi tampilan — harus turun sebelum Hari 23A. |
| 29 Jul 2026 | 7 | Keputusan klien: saldo awal bertanggal **1 September 2026**, diinput di **Hari 36**; Sales Order **tidak** ikut kunci cetak. | Buffer Hari 36 habis terpakai — buffer tersisa tinggal Hari 34. | Hari 36 tidak lagi kosong. Saldo awal butuh pengecualian tanggal karena diinput 29 Agu untuk tanggal 1 Sep. |
| 29 Jul 2026 | 7 | Sisa aturan yang sudah dicabut ternyata masih hidup di hasil Hari 3: akun **Pendapatan Pembulatan** ikut ter-seed di COA dan `settings.rounding_multiple = 100` masih ada, padahal pembulatan sudah dicabut. Sebaliknya tiga akun yang dibutuhkan v2 belum ada: Diskon Penjualan (metode bruto), Selisih Pembayaran, Selisih Retur Pembelian. | Kalau ketahuan setelah Hari 21, jurnal penjualan pertama gagal karena akun kontra tidak ada. | Dimasukkan ke lingkup rework Hari 7. Akun yang sudah terlanjur dipakai di jurnal dev dinonaktifkan, bukan dihapus. |
| 29 Jul 2026 | 7 | Kode status step-up tidak konsisten: implementasi Hari 5 memakai **428**, `CLAUDE.md` §5 menetapkan **412**. | Dua kode untuk satu makna membuat frontend diam-diam punya dua jalur penanganan. | Diseragamkan ke **412** di rework Hari 9, termasuk guard lama, `<StepUpDialog>`, dan test. |
| 29 Jul 2026 | 7 | Dicek ulang saat eksekusi rework Hari 7: akun **Pendapatan Pembulatan** ternyata **0 pemakaian** di `journal_entry_lines` dev (bukan "terlanjur dipakai" seperti dugaan baris di atas). | Tidak ada risiko kehilangan histori jurnal. | Akun **dihapus beneran** (bukan dinonaktifkan) — koreksi atas rencana baris sebelumnya, yang tetap berlaku sebagai fallback andai suatu saat akun serupa sudah terlanjur dipakai. |
| 29 Jul 2026 | 7 | **Keputusan: `void_reason_code` bukan enum, cukup teks bebas ketikan** (sama seperti `void_reason_note`) — berbeda dari `KONTEKS_REVISI` §2.3 yang menulis "(enum)". | Tidak ada tabel dokumen yang perlu dimigrasi ulang kalau daftar alasan berubah nanti — cukup ubah label di FE. | Tidak ada kolom dibuat hari ini (belum ada tabel dokumen sungguhan, semua mulai Hari 14+); keputusan ini yang dipakai saat kolom itu ditambahkan ke tiap tabel dokumen nanti. `KONTEKS_REVISI` §2.3 dibiarkan sebagai arsip historis, tidak diedit ulang. |
| 29 Jul 2026 | 7 | `chart_of_accounts.account_type` untuk 3 akun baru (Diskon Penjualan, Selisih Pembayaran, Selisih Retur Pembelian) tidak ditentukan di manapun — CLAUDE.md/KONTEKS cuma mewajibkan akunnya ada. | Klasifikasi P&L keliru bisa membuat laporan laba-rugi salah kelompok. | Diputuskan: Diskon Penjualan → `INCOME` (kode 4104, ikut pola Retur Penjualan 4103 sesama kontra-pendapatan); Selisih Pembayaran → `EXPENSE` (5103); Selisih Retur Pembelian → `EXPENSE` (5104), karena keduanya dua-arah dan tidak pas di ASSET/LIABILITY/EQUITY. Tinjau ulang saat audit RBAC/laporan Hari 32 kalau ternyata keliru. |
| 29 Jul 2026 | 7 | Ditemukan tiga ketidakcocokan di dokumen sumber: (1) `CLAUDE.md` §2.4 memutuskan kode faktur pembelian `B1` tapi §3 masih menulis `PI`; (2) `KONTEKS` §2.1 menyebut kunci cetak 6 dokumen sementara §2.9 menaikkannya jadi 7 dengan `GD`; (3) `CLAUDE.md` §2.10 merujuk selisih pembayaran ke "§2.17" padahal itu aturan ke-18. | Tidak ada dampak jadwal kalau diputuskan sekarang; berpotensi jadi migrasi data kalau ketahuan setelah Hari 14. | Diputuskan: **`B1`**, **7 dokumen**, rujukan **§2.18**. Diterapkan di v3 kedua file. Perbaiki juga di `CLAUDE.md` saat sempat. |
| 30 Jul 2026 | 8 | Master **`units`** (satuan jual/beli) baru berdiri sebagai CRUD kecil berdiri sendiri — **belum di-FK** ke `products.base_unit`/`product_unit_conversions.unit_name`, keduanya masih free text seperti sejak Hari 3/4. Tidak diminta eksplisit di prompt Hari 8, dan konversi satu-tingkat-ke-base yang sudah ada sudah sesuai CLAUDE.md §3. | Kalau operator mengetik satuan bebas di form Produk (bukan pilih dari master `units`), typo satuan tidak akan tertangkap sampai FIFO/laporan stok. | Belum jadi masalah karena FE form Produk juga belum dikerjakan (susulan). **Putuskan sebelum FE Produk dibuat**: apakah `unitName`/`baseUnit` tetap free text atau diganti `unitId` FK ke `units`. |
| 30 Jul 2026 | 8 | Kode produk (barcode `YYMMDDXXXX`) yang dibangkitkan otomatis pakai **`product_code_seq` global** (tidak reset harian/bulanan) — beda pola dari `document_counters` (reset bulanan). Data contoh klien (`2401200034` = "produk ke-34") dibaca sebagai sequence global, bukan sequence per-hari. | Kalau ternyata `XXXX` seharusnya reset per hari (bukan global), kode yang sudah terbit hari ini perlu dipetakan ulang sebelum dipakai transaksi sungguhan (setelah itu terkunci, §2 CLAUDE.md). | Belum ada produk sungguhan bertransaksi — aman diubah sampai sebelum Hari 10 (Stock Recorder mulai mengunci kode). Konfirmasi ke klien kalau ragu. |
| 30 Jul 2026 | 8 | **`ProductsService.lockCode()`** dibuat sebagai titik masuk tunggal untuk mengunci kode produk, tapi **belum ada pemanggil produksi** — DoD hari ini dibuktikan dengan memanggilnya manual (test + `UPDATE` langsung di DB untuk smoke test manual), bukan lewat alur transaksi sungguhan (belum ada, mulai Hari 10). | Kalau lupa disambungkan nanti, kode produk tidak akan pernah terkunci meski sudah dipakai transaksi — kontrol §2 CLAUDE.md diam-diam tidak jalan tanpa error apa pun. | **Wajib disambungkan** begitu StockRecorder (Hari 10) atau Faktur Pembelian/Penjualan (Hari 14/21) menyentuh produk pertama kalinya. Catat sebagai syarat DoD hari-hari itu. |
| 30 Jul 2026 | 8 | Verifikasi browser FE Hari 8 sempat gagal login (`master`/`master` → 401) walau seed sudah pernah dijalankan Hari 2. | Tidak ada dampak jadwal — hanya blocker sesaat saat QA manual. | `npm run seed` dijalankan ulang (idempotent, "Diperbarui: master/supervisor/operator") sebelum login dicoba lagi, berhasil. Penyebab pasti tidak ditelusuri (kemungkinan hash password DB dev basi dari sesi lain) — kalau terulang, cek dulu apakah DB dev sudah pernah di-reset/restore tanpa re-seed. |
| 30 Jul 2026 | 9 | Prompt Hari 9 eksplisit **backend-only** — checklist asli `PROGRESS.md` juga mencantumkan "FE: antrian persetujuan menampilkan `context_summary`". | FE antrian persetujuan (dan halaman Authorization Requests yang lebih lengkap: antrian+modal approve) masih belum ada sama sekali — Hari 10 checklist sudah mencantumkan ini juga ("FE: halaman Authorization Requests, memakai `context_summary` Hari 9"), jadi tidak hilang, cuma menyatu ke Hari 10. | Item FE Hari 9 ditandai `[ ]` dengan catatan, bukan dihapus. Jangan kaget kalau Hari 10 FE-nya terasa "dobel" dengan baris ini — itu memang scope yang sama, cuma pindah hari. |
| 30 Jul 2026 | 9 | Payload matcher per actionType (CLAUDE.md §19) baru dibuat KONKRET untuk `CASH_OUTFLOW` (`{accountId, amount}`) dan `TEST_STEP_UP_ACTION` (selalu cocok). `VOID_DOCUMENT`/`UNLOCK_PRINT`/`SELL_BELOW_COST`/`BS_TO_STORE` sengaja **belum** didaftarkan — bukan lupa. | Kalau Hari 13/15/17/21 memanggil `StepUpService.requireApproval()`/guard dengan actionType itu sebelum menambah entry di `payload-matchers.ts`, `matchesApprovedPayload()` melempar Error murni (500, fail closed) — bukan diam-diam meloloskan payload apa pun. | **Wajib**: hari yang pertama kali memakai salah satu dari 4 actionType itu menambah entry `exactFields([...])` di `payload-matchers.ts` sesuai kontrak payload sungguhan hari itu, sebelum endpoint/aksinya dianggap selesai. |
| 30 Jul 2026 | 9 | `StepUpService` dibuat di `src/core/step-up/` (CLAUDE.md §6: engine service, terima `EntityManager` opsional dari pemanggil) — `AuthorizationRequestsService.create()`/`consumeApproval()`/`findOneOrFail()`/`applyLazyExpiry()` semuanya direvisi menerima `manager?: EntityManager` (pola sama `ArAccountResolverService.resolve()` Hari 8), supaya konsumsi approval ikut transaction bisnis pemanggilnya (rollback aksi VOID/kas besar nanti ikut membatalkan status EXECUTED). | Belum ada pemanggil produksi hari ini — dibuktikan lewat test yang sengaja membungkus `consumeApproval(..., manager)` dalam `dataSource.transaction()` yang di-rollback paksa, dan status tetap `APPROVED` (bukan `EXECUTED`) setelahnya (`authorization-requests.service.spec.ts`). | Pemanggil pertama menyusul Hari 13 (BS→STORE)/15 (UNLOCK_PRINT)/17 (CASH_OUTFLOW)/21 (SELL_BELOW_COST/VOID_DOCUMENT) — WAJIB memanggil `StepUpService.requireApproval()` dengan `manager` dari transaction yang sama dengan tulisan bisnisnya, bukan membiarkan default (tanpa manager) kalau aksinya menulis DB lain dalam transaction yang sama. |
| 30 Jul 2026 | 8 | **Bug laten ditemukan**: `useCustomerSchema.ts` (Hari 4) membaca `GET /chart-of-accounts` dengan asumsi bentuk `{data, meta}` (pola paginated seperti modul lain), padahal `ChartOfAccountsController.findAll()` (dibuat Hari 6) mengembalikan **flat array**. Tidak pernah ketahuan sebelumnya karena endpoint itu 404 sampai Hari 6, dan `CrudFormPage.loadOptions()` menelan error loader dengan aman (fail-silent, form tetap jalan tanpa field terisi) — begitu endpoint benar-benar ada dan dipanggil hari ini (FE form Produk/Customer pertama kali menyentuhnya sungguhan), field `arAccountId` akan selalu kosong tanpa error. | Kalau tidak ditemukan, MASTER tidak akan pernah bisa memilih akun piutang custom pelanggan — dropdown selalu kosong tanpa satu pun error terlihat, persis pola "silent failure" yang CLAUDE.md ingatkan berulang kali soal akun piutang (§3). | Diperbaiki hari ini sekaligus dengan gerbang MASTER-only: `res` dibaca langsung sebagai array, difilter `isActive && isReceivableAccount` di FE. Dibuktikan manual di browser — dropdown Master menampilkan tepat "1102 - Piutang Usaha". |
| 30 Jul 2026 | 9 | **Koreksi baris di atas**: prompt susulan sore ini mengklaim `<StepUpDialog>` "dari Hari 7 lama SUDAH ADA — jangan bikin komponen baru". Digrep dulu sebelum percaya — **0 hasil** di seluruh `frontend/app` untuk `StepUpDialog`/`428`/`requiresAuthorization`. FE step-up (dialog, antrian persetujuan) memang belum pernah dibangun sama sekali; baris tabel 30 Jul di atas (Hari 9, "menyatu ke Hari 10") sudah benar. | Kalau langsung dipercaya tanpa cek, akan mencoba "memperluas" komponen yang tidak ada. | Dibangun baru: `useStepUp.ts`, `<StepUpDialog>`, `usePayloadFormatter.ts`, `useClockTick.ts`, `pages/persetujuan/index.vue`. Detail lengkap di §4. |
| 30 Jul 2026 | 9 | DoD FE ("alasan wajib saat menolak", "operator melihat alasannya") ternyata **tidak bisa dipenuhi murni dari FE** — `reject()` backend tidak punya cara menyimpan alasan sama sekali, dan tidak ada endpoint bagi requester (OPERATOR) untuk mengecek status permintaannya sendiri (`GET /authorization-requests` di-`@Roles(MASTER, SUPERVISOR)`). | Kalau dipaksa FE-only, `<StepUpDialog>` operator tidak akan pernah tahu kenapa ditolak atau kapan disetujui — DoD gagal diam-diam. | Backend diperluas secukupnya: `reject()` sekarang wajib `reason` (menimpa kolom `reason` yang sama, bukan kolom baru); `GET /authorization-requests/:id` baru, digerbangi kepemilikan (requester sendiri ATAU MASTER/SUPERVISOR) di controller — ini yang dipoll dialog tiap 5 detik. 2 test lama disesuaikan + 2 test baru ditambah, 12 suite/51 test tetap hijau. |
| 30 Jul 2026 | 9 | **2 bug ditemukan lewat verifikasi manual browser** (bukan cuma baca kode): (1) `useClockTick`'s `setInterval` sempat jalan di SSR juga — Nuxt dev belum `ssr:false` (itu rencana Hari 33), sehingga muncul 500 "`setInterval` should not be used on the server"; (2) `closeDialog()` sempat me-reset SELURUH state modal (`contextSummary`/`phase`/`message`) serentak dengan menurunkan `open`, membuat modal "berkedip" balik ke tampilan "Menunggu Persetujuan" selama transisi keluar UModal (terlihat jelas di alur Batalkan). | Bug #1 mem-block seluruh halaman yang memakai countdown TTL (500 error, bukan cuma glitch visual). Bug #2 murni kosmetik tapi bisa membingungkan operator soal status sebenarnya saat modal menutup. | (1) Guard `import.meta.client` sebelum `setInterval`. (2) `closeDialog()` sekarang cuma menurunkan `open`; field lain dibiarkan sampai `withStepUp()` berikutnya menimpa `state.value` penuh saat modal baru dibuka. Keduanya cuma ketahuan lewat uji manual di browser sungguhan (dua tab + curl sebagai "supervisor kedua", karena cookie sesi dibagi satu profil browser per origin, bukan per tab) — tidak akan ketahuan dari `npm run build`/`lint`/`test` saja. |

---

## 4. Modul Selesai

Isi ulang tiap update. Salin bagian ini ke context prompt AI berikutnya.

> ⚠️ **Baca bersama Hari 7–9.** Bagian ini merekam keadaan per 27 Juli, sebelum revisi klien.
> Yang tercatat di sini soal **format nomor dokumen** (`INV/2609/0001`), **skema produk**,
> **`warehouse_type`**, dan **`authorization_requests`** sudah **digantikan** oleh rework
> Hari 7–9. Jangan menyalin bagian ini ke prompt AI tanpa menyertakan Hari 7–9, atau Claude
> Code akan membangun di atas skema yang sudah mati.

```
Hari 1 — Scaffold (belum masuk urutan modul, prasyarat semua modul berikutnya):
- Backend: NestJS modular (src/app.module.ts) + TypeORM (@nestjs/typeorm) + ConfigModule
  + GET /health (cek koneksi DB) + ValidationPipe global + CORS. DataSource CLI terpisah
  di src/database/data-source.ts untuk migration (belum ada migration, mulai Hari 3).
- Frontend: Nuxt 3 + Nuxt UI (template `ui`) + layout sidebar/topbar
  (app/layouts/default.vue pakai UDashboardGroup/Sidebar/Panel/Navbar) + app/pages/.
  Package manager FE = pnpm (bukan npm) karena template Nuxt UI resmi pakai pnpm lockfile.
- DB dev: Postgres native Windows, port 5432, db `omega_dev`, extension pgcrypto aktif.
  docker-compose.yml (postgres, port 5433) ada di repo untuk deploy nanti, TIDAK dipakai
  harian (RAM mesin dev cuma 7.7GB, Docker bareng build FE bikin OOM).
- Env var DB: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME (bukan DB_DATABASE) —
  penting disamakan persis kalau bikin service/config baru yang baca DB_*.
- scripts/verify.sh sudah disesuaikan ke Postgres native (bukan docker compose exec).

Hari 2 — Auth (BE + FE):
- Migration: fungsi generik `set_updated_at()` (file terpisah, dipakai ulang tabel
  berikutnya), tabel `users` (id, username unique, password_hash, full_name,
  role enum `user_role`, is_active, refresh_token_hash, created_at, updated_at
  + trigger), tabel `audit_logs` (user_id, action, entity, entity_id,
  before_data/after_data JSONB, ip, created_at + index entity+entity_id).
- AuthModule: POST /auth/login, /auth/refresh, /auth/logout, GET /auth/me.
  Access token 15 menit, refresh token 1 hari, refresh disimpan ter-hash
  (bcrypt cost 10) di `users.refresh_token_hash`, logout menghapusnya (rotasi
  refresh token juga terjadi tiap kali /auth/refresh dipanggil).
  Secret access vs refresh terpisah: env `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`.
- JwtAuthGuard dipasang global (APP_GUARD) + `@Public()` (dipakai di /health,
  /auth/login, /auth/refresh, GET / bawaan Nest). RolesGuard juga global +
  `@Roles(...)` decorator. Endpoint contoh `GET /auth/master-only` di
  AuthController HANYA untuk membuktikan RolesGuard hari ini — **hapus/ganti**
  begitu ada endpoint MASTER-only sungguhan (Settings/COA, Hari 4/6).
- Rate-limit login: `LoginThrottlerGuard` (extends ThrottlerGuard dari
  @nestjs/throttler), key = IP+username, 5 percobaan/60 detik, pesan 429
  Bahasa Indonesia. Hanya dipasang di endpoint login (bukan guard global),
  supaya endpoint lain tidak ikut kena limit ini.
- Seed: `npm run seed` (src/database/seed.ts, ts-node, BUKAN migration) →
  master/master, supervisor/supervisor, operator/operator. Idempotent
  (update kalau username sudah ada).
- Audit: `@Audit(action, entity)` decorator + `AuditInterceptor` generik
  terpasang GLOBAL (APP_INTERCEPTOR) — modul berikutnya tinggal tempel
  `@Audit('AKSI', 'entity')` di handler controller untuk otomatis tercatat,
  tidak perlu wiring interceptor lagi per modul. `stripSecrets()` di
  `src/modules/audit/strip-secrets.ts` membuang password, password_hash,
  token, access_token, refresh_token, refresh_token_hash (termasuk varian
  camelCase, rekursif ke nested object/array) — unit test di
  `strip-secrets.spec.ts`.
- Struktur modul baru: `src/modules/users/`, `src/modules/auth/`,
  `src/modules/audit/` (masing-masing entities/dto/guards/decorators sendiri).
  `src/common/enums/role.enum.ts` dipakai bareng oleh entity, decorator, guard.
- Endpoint bawaan scaffold Hari 1 (`GET /`, `GET /health`) ditandai `@Public()`
  supaya tidak ikut ke-block JwtAuthGuard global.
- FE — `app/composables/useAuth.ts`: satu composable auth (state `user` +
  `accessToken`/`refreshToken` lewat `useCookie` `sameSite: 'strict'`),
  `login/logout/refresh/fetchMe/ensureSession`. Sengaja pakai `$fetch` langsung
  (bukan `useApi()`) supaya tidak ada dependency melingkar dengan interceptor
  401→refresh di `useApi()`. `ensureSession()` dipanggil middleware sebelum
  render halaman terproteksi — coba `refresh()` dulu sebelum dianggap logout,
  supaya operator tidak ke-lempar ke `/login` tiap kali access token (15 menit)
  kedaluwarsa padahal refresh token (1 hari) masih hidup.
- FE — `app/middleware/00.auth.global.ts` (prefix `00.` supaya jalan sebelum
  `01.roles.global.ts` — urutan alfabetis file middleware global Nuxt): redirect
  ke `/login?returnUrl=...` kalau `ensureSession()` gagal; kalau sudah login dan
  buka `/login`, redirect ke `/`.
- FE — `app/middleware/01.roles.global.ts`: baca `to.meta.roles` (diisi lewat
  `definePageMeta({ roles: [...] })` per halaman) dan redirect ke `/` kalau role
  user tidak termasuk. Kosongkan/hilangkan `roles` di halaman yang boleh diakses
  semua role login.
- FE — `app/pages/login.vue` (`layout: false`), `app/types/auth.ts` (`Role`,
  `AuthUser`, `AuthTokens`, `LoginResponse`), `app/config/navigation.ts`
  (`navigationGroups`: menu difilter per item berdasar `roles`, dipakai
  `layouts/default.vue` bareng `useAuthUser().activeRole`), `app/pages/pengaturan/
  index.vue` (placeholder `roles: ['MASTER']` HANYA untuk membuktikan
  `01.roles.global.ts` jalan di halaman nyata — **ganti** dengan modul Settings
  sungguhan begitu dikerjakan). `layouts/default.vue` ditambah dropdown user
  (nama+role) dan tombol Keluar yang panggil `useAuth().logout()`.

Hari 3 — Master data migrations + generator nomor dokumen (BE):
- Migration (urutan dependency FK, bukan urutan penomoran file): `chart_of_accounts`
  (enum `account_type`: ASSET/LIABILITY/EQUITY/INCOME/EXPENSE, self-FK `parent_id`,
  `is_cash_account`, seed 11 akun kode `1101`–`5102` — TIDAK ada Kas, Bank, atau Retur
  Pembelian, sesuai §3 CLAUDE.md) → `products` + `product_unit_conversions`
  (unique per `product_id`+`unit_name`, TIDAK ada kolom `tax_status`) → `customers`
  (`ar_account_id` FK nullable ke `chart_of_accounts`, `is_pkp` default false) →
  `suppliers` (+ `CREATE SEQUENCE supplier_code_seq`, tidak reset bulanan, dipakai
  nanti oleh CRUD Hari 4 untuk generate `display_code`) → `warehouses` (enum
  `warehouse_type`: STORE/CUSTOMER_CONSIGNMENT/BAD_STOCK, `customer_id` FK nullable +
  CHECK constraint DB-level: wajib diisi hanya kalau CUSTOMER_CONSIGNMENT) →
  `tax_rates` (`effective_from`/`effective_to`) → `settings` (key-value bertipe:
  kolom `value` TEXT + `value_type` CHECK IN BOOLEAN/NUMBER/STRING, seed
  `company_is_pkp=false`, `rounding_multiple=100`, `tax_calculation_mode=EXCLUDE`,
  `backdate_max_days=2`) → `document_counters` (unique `doc_type`+`period`).
  Semua tabel pakai trigger `set_updated_at` (fungsi dari Hari 2) dan `down()` yang
  membalik penuh (termasuk DROP TYPE enum & DROP SEQUENCE).
- `src/core/document-counter/document-counter.service.ts` (`DocumentCounterService`,
  stateless, tanpa dependency Nest lain — bisa `new` langsung di test) +
  `document-counter.module.ts` (belum diimport ke `AppModule`, menunggu modul
  pemanggil pertama di Hari 6+/11+ sesuai urutan di bawah).
  `getNextNumber(docType, date, manager: EntityManager)` WAJIB dipanggil dengan
  `EntityManager` dari transaction pemanggil. Pola race-condition-safe: `INSERT ...
  ON CONFLICT (doc_type, period) DO NOTHING` dulu (memastikan baris period baru
  sudah ada) baru `SELECT last_number ... FOR UPDATE` lalu `UPDATE`. **Penting**:
  urutan ini wajib — `SELECT FOR UPDATE` terhadap baris yang belum ada tidak
  mengunci apa pun, jadi kalau langsung SELECT dulu (tanpa upsert), dua transaction
  pertama di period baru sama-sama mencoba INSERT dan bentrok unique constraint.
  Period diformat dari `date.getUTCFullYear()`/`getUTCMonth()` (bukan local time)
  supaya tidak bergantung timezone mesin. Prefix map: SALES_INVOICE→INV,
  SALES_ORDER→SO, PURCHASE_INVOICE→PI, DELIVERY_ORDER→SJ, SALES_RETURN→RJ,
  PURCHASE_RETURN→RB, PAYMENT→PAY, JOURNAL_ENTRY→JE.
- Test: `document-counter.service.spec.ts` — integration test terhadap Postgres asli
  (bukan mock), pakai `DataSource` terpisah baca env `DB_*` yang sama dengan
  `data-source.ts`. **Test ini butuh DB hidup untuk lolos** — konsisten dengan
  rencana integration test 4 invarian di Hari 8. Test konkurensi: 20 pemanggilan
  `getNextNumber` paralel, masing-masing dalam `dataSource.transaction()` terpisah
  → 20 nomor unik `INV/2609/0001`..`INV/2609/0020` tanpa duplikat (dibuktikan juga
  manual lewat script sekali-jalan, bukan cuma assertion pass/fail).
- Migration dijalankan di DB dev (`omega_dev`) dan diuji up→down→up penuh di DB
  sementara terpisah — berhasil tanpa error.

Hari 3 — FE Engine:
- `app/components/DataTable.vue`: list server-side (page/limit/search/sortBy/sortDir/filter
  jadi query param, response `{data, meta}`), search debounce 300ms, state di URL query
  (`router.replace`), skeleton/empty/error state, `rowActions` terfilter oleh `roles`
  (dibanding ke `useAuthUser().activeRole`) dan `show(row)`. Filter `select` TIDAK boleh
  punya opsi `value: ''` untuk "semua" — Reka UI `<SelectItem>` melempar error 500 SSR
  kalau ada value string kosong di `items`; pakai tombol "×" clear yang sudah dibangun di
  komponen. Expose `reload()` lewat `defineExpose` untuk dipanggil dari halaman pemanggil
  setelah row action (mis. toggle aktif).
- `app/components/CrudFormPage.vue`: schema-driven (`FieldDef[]`), Ctrl+S simpan/Esc kembali
  (confirm kalau dirty), auto-focus field pertama (juga setelah "Simpan & Tambah Lagi"
  reset form — hanya muncul di mode create), validasi client (required) + error server 400
  dipetakan per-field (pakai `fieldErrors` kalau ada, atau cocokkan `message[]` gaya
  class-validator NestJS ke key field). Field `select`/`autocomplete` pakai
  `USelect`/`UInputMenu` — `UInputMenu` WAJIB `value-key="value"` eksplisit (default-nya
  beda dari `USelect`, tanpa itu `modelValue` jadi objek utuh bukan value-nya).
  `number`/`currency` pakai `UInputNumber` (bukan `useRupiah()` manual) supaya kursor tidak
  lompat saat mengetik.
- `app/composables/useApi.ts`: satu jalur panggilan API. Path `/api/...` → Nuxt server route
  lokal (dev mock, same-origin); path lain → backend NestJS lewat
  `runtimeConfig.public.apiBase`, dengan header `Authorization` disisipkan dari
  `useAuth().accessToken` dan retry sekali lewat `useAuth().refresh()` kalau backend
  membalas 401 (satu in-flight refresh dibagi semua request 401 yang datang bersamaan,
  lihat komentar di file — bukan `useState` supaya tidak ikut ter-serialize SSR).
  Helper `getErrorData/getErrorStatus/getErrorMessage` baca body `FetchError` tanpa `any`.
- `app/composables/useAuthUser.ts`: role aktif (`useState`, default MASTER) — dipakai
  `DataTable`/layout untuk filter `rowActions`/menu. Catatan: masih terpisah dari
  `useAuth()` (yang menyimpan `user` sungguhan dari login) — pertimbangkan disatukan
  kalau ada kebutuhan ganti-role tanpa re-login.
- `app/composables/useRupiah.ts`: format/parse Rupiah read-only (kolom tabel, ringkasan).
- Percontohan: `app/pages/master-data/warehouses/{index,create,[id]/edit}.vue` +
  `app/composables/useWarehouseSchema.ts` (schema dibagi, tidak duplikasi). Endpoint mock
  di `frontend/server/api/warehouses/` (in-memory, hilang tiap restart dev — **ganti** ke
  CRUD NestJS asli begitu Hari 4 BE selesai, jangan biarkan mock ini jadi permanen).
- Dokumentasi props & konvensi lengkap di `docs/frontend-engine.md` — baca ini dulu
  sebelum bikin halaman list/form baru.
- Catatan lingkungan dev: kalau `npm run dev` FE menolak jalan karena "Another Nuxt dev
  server is already running" padahal tidak ada proses nyata (lock file basi), pakai
  `NUXT_IGNORE_LOCK=1 npm run dev` — jangan hapus lock file manual.

Hari 4 — CRUD master data (BE saja; FE menyusul):
- `src/common/dto/pagination-query.dto.ts` + `src/common/pagination.ts`: satu kontrak
  pagination dipakai ulang oleh Products/Customers/Suppliers/Warehouses — `{page, limit,
  search, sortBy, sortDir}` → `{data, meta:{page,limit,total,totalPages}}` (sesuai kontrak
  `<DataTable>`). `resolveSortColumn()` whitelist kolom per modul supaya `sortBy` dari query
  string tidak dipakai mentah di `ORDER BY`.
- Migration baru `AddIsReceivableAccountToChartOfAccounts` (1785080602917): kolom
  `chart_of_accounts.is_receivable_account` (BOOLEAN, simetris `is_cash_account`), seed
  `true` untuk kode `1102` (Piutang Usaha). **Keputusan disepakati dengan user**: karena
  `account_type` (ASSET/LIABILITY/EQUITY/INCOME/EXPENSE) tidak cukup spesifik untuk
  membedakan akun piutang dari Persediaan/PPN Masukan yang sama-sama ASSET, validasi
  `ar_account_id` butuh flag sendiri — bukan match nama akun (rapuh) atau longgar ke semua
  ASSET (salah). `src/modules/chart-of-accounts/entities/chart-of-account.entity.ts` dibuat
  **hanya sebagai entity** untuk validasi FK modul lain — CRUD/controller COA penuh tetap
  Hari 15, jangan bikin controller COA duluan.
- **Products** (`src/modules/products/`): `unitConversions` dikirim nested dalam SATU
  payload `POST/PATCH`, disimpan dalam satu `dataSource.transaction()` bareng row
  `products`-nya (product create/update + delete-lama-insert-baru conversions, bukan
  patch parsial per baris). Validasi di `validators/validate-unit-conversions.ts`
  (dipanggil dari service, bukan di DTO — butuh cross-field): unit tidak boleh sama dengan
  `baseUnit`, tidak boleh duplikat sesama konversi, `level` wajib berurutan `1..N` tanpa
  lompat/duplikat (base unit sendiri TIDAK ikut ditulis ke `unitConversions`, qty implisit
  1). `qtyInBaseUnit` di entity bertipe `string` (bukan `number`) — konvensi TypeORM untuk
  kolom `numeric` supaya tidak ada presisi float hilang (CLAUDE.md §2.14); DTO tetap terima
  `number` dari JSON, dikonversi `String()` sebelum insert.
- **Customers** (`src/modules/customers/`): `arAccountId` divalidasi ke
  `ChartOfAccount` — harus `isActive=true` **dan** `isReceivableAccount=true`, kalau tidak
  400 `BadRequestException` bahasa Indonesia. `UpdateCustomerDto.arAccountId` terima
  `null` eksplisit (pakai `@ValidateIf` bukan `@IsOptional` saja) supaya bisa di-unset.
- **Suppliers** (`src/modules/suppliers/`): `display_code` auto dari
  `nextval('supplier_code_seq')` diformat `SUP-001` (bukan dari DTO — field ini tidak
  diterima dari client sama sekali). **Masking Operator** ada di `supplier-masking.ts`
  (fungsi murni `maskName`/`maskPhone`/`maskAddress`) + `supplier-masking.interceptor.ts`
  (`@UseInterceptors` di level Controller, cek `request.user.role === OPERATOR`, transform
  response — baik bentuk single object maupun `{data,meta}` list) — **bukan** di query,
  supaya tidak ada jalur bocor lain (CLAUDE.md §3). Pola masking: nama "PT Abadi Jaya" →
  "PT A***" (kata pertama utuh + huruf pertama kata kedua), telepon
  "081234567789" → "0812****789" (4 depan + **** + 3 belakang), alamat pakai pola sama
  dengan nama. `display_code` tidak pernah di-mask. **Test wajib**
  `suppliers-masking.spec.ts`: bukan mock — bikin app Nest penuh + user MASTER/OPERATOR
  sungguhan di DB (dibuat & dihapus dalam test, bukan bergantung seed), token JWT
  ditandatangani langsung lewat `JwtService` (skip endpoint `/auth/login` supaya tidak
  bentrok rate-limiter), lalu request asli lewat `supertest` ke guard+interceptor+service
  sungguhan. **Catatan cleanup**: hapus `audit_logs` milik user test dulu sebelum hapus
  user-nya sendiri (FK `audit_logs.user_id` → `users.id`), kalau tidak `afterAll` gagal.
- **Warehouses** (`src/modules/warehouses/`): validasi aplikasi (400 pesan jelas) untuk
  aturan yang sudah ada sebagai CHECK constraint DB (`CUSTOMER_CONSIGNMENT` wajib
  `customerId`, tipe lain wajib `customerId` kosong) — supaya user dapat pesan Indonesia,
  bukan raw Postgres constraint error. **`is_default` unik per `warehouseType`** (bukan
  global): begitu row baru/di-update jadi `isDefault=true`, service otomatis
  `UPDATE ... SET is_default=false` untuk row lain dengan `warehouseType` yang sama dalam
  transaction yang sama.
- **Settings** (`src/modules/settings/`, MASTER-only lewat `@Roles(Role.MASTER)` di level
  Controller): `GET /settings` mengembalikan value ter-parse sesuai `value_type`
  (`boolean`/`number`/`string`), bukan string mentah dari DB. `PATCH /settings/:key`
  menerima `value` apa adanya lalu divalidasi & di-stringify sesuai `value_type` row
  tsb sebelum disimpan (mis. kirim `123abc` ke setting `NUMBER` → 400).
- **RBAC yang dipakai** (belum eksplisit di CLAUDE.md §5 untuk 4 modul ini, jadi ini
  asumsi kerja — **cek ulang saat audit RBAC Hari 32** kalau ternyata salah): GET
  Products/Customers/Suppliers/Warehouses terbuka untuk semua role login; POST/PATCH
  dibatasi `@Roles(MASTER, OPERATOR)` (SUPERVISOR 403, konsisten pola Sales
  Order/Invoice/dsb). Settings MASTER-only (eksplisit sesuai matrix).
- Semua endpoint write (`POST`/`PATCH` di 5 modul ini) sudah dipasangi `@Audit(...)` —
  otomatis tercatat lewat `AuditInterceptor` global yang sudah ada dari Hari 2, tidak ada
  wiring baru.
- **Tidak ada route `DELETE`** di modul manapun (dibuktikan dari log startup Nest
  `Mapped {...}` dan `grep -rn "@Delete(" src` kosong) — nonaktifkan lewat
  `PATCH .../:id` dengan `isActive: false`.
- FE untuk 3 halaman (Products/Customers/Settings) **belum dikerjakan** — task ini
  eksplisit backend-only. Endpoint mock `frontend/server/api/warehouses/` (Hari 3) juga
  **belum diganti** ke backend asli — masih pekerjaan FE yang menyusul.

Hari 4 — FE Products/Customers/Settings (susulan, sama hari):
- `CrudFormPage.vue` dapat field type baru `repeater` (+ `RepeaterColumnDef` di
  `types/crud-form.ts`) — sub-tabel di dalam form, dipakai untuk `unitConversions` Produk.
  Enter di kolom terakhir baris terakhir menambah baris baru & fokus ke baris baru; Enter di
  kolom terakhir baris non-terakhir pindah ke baris berikutnya; Enter di kolom lain pindah ke
  kolom berikutnya (fokus dicari lewat `[data-repeater-cell="key:row:col"] input` di dalam
  `ref="formEl"` yang sekarang dipasang di `<form>`). Tombol hapus per baris + "Tambah baris".
  `field.required` diabaikan untuk type `repeater` (tidak masuk akal untuk array).
  **Loader `options` field select/autocomplete sekarang dibungkus try/catch** — endpoint
  sumber opsi yang belum ada/gagal (mis. `/chart-of-accounts`, lihat Customers di bawah)
  tidak lagi menggagalkan seluruh mount form, tinggal kosong.
- **Products** (`composables/useProductSchema.ts` + `pages/master-data/products/`): urutan
  field sengaja **nama duluan, baru kode** — `CrudFormPage` selalu fokus ke field index 0
  (juga setelah "Simpan & Tambah Lagi"), jadi urutan ini yang bikin fokus balik ke nama
  produk tanpa perlu prop baru di komponen. Level konversi satuan **disembunyikan dari UI**
  dan di-generate ulang otomatis dari urutan baris (`index+1`) di `productTransformOut` —
  operator tidak perlu mikir soal urutan level manual, tinggal susun baris dari satuan kecil
  ke besar. Baris repeater kosong (nama satuan blank) otomatis dibuang saat submit, form
  create mulai dengan 1 baris kosong siap ketik. `productTransformIn` urutkan
  `unitConversions` dari response naik berdasar `level` sebelum ditaruh ke form.
- **Customers** (`composables/useCustomerSchema.ts` + `pages/master-data/customers/`):
  `arAccountId` adalah `select` yang coba `GET /chart-of-accounts` — endpoint ini **belum
  ada** (dikonfirmasi 404 manual, CRUD COA penuh baru Hari 15 sesuai komentar di entity),
  jadi field ini kosong sampai saat itu; berkat perbaikan loader di atas, form tetap jalan
  normal tanpa field ini. Field lain (`isPkp` switch, `code`/`name`/`phone`/`address`) 1:1
  ke `CreateCustomerDto`/`UpdateCustomerDto`.
- **Settings** (`pages/pengaturan/index.vue`, menggantikan placeholder Hari 3): **BUKAN**
  `<CrudFormPage>` — bentuk data `GET /settings` adalah `TypedSetting[]` key-value, bukan
  satu entity ber-id, jadi form custom yang PATCH `/settings/:key` satu-satu per key yang
  berubah. 4 setting dikenal (`company_is_pkp`, `rounding_multiple`,
  `tax_calculation_mode`, `backdate_max_days`) dipetakan ke label + penjelasan bahasa awam
  lewat `SETTING_META`; key lain yang muncul di masa depan tetap ke-load (`extraKeys`) tapi
  belum ada UI untuk itu — tambahkan ke `SETTING_META`/`SETTING_ORDER` saat setting baru
  ditambah.
- **RBAC FE**: row action "Edit"/"Nonaktifkan"/"Aktifkan" di Products & Customers dibatasi
  `roles: ['MASTER','OPERATOR']` (SUPERVISOR tidak lihat, konsisten RBAC BE dari catatan di
  atas). **Celah yang belum diperbaiki** (bawaan Hari 3, bukan baru): tombol "Tambah" dari
  prop `createTo` di `<DataTable>` tidak punya role gate sendiri — SUPERVISOR tetap lihat
  tombolnya walau submit-nya akan 403. Belum disentuh di luar lingkup hari ini; masuk radar
  audit RBAC Hari 32 atau tambah prop `createRoles` di `<DataTable>` kalau mau dirapikan
  lebih awal.
- **Verifikasi**: `pnpm run lint`, `pnpm run typecheck`, `pnpm run build` di FE — semua
  hijau, 0 error. Kontrak API diverifikasi manual lewat curl terhadap backend asli (bukan
  mock): create Product 3 baris konversi (shape response sama persis dengan yang diharapkan
  `productTransformIn`), create Customer, `GET/PATCH /settings`, `GET /chart-of-accounts`
  (404, sesuai dugaan), OPERATOR 403 di `GET /settings` tapi 201 di `POST /products`.
  **Belum diuji visual di browser** — ekstensi Chrome tidak konek di sesi ini (tidak ada
  cara lain untuk browser automation tersedia), jadi alur keyboard murni (Tab/Enter/Ctrl+S)
  dan waktu input per produk **belum diukur langsung**, hanya diverifikasi lewat pembacaan
  kode. **Wajib dicoba manual di browser sebelum dianggap benar-benar selesai** — servers
  dev BE (`:3000`) & FE (`:3001`) ditinggal jalan di sesi ini untuk itu.

Hari 4 — Revisi Customer & Produk (susulan, sama hari, atas permintaan user):
- **Migration baru** `AddAddressDetailsToCustomers` (1785080602918): kolom `district`,
  `city`, `province` (VARCHAR(120), nullable) di `customers` — `address` lama tetap ada,
  sekarang dipakai khusus untuk "Alamat Lengkap" (jalan/nomor/RT-RW), bukan alamat penuh
  satu blok teks lagi. Diuji up→down→up di DB dev, sukses.
- **Customer — guardrail nomor telepon**: `@Matches` di `Create`/`UpdateCustomerDto`,
  format Indonesia `/^(\+?62|0)8[0-9]{7,11}$/` (mis. `081234567890` atau
  `+6281234567890`, tanpa spasi/strip). Pesan error sengaja diawali kata `phone` (bukan
  cuma teks Indonesia polos) supaya tetap ke-mapping ke field yang benar oleh
  `CrudFormPage.mapServerErrors` (dia mencocokkan `message[]` yang diawali nama field).
- **Customer — Aktif default true di form create**: `CrudFormPage` dapat prop baru
  `FieldDef.defaultValue` — `blankForm()` pakai ini kalau ada, sebelum fallback ke
  `switch→false`/`repeater→1 baris kosong`/lainnya→`null`. Sebelumnya SEMUA switch di
  form create selalu mulai `false` walau default DB `true`, karena FE selalu kirim nilai
  eksplisit. `useCustomerSchema` set `isActive: { defaultValue: true }`.
- **Produk — urutan input konversi satuan dibalik jadi besar→kecil**: repeater sekarang
  minta satuan TERBESAR dulu (mis. dus), lalu ke bawah makin kecil (renceng, lalu
  implisit satuan dasar). Kolom kedua repeater berubah makna dari "qty total dalam satuan
  dasar" jadi **rasio ke baris di bawahnya** (1 dus = berapa renceng, 1 renceng = berapa
  satuan dasar) — jauh lebih natural buat operator daripada harus mengalikan sendiri ke
  satuan dasar. `productTransformOut` mengalikan rasio bertingkat dari bawah (satuan
  terkecil) ke atas jadi `qtyInBaseUnit` absolut sebelum dikirim; `productTransformIn`
  membalik matematikanya pas edit. **Kontrak backend/`level` TIDAK berubah** (level 1 =
  satuan terkecil, tetap seperti semula) — murni transformasi di FE, dibuktikan lewat
  curl: kirim payload absolut yang dihitung tangan (dus qty=120 level=2, renceng qty=10
  level=1), GET balik, jalankan ulang matematika `productTransformIn` manual → hasil rasio
  dus=12, renceng=10, urutan [dus, renceng] — cocok.
- **`CrudFormPage` repeater — placeholder dinamis per baris**: `RepeaterColumnDef.placeholder`
  sekarang boleh fungsi `(ctx: {row, rowIndex, rows, form}) => string`, dipakai Produk untuk
  menampilkan hint "berapa renceng?" / "berapa pcs?" sesuai baris di bawahnya atau
  `baseUnit` kalau baris terakhir. Header kolom sendiri tetap statis (tidak ikut dinamis).
- **Verifikasi ulang**: BE `npm run lint`/`build`/`test` (15 test, 4 suite) hijau, migration
  up→down→up sukses; FE `pnpm run lint`/`typecheck`/`build` hijau. Kontrak API diverifikasi
  lagi lewat curl: phone invalid → 400 pesan field-matchable, phone valid + alamat terpecah
  → 201 tersimpan benar, customer tanpa `isActive` di body → DB default `true` (FE sendiri
  yang tadinya perlu diperbaiki, sudah lewat `defaultValue`), matematika kaskade konversi
  satuan produk terverifikasi round-trip. **Diuji visual di browser sore ini** (ekstensi
  Chrome akhirnya konek): login Master → Tambah Produk, toggle "Aktif" default ON tanpa
  disentuh, isi baris "DUS" lalu Enter (pindah ke kolom Isi, placeholder otomatis "berapa
  PCS?" karena belum ada baris di bawahnya) lalu Enter lagi (baris baru muncul, fokus
  otomatis pindah ke situ) → simpan → toast "Tersimpan" → tampil di list. Buka Edit produk
  3-tingkat lama (`dus`/`renceng`, tersimpan `qtyInBaseUnit` absolut 120/10) → form
  menampilkan rasio `dus=12`, `renceng=10` — cocok persis dengan perhitungan manual yang
  didokumentasikan di atas. Tambah Customer: toggle "Aktif" ON default, submit telepon
  `0812-3456-7890` (ada strip) → 400 muncul tepat di bawah field telepon; ganti ke
  `081234567890` + isi Kecamatan/Kota/Provinsi → simpan sukses. Data uji dihapus lagi dari
  DB dev setelah verifikasi.

Hari 5 — Export generik + Authorization Requests (BE) + Suppliers/Warehouses (FE):
- **`src/core/export/`** (`ExportService`, `ExportInterceptor`, dipakai lewat
  `@UseInterceptors(ExportInterceptor)` di endpoint laporan mana pun — belum dipasang di
  endpoint sungguhan, itu tugas Hari 26+): handler controller tetap mengembalikan JSON biasa
  `{ rows, columns, meta? }` (kontrak `ExportableResponse`); interceptor cuma mengubahnya jadi
  Buffer xlsx (ExcelJS)/pdf (PDFKit) + set `Content-Type`/`Content-Disposition` kalau request
  punya `?format=xlsx|pdf` — request tanpa query itu tetap dapat JSON apa adanya. PDF otomatis
  landscape kalau kolom > 6, ada header/footer (nama perusahaan, judul, filter, dicetak
  oleh+waktu, nomor halaman).
- **`src/modules/authorization-requests/`**: `AuthorizationRequest` entity (status
  PENDING/APPROVED/REJECTED/EXPIRED/EXECUTED), `POST /authorization-requests` (create),
  `GET /authorization-requests` (antrian pending, MASTER/SUPERVISOR — lazy-expire dicek tiap
  read), `POST /:id/approve` `/:id/reject` (MASTER/SUPERVISOR, tidak boleh approve/reject
  punya sendiri). **`StepUpGuard`** global (no-op tanpa `@RequiresStepUp(actionType)`, pola
  sama seperti `RolesGuard`+`@Roles()`) — hanya mengenai role OPERATOR (CLAUDE.md §13);
  request pertama tanpa header `X-Authorization-Request-Id` otomatis membuat authorization
  request lalu balas 412 `requiresAuthorization`; request ulang dengan header itu memanggil
  `consumeApproval` yang men-transisi APPROVED→EXECUTED lewat
  `UPDATE ... WHERE status='APPROVED' AND expires_at > now()` (atomic, sekali pakai, expiry
  dicek ULANG di level DB saat eksekusi — bukan cuma dipercaya dari status yang mungkin sudah
  basi). TTL 15 menit dipakai dua kali dengan makna beda: saat PENDING (batas waktu
  disetujui) dan saat APPROVED (di-reset dari waktu approve, jadi batas waktu dieksekusi).
  Endpoint `POST /authorization-requests/test-step-up-action` **sementara**, hanya untuk
  membuktikan `StepUpGuard` end-to-end hari ini (lihat `authorization-requests.spec.ts`) —
  **ganti dengan aksi step-up sungguhan** (VOID Sales Invoice dll, Hari 12/19+) lalu hapus ini.
  FE halaman Authorization Requests (antrian + modal approve) **belum dikerjakan** — itu
  scope Hari 7, bukan Hari 5.
- **Suppliers** (`frontend/app/composables/useSupplierSchema.ts` + `pages/master-data/
  suppliers/`): `displayCode` ditampilkan read-only (`disabled: true`) di form, TIDAK PERNAH
  dikirim ke server (di-drop lewat `transformOut`, backend juga sudah buang lewat
  `whitelist: true` seandainya terkirim). Masking Operator (dari Hari 4,
  `SupplierMaskingInterceptor`) transparan ke FE — tidak ada masking tambahan di client,
  cukup render apa adanya dari response.
- **Warehouses — DITULIS ULANG TOTAL** (`useWarehouseSchema.ts` + 3 halaman): skema
  percontohan Hari 3 (`code`, `type`, `address`, `is_active`, endpoint mock
  `frontend/server/api/warehouses/`) **dibuang semua** — bentuknya tidak cocok dengan entity
  backend sungguhan dari Hari 4 (`name`, `warehouseType`, `customerId`, `isDefault`,
  `isActive`; tidak ada `code`/`address` sama sekali). Endpoint mock + store in-memory
  dihapus, diarahkan ke `/warehouses` backend asli.
- **`FieldDef.showIf?: (form) => boolean`** (baru, `types/crud-form.ts` + `CrudFormPage.vue`):
  field `customerId` di form Warehouse cuma tampil kalau `warehouseType ===
  'CUSTOMER_CONSIGNMENT'`, pakai `v-show` (bukan `v-if`, supaya tidak remount/reset state)
  dan otomatis dilewati dari validasi `required` client-side saat tersembunyi. `transformOut`
  tetap memaksa `customerId: null` kalau tipe bukan konsinyasi, jaga-jaga kalau operator
  sempat pilih customer lalu ganti tipe sebelum submit.
- **`useApi().getBlob()`** (baru): GET dengan `responseType: 'blob'`, lewat jalur auth+retry
  401→refresh yang sama dengan `get/post/patch` — dipakai `useExport()`, BUKAN `$fetch`
  terpisah, supaya tidak ada jalur HTTP kedua yang lolos dari penanganan token.
- **`useExport()` + `<ExportButton>`** (baru, `composables/useExport.ts` +
  `components/ExportButton.vue`): panggil endpoint yang sama dengan `?format=xlsx|pdf` +
  filter tambahan, trigger download via blob + `<a download>`. **Nama file ditentukan di
  FE** (`fileNamePrefix` + tanggal dari `filters().date`/`.tanggal` atau hari ini + ekstensi)
  — **BUKAN** dibaca dari header `Content-Disposition` server. ⚠️ **Catatan rekonsiliasi
  untuk siapa pun yang menyambungkan `<ExportButton>` ke laporan sungguhan pertama kali
  (Hari 26+)**: `ExportInterceptor` backend (dibangun paralel hari ini, lihat di atas) SUDAH
  mengirim `Content-Disposition: attachment; filename="<slug-title>-<tanggal>.<format>"`
  sendiri dari `meta.title` — FE saat ini mengabaikan itu dan memakai nama hasil hitungnya
  sendiri. Kedua nama kemungkinan besar beda persis. Putuskan salah satu (FE baca header,
  atau BE berhenti kirim nama) sebelum halaman laporan pertama dianggap selesai, supaya
  tidak ada dua sumber kebenaran untuk nama file.
- Endpoint dummy `frontend/server/api/export-demo.get.ts` + halaman QA
  `frontend/app/pages/qa/export-demo.vue` (MASTER-only, tidak di nav) dipakai untuk uji
  `<ExportButton>` sebelum endpoint laporan backend ada. **Hapus keduanya** begitu ada
  halaman laporan sungguhan yang memakainya untuk verifikasi.
- **Verifikasi FE manual di browser** (Master & Operator): Supplier create + masking Operator
  benar (`PT A***`, `0812****890`, `displayCode` tetap tampil penuh); Warehouse create — field
  "Customer Penitip" terbukti muncul/hilang reaktif saat ganti Tipe Gudang (STORE ↔
  CUSTOMER_CONSIGNMENT), validasi required client-side untuk field wajib; `<ExportButton>`
  — network `200` ke `/api/export-demo?format=xlsx|pdf`, isi file di disk dicek benar
  (`"Dummy export (xlsx)..."`), error path (endpoint 404) menampilkan toast. **Catatan**: nama
  file unduhan tidak bisa dikonfirmasi visual di sesi ini — sandbox Chrome automation yang
  dipakai menyimpan file dengan nama GUID acak (`.tmp`), bukan dari atribut `download`
  anchor; ini perilaku sandbox-nya, bukan bug `buildFileName()` (sudah diisolasi lewat test
  anchor-download polos di luar composable, hasilnya sama). Perlu dicoba sekali di Chrome
  normal untuk kepastian visual penuh.

Hari 6 — Journal Poster + journal_entries/journal_entry_lines (BE saja; FE menyusul):
- **Migration** `1785080602920-CreateJournalEntries`: `journal_entries` (entry_number
  unique, entry_date, source_type/source_id generik untuk dipakai modul manapun,
  is_reversal + reversed_entry_id nullable untuk VoidEngine Hari 8, created_by FK
  users) → `journal_entry_lines` (account_id FK chart_of_accounts, debit_amount/
  credit_amount `NUMERIC(16,2)` default 0, `CHECK ((debit_amount > 0) <> (credit_amount
  > 0))`, `ON DELETE CASCADE` ke parent, line_order). **Sengaja tidak ada
  UpdateDateColumn/trigger `set_updated_at`** di kedua tabel — jurnal tidak pernah
  di-UPDATE (CLAUDE.md §2.1/§2.6), pembatalan lewat baris pembalik baru (Hari 8), bukan
  mengubah baris lama. Diuji up→down→up di DB dev asli (bukan cuma DB sementara
  `verify.sh`) — migration ini sekarang **sudah applied** di `omega_dev` (sebelumnya
  sempat lupa dijalankan di luar siklus `verify.sh`, ketahuan lewat test integration
  yang gagal `relation "journal_entries" does not exist`; jangan lupa `npm run
  migration:run` manual tiap kali migration baru dibuat, `verify.sh` cuma menguji
  reversibilitas di DB sementara, bukan menerapkannya ke DB dev harian).
- **`src/core/journal-poster/journal-poster.service.ts`** (`JournalPosterService`):
  menerima `EntityManager` dari pemanggil, **tidak pernah membuka transaction sendiri**
  (pola sama `DocumentCounterService`/`StockRecorder` nanti). Urutan validasi sengaja:
  struktur baris dulu (murah, tanpa query — min 2 baris, tepat satu sisi > 0 per baris,
  balance dibanding sebagai **integer sen** `Math.round(x*100)` supaya tidak kena
  float `0.1+0.2!==0.3`) → validasi yang butuh DB (backdate terhadap
  `settings.backdate_max_days`, semua `account_id` ada & `is_active=true`) →
  **BARU setelah semua lolos** panggil `DocumentCounterService.getNextNumber('JOURNAL_ENTRY',
  ...)`. Urutan ini penting: `entry_number`/`document_counters` tidak pernah tersentuh
  sama sekali kalau validasi gagal di titik manapun — bukan cuma "di-rollback transaction",
  tapi memang belum pernah dipanggil. `PostJournalDto`/`PostJournalLineDto` di
  `dto/post-journal.dto.ts` (interface polos, bukan class-validator — tidak ada
  controller HTTP yang mem-bind DTO ini langsung, dipakai murni sebagai kontrak
  internal antar-service). `JournalPosterModule` **belum diimport ke `AppModule`**
  (sama seperti `DocumentCounterModule`) — menunggu modul pemanggil pertama (Manual
  Journal Hari 9, Purchase/Sales Invoice Hari 11+).
- **Test** `journal-poster.service.spec.ts`: integration test terhadap Postgres asli
  (pola sama `document-counter.service.spec.ts`, `new JournalPosterService(new
  DocumentCounterService())` langsung tanpa Nest app), 7 test — kelima validasi wajib
  + backdate + format nomor. **Bukti rollback eksplisit**: test balance-mismatch
  meng-`console.log` isi `document_counters` sebelum & sesudah percobaan gagal,
  keduanya `last_number: 1` (tidak naik). Test CHECK constraint DB (`debit=0 AND
  credit=0`) sengaja bypass service — raw SQL `INSERT` langsung ke `journal_entry_lines`
  untuk membuktikan constraint level-DB independen dari validasi aplikasi (defense in
  depth). User/akun uji dibuat & dihapus sendiri dalam test (bukan bergantung seed),
  konsisten pola `authorization-requests.spec.ts`.
- **`src/modules/journal-entries/`** (read-only, GET saja — **tidak akan pernah ada**
  POST/PATCH/DELETE di controller ini; posting HANYA lewat `JournalPosterService`
  dipanggil modul transaksi lain): `GET /journal-entries` (filter `dateFrom`/`dateTo`/
  `sourceType`/`sourceId`/`accountId`, search nomor+deskripsi) mengembalikan list
  **tanpa** `lines` (sengaja — `leftJoinAndSelect` relasi one-to-many dibarengi
  `skip`/`take` bikin paginasi salah begitu satu entry punya >1 baris, LIMIT Postgres
  jalan di level baris JOIN bukan per-entry; lihat catatan yang sama berlaku di
  `ProductsService.findAll` — konvensi list=ringkas/detail=lengkap dipilih di sini
  supaya tidak mewarisi bug itu). Filter `accountId` pakai `EXISTS` subquery (bukan
  join ke tabel lines) supaya tidak ikut menduplikasi baris hasil. `GET
  /journal-entries/:id` baru eager-load `lines` (+ `account` masing-masing baris,
  urut `lineOrder`).
  **RBAC — asumsi kerja** (belum eksplisit di CLAUDE.md §5 untuk endpoint ini, sama
  seperti asumsi RBAC Products/Customers/dll Hari 4): disamakan dengan `GET
  /chart-of-accounts` (`MASTER`+`SUPERVISOR`, `OPERATOR` 403) karena ini buku besar
  mentah per-akun, bukan ringkasan seperti "Laporan" biasa — **cek ulang saat audit
  RBAC Hari 32**.
Hari 6 — FE COA (tree) + Jurnal (list+detail), susulan sama hari:
- **`GET /chart-of-accounts` baru ditambahkan** (`src/modules/chart-of-accounts/
  chart-of-accounts.{controller,service,module}.ts`, entity-nya sendiri sudah ada
  sejak Hari 4): read-only, flat list terurut `code`, `@Roles(MASTER, SUPERVISOR)`
  — **CRUD penuh (create/update akun, kas/bank custom) tetap Hari 15**, endpoint ini
  cuma dibuat lebih awal karena FE COA & filter akun Jurnal butuh data akun nyata
  hari ini. Ini penyimpangan dari catatan "Dicatat, TIDAK dikerjakan" versi BE-only
  di atas — diputuskan lanjut membuatnya (bukan menunda) begitu FE task hari ini
  eksplisit butuh endpoint ini untuk lolos DoD.
- **RBAC `GET /journal-entries` direvisi**: `@Roles(MASTER, SUPERVISOR)` yang
  ditulis pas endpoint ini dibuat (asumsi kerja, lihat catatan BE di atas) **dihapus**
  — dibuka untuk SEMUA role login (tidak ada `@Roles()` di controller = lolos
  `RolesGuard`). Sesuai instruksi tugas FE hari ini ("Jurnal boleh dilihat semua
  role"), beda dari `GET /chart-of-accounts` yang tetap Operator 403. **Cek ulang
  bareng permission matrix lengkap saat audit RBAC Hari 32** — keputusan ini
  menggantikan asumsi sebelumnya, belum eksplisit tertulis di CLAUDE.md §5.
- **`<DataTable>` dapat prop baru `onRowClick?: (row: T) => void`**
  (`components/DataTable.vue`): seluruh `<tr>` jadi klikable kalau prop ini diisi
  (cursor-pointer + `@click`), sel kolom aksi (dropdown "...") tetap `@click.stop`
  supaya klik menu tidak ikut memicu `onRowClick`. Dipakai halaman Jurnal untuk
  buka drawer detail — pola generik ini (nambah prop, bukan fork komponen)
  konsisten aturan CLAUDE.md §6.
- **Bagan Akun** (`composables/useChartOfAccountsTree.ts` + `components/
  ChartOfAccountsTreeNode.vue` + `pages/akuntansi/bagan-akun/index.vue`): tree
  disusun di FE dari flat list `GET /chart-of-accounts` lewat `parentId`
  (`buildAccountTree`, urut `code` per level) — **bukan** `<DataTable>` (tabel
  server-paginated tidak cocok untuk struktur pohon). Expand/collapse per-node
  (`reactive<Record<string,boolean>>`, bukan `Set` — supaya reaktivitas Vue
  granular per key) + tombol "Expand semua"/"Collapse semua". Search
  (`v-model="search"`, tanpa debounce — dataset kecil, murni client-side) meng-hasilkan
  `visibleIds` (hasil cocok + semua leluhurnya) dan otomatis anggap semua node itu
  ter-expand selama pencarian aktif, node di luar `visibleIds` disembunyikan penuh
  (bukan cuma di-dim). Kolom "Saldo" sengaja kosong (`—`) — disiapkan, belum ada
  sumber datanya (baru dari laporan/rekonsiliasi stok Hari 26+). Dengan 11 akun
  seed (semua `parentId` NULL, benar-benar flat — belum ada sub-akun sungguhan di
  DB manapun), tree hari ini secara visual cuma menampilkan 11 node level-atas
  tanpa expand icon; struktur rekursifnya sendiri sudah diuji lewat kode &
  komponen self-referencing Nuxt (auto-registered), tinggal dipakai begitu Hari 15
  menambah akun dengan `parentId` terisi.
- **Jurnal** (`pages/akuntansi/jurnal/index.vue`): `<DataTable endpoint="/journal-entries">`
  dengan filter `{ key: 'date', type: 'date-range' }` (sengaja `date` bukan
  `entryDate` — `<DataTable>` mengirim `${key}From`/`${key}To`, harus persis cocok
  `JournalEntryQueryDto.dateFrom/dateTo`) dan filter akun (`select`, opsi dari
  `GET /chart-of-accounts` — dibungkus try/catch, gagal senyap/kosong untuk
  Operator yang 403 di endpoint itu, TIDAK mematikan halaman Jurnal). Klik baris
  (`onRowClick`) buka `USlideover` (Nuxt UI) yang fetch `GET /journal-entries/:id`
  on-demand: tabel baris debit/kredit per akun + baris footer total (dijumlah
  `Number(debitAmount)`/`Number(creditAmount)` di FE, BUKAN dipercaya sama dari
  backend — murni tampilan, bukan validasi ulang balance). Badge "Pembalik" di
  kolom list + banner "Jurnal Pembalik" di drawer kalau `isReversal`, dengan
  lookup tambahan `GET /journal-entries/:reversedEntryId` untuk menampilkan
  **nomor** jurnal asli yang dibalik (bukan cuma UUID mentah) — dibungkus
  try/catch, fallback tampil UUID kalau lookup gagal.
- **`utils/formatDate.ts`** (baru, auto-import Nuxt dari folder `utils/`): format
  `'YYYY-MM-DD'` → `'DD/MM/YYYY'` lewat pemotongan string, SENGAJA tidak lewat
  `new Date(value)` — konsisten dengan alasan `JournalEntry` entity BE menyimpan
  `entryDate` sebagai string mentah (hindari pergeseran tanggal akibat timezone
  browser).
- **Verifikasi**: `pnpm run lint`/`typecheck`/`build` FE hijau, `npm run build`/
  `lint`/`test` (30 test) BE hijau, `./scripts/verify.sh` 10/10. Kontrak API
  diverifikasi lewat curl asli (bukan mock): `GET /chart-of-accounts` — MASTER
  200 (11 akun), SUPERVISOR 200, OPERATOR 403; `GET /journal-entries` — ketiga
  role 200 (termasuk Operator, sesuai revisi RBAC di atas); detail jurnal 3-baris
  contoh (dibuat sementara lewat `JournalPosterService` langsung dari script
  ts-node sekali-jalan untuk QA — **dihapus lagi dari DB dev + reset
  `document_counters` JOURNAL_ENTRY setelah verifikasi**, konsisten konvensi
  Hari 4/5) membuktikan total debit = total kredit di footer, dan satu entry yang
  ditandai `isReversal=true` tampil dengan badge + "Membalik jurnal JE/2607/0005"
  yang benar; filter `accountId` ke akun Persediaan mengembalikan persis 2 entry
  yang menyentuh akun itu. **Belum diuji visual di browser** — ekstensi Chrome
  tidak konek di sesi ini (`tabs_context_mcp` gagal, "Browser extension is not
  connected"), jadi expand/collapse tree, auto-expand search, drawer
  buka/tutup, dan styling `USlideover` **belum dikonfirmasi visual langsung**,
  hanya lewat pembacaan kode + kontrak data API asli. **Wajib dicoba manual di
  browser** sebelum dianggap benar-benar selesai — servers BE (`:3000`) & FE
  (`:3001`) ditinggal jalan di sesi ini untuk itu.

Hari 8 — Master baru (Merek/UoM/Salesman) + rework Produk + resolveArAccount +
rename warehouse_type (BE saja; FE menyusul):
- **Migration** `1785080602924`–`1785080602926` (`CreateBrands`/`CreateUnits`/
  `CreateSalesmen`): tiga tabel kecil identik (`code` unique, `name`, `is_active`,
  trigger `set_updated_at`) — tidak ada FK ke tabel lain hari ini. **`units` (satuan
  jual/beli) berdiri sendiri, BELUM di-FK** ke `products.base_unit`/
  `product_unit_conversions.unit_name` (keduanya masih free text seperti sejak
  Hari 3/4) — bukan lupa, tidak diminta eksplisit di prompt hari ini; lihat catatan
  §3 tanggal 30 Jul soal kapan ini harus diputuskan.
- **Migration** `1785080602927-ReworkProducts`: `TRUNCATE product_unit_conversions,
  products` dulu (isinya cuma sisa smoke test `TEST-SMOKE-*`/`P--02` Hari 3/4, dicek
  manual via psql sebelum ditulis — bukan data klien, input master data klien baru
  mulai hari ini) supaya kolom baru bisa langsung `NOT NULL` tanpa backfill. Kolom
  `name` **dihapus**, diganti `brand_id` (FK `brands`, NOT NULL) + `keterangan` (NOT
  NULL) + `kemasan` (nullable) + `ukuran_uom` (nullable, gabungan Ukuran+UoM kemasan
  jadi satu field teks — CLAUDE.md §3 sebut ini bagian dari "empat bagian" nama meski
  narasinya menyebut 5 komponen) + `display_name` (NOT NULL, dihitung ulang di
  aplikasi tiap create/update karena butuh join `brands.name`, **bukan** generated
  column DB) + index B-tree biasa `idx_products_display_name` (bukan trigram/GIN —
  konsisten pola pencarian `ILIKE` yang sudah dipakai Customers/Suppliers, belum ada
  `pg_trgm` di project). `is_bkp` (default false), `ean_barcode` (nullable, tidak
  dipakai MVP), `is_code_locked` (default false, lihat `ProductsService.lockCode()`
  di bawah), `CHECK (code ~ '^[0-9]{10}$')`, sequence `product_code_seq` **global**
  (tidak reset harian/bulanan, beda pola dari `document_counters`) untuk pembangkit
  kode otomatis kalau operator kosongkan `code` saat create.
- **`ProductsService`** (`products.service.ts`): `create()`/`update()` sekarang
  resolve `Brand` aktif dulu (400 kalau tidak aktif/tidak ada), hitung
  `displayName = [brand.name, keterangan, kemasan, ukuranUom].filter(Boolean).join(' ')`,
  dan kalau `code` dikosongkan bangkitkan `${YYMMDD}${seq4digit}` dari
  `product_code_seq`. **`lockCode(id, manager?)`**: titik masuk tunggal untuk
  mengunci kode produk begitu dipakai transaksi pertama — idempotent
  (`WHERE id=... AND is_code_locked=false`), **belum ada pemanggil produksi hari
  ini** (StockRecorder Hari 10 / Faktur Hari 14+21 yang akan memanggilnya). `update()`
  menolak 400 kalau `code` diubah pada produk yang `isCodeLocked=true` — pesan
  Bahasa Indonesia, field lain tetap bisa diubah. `findAll()` search sekarang lewat
  `code`/`displayName` (bukan `name` yang sudah tidak ada).
- **`src/core/receivables/`** (`ArAccountResolverService` + `ReceivablesModule`):
  `resolve(customer, manager?)` → `customer.arAccountId ?? settings.default_ar_account_id`
  (baca langsung dari tabel `settings` lewat `manager` pemanggil kalau ada, supaya
  ikut transaction yang sama — pola sama `DocumentCounterService`). **Satu-satunya
  pemanggil hari ini adalah test integrasi** (`ar-account-resolver.service.spec.ts`,
  3 test: pakai `arAccountId` langsung, jatuh ke default, 400 kalau default kosong)
  — pemanggil produksi menyusul di Hari 12 (Saldo Awal), 21 (Faktur Penjualan), 23
  (Retur Penjualan), 26-27 (Payment), dan pembalikan VOID, sesuai instruksi "buat
  sekarang meski baru satu pemanggil".
- **`suppliers.is_pkp`** (migration `1785080602928`): boolean default false,
  simetris `customers.is_pkp` (sudah ada sejak Hari 3) — menggerbangi PPN masukan
  bersama `products.is_bkp` (CLAUDE.md §2.11). Tidak disentuh masking interceptor
  (`maskSupplier` cuma menyamarkan name/phone/address, field lain lewat apa adanya).
- **Rename `warehouse_type` `CUSTOMER_CONSIGNMENT` → `TITIPAN_PELANGGAN`**
  (migration `1785080602929`): `ALTER TYPE ... RENAME VALUE` — OID enum tidak
  berubah jadi CHECK constraint `chk_warehouse_consignment_customer` & baris
  existing tetap valid tanpa disentuh. Migration lama (`1785080602913-
  CreateWarehouses`) **sengaja tidak diedit** (fakta historis, migration yang sudah
  applied tidak boleh diubah) — nama lama masih muncul di situ dan di migration
  rename ini sendiri (perlu merujuk nilai lama untuk `RENAME VALUE ... TO ...`);
  `grep -rn CUSTOMER_CONSIGNMENT` di kode aktif (bukan migration) sudah bersih,
  termasuk **FE** `useWarehouseSchema.ts` + `pages/master-data/warehouses/index.vue`
  yang ikut disesuaikan meski prompt hari ini backend-only (dibiarkan rusak akan
  bikin FE mengirim value enum yang sudah mati).
- **Verifikasi**: `./scripts/verify.sh` 10/10 (build+lint BE 0 error, migration
  up→down→up di DB bersih, test BE 37/37 lolos termasuk 4 test baru hari ini,
  `/health` 200, build+lint FE). Kontrak API diverifikasi manual lewat curl
  terhadap backend asli setelah membersihkan proses `node` basi yang masih nyangkut
  di port 3000 dari sesi sebelumnya (`EADDRINUSE`, ketahuan dari log start yang
  gagal — proses lama di-kill dulu sebelum lanjut): create Brand/Unit/Salesman,
  create Produk 4-bagian → `displayName` persis "Bendera Putih Sachet 37 gr" +
  ketemu lewat `?search=bendera`, `code` format salah → 400, lock lalu ubah `code`
  → 400 tapi ubah field lain tetap 200, Supplier `isPkp=true` tersimpan, Warehouse
  `TITIPAN_PELANGGAN` tersimpan sementara `CUSTOMER_CONSIGNMENT` lama → 400 (enum
  sudah tidak dikenal). Semua data uji dihapus lagi dari DB dev setelah verifikasi
  (tidak ada endpoint DELETE — dibersihkan lewat psql langsung, konsisten konvensi
  Hari 4/5).
- **Belum dikerjakan** (di luar lingkup prompt BE hari ini, FE menyusul): halaman
  Merek/UoM/Salesman, form Produk dengan nama tersusun + preview `display_name`,
  dan pemberitahuan ke klien bahwa pengisian master data boleh dimulai (masuk akal
  ditunda sampai ada layar sungguhan untuk diisi, bukan cuma API).

Hari 8 — FE Merek/Satuan/Salesman + rombak form Produk + gerbang Akun Piutang
(susulan, sama hari):
- **`useSimpleMasterSchema(nameLabel, namePlaceholder)`** (baru,
  `composables/useSimpleMasterSchema.ts`): satu schema `{code, name, isActive}` dipakai
  ulang oleh Merek/Satuan/Salesman — ketiganya identik persis di backend (lihat
  brands/units/salesmen controller+entity Hari 8). **Bukan** fork 3x — CLAUDE.md §6
  ("dilarang copy-paste layout, tambah prop untuk varian"); varian di sini cukup label.
  9 halaman baru (`pages/master-data/{brands,units,salesmen}/{index,create,[id]/edit}.vue`)
  mengikuti pola `<DataTable>`+`<CrudFormPage>` yang sama persis dengan Suppliers/Warehouses.
- **`CrudFormPage`/`crud-form.ts` — 3 kemampuan generik baru**, dipakai form Produk tapi
  tersedia untuk form manapun berikutnya (pola sama seperti `showIf`/`defaultValue` Hari 4/5):
  - `FieldType 'display'` + `FieldDef.compute(form)`: banner teks besar read-only,
    dihitung ulang tiap render — dipakai pratinjau `display_name` Produk.
  - `FieldDef.hint` sekarang boleh **fungsi** `(form) => string`, bukan cuma string statis
    — dipakai hint Kode Produk yang berubah tergantung `isCodeLocked`.
  - `FieldDef.action` (`{icon, label, onClick, hidden?}`): tombol di samping input teks
    (flex row) — dipakai tombol "Bangkitkan" kode produk, `onClick` cukup
    `setField('code', '')` supaya backend yang membangkitkan otomatis saat `POST /products`
    tanpa `code` (kontrak sudah ada sejak Hari 8 BE, bukan endpoint baru).
- **`useProductSchema.ts` — rombak total** (baseline Hari 4 lama sudah mati sejak
  entity direwrite Hari 8 BE): Merek (`select`, opsi dari `GET /brands`, filter `isActive`,
  cache nama merek di closure untuk `compute()` tanpa fetch ulang) → Keterangan → Kemasan →
  Ukuran (`text`) + Satuan Ukuran (`select`, **daftar statis** gr/kg/ml/liter/pcs di FE —
  ini "UoM kemasan" CLAUDE.md §3, BEDA dari master `units` Hari 8 yang untuk satuan
  jual/beli, jadi sengaja tidak fetch dari `/units`) → **Pratinjau Nama Produk** (banner
  besar) → Kode Produk (manual + Bangkitkan + terkunci `disabled`/hint dinamis kalau
  `isCodeLocked`) → `is_bkp` (label awam "Barang Kena Pajak (PPN dari supplier dihitung)")
  → Aktif → Satuan Dasar → field tersembunyi `isCodeLocked` (`showIf: () => false`, murni
  metadata dari server supaya `disabled`/`hint`/`action.hidden` Kode Produk bisa membacanya
  — form tidak menyimpan field yang tidak dideklarasikan di schema) → repeater Konversi
  Satuan Jual/Beli (dipertahankan dari Hari 4, cuma label diperjelas "1 [besar] = [Isi]
  [di bawahnya]"). `productTransformIn`/`Out` memecah/menggabung `ukuranUom` server
  (satu string mis. "37 gr") ↔ `ukuran`+`ukuranUomPart` form (pecah dari token terakhir
  kalau cocok salah satu opsi dikenal, else seluruh string masuk "Ukuran" apa adanya —
  tidak pernah gagal parse). `code` di payload **cuma dikirim kalau terisi** — kosong
  (baru atau setelah klik Bangkitkan) berarti "biarkan backend generate" saat create,
  "jangan ubah" saat update (backend tidak regenerate kode saat edit, di luar lingkup
  hari ini untuk diubah).
- **`useCustomerSchema.ts` — `arAccountId` digerbangi ke MASTER di level schema**
  (field literal tidak dimasukkan ke array untuk role lain), **bukan** `showIf` yang
  cuma `v-show` (elemen tetap ada di DOM tersembunyi) — DoD hari ini eksplisit
  mensyaratkan field ini **tidak ada di DOM sama sekali** untuk Operator, dibuktikan
  lewat `get_page_text`, bukan cuma screenshot visual. **Bug laten ditemukan &
  diperbaiki**: kode Hari 4 memanggil `GET /chart-of-accounts` dengan asumsi bentuk
  `{data, meta}` (pola paginated seperti modul lain) padahal
  `ChartOfAccountsController.findAll()` mengembalikan **flat array** — sebelumnya tidak
  pernah ketahuan karena endpoint itu 404 sampai Hari 6, dan `CrudFormPage` menelan
  error loader dengan aman (fail-silent). Opsinya sekarang disaring
  `isActive && isReceivableAccount` di FE (CLAUDE.md §3: "tersaring hanya akun bertipe
  piutang yang aktif").
- **`pages/master-data/products/index.vue`**: kolom `name` (sudah tidak ada di entity)
  diganti `displayName`, tambah kolom `BKP`.
- **`config/navigation.ts`**: tambah menu Merek, Satuan, Salesman (grup master data).
- **Verifikasi**: `pnpm run lint`/`build` FE 0 error, `npm run build` BE 0 error (BE
  tidak disentuh hari ini, dicek ulang supaya tidak regresi). **Diuji visual penuh di
  browser** (ekstensi Chrome konek): login Master → buat Merek "Bendera" → buat Produk
  4 bagian, pratinjau live berubah tiap ketik, berhenti persis di **"Bendera Putih
  Sachet 37 gr"** (dibandingkan ke contoh baku CLAUDE.md §3, cocok karakter-per-karakter)
  → simpan → kode `2607300011` ter-generate otomatis, list menampilkan `displayName`+
  konversi `dus`+BKP `-`. Login Operator → `/master-data/customers/create` →
  `get_page_text` dipastikan tidak memuat teks "Akun Piutang" di mana pun. Login Master
  ulang → field itu muncul, dropdown dibuka → hanya "1102 - Piutang Usaha" (satu-satunya
  akun piutang aktif di seed). **Data uji dihapus lagi dari DB dev** lewat skrip
  sekali-jalan (`AppDataSource` langsung, pola sama `seed.ts`, dihapus setelah dipakai)
  — konsisten konvensi Hari 4/5/8, bukan lewat endpoint DELETE (tidak ada).
- **Belum dikerjakan / di luar lingkup sengaja**: pemberitahuan ke klien bahwa pengisian
  master data boleh dimulai (layar sudah ada, tinggal dikabari — tindakan nyata di luar
  kode); FK `unitName`/`baseUnit` Produk ke master `units` (masih free text, keputusan
  yang sama seperti dicatat §3 30 Jul belum diambil); commit git untuk Hari 7+8 (BE dan
  FE keduanya masih uncommitted di working tree per akhir hari ini).

Hari 9 — AuthorizationRequests berpayload utuh + StepUpService dinamis (BE saja;
FE antrian belum, lihat §3):
- **Migration** `1785080602930-AddContextSummaryToAuthorizationRequests`: kolom
  `context_summary` TEXT NOT NULL (dua langkah ADD nullable → backfill `''` →
  SET NOT NULL, aman dijalankan di atas baris lama). `payload` JSONB sudah ada
  sejak migration Hari 5 (`1785080602919`), tidak disentuh.
- **`action-type.enum.ts`** (baru): `ActionType` — `VOID_DOCUMENT`, `UNLOCK_PRINT`,
  `SELL_BELOW_COST`, `CASH_OUTFLOW`, `BS_TO_STORE`. Murni kontrak nama, entity
  `actionType` tetap `varchar` (bukan DB enum) supaya actionType baru tidak
  butuh migration `ALTER TYPE`.
- **`payload-matchers.ts`** (baru): `matchesApprovedPayload(actionType, approved,
  current)` — comparator per actionType (CLAUDE.md §19, "jangan deep-equal
  buta"), bukan satu fungsi generik untuk semua. Terdaftar hari ini: `CASH_OUTFLOW`
  (`exactFields(['accountId','amount'])`) dan `TEST_STEP_UP_ACTION` (selalu
  cocok, payload-nya tidak sensitif). **`VOID_DOCUMENT`/`UNLOCK_PRINT`/
  `SELL_BELOW_COST`/`BS_TO_STORE` SENGAJA belum didaftarkan** — actionType yang
  belum punya entry membuat `matchesApprovedPayload()` throw (fail closed),
  supaya lupa mendaftarkan comparator ketahuan langsung, bukan diam-diam
  meloloskan payload apa pun. Lihat catatan §3 — hari pemanggil pertama tiap
  actionType WAJIB menambah entry di sini.
- **`step-up-response.ts`** (baru): `stepUpRequiredException(authorizationRequestId,
  message)` — satu-satunya tempat yang membentuk body+status HTTP 412
  `{requiresAuthorization, authorizationRequestId, message}`. Dipakai `StepUpGuard`
  DAN `StepUpService` sehingga bentuk responsnya identik byte-per-byte (dibuktikan
  `step-up.service.spec.ts`, bandingkan 412 dari jalur HTTP guard vs pemanggilan
  langsung `StepUpService.requireApproval()` berdampingan).
- **`StepUpPayloadMismatchError extends StepUpNotReadyError`** (di
  `step-up-not-ready.error.ts`): sub-kasus baru — status APPROVED & belum
  kedaluwarsa, tapi body yang dieksekusi tidak cocok payload yang disetujui.
  Ditangkap lewat `instanceof StepUpNotReadyError` yang sama (satu jalur
  penanganan frontend), dibedakan subclass murni untuk kejelasan test.
- **`AuthorizationRequestsService`** direvisi: `create()`/`findOneOrFail()`/
  `consumeApproval()`/`applyLazyExpiry()` (private) semua menerima
  `manager?: EntityManager` opsional (pola sama `ArAccountResolverService.resolve()`
  Hari 8) — `repoFor(manager)` pakai `manager.getRepository(...)` kalau ada,
  supaya `StepUpService` dari service bisnis lain bisa ikut transaction
  pemanggilnya. `consumeApproval()` sekarang **wajib** parameter
  `currentPayload` — divalidasi lewat `matchesApprovedPayload()` **sebelum**
  UPDATE atomik APPROVED→EXECUTED; kalau tidak cocok, approval **TIDAK**
  ikut terkonsumsi (tetap APPROVED, siap dipakai kalau payload yang benar
  disusulkan) — hanya `StepUpPayloadMismatchError` yang dilempar.
- **`StepUpGuard`** direvisi: pakai `stepUpRequiredException()` (412, bukan lagi
  `HttpException` manual dengan `HttpStatus.PRECONDITION_REQUIRED`/428), payload
  `{params, body}` dibangun sekali dan dipakai ulang untuk `create()` (saat belum
  ada header) maupun `consumeApproval()` (saat retry dengan header) supaya
  payload yang dicocokkan konsisten. `contextSummary` untuk jalur guard
  otomatis generik (`"${actionType} — permintaan step-up otomatis (METHOD
  URL)"`) karena guard tidak tahu konteks bisnis — didokumentasikan sebagai
  fallback, modul bisnis nanti sebaiknya pakai `StepUpService.requireApproval()`
  langsung dengan kalimat context_summary yang sungguhan.
- **`src/core/step-up/`** (baru, `StepUpService` + `StepUpModule`, diimport ke
  `AppModule`): `requireApproval({user, actionType, payload, contextSummary,
  authorizationRequestId?, manager?})` — dipanggil DARI DALAM service bisnis
  (bukan guard/controller) untuk aksi yang syaratnya bergantung pada ISI
  transaksi. Tanpa `authorizationRequestId` → `create()` lalu throw 412;
  dengan `authorizationRequestId` → `consumeApproval()`, tangkap
  `StepUpNotReadyError` lalu throw 412 yang sama. **Belum ada pemanggil
  produksi hari ini** (pola sama `ArAccountResolverService`/`DocumentCounterService`
  — "buat sekarang meski baru satu pemanggil/test"); pemanggil pertama menyusul
  Hari 13/15/17/21, lihat catatan wajib di §3.
- **Kode status 428→412 diseragamkan** di seluruh kode aktif: `StepUpGuard`,
  `authorization-requests.spec.ts` (3 `.expect(428)` → `.expect(412)`, plus 3
  body `POST /authorization-requests` ditambah `contextSummary`). `grep -rn
  428` di `backend/src` sekarang nihil.
- **Test baru**: `payload-matchers.spec.ts` (unit, tanpa DB — matcher `CASH_OUTFLOW`
  match/mismatch/field-tidak-relevan, `TEST_STEP_UP_ACTION` selalu cocok,
  actionType belum terdaftar → throw); `authorization-requests.service.spec.ts`
  (integration, pola `ArAccountResolverService` — instansiasi langsung tanpa
  Nest DI: approval Rp 1.000.000 ditolak dipakai eksekusi Rp 100.000.000 tanpa
  mengonsumsi approval-nya, payload yang benar tetap bisa dipakai sesudahnya,
  dan rollback `dataSource.transaction()` membatalkan konsumsi approval —
  bukti `manager` benar-benar ikut transaction pemanggil); `step-up.service.spec.ts`
  (di `src/core/step-up/`, full `AppModule` — bandingkan bentuk 412 dari
  `StepUpGuard` (HTTP sungguhan) vs `StepUpService.requireApproval()`
  (dipanggil langsung) berdampingan: key set + tipe field identik; approval
  lolos lewat StepUpService lalu ditolak 412 "sekali pakai" saat dipakai kedua kali).
  Tambahan 1 test di `strip-secrets.spec.ts`: payload authorization_requests
  nested yang memuat field `password` tetap terstrip bersih.
- **Verifikasi**: `./scripts/verify.sh` 10/10. `npx jest --runInBand` 12 suite/49
  test hijau (satu suite `products.service.spec.ts` sempat timeout jalan paralel
  karena kontensi banyak suite integration-DB sekaligus — lolos bersih baik
  sendirian maupun `--runInBand`, bukan regresi dari perubahan hari ini).
  **Manual curl end-to-end** (server `dist/main`, login `operator`/`supervisor`
  sungguhan): trigger tanpa header → `412` + `authorizationRequestId` (happy
  path awal) → SUPERVISOR approve → eksekusi dengan header → `201` sukses →
  eksekusi ulang dengan header yang sama → `412` "sudah pernah dipakai" (error
  path). Data uji (baris `authorization_requests` + `audit_logs` terkait)
  dihapus lagi dari DB dev setelah verifikasi, konsisten konvensi Hari 4/5/8.
- **Belum dikerjakan (di luar lingkup sengaja)**: FE antrian persetujuan +
  `context_summary` + polling 5 detik — prompt hari ini eksplisit backend-only;
  menyatu dengan scope FE Hari 10 yang memang sudah mencantumkan hal yang sama.

Hari 9 — susulan FE (30 Jul, sore): Antrian Persetujuan + `<StepUpDialog>` global:
- **Koreksi premis prompt**: `<StepUpDialog>` "dari Hari 7 lama" **tidak pernah dibangun**
  (digrep dulu, 0 hasil di seluruh `frontend/app`) — dibuat baru hari ini, bukan diperluas.
- **Backend diperluas sedikit** meski prompt eksplisit "frontend-only", karena tanpa ini DoD
  ("alasan wajib saat menolak", "operator melihat alasannya") mustahil dipenuhi:
  - `reject()` sekarang **wajib** `reason` (`RejectAuthorizationRequestDto`, baru), ditimpakan
    ke kolom `reason` yang sama (sebelumnya cuma diisi alasan-permintaan-dibuat, boilerplate
    dari guard). Begitu status `REJECTED`, kolom ini satu-satunya tempat operator membaca
    kenapa ditolak.
  - **`GET /authorization-requests/:id` baru** — TIDAK di-`@Roles`, digerbangi kepemilikan
    (requester sendiri ATAU MASTER/SUPERVISOR) di controller. Ini yang dipoll `<StepUpDialog>`
    operator tiap 5 detik; `applyLazyExpiry()` yang sudah ada dari Hari 5/9 otomatis menandai
    EXPIRED begitu TTL lewat — tidak perlu logic tambahan untuk kasus itu.
  - Test lama disesuaikan (reject sekarang wajib kirim `reason` di body, kalau tidak 400
    sebelum sempat memeriksa self-reject) + 2 test baru (`GET /:id` kepemilikan; reject
    reason tersimpan & terbaca lewat `GET /:id`). 12 suite/51 test tetap hijau.
- **`useStepUp.ts`** (baru, `frontend/app/composables/`) — satu state singleton
  (`useState('step-up-dialog', ...)`) + `withStepUp(action)`: bungkus panggilan `useApi()`
  apa pun. Kalau backend membalas 412 (dari `StepUpGuard` ATAU `StepUpService.requireApproval()`
  — keduanya identik lewat `stepUpRequiredException()`), modal otomatis terbuka, polling
  `GET /authorization-requests/:id` tiap 5 detik, dan begitu `APPROVED` action yang sama
  diulang otomatis dengan header `x-authorization-request-id` (bukan endpoint approve baru —
  request asli itu sendiri yang diulang, sama seperti alur `StepUpGuard`/`StepUpService`
  yang sudah ada). `REJECTED`/`EXPIRED`/payload-mismatch masing-masing dilempar sebagai error
  class berbeda (`StepUpDeniedError`/`StepUpExpiredError`/`Error` biasa) tapi lewat **satu**
  fungsi `pollOnce()` — tidak ada percabangan kedua untuk sumber 412 yang berbeda.
- **`<StepUpDialog>`** (baru) — dipasang **sekali** di `layouts/default.vue`, bukan per halaman.
  Tidak pernah menampilkan angka batas apa pun (CLAUDE.md §2.17/§5) — hanya `context_summary`
  dan pesan status generik. Countdown TTL dari `useClockTick()` (satu jam dinding `setInterval`
  dibagi seluruh app, bukan per komponen — pola singleton sama seperti `refreshPromise` di
  `useApi.ts`).
- **`usePayloadFormatter.ts`** (baru) — payload dihumankan per `actionType` (label
  diterjemahkan, `amount` diformat rupiah lewat `useRupiah()`), plus **filter kata kunci**
  (regex `threshold|batas|limit|cost|hpp` pada nama field) yang membuang field manapun yang
  cocok — jaring pengaman kalau actionType Hari 13/15/17/21 nanti menaruh angka batas di
  payload-nya tanpa sengaja.
- **`pages/persetujuan/index.vue`** (baru) — halaman Antrian Persetujuan (MASTER/SUPERVISOR),
  polling 5 detik lewat `GET /authorization-requests` yang sudah ada sejak Hari 9 BE.
  `context_summary` jadi baris utama, "Detail" expand payload lewat `usePayloadFormatter()`,
  "Tolak" mewajibkan textarea alasan sebelum "Konfirmasi Tolak" aktif. Bukan `<DataTable>`
  (endpoint ini flat array, bukan paginated `{data,meta}` — daftar antrian realistis kecil).
- **`pages/qa/step-up-demo.vue`** (baru, sementara — pola sama `qa/export-demo.vue` Hari 5) —
  pemicu manual `POST /authorization-requests/test-step-up-action` lewat `withStepUp()`.
  **Hapus** begitu Hari 13/15/17/21 punya aksi step-up sungguhan untuk diuji end-to-end.
- **`useApi.ts` diperluas**: `get/post/patch/put/delete` sekarang menerima parameter `headers`
  opsional (dipakai `withStepUp()` untuk menyisipkan `x-authorization-request-id` saat
  mengulang request asli).
- **2 bug ditemukan & diperbaiki lewat verifikasi manual browser** (bukan cuma baca kode —
  lihat §3 untuk kronologi lengkap): (1) `useClockTick`'s `setInterval` sempat jalan di SSR
  (500 error) → digerbangi `import.meta.client`; (2) `closeDialog()` me-reset seluruh state
  modal serentak dengan menurunkan `open`, membuat modal "berkedip" balik ke tampilan awal
  selagi UModal masih beranimasi keluar → `closeDialog()` sekarang cuma menurunkan `open`.
- **Verifikasi manual dua sisi** — operator via browser sungguhan (login ulang, klik tombol
  trigger), supervisor via token JWT langsung lewat curl (login dua role berbeda di dua tab
  pada satu profil Chrome **tidak bisa hidup bersamaan** karena cookie sesi dibagi per origin,
  bukan per tab — dikonfirmasi empiris saat tab operator ikut berubah jadi Supervisor setelah
  tab lain login): trigger → modal "Menunggu Persetujuan" + countdown → approve (curl,
  token supervisor) → modal lanjut **otomatis tanpa refresh** dalam <5 detik, menampilkan
  hasil eksekusi asli (`executedBy` cocok user id operator) → trigger lagi → reject dengan
  alasan (curl) → modal tampilkan "Ditolak: `<alasan persis>`" dalam <5 detik → trigger lagi →
  klik Batalkan → dikonfirmasi lewat `GET /:id` request tetap `PENDING` (tidak menggantung,
  tidak terkonsumsi). Halaman Antrian Persetujuan diverifikasi terpisah dengan klik sungguhan
  (login supervisor): render item + `context_summary`, expand Detail, Tolak mewajibkan
  alasan, toast + list refresh setelah aksi. Data uji (`authorization_requests` bertipe
  `TEST_STEP_UP_ACTION`) dihapus dari DB dev setelah verifikasi, konsisten konvensi hari-hari
  sebelumnya.
- **Belum dikerjakan / di luar lingkup sengaja**: tidak ada — seluruh scope FE Hari 9 (dan
  item FE Hari 10 yang sebelumnya menunjuk balik ke sini) sudah selesai.

Urutan yang diharapkan:
`Auth → Products → Customers → Suppliers → Warehouses → Settings → DocumentCounters →
ChartOfAccounts → AuthorizationRequests → JournalPoster → StockRecorder(FIFO) →
VoidEngine → ManualJournal → OpeningBalance → WarehouseMutation → PurchaseInvoice →
PurchaseReturn → OperationalExpenses → SalesOrder → SalesInvoice → SalesReturn →
Agents → Vehicles → DeliveryOrder → Payments → Reports`

---

---

## 5. UAT Mingguan

Diikuti **Master dan operator**. Operator wajib ikut sejak minggu pertama — dialah yang menemukan hambatan input.
**Supervisor ikut mulai minggu 3**, saat halaman pengecekan sudah ada untuk diuji.

| Minggu | Tgl | Yang diuji | Temuan | Sudah diperbaiki |
|---|---|---|---|---|
| 1 | ~2 Agu | Login, master data v2 (nama produk tersusun, merek/UoM/salesman), RBAC | | |
| 2 | ~9 Agu | Engine, jurnal manual, mutasi gudang, faktur pembelian + bonus | | |
| 3 | ~16 Agu | Penjualan, panel harga, kunci cetak, pengecekan supervisor, tutup bulan | | |
| 4 | ~23 Agu | Pengiriman, pembayaran, selisih pembayaran, kontinuitas nomor | | |
| 5 | ~29 Agu | Laporan, deploy di mesin toko, end-to-end | | |

**Aturan:** temuan bug → diperbaiki dalam sisa hari. Permintaan fitur baru → **tukar scope**,
bukan tambahan. Daftar potong sudah habis, jadi tidak ada lagi yang bisa dikorbankan diam-diam.

---

## 6. Daftar Potong Darurat — **HABIS**

| | Item | Hemat | Status |
|---|---|---|---|
| 1 | Export PDF laporan (Excel saja dulu) | 0,50 | ✅ **diambil** 28 Jul |
| 2 | Laporan retur & stok minus (query manual dulu) | 0,50 | ✅ **diambil** 28 Jul |
| 3 | Rekap setoran agen (manual bulan pertama) | 0,75 | ✅ **diambil** 28 Jul — ⚠️ butuh kontrol pengganti di kertas |
| 4 | Cash opname | 0,50 | ✅ **diambil** 28 Jul |
| 5 | ~~Modul Sales Order~~ | — | ❌ **tidak boleh** — klien justru ingin memindahkannya dari kertas ke program |
| 6 | ~~Bad stock~~ | — | ❌ **tidak bisa lagi** — retur pembelian sepenuhnya bergantung padanya |

**Tidak boleh dipotong — mesin akuntansi:** Journal Poster · Stock Recorder + FIFO ·
VOID + reversing · integration test **Hari 11** · alur Saldo Awal · validator **backdate**
(pemeriksaan periode menyusul pasca-MVP).

**Tidak boleh dipotong — menyangkut kebenaran data, bukan kecepatan:** panel riwayat harga ·
sisa stok saat mengetik · modal tambah pelanggan · batas jual di bawah harga pokok ·
kunci cetak + jejak otorisasinya.

**Boleh diturunkan ke "cukup baik"** (disetujui klien 28 Juli): navigasi keyboard penuh
tanpa mouse · Enter menambah baris · fokus otomatis. Tetap dibangun, tidak dipoles.

> **Tidak ada lagi yang bisa dipotong.** Kalau drift muncul, hanya ada dua tuas: tukar scope
> dengan klien, atau geser cut-over. Keduanya keputusan klien, bukan keputusan developer —
> bawa ke mereka hari itu juga, jangan diserap diam-diam.

---

## 7. Backlog Pasca-MVP (setelah 30 Agustus)

Disepakati klien 29 Juli 2026. **Ini ditunda, bukan dipotong** — prompt lengkapnya masih ada
di `PROMPTS_HARIAN.md` bertanda ⏸ dan tinggal dijalankan.

| Prioritas | Item | Bekas hari | Hari | Tenggat sebenarnya |
|---|---|---|---|---|
| P1 | Tutup bulan + closing + buka kembali | 23A | 1,00 | **sebelum 1 Okt** — tutup bulan September |
| P2 | Laporan penjualan, umur piutang, umur hutang | 30 | 1,00 | bulan pertama operasi |
| P3 | Laporan biaya operasional | bagian 31 | 0,40 | bulan pertama operasi |
| P4 | Layar Jurnal Manual (endpoint sudah ada) | bagian 12 | 0,25 | tidak mendesak |
| P5 | Sisa daftar potong 28 Juli: export PDF · laporan retur & stok minus · cash opname · rekap setoran agen | — | 2,25 | pasca-MVP |

**Yang menambal sementara di bulan pertama:**

| Yang belum ada | Penggantinya |
|---|---|
| Laporan piutang & hutang | Layar pembayaran (Hari 26) menampilkan faktur outstanding per pihak — **pastikan sisa tagihan per faktur terbaca jelas di sana** |
| Tutup bulan | Validator backdate 2 hari sudah menghadang koreksi ke belakang |
| Laporan biaya operasional | Rekap kas harian per akun (Hari 31) |
| Layar Jurnal Manual | Endpoint-nya ada; Master belum tentu butuh di bulan pertama |

⚠️ **Risiko yang harus diucapkan ke klien, bukan diasumsikan:** tutup bulan September jatuh
sekitar 1 Oktober, dan fitur itu belum ada pada 30 Agustus. Sepakati sekarang kapan P1
dikerjakan — kalau tidak, tenggatnya baru terasa saat sudah lewat.
