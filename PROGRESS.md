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
| Hari ke- | `3` dari 34 |
| Tanggal hari ini | `27 Juli 2026` |
| Rencana Hari 34 | **29 Agustus 2026** |
| Cut-over | **1 September 2026** |
| **Drift kumulatif** | `-2` hari (lebih cepat) — Hari 1 & 2 selesai 26 Jul (rencana 27–28 Jul), Hari 3 selesai 27 Jul (rencana 29 Jul) |
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

**Hari 4** — Rencana: 30 Jul · Aktual: `____`
- [ ] BE: CRUD Products (+konversi satuan 1 layar)
- [ ] BE: CRUD Customers (+`is_pkp`, `ar_account_id`)
- [ ] BE: CRUD Suppliers (auto-code + masking Operator) + Warehouses + Settings
- [ ] FE: halaman Products, Customers, Settings
- [ ] **Beri tahu klien: input master data boleh dimulai**
- **DoD:** Operator melihat supplier ter-mask, Master melihat penuh; klien sudah bisa masuk & input produk

### Fase 2 — Engine Inti (Hari 5–10) · 31 Juli–5 Agustus

**Hari 5** — Rencana: 31 Jul · Aktual: `____`
- [ ] BE: export generik ExcelJS + PDFKit
- [ ] BE: `authorization_requests` + guard step-up + `expires_at` (TTL 15 menit)
- [ ] FE: halaman Suppliers, Warehouses (pilih `warehouse_type`)
- **DoD:** request step-up kedaluwarsa setelah 15 menit dan ditolak saat dieksekusi

**Hari 6** 🔒 — Rencana: 1 Agu · Aktual: `____`
- [ ] BE: `journal_entries` + `journal_entry_lines`
- [ ] BE: **Journal Poster** + 5 validasi (min 2 baris, satu sisi > 0, balance, akun aktif, nomor)
- [ ] FE: halaman COA (tree, view only)
- **DoD:** posting tidak balance → error & rollback; `entry_number` format `JE/YYMM/NNNN`

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
```

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
