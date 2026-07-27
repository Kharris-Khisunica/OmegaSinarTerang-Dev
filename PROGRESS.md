# Progress Tracker v2 — Website Operasional FMCG

Pendamping `Development_Plan_v2_Website_Operasional_FMCG.md`.

**Cara pakai:**
1. Simpan file ini **di dalam repo** dan commit setiap hari. Ini audit trail proyek.
2. Isi **Tgl Aktual** saat sub-item selesai & lolos DoD. Kalau kosong padahal tanggalnya lewat, itu drift.
3. Update **§0 Papan Status** setiap pagi sebelum mulai kerja.
4. Salin bagian "Modul Selesai" (§4) ke context prompt AI berikutnya.

---

## 0. Papan Status (update tiap pagi)

| | |
|---|---|
| Hari ke- | `6` dari 34 |
| Tanggal hari ini | `27 Juli 2026` |
| Rencana Hari 34 | **29 Agustus 2026** |
| Cut-over | **1 September 2026** |
| **Drift kumulatif** | `-5` hari (lebih cepat) — Hari 1 & 2 selesai 26 Jul (rencana 27–28 Jul), Hari 3 & 4 selesai 27 Jul (rencana 29–30 Jul), Hari 5 & 6 juga selesai 27 Jul (rencana 31 Jul & 1 Agu) |
| Buffer tersisa | Hari 15 · 31 · 33 → `3` dari 3 |

**Aturan drift:**
- Drift ≥ 1 hari → catat di §3, cari penyebabnya hari itu juga
- Drift ≥ 2 hari → pakai buffer terdekat
- Drift ≥ 3 hari → **jalankan daftar potong darurat** (plan v2 §9.3), jangan menunggu

---

## 1. Menunggu Klien (cek tiap hari)

| Item | Dibutuhkan sebelum | Diminta tgl | Diterima tgl | Status |
|---|---|---|---|---|
| Format nota A4 & surat jalan | Hari 19 & 22 | | | ⏳ dijanjikan 27 Juli |
| Format nomor surat jalan | Hari 21 | | | ⏳ |
| Keputusan hosting final | **Hari 4** | | | ⏳ sementara mini PC |
| Pengadaan mini PC + UPS | Hari 30 | | | ⏳ |
| Data saldo awal stok + harga terakhir | Hari 32 | | | ⏳ |
| Saldo awal kas & bank | Hari 32 | | | ⏳ |
| Keputusan diskon supplier | Hari 11 | | | ⏳ kolom disiapkan |
| Konfirmasi tarif PPN (konsultan pajak) | Hari 18 | | | ⏳ |
| Input master data oleh klien (100 produk + 100 customer) | Hari 32 | | | ⏳ bisa mulai Hari 4 |
| Repo dipindah ke akun klien | Hari 34 | | | ⏳ **sarankan hari ini** |

> Item ⏳ yang melewati tanggal "dibutuhkan sebelum" otomatis jadi risiko jadwal. Catat di §3.

---

## 2. Checklist Harian

Legenda: `[ ]` belum · `[~]` jalan · `[x]` selesai & lolos DoD · ⚠️ risiko tinggi · 🔒 blocker

### Fase 1 — Fondasi (Hari 1–4) · 27–30 Juli

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

### Fase 2 — Engine Inti (Hari 5–10) · 31 Juli–5 Agustus

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

**Hari 7** 🔒 — Rencana: 2 Agu · Aktual: `____`
- [ ] BE: `stock_movements`, `product_stock_balance`, `stock_cost_lots`, `stock_cost_consumptions`
- [ ] BE: **Stock Recorder + FIFO + row-lock `SELECT ... FOR UPDATE`**
- [ ] BE: penanganan stok minus (`stockWarning`, fallback cost lot terakhir)
- [ ] FE: halaman Authorization Requests (antrian + modal approve)
- **DoD:** konsumsi FIFO mengambil lot tertua; stok minus jalan dengan warning, tidak ditolak

**Hari 8** ⚠️ — Rencana: 3 Agu · Aktual: `____`
- [ ] BE: **integration test 4 invarian** (jurnal balance, FIFO urut, VOID simetris, stok rekonsiliasi)
- [ ] BE: fungsi VOID generik + reversing journal
- [ ] BE: wiring step-up end-to-end (dummy action)
- [ ] FE: dashboard placeholder
- [ ] **Minta review kode eksternal 2 jam** (engine sudah lengkap — ROI tertinggi)
- **DoD:** 4 test hijau dan dijalankan otomatis; VOID membalik persis, bertanggal hari ini

**Hari 9** — Rencana: 4 Agu · Aktual: `____`
- [ ] BE: **Jurnal Manual** (Master only, blokir Persediaan/Piutang/Hutang)
- [ ] BE: **alur Saldo Awal terpadu** (jurnal pembuka + lot FIFO dari angka yang sama)
- [ ] FE: halaman Jurnal Manual + halaman Saldo Awal
- **DoD:** jurnal manual ke Persediaan → 403; saldo awal menghasilkan lot yang nilainya = jurnal pembuka

**Hari 10** — Rencana: 5 Agu · Aktual: `____`
- [ ] BE: **Warehouse Mutation bercabang** (`CONSIGNMENT` tanpa movement, `STORE`/`BAD_STOCK` catat `transfer`)
- [ ] BE: get-or-create gudang titip + validasi qty titip ≤ qty dibeli
- [ ] FE: halaman Warehouse Mutation + riwayat
- [ ] Uji manual CRUD end-to-end di browser
- **DoD:** mutasi ke bad stock memindahkan lot dengan harga pokok sama; mutasi ke titip tidak membuat movement

### Fase 3 — Pembelian (Hari 11–15) · 6–10 Agustus

**Hari 11** — Rencana: 6 Agu · Aktual: `____`
- [ ] BE: `purchase_invoices`(+lines), `goods_receipts`(+lines)
- [ ] BE: `POST /purchase-invoices` (auto GR + Stock Recorder + Journal)
- [ ] BE: alokasi `discount_amount` proporsional; `lot_date` = `receipt_date`
- [ ] FE: form Purchase Invoice multi-baris (subtotal/total live)
- **DoD:** 1 invoice 3 baris → jurnal balance, lot terbentuk benar, `total_amount` persis = nota supplier (tanpa pembulatan)

**Hari 12** — Rencana: 7 Agu · Aktual: `____`
- [ ] BE: edit invoice bersyarat (belum dibayar & lot belum terkonsumsi)
- [ ] BE: VOID + reversing journal & stock
- [ ] FE: detail Purchase Invoice + tombol edit/void
- **DoD:** edit setelah lot terkonsumsi → ditolak dengan pesan jelas

**Hari 13** — Rencana: 8 Agu · Aktual: `____`
- [ ] BE: `purchase_returns`(+lines) + nomor `RB/YYMM/NNNN`
- [ ] BE: endpoint retur + `settlement_type` (REDUCE_INVOICE / CASH)
- [ ] FE: halaman Retur Pembelian + cetak A4
- **DoD:** jurnal Hutang/Kas (D) / Persediaan (K), tanpa akun kontra; stok berkurang dari lot asal

**Hari 14** — Rencana: 9 Agu · Aktual: `____`
- [ ] BE: `operational_expenses` + CRUD + journal + VOID
- [ ] FE: halaman Operational Expenses
- **DoD:** VOID menghasilkan jurnal pembalik, baris asli tetap ada (tidak hard-delete)

**Hari 15** — Rencana: 10 Agu · Aktual: `____` — **BUFFER**
- [ ] BE: CRUD COA penuh Master (akun kas/bank + piutang custom)
- [ ] FE: form tambah/ubah akun COA
- [ ] Buffer: sisa pekerjaan Fase 3
- **DoD:** Master bisa membuat akun kas baru dengan `is_cash_account = true` dan langsung terpilih di form pembayaran

### Fase 4 — Penjualan (Hari 16–20) · 11–15 Agustus

**Hari 16** — Rencana: 11 Agu · Aktual: `____`
- [ ] BE: `sales_orders`(+lines) + CRUD + `convert-to-invoice`
- [ ] FE: halaman Sales Order
- **DoD:** SO yang sudah CONVERTED tidak bisa diubah

**Hari 17** ⚠️ — Rencana: 12 Agu · Aktual: `____`
- [ ] BE: `price-suggestion` (**wajib**, bukan opsional)
- [ ] BE: `sales_invoices`(+lines) migration
- [ ] FE: mulai form Sales Invoice — autocomplete produk + suggest harga
- [ ] FE: **modal tambah customer dari dalam form** (bukan pindah halaman)
- **DoD:** pilih customer+produk → 3–5 harga terakhir muncul < 300ms

**Hari 18** ⚠️ — Rencana: 13 Agu · Aktual: `____`
- [ ] BE: `POST /sales-invoices` full flow (Stock Recorder + Journal)
- [ ] BE: **pembulatan ke atas kelipatan config** → Pendapatan Pembulatan
- [ ] BE: PPN dormant (`company_is_pkp` = false → tidak memungut)
- [ ] FE: lanjut form + preview total live
- **DoD:** total selalu kelipatan Rp100; `rounding_amount` masuk jurnal; PPN nol selama config mati

**Hari 19** — Rencana: 14 Agu · Aktual: `____`
- [ ] BE: edit bersyarat + VOID Sales Invoice
- [ ] FE: detail Sales Invoice
- [ ] FE: **cetak nota A4 2 rangkap identik**
- **DoD:** nota tercetak sesuai format klien; VOID mengembalikan stok & lot

**Hari 20** — Rencana: 15 Agu · Aktual: `____`
- [ ] BE: `sales_returns`(+lines) + nomor `RJ/YYMM/NNNN`
- [ ] BE: jurnal 4 sisi + `unit_cost_fifo` asli + `settlement_type`
- [ ] FE: halaman Retur Penjualan + cetak
- **DoD:** retur atas invoice **lunas** dengan `CASH` → jurnal kas benar, `paid_amount` tidak melebihi `total_amount`

### Fase 5 — Pengiriman & Pembayaran (Hari 21–25) · 16–20 Agustus

**Hari 21** — Rencana: 16 Agu · Aktual: `____`
- [ ] BE: `agents`, `vehicles` + CRUD
- [ ] BE: `delivery_orders`(+lines) + nomor `SJ/YYMM/NNNN`
- [ ] FE: halaman Agen, Kendaraan
- **DoD:** surat jalan terbentuk dari invoice, membawa agen & kendaraan

**Hari 22** — Rencana: 17 Agu · Aktual: `____`
- [ ] BE: endpoint surat jalan + status (PENDING/DELIVERED/POSTPONED/RETURNED)
- [ ] FE: halaman Surat Jalan + **cetak A4**
- **DoD:** status POSTPONED bisa dilihat sebagai daftar "belum terkirim"

**Hari 23** ⚠️ — Rencana: 18 Agu · Aktual: `____`
- [ ] BE: `payment_batches` + `payment_batch_methods` + `payments` + `agent_id`/`vehicle_id`
- [ ] BE: `POST /payments/preview-allocation` (FIFO, tolak overpayment)
- [ ] FE: Payment step 1 — pilih pihak + input **multi-metode**
- **DoD:** input 30jt kas + 50jt transfer atas tagihan 100jt → preview benar, sisa 20jt tetap outstanding

**Hari 24** ⚠️ — Rencana: 19 Agu · Aktual: `____`
- [ ] BE: `POST /payments/confirm` (multi-metode, AR + AP simetris)
- [ ] BE: VOID payment batch
- [ ] FE: Payment step 2 — **alokasi dapat diedit manual** + riwayat batch
- **DoD:** operator mengubah alokasi ke invoice hari ini (bukan tunggakan lama) dan tersimpan sesuai editan

**Hari 25** — Rencana: 20 Agu · Aktual: `____`
- [ ] BE: rekap setoran agen (group kendaraan + tanggal)
- [ ] FE: halaman Rekap Setoran Agen
- **DoD:** total uang per mobil dapat dicocokkan dengan total nota hari itu

### Fase 6 — Laporan & Serah Terima (Hari 26–34) · 21–29 Agustus

**Hari 26** — Rencana: 21 Agu · Aktual: `____`
- [ ] BE: laporan stok per gudang (**satuan dipecah**: "12 dus 15 renceng")
- [ ] BE: laporan barang titipan (sumber `warehouse_mutations`)
- [ ] FE: halaman Laporan Stok, Barang Titipan

**Hari 27** — Rencana: 22 Agu · Aktual: `____`
- [ ] BE: laporan penjualan, piutang, hutang
- [ ] FE: halaman laporan tsb

**Hari 28** — Rencana: 23 Agu · Aktual: `____`
- [ ] BE: laporan biaya operasional, **rekap kas harian per akun**, cash opname (laporan)
- [ ] FE: halaman Kas

**Hari 29** — Rencana: 24 Agu · Aktual: `____`
- [ ] BE: laporan retur, **laporan produk stok minus**, endpoint rekonsiliasi stok
- [ ] FE: halaman laporan sisa

**Hari 30** — Rencana: 25 Agu · Aktual: `____`
- [ ] BE: export Excel + PDF seluruh laporan
- [ ] FE: tombol export di semua halaman laporan

**Hari 31** — Rencana: 26 Agu · Aktual: `____` — **BUFFER**
- [ ] Perbaikan temuan UAT minggu 1–4

**Hari 32** — Rencana: 27 Agu · Aktual: `____`
- [ ] BE: audit RBAC/Permission Matrix lintas endpoint (plan v2 §7)
- [ ] FE: audit Permission Matrix lintas halaman

**Hari 33** — Rencana: 28 Agu · Aktual: `____` — **BUFFER**

**Hari 34** — Rencana: 29 Agu · Aktual: `____`
- [ ] Smoke test end-to-end (login → semua modul → logout)
- [ ] **Dokumentasi setup & deploy**
- [ ] Serah terima + jalankan Checklist Go-Live (plan v2 §8)

---

## 3. Catatan Harian & Hambatan

Isi hanya kalau ada yang meleset atau ada keputusan baru. Kosong = lancar.

| Tgl | Hari ke- | Kejadian | Dampak jadwal | Tindakan |
|---|---|---|---|---|
| 26 Jul 2026 | 1 | Mesin dev hanya 7.7GB RAM (sering <1GB free). Docker Desktop jalan bareng build Nuxt/Vite memicu crash `memory allocation failed` (esbuild/Vite OOM) — sudah dibuktikan gagal saat Docker jalan, sukses setelah Docker dimatikan. | Tidak ada drift, tapi menetapkan konvensi dev harian. | Postgres native Windows (port 5432) jadi DB dev harian, bukan Docker. `docker-compose.yml` tetap di repo untuk deploy ke mini PC nanti (dipetakan ke port 5433 agar tidak bentrok kalau harus jalan bareng Postgres native). `scripts/verify.sh` diubah untuk cek Postgres native langsung, bukan lewat `docker compose exec`. |
| 27 Jul 2026 | 4 | §1 "Keputusan hosting final" dibutuhkan **sebelum Hari 4** — sampai akhir Hari 4 masih ⏳ (sementara asumsi mini PC lokal, sesuai default plan). | Belum ada drift jadwal (deploy Docker baru dipakai Hari 30+), tapi risiko menumpuk kalau dibiarkan sampai mendekati Hari 30 (pengadaan mini PC+UPS). | Tanyakan ulang ke klien besok; kalau masih belum ada jawaban di Hari 10 (buffer Fase 2), eskalasi jadi blocker eksplisit. |
| 27 Jul 2026 | 6 | Migration `CreateJournalEntries` sempat lupa dijalankan (`npm run migration:run`) di DB dev `omega_dev` setelah dibuat — ketahuan lewat integration test yang gagal `relation "journal_entries" does not exist"`, bukan lewat `verify.sh` (skrip itu cuma menguji up→down→up di DB sementara, tidak menerapkan ke DB dev harian). | Tidak ada drift, tapi berpotensi berulang tiap migration baru kalau tidak diingat manual. | Jalankan `npm run migration:run` manual segera setelah bikin migration baru, sebelum lanjut coding fitur yang bergantung padanya. Pertimbangkan tambah langkah ini ke `verify.sh` atau checklist DoD kalau kejadian lagi di Hari 7+. |
| 27 Jul 2026 | 5 & 6 | Verifikasi FE untuk kedua hari ini (Suppliers/Warehouses/ExportButton Hari 5; COA tree + Jurnal Hari 6) baru lewat pembacaan kode + kontrak API asli — ekstensi Chrome browser automation tidak konek di sesi ini. | Tidak ada drift jadwal, tapi risiko kualitas: bug visual (styling, expand/collapse tree, drawer, download filename) baru ketahuan belakangan. | Servers BE (`:3000`)/FE (`:3001`) ditinggal jalan; **wajib** uji manual di browser sebelum halaman-halaman ini dianggap benar-benar final — jadwalkan sesegera ekstensi Chrome konek lagi. |

---

## 4. Modul Selesai

Isi ulang tiap update. Salin bagian ini ke context prompt AI berikutnya.

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

Urutan yang diharapkan:
`Auth → Products → Customers → Suppliers → Warehouses → Settings → DocumentCounters →
ChartOfAccounts → AuthorizationRequests → JournalPoster → StockRecorder(FIFO) →
VoidEngine → ManualJournal → OpeningBalance → WarehouseMutation → PurchaseInvoice →
PurchaseReturn → OperationalExpenses → SalesOrder → SalesInvoice → SalesReturn →
Agents → Vehicles → DeliveryOrder → Payments → Reports`

---

## 5. UAT Mingguan

Diikuti **Master dan operator**. Operator wajib ikut sejak minggu pertama — dialah yang menemukan hambatan input.

| Minggu | Tgl | Yang diuji | Temuan | Sudah diperbaiki |
|---|---|---|---|---|
| 1 | ~2 Agu | Login, master data, RBAC | | |
| 2 | ~9 Agu | Engine, jurnal manual, mutasi gudang | | |
| 3 | ~16 Agu | Pembelian, retur, penjualan | | |
| 4 | ~23 Agu | Pengiriman, pembayaran, rekap agen | | |
| 5 | ~29 Agu | Laporan, end-to-end | | |

**Aturan:** temuan bug → diperbaiki dalam 34 hari. Permintaan fitur baru → masuk backlog, **tukar scope**, bukan tambahan.

---

## 6. Daftar Potong Darurat

Jalankan berurutan kalau drift ≥ 3 hari. Sudah disepakati di muka supaya tidak diputuskan dalam keadaan panik.

- [ ] 1. Export PDF (Excel saja dulu) — 0,5 hari
- [ ] 2. Laporan retur & stok minus (query manual dulu) — 0,5 hari
- [ ] 3. Rekap setoran agen (manual bulan pertama) — 0,75 hari
- [ ] 4. Cash opname — 0,5 hari
- [ ] 5. Modul Sales Order (pesanan langsung jadi invoice) — 1,5 hari
- [ ] 6. Bad stock (manual bulan pertama) — 0,5 hari

**TIDAK boleh dipotong:** Journal Poster · Stock Recorder + FIFO · VOID + reversing · integration test Hari 8 · alur Saldo Awal · **ergonomi input** (navigasi keyboard, autocomplete, price-suggestion, modal tambah customer).
