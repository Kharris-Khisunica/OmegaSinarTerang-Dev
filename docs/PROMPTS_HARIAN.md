# Prompt Development Harian — Website Operasional FMCG

Pendamping `Development_Plan_v2` dan `PROGRESS.md`.
Setiap hari punya **2 prompt** (Backend & Frontend) + **1 blok verifikasi**.

---

## Cara Pakai

1. Taruh `CLAUDE.md` di root repo. Claude Code membacanya otomatis — jadi prompt harian
   di bawah ini sengaja pendek, karena aturan mainnya sudah ada di sana.
2. Setiap pagi: jalankan **Prompt Pembuka** (§A) sekali.
3. Lalu jalankan **Prompt Backend** hari itu di satu sesi, **Prompt Frontend** di sesi terpisah.
   Sesi terpisah menjaga konteks tetap tajam; BE dan FE hari yang sama jarang perlu saling lihat
   kecuali soal bentuk response API — dan itu sudah ditulis eksplisit di tiap prompt FE.
4. Setelah keduanya selesai: jalankan `./scripts/verify.sh`, lalu **Prompt Penutup** (§C).
5. Kalau ada yang merah, jangan lanjut ke hari berikutnya. Catat di `PROGRESS.md` §3.

**Urutan dalam satu hari yang ideal:** BE dulu, FE kedua. Frontend butuh endpoint yang
sudah bisa dipanggil, bukan endpoint yang "nanti ada".

---

## A. Prompt Pembuka Harian (jalankan sekali tiap pagi)

```
Baca CLAUDE.md dan PROGRESS.md.

Sebelum kita mulai Hari <N>, jawab singkat (maksimal 15 baris):
1. Modul apa saja yang sudah selesai menurut PROGRESS.md §4?
2. Apakah ada blocker 🔒 dari hari sebelumnya yang belum tuntas?
3. Apakah ada item di PROGRESS.md §1 (Menunggu Klien) yang tanggal
   "dibutuhkan sebelum"-nya sudah lewat atau jatuh hari ini?
4. Sebutkan file/service existing yang akan saya sentuh hari ini, supaya
   kamu tidak membuat duplikat.

Jangan menulis kode dulu. Tunggu prompt tugas berikutnya.
```

---

## B. Template Generik (kalau perlu menyusun hari yang tidak ada di daftar)

```
KONTEKS: Hari <N> dari 34. Fase <X>. Lihat CLAUDE.md untuk aturan arsitektur.
Modul yang sudah ada: <salin dari PROGRESS.md §4>

TUGAS (<BACKEND|FRONTEND>):
1. <tugas konkret>
2. <tugas konkret>

ATURAN WAJIB HARI INI:
- <aturan spesifik yang paling gampang dilanggar hari itu>

DEFINITION OF DONE:
- <kondisi yang bisa diuji, bukan "selesai">

SETELAH SELESAI:
Jalankan ./scripts/verify.sh dan tampilkan hasilnya. Lalu tampilkan checklist DoD
di atas dalam bentuk [x]/[ ] beserta bukti (output perintah / potongan response JSON).
Kalau ada yang [ ], jelaskan kenapa — jangan lapor selesai.
```

---

## C. Prompt Penutup Harian

```
Hari <N> selesai. Lakukan:

1. Jalankan ./scripts/verify.sh dan tampilkan hasil lengkapnya.
2. Update PROGRESS.md:
   - centang [x] sub-item Hari <N> yang benar-benar lolos DoD (yang belum, biarkan [ ] atau [~])
   - isi "Aktual" dengan tanggal hari ini
   - update §0 Papan Status (Hari ke-, tanggal, drift kumulatif)
   - kalau ada yang meleset, tambahkan baris di §3 Catatan Harian
   - perbarui §4 Modul Selesai
3. Commit semua dengan pesan: "Hari <N>: <ringkasan 1 baris>"
4. Terakhir, beri saya 3 kalimat: apa yang paling berisiko untuk Hari <N+1>,
   dan apakah ada utang teknis yang saya buat hari ini.
```

---
---

# FASE 1 — FONDASI (Hari 1–4)

## Hari 1 — Scaffold

### 🔧 Backend

```
KONTEKS: Hari 1 dari 34. Repo masih kosong.

TUGAS (BACKEND):
1. Scaffold NestJS dengan struktur modular:
   src/core/       (engine: nanti journal-poster, stock-recorder, document-counter)
   src/modules/    (modul bisnis)
   src/common/     (guards, decorators, filters, interceptors)
   src/database/   (datasource, migrations/)
2. Setup TypeORM + PostgreSQL. synchronize: false. Migration manual.
3. Aktifkan extension pgcrypto lewat migration pertama.
4. Konfigurasi env: @nestjs/config dengan validasi schema (Joi atau class-validator).
   Variabel: DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME, JWT_SECRET,
   JWT_REFRESH_SECRET, PORT, NODE_ENV.
   Sediakan .env.example. .env masuk .gitignore.
5. Buat endpoint GET /health yang mengecek koneksi DB (SELECT 1) dan
   mengembalikan { status, db, uptime, version }.
6. Global: ValidationPipe (whitelist + transform), exception filter yang
   mengembalikan { statusCode, message, error, timestamp, path }.
7. Buat docker-compose.yml: service postgres + volume persisten.
8. Buat ./scripts/verify.sh (isinya menyusul di bawah — buat kerangkanya dulu:
   build, lint, test, migration up/down/up, curl /health).
9. git init, .gitignore, commit pertama.

ATURAN WAJIB:
- Jangan pakai synchronize: true, sekali pun untuk "sementara".
- Money NUMERIC(16,2), cost NUMERIC(16,4), qty NUMERIC(16,4). Tidak ada float.

DEFINITION OF DONE:
- `docker compose up -d` menyalakan postgres
- `npm run migration:run` sukses di DB kosong, `npm run migration:revert` juga sukses
- `npm run start:dev` jalan tanpa error
- `curl localhost:3000/health` → 200 dengan db: "ok"
- `npm run build` 0 error

SETELAH SELESAI: tampilkan output tiap perintah DoD di atas, lalu checklist [x]/[ ].
```

### 🎨 Frontend

```
KONTEKS: Hari 1 dari 34. Backend sedang di-scaffold paralel di folder /backend.

TUGAS (FRONTEND):
1. Scaffold Nuxt 3 + Nuxt UI di folder /frontend.
2. Buat layout default: sidebar kiri (collapsible) + topbar (nama user, role, tombol logout).
   Sidebar mengambil daftar menu dari satu file konfigurasi
   app/config/navigation.ts — bukan hardcode di template — karena menu akan
   difilter per role nanti. Bentuknya:
   { label, icon, to, roles: ['MASTER','SUPERVISOR','OPERATOR'] }
3. Siapkan struktur pages/ kosong sesuai modul yang akan datang:
   master-data/ (products, customers, suppliers, warehouses)
   transaksi/ (purchases, sales, returns, payments, deliveries)
   akuntansi/ (coa, journal, opening-balance)
   laporan/
   pengaturan/
   Isi tiap halaman dengan placeholder "Segera hadir — Hari <N>".
4. Buat composable useApi() berbasis $fetch dengan baseURL dari runtimeConfig.
   Belum perlu token, tapi siapkan interceptor-nya.
5. Buat composable useRupiah() dan useQty() untuk format angka.
   SEMUA format angka nanti wajib lewat sini.
6. Setup ESLint + Prettier, dan npm run build harus bersih.

ATURAN WAJIB:
- Bahasa UI: Indonesia. Tanggal format dd/MM/yyyy. Angka pakai pemisah ribuan titik.
- Jangan pakai komponen tabel/form ad-hoc. Hari 3 kita bikin <DataTable> dan
  <CrudFormPage>; halaman hari ini cukup placeholder.

DEFINITION OF DONE:
- `npm run dev` membuka aplikasi, sidebar + topbar tampil
- Semua route placeholder bisa diklik tanpa 404
- `npm run build` 0 error, `npm run lint` bersih

SETELAH SELESAI: tampilkan struktur folder final (tree) + hasil build.
```

### ✅ Verifikasi Hari 1

- [ ] `docker compose up -d` → postgres healthy
- [ ] `npm run migration:run` sukses; `migration:revert` sukses; `migration:run` lagi sukses
- [ ] `curl -s localhost:3000/health` → `{"status":"ok","db":"ok",...}`
- [ ] `npm run build` BE 0 error
- [ ] `npm run dev` FE tampil, semua menu placeholder bisa diklik
- [ ] `npm run build` FE 0 error
- [ ] Commit pertama masuk repo, `.env` **tidak** ikut ter-commit

---

## Hari 2 — Auth & RBAC

### 🔧 Backend

```
KONTEKS: Hari 2 dari 34. Scaffold BE sudah jadi, /health hijau.

TUGAS (BACKEND):
1. Migration tabel `users`: id, username (unique), password_hash, full_name,
   role (enum MASTER/SUPERVISOR/OPERATOR), is_active, created_at, updated_at.
   Sekalian buat trigger generik set_updated_at() dan pasang di users
   (trigger ini akan dipakai semua tabel berikutnya — taruh fungsinya di
   migration terpisah supaya bisa direferensikan ulang).
2. AuthModule: login, refresh, logout, me.
   - access token 15 menit, refresh token 1 hari
   - refresh token disimpan hashed di DB (kolom users.refresh_token_hash),
     logout menghapusnya
   - bcrypt cost 10
3. RolesGuard + decorator @Roles(...). JwtAuthGuard sebagai global guard,
   dengan @Public() untuk login/health.
4. Rate-limit login: @nestjs/throttler, 5 percobaan per menit per IP+username.
   Response 429 dengan pesan Indonesia.
5. Seed 3 user: master/master, supervisor/supervisor, operator/operator.
   Seed lewat script npm run seed, bukan migration.
6. Migration `audit_logs`: id, user_id, action, entity, entity_id,
   before_data JSONB, after_data JSONB, ip, created_at.
   Buat AuditInterceptor + helper stripSecrets() yang membuang
   password, password_hash, token, refresh_token dari JSONB.

ATURAN WAJIB:
- Response login TIDAK boleh mengandung password_hash.
- stripSecrets() harus punya unit test-nya sendiri hari ini juga.

DEFINITION OF DONE:
- 3 role bisa login dan dapat access+refresh token
- endpoint ber-@Roles menolak role salah dengan 403
- request tanpa token → 401
- refresh token yang sudah logout → 401
- percobaan login ke-6 dalam semenit → 429
- audit_logs mencatat login, dan kolom JSONB-nya tidak mengandung string password

SETELAH SELESAI: tampilkan transkrip curl untuk tiap poin DoD di atas.
```

### 🎨 Frontend

```
KONTEKS: Hari 2 dari 34. Backend menyediakan:
  POST /auth/login   { username, password } → { accessToken, refreshToken, user: { id, username, fullName, role } }
  POST /auth/refresh { refreshToken } → { accessToken, refreshToken }
  POST /auth/logout  → 204
  GET  /auth/me      → user

TUGAS (FRONTEND):
1. Halaman /login: form username+password, tampilkan error dari server apa adanya
   (pesannya sudah berbahasa Indonesia), disable tombol saat submitting,
   fokus otomatis ke field username.
2. Composable useAuth(): state user + token, login(), logout(), refresh().
   Token disimpan di cookie httpOnly-like via useCookie (sameSite: 'strict').
3. Middleware route global: kalau tidak ada token → redirect /login.
   Middleware kedua: guard per-role, dipakai lewat definePageMeta({ roles: [...] }).
4. useApi(): sisipkan Authorization header; kalau 401, coba refresh sekali,
   kalau gagal → logout + redirect /login. Jangan sampai refresh loop.
5. Sidebar memfilter menu berdasarkan user.role (pakai config navigation.ts dari Hari 1).
6. Topbar menampilkan nama + role, tombol logout berfungsi.

ATURAN WAJIB:
- Setelah login, redirect ke halaman yang tadi dituju (returnUrl), bukan selalu ke /.
- Halaman terproteksi tidak boleh "berkedip" tampil sebelum middleware jalan.

DEFINITION OF DONE:
- login sebagai 3 role masing-masing berhasil dan menu tersaring benar
- akses /pengaturan sebagai OPERATOR → ditolak/redirect
- refresh halaman tidak membuat user ter-logout
- logout menghapus token dan redirect ke /login
- akses URL terproteksi langsung (paste di address bar) tanpa token → ke /login

SETELAH SELESAI: sebutkan skenario manual yang kamu jalankan dan hasilnya.
```

### ✅ Verifikasi Hari 2

- [ ] Login 3 role berhasil, token tersimpan
- [ ] `curl` endpoint terproteksi tanpa token → 401
- [ ] Role salah → 403
- [ ] Login gagal 6× dalam 1 menit → 429
- [ ] `audit_logs.after_data` tidak mengandung substring `password`
- [ ] FE: refresh browser tidak melempar ke login
- [ ] FE: menu sidebar berbeda antar role
- [ ] `./scripts/verify.sh` hijau semua

---

## Hari 3 🔒 — Skema Master + Generator Nomor + Frontend Engine

> Hari terpenting minggu pertama. Dua komponen frontend di sini menentukan kecepatan
> 30 hari sisanya. Kalau harus molor, molorkan ke Hari 4 (sudah dialokasikan) —
> jangan dikerjakan asal jadi.

### 🔧 Backend

```
KONTEKS: Hari 3 dari 34. Blocker bagi semua hari sesudahnya.

TUGAS (BACKEND) — migration + service, belum perlu CRUD lengkap:
1. Migration `products` + `product_unit_conversions`:
   products: id, code (unique), name, base_unit, is_active, timestamps
   conversions: id, product_id, unit_name, qty_in_base_unit NUMERIC(16,4), level
   CATATAN: tidak ada kolom tax_status. Jangan dibuat.
2. Migration `customers`: id, code, name, phone, address, is_pkp BOOLEAN DEFAULT false,
   ar_account_id (FK chart_of_accounts, nullable), is_active, timestamps
3. Migration `suppliers`: id, display_code, name, contact_phone, contact_address,
   is_active, timestamps. Plus CREATE SEQUENCE supplier_code_seq (tidak reset bulanan).
4. Migration `warehouses`: id, name, warehouse_type ENUM('STORE','CUSTOMER_CONSIGNMENT','BAD_STOCK'),
   customer_id (nullable, hanya untuk CONSIGNMENT), is_default, is_active, timestamps
5. Migration `tax_rates`: id, name, rate NUMERIC(5,2), effective_from, effective_to (nullable)
6. Migration `chart_of_accounts`: id, code, name, account_type, parent_id,
   is_cash_account BOOLEAN, is_active, timestamps.
   Seed 11 akun: Persediaan, Piutang Usaha, Hutang Usaha, PPN Masukan, PPN Keluaran,
   Pendapatan Penjualan, Pendapatan Pembulatan, HPP, Retur Penjualan, Biaya Operasional, Modal.
   JANGAN seed akun Kas, Bank, atau Retur Pembelian.
7. Migration `settings` (key-value bertipe): company_is_pkp=false,
   rounding_multiple=100, tax_calculation_mode='EXCLUDE', backdate_max_days=2.
8. Migration `document_counters`: (doc_type, period) unique, last_number INT.
9. `src/core/document-counter/document-counter.service.ts`:
   getNextNumber(docType, date, manager: EntityManager): Promise<string>
   - period = format(date,'yyMM')
   - SELECT ... FOR UPDATE; kalau tidak ada, INSERT last_number=0
   - increment, return `${prefix}/${period}/${padStart(n,4,'0')}`
   - prefix map: SALES_INVOICE→INV, SALES_ORDER→SO, PURCHASE_INVOICE→PI,
     DELIVERY_ORDER→SJ, SALES_RETURN→RJ, PURCHASE_RETURN→RB,
     PAYMENT→PAY, JOURNAL_ENTRY→JE
   - WAJIB menerima EntityManager dari pemanggil supaya ikut transaction yang sama.
10. Pasang trigger set_updated_at di semua tabel di atas.

ATURAN WAJIB:
- Setiap migration punya down() yang benar-benar mengembalikan state.
- Semua uang NUMERIC(16,2), cost NUMERIC(16,4), qty NUMERIC(16,4).

DEFINITION OF DONE (buat test-nya, jangan hanya diklaim):
- getNextNumber('SALES_INVOICE', new Date('2026-09-01')) → 'INV/2609/0001'
- panggilan kedua → 'INV/2609/0002'
- ganti bulan ke 2026-10-01 → 'INV/2610/0001' (reset benar)
- test konkurensi: 20 pemanggilan paralel dalam transaction terpisah menghasilkan
  20 nomor unik berurutan tanpa duplikat  ← ini test yang paling penting hari ini
- migration up → down → up berhasil di DB kosong

SETELAH SELESAI: tampilkan hasil test konkurensi secara utuh.
```

### 🎨 Frontend

```
KONTEKS: Hari 3 dari 34. Ini FONDASI SELURUH FRONTEND — bukan komponen biasa.
Setiap halaman list di 30 hari ke depan memakai <DataTable>, setiap form
create/edit memakai <CrudFormPage>. Kalau abstraksinya buruk, semua modul melambat.

TUGAS (FRONTEND):

A. Komponen <DataTable>
   Props:
     - endpoint: string            (mis. '/products')
     - columns: Column[]           ({ key, label, align?, width?, format?, slot? })
     - searchable?: boolean        (default true)
     - searchPlaceholder?: string
     - filters?: FilterDef[]       (select/date-range, dikirim sebagai query param)
     - rowActions?: Action[]       ({ label, icon, to?, onClick?, roles?, show?(row) })
     - createTo?: string           (tombol "Tambah" di kanan atas; disembunyikan kalau tidak diisi)
     - defaultSort?: { key, dir }
   Perilaku:
     - pagination SERVER-SIDE; query param: page, limit, search, sortBy, sortDir, + filter
     - response yang diharapkan: { data: T[], meta: { page, limit, total, totalPages } }
     - debounce search 300ms
     - state di URL query (?page=2&search=indomie) supaya bisa di-back/bookmark/refresh
     - skeleton saat loading, empty state yang ramah, error state dengan tombol coba lagi
     - rowActions terfilter otomatis oleh role user aktif

B. Komponen <CrudFormPage>
   Props:
     - title, endpoint, id? (kalau ada → mode edit, fetch dulu)
     - schema: FieldDef[] ({ key, label, type, required?, options?, cols?, hint?, disabled? })
       type minimal: text, number, currency, select, autocomplete, date, textarea, switch
     - backTo: string
     - transformIn?/transformOut?  (mapping payload)
   Perilaku:
     - Ctrl+S menyimpan, Esc kembali (dengan konfirmasi kalau ada perubahan belum disimpan)
     - fokus otomatis ke field pertama saat halaman terbuka
     - validasi client + tampilkan error server per-field (mapping dari response 400)
     - tombol "Simpan" dan "Simpan & Tambah Lagi" (yang kedua mereset form dan
       fokus balik ke field pertama — ini yang bikin input 100 produk tidak menyiksa)
     - blokir double-submit

C. Halaman percontohan
   Buat /master-data/warehouses memakai KEDUA komponen di atas (list + create + edit),
   memanggil endpoint sementara (boleh mock/stub kalau BE belum siap).
   Tujuannya membuktikan abstraksinya cukup — bukan untuk dipakai final.

ATURAN WAJIB:
- Jangan menulis satu pun <table> atau <form> di halaman percontohan.
  Kalau butuh sesuatu yang belum didukung, tambahkan prop ke komponen.
- Dokumentasikan props kedua komponen di docs/frontend-engine.md.

DEFINITION OF DONE:
- Halaman warehouses: list bisa search, sort, pindah halaman, dan state-nya
  bertahan setelah refresh browser
- Create → validasi error tampil per-field → sukses → kembali ke list
- Edit memuat data lama dengan benar
- Ctrl+S dan Esc berfungsi
- "Simpan & Tambah Lagi" mereset form dan fokus kembali ke field pertama
- Tidak ada duplikasi markup tabel/form di halaman

SETELAH SELESAI: tampilkan isi docs/frontend-engine.md dan kode halaman
percontohan (harus pendek — kalau panjang, abstraksinya belum cukup).
```

### ✅ Verifikasi Hari 3

- [ ] Test konkurensi generator nomor: 20 paralel → 20 nomor unik
- [ ] `INV/2609/0001` benar, reset ke `0001` saat ganti bulan
- [ ] Seed COA 11 akun, **tanpa** Kas/Bank/Retur Pembelian
- [ ] Migration up → down → up bersih
- [ ] Halaman percontohan warehouses < 60 baris kode (bukti abstraksi jalan)
- [ ] Search + pagination + sort bertahan setelah refresh
- [ ] Ctrl+S, Esc, "Simpan & Tambah Lagi" berfungsi
- [ ] `./scripts/verify.sh` hijau

> ⚠️ Kalau checkbox "halaman percontohan pendek" gagal, **perbaiki hari ini atau Hari 4**.
> Ini satu-satunya utang teknis yang bunganya dibayar 30 hari.

---

## Hari 4 — CRUD Master Data + Klien Mulai Input

### 🔧 Backend

```
KONTEKS: Hari 4 dari 34. Migration master data & generator nomor sudah ada.
Hari ini klien mulai input data — jadi CRUD harus benar-benar bisa dipakai.

TUGAS (BACKEND):
1. CRUD Products lengkap + konversi satuan dikirim dalam SATU payload
   (nested array unitConversions), disimpan dalam satu transaction.
   Validasi: base_unit wajib, qty_in_base_unit > 0, tidak boleh ada unit duplikat,
   level berurutan.
2. CRUD Customers: termasuk is_pkp dan ar_account_id.
   ar_account_id hanya boleh diisi akun bertipe piutang.
3. CRUD Suppliers:
   - display_code auto dari supplier_code_seq → format 'SUP-001'
   - MASKING untuk role OPERATOR: name, contact_phone, contact_address di-mask
     (mis. "PT A***", "0812****789"). display_code tetap utuh.
   - masking dilakukan di interceptor/serializer, BUKAN di query — supaya
     tidak ada jalan bocor lewat endpoint lain (search, export, dsb).
4. CRUD Warehouses: warehouse_type, is_default (hanya boleh satu STORE default),
   customer_id wajib diisi kalau type = CUSTOMER_CONSIGNMENT.
5. CRUD Settings (MASTER only): GET semua, PATCH per key, dengan validasi tipe.
6. Semua list endpoint mendukung: page, limit, search, sortBy, sortDir
   dan mengembalikan { data, meta } sesuai kontrak <DataTable>.
7. Tidak ada endpoint DELETE. Nonaktif = PATCH is_active = false.

ATURAN WAJIB:
- Masking supplier wajib punya test: login sebagai OPERATOR → GET /suppliers
  dan GET /suppliers/:id, keduanya ter-mask.
- Semua write endpoint tercatat di audit_logs.

DEFINITION OF DONE:
- Buat 1 produk dengan 3 tingkat satuan (pcs → renceng → dus) lewat satu request
- OPERATOR GET /suppliers → ter-mask; MASTER → penuh
- Membuat warehouse CONSIGNMENT tanpa customer_id → 400
- Set is_default pada warehouse kedua → warehouse pertama otomatis tidak default
- Tidak ada route DELETE terdaftar (buktikan dengan daftar route Nest)

SETELAH SELESAI: tampilkan daftar route yang terdaftar dan transkrip curl DoD.
```

### 🎨 Frontend

```
KONTEKS: Hari 4 dari 34. Endpoint tersedia:
  /products (nested unitConversions), /customers, /suppliers, /warehouses, /settings
Semua list mengembalikan { data, meta }.

TUGAS (FRONTEND):
1. Halaman Products (list + form) memakai <DataTable> & <CrudFormPage>.
   Form produk butuh sub-tabel konversi satuan di dalam form — kalau
   <CrudFormPage> belum mendukung field bertipe "repeater/table", TAMBAHKAN
   dukungannya di komponen, jangan bikin halaman custom.
   Repeater wajib: Enter di baris terakhir menambah baris baru, tombol hapus baris.
2. Halaman Customers (list + form): is_pkp sebagai switch, ar_account_id sebagai select.
3. Halaman Settings (MASTER only): form sederhana untuk 4 setting.
   Beri penjelasan singkat tiap setting dalam bahasa awam
   (mis. "Pembulatan: total nota dibulatkan ke atas ke kelipatan ini").
4. Pastikan menu sidebar sudah mengarah ke halaman-halaman ini.

ATURAN WAJIB — HARI INI KLIEN MULAI INPUT ~100 PRODUK:
- Alur input harus bisa 100% keyboard: Tab antar field, Enter tambah baris konversi,
  Ctrl+S simpan, lalu "Simpan & Tambah Lagi" langsung fokus ke nama produk berikutnya.
- Setelah simpan sukses, tampilkan toast singkat, jangan modal yang harus diklik.

DEFINITION OF DONE:
- Input 5 produk berturut-turut tanpa menyentuh mouse sama sekali
- Produk dengan 3 satuan tersimpan benar dan tampil benar saat diedit
- OPERATOR melihat supplier ter-mask di UI; MASTER melihat penuh
- Settings hanya bisa dibuka MASTER

SETELAH SELESAI: laporkan berapa detik rata-rata untuk input satu produk
lewat keyboard saja. Kalau lebih dari 30 detik, sebutkan hambatannya.
```

### ✅ Verifikasi Hari 4

- [ ] Produk 3 tingkat satuan tersimpan & terbaca benar
- [ ] OPERATOR → supplier ter-mask (API **dan** UI)
- [ ] Warehouse CONSIGNMENT tanpa customer → ditolak
- [ ] Tidak ada route DELETE
- [ ] Input 5 produk berturut-turut tanpa mouse
- [ ] **Kirim pesan ke klien: input master data boleh dimulai**
- [ ] Konfirmasi ke klien: instance mana yang datanya akan dibawa ke produksi
- [ ] `./scripts/verify.sh` hijau

---
---

# FASE 2 — ENGINE INTI (Hari 5–10)

> Fase ini menentukan apakah angka di sistem bisa dipercaya. Tidak ada satu pun
> item di sini yang boleh masuk daftar potong.

## Hari 5 — Export Generik + Step-Up Authorization

### 🔧 Backend

```
KONTEKS: Hari 5 dari 34. Master data selesai.

TUGAS (BACKEND):
1. Service export generik di src/core/export/:
   exportToExcel(rows, columns, meta): Buffer      (ExcelJS)
   exportToPdf(rows, columns, meta): Buffer        (PDFKit)
   - columns: { key, label, width, align, format: 'text'|'number'|'currency'|'date'|'qty' }
   - meta: { title, subtitle, printedBy, printedAt, filters }
   - header perusahaan + judul + periode + footer "dicetak oleh X pada Y"
   - dipakai lewat satu interceptor: ?format=xlsx|pdf pada endpoint laporan mana pun
2. Migration `authorization_requests`: id, requester_id, approver_id (nullable),
   action_type, payload JSONB, status ENUM(PENDING/APPROVED/REJECTED/EXPIRED/EXECUTED),
   reason, expires_at, approved_at, executed_at, timestamps
3. StepUpGuard + decorator @RequiresStepUp('VOID_SALES_INVOICE'):
   - kalau user role OPERATOR dan belum ada approval valid → 428 dengan
     { requiresAuthorization: true, authorizationRequestId }
   - approval valid = status APPROVED && expires_at > now() && belum EXECUTED
   - saat dieksekusi, tandai EXECUTED (sekali pakai)
   - TTL default 15 menit, dihitung dari waktu APPROVE, bukan waktu request
4. Endpoint: POST /authorization-requests, GET (list PENDING),
   POST /:id/approve, POST /:id/reject.
   Approve boleh MASTER & SUPERVISOR, tidak boleh oleh requester sendiri.
5. Cron/lazy-check: request PENDING atau APPROVED yang lewat expires_at → EXPIRED.

ATURAN WAJIB:
- expires_at dicek SAAT EKSEKUSI, bukan hanya saat approve. Ini inti keamanannya.
- Approval tidak bisa dipakai dua kali.

DEFINITION OF DONE (test wajib):
- approve lalu tunggu (mock waktu) 16 menit → eksekusi ditolak dengan pesan kedaluwarsa
- approval yang sudah EXECUTED dipakai lagi → ditolak
- requester meng-approve permintaannya sendiri → 403
- export xlsx & pdf dari data dummy 3 kolom menghasilkan file yang bisa dibuka

SETELAH SELESAI: lampirkan test kedaluwarsa dan sekali-pakai secara utuh.
```

### 🎨 Frontend

```
KONTEKS: Hari 5 dari 34.

TUGAS (FRONTEND):
1. Halaman Suppliers (list + form) — ingat masking untuk OPERATOR,
   dan display_code read-only (auto dari server).
2. Halaman Warehouses (list + form) — select warehouse_type dengan penjelasan:
   STORE = gudang toko, CUSTOMER_CONSIGNMENT = barang titipan customer,
   BAD_STOCK = barang rusak. Field customer muncul hanya jika CONSIGNMENT.
3. Composable useExport(endpoint, filters): memanggil endpoint dengan
   ?format=xlsx|pdf dan memicu download. Buat komponen <ExportButton>
   yang nanti dipasang di semua halaman laporan.

DEFINITION OF DONE:
- Field customer di form warehouse muncul/hilang secara reaktif
- <ExportButton> berhasil mengunduh file dari endpoint dummy
- Nama file unduhan informatif: "laporan-stok-2026-08-05.xlsx"
```

### ✅ Verifikasi Hari 5

- [ ] Step-up kedaluwarsa setelah 15 menit → eksekusi ditolak
- [ ] Approval sekali pakai
- [ ] Self-approve ditolak
- [ ] Export xlsx & pdf terbuka normal
- [ ] `./scripts/verify.sh` hijau

---

## Hari 6 🔒 — Journal Poster

### 🔧 Backend

```
KONTEKS: Hari 6 dari 34. INI JANTUNG AKUNTANSI. Blocker bagi semua modul transaksi.

TUGAS (BACKEND):
1. Migration `journal_entries`: id, entry_number (unique), entry_date, description,
   source_type, source_id, is_reversal BOOLEAN, reversed_entry_id (nullable),
   created_by, timestamps
2. Migration `journal_entry_lines`: id, journal_entry_id, account_id,
   debit_amount NUMERIC(16,2) DEFAULT 0, credit_amount NUMERIC(16,2) DEFAULT 0,
   description, line_order
   WAJIB constraint: CHECK ((debit_amount > 0) <> (credit_amount > 0))
   (constraint yang meloloskan baris 0/0 adalah bug yang kita hindari sejak awal)
3. src/core/journal-poster/journal-poster.service.ts:
   post(dto: PostJournalDto, manager: EntityManager): Promise<JournalEntry>
   dto: { entryDate, description, sourceType, sourceId, lines: [{ accountId, debit, credit, description }] }

   5 VALIDASI WAJIB, semua melempar BadRequestException berbahasa Indonesia:
   a. lines.length >= 2
   b. setiap baris: tepat satu dari debit/credit > 0, yang lain 0
   c. SUM(debit) === SUM(credit), dibandingkan sebagai integer sen (hindari float)
   d. semua account_id ada dan is_active = true
   e. entry_number diambil dari DocumentCounterService dengan manager yang sama

   Plus validasi backdate: entryDate tidak boleh lebih dari
   settings.backdate_max_days hari ke belakang, dan tidak boleh di masa depan.

4. Service WAJIB menerima EntityManager. Tidak boleh membuka transaction sendiri.
5. Endpoint GET /journal-entries (list + filter tanggal/akun/source) dan
   GET /journal-entries/:id (dengan lines).

ATURAN WAJIB:
- Bandingkan balance dalam integer sen: Math.round(x * 100). Jangan bandingkan float.
- Tidak ada endpoint untuk mengubah atau menghapus journal entry. Selamanya.

DEFINITION OF DONE (unit test untuk KELIMA validasi + backdate):
- post 1 baris → error "minimal 2 baris"
- baris dengan debit dan credit sama-sama > 0 → error
- baris dengan debit=0 dan credit=0 → ditolak DB constraint (test level DB)
- total tidak balance selisih 0.01 → error dan ROLLBACK (pastikan tidak ada
  entry_number yang terpakai/terbuang — cek document_counters tidak naik)
- akun non-aktif → error
- entryDate 3 hari lalu (backdate_max_days=2) → error
- entry_number berformat JE/YYMM/NNNN

SETELAH SELESAI: buktikan poin rollback dengan menampilkan isi document_counters
sebelum dan sesudah percobaan posting yang gagal.
```

### 🎨 Frontend

```
KONTEKS: Hari 6 dari 34.

TUGAS (FRONTEND):
1. Halaman Chart of Accounts — tampilan TREE (parent-child), view only.
   Kolom: kode, nama, tipe, saldo (kosongkan dulu, kolomnya disiapkan).
   Bisa expand/collapse semua, dan ada search yang otomatis meng-expand hasil.
2. Halaman Jurnal (list) memakai <DataTable>: filter rentang tanggal + akun,
   klik baris → drawer/halaman detail menampilkan baris debit-kredit
   dengan total di bawah, dan penanda jelas kalau ini jurnal pembalik.
3. Akses: OPERATOR → 403 untuk COA (sesuai matrix). Jurnal boleh dilihat semua role.

DEFINITION OF DONE:
- Tree COA menampilkan 11 akun seed dengan hierarki benar
- Detail jurnal menampilkan total debit = total kredit di footer
- OPERATOR tidak melihat menu COA sama sekali
```

### ✅ Verifikasi Hari 6

- [ ] 5 validasi Journal Poster punya test dan hijau
- [ ] Posting tidak balance → error **dan** rollback penuh (counter tidak naik)
- [ ] `entry_number` = `JE/2608/0001`
- [ ] Constraint DB menolak baris 0/0
- [ ] Backdate > 2 hari ditolak
- [ ] Tidak ada endpoint update/delete jurnal
- [ ] `./scripts/verify.sh` hijau

---

## Hari 7 🔒 — Stock Recorder + FIFO

### 🔧 Backend

```
KONTEKS: Hari 7 dari 34. JANTUNG PERSEDIAAN. Blocker bagi semua modul transaksi.

TUGAS (BACKEND):
1. Migration:
   `stock_movements`: id, product_id, warehouse_id, movement_type
     ENUM('purchase','sale','transfer','return_in','return_out','adjustment','opening'),
     qty_base_unit NUMERIC(16,4) (positif=masuk, negatif=keluar),
     unit_cost NUMERIC(16,4), source_type, source_id, movement_date, created_by, timestamps
   `product_stock_balance`: product_id + warehouse_id (PK gabungan),
     qty_base_unit NUMERIC(16,4), updated_at  ← ini CACHE, bukan sumber kebenaran
   `stock_cost_lots`: id, product_id, warehouse_id, lot_date, qty_in NUMERIC(16,4),
     qty_remaining NUMERIC(16,4), unit_cost NUMERIC(16,4), source_type, source_id, timestamps
   `stock_cost_consumptions`: id, lot_id, movement_id, qty NUMERIC(16,4),
     unit_cost NUMERIC(16,4), timestamps

2. src/core/stock-recorder/stock-recorder.service.ts — semua menerima EntityManager:

   recordIn(dto, manager): membuat movement (+), lot baru, update balance
     - lot_date DIISI PEMANGGIL (untuk pembelian = receipt_date, bukan tanggal invoice)

   recordOut(dto, manager): { movement, totalCost, consumptions, stockWarning? }
     - SELECT * FROM stock_cost_lots
       WHERE product_id=$1 AND warehouse_id=$2 AND qty_remaining > 0
       ORDER BY lot_date ASC, id ASC
       FOR UPDATE                                   ← row-lock WAJIB
     - konsumsi lot tertua dulu, catat di stock_cost_consumptions,
       decrement qty_remaining lewat UPDATE (trigger updated_at generik yang mengurus timestamp)
     - kalau lot habis tapi qty masih kurang → JANGAN TOLAK:
       * sisa qty pakai unit_cost dari lot terakhir yang diketahui produk itu
         (kalau tidak ada sama sekali → 0, dan warning-nya lebih keras)
       * balance boleh negatif
       * return.stockWarning = "Stok <produk> di <gudang> minus <n> <satuan>"

   transfer(dto, manager): 2 baris movement (keluar dari asal, masuk ke tujuan),
     lot ikut pindah dengan unit_cost SAMA (bukan lot baru berharga baru).
     Tidak menghasilkan jurnal.

   reconcile(productId?, warehouseId?): membandingkan SUM(stock_movements.qty_base_unit)
     dengan product_stock_balance dan melaporkan selisih.

3. Utility formatQtyBreakdown(qtyBase, productId): "12 dus 15 renceng"
   memakai product_unit_conversions, dari satuan terbesar. Sisa nol tidak ditampilkan.

ATURAN WAJIB:
- SEMUA perubahan stok lewat service ini. Tidak ada modul lain yang UPDATE balance langsung.
- FOR UPDATE wajib, bukan opsional. Tanpa itu, dua transaksi bersamaan merusak FIFO.

DEFINITION OF DONE (integration test, bukan unit test bermock):
- masuk 10@1000 (lot 01/08), masuk 10@1200 (lot 03/08), keluar 15
  → totalCost = 10×1000 + 5×1200 = 16.000; lot pertama qty_remaining=0; kedua=5
- keluar melebihi total stok → berhasil, balance negatif, response ada stockWarning
- transfer 5 unit → 2 movement, lot di gudang tujuan ber-unit_cost identik
- test konkurensi: 2 pengeluaran paralel atas produk sama tidak menghasilkan
  konsumsi lot yang tumpang tindih (total konsumsi = total yang keluar)
- formatQtyBreakdown(12.75, produk dgn 1 dus = 20 renceng) → "12 dus 15 renceng"

SETELAH SELESAI: tampilkan isi tabel lots & consumptions setelah skenario FIFO di atas.
```

### 🎨 Frontend

```
KONTEKS: Hari 7 dari 34.

TUGAS (FRONTEND):
1. Halaman Authorization Requests:
   - antrian PENDING (default), tab untuk semua status
   - kolom: waktu, pemohon, jenis aksi, alasan, sisa waktu (countdown ke expires_at)
   - modal approve/reject dengan field alasan wajib saat reject
   - baris yang sudah kedaluwarsa tampil abu-abu dan tombolnya nonaktif
   - polling ringan (10 detik) supaya approver tidak perlu refresh manual
2. Komponen <StepUpDialog> yang reusable: dipanggil saat API mengembalikan 428.
   Isinya: penjelasan aksi, input alasan, tombol "Minta Persetujuan",
   lalu status menunggu + countdown, dan otomatis melanjutkan aksi saat disetujui.
   Komponen ini akan dipakai semua tombol VOID nanti — buat sekali, pakai selamanya.

DEFINITION OF DONE:
- Countdown berjalan dan baris otomatis nonaktif saat mencapai 0
- <StepUpDialog> berhasil menjalankan alur end-to-end dengan endpoint dummy
```

### ✅ Verifikasi Hari 7

- [ ] FIFO mengambil lot `lot_date` tertua — dibuktikan isi tabel consumptions
- [ ] Stok minus jalan + `stockWarning`, **tidak** ditolak
- [ ] `FOR UPDATE` ada di query lot (cek kode, bukan asumsi)
- [ ] Test konkurensi 2 pengeluaran paralel hijau
- [ ] Transfer memindahkan lot dengan `unit_cost` sama
- [ ] `formatQtyBreakdown` → "12 dus 15 renceng"
- [ ] `./scripts/verify.sh` hijau

---

## Hari 8 ⚠️ — Integration Test 4 Invarian + VOID Engine

> Hari dengan ROI tertinggi di seluruh proyek. Empat test ini adalah satu-satunya
> alasan refactor di minggu ke-3 masih aman. **Jangan dipotong, jangan ditunda.**

### 🔧 Backend

```
KONTEKS: Hari 8 dari 34. Engine (Journal Poster + Stock Recorder) sudah lengkap.

TUGAS (BACKEND):

A. INTEGRATION TEST 4 INVARIAN — pakai DB test sungguhan, bukan mock.
   Setup: seed COA + 1 produk (3 satuan) + 1 customer + 1 supplier + 2 gudang.

   TEST 1 — Jurnal balance
     Untuk SETIAP journal_entry yang ada di DB setelah rangkaian transaksi:
     SUM(debit_amount) = SUM(credit_amount). Tidak ada pengecualian.

   TEST 2 — FIFO urut
     Buat 3 lot dengan lot_date berbeda (sengaja diinput tidak berurutan).
     Lakukan pengeluaran bertahap. Assert: stock_cost_consumptions selalu
     merujuk lot dengan lot_date tertua yang masih bersisa saat itu.

   TEST 3 — VOID simetris
     Untuk dokumen yang di-VOID: jurnal pembalik punya jumlah baris sama,
     setiap baris debit asal jadi kredit dengan nominal identik dan sebaliknya,
     dan entry_date jurnal pembalik = HARI INI (bukan tanggal dokumen asli).

   TEST 4 — Stok rekonsiliasi
     Rangkaian: purchase → sale → return → void.
     Assert: SUM(stock_movements.qty_base_unit) per (product, warehouse)
     = product_stock_balance.qty_base_unit, selisih 0 (bukan toleransi).

   Keempatnya masuk `npm run test` default dan ke CI/pre-push hook.
   Waktu jalan harus < 60 detik supaya tidak ada godaan men-skip-nya.

B. VOID ENGINE GENERIK — src/core/void/void.service.ts
   voidDocument(sourceType, sourceId, reason, userId, manager):
   1. cek dokumen belum pernah di-VOID (idempoten: VOID kedua → error jelas)
   2. cek prasyarat spesifik per tipe (hook per modul, mis. invoice sudah dibayar?)
   3. balik jurnal: ambil semua lines jurnal asal, buat entry baru dengan
      debit↔credit ditukar, is_reversal=true, reversed_entry_id terisi,
      entry_date = HARI INI
   4. balik stok:
      - kalau dokumen menghasilkan lot (pembelian): kurangi qty_remaining lot itu.
        Kalau lot SUDAH TERKONSUMSI sebagian → tolak VOID dengan pesan
        "Barang dari faktur ini sudah terjual. Buat retur pembelian, bukan pembatalan."
      - kalau dokumen mengonsumsi lot (penjualan): kembalikan qty_remaining
        ke lot-lot asal sesuai stock_cost_consumptions (bukan lot baru)
   5. tandai dokumen status VOID + void_reason + voided_by + voided_at.
      TIDAK menghapus baris.

C. Wiring step-up end-to-end dengan satu dummy action (POST /dev/dummy-void)
   untuk membuktikan alur 428 → request → approve → retry → sukses.

ATURAN WAJIB:
- VOID tidak pernah menghapus data.
- Jurnal pembalik bertanggal hari ini. Ini sudah keputusan, jangan diperdebatkan ulang.

DEFINITION OF DONE:
- 4 test hijau dan otomatis jalan lewat `npm run test`
- VOID atas dokumen yang lotnya sudah terkonsumsi → ditolak dengan pesan jelas
- VOID dua kali → ditolak
- Alur step-up dummy: 428 → approve → retry → 200

SETELAH SELESAI:
Tampilkan output `npm run test` lengkap dan durasinya.
Lalu: MINTA SAYA MENJADWALKAN REVIEW KODE EKSTERNAL 2 JAM — engine sudah lengkap,
ini titik dengan ROI review tertinggi di seluruh proyek.
```

### 🎨 Frontend

```
KONTEKS: Hari 8 dari 34. Hari ringan di FE — sengaja, karena BE berat.

TUGAS (FRONTEND):
1. Dashboard placeholder yang jujur: kartu-kartu kosong dengan label
   "Penjualan Hari Ini", "Piutang Jatuh Tempo", "Stok Minus", "Persetujuan Menunggu",
   masing-masing menampilkan "—" dan tautan ke halaman terkait.
   Hanya kartu "Persetujuan Menunggu" yang diisi data sungguhan hari ini
   (endpoint authorization-requests sudah ada).
2. Rapikan utang teknis kecil dari Hari 1–7: konsistensi spacing, judul halaman,
   breadcrumb, empty state. Ini satu-satunya hari yang longgar sampai Hari 15.
3. Tambahkan komponen <PageHeader> (judul + deskripsi + slot aksi) dan
   pakai di semua halaman yang sudah ada.

DEFINITION OF DONE:
- Dashboard tidak menampilkan angka palsu/hardcode
- Semua halaman existing memakai <PageHeader>
```

### ✅ Verifikasi Hari 8

- [ ] 4 invarian hijau, jalan otomatis, < 60 detik
- [ ] VOID membalik persis, bertanggal hari ini
- [ ] VOID atas lot terkonsumsi ditolak dengan pesan yang dimengerti operator
- [ ] Alur step-up dummy tuntas
- [ ] Dashboard tanpa angka palsu
- [ ] **Jadwalkan review kode eksternal 2 jam** ← jangan dilewati
- [ ] `./scripts/verify.sh` hijau

---

## Hari 9 — Jurnal Manual + Saldo Awal

### 🔧 Backend

```
KONTEKS: Hari 9 dari 34. Journal Poster, Stock Recorder, VOID Engine sudah ada.

TUGAS (BACKEND):

A. JURNAL MANUAL (MASTER only)
   POST /manual-journals { entryDate, description, lines: [...] }
   - lewat JournalPosterService (jangan duplikasi validasi)
   - BLOKIR akun bertipe Persediaan, Piutang Usaha, Hutang Usaha → 403 dengan pesan:
     "Akun <nama> hanya boleh berubah lewat transaksi. Gunakan modul terkait."
     Blokir berdasarkan account_type/flag di COA, BUKAN berdasarkan kode akun
     yang di-hardcode — Master bisa membuat akun piutang custom nanti.
   - VOID manual journal juga tersedia (reversing biasa)

B. ALUR SALDO AWAL TERPADU (MASTER only) — ini yang paling rawan salah
   POST /opening-balance {
     asOfDate,
     stocks: [{ productId, warehouseId, qty, unitCost }],
     accounts: [{ accountId, debit, credit }]      // kas, bank, modal, dll
   }
   Dalam SATU transaction:
   1. untuk tiap stock: stockRecorder.recordIn(type='opening', lot_date=asOfDate,
      unit_cost=unitCost)
   2. hitung totalPersediaan = Σ(qty × unitCost)
   3. susun jurnal pembuka: Persediaan (D) totalPersediaan + baris accounts,
      selisihnya ke Modal Awal (K/D) supaya balance
   4. post lewat JournalPosterService
   ANGKA YANG SAMA menghasilkan lot DAN jurnal. Tidak boleh ada dua sumber angka.

   Validasi:
   - hanya boleh dijalankan sekali; kedua kalinya → error kecuali yang pertama di-VOID
   - qty > 0, unitCost >= 0
   - asOfDate boleh backdate bebas (KECUALIKAN dari aturan backdate 2 hari —
     saldo awal memang bertanggal sebelum go-live). Buat pengecualian ini eksplisit
     dan beri komentar di kode kenapa.

   GET /opening-balance/verification → { totalNilaiLot, saldoGLPersediaan, selisih }
   Ini dipakai saat go-live untuk membuktikan keduanya cocok.

DEFINITION OF DONE:
- jurnal manual ke akun Persediaan → 403 dengan pesan yang benar
- jurnal manual ke akun Biaya Operasional → sukses
- SUPERVISOR/OPERATOR akses jurnal manual → 403
- saldo awal 3 produk → total nilai lot PERSIS = saldo GL Persediaan (selisih 0,00)
- endpoint verification melaporkan selisih 0
- saldo awal kedua kali → ditolak

SETELAH SELESAI: tampilkan output endpoint verification setelah menginput
saldo awal 3 produk dengan harga pecahan (mis. 1.234,5678) — buktikan
pembulatan tidak menciptakan selisih.
```

### 🎨 Frontend

```
KONTEKS: Hari 9 dari 34.

TUGAS (FRONTEND):
1. Halaman Jurnal Manual (MASTER only):
   - repeater baris: akun (autocomplete), debit, kredit, keterangan
   - akun yang diblokir TIDAK MUNCUL di autocomplete sama sekali
     (lebih baik daripada muncul lalu ditolak server)
   - total debit & kredit live di footer, dengan indikator merah/hijau
     dan selisihnya ditampilkan; tombol simpan nonaktif selama tidak balance
   - Enter di baris terakhir menambah baris
2. Halaman Saldo Awal (MASTER only) — wizard 3 langkah:
   Langkah 1: input stok (repeater: produk, gudang, qty, harga pokok satuan)
              dengan total nilai persediaan live
   Langkah 2: input saldo akun kas/bank/lainnya
   Langkah 3: RINGKASAN — tampilkan jurnal pembuka yang AKAN dibuat,
              lengkap dengan baris penyeimbang ke Modal, dan peringatan
              "Saldo awal hanya bisa diinput sekali. Periksa kembali sebelum menyimpan."
3. Setelah tersimpan, tampilkan hasil verifikasi (total lot vs GL) di layar.

DEFINITION OF DONE:
- Tombol simpan jurnal manual nonaktif selama tidak balance
- Akun Persediaan/Piutang/Hutang tidak muncul di autocomplete
- Wizard saldo awal menampilkan preview jurnal sebelum disimpan
```

### ✅ Verifikasi Hari 9

- [ ] Jurnal manual ke Persediaan → 403
- [ ] Saldo awal: nilai lot = jurnal pembuka, selisih 0,00
- [ ] Endpoint verification melaporkan selisih 0
- [ ] Saldo awal tidak bisa diinput dua kali
- [ ] UI: tombol simpan terkunci saat tidak balance
- [ ] `./scripts/verify.sh` hijau

---

## Hari 10 — Warehouse Mutation Bercabang

### 🔧 Backend

```
KONTEKS: Hari 10 dari 34. Ini logika bercabang yang paling mudah salah dipahami.
Baca ulang CLAUDE.md §3 bagian warehouse_type sebelum menulis kode.

TUGAS (BACKEND):
1. Migration `warehouse_mutations`: id, mutation_number, product_id,
   from_warehouse_id, to_warehouse_id, qty_base_unit, mutation_date,
   customer_id (nullable, untuk titipan), notes, created_by, status, timestamps

2. POST /warehouse-mutations — BERCABANG berdasarkan tipe gudang TUJUAN:

   IF toWarehouse.warehouse_type == 'CUSTOMER_CONSIGNMENT':
       // Lapisan 2 murni. Stok perusahaan SUDAH berkurang saat Sales Invoice.
       validasi: SUM(qty mutasi ke gudang titip customer ini untuk produk ini)
                 + qty baru <= SUM(qty produk ini yang sudah DIBELI customer tsb
                                   lewat sales_invoices yang tidak VOID)
                 kalau lebih → 400 "Melebihi jumlah yang dibeli customer (dibeli: X, sudah dititip: Y)"
       INSERT warehouse_mutations
       // TIDAK menyentuh stock_movements / product_stock_balance / stock_cost_lots
       // TIDAK ada jurnal

   ELSE ('STORE' atau 'BAD_STOCK'):
       INSERT warehouse_mutations
       stockRecorder.transfer(...)   // 2 baris movement, lot ikut pindah, unit_cost sama
       // TIDAK ada jurnal — akun Persediaan tidak berubah

3. Get-or-create gudang titip:
   POST /warehouses/consignment/:customerId → kalau belum ada, buat otomatis
   dengan nama "Titipan — <nama customer>", type CUSTOMER_CONSIGNMENT.
   Dipanggil dari form mutasi supaya operator tidak perlu bikin gudang manual.

4. GET /warehouse-mutations (list + filter) dan GET /:id.
   VOID mutasi: untuk STORE/BAD_STOCK → transfer balik; untuk CONSIGNMENT →
   cukup tandai VOID (tidak ada stok yang perlu dikembalikan).

ATURAN WAJIB:
- Jangan menyatukan dua cabang itu dengan flag. Tulis dua jalur eksplisit
  dengan komentar kenapa berbeda. Orang berikutnya (termasuk saya bulan depan)
  akan membacanya.

DEFINITION OF DONE (test masing-masing cabang):
- mutasi ke BAD_STOCK: 2 baris stock_movements type 'transfer', lot di gudang
  tujuan punya unit_cost IDENTIK dengan lot asal, tidak ada journal_entry baru
- mutasi ke CUSTOMER_CONSIGNMENT: 0 baris stock_movements, 0 journal_entry,
  hanya 1 baris warehouse_mutations
- mutasi titip melebihi qty dibeli → 400 dengan angka pembanding di pesan
- get-or-create gudang titip: panggilan kedua mengembalikan gudang yang sama

SETELAH SELESAI: tampilkan jumlah baris di stock_movements, journal_entries,
dan warehouse_mutations sebelum & sesudah masing-masing cabang.
```

### 🎨 Frontend

```
KONTEKS: Hari 10 dari 34.

TUGAS (FRONTEND):
1. Halaman Mutasi Gudang (form + riwayat):
   - pilih produk (autocomplete), gudang asal, gudang tujuan, qty
   - qty diinput per SATUAN PILIHAN (dus/renceng/pcs), bukan base unit —
     konversi dilakukan di FE dan dikirim sebagai base unit,
     tapi tampilkan hasil konversinya di bawah field ("= 255 pcs") supaya operator yakin
   - saat gudang tujuan bertipe CUSTOMER_CONSIGNMENT: muncul pilihan customer
     + panel info "Sudah dibeli: X · Sudah dititip: Y · Sisa boleh dititip: Z"
   - saat gudang tujuan bertipe BAD_STOCK: muncul peringatan
     "Barang tetap dinilai penuh di pembukuan."
   - tampilkan stok tersedia di gudang asal secara live, dalam satuan pecahan
2. Riwayat mutasi memakai <DataTable> dengan filter tanggal, produk, gudang, tipe.

DEFINITION OF DONE:
- Panel info titipan menampilkan angka benar dan mencegah submit yang melebihi
- Konversi satuan tampil dan benar
- Riwayat menampilkan kedua jenis mutasi dengan penanda visual berbeda

CATATAN: hari ini juga lakukan UJI MANUAL CRUD END-TO-END seluruh master data
di browser (products, customers, suppliers, warehouses, settings). Catat temuan
sebagai daftar, jangan langsung diperbaiki — masukkan ke UAT minggu 2.
```

### ✅ Verifikasi Hari 10

- [ ] Mutasi ke CONSIGNMENT: **0** `stock_movements`, **0** jurnal
- [ ] Mutasi ke BAD_STOCK: 2 movement `transfer`, lot pindah dengan harga pokok sama
- [ ] Mutasi titip melebihi qty dibeli → ditolak
- [ ] Get-or-create gudang titip idempoten
- [ ] Uji manual CRUD end-to-end selesai, temuan tercatat
- [ ] `./scripts/verify.sh` hijau
- [ ] **UAT Minggu 2 dijadwalkan (~9 Agu) bersama Master DAN operator**

---
---

# FASE 3 — PEMBELIAN (Hari 11–15)

## Hari 11 — Purchase Invoice (alur penuh)

### 🔧 Backend

```
KONTEKS: Hari 11 dari 34. Modul transaksi pertama yang memakai engine lengkap.
Pola yang dibangun hari ini akan diulang di Sales Invoice — buat rapi.

TUGAS (BACKEND):
1. Migration:
   `purchase_invoices`: id, invoice_number (internal PI/YYMM/NNNN),
     supplier_invoice_number (bebas format, dari nota supplier),
     supplier_id, invoice_date, receipt_date, warehouse_id,
     subtotal, discount_amount NUMERIC(16,2) DEFAULT 0, tax_amount, total_amount,
     paid_amount DEFAULT 0, status ENUM(OPEN/PARTIAL/PAID/VOID),
     journal_entry_id, notes, created_by, timestamps
   `purchase_invoice_lines`: id, purchase_invoice_id, product_id, qty_input,
     unit_name, qty_base_unit, unit_price, line_discount, line_total, line_order
   `goods_receipts` + `goods_receipt_lines`: dibuat OTOMATIS dari invoice
     (klien tidak memisahkan penerimaan dari faktur), menyimpan receipt_date

2. POST /purchase-invoices — SATU TRANSACTION:
   a. validasi backdate (maks 2 hari) untuk invoice_date DAN receipt_date
   b. hitung per baris: line_total = qty × unit_price − line_discount
   c. subtotal = Σ line_total
   d. ALOKASI discount_amount header secara PROPORSIONAL ke tiap baris
      untuk keperluan harga pokok:
        alokasi_baris = discount_amount × (line_total / subtotal)
        cost_efektif_baris = (line_total − alokasi_baris) / qty_base_unit
      SISA PEMBULATAN dari pembagian dilempar ke baris TERAKHIR
      supaya Σ cost = subtotal − discount PERSIS.
   e. total_amount = subtotal − discount_amount + tax_amount
      TIDAK ADA PEMBULATAN DI PEMBELIAN. total harus persis sama dengan nota supplier.
   f. buat goods_receipt otomatis
   g. stockRecorder.recordIn per baris dengan lot_date = receipt_date
      dan unit_cost = cost_efektif_baris
   h. journalPoster.post:
        Persediaan   (D) subtotal − discount_amount
        PPN Masukan  (D) tax_amount (0 selama belum PKP)
        Hutang Usaha (K) total_amount
   i. nomor dari DocumentCounterService dengan manager yang sama

3. GET /purchase-invoices (list, filter supplier/tanggal/status) + GET /:id detail.

ATURAN WAJIB:
- lot_date = receipt_date, BUKAN invoice_date. Jurnal tetap pakai invoice_date.
  Ini sengaja berbeda; tulis komentar di kode agar tidak "dirapikan" orang lain.
- Total invoice harus persis sama dengan nota supplier. Kalau ada selisih 1 rupiah
  karena alokasi diskon, itu bug.

DEFINITION OF DONE:
- invoice 3 baris + discount_amount header → jurnal balance, Σ nilai lot
  = subtotal − discount PERSIS (bandingkan sebagai integer sen)
- lot_date sesuai receipt_date meski berbeda dari invoice_date
- total_amount tidak dibulatkan
- backdate 3 hari → 400
- rollback: paksa error setelah stok tercatat → tidak ada movement/lot/jurnal tersisa

SETELAH SELESAI: tampilkan skenario invoice dengan angka yang tidak habis dibagi
(mis. subtotal 1.000.003, diskon 7) dan buktikan Σ cost lot = 999.996 persis.
```

### 🎨 Frontend

```
KONTEKS: Hari 11 dari 34. Form multi-baris pertama. Pola input di sini
akan ditiru form Sales Invoice — investasikan waktu di ergonominya.

TUGAS (FRONTEND):
1. Form Purchase Invoice:
   Header: supplier (autocomplete), nomor faktur supplier (teks bebas),
           tanggal faktur, tanggal terima barang (default = tanggal faktur,
           tapi bisa berbeda — beri hint kecil "menentukan urutan FIFO"),
           gudang penerima
   Baris:  produk (autocomplete, cari by kode/nama), qty, satuan (select dari
           konversi produk), harga satuan, diskon baris, total baris (auto)
   Footer: subtotal live, diskon header, PPN (disabled selama belum PKP,
           dengan hint "aktif setelah toko berstatus PKP"), TOTAL besar

2. ERGONOMI WAJIB (ini bukan polish):
   - Enter di field terakhir sebuah baris → tambah baris baru + fokus ke produk
   - Ctrl+Enter → simpan
   - Esc di autocomplete menutup dropdown, Esc lagi konfirmasi keluar
   - hapus baris dengan Ctrl+Delete
   - autocomplete produk: hasil muncul < 300ms, navigasi panah, Enter memilih,
     tampilkan kode + nama + stok saat ini
   - semua angka rata kanan, format ribuan otomatis saat blur
   - saat produk dipilih, satuan default = satuan terbesar produk itu

3. Validasi client: minimal 1 baris, qty > 0, harga >= 0.
   Tampilkan pesan error server per-baris (mapping dari path error).

DEFINITION OF DONE:
- Input invoice 5 baris tanpa menyentuh mouse, dari supplier sampai simpan
- Total di layar PERSIS sama dengan total yang dikembalikan server
- Autocomplete produk merespons < 300ms dengan 100 produk di DB

SETELAH SELESAI: laporkan waktu input 5 baris lewat keyboard saja.
Kalau lebih dari 60 detik, sebutkan hambatan spesifiknya.
```

### ✅ Verifikasi Hari 11

- [ ] Invoice 3 baris → jurnal balance, lot benar
- [ ] `total_amount` persis = nota supplier, tanpa pembulatan
- [ ] Alokasi diskon proporsional, sisa pembulatan ke baris terakhir, Σ cost persis
- [ ] `lot_date` = `receipt_date`
- [ ] Rollback bersih saat error di tengah
- [ ] FE: input 5 baris tanpa mouse
- [ ] `./scripts/verify.sh` hijau

---

## Hari 12 — Edit Bersyarat + VOID Purchase Invoice

### 🔧 Backend

```
KONTEKS: Hari 12 dari 34.

TUGAS (BACKEND):
1. PATCH /purchase-invoices/:id — DIIZINKAN hanya jika KEDUA syarat terpenuhi:
   a. belum ada pembayaran teralokasi (paid_amount = 0 dan tidak ada payment allocation)
   b. TIDAK ADA lot dari invoice ini yang sudah terkonsumsi
      (cek stock_cost_consumptions terhadap lot dengan source_id = invoice ini)
   Kalau salah satu gagal → 409 dengan pesan spesifik yang menyebut
   ALASAN MANA yang menghalangi, dan menyarankan langkah berikutnya:
   - kalau sudah dibayar: "Faktur sudah dibayar. Batalkan pembayaran dulu."
   - kalau lot terkonsumsi: "Barang dari faktur ini sudah terjual/dipindah.
     Gunakan Retur Pembelian, bukan ubah faktur."
   Implementasi edit: VOID internal + buat ulang dalam satu transaction,
   TAPI pertahankan invoice_number yang sama (jangan boros nomor).
   Simpan riwayat perubahan di audit_logs.

2. POST /purchase-invoices/:id/void — lewat VoidEngine:
   - prasyarat sama seperti edit
   - OPERATOR wajib lewat step-up (@RequiresStepUp('VOID_PURCHASE_INVOICE'))
   - jurnal pembalik bertanggal hari ini
   - lot dihapus/di-nolkan qty_remaining-nya, movement pembalik dibuat

DEFINITION OF DONE:
- edit setelah lot terkonsumsi → 409 dengan pesan yang menyebut alasan yang benar
- edit setelah dibayar sebagian → 409 dengan pesan pembayaran
- edit yang sah → nomor invoice TIDAK berubah, stok & jurnal ikut terkoreksi,
  dan invarian rekonsiliasi stok masih 0
- VOID oleh OPERATOR → 428 dulu; setelah approve → sukses
- VOID → invoice status VOID, baris tetap ada, jurnal pembalik bertanggal hari ini

SETELAH SELESAI: jalankan test invarian (4 test Hari 8) dan buktikan masih hijau
setelah skenario edit & void.
```

### 🎨 Frontend

```
KONTEKS: Hari 12 dari 34.

TUGAS (FRONTEND):
1. Halaman detail Purchase Invoice:
   - header lengkap + tabel baris + ringkasan total
   - panel "Jurnal" yang bisa di-expand: menampilkan jurnal yang dihasilkan
     (transparansi ini membuat Master percaya pada sistem — jangan disembunyikan)
   - panel "Penerimaan Barang": lot yang terbentuk, sisa qty tiap lot
   - status badge: OPEN / PARTIAL / PAID / VOID
2. Tombol Ubah dan Batalkan:
   - keduanya DISABLE dengan tooltip alasan kalau server bilang tidak boleh
     (endpoint GET detail mengembalikan { canEdit, canVoid, reasons: [] })
     — lebih baik daripada dibiarkan aktif lalu ditolak
   - tombol Batalkan memakai <StepUpDialog> dari Hari 7 untuk role OPERATOR
   - konfirmasi VOID wajib mengisi alasan
3. Setelah VOID, halaman menampilkan banner merah + tautan ke jurnal pembalik.

DEFINITION OF DONE:
- Tombol Ubah nonaktif dengan tooltip yang benar saat lot sudah terkonsumsi
- Alur VOID oleh OPERATOR lengkap dari 428 sampai sukses tanpa reload manual
- Panel jurnal menampilkan debit = kredit
```

### ✅ Verifikasi Hari 12

- [ ] Edit setelah lot terkonsumsi → ditolak, pesan menyebut alasan tepat
- [ ] Edit sah → nomor invoice tetap, rekonsiliasi stok masih 0
- [ ] VOID lewat step-up untuk OPERATOR
- [ ] 4 invarian masih hijau setelah edit & void
- [ ] FE: tombol nonaktif + tooltip alasan
- [ ] `./scripts/verify.sh` hijau

---

## Hari 13 — Retur Pembelian

### 🔧 Backend

```
KONTEKS: Hari 13 dari 34.
INGAT: sistem perpetual — TIDAK ADA akun "Retur Pembelian". Jangan membuatnya.

TUGAS (BACKEND):
1. Migration `purchase_returns` + `purchase_return_lines`:
   header: id, return_number (RB/YYMM/NNNN), purchase_invoice_id, supplier_id,
           return_date, subtotal, tax_amount, total_amount,
           settlement_type ENUM('REDUCE_INVOICE','CASH'),
           cash_account_id (nullable, wajib kalau CASH),
           status, journal_entry_id, notes, timestamps
   lines:  id, purchase_return_id, purchase_invoice_line_id, product_id,
           qty_base_unit, unit_cost (dari lot asal), line_total

2. POST /purchase-returns — satu transaction:
   a. validasi qty retur <= qty dibeli − qty sudah diretur (per baris invoice)
   b. harga pokok memakai unit_cost LOT ASAL dari invoice tersebut,
      bukan harga pasar dan bukan FIFO umum
   c. stockRecorder: keluarkan barang dari lot ASAL (kurangi qty_remaining lot itu).
      Kalau lot asal sudah habis terkonsumsi → tolak dengan pesan
      "Barang sudah terjual. Retur tidak bisa diproses untuk qty ini."
   d. jurnal:
      settlement_type = REDUCE_INVOICE:
        Hutang Usaha (D) total_amount · Persediaan (K) subtotal · PPN Masukan (K) tax
        + kurangi outstanding invoice terkait
      settlement_type = CASH:
        Kas terpilih (D) total_amount · Persediaan (K) subtotal · PPN Masukan (K) tax
3. VOID retur pembelian lewat VoidEngine.
4. GET list + detail.

DEFINITION OF DONE:
- jurnal retur TIDAK menyentuh akun kontra apa pun (buktikan: hanya Hutang/Kas,
  Persediaan, PPN Masukan yang muncul)
- stok berkurang dari LOT ASAL, bukan lot termurah/tertua secara umum
- retur melebihi qty dibeli → 400
- REDUCE_INVOICE mengurangi outstanding invoice; CASH tidak
- setelah retur, rekonsiliasi stok tetap 0
```

### 🎨 Frontend

```
KONTEKS: Hari 13 dari 34.

TUGAS (FRONTEND):
1. Halaman Retur Pembelian:
   - alur: pilih Purchase Invoice → baris invoice tampil dengan
     "qty dibeli / sudah diretur / sisa bisa diretur"
   - operator mencentang baris dan mengisi qty retur (default = sisa)
   - pilih settlement_type: dua kartu pilihan besar dengan penjelasan awam:
     "Kurangi Hutang — tagihan ke supplier berkurang"
     "Uang Kembali — supplier mengembalikan uang tunai/transfer"
     kalau Uang Kembali dipilih → select akun kas muncul
   - total retur live
2. Cetak A4 retur pembelian: kop, nomor RB, supplier, tabel barang,
   total, tanda tangan. Print stylesheet terpisah (@media print),
   pastikan tidak ada elemen UI ikut tercetak.

DEFINITION OF DONE:
- Tidak mungkin mengisi qty retur melebihi sisa (dibatasi di input)
- Cetak A4 muat 1 halaman untuk 10 baris dan rapi di print preview
```

### ✅ Verifikasi Hari 13

- [ ] Jurnal: Hutang/Kas (D) / Persediaan (K), **tanpa akun kontra**
- [ ] Stok berkurang dari lot asal
- [ ] Retur melebihi qty dibeli → ditolak
- [ ] Cetak A4 rapi di print preview
- [ ] Rekonsiliasi stok masih 0
- [ ] `./scripts/verify.sh` hijau

---

## Hari 14 — Biaya Operasional

### 🔧 Backend

```
KONTEKS: Hari 14 dari 34. Hari paling ringan di fase ini — pakai sisa waktunya
untuk melunasi utang teknis, bukan menambah scope.

TUGAS (BACKEND):
1. Migration `operational_expenses`: id, expense_number, expense_date,
   expense_account_id (akun biaya), payment_account_id (akun kas/bank),
   amount, description, reference_number, status, journal_entry_id,
   created_by, timestamps
2. POST /operational-expenses:
   jurnal: Biaya (D) amount · Kas/Bank (K) amount
   validasi: expense_account_id harus bertipe biaya,
             payment_account_id harus is_cash_account = true
3. PATCH (selama belum ada apa-apa yang bergantung — biaya berdiri sendiri,
   jadi edit boleh dengan pola void-and-recreate).
4. VOID → jurnal pembalik, baris asli TETAP ADA (tidak hard-delete).
5. GET list dengan filter tanggal + akun biaya + akun bayar, dan agregat total.

CATATAN SCOPE: ongkos angkut pembelian masuk ke sini sebagai biaya biasa,
TIDAK masuk harga pokok. Ini keputusan sadar (plan §1.7).

DEFINITION OF DONE:
- jurnal biaya balance
- memilih akun non-kas sebagai pembayaran → 400
- VOID → baris tetap ada dengan status VOID + jurnal pembalik hari ini
- tidak ada endpoint DELETE
```

### 🎨 Frontend

```
KONTEKS: Hari 14 dari 34.

TUGAS (FRONTEND):
1. Halaman Biaya Operasional (list + form + detail):
   - form ringkas: tanggal, jenis biaya (select akun biaya), dibayar dari
     (select akun kas/bank), jumlah, keterangan, no. referensi
   - "Simpan & Tambah Lagi" penting di sini (biaya sering diinput beruntun)
2. List menampilkan total di footer sesuai filter aktif.
3. SISA WAKTU HARI INI: lunasi utang teknis FE dari Hari 11–13.
   Sebelum mulai, tampilkan dulu daftar utang teknis yang kamu temukan
   di kode FE (duplikasi, TODO, komponen yang tidak memakai <DataTable>/<CrudFormPage>),
   dan minta saya memilih mana yang dikerjakan. Jangan refactor besar tanpa persetujuan.

DEFINITION OF DONE:
- Input 5 biaya beruntun tanpa mouse
- Total footer berubah mengikuti filter
```

### ✅ Verifikasi Hari 14

- [ ] Jurnal biaya balance
- [ ] Akun pembayaran non-kas ditolak
- [ ] VOID → baris tetap ada
- [ ] Daftar utang teknis FE dibuat dan diprioritaskan
- [ ] `./scripts/verify.sh` hijau

---

## Hari 15 — BUFFER + CRUD COA Penuh

> Hari buffer pertama dari tiga. Kalau Fase 3 sudah tuntas, kerjakan CRUD COA
> lalu **berhenti**. Jangan mencuri start ke Fase 4 — buffer yang dipakai untuk
> menambah kecepatan bukan lagi buffer.

### 🔧 Backend

```
KONTEKS: Hari 15 dari 34. Hari BUFFER.

LANGKAH 0 — Sebelum menulis kode, laporkan dulu:
- Apakah semua DoD Hari 11–14 sudah [x] di PROGRESS.md?
- Kalau ADA yang belum: kerjakan itu dulu, dan lewati tugas di bawah.
  Lapor ke saya apa yang dikerjakan dan apa yang jadi terlewat.
- Kalau SEMUA sudah beres: lanjut ke tugas di bawah.

TUGAS (BACKEND) — hanya jika Fase 3 tuntas:
1. CRUD Chart of Accounts penuh untuk MASTER:
   - create akun baru dengan parent, kode, nama, tipe
   - flag is_cash_account (menentukan akun muncul di pilihan pembayaran)
   - akun piutang custom (untuk customer tertentu, dipakai customers.ar_account_id)
   - nonaktifkan akun (bukan hapus) — DITOLAK kalau akun sudah punya
     journal_entry_lines, dengan pesan "Akun sudah dipakai di jurnal, tidak bisa dinonaktifkan"
   - validasi kode akun unik dan tidak boleh diubah setelah dipakai di jurnal
2. Pastikan blokir jurnal manual (Hari 9) bekerja BERDASARKAN account_type,
   sehingga akun piutang custom yang baru dibuat OTOMATIS ikut terblokir.
   Buat testnya — ini jebakan yang mudah terlewat.

DEFINITION OF DONE:
- MASTER membuat akun "Kas Besar" dengan is_cash_account = true
- akun itu LANGSUNG muncul di pilihan akun pembayaran biaya operasional
  tanpa restart aplikasi
- akun piutang custom baru otomatis terblokir dari jurnal manual
- menonaktifkan akun yang sudah dipakai → ditolak
- SUPERVISOR POST /chart-of-accounts → 403
```

### 🎨 Frontend

```
KONTEKS: Hari 15 dari 34. Hari BUFFER.

LANGKAH 0 — sama seperti backend: laporkan status DoD Hari 11–14 dulu.
Kalau ada yang merah, itu prioritasnya.

TUGAS (FRONTEND) — hanya jika Fase 3 tuntas:
1. Form tambah/ubah akun COA di halaman COA (MASTER only):
   - modal dari dalam tree (klik "+" di sebuah node → parent terisi otomatis)
   - switch "Akun Kas/Bank" dengan hint: "Akan muncul di pilihan pembayaran"
   - setelah simpan, tree ter-refresh dan node baru ter-highlight
2. Kalau masih ada waktu: kerjakan utang teknis FE yang diprioritaskan Hari 14.

DEFINITION OF DONE:
- Buat akun kas baru dari UI → langsung terpilih di form biaya operasional
  (buka tab lain, cek tanpa reload aplikasi)
```

### ✅ Verifikasi Hari 15

- [ ] Status Fase 3 dilaporkan sebelum menambah pekerjaan baru
- [ ] Master bisa membuat akun kas → langsung muncul di form pembayaran
- [ ] Akun piutang custom otomatis terblokir dari jurnal manual
- [ ] SUPERVISOR write COA → 403
- [ ] **Hitung drift kumulatif di PROGRESS.md §0** — ini titik ukur pertengahan
- [ ] Kalau drift ≥ 2 hari: buffer ini sudah terpakai, catat di §3
- [ ] `./scripts/verify.sh` hijau

---
---

# FASE 4 — PENJUALAN (Hari 16–20)

> Hari 17–18 adalah dua dari empat hari tersulit di proyek ini, dan jatuh
> di minggu yang melelahkan. Kalau harus mengorbankan sesuatu, korbankan
> estetika — jangan alur input.

## Hari 16 — Sales Order

### 🔧 Backend

```
KONTEKS: Hari 16 dari 34. Sales Order adalah sumber pesanan kanal agen.
CATATAN: modul ini nomor 5 di daftar potong darurat (§9.3). Kalau drift ≥ 3 hari,
konfirmasi dulu ke saya apakah tetap dikerjakan.

TUGAS (BACKEND):
1. Migration `sales_orders` + `sales_order_lines`:
   header: id, order_number (SO/YYMM/NNNN), customer_id, order_date,
           delivery_date (nullable), agent_id (nullable, diisi Hari 21),
           subtotal, status ENUM(DRAFT/CONFIRMED/CONVERTED/CANCELLED),
           sales_invoice_id (nullable), notes, created_by, timestamps
   lines:  id, sales_order_id, product_id, qty_input, unit_name,
           qty_base_unit, unit_price, line_total, line_order
2. CRUD + POST /sales-orders/:id/confirm dan POST /:id/cancel.
3. POST /sales-orders/:id/convert-to-invoice:
   - hanya dari status CONFIRMED
   - membuat sales_invoice DRAFT dengan baris tersalin (harga ikut, bisa diubah nanti)
   - set status SO = CONVERTED, isi sales_invoice_id
   - SO berstatus CONVERTED tidak bisa diubah/dibatalkan lagi → 409
   CATATAN: endpoint ini baru berfungsi penuh setelah Hari 18. Hari ini cukup
   buat kerangkanya + test yang di-skip dengan alasan tertulis.
4. Sales Order TIDAK menyentuh stok dan TIDAK menghasilkan jurnal. Sama sekali.

DEFINITION OF DONE:
- SO CONVERTED → PATCH → 409
- SO DRAFT bisa diubah bebas
- membuat SO tidak menghasilkan stock_movements maupun journal_entries
  (buktikan dengan hitungan baris sebelum & sesudah)
```

### 🎨 Frontend

```
KONTEKS: Hari 16 dari 34.

TUGAS (FRONTEND):
1. Halaman Sales Order (list + form + detail).
   Form-nya mirip Purchase Invoice tapi tanpa gudang dan tanpa pajak.
   PAKAI ULANG komponen baris/repeater dari form Purchase Invoice —
   kalau perlu, ekstrak jadi <TransactionLineTable> yang dipakai keduanya.
   Ini investasi untuk Hari 17–18 yang jauh lebih berat.
2. Detail SO: tombol "Jadikan Faktur" (aktif hanya saat CONFIRMED),
   badge status, tautan ke invoice hasil konversi.
3. Filter list: status, customer, rentang tanggal.

DEFINITION OF DONE:
- <TransactionLineTable> diekstrak dan dipakai di Purchase Invoice DAN Sales Order
- Tidak ada duplikasi logika baris antara dua form itu
- SO CONVERTED tampil read-only

SETELAH SELESAI: tampilkan diff baris kode form Purchase Invoice setelah refactor —
harusnya BERKURANG, bukan bertambah.
```

### ✅ Verifikasi Hari 16

- [ ] SO CONVERTED tidak bisa diubah
- [ ] SO tidak menghasilkan stok/jurnal
- [ ] `<TransactionLineTable>` dipakai 2 form, tanpa duplikasi
- [ ] `./scripts/verify.sh` hijau

---

## Hari 17 ⚠️ — Price Suggestion + Mulai Form Sales Invoice

### 🔧 Backend

```
KONTEKS: Hari 17 dari 34. Hari berisiko tinggi.
price-suggestion adalah SATU-SATUNYA jaring pengaman terhadap salah ketik harga jual,
karena tidak ada harga standar per produk. Ini WAJIB, bukan opsional.

TUGAS (BACKEND):
1. GET /sales/price-suggestion?customerId=&productId=
   Mengembalikan:
   {
     lastPrices: [{ price, qty, unitName, invoiceNumber, date }],   // 3-5 terakhir
                                                                    // customer INI, produk INI
     generalPrices: [{ price, date }],                              // 3 terakhir lintas customer
     lastCost: number,                                              // harga pokok lot terkini
     suggestion: number | null                                      // lastPrices[0].price ?? null
   }
   PERSYARATAN KINERJA: < 300ms dengan data 1 tahun.
   Buat index: (customer_id, product_id, invoice_date DESC) di sales_invoice_lines
   join sales_invoices. Kalau perlu, buat index tersendiri atau materialized view —
   ukur dulu dengan EXPLAIN ANALYZE, jangan menebak.

2. Migration `sales_invoices` + `sales_invoice_lines` (endpoint POST-nya Hari 18):
   header: id, invoice_number (INV/YYMM/NNNN), customer_id, invoice_date,
           due_date (NULLABLE, tanpa UI — disiapkan untuk kebutuhan nanti),
           warehouse_id, sales_order_id (nullable), channel ENUM('STORE','AGENT'),
           subtotal, tax_amount, rounding_amount NUMERIC(16,2) DEFAULT 0,
           total_amount, paid_amount DEFAULT 0,
           status ENUM(OPEN/PARTIAL/PAID/VOID), journal_entry_id,
           notes, created_by, timestamps
   lines:  id, sales_invoice_id, product_id, qty_input, unit_name, qty_base_unit,
           unit_price, line_total, unit_cost_fifo NUMERIC(16,4), line_cost, line_order
   CATATAN unit_cost_fifo: diisi saat posting Hari 18, dan WAJIB dipakai lagi
   saat retur penjualan Hari 20. Jangan dihitung ulang di sana.

3. Endpoint pendukung form: POST /customers/quick
   (buat customer minimal: nama + telepon, sisanya nullable) — dipakai modal
   tambah customer dari form penjualan. Role OPERATOR boleh.

DEFINITION OF DONE:
- price-suggestion mengembalikan 3-5 harga terakhir customer+produk,
  terurut terbaru dulu
- p95 < 300ms diukur dengan 50.000 baris sales_invoice_lines (seed data uji)
- EXPLAIN ANALYZE menunjukkan index scan, bukan seq scan
- POST /customers/quick membuat customer yang langsung bisa dipakai

SETELAH SELESAI: tampilkan hasil EXPLAIN ANALYZE dan angka p95-nya.
```

### 🎨 Frontend

```
KONTEKS: Hari 17 dari 34. Form terpenting di seluruh aplikasi —
operator memakainya 50-100 kali sehari, satu transaksi tiap 5-6 menit
sepanjang jam kerja. Setiap klik yang bisa dihilangkan bernilai.

Endpoint tersedia: GET /sales/price-suggestion, POST /customers/quick.
POST /sales-invoices BELUM ada (Hari 18) — buat form-nya dulu, submit-nya menyusul.

TUGAS (FRONTEND):
1. Form Sales Invoice (belum bisa submit):
   Header: customer (autocomplete), tanggal, gudang, kanal (Toko/Agen)
   Baris:  produk (autocomplete), qty, satuan, HARGA (fokus utama), total baris

2. PRICE SUGGESTION — inti hari ini:
   Saat customer + produk terpilih, tampilkan di bawah/samping field harga:
   - 3-5 harga terakhir untuk customer INI: harga · qty · tanggal · no. nota
   - klik/panah-atas untuk memilih salah satu → mengisi field harga
   - harga terakhir terisi OTOMATIS sebagai default, tapi tetap bisa ditimpa
   - kalau harga yang diketik menyimpang > 20% dari harga terakhir,
     tampilkan peringatan kuning inline (bukan modal, jangan menghentikan alur):
     "Harga biasanya Rp X. Yakin?"
   - kalau customer BARU (belum pernah beli produk ini), tampilkan
     harga umum lintas customer dengan label yang jelas

3. MODAL TAMBAH CUSTOMER dari dalam form:
   - di autocomplete customer, kalau tidak ketemu → opsi "+ Tambah customer baru"
   - modal minimal: nama + telepon (sisanya bisa dilengkapi nanti)
   - setelah simpan, customer LANGSUNG terpilih di form, fokus kembali ke
     tempat semula. TIDAK BOLEH pindah halaman dan kehilangan baris yang sudah diisi.

4. Ergonomi (sama seperti Hari 11 + tambahan):
   - urutan Tab: produk → qty → satuan → harga → (Enter) baris baru
   - autosave draft ke memori setiap perubahan, supaya refresh tak sengaja
     tidak menghapus 10 baris yang sudah diketik

DEFINITION OF DONE:
- pilih customer + produk → 3-5 harga terakhir muncul dalam < 300ms
- harga terakhir terisi otomatis
- peringatan menyimpang > 20% muncul inline tanpa memblokir
- tambah customer lewat modal → langsung terpilih, baris yang sudah diisi UTUH
- refresh browser di tengah pengisian → draft kembali

SETELAH SELESAI: rekam alur "customer baru + 3 baris produk" dari layar kosong
sampai siap simpan, dan laporkan jumlah keystroke serta ada tidaknya klik mouse.
```

### ✅ Verifikasi Hari 17

- [ ] Price suggestion muncul < 300ms (diukur, bukan dikira)
- [ ] `EXPLAIN ANALYZE` → index scan
- [ ] Peringatan harga menyimpang muncul inline
- [ ] Modal tambah customer tidak menghilangkan baris yang sudah diisi
- [ ] Draft bertahan setelah refresh
- [ ] `./scripts/verify.sh` hijau

---

## Hari 18 ⚠️ — POST /sales-invoices (alur penuh)

### 🔧 Backend

```
KONTEKS: Hari 18 dari 34. Hari tersulit di fase penjualan.
Semua engine bertemu di sini: stok + FIFO + jurnal + pembulatan + PPN dormant.

TUGAS (BACKEND):
POST /sales-invoices — SATU TRANSACTION, urutannya penting:

1. validasi backdate (maks 2 hari)
2. per baris: qty_base_unit dari qty_input × konversi satuan
3. subtotal = Σ (qty × unit_price)
4. PPN — DORMANT:
   ppn = (settings.company_is_pkp === true && customer.is_pkp === true)
         ? subtotal × tarif_aktif_dari_tax_rates(invoice_date)
         : 0
   Selama company_is_pkp = false, ppn SELALU 0. Jangan ada jalan lain.
   Tarif diambil dari tax_rates berdasarkan effective_from/effective_to
   pada invoice_date — supaya invoice historis tidak berubah saat tarif berubah.
5. total_kasar = subtotal + ppn
   total_amount = CEIL(total_kasar / settings.rounding_multiple) × rounding_multiple
   rounding_amount = total_amount − total_kasar
   Hitung dengan integer sen. CEIL, bukan ROUND — selalu ke atas.
6. stockRecorder.recordOut per baris:
   - simpan hasilnya ke lines.unit_cost_fifo dan lines.line_cost
     ← INI WAJIB, dipakai retur penjualan Hari 20
   - kumpulkan stockWarning dari semua baris
   - stok tidak cukup → TETAP JALAN, warning dikumpulkan, jangan menolak
7. totalCOGS = Σ line_cost
8. journalPoster.post:
     Piutang Usaha atau Kas   (D) total_amount
     Pendapatan Penjualan     (K) subtotal
     PPN Keluaran             (K) ppn                    -- baris ini hanya bila ppn > 0
     Pendapatan Pembulatan    (K) rounding_amount        -- hanya bila > 0
     HPP                      (D) totalCOGS
     Persediaan               (K) totalCOGS
   Akun piutang: pakai customer.ar_account_id kalau ada, kalau tidak pakai
   Piutang Usaha default.
9. kalau berasal dari SO: set SO status CONVERTED
10. response menyertakan { invoice, stockWarnings: [...] }

ATURAN WAJIB:
- Pembulatan HANYA di sini. Purchase Invoice tidak pernah dibulatkan.
- Baris jurnal bernilai 0 TIDAK BOLEH dibuat (akan ditolak constraint).
  Susun lines secara kondisional.

DEFINITION OF DONE:
- total_amount selalu kelipatan 100 (uji 20 kombinasi harga acak)
- rounding_amount masuk jurnal dan jurnal tetap balance
- company_is_pkp = false → tidak ada baris PPN sama sekali di jurnal
- aktifkan company_is_pkp = true + customer.is_pkp = true → baris PPN muncul,
  tarif sesuai tax_rates pada tanggal invoice; MATIKAN LAGI setelah tes
- penjualan melebihi stok → 201 dengan stockWarning, balance negatif, cost fallback dipakai
- unit_cost_fifo tersimpan di setiap baris
- 4 invarian Hari 8 masih hijau

SETELAH SELESAI: tampilkan jurnal lengkap dari satu invoice yang mengandung
pembulatan, dan buktikan Σ debit = Σ kredit sampai sen terakhir.
```

### 🎨 Frontend

```
KONTEKS: Hari 18 dari 34. Endpoint POST /sales-invoices sudah ada.

TUGAS (FRONTEND):
1. Sambungkan form Hari 17 ke endpoint. Tangani response:
   - sukses → tampilkan nomor invoice besar + tombol "Cetak" dan "Buat Baru"
   - stockWarnings → tampilkan sebagai daftar peringatan kuning di layar sukses,
     JANGAN sebagai error. Transaksi berhasil; ini informasi.
2. Preview total LIVE di footer form, dengan rincian yang bisa di-expand:
     Subtotal          Rp 1.234.567
     PPN                        Rp 0   (abu-abu + hint "toko belum PKP")
     Pembulatan            Rp 33      (muncul hanya kalau > 0)
     ─────────────────────────────
     TOTAL             Rp 1.234.600
   Angka pembulatan di FE harus PERSIS sama dengan hasil server.
   Pakai rumus yang sama dan ambil rounding_multiple dari /settings —
   jangan hardcode 100 di frontend.
3. Tombol simpan menampilkan total di dalamnya ("Simpan — Rp 1.234.600")
   supaya operator melihat angka final sebelum menekan.
4. Setelah sukses, form baru langsung siap dengan fokus di field customer.

DEFINITION OF DONE:
- Total di FE = total dari server pada 20 kombinasi uji, tanpa satu pun selisih
- stockWarning tampil sebagai peringatan, bukan error
- Setelah simpan, siklus berikutnya siap dalam 1 tombol
```

### ✅ Verifikasi Hari 18

- [ ] Total selalu kelipatan Rp100 (20 kombinasi diuji)
- [ ] `rounding_amount` masuk jurnal, jurnal balance
- [ ] PPN nol selama `company_is_pkp = false`; config dimatikan lagi setelah tes
- [ ] `unit_cost_fifo` tersimpan per baris
- [ ] Stok minus → tetap sukses + warning
- [ ] Total FE = total BE, tanpa selisih
- [ ] 4 invarian masih hijau
- [ ] `./scripts/verify.sh` hijau

---

## Hari 19 — Edit/VOID Sales Invoice + Cetak Nota A4

### 🔧 Backend

```
KONTEKS: Hari 19 dari 34.

TUGAS (BACKEND):
1. PATCH /sales-invoices/:id — syarat sama seperti pembelian:
   belum ada pembayaran teralokasi. Untuk penjualan, tambahan: belum ada
   surat jalan (delivery order) yang berstatus DELIVERED.
   Pola: void internal + recreate, nomor invoice dipertahankan.
   Saat void internal, kembalikan qty_remaining ke lot ASAL sesuai
   stock_cost_consumptions — jangan membuat lot baru.
2. POST /sales-invoices/:id/void:
   - OPERATOR wajib step-up
   - jurnal pembalik bertanggal hari ini
   - stok kembali ke LOT ASAL (lewat stock_cost_consumptions), bukan lot baru
     dengan harga baru. Ini yang menjaga invarian FIFO tetap benar.
   - kalau invoice sudah punya pembayaran → tolak, minta batalkan pembayaran dulu
3. GET /sales-invoices/:id/print-data → payload siap cetak
   (data toko dari settings, customer, baris dengan satuan tampilan, terbilang).
   Sertakan helper "terbilang" (angka → kata bahasa Indonesia) di backend
   supaya konsisten antara layar dan cetakan.

DEFINITION OF DONE:
- VOID mengembalikan qty_remaining ke lot asal (buktikan dengan isi tabel lots
  sebelum & sesudah — lot_id yang sama, bukan lot baru)
- invoice dengan pembayaran → VOID ditolak
- terbilang(1234600) → "satu juta dua ratus tiga puluh empat ribu enam ratus rupiah"
- rekonsiliasi stok = 0 setelah VOID
```

### 🎨 Frontend

```
KONTEKS: Hari 19 dari 34.

⚠️ PRASYARAT: format nota A4 dari klien. Kalau BELUM diterima,
JANGAN menunggu — pakai layout standar (kop toko, no. nota, tanggal, customer,
tabel barang, subtotal/pembulatan/total, terbilang, kolom tanda tangan
"Hormat kami" & "Penerima"), lalu catat di PROGRESS.md §3 bahwa revisi format
masuk pasca-MVP. Beri tahu saya kalau ini yang terjadi.

TUGAS (FRONTEND):
1. Halaman detail Sales Invoice: header, baris, ringkasan (subtotal, PPN,
   pembulatan, total), panel jurnal yang bisa di-expand, panel HPP & lot terpakai,
   status pembayaran, tombol Ubah/Batalkan/Cetak/Buat Surat Jalan.
   Tombol Ubah & Batalkan mengikuti { canEdit, canVoid, reasons } dari server.
2. CETAK NOTA A4 — 2 RANGKAP IDENTIK:
   - satu halaman A4 berisi DUA salinan identik (atas & bawah), bukan dua halaman
   - pisahkan dengan garis potong putus-putus
   - print stylesheet terpisah: sembunyikan sidebar/topbar/tombol,
     margin cetak sesuai, font ukuran cetak (bukan ukuran layar)
   - qty ditampilkan dalam satuan pecahan ("12 dus 15 renceng")
   - terbilang di bawah total
   - uji di print preview Chrome, bukan hanya di layar
3. Tombol cetak langsung memicu dialog print (window.print) tanpa halaman perantara.

DEFINITION OF DONE:
- Print preview: 1 halaman A4, 2 salinan identik, tidak ada elemen UI ikut tercetak
- Nota dengan 8 baris masih muat 2 rangkap dalam 1 halaman
  (kalau lebih dari 8 baris, salinan kedua boleh pindah halaman — konfirmasi ke saya)
- Terbilang benar
```

### ✅ Verifikasi Hari 19

- [ ] VOID mengembalikan stok ke **lot asal**
- [ ] VOID atas invoice yang sudah dibayar → ditolak
- [ ] Nota A4 2 rangkap identik, rapi di print preview
- [ ] Terbilang benar
- [ ] Status format nota dari klien tercatat di PROGRESS.md §1
- [ ] `./scripts/verify.sh` hijau

---

## Hari 20 — Retur Penjualan

### 🔧 Backend

```
KONTEKS: Hari 20 dari 34. Jurnal 4 sisi + kasus retur atas invoice yang SUDAH LUNAS
(ini dominan di kanal toko, karena pembeli toko bayar seketika).

TUGAS (BACKEND):
1. Migration `sales_returns` + `sales_return_lines`:
   header: id, return_number (RJ/YYMM/NNNN), sales_invoice_id, customer_id,
           return_date, subtotal, tax_amount, total_amount,
           settlement_type ENUM('REDUCE_INVOICE','CASH'),
           cash_account_id (nullable, wajib bila CASH),
           warehouse_id, status, journal_entry_id, notes, timestamps
   lines:  id, sales_return_id, sales_invoice_line_id, product_id,
           qty_base_unit, unit_price, unit_cost_fifo, line_total, line_cost

2. POST /sales-returns — satu transaction:
   a. validasi qty retur <= qty terjual − qty sudah diretur, per baris invoice
   b. HARGA POKOK WAJIB dari sales_invoice_lines.unit_cost_fifo.
      DILARANG menghitung FIFO baru atau memakai harga pasar.
      Kalau unit_cost_fifo kosong (data lama), tolak dengan pesan jelas.
   c. barang MASUK ke Gudang Toko (bukan bad stock — bad stock diinput
      terpisah lewat mutasi gudang). Buat lot baru dengan unit_cost = unit_cost_fifo.
   d. JURNAL 4 SISI:
        Retur Penjualan  (D) subtotal (DPP)
        PPN Keluaran     (D) tax_amount        -- hanya bila > 0
        Piutang atau Kas (K) total_amount
        --- dan ---
        Persediaan       (D) Σ line_cost
        HPP              (K) Σ line_cost
      settlement_type = REDUCE_INVOICE → kredit ke Piutang, kurangi outstanding
      settlement_type = CASH           → kredit ke akun Kas terpilih
   e. KASUS PENTING — retur atas invoice LUNAS dengan settlement CASH:
      paid_amount invoice TIDAK BOLEH melebihi total_amount setelah retur.
      Sesuaikan paid_amount/status invoice dengan benar dan buat testnya.
3. VOID retur penjualan lewat VoidEngine.

DEFINITION OF DONE:
- jurnal 4 sisi balance
- unit_cost_fifo memakai nilai ASLI dari invoice (buktikan: ubah harga beli
  produk itu setelah penjualan, lalu retur — harga pokok retur tetap yang lama)
- retur atas invoice LUNAS + CASH → jurnal kas benar, paid_amount <= total_amount,
  status invoice konsisten
- retur melebihi qty terjual → 400
- barang masuk ke Gudang Toko, bukan bad stock
- rekonsiliasi stok = 0
```

### 🎨 Frontend

```
KONTEKS: Hari 20 dari 34.

TUGAS (FRONTEND):
1. Halaman Retur Penjualan:
   - pilih Sales Invoice (autocomplete by nomor/customer) → baris tampil dengan
     "terjual / sudah diretur / sisa bisa diretur"
   - centang baris + isi qty, harga jual otomatis dari invoice (read-only)
   - pilihan penyelesaian sebagai dua kartu besar berbahasa awam:
     "Kurangi Tagihan — piutang customer berkurang"
     "Uang Dikembalikan — kita mengembalikan uang ke customer"
     kalau invoice sudah LUNAS, kartu "Kurangi Tagihan" otomatis nonaktif
     dengan penjelasan "Nota ini sudah lunas" ← detail kecil yang mencegah salah pilih
   - panel info: status pembayaran invoice, sisa tagihan
2. Cetak retur penjualan A4 (pola sama dengan retur pembelian).

DEFINITION OF DONE:
- Kartu "Kurangi Tagihan" nonaktif otomatis untuk invoice lunas
- Qty retur tidak bisa melebihi sisa
- Cetak rapi di print preview
```

### ✅ Verifikasi Hari 20

- [ ] Jurnal 4 sisi balance
- [ ] `unit_cost_fifo` asli dipakai (dibuktikan dengan skenario harga berubah)
- [ ] Retur atas invoice lunas + CASH → `paid_amount` ≤ `total_amount`
- [ ] Barang masuk Gudang Toko
- [ ] Rekonsiliasi stok = 0
- [ ] 4 invarian hijau
- [ ] `./scripts/verify.sh` hijau
- [ ] **UAT Minggu 3 (~16 Agu): pembelian, retur, penjualan — bersama operator**

---
---

# FASE 5 — PENGIRIMAN & PEMBAYARAN (Hari 21–25)

> Hari 23–24 adalah dua hari tersulit sisanya. Pelunasan pecah multi-metode
> dengan alokasi yang bisa diedit adalah fitur yang paling mudah salah dan
> paling mahal kalau salah — uang.

## Hari 21 — Agen, Kendaraan, Surat Jalan (skema)

### 🔧 Backend

```
KONTEKS: Hari 21 dari 34.
⚠️ PRASYARAT: format nomor surat jalan dari klien. Kalau belum ada,
pakai SJ/YYMM/NNNN dan catat di PROGRESS.md §1. Jangan menunggu.

TUGAS (BACKEND):
1. Migration `agents`: id, name, phone, is_active, timestamps
   Migration `vehicles`: id, name, plate_number, is_active, timestamps
   CRUD keduanya (sederhana, pakai pola master data Hari 4).
2. Migration `delivery_orders` + `delivery_order_lines`:
   header: id, delivery_number (SJ/YYMM/NNNN), sales_invoice_id, customer_id,
           delivery_date, agent_id, vehicle_id,
           status ENUM('PENDING','DELIVERED','POSTPONED','RETURNED'),
           status_note, delivered_at, notes, created_by, timestamps
   lines:  id, delivery_order_id, sales_invoice_line_id, product_id,
           qty_base_unit, unit_name, qty_input, line_order
3. Surat jalan TIDAK menyentuh stok dan TIDAK menghasilkan jurnal.
   Stok sudah berkurang saat Sales Invoice. Surat jalan hanya dokumen pengantar.
   Tulis komentar ini di kode — ini pertanyaan yang akan muncul lagi nanti.
4. POST /delivery-orders dari sales_invoice_id:
   - baris tersalin dari invoice (boleh sebagian: pengiriman bertahap)
   - validasi: qty kumulatif surat jalan per baris invoice <= qty invoice
   - satu invoice boleh punya beberapa surat jalan
   - satu surat jalan = satu customer (tidak digabung)

DEFINITION OF DONE:
- surat jalan terbentuk dari invoice, membawa agent_id & vehicle_id
- membuat surat jalan tidak menghasilkan stock_movements maupun journal_entries
- qty surat jalan melebihi qty invoice → 400
- pengiriman bertahap: 2 surat jalan atas 1 invoice, totalnya tepat
```

### 🎨 Frontend

```
KONTEKS: Hari 21 dari 34.

TUGAS (FRONTEND):
1. Halaman Agen (list + form): nama, telepon, aktif.
2. Halaman Kendaraan (list + form): nama, plat nomor, aktif.
   Keduanya memakai <DataTable> + <CrudFormPage> — harusnya masing-masing
   di bawah 40 baris. Kalau lebih, komponen enginenya kurang.
3. Tambahkan keduanya ke menu Master Data.
4. Sisa waktu: siapkan kerangka halaman Surat Jalan untuk besok
   (list + tombol "Buat dari Faktur").

DEFINITION OF DONE:
- Halaman agen & kendaraan masing-masing < 40 baris kode
- Menu Master Data lengkap
```

### ✅ Verifikasi Hari 21

- [ ] Surat jalan tidak menyentuh stok/jurnal
- [ ] Pengiriman bertahap tervalidasi benar
- [ ] Halaman agen/kendaraan ringkas (bukti abstraksi FE masih sehat)
- [ ] `./scripts/verify.sh` hijau

---

## Hari 22 — Endpoint Surat Jalan + Cetak

### 🔧 Backend

```
KONTEKS: Hari 22 dari 34.

TUGAS (BACKEND):
1. PATCH /delivery-orders/:id/status { status, note }:
   PENDING → DELIVERED (isi delivered_at)
   PENDING → POSTPONED (barang tidak jadi terkirim, note wajib)
   PENDING → RETURNED  (barang dibawa pulang, note wajib)
   POSTPONED → PENDING/DELIVERED (bisa dicoba lagi hari berikutnya)
   Transisi lain ditolak dengan pesan jelas.
   CATATAN: kendaraan BUKAN gudang terlacak (keputusan §1.6) — status ini saja
   yang menandai barang belum sampai. Jangan membuat stok di kendaraan.
2. GET /delivery-orders dengan filter: status, tanggal, agen, kendaraan, customer.
   Tambah endpoint GET /delivery-orders/undelivered → daftar POSTPONED + PENDING
   yang tanggalnya sudah lewat. Ini yang dilihat operator tiap pagi.
3. GET /delivery-orders/:id/print-data.

DEFINITION OF DONE:
- transisi status valid berhasil, transisi tidak valid ditolak
- endpoint undelivered menampilkan daftar yang benar
- perubahan status tercatat di audit_logs
```

### 🎨 Frontend

```
KONTEKS: Hari 22 dari 34.
⚠️ PRASYARAT: format surat jalan dari klien. Kalau belum ada, pakai layout standar
dan catat di PROGRESS.md §3.

TUGAS (FRONTEND):
1. Halaman Surat Jalan:
   - list dengan tab: Belum Terkirim / Terkirim / Ditunda / Kembali
   - tab "Belum Terkirim" adalah default (ini yang dipakai tiap pagi)
   - aksi cepat dari baris list: tandai Terkirim / Ditunda / Kembali
     lewat modal kecil dengan field catatan
   - kolom: no. SJ, tanggal, customer, agen, kendaraan, no. faktur, status
2. Buat Surat Jalan dari faktur: pilih faktur → baris tampil dengan
   "qty faktur / sudah dikirim / sisa" → centang + qty → pilih agen & kendaraan.
3. CETAK A4 surat jalan:
   - kop, no. SJ, tanggal, customer + alamat, tabel barang (satuan pecahan),
     nama agen & kendaraan/plat, kolom tanda tangan penerima
   - TIDAK menampilkan harga (surat jalan dibawa ke lapangan)
     ← konfirmasi ke klien kalau mereka justru menginginkan harga
   - print stylesheet terpisah, uji di print preview

DEFINITION OF DONE:
- Tab "Belum Terkirim" menampilkan POSTPONED + PENDING lewat
- Tandai status dari list tanpa membuka halaman detail
- Cetak A4 rapi, tanpa harga
```

### ✅ Verifikasi Hari 22

- [ ] Status POSTPONED terlihat di daftar "belum terkirim"
- [ ] Transisi status tidak valid ditolak
- [ ] Cetak A4 surat jalan rapi
- [ ] Pertanyaan "harga muncul di surat jalan?" dikonfirmasi ke klien
- [ ] `./scripts/verify.sh` hijau

---

## Hari 23 ⚠️ — Payment: Skema + Preview Alokasi

### 🔧 Backend

```
KONTEKS: Hari 23 dari 34. Hari berisiko tinggi. Ini menyangkut uang —
kesalahan di sini paling mahal dan paling sulit ditemukan belakangan.

TUGAS (BACKEND):
1. Migration:
   `payment_batches`: id, batch_number (PAY/YYMM/NNNN), payment_date,
     direction ENUM('IN','OUT'),          -- IN = terima dari customer, OUT = bayar supplier
     party_type ENUM('CUSTOMER','SUPPLIER'), party_id,
     total_amount, agent_id (nullable), vehicle_id (nullable),
     status ENUM('POSTED','VOID'), journal_entry_id, notes, created_by, timestamps
     CATATAN: TIDAK ADA payment_account_id di sini — pindah ke payment_batch_methods.
   `payment_batch_methods`: id, payment_batch_id, cash_account_id, amount,
     reference_number (nullable, no. transfer), line_order
   `payments`: id, payment_batch_id, invoice_type ENUM('SALES','PURCHASE'),
     invoice_id, allocated_amount, line_order

2. POST /payments/preview-allocation
   Body: { partyType, partyId, totalAmount, invoiceIds? }
   Logika:
   - ambil invoice OUTSTANDING pihak tsb (total_amount − paid_amount > 0),
     urut FIFO berdasarkan invoice_date lalu invoice_number
   - kalau invoiceIds diberikan, batasi ke itu saja (tetap urut FIFO)
   - alokasikan totalAmount berurutan sampai habis
   - OVERPAYMENT DITOLAK: kalau totalAmount > Σ outstanding → 400
     "Jumlah pembayaran melebihi total tagihan (tagihan: Rp X)"
   - response: {
       allocations: [{ invoiceId, invoiceNumber, invoiceDate, totalAmount,
                       paidAmount, outstanding, allocated, remainingAfter }],
       unallocated: number,        // 0 kalau pas
       totalOutstanding: number
     }
   Endpoint ini PURE — tidak menulis apa pun ke DB.

3. Validasi multi-metode (dipakai Hari 24, siapkan sekarang):
   Σ payment_batch_methods.amount HARUS = payment_batches.total_amount.
   Buat validator terpisah + testnya hari ini.

ATURAN WAJIB:
- Hitung dalam integer sen. Alokasi pembayaran yang meleset 1 rupiah akan
  menghasilkan invoice yang "hampir lunas" selamanya.
- preview tidak boleh punya efek samping apa pun.

DEFINITION OF DONE:
- 3 invoice outstanding (10jt, 30jt, 60jt), bayar 80jt →
  alokasi 10jt + 30jt + 40jt, invoice ketiga sisa 20jt
- bayar 150jt (outstanding 100jt) → 400 overpayment
- invoiceIds dibatasi 2 invoice → hanya keduanya yang dialokasi
- validator multi-metode: 30jt + 50jt vs total 100jt → error;
  30jt + 70jt vs total 100jt → lolos
- preview dipanggil 2× → tidak ada perubahan di DB
```

### 🎨 Frontend

```
KONTEKS: Hari 23 dari 34. Halaman pembayaran = 2 langkah.
Hari ini langkah 1, besok langkah 2.

TUGAS (FRONTEND) — Payment Langkah 1:
1. Pilih arah: "Terima Pembayaran (dari Customer)" / "Bayar Supplier".
2. Pilih pihak (autocomplete). Setelah terpilih, tampilkan panel ringkas:
   total outstanding, jumlah invoice belum lunas, invoice tertua.
3. INPUT MULTI-METODE — inti hari ini:
   - repeater: akun kas/bank (select dari akun is_cash_account) + jumlah
     + no. referensi (opsional, untuk transfer)
   - contoh nyata: baris 1 = Kas Besar 30.000.000, baris 2 = BCA 50.000.000
   - total dari semua metode tampil besar dan live
   - Enter menambah baris metode
   - peringatan inline kalau total melebihi outstanding (sebelum submit)
4. Opsional (kanal agen): pilih agen + kendaraan.
   Beri hint "untuk rekap setoran per mobil".
5. Tombol "Lihat Alokasi" memanggil preview-allocation dan pindah ke langkah 2
   (halamannya dibuat besok — hari ini cukup tampilkan hasil preview mentah
   dalam tabel sederhana untuk verifikasi).

DEFINITION OF DONE:
- Input 30jt kas + 50jt transfer atas tagihan 100jt → preview menunjukkan
  alokasi benar dan sisa 20jt tetap outstanding
- Total metode > outstanding → peringatan muncul sebelum submit
- Enter menambah baris metode
```

### ✅ Verifikasi Hari 23

- [ ] Preview alokasi FIFO benar (skenario 10/30/60 vs 80jt)
- [ ] Overpayment ditolak
- [ ] Validator multi-metode hijau
- [ ] Preview tanpa efek samping
- [ ] FE: 30jt kas + 50jt transfer → preview benar, sisa 20jt
- [ ] `./scripts/verify.sh` hijau

---

## Hari 24 ⚠️ — Payment Confirm + Alokasi Manual

### 🔧 Backend

```
KONTEKS: Hari 24 dari 34. Hari berisiko tinggi terakhir sebelum fase laporan.

TUGAS (BACKEND):
1. POST /payments/confirm — SATU TRANSACTION:
   Body: {
     partyType, partyId, paymentDate, direction,
     methods: [{ cashAccountId, amount, referenceNumber? }],
     allocations: [{ invoiceId, allocatedAmount }],   // BOLEH HASIL EDIT MANUAL
     agentId?, vehicleId?, notes?
   }
   Langkah:
   a. validasi Σ methods.amount = Σ allocations.allocatedAmount = total_amount
   b. validasi tiap alokasi <= outstanding invoice tsb SAAT INI
      (re-cek, jangan percaya angka dari preview yang bisa basi)
   c. validasi semua invoice milik pihak yang sama dan belum VOID
   d. validasi cashAccountId semuanya is_cash_account = true
   e. buat batch + methods + payments
   f. update paid_amount tiap invoice, set status PAID/PARTIAL
   g. jurnal:
      direction IN (dari customer):
        Kas/Bank A   (D) amount_A
        Kas/Bank B   (D) amount_B          -- satu baris per metode
        Piutang Usaha (K) total_amount
      direction OUT (ke supplier):
        Hutang Usaha (D) total_amount
        Kas/Bank A   (K) amount_A
        Kas/Bank B   (K) amount_B
      AR dan AP harus SIMETRIS — pakai satu fungsi dengan parameter arah,
      jangan dua fungsi terpisah yang bisa menyimpang.

2. POST /payment-batches/:id/void:
   - jurnal pembalik bertanggal hari ini
   - kembalikan paid_amount tiap invoice + perbaiki status
   - OPERATOR wajib step-up
   - kalau invoice sudah di-VOID setelah pembayaran → tetap boleh void payment,
     tapi beri peringatan di response

3. GET /payment-batches (list + filter) dan GET /:id (detail + methods + allocations).

DEFINITION OF DONE:
- alokasi HASIL EDIT MANUAL tersimpan PERSIS seperti yang dikirim
  (uji: preview menyarankan invoice lama, operator mengalihkan ke invoice hari ini,
   yang tersimpan adalah pilihan operator)
- Σ methods = Σ allocations, ketidaksesuaian → 400
- jurnal multi-metode: satu baris kas per metode, semua balance
- AR dan AP simetris (bandingkan struktur jurnal keduanya di test)
- VOID batch mengembalikan paid_amount dan status invoice dengan benar
- alokasi melebihi outstanding saat ini → 400 meski preview bilang boleh

SETELAH SELESAI: tampilkan jurnal dari pembayaran 30jt kas + 50jt BCA
atas 2 invoice, dan buktikan balance.
```

### 🎨 Frontend

```
KONTEKS: Hari 24 dari 34.

TUGAS (FRONTEND) — Payment Langkah 2 + riwayat:
1. Layar alokasi:
   - tabel invoice outstanding: no. nota, tanggal, total, sudah dibayar,
     sisa, KOLOM ALOKASI (dapat diedit)
   - alokasi otomatis FIFO terisi sebagai awalan
   - operator BISA MENGUBAH angka alokasi per baris —
     ini kebutuhan nyata: customer sering membayar nota hari ini
     lebih dulu daripada tunggakan lama
   - tombol "Isi Otomatis (FIFO)" untuk mengembalikan ke saran
   - indikator live: "Dialokasikan Rp X dari Rp Y · Sisa Rp Z"
     tombol Konfirmasi terkunci selama sisa ≠ 0
   - ringkasan metode pembayaran ditampilkan di samping (read-only,
     dengan tombol kembali ke langkah 1)
2. Setelah konfirmasi: layar sukses dengan no. batch, ringkasan alokasi,
   dan tombol cetak tanda terima sederhana.
3. Halaman Riwayat Pembayaran (list batch):
   filter tanggal/pihak/arah/agen, detail menampilkan metode + alokasi,
   tombol Batalkan (dengan step-up untuk OPERATOR).

DEFINITION OF DONE:
- Ubah alokasi manual → tersimpan sesuai editan (verifikasi di detail batch)
- Tombol konfirmasi terkunci selama sisa ≠ 0
- "Isi Otomatis" mengembalikan saran FIFO
- Riwayat batch menampilkan metode ganda dengan benar
```

### ✅ Verifikasi Hari 24

- [ ] Alokasi manual tersimpan sesuai editan
- [ ] Σ metode = Σ alokasi = total, ketidaksesuaian ditolak
- [ ] Jurnal multi-metode balance, AR & AP simetris
- [ ] VOID batch mengembalikan `paid_amount` & status
- [ ] FE: tombol konfirmasi terkunci saat sisa ≠ 0
- [ ] `./scripts/verify.sh` hijau

---

## Hari 25 — Rekap Setoran Agen

### 🔧 Backend

```
KONTEKS: Hari 25 dari 34.
CATATAN: modul ini nomor 3 di daftar potong darurat. Cek drift dulu.

TUGAS (BACKEND):
1. GET /reports/agent-deposits?dateFrom=&dateTo=&vehicleId=&agentId=
   Dikelompokkan per KENDARAAN + TANGGAL (sesuai keputusan §1.6):
   {
     groups: [{
       date, vehicleId, vehicleName, plateNumber, agentNames: [],
       totalDeposit,                        // Σ payment_batches dgn vehicle_id ini
       methodBreakdown: [{ accountName, amount }],
       invoiceCount,
       totalInvoiceAmount,                  // Σ nota yang dikirim kendaraan ini hari itu
                                            // (lewat delivery_orders)
       difference,                          // totalInvoiceAmount − totalDeposit
       batches: [{ batchNumber, customerName, amount }]
     }],
     grandTotal
   }
   Kolom `difference` adalah alasan laporan ini ada: mencocokkan
   uang yang dibawa pulang dengan nota yang dibawa berangkat.
2. Uang setoran agen masuk Kas Besar (default) — tapi tetap pakai
   akun yang dipilih di payment_batch_methods, jangan dipaksa.
3. Dukung ?format=xlsx|pdf lewat interceptor export Hari 5.

DEFINITION OF DONE:
- total uang per mobil per tanggal dapat dicocokkan dengan total nota hari itu
- difference dihitung benar termasuk saat ada pembayaran sebagian
- export xlsx berisi grup yang sama dengan layar
```

### 🎨 Frontend

```
KONTEKS: Hari 25 dari 34.

TUGAS (FRONTEND):
1. Halaman Rekap Setoran Agen:
   - filter rentang tanggal (default: hari ini), kendaraan, agen
   - tampilan berkelompok per kendaraan per tanggal (accordion),
     header grup menampilkan: kendaraan · plat · total nota · total setoran · SELISIH
   - selisih 0 → hijau, selisih ≠ 0 → merah dengan nominal
   - expand → daftar batch pembayaran + rincian metode
   - <ExportButton> xlsx/pdf
2. Halaman ini dipakai tiap sore saat agen pulang — buat ringkas dan cepat dibaca,
   angka besar, tidak perlu banyak klik.

DEFINITION OF DONE:
- Selisih tampil menonjol dan benar
- Filter default = hari ini
- Export berfungsi
```

### ✅ Verifikasi Hari 25

- [ ] Total uang per mobil cocok dengan total nota hari itu
- [ ] Selisih dihitung & ditampilkan menonjol
- [ ] Export xlsx/pdf berfungsi
- [ ] `./scripts/verify.sh` hijau
- [ ] **UAT Minggu 4 (~23 Agu): pengiriman, pembayaran, rekap agen**

---
---

# FASE 6 — LAPORAN & SERAH TERIMA (Hari 26–34)

## Template Prompt Laporan (dipakai Hari 26–29)

Lima hari laporan mengikuti pola yang sama. Pakai template ini dan ganti
bagian `LAPORAN HARI INI`, supaya tidak menulis ulang aturan yang sama tiap hari.

```
KONTEKS: Hari <N> dari 34, fase laporan.

ATURAN LAPORAN (berlaku untuk SEMUA laporan di proyek ini):
- Baca dari tabel transaksi, JANGAN membuat tabel ringkasan baru.
- Semua qty ditampilkan dalam SATUAN PECAHAN ("12 dus 15 renceng")
  memakai formatQtyBreakdown dari Hari 7 — bukan desimal.
- Semua endpoint laporan mendukung ?format=xlsx|pdf lewat interceptor export Hari 5.
- Semua laporan mendukung filter rentang tanggal, dan mengembalikan
  { rows, summary, meta: { generatedAt, filters } }.
- Dokumen berstatus VOID DIKECUALIKAN dari semua laporan,
  kecuali laporan yang memang khusus menampilkannya.
- Query yang menyentuh > 10.000 baris wajib punya index pendukung.
  Jalankan EXPLAIN ANALYZE dan lampirkan hasilnya.
- Angka di laporan harus bisa ditelusuri: setiap baris ringkasan bisa
  di-drill-down ke dokumen sumbernya (minimal: kolom nomor dokumen).

LAPORAN HARI INI:
<daftar laporan>

DEFINITION OF DONE:
- setiap laporan diuji dengan data hasil UAT (bukan data buatan)
- total di laporan COCOK dengan total di modul transaksi terkait
  (mis. total penjualan bulan ini = Σ sales_invoices non-VOID bulan ini)
- export xlsx & pdf terbuka rapi dan berisi data yang sama dengan layar
- EXPLAIN ANALYZE dilampirkan untuk query terberat

SETELAH SELESAI: untuk setiap laporan, tunjukkan satu angka di laporan
dan buktikan asalnya dengan query langsung ke tabel transaksi.
```

---

## Hari 26 — Laporan Stok & Barang Titipan

### 🔧 Backend
Pakai template di atas dengan:
```
LAPORAN HARI INI:
1. GET /reports/stock — stok per gudang
   kolom: produk, gudang, qty (satuan pecahan), nilai persediaan (Σ lot × unit_cost),
          harga pokok rata-rata
   filter: gudang, produk, kategori, "sembunyikan stok nol"
   summary: total nilai persediaan per gudang
   ← total nilai ini WAJIB cocok dengan saldo GL Persediaan. Tampilkan
     keduanya berdampingan beserta selisihnya. Ini kontrol kunci.
2. GET /reports/consigned-goods — barang titipan
   SUMBER: warehouse_mutations (bukan stock_movements — barang titipan
   tidak ada di stock_movements, ini konsekuensi keputusan §1.5)
   kolom: customer, produk, qty dititip, qty dibeli, sisa, tanggal mutasi terakhir
   filter: customer, produk
3. GET /reports/stock-card?productId=&warehouseId= — kartu stok
   baris kronologis: tanggal, dokumen, masuk, keluar, saldo, harga pokok
```

### 🎨 Frontend
```
TUGAS (FRONTEND) Hari 26:
1. Halaman Laporan Stok: <DataTable> + <ExportButton>, dengan panel atas
   menampilkan "Nilai Persediaan: Rp X · Saldo GL: Rp Y · Selisih: Rp Z"
   (hijau kalau 0, merah kalau tidak).
2. Halaman Barang Titipan.
3. Kartu Stok: dibuka dari klik baris di Laporan Stok, tampil sebagai
   halaman/drawer dengan riwayat kronologis dan saldo berjalan.
4. Buat komponen <ReportPage> (header + filter bar + tabel + export)
   dan pakai untuk SEMUA laporan Hari 26–29. Jangan menulis layout laporan
   berulang kali — sisa 4 hari laporan akan jauh lebih cepat.

DEFINITION OF DONE:
- Qty tampil sebagai "12 dus 15 renceng", bukan 12,75
- Panel selisih GL tampil dan akurat
- <ReportPage> dipakai ketiga laporan hari ini
```

### ✅ Verifikasi Hari 26
- [ ] Qty tampil dalam satuan pecahan
- [ ] Nilai persediaan = saldo GL Persediaan (selisih 0)
- [ ] Laporan titipan bersumber dari `warehouse_mutations`
- [ ] `<ReportPage>` dibuat & dipakai
- [ ] `./scripts/verify.sh` hijau

---

## Hari 27 — Laporan Penjualan, Piutang, Hutang

### 🔧 Backend
Pakai template laporan dengan:
```
LAPORAN HARI INI:
1. GET /reports/sales — rekap penjualan
   mode: per tanggal / per customer / per produk / per agen (parameter groupBy)
   kolom: qty, subtotal, HPP, laba kotor, margin %
   summary: total penjualan, total HPP, total laba kotor
2. GET /reports/receivables — piutang customer
   kolom: customer, no. nota, tanggal, total, dibayar, sisa, umur (hari)
   pengelompokan umur: 0-30 / 31-60 / 61-90 / >90 hari
   summary per bucket umur
   ← walau tidak ada termin, umur piutang tetap berguna untuk penagihan
3. GET /reports/payables — hutang supplier
   struktur sama dengan piutang
   ← untuk OPERATOR, nama supplier tetap TER-MASK di laporan ini.
     Jangan sampai laporan jadi jalan bocor masking.
```

### 🎨 Frontend
```
TUGAS (FRONTEND) Hari 27:
1. Tiga halaman laporan memakai <ReportPage>.
2. Laporan Penjualan: selector groupBy sebagai tab (Tanggal/Customer/Produk/Agen).
3. Laporan Piutang & Hutang: kolom umur diberi warna bertingkat
   (hijau → kuning → oranye → merah), baris bisa diklik ke detail nota.
4. Tambahkan ketiganya ke menu Laporan.

DEFINITION OF DONE:
- Total penjualan bulan berjalan = Σ sales_invoices non-VOID bulan itu
- Total piutang = Σ (total_amount − paid_amount) invoice OPEN/PARTIAL
- Nama supplier ter-mask untuk OPERATOR di laporan hutang
```

### ✅ Verifikasi Hari 27
- [ ] Total tiap laporan cocok dengan tabel transaksi
- [ ] Umur piutang dihitung benar
- [ ] Masking supplier tetap berlaku di laporan
- [ ] `./scripts/verify.sh` hijau

---

## Hari 28 — Laporan Biaya, Rekap Kas Harian, Cash Opname

### 🔧 Backend
Pakai template laporan dengan:
```
LAPORAN HARI INI:
1. GET /reports/expenses — biaya operasional per jenis & periode
   kolom: tanggal, jenis biaya, dibayar dari, jumlah, keterangan
   summary: total per akun biaya + grand total
2. GET /reports/daily-cash?date= — REKAP KAS HARIAN PER AKUN
   ← laporan yang paling sering dibuka setiap sore. Buat cepat dan jelas.
   Untuk SETIAP akun kas/bank:
     saldo_awal (saldo akhir hari sebelumnya)
     + penerimaan (dari payment_batch_methods direction IN)
     − pengeluaran (payment OUT + operational_expenses + retur CASH)
     = saldo_akhir
   Sertakan rincian transaksi per akun supaya bisa dicocokkan satu per satu.
3. GET /reports/cash-opname?date= — LAPORAN SAJA (keputusan §1.2)
   kolom: akun kas, saldo sistem, kolom "saldo fisik" (KOSONG, diisi tangan
   di kertas), kolom selisih (kosong)
   Koreksi dilakukan lewat Jurnal Manual, BUKAN dari layar ini.
   Beri catatan tercetak di laporan: "Selisih dikoreksi lewat Jurnal Manual."
```

### 🎨 Frontend
```
TUGAS (FRONTEND) Hari 28:
1. Halaman Kas dengan 3 tab: Rekap Harian · Biaya Operasional · Cash Opname.
2. Rekap Kas Harian: kartu besar per akun kas
   (saldo awal → masuk → keluar → saldo akhir), klik kartu → rincian transaksi.
   Default tanggal = hari ini, dengan tombol panah ke hari sebelumnya/berikutnya.
3. Cash Opname: layout siap cetak dengan kolom kosong untuk diisi tangan.

DEFINITION OF DONE:
- Saldo akhir kas = saldo awal + masuk − keluar, dan cocok dengan saldo GL akun tsb
- Navigasi hari sebelumnya/berikutnya berfungsi
- Cash opname tercetak dengan kolom kosong yang cukup lebar untuk tulisan tangan
```

### ✅ Verifikasi Hari 28
- [ ] Saldo akhir kas cocok dengan saldo GL akun kas
- [ ] Rekap harian dapat ditelusuri ke transaksi
- [ ] Cash opname hanya laporan (tidak ada tombol koreksi)
- [ ] `./scripts/verify.sh` hijau

---

## Hari 29 — Laporan Retur, Stok Minus, Rekonsiliasi

### 🔧 Backend
Pakai template laporan dengan:
```
LAPORAN HARI INI:
1. GET /reports/returns — retur penjualan & pembelian
   filter: jenis (jual/beli), tanggal, customer/supplier, produk
   summary: total nilai retur per jenis, produk yang paling sering diretur
2. GET /reports/negative-stock — PRODUK DENGAN HISTORI STOK MINUS
   ← ini mekanisme deteksi yang menggantikan penolakan stok minus (§1.5).
     Bukan laporan pelengkap; ini pengganti kontrol yang sengaja tidak dipasang.
   Dua bagian:
   a. produk yang SAAT INI balance-nya negatif
   b. produk yang PERNAH negatif dalam periode (dari histori stock_movements
      dengan saldo berjalan) meski sekarang sudah positif
   kolom: produk, gudang, saldo terkini, saldo terminus, tanggal kejadian,
          dokumen yang menyebabkan
3. GET /reports/stock-reconciliation — endpoint rekonsiliasi
   membandingkan SUM(stock_movements) vs product_stock_balance per (produk, gudang)
   melaporkan semua selisih ≠ 0.
   Sediakan juga POST /reports/stock-reconciliation/fix (MASTER only)
   yang memperbaiki cache product_stock_balance dari stock_movements —
   dengan konfirmasi eksplisit dan tercatat di audit_logs.

DEFINITION OF DONE:
- laporan stok minus menemukan produk yang pernah minus meski sekarang positif
- endpoint rekonsiliasi melaporkan 0 selisih pada data sehat
- rusak data cache secara sengaja → rekonsiliasi mendeteksinya → fix memperbaikinya
```

### 🎨 Frontend
```
TUGAS (FRONTEND) Hari 29:
1. Halaman Laporan Retur.
2. Halaman Stok Minus — beri penekanan visual, ini laporan pengawasan.
   Bagian "sedang minus" di atas dengan latar merah muda;
   bagian "pernah minus" di bawah.
3. Halaman Rekonsiliasi Stok (MASTER only): tampilkan selisih, tombol
   "Perbaiki Cache" dengan dialog konfirmasi yang menjelaskan apa yang akan terjadi.
4. Tambahkan kartu "Stok Minus" di dashboard yang menampilkan jumlah produk
   sedang minus dan menautkan ke laporan ini.

DEFINITION OF DONE:
- Dashboard menampilkan hitungan stok minus yang benar
- Tombol perbaiki cache memerlukan konfirmasi eksplisit
```

### ✅ Verifikasi Hari 29
- [ ] Laporan stok minus mendeteksi kejadian historis
- [ ] Rekonsiliasi mendeteksi & memperbaiki cache rusak
- [ ] Dashboard menampilkan stok minus
- [ ] `./scripts/verify.sh` hijau

---

## Hari 30 — Export Excel & PDF Seluruh Laporan

### 🔧 Backend

```
KONTEKS: Hari 30 dari 34.
CATATAN: export PDF adalah nomor 1 di daftar potong darurat. Cek drift dulu —
kalau ≥ 3 hari, kerjakan Excel saja dan lapor ke saya.

TUGAS (BACKEND):
1. Pastikan SEMUA endpoint laporan (Hari 25–29) mendukung ?format=xlsx|pdf
   lewat interceptor export dari Hari 5. Kalau ada yang belum, sambungkan.
2. Perbaiki kualitas keluaran:
   Excel: header tebal + freeze pane baris judul, lebar kolom otomatis,
          format angka Indonesia (#.##0), format tanggal dd/mm/yyyy,
          baris summary dengan garis atas, nama sheet informatif
   PDF:   orientasi otomatis (landscape kalau > 6 kolom), header berulang
          tiap halaman, nomor halaman "Hal. 1 dari 3", footer dengan
          nama pencetak & waktu cetak, kop toko dari settings
3. Nama file: <jenis-laporan>-<periode>-<timestamp>.<ext>
4. Batasi ukuran: kalau baris > 50.000, tolak PDF dengan saran memakai Excel.
5. Uji setiap laporan dalam kedua format. Buat daftar centang di jawabanmu.

DEFINITION OF DONE:
- Semua laporan (minimal 10) terekspor xlsx & pdf tanpa error
- Excel terbuka di LibreOffice/Excel tanpa peringatan format
- PDF: kolom tidak terpotong, header berulang di tiap halaman
- Angka di file = angka di layar (uji 3 laporan secara acak)
```

### 🎨 Frontend

```
TUGAS (FRONTEND) Hari 30:
1. Pasang <ExportButton> di SEMUA halaman laporan (dropdown Excel/PDF).
2. Tombol export membawa filter yang sedang aktif — jangan mengekspor
   seluruh data saat layar sedang terfilter. Ini kesalahan yang sering terjadi
   dan baru ketahuan saat klien memakainya.
3. Indikator loading saat menyiapkan file + penanganan error yang jelas.
4. Nama file unduhan mencerminkan filter aktif.

DEFINITION OF DONE:
- Filter aktif ikut ke file hasil export (uji dengan filter tanggal sempit)
- Semua halaman laporan punya tombol export
```

### ✅ Verifikasi Hari 30
- [ ] Semua laporan bisa diekspor xlsx & pdf
- [ ] Filter aktif ikut terbawa ke file
- [ ] Angka di file = angka di layar
- [ ] `./scripts/verify.sh` hijau

---

## Hari 31 — BUFFER (perbaikan temuan UAT)

```
KONTEKS: Hari 31 dari 34. Hari BUFFER. Tidak ada fitur baru hari ini.

LANGKAH 1 — Inventarisasi:
Baca PROGRESS.md §5 (UAT Mingguan) dan §3 (Catatan Harian).
Susun daftar semua temuan yang BELUM diperbaiki, kelompokkan:
  A. BUG yang menghalangi pemakaian (blocker operasional)
  B. BUG yang mengganggu tapi ada jalan memutar
  C. Permintaan fitur baru  ← ini BUKAN untuk hari ini, masuk backlog
  D. Utang teknis internal (tidak terlihat klien)
Tampilkan daftarnya beserta estimasi waktu masing-masing. TUNGGU persetujuan saya
sebelum mulai memperbaiki.

LANGKAH 2 — setelah saya setujui:
Kerjakan A dulu sampai habis, lalu B sebanyak yang muat.
Jangan menyentuh C. Utang teknis D hanya kalau A dan B sudah habis.

ATURAN:
- Setiap perbaikan wajib disertai test regresi kalau menyentuh engine.
- Setelah setiap perbaikan, jalankan 4 invarian Hari 8.
- Kalau sebuah perbaikan ternyata membutuhkan > 2 jam, berhenti dan lapor —
  mungkin itu bukan bug melainkan perubahan scope yang menyamar.

DEFINITION OF DONE:
- Semua temuan kategori A tuntas
- 4 invarian hijau
- PROGRESS.md §5 kolom "Sudah diperbaiki" terisi
```

### ✅ Verifikasi Hari 31
- [ ] Daftar temuan dibuat & dikategorikan sebelum mulai
- [ ] Semua bug blocker (A) tuntas
- [ ] Tidak ada fitur baru yang menyelinap masuk
- [ ] 4 invarian hijau
- [ ] **Hitung drift kumulatif** — 3 hari tersisa, ini titik keputusan terakhir
- [ ] Kalau drift ≥ 3 hari: jalankan daftar potong darurat SEKARANG, jangan menunggu

---

## Hari 32 — Audit Permission Matrix

### 🔧 Backend

```
KONTEKS: Hari 32 dari 34. Audit keamanan menyeluruh.
Sumber kebenaran: plan v2 §7 dan CLAUDE.md §5.

TUGAS (BACKEND):
1. Tulis SATU file test e2e: test/permission-matrix.e2e-spec.ts
   yang menguji SETIAP baris matrix di plan §7, untuk KETIGA role.
   Strukturnya: untuk setiap (role, endpoint, method) → status yang diharapkan.
   Test ini harus gagal kalau ada guard yang lepas.

   Wajib termasuk:
   - SUPERVISOR: POST/PATCH sales-orders, sales-invoices, purchase-invoices → 403
   - SUPERVISOR: GET chart-of-accounts → 200, POST/PATCH/DELETE → 403
   - SUPERVISOR: jurnal manual → 403; approve authorization → 200
   - OPERATOR: GET/POST/PATCH chart-of-accounts → 403
   - OPERATOR: jurnal manual, saldo awal, settings → 403
   - OPERATOR: GET /suppliers → ter-mask di list, detail, DAN export
   - OPERATOR: VOID apa pun → 428 (step-up) sebelum approve
   - SEMUA role: tidak ada route DELETE terdaftar di seluruh aplikasi
     (enumerasi router Nest dan assert tidak ada method DELETE)

2. Audit tambahan yang mudah terlewat:
   - endpoint export: apakah masking supplier tetap berlaku? (uji langsung)
   - endpoint laporan: apakah OPERATOR bisa melihat data yang seharusnya tertutup?
   - endpoint /:id: apakah user bisa mengakses data yang bukan haknya lewat ID tebakan?
   - apakah ada endpoint yang lupa @Roles dan jadi terbuka untuk semua?
     (enumerasi semua route, daftar yang tidak punya decorator @Roles maupun @Public)

3. Perbaiki semua temuan hari ini juga.

DEFINITION OF DONE:
- test permission matrix hijau, mencakup seluruh baris plan §7
- daftar route tanpa @Roles/@Public = kosong (atau setiap pengecualian dijelaskan)
- masking supplier berlaku di list, detail, export, dan laporan
- tidak ada route DELETE di seluruh aplikasi

SETELAH SELESAI: tampilkan tabel hasil (role × endpoint × status) secara utuh.
```

### 🎨 Frontend

```
TUGAS (FRONTEND) Hari 32:
1. Audit menu & halaman untuk ketiga role:
   - login sebagai masing-masing role, daftar menu apa yang terlihat
   - coba akses SETIAP route terproteksi lewat URL langsung (paste di address bar)
   - pastikan tidak ada halaman yang "berkedip" tampil sebelum ditolak
2. Audit tombol: tombol aksi yang tidak boleh dipakai role tsb harus
   TIDAK ADA (bukan sekadar nonaktif) — kecuali kalau menonaktifkannya
   memberi informasi berguna (mis. tombol VOID nonaktif dengan alasan).
3. Pastikan setiap kegagalan 403 dari API menampilkan pesan yang ramah,
   bukan layar error mentah.
4. Buat tabel hasil audit di docs/permission-audit-frontend.md.

DEFINITION OF DONE:
- Tabel audit lengkap untuk 3 role × semua halaman
- Akses URL langsung ke halaman terlarang → ditolak bersih
- Tidak ada tombol terlarang yang tampil
```

### ✅ Verifikasi Hari 32
- [ ] Test permission matrix mencakup seluruh plan §7 dan hijau
- [ ] Tidak ada route tanpa `@Roles`/`@Public`
- [ ] Tidak ada route DELETE
- [ ] Masking supplier berlaku di export & laporan
- [ ] Audit FE terdokumentasi
- [ ] `./scripts/verify.sh` hijau

---

## Hari 33 — BUFFER

```
KONTEKS: Hari 33 dari 34. Buffer terakhir. Setelah hari ini tidak ada lagi cadangan.

LANGKAH 1 — Laporkan status jujur:
- Berapa sub-item di PROGRESS.md yang masih [ ] atau [~]?
- Apakah ada yang termasuk kategori "TIDAK boleh dipotong" (plan §9.2)?
- Item mana dari go-live checklist (§8) yang belum bisa dikerjakan karena
  menunggu klien?
Tampilkan sebagai daftar, TUNGGU keputusan saya sebelum mulai.

LANGKAH 2 — prioritas kalau saya tidak memberi arahan lain:
1. Item "tidak boleh dipotong" yang belum tuntas
2. Bug kategori A yang tersisa dari Hari 31
3. Persiapan Hari 34: mulai menulis dokumentasi setup & deploy
   (jangan tunggu besok — Hari 34 sudah padat)
4. Bug kategori B

JANGAN kerjakan: fitur baru, refactor kosmetik, optimasi tanpa data pengukuran.

DEFINITION OF DONE:
- Status jujur dilaporkan sebelum mulai
- Tidak ada item "tidak boleh dipotong" yang tersisa
- Kerangka dokumentasi deploy sudah ada
```

### ✅ Verifikasi Hari 33
- [ ] Daftar sisa pekerjaan dilaporkan sebelum mulai
- [ ] Item "tidak boleh dipotong" tuntas semua
- [ ] Kerangka dokumentasi deploy ada
- [ ] `./scripts/verify.sh` hijau

---

## Hari 34 — Smoke Test, Dokumentasi, Serah Terima

### 🔧 Backend + Frontend (satu sesi, ini hari integrasi)

```
KONTEKS: Hari 34 dari 34. HARI TERAKHIR. Cut-over 1 September.
Tidak ada kode fitur baru hari ini. Kalau tergoda menambahkan sesuatu, jangan.

TUGAS A — SMOKE TEST END-TO-END (jalankan di DB BERSIH, bukan DB development):
Skrip satu alur penuh, tiap langkah diverifikasi:
 1. login sebagai master
 2. buat akun kas (Kas Besar) + akun bank (BCA) di COA
 3. buat gudang: Gudang Toko (default) + Gudang Bad Stock
 4. buat 2 produk dengan konversi satuan, 2 customer, 1 supplier, 1 agen, 1 kendaraan
 5. input saldo awal stok + kas → VERIFIKASI nilai lot = saldo GL Persediaan
 6. purchase invoice 2 baris → cek jurnal balance, lot terbentuk
 7. sales invoice 2 baris → cek pembulatan, HPP, unit_cost_fifo tersimpan
 8. buat surat jalan → tandai DELIVERED
 9. terima pembayaran multi-metode (kas + transfer) dengan alokasi diedit manual
10. retur penjualan sebagian dengan settlement CASH
11. mutasi ke gudang bad stock + mutasi ke gudang titip
12. VOID salah satu dokumen (lewat step-up sebagai operator)
13. buka SEMUA laporan, export masing-masing ke xlsx & pdf
14. jalankan endpoint rekonsiliasi stok → HARUS 0 selisih
15. jalankan 4 invarian → HARUS hijau
16. logout
Laporkan hasil tiap langkah. Kalau ada yang gagal, ITU prioritas hari ini.

TUGAS B — DOKUMENTASI (buat di docs/, bahasa Indonesia, untuk orang yang
belum pernah melihat proyek ini — asumsikan bukan developer yang sama):
 1. docs/SETUP.md — instalasi dari nol: prasyarat, clone, env, docker compose,
    migration, seed, build, jalankan. Sertakan perintah yang bisa disalin.
 2. docs/DEPLOY.md — deploy ke mini PC: konfigurasi IP lokal tetap,
    Docker Compose produksi, cara update versi, cara rollback.
 3. docs/BACKUP.md — pg_dump harian otomatis (cron/systemd timer) ke disk
    eksternal + cloud, DAN prosedur restore langkah demi langkah.
    ← Prosedur restore WAJIB sudah diuji minimal sekali. Tulis hasil ujinya.
 4. docs/OPERASIONAL.md — untuk klien: 3 kredensial awal (dan perintah
    menggantinya), alur harian operator, apa yang harus dilakukan kalau
    listrik mati / sistem tidak bisa diakses, siapa yang dihubungi.
 5. docs/ARSITEKTUR.md — ringkasan modul, diagram alur transaksi
    (purchase → stok → jurnal), penjelasan keempat invarian dan cara menjalankannya,
    daftar keputusan yang sengaja diambil (dari plan §1.7) beserta konsekuensinya.
    ← Bagian terakhir ini yang paling berharga untuk developer berikutnya.

TUGAS C — SERAH TERIMA:
 1. Jalankan checklist go-live (plan §8) — tandai mana yang sudah, mana yang
    menunggu klien, mana yang harus dikerjakan sebelum 1 September.
 2. Pastikan repo siap dipindah ke akun klien (README, LICENSE kalau perlu,
    tidak ada kredensial ter-commit — jalankan pemeriksaan git history
    untuk .env atau password yang pernah masuk).
 3. Tulis ringkasan serah terima: apa yang selesai, apa yang ditunda
    (dengan konsekuensinya), apa yang perlu dikerjakan segera setelah cut-over.

DEFINITION OF DONE:
- Smoke test 16 langkah semuanya hijau di DB bersih
- 5 dokumen ada dan bisa diikuti orang lain
- Restore backup sudah diuji dan hasilnya tertulis
- git history bersih dari kredensial
- Checklist go-live tertandai dengan jujur
```

### ✅ Verifikasi Hari 34 (Gerbang Serah Terima)

- [ ] Smoke test 16 langkah hijau **di DB bersih**
- [ ] 4 invarian hijau
- [ ] Rekonsiliasi stok = 0
- [ ] Semua laporan terekspor xlsx & pdf
- [ ] 5 dokumen lengkap
- [ ] **Restore backup sudah diuji, bukan hanya backup-nya**
- [ ] Git history bersih dari kredensial
- [ ] Kredensial default sudah diganti (atau diinstruksikan ke klien)
- [ ] Repo dipindah ke akun klien
- [ ] Checklist go-live §8 tertandai
- [ ] **Gladi bersih dijadwalkan sebelum 1 September**
- [ ] UAT Minggu 5 (~29 Agu) selesai

---
---

# Lampiran A — `scripts/verify.sh`

Skrip inilah yang dimaksud "checkmark untuk memastikan program dapat berjalan".
Jalankan setiap akhir hari sebelum commit. File lengkapnya ada di `scripts/verify.sh`.

Yang diperiksa:

| # | Pemeriksaan | Gagal artinya |
|---|---|---|
| 1 | Postgres hidup & bisa diquery | lingkungan belum siap |
| 2 | `npm run build` BE | ada error TypeScript |
| 3 | `npm run lint` BE | konvensi kode dilanggar |
| 4 | Migration up → down → up di DB sementara | migration tidak reversible |
| 5 | `npm run test` BE (termasuk 4 invarian setelah Hari 8) | logika bisnis rusak |
| 6 | Server start & `GET /health` 200 | aplikasi tidak bisa dijalankan |
| 7 | `npm run build` FE | ada error di frontend |
| 8 | `npm run lint` FE | konvensi FE dilanggar |
| 9 | Tidak ada route DELETE terdaftar | melanggar aturan no-hard-delete |
| 10 | `.env` tidak ter-stage di git | risiko kebocoran kredensial |

Keluarannya berupa daftar ✅/❌ dan exit code 1 kalau ada yang gagal —
sehingga bisa dipasang sebagai pre-push hook.

---

# Lampiran B — Prompt Darurat

## Kalau drift ≥ 3 hari

```
Baca PROGRESS.md §0 dan §6, serta plan v2 §9.3.

Drift saat ini <N> hari. Jalankan prosedur potong darurat:
1. Hitung berapa hari yang perlu dihemat untuk kembali ke jalur.
2. Ambil item dari daftar potong SECARA BERURUTAN (jangan melompat) sampai
   penghematannya cukup. Daftarnya sudah disepakati di muka justru supaya
   tidak diputuskan dalam keadaan panik.
3. Untuk tiap item yang dipotong, tuliskan:
   - apa konsekuensinya bagi operasional klien di bulan pertama
   - apa jalan memutar manualnya
   - kapan idealnya dikerjakan pasca-MVP
4. Update PROGRESS.md §6 dan §3.
5. Susun draf pesan singkat untuk klien: apa yang ditunda, kenapa, dan
   bagaimana mereka menanganinya sementara.

JANGAN memotong: Journal Poster, Stock Recorder + FIFO, VOID + reversing,
integration test Hari 8, alur Saldo Awal, ergonomi input.
```

## Kalau ada bug yang menyentuh engine

```
Ada bug di <modul>. Sebelum memperbaiki:
1. Tulis test yang GAGAL karena bug ini. Tunjukkan test-nya gagal.
2. Baru perbaiki. Tunjukkan test-nya lulus.
3. Jalankan 4 invarian Hari 8 — pastikan tidak ada yang pecah.
4. Jalankan endpoint rekonsiliasi stok — pastikan 0 selisih.
5. Kalau bug ini merusak data yang sudah tersimpan, tulis juga
   skrip perbaikan data + cara memverifikasinya, dan jangan jalankan
   sebelum saya setujui.
```

## Kalau klien meminta fitur baru di tengah jalan

```
Klien meminta: <permintaan>.

Aturan proyek: permintaan fitur baru = TUKAR SCOPE, bukan tambahan.
Bantu saya menyusun jawabannya:
1. Estimasi jujur berapa hari fitur ini (termasuk test dan UI-nya).
2. Item mana dari sisa pekerjaan yang setara waktunya dan bisa ditukar?
3. Apa konsekuensi menukar item itu?
4. Apakah fitur ini bisa ditunda ke pasca-MVP tanpa memblokir cut-over
   1 September? Kalau ya, itu rekomendasi utama.
5. Susun draf balasan singkat, sopan, dan konkret untuk klien.
```

## Kalau tertinggal dan tergoda melewatkan test

```
Saya tertinggal dan sedang tergoda melewatkan test hari ini.

Ingatkan saya: apa yang akan terjadi kalau engine punya bug yang tidak
tertangkap, dan baru ketahuan setelah cut-over 1 September saat data
transaksi asli sudah menumpuk? Berapa lama perbaikannya dibanding
menulis test-nya sekarang?

Lalu bantu saya cari kompromi yang jujur: test mana yang benar-benar
wajib hari ini, dan mana yang boleh menyusul besok tanpa membahayakan.
```
