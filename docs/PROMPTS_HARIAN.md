# Prompt Development Harian v3 — Website Operasional FMCG

Pendamping `Development_Plan_v2`, `CLAUDE.md` v2, `KONTEKS_REVISI_2026-07-28.md`, dan `PROGRESS.md` v3.
Setiap hari punya **2 prompt** (Backend & Frontend) + **1 blok verifikasi**.

> **Versi 3 — 29 Juli 2026.** Menggantikan v2 mulai Hari 7. Prompt Hari 1–6 di bawah
> **dibiarkan apa adanya sebagai arsip** — hari-hari itu sudah dieksekusi. Sebagian hasilnya
> sudah usang dan diperbaiki oleh **rework Hari 7–9**; jangan menjalankan ulang prompt lama.
>
> **Penomoran hari berubah.** Rework menempati Hari 7–9, sisanya bergeser +3, scope baru masuk
> lewat hari sisipan berhuruf (22A, 23A). Peta lengkapnya di `PROGRESS.md` §0.1.
>
> **Revisi 29 Juli sore — posting jalan, pelaporan menyusul.** Empat hal ditunda ke pasca-MVP:
> tutup bulan (Hari 23A), laporan penjualan/piutang/hutang (Hari 30), laporan biaya
> operasional (bagian Hari 31), dan layar Jurnal Manual (bagian Hari 12). Prompt-nya
> **tetap ada di file ini** bertanda ⏸ — jangan dihapus, tinggal dijalankan setelah
> 30 Agustus. Tanggal Hari 24–35 ditarik maju 2 hari; Hari 36 & 37 tetap di 29 & 30 Agustus.

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
6. Hari bertanda 🛑 punya **gerbang berhenti-dan-tanya**: ada keputusan klien yang belum
   turun. Kerjakan bagian yang aman, lalu berhenti. Menebak di titik itu lebih mahal
   daripada menunggu — beberapa di antaranya baru ketahuan salah setelah data terlanjur masuk.

**Urutan dalam satu hari yang ideal:** BE dulu, FE kedua. Frontend butuh endpoint yang
sudah bisa dipanggil, bukan endpoint yang "nanti ada".

---

## A. Prompt Pembuka Harian (jalankan sekali tiap pagi)

```
Baca CLAUDE.md, PROGRESS.md, dan KONTEKS_REVISI_2026-07-28.md §4.

Sebelum kita mulai Hari 8, jawab singkat (maksimal 18 baris):
1. Modul apa saja yang sudah selesai menurut PROGRESS.md §4?
   PENTING: §4 merekam keadaan sebelum revisi klien. Sebutkan mana yang
   sudah digantikan oleh rework Hari 7-9.
2. Apakah ada blocker 🔒 dari hari sebelumnya yang belum tuntas?
3. Apakah ada item di PROGRESS.md §1 (Menunggu Klien) yang tanggal
   "dibutuhkan sebelum"-nya sudah lewat atau jatuh hari ini?
4. Apakah pekerjaan Hari 8 menyentuh salah satu PR terbuka di
   KONTEKS_REVISI §4.2? Kalau ya, sebutkan nomornya dan BERHENTI di situ —
   saya yang akan menanyakannya ke klien.
5. Sebutkan file/service existing yang akan saya sentuh hari ini, supaya
   kamu tidak membuat duplikat.

Jangan menulis kode dulu. Tunggu prompt tugas berikutnya.
```

> **Kenapa poin 1 diberi peringatan:** `PROGRESS.md` §4 masih memuat format nomor
> `INV/2609/0001`, skema produk lama, dan `CUSTOMER_CONSIGNMENT`. Kalau disalin mentah-mentah
> ke context, Claude Code akan membangun di atas skema yang sudah mati — dan tidak akan
> ada error apa pun yang memberi tahu.

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
   - kalau drift >= 0,5 hari, tambahkan baris di §3 Catatan Harian hari ini juga
   - perbarui §4 Modul Selesai
   - kalau ada item §1 (Menunggu Klien) yang jawabannya masuk hari ini, isi kolom
     "Diterima tgl" dan ubah statusnya
3. Commit semua dengan pesan: "Hari <N>: <ringkasan 1 baris>"
4. Terakhir, beri saya 3 kalimat: apa yang paling berisiko untuk Hari <N+1>,
   apakah ada utang teknis yang saya buat hari ini, dan apakah ada aturan
   CLAUDE.md §2 yang hari ini terasa sempit — kalau ada, sebutkan nomornya.
```

> **Margin jadwal sekarang nol.** Aturan drift di `PROGRESS.md` §0 sudah diperketat: drift
> setengah hari pun dicatat hari itu juga. Jangan menunggu genap sehari — daftar potong
> darurat sudah habis, jadi drift yang ketahuan terlambat tidak punya tempat mendarat.

---
---

# FASE 1 — FONDASI (Hari 1–4) · ARSIP, SUDAH DIEKSEKUSI

> ⛔ **Jangan dijalankan ulang.** Prompt di bawah ditulis sebelum revisi klien dan memuat
> aturan yang sudah dicabut: format nomor `INV/2609/0001`, akun Pendapatan Pembulatan,
> `settings.rounding_multiple`, `warehouse_type` `CUSTOMER_CONSIGNMENT`, dan skema produk
> tanpa `is_bkp`. Semuanya diperbaiki di **Hari 7–9**. Bagian ini disimpan hanya sebagai
> catatan apa yang dulu dikerjakan.

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

# FASE 2 — ENGINE INTI (Hari 5–6) · ARSIP, SUDAH DIEKSEKUSI

> ⛔ **Jangan dijalankan ulang.** Step-up di Hari 5 memakai kode status **428**;
> `CLAUDE.md` §5 menetapkan **412**. Penyeragamannya dikerjakan di **Hari 9**.

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
---

# FASE 2B — REWORK PASCA-REVISI KLIEN (Hari 7–9)

Tiga hari ini membayar utang yang dibuat revisi klien 28–29 Juli terhadap pekerjaan yang
sudah ditandai selesai. Urutannya tidak boleh ditukar:

- **Hari 7 dulu** karena setelah Hari 14 dokumen mulai terbit dengan nomor sungguhan, dan
  format nomor tidak bisa diubah lagi tanpa migrasi data yang menyentuh nota yang sudah dicetak.
- **Hari 9 terakhir** karena `StepUpService` adalah fondasi kunci cetak (Hari 15), approval
  kas besar (Hari 17), batas jual-rugi (Hari 21), dan mutasi BS→STORE (Hari 13).

---

## Hari 7 🆕🔒 — Format Nomor Dokumen + Identitas Toko

### 🔧 Backend

```
KONTEKS: Hari 7 dari 37. Rework pasca-revisi klien.
Hari 3 sudah membuat DocumentCounterService dengan format PREFIX/YYMM/NNNN
(contoh INV/2609/0001). Klien menetapkan format yang berbeda dan format lama
tidak boleh tersisa di mana pun.

TUGAS (BACKEND):
1. Ubah format nomor jadi: KODE/{settings.store_code}-YYMMXXXX
   Contoh nyata dari sistem lama klien: JL/RM01-26070201
   - XXXX = 4 digit, reset tiap bulan
   - segmen toko diambil dari settings, DILARANG di-hardcode di mana pun
2. Tambah ke settings: store_code (RM01), store_name, store_city, store_phone.
   Ini yang dicetak di kepala nota nanti. Yang kosong tidak dicetak.
3. Perbarui tabel kode dokumen:
   JL  Faktur Penjualan     B1  Faktur Pembelian    GD  Mutasi Gudang
   SO  Sales Order          SJ  Surat Jalan         RJ  Retur Penjualan
   RB  Retur Pembelian      PAY Pembayaran          JE  Jurnal Manual
   CATATAN: JL, B1, GD berasal dari sistem nyata klien. Jangan diganti jadi
   INV/PI/WM meski terasa lebih rapi.
4. Tambah kolom alasan VOID ke SEMUA tabel dokumen yang akan ada:
   void_reason_code (enum) + void_reason_note (teks, WAJIB terisi saat VOID).
   Ini yang dibaca Laporan Kontinuitas Nomor Dokumen di Hari 28.
5. Migrasi data dev yang terlanjur bernomor format lama. Kalau lebih mudah
   di-truncate, boleh — tapi tulis keputusannya di output.
6. Pastikan generator tetap memakai tabel document_counters di dalam transaction
   pemanggil (SELECT ... FOR UPDATE). JANGAN diganti CREATE SEQUENCE.
7. BERSIH-BERSIH SISA ATURAN YANG DICABUT — Hari 3 menyeed dan menyetel hal-hal
   yang sekarang sudah mati:
   HAPUS  akun "Pendapatan Pembulatan" dari seed COA (pembulatan dicabut)
   HAPUS  settings.rounding_multiple
   TAMBAH akun "Diskon Penjualan"          (kontra pendapatan, metode bruto, Hari 21)
   TAMBAH akun "Selisih Pembayaran"        (satu akun dua arah, Hari 27)
   TAMBAH akun "Selisih Retur Pembelian"   (Hari 16)
   TAMBAH settings.default_ar_account_id
   TAMBAH settings.cash_outflow_approval_threshold
   Akun Kas, Bank, dan Retur Pembelian TETAP tidak di-seed.
   Kalau akun yang dihapus sudah terlanjur dipakai di jurnal dev, nonaktifkan
   (is_active = false), jangan dihapus — dan katakan itu di output.

ATURAN WAJIB HARI INI:
- Nomor tidak boleh hilang. Rollback transaksi WAJIB mengembalikan nomor.
  Inilah alasan counter berupa tabel, bukan sequence — jangan "dioptimalkan".
- store_code tidak boleh muncul sebagai literal string di luar settings.
  Grep 'RM01' di src/ setelah selesai; hasilnya harus kosong kecuali seed & test.

DEFINITION OF DONE:
- getNextNumber('JL') menghasilkan JL/RM01-26070001
- Pemanggilan di bulan berikutnya menghasilkan ...26080001 (reset benar)
- 20 pemanggilan paralel menghasilkan 20 nomor unik berurutan tanpa duplikat
- Transaksi yang di-rollback TIDAK menaikkan last_number (buktikan dengan
  membandingkan nilai last_number sebelum dan sesudah)
- grep -r 'INV/' src/ dan grep -r 'YYMM/' src/ mengembalikan kosong
- COA tidak lagi memuat Pendapatan Pembulatan, dan memuat tiga akun baru di atas
- settings.rounding_multiple sudah tidak ada di kode maupun DB

SETELAH SELESAI:
Jalankan ./scripts/verify.sh dan tampilkan hasilnya. Lalu tampilkan checklist DoD
dalam bentuk [x]/[ ] beserta bukti (output perintah / potongan response JSON).
```

### 🎨 Frontend

```
KONTEKS: Hari 7 dari 37. Backend baru saja memindahkan identitas toko ke settings.

TUGAS (FRONTEND):
1. Halaman Settings: tambah blok "Identitas Toko" — store_code, nama, kota, telepon.
   store_code diberi peringatan: "Tidak bisa diubah setelah dokumen pertama terbit."
   (Backend belum menegakkannya; cukup peringatan visual dulu.)
2. Cari seluruh tempat di frontend yang menampilkan atau memformat nomor dokumen
   dan pastikan tidak ada yang memparse format lama (split '/', ambil index, dsb).
   Nomor dokumen diperlakukan sebagai string utuh, tidak pernah diurai di frontend.
3. Kalau ada komponen yang menampilkan contoh nomor (placeholder, helper text),
   perbarui contohnya jadi JL/RM01-26070001.

ATURAN WAJIB HARI INI:
- Pakai <CrudFormPage> yang sudah ada. Dilarang bikin layout form baru.

DEFINITION OF DONE:
- Settings menampilkan 4 field identitas toko dan menyimpannya
- Tidak ada satu pun tempat di frontend yang mengurai struktur nomor dokumen
- npm run build 0 error, npm run lint bersih

SETELAH SELESAI: tampilkan daftar file yang diubah + hasil build.
```

### ✅ Verifikasi Hari 7

- [ ] `JL/RM01-26070001` terbit; ganti bulan mereset ke `0001`
- [ ] 20 pemanggilan paralel → 20 nomor unik berurutan
- [ ] Rollback **mengembalikan** nomor (`last_number` sama sebelum/sesudah)
- [ ] `grep -r 'INV/' src/` kosong · `grep -r 'RM01' src/` hanya di seed & test
- [ ] `void_reason_code` + `void_reason_note` ada di semua tabel dokumen
- [ ] Akun Pendapatan Pembulatan & `settings.rounding_multiple` **hilang**
- [ ] Akun Diskon Penjualan · Selisih Pembayaran · Selisih Retur Pembelian **ada**
- [ ] Settings menyimpan identitas toko
- [ ] `./scripts/verify.sh` hijau

---

## Hari 8 🆕♻️ — Master Data v2 (Produk, Merek, UoM, Salesman, Gudang)

### 🔧 Backend

```
KONTEKS: Hari 8 dari 37. Rework pasca-revisi klien.
Hari 4 sudah membuat CRUD Products/Customers/Suppliers/Warehouses. Klien
menjelaskan bentuk master data yang sebenarnya dipakai, dan bentuknya berbeda.
Ini rework di atas kode yang sudah ada, bukan modul baru — JANGAN buat modul
kembar, ubah yang ada.

TUGAS (BACKEND):
1. Master baru (kecil-kecil, satu layar masing-masing):
   - brands      : kode, nama, aktif
   - units       : kode, nama, aktif        (satuan jual/beli: DUS, RENCENG, SACHET)
   - salesmen    : kode, nama, aktif
2. products — ubah:
   - Kode produk = BARCODE format YYMMDDXXXX (contoh 2401200001 = produk ke-1
     tanggal 20 Jan 2024). Diinput manual; kalau kosong, dibangkitkan otomatis.
     UNIK, dan DIKUNCI setelah produk dipakai di transaksi pertama.
   - is_bkp (boolean) — menentukan apakah PPN masukan dihitung. WAJIB ADA.
   - Nama tersusun 4 bagian: brand_id (FK) + keterangan + kemasan + ukuran&uom.
     Contoh hasil: "Bendera Putih Sachet 37 gr".
     Simpan keempat bagiannya PLUS kolom display_name gabungan yang TERINDEKS.
   - Konversi satu tingkat saja: 1 <satuan besar> = N <satuan dasar>.
     Qty disimpan dalam satuan dasar.
   - Barcode EAN sebagai field opsional terpisah, tidak dipakai di MVP.
3. customers: tambah ar_account_id (nullable, FK chart_of_accounts).
   WAJIB: buat SATU fungsi bersama resolveArAccount(customer) yang
   mengembalikan customer.ar_account_id ?? settings.default_ar_account_id.
   Lima tempat akan memanggilnya nanti (faktur, alokasi pembayaran, retur,
   pembalikan VOID, saldo awal). Buat sekarang, meski baru satu pemanggil.
4. suppliers: tambah is_pkp (boolean).
5. warehouses: rename warehouse_type CUSTOMER_CONSIGNMENT -> TITIPAN_PELANGGAN
   (migration + seluruh referensi di kode + test).

ATURAN WAJIB HARI INI:
- Dua konsep "satuan" TIDAK BOLEH tertukar:
  * UoM kemasan (gr, ml, kg) = bagian dari NAMA. Deskriptif. Tidak pernah dihitung.
  * Satuan jual/beli (DUS, RENCENG) = konversi qty dan penyimpanan stok.
  Kalau keduanya masuk ke tabel yang sama, hentikan dan tanya saya.
- display_name WAJIB terindeks. Operator mencari produk berdasarkan nama,
  bukan kode — ini jalur panas yang dipakai tiap baris faktur.
- Tidak ada master kategori. Kategori diwakili merek.

DEFINITION OF DONE:
- Membuat produk dari 4 bagian terpisah menghasilkan display_name
  "Bendera Putih Sachet 37 gr" dan bisa ditemukan lewat pencarian "bendera"
- Mengubah kode produk yang sudah dipakai transaksi -> 400 dengan pesan
  berbahasa Indonesia yang bisa dibaca operator
- resolveArAccount() mengembalikan default saat ar_account_id NULL
- grep -r 'CUSTOMER_CONSIGNMENT' src/ mengembalikan kosong
- Migration up -> down -> up sukses di DB kosong

SETELAH SELESAI:
Jalankan ./scripts/verify.sh, tampilkan hasilnya, lalu checklist DoD [x]/[ ]
beserta bukti.
```

### 🎨 Frontend

```
KONTEKS: Hari 8 dari 37. Backend master data v2 baru selesai.
Setelah hari ini klien MULAI MENGISI MASTER DATA SUNGGUHAN — layar ini akan
dipakai ratusan kali oleh orang yang bukan developer. Prioritaskan kejelasan.

TUGAS (FRONTEND):
1. Halaman Merek, Satuan (UoM), Salesman — pakai <DataTable> + <CrudFormPage>
   yang sudah ada. Tiga halaman ini nyaris identik; tetap DILARANG copy-paste
   layout — kalau butuh varian, tambah prop.
2. Form Produk dirombak:
   - 4 field terpisah (Merek dropdown, Keterangan, Kemasan, Ukuran + UoM dropdown)
   - PREVIEW display_name yang ter-update saat mengetik, ditampilkan besar.
     Operator harus melihat nama akhir sebelum menyimpan.
   - Kode produk: input manual + tombol "Bangkitkan" (YYMMDDXXXX).
     Kalau produk sudah dipakai transaksi, field jadi read-only dengan penjelasan.
   - Checkbox is_bkp dengan label yang dimengerti orang non-pajak:
     "Barang Kena Pajak (PPN dari supplier dihitung)"
   - Blok konversi satuan: 1 [satuan besar] = [N] [satuan dasar]. Satu tingkat.
3. Form Pelanggan: JANGAN tampilkan ar_account_id ke Operator.
   Field itu hanya muncul untuk MASTER, dan dropdownnya TERSARING hanya akun
   bertipe piutang yang aktif.

ATURAN WAJIB HARI INI:
- Bahasa UI Indonesia, jelas untuk operator toko. Hindari istilah teknis
  ("FK", "nullable", "enum") di label mana pun.
- Format angka lewat useRupiah()/useQty(). Tidak ada toLocaleString tersebar.

DEFINITION OF DONE:
- Mengetik di 4 field menghasilkan preview nama yang benar secara live
- Login sebagai OPERATOR: field akun piutang tidak ada di DOM sama sekali
- Login sebagai MASTER: dropdown akun piutang hanya berisi akun piutang aktif
- npm run build 0 error, npm run lint bersih

SETELAH SELESAI: tampilkan daftar file + hasil build + 3 screenshot alur
(buat produk, buat merek, form pelanggan sebagai Operator).
```

### ✅ Verifikasi Hari 8

- [ ] Produk "Bendera Putih Sachet 37 gr" terbentuk dari 4 bagian, `display_name` terindeks
- [ ] Pencarian "bendera" menemukan produk itu
- [ ] Kode produk yang sudah dipakai transaksi ditolak saat diubah
- [ ] `is_bkp` dan `suppliers.is_pkp` ada dan tersimpan
- [ ] `resolveArAccount()` ada dan dipakai — bukan literal akun default di modul
- [ ] `grep -r 'CUSTOMER_CONSIGNMENT' src/` kosong
- [ ] Operator tidak melihat field akun piutang
- [ ] **Klien dikabari bahwa pengisian master data boleh dimulai** (tenggat internal ±20 Agu)
- [ ] `./scripts/verify.sh` hijau

---

## Hari 9 🆕🔒 — Authorization Requests Berpayload + StepUpService Dinamis

### 🔧 Backend

```
KONTEKS: Hari 9 dari 37. Rework pasca-revisi klien.
Hari 5 sudah membuat authorization_requests + guard step-up + TTL 15 menit.
Yang kurang: request tidak membawa konteks, dan approval tidak terikat ke aksi
tertentu. Ini fondasi untuk kunci cetak (Hari 15), approval kas besar (Hari 17),
mutasi BS->STORE (Hari 13), dan batas jual-rugi (Hari 21). Kalau salah di sini,
keempatnya ikut salah.

TUGAS (BACKEND):
1. authorization_requests: tambah payload (JSONB) + context_summary (teks).
   context_summary adalah kalimat yang DIBACA SUPERVISOR di layar approval,
   contoh: "VOID faktur JL/RM01-26070042 ke Toko Makmur, Rp 4.250.000".
2. consumeApproval() WAJIB memvalidasi ulang bahwa body request yang sedang
   dieksekusi COCOK dengan payload yang disetujui.
   Tanpa ini, approval Rp 1 juta bisa dipakai mengeksekusi Rp 100 juta.
   Tentukan pencocokan per actionType, jangan deep-equal buta.
3. expires_at (TTL 15 menit) dicek SAAT EKSEKUSI, bukan hanya saat approve.
4. KODE STATUS: Hari 5 memakai 428, CLAUDE.md Sec.5 menyebut 412. Pilih 412 dan
   SERAGAMKAN — ubah guard lama, <StepUpDialog>, dan semua test yang menyebut 428.
   Dua kode berbeda untuk satu makna adalah cara termurah membuat frontend punya
   dua jalur penanganan tanpa disadari.
5. StepUpService.requireApproval() — dipanggil DARI DALAM SERVICE, bukan guard,
   karena syaratnya bergantung pada ISI transaksi (nominal, akun, status), bukan
   sekadar role. Melempar 412 dengan kontrak response yang SAMA PERSIS seperti
   guard, supaya frontend cukup punya satu jalur penanganan.
6. Daftar actionType yang sudah diketahui (buat enum-nya sekarang, implementasi
   menyusul di harinya): VOID_DOCUMENT, UNLOCK_PRINT, SELL_BELOW_COST,
   CASH_OUTFLOW, BS_TO_STORE.
7. audit_logs: pastikan password, password_hash, token, refresh_token di-strip
   dari before_data/after_data. Cek ulang, ini gampang bocor lewat payload baru.

ATURAN WAJIB HARI INI:
- Satu permintaan = satu persetujuan = satu eksekusi. Approval yang sudah
  dikonsumsi tidak bisa dipakai lagi.
- Klien MENOLAK pola supervisor mengetik password di layar operator. Alurnya:
  operator mengajukan lewat program -> supervisor melihat di layarnya sendiri ->
  approve -> operator lanjut. Jangan pernah membuat modal "minta password atasan".

DEFINITION OF DONE:
- Approval untuk payload Rp 1.000.000 DITOLAK saat dipakai mengeksekusi
  Rp 100.000.000 (tulis test-nya)
- Request yang expires_at-nya dimundurkan 16 menit DITOLAK saat eksekusi,
  meski statusnya APPROVED
- Approval yang sudah dikonsumsi, dipakai kedua kali -> ditolak
- StepUpService.requireApproval() dari dalam service menghasilkan response 412
  dengan bentuk yang identik dengan guard (bandingkan JSON-nya berdampingan)
- audit_logs tidak memuat satu pun field rahasia

SETELAH SELESAI:
Jalankan ./scripts/verify.sh, tampilkan hasilnya, lalu checklist DoD [x]/[ ].
```

### 🎨 Frontend

```
KONTEKS: Hari 9 dari 37. Backend authorization_requests baru diperkaya.
Supervisor selalu ada di tempat (satu jaringan LAN, bisa dihampiri langsung),
jadi TIDAK PERLU WebSocket. Polling 5 detik sudah cukup dan jauh lebih sederhana.

TUGAS (FRONTEND):
1. Halaman Antrian Persetujuan (untuk MASTER & SUPERVISOR):
   - daftar request menunggu, menampilkan context_summary sebagai baris utama
   - detail memperlihatkan payload dalam bentuk yang terbaca manusia, bukan JSON mentah
   - tombol Setujui / Tolak, alasan wajib saat menolak
   - sisa waktu TTL tampil dan menghitung mundur
   - polling 5 detik
2. <StepUpDialog> dari Hari 7 lama SUDAH ADA — jangan bikin komponen baru.
   Perluas isinya: tampilkan context_summary, dan tangani 412 dari MANA PUN
   (guard maupun dari dalam service) lewat SATU alur:
   tampilkan modal "Menunggu persetujuan supervisor" -> polling status ->
   begitu APPROVED, ULANGI request otomatis dengan header/token approval.
3. Modal itu harus bisa dibatalkan operator tanpa menggantung request.

ATURAN WAJIB HARI INI:
- Dilarang membuat dua jalur penanganan 412. Satu komponen, dipakai semua modul.
- Ganti seluruh referensi 428 yang tersisa dari Hari 5. Grep-lah, jangan mengandalkan ingatan.
- Jangan tampilkan angka batas apa pun yang tidak boleh dilihat operator
  (contoh: ambang kas besar, harga pokok). Modal cukup bilang butuh persetujuan.

DEFINITION OF DONE:
- Operator memicu aksi yang butuh step-up -> modal muncul
- Supervisor approve di layarnya -> dalam <=5 detik modal operator lanjut sendiri
- Supervisor menolak -> operator melihat alasannya
- TTL habis saat modal terbuka -> operator diberi tahu, tidak menggantung
- npm run build 0 error, npm run lint bersih

SETELAH SELESAI: tampilkan daftar file + hasil build + rekaman alur dua layar
(operator meminta, supervisor menyetujui).
```

### ✅ Verifikasi Hari 9

- [ ] Approval Rp 1 jt ditolak untuk eksekusi Rp 100 jt (ada test-nya)
- [ ] Approval kedaluwarsa ditolak **saat eksekusi**
- [ ] Approval yang sudah dikonsumsi tidak bisa dipakai ulang
- [ ] 412 dari guard dan dari dalam service punya bentuk response identik
- [ ] `<StepUpDialog>` yang sudah ada dipakai ulang, bukan komponen kembar
- [ ] Tidak ada lagi `428` tersisa di BE maupun FE (grep bersih)
- [ ] Tidak ada modal "ketik password supervisor" di mana pun
- [ ] `audit_logs` bersih dari field rahasia
- [ ] `./scripts/verify.sh` hijau

---
---

# FASE 3 — ENGINE INTI, LANJUTAN (Hari 10–13)

---

## Hari 10 🔒 — Stock Recorder + FIFO  *(v2: Hari 7)*

### 🔧 Backend

```
KONTEKS: Hari 10 dari 37. JANTUNG PERSEDIAAN. Blocker bagi semua modul transaksi.

TUGAS (BACKEND):
1. Migration:
   `stock_movements`: id, product_id, warehouse_id, movement_type
     ENUM('purchase','sale','transfer','return_in','return_out','adjustment','opening'),
     qty_base_unit NUMERIC(16,4) (positif=masuk, negatif=keluar),
     unit_cost NUMERIC(16,4), source_type, source_id, movement_date, created_by, timestamps
   `product_stock_balance`: product_id + warehouse_id (PK gabungan),
     qty_base_unit NUMERIC(16,4), updated_at   <- ini CACHE, bukan sumber kebenaran
   `stock_cost_lots`: id, product_id, warehouse_id, lot_date, qty_in, qty_remaining,
     unit_cost NUMERIC(16,4), supplier_id (NULLABLE, FK suppliers), source_type,
     source_id, timestamps
   `stock_cost_consumptions`: id, lot_id, movement_id, qty, unit_cost, timestamps

   CATATAN supplier_id: klien meminta lot melacak supplier asal, karena retur
   pembelian (Hari 16) memilih supplier dulu lalu menyaring daftar bad stock ke
   produk yang pernah dibeli dari supplier itu. Lot dari retur pelanggan NULL.

2. src/core/stock-recorder/stock-recorder.service.ts — semua menerima EntityManager:

   recordIn(dto, manager): movement (+), lot baru, update balance
     - lot_date DIISI PEMANGGIL. Untuk pembelian = receipt_date (tanggal terima
       barang), BUKAN tanggal faktur supplier. Kalau tertukar, urutan FIFO
       mengikuti tanggal yang salah tanpa satu pun error muncul.

   recordOut(dto, manager): { movement, totalCost, consumptions, stockWarning? }
     - SELECT * FROM stock_cost_lots
       WHERE product_id=$1 AND warehouse_id=$2 AND qty_remaining > 0
       ORDER BY lot_date ASC, id ASC
       FOR UPDATE                                   <- row-lock WAJIB
     - konsumsi lot tertua dulu, catat di stock_cost_consumptions
     - lot habis tapi qty masih kurang -> JANGAN TOLAK:
       * sisa qty pakai unit_cost dari lot terakhir yang diketahui produk itu
         YANG unit_cost > 0. Lot bonus berharga nol WAJIB DILEWATI.
       * balance boleh negatif
       * return.stockWarning = "Stok <produk> di <gudang> minus <n> <satuan>"

   transfer(dto, manager): 2 baris movement, lot ikut pindah dengan unit_cost SAMA
     (bukan lot baru berharga baru). Tidak menghasilkan jurnal.

   getLatestCostBasis(productId, manager): unit_cost lot TERBARU yang unit_cost > 0.
     Fungsi ini dipakai dua tempat: fallback stok minus (di atas) dan batas jual
     di bawah harga pokok (Hari 21). Buat SEKALI di sini, jangan diduplikasi nanti.

   reconcile(productId?, warehouseId?): bandingkan SUM(stock_movements.qty_base_unit)
     dengan product_stock_balance dan laporkan selisih.

3. Utility formatQtyBreakdown(qtyBase, productId): "12 dus 15 renceng"
   memakai konversi satu tingkat. Sisa nol tidak ditampilkan.

ATURAN WAJIB HARI INI:
- SEMUA perubahan stok lewat service ini. Tidak ada modul lain yang UPDATE balance.
- FOR UPDATE wajib, bukan opsional. Tanpa itu dua transaksi bersamaan merusak FIFO.
- Aturan "lewati lot berharga nol" berlaku SETIAP KALI mencari lot terbaru sebagai
  DASAR BIAYA. Tanpa ini, satu pembelian berbonus mematikan batas jual-rugi sampai
  lot bonusnya habis, dan tidak ada error apa pun yang memberi tahu.

DEFINITION OF DONE (integration test, bukan unit test bermock):
- masuk 10@1000 (lot 01/08), masuk 10@1200 (lot 03/08), keluar 15
  -> totalCost = 16.000; lot pertama qty_remaining=0; kedua=5
- keluar melebihi total stok -> berhasil, balance negatif, ada stockWarning
- transfer 5 unit -> 2 movement, lot tujuan ber-unit_cost identik
- 2 pengeluaran paralel atas produk sama -> konsumsi lot tidak tumpang tindih
- getLatestCostBasis MELEWATI lot ber-unit_cost 0 dan mengembalikan lot berbayar
  terakhir (tulis test khusus untuk ini)
- formatQtyBreakdown(255, produk 1 dus = 20 renceng) -> "12 dus 15 renceng"

SETELAH SELESAI: tampilkan isi tabel lots & consumptions setelah skenario FIFO.
```

### 🎨 Frontend

```
KONTEKS: Hari 10 dari 37. Halaman antrian persetujuan sudah dibuat Hari 9.
Hari ini hanya menyempurnakannya dengan data nyata.

TUGAS (FRONTEND):
1. Halaman Authorization Requests: tab semua status, baris kedaluwarsa tampil
   abu-abu dan tombolnya nonaktif, countdown ke expires_at.
2. Komponen <StockBadge>: menampilkan sisa stok dalam bentuk pecahan satuan
   ("12 dus 15 renceng") dari endpoint. Akan dipakai di form penjualan Hari 20.
   Buat sekarang selagi longgar.
3. Rapikan utang teknis kecil dari Hari 1-9: <PageHeader> di semua halaman,
   empty state, breadcrumb.

DEFINITION OF DONE:
- Countdown berjalan, baris nonaktif otomatis saat mencapai 0
- <StockBadge> menampilkan pecahan satuan, bukan desimal
- npm run build 0 error, npm run lint bersih
```

### ✅ Verifikasi Hari 10

- [ ] FIFO mengambil lot `lot_date` tertua — dibuktikan isi tabel consumptions
- [ ] Stok minus jalan + `stockWarning`, **tidak** ditolak
- [ ] `FOR UPDATE` ada di query lot (cek kode, bukan asumsi)
- [ ] Test konkurensi 2 pengeluaran paralel hijau
- [ ] `getLatestCostBasis()` **melewati** lot berharga nol — ada test khususnya
- [ ] `stock_cost_lots.supplier_id` ada dan nullable
- [ ] `formatQtyBreakdown` → "12 dus 15 renceng"
- [ ] `./scripts/verify.sh` hijau

---

## Hari 11 ⚠️🔒 — Integration Test 5 Invarian + VOID Engine  *(v2: Hari 8)*

> Hari dengan ROI tertinggi di seluruh proyek. Test ini satu-satunya alasan refactor
> di minggu ke-3 masih aman. **Jangan dipotong, jangan ditunda.**
> `CLAUDE.md` §7 dan §8 masih menyebut hari ini sebagai "Hari 8" — patch saat sempat.

### 🔧 Backend

```
KONTEKS: Hari 11 dari 37. Engine (Journal Poster + Stock Recorder) sudah lengkap.

TUGAS (BACKEND):

A. INTEGRATION TEST 5 INVARIAN — DB test sungguhan, bukan mock.
   Setup: seed COA + 1 produk (2 satuan) + 1 customer + 1 supplier PKP + 2 gudang.

   TEST 1 — Jurnal balance
     Untuk SETIAP journal_entry: SUM(debit) = SUM(credit). Tanpa pengecualian.

   TEST 2 — FIFO urut
     3 lot dengan lot_date berbeda, sengaja diinput tidak berurutan.
     Assert konsumsi selalu merujuk lot_date tertua yang masih bersisa.

   TEST 3 — VOID simetris
     Jurnal pembalik: jumlah baris sama, debit<->kredit ditukar dengan nominal
     identik, dan entry_date = HARI INI (bukan tanggal dokumen asli).

   TEST 4 — Stok rekonsiliasi
     Rangkaian purchase -> sale -> return -> void.
     SUM(stock_movements.qty_base_unit) per (product, warehouse)
     = product_stock_balance.qty_base_unit, selisih 0 (bukan toleransi).

   TEST 5 — Persediaan cocok dengan lot        <- BARU, konsekuensi revisi klien
     Sum(stock_cost_lots.qty_remaining * unit_cost) untuk gudang bernilai
     = saldo akun Persediaan di buku besar.
     Inilah invarian yang merah duluan kalau diskon pembelian salah masuk jurnal,
     atau kalau PPN masukan tidak dikapitalisasi ke harga pokok lot.

   Kelimanya masuk `npm run test` default dan ke pre-push hook.
   Waktu jalan < 60 detik supaya tidak ada godaan men-skip.

B. VOID ENGINE GENERIK — src/core/void/void.service.ts
   voidDocument(sourceType, sourceId, reasonCode, reasonNote, userId, manager):
   1. cek belum pernah di-VOID (idempoten: VOID kedua -> error jelas)
   2. cek prasyarat spesifik per tipe (hook per modul)
   3. balik jurnal: entry baru, debit<->kredit ditukar, is_reversal=true,
      reversed_entry_id terisi, entry_date = HARI INI
   4. balik stok:
      - dokumen menghasilkan lot (pembelian): kurangi qty_remaining lot itu.
        Kalau lot SUDAH TERKONSUMSI sebagian -> tolak dengan pesan
        "Barang dari faktur ini sudah terjual. Buat retur pembelian, bukan pembatalan."
      - dokumen mengonsumsi lot (penjualan): kembalikan qty_remaining ke lot ASAL
        sesuai stock_cost_consumptions, bukan membuat lot baru
   5. tandai status VOIDED + void_reason_code + void_reason_note (WAJIB terisi)
      + voided_by + voided_at. TIDAK menghapus baris.

C. Wiring step-up end-to-end dengan satu dummy action untuk membuktikan alur
   412 -> request -> approve -> retry -> sukses.

ATURAN WAJIB HARI INI:
- VOID tidak pernah menghapus data.
- Jurnal pembalik bertanggal hari ini. Konsekuensi yang DISENGAJA: mem-VOID
  dokumen lama tidak pernah mengubah angka bulan yang sudah ditutup. Inilah yang
  membuat tutup bulan (Hari 23A) aman. Jangan "diperbaiki".

DEFINITION OF DONE:
- 5 test hijau, otomatis lewat `npm run test`, < 60 detik
- VOID atas dokumen yang lotnya sudah terkonsumsi -> ditolak dengan pesan jelas
- VOID dua kali -> ditolak
- VOID tanpa void_reason_note -> ditolak
- Alur step-up dummy: 412 -> approve -> retry -> 200

SETELAH SELESAI:
Tampilkan output `npm run test` lengkap dan durasinya.
Lalu MINTA SAYA MENJADWALKAN REVIEW KODE EKSTERNAL 2 JAM — engine sudah lengkap,
ini titik dengan ROI review tertinggi di seluruh proyek.
```

### 🎨 Frontend

```
KONTEKS: Hari 11 dari 37. Hari ringan di FE — sengaja, karena BE berat.

TUGAS (FRONTEND):
1. Dashboard placeholder yang jujur: kartu "Penjualan Hari Ini", "Piutang Jatuh
   Tempo", "Stok Minus", "Persetujuan Menunggu" berisi "—" + tautan.
   Hanya "Persetujuan Menunggu" yang diisi data sungguhan.
2. PENTING: dashboard hanya untuk MASTER dan OPERATOR.
   SUPERVISOR TIDAK PUNYA DASHBOARD — navigasinya hanya 3 item:
   Pengecekan Invoice, Antrian Persetujuan, Laporan.
   Terapkan sekarang di app/config/navigation.ts, jangan ditunda ke Hari 22A.
3. Rapikan utang teknis kecil. Ini hari longgar terakhir sampai Hari 18.

DEFINITION OF DONE:
- Dashboard tidak menampilkan angka palsu/hardcode
- Login sebagai SUPERVISOR: sidebar hanya 3 item, / mengarahkan ke Pengecekan
- npm run build 0 error
```

### ✅ Verifikasi Hari 11

- [ ] 5 invarian hijau, jalan otomatis, < 60 detik
- [ ] Invarian ke-5 (Σ nilai lot = saldo Persediaan) hijau
- [ ] VOID membalik persis, bertanggal **hari ini**
- [ ] VOID atas lot terkonsumsi ditolak dengan pesan yang dimengerti operator
- [ ] VOID tanpa alasan ditolak
- [ ] Supervisor tidak punya dashboard
- [ ] **Jadwalkan review kode eksternal 2 jam** ← jangan dilewati
- [ ] `./scripts/verify.sh` hijau

---

## Hari 12 🛑 — Jurnal Manual + Saldo Awal  *(v2: Hari 9)*

### 🔧 Backend

```
KONTEKS: Hari 12 dari 37.

BERHENTI DAN BACA DULU: bentuk Saldo Awal belum dibahas dengan klien
(KONTEKS_REVISI Sec.4.1). Yang boleh dikerjakan hari ini: skema + endpoint +
mesin di baliknya. Yang HARUS ditunda: bentuk layar impornya dan format file
yang diterima. Kalau kamu merasa perlu menebak bentuk inputnya, berhenti dan
tanya saya.

TUGAS (BACKEND):
1. Jurnal Manual (MASTER only):
   - POST /journal-entries/manual lewat JournalPosterService
   - TOLAK baris yang menyentuh akun Persediaan, Piutang, Hutang — meski Master.
     Alasannya: ketiganya punya sub-ledger (lot, per-pelanggan, per-supplier).
     Jurnal manual ke sana membuat buku besar dan sub-ledger berpisah diam-diam,
     dan invarian 4 & 5 Hari 11 yang akan menemukannya, bukan penggunanya.
2. Saldo Awal terpadu — SATU alur, bukan dua:
   - saldo awal stok: membuat lot pembuka (movement_type 'opening') DAN jurnal
     pembuka dari ANGKA YANG SAMA. Dilarang dua input terpisah.
   - saldo awal piutang per pelanggan -> lewat resolveArAccount()
   - saldo awal hutang per supplier
   - semuanya bertanggal 1 SEPTEMBER 2026 (hari cut-over), dapat dikonfigurasi
   - PENGECUALIAN TANGGAL: saldo awal diinput Hari 36 (29 Agustus) tapi bertanggal
     1 September, jadi tanggalnya ADA DI DEPAN tanggal input. Kecualikan alur ini
     secara EKSPLISIT dari PeriodLockValidator — jangan melonggarkan validatornya
     untuk semua modul. Satu pengecualian bernama, bukan satu lubang.
3. Endpoint pengecekan: GET /opening-balance/verify yang membandingkan
   Sigma nilai lot pembuka dengan saldo akun Persediaan hasil jurnal pembuka.

ATURAN WAJIB HARI INI:
- Saldo awal WAJIB memakai StockRecorder dan JournalPoster yang sama dengan
  transaksi biasa. Tidak ada jalur khusus yang menulis langsung ke tabel.

DEFINITION OF DONE:
- Jurnal manual ke akun Persediaan -> 403 dengan pesan yang menjelaskan kenapa
- Saldo awal 3 produk menghasilkan 3 lot DAN 1 jurnal pembuka yang nilainya
  PERSIS sama (dibuktikan lewat invarian ke-5 Hari 11, bukan hitung manual)
- GET /opening-balance/verify mengembalikan selisih 0

SETELAH SELESAI: verify.sh + checklist DoD + daftar pertanyaan yang perlu saya
tanyakan ke klien soal bentuk input saldo awal.
```

### 🎨 Frontend

```
KONTEKS: Hari 12 dari 37. Bentuk layar impor saldo awal BELUM diputuskan klien.

TUGAS (FRONTEND):
1. HALAMAN JURNAL MANUAL DITUNDA KE PASCA-MVP (keputusan 29 Juli).
   Endpoint-nya tetap dibangun hari ini di backend; layarnya menyusul setelah
   30 Agustus. Master tidak akan memakai jurnal manual di bulan pertama —
   dan kalaupun perlu, ada saya.
2. Halaman Saldo Awal: bentuk PALING SEDERHANA dulu — tabel input manual
   (produk, qty, harga pokok) dengan <DataTable> yang sudah ada.
   JANGAN membangun importir Excel hari ini. Klien belum memutuskan bentuknya
   dan mengetik ulang importir lebih mahal daripada menunggu.
3. Tampilkan hasil GET /opening-balance/verify sebagai banner di halaman itu.

DEFINITION OF DONE:
- Banner verifikasi saldo awal menampilkan selisih
- Tidak ada layar jurnal manual yang terlanjur dibangun
```

### ✅ Verifikasi Hari 12

- [ ] Jurnal manual ke Persediaan → 403 (diuji lewat endpoint; layarnya pasca-MVP)
- [ ] Saldo awal menghasilkan lot + jurnal dari angka yang sama, selisih 0
- [ ] Saldo awal lewat `StockRecorder`/`JournalPoster`, bukan INSERT langsung
- [ ] Tidak ada importir Excel yang terlanjur dibangun
- [ ] Pertanyaan untuk klien soal bentuk saldo awal sudah ditulis
- [ ] `./scripts/verify.sh` hijau

---

## Hari 13 ♻️ — Mutasi Gudang Bercabang  *(v2: Hari 10)*

### 🔧 Backend

```
KONTEKS: Hari 13 dari 37. Tiga jenis gudang, tiga perilaku yang BERBEDA.
Kalau ketiganya diperlakukan sama, nilai persediaan bocor tanpa error.

TUGAS (BACKEND):
1. Migration `warehouse_mutations`(+lines) + nomor GD lewat DocumentCounter.
2. Tiga cabang perilaku:

   A. Tujuan TITIPAN_PELANGGAN (pelanggan sudah beli & sudah bayar, belum ambil)
      -> HANYA insert warehouse_mutations. TIDAK menyentuh stock_movements,
         product_stock_balance, maupun lots. TIDAK ada jurnal.
         Barangnya bukan milik toko lagi — itu sebabnya tidak boleh ada movement.
      -> Validasi: qty kumulatif titipan <= qty yang sudah dibeli pelanggan itu.
      -> get-or-create gudang titipan per pelanggan.

   B. STORE <-> BAD_STOCK
      -> 2 baris stock_movements type 'transfer', lot ikut pindah dengan
         unit_cost SAMA. TIDAK ada jurnal (nilai persediaan total tidak berubah).

   C. BAD_STOCK -> STORE
      -> sama seperti B, TAPI WAJIB otorisasi supervisor lewat
         StepUpService.requireApproval(), actionType BS_TO_STORE.
         Alasannya: barang jadi bisa dijual lagi. Arah sebaliknya bebas.

3. Nomor GD ikut kunci cetak (mekanismenya dibangun Hari 15 — siapkan kolomnya
   sekarang: print_status, print_count, printed_at).

ATURAN WAJIB HARI INI:
- unit_cost pada mutasi TIDAK PERNAH bisa diketik. Diambil dari lot asal, titik.
  Kalau bisa diubah, operator punya jalan mengubah nilai persediaan tanpa jurnal:
  pindah STORE -> BAD_STOCK, ubah harga, pindah balik. Tidak ada jurnal, tidak ada
  jejak, dan neraca bergerak tanpa satu baris pun mencatat kenapa.
- Lokasi selalu default STORE. Kolom lokasi per baris di sistem lama adalah
  warisan multi-outlet dan sengaja TIDAK ditiru.
- Alur "Permintaan Mutasi Gudang" di sistem lama TIDAK dipakai.

DEFINITION OF DONE:
- Mutasi ke TITIPAN_PELANGGAN menghasilkan 0 baris stock_movements (query buktinya)
- Titip melebihi qty yang dibeli pelanggan -> ditolak dengan pesan jelas
- STORE -> BAD_STOCK: lot di tujuan ber-unit_cost identik dengan lot asal
- BAD_STOCK -> STORE tanpa approval -> 412; setelah approval -> sukses
- Tidak ada endpoint mana pun yang menerima unit_cost dari body request

SETELAH SELESAI: verify.sh + checklist DoD + isi tabel lots sebelum/sesudah mutasi.
```

### 🎨 Frontend

```
KONTEKS: Hari 13 dari 37.

TUGAS (FRONTEND):
1. Halaman Mutasi Gudang: pilih gudang asal & tujuan, lalu baris produk + qty.
   - unit_cost DITAMPILKAN sebagai informasi, READ-ONLY, jelas terlihat tidak
     bisa diedit (bukan input disabled yang tampak seperti input)
   - kalau tujuan = STORE dan asal = BAD_STOCK, tampilkan peringatan bahwa
     aksi ini butuh persetujuan supervisor SEBELUM operator mengisi form
2. Riwayat mutasi dengan <DataTable>.
3. Nota mutasi: qty saja, TANPA nilai. Mutasi tidak menyentuh uang, jadi nota
   yang mencantumkan rupiah hanya mengundang salah tafsir.

DEFINITION OF DONE:
- unit_cost tidak bisa diketik dari layar mana pun
- Nota mutasi tidak memuat satu pun angka rupiah
- Peringatan approval muncul sebelum form diisi, bukan setelah submit
```

### ✅ Verifikasi Hari 13

- [ ] Mutasi ke titipan: **nol** baris `stock_movements`
- [ ] Titip melebihi qty dibeli → ditolak
- [ ] Lot pindah dengan `unit_cost` identik
- [ ] BS→STORE tanpa approval → 412
- [ ] `unit_cost` read-only di layar, dan tidak diterima dari body request
- [ ] Nota mutasi tanpa nilai rupiah
- [ ] `./scripts/verify.sh` hijau

---
---

# FASE 4 — PEMBELIAN (Hari 14–18)

---

## Hari 14 ⚠️♻️ — Faktur Pembelian (alur penuh)  *(v2: Hari 11)*

> Hari terberat di fase ini. Empat keputusan klien bertemu di satu endpoint:
> tiga tanggal terpisah, diskon dua tingkat, PPN masukan dikapitalisasi, dan barang bonus
> berharga nol. Salah satu saja meleset → invarian ke-5 Hari 11 merah sejak faktur pertama.

### 🔧 Backend

```
KONTEKS: Hari 14 dari 37. Dokumen mulai terbit dengan nomor sungguhan (B1) —
format nomor sudah tidak bisa diubah lagi setelah hari ini tanpa migrasi data.

TUGAS (BACKEND):
1. Migration:
   `purchase_invoices`: id, invoice_number (B1/RM01-YYMMXXXX), supplier_id,
     supplier_invoice_no (nomor faktur DARI supplier — tanpa ini rekonsiliasi
     dengan tagihan supplier tidak punya pegangan),
     receipt_date, supplier_invoice_date, due_date, term_days,
     subtotal, line_discount_total, invoice_discount_amount, invoice_discount_percent,
     input_vat_amount, total_amount NUMERIC(16,2),
     posting_status, print_status, print_count, review_status,
     void_reason_code, void_reason_note, timestamps
   `purchase_invoice_lines`: id, purchase_invoice_id, product_id, qty_input, unit_id,
     qty_base_unit, unit_price, discount_percent, discount_amount,
     allocated_invoice_discount, line_final_amount, input_vat, unit_cost_result,
     is_bonus (boolean)
   `goods_receipts`(+lines): dibuat OTOMATIS dari faktur, tidak diinput terpisah

   TIGA TANGGAL, SEMUANYA DISIMPAN TERPISAH — sistem lama klien memisahkannya
   dan nilainya memang berbeda:
     receipt_date          -> lot_date FIFO
     supplier_invoice_date -> dasar hitung jatuh tempo
     due_date              -> supplier_invoice_date + term_days
   Kalau digabung jadi satu kolom, urutan FIFO mengikuti tanggal yang salah
   TANPA satu pun error muncul.

2. Urutan hitung WAJIB, per baris (CLAUDE.md Sec.4):
   1. baris_kotor    = qty x harga
   2. diskon_baris   = persen ATAU rupiah (alternatif, bukan bertingkat)
   3. baris_bersih   = baris_kotor - diskon_baris
   4. subtotal       = Sigma baris_bersih
   5. alokasi[i]     = diskon_faktur x (baris_bersih[i] / subtotal)   <- PRO-RATA NILAI
   6. baris_final[i] = baris_bersih[i] - alokasi[i]
   7. ppn_masukan[i] = (supplier.is_pkp && product.is_bkp) ? baris_final[i] x tarif : 0
   8. harga_pokok[i] = baris_final[i] + (company_is_pkp ? 0 : ppn_masukan[i])
   9. lot.unit_cost  = harga_pokok[i] / qty dalam satuan dasar

   Sisa pembulatan langkah 5 dibebankan ke BARIS TERAKHIR supaya Sigma alokasi
   persis sama dengan diskon_faktur. Tanpa aturan ini nilai persediaan tidak akan
   pernah cocok dengan buku besar.

   Tarif PPN dari tabel tax_rates (effective_from/effective_to), BUKAN dari master
   produk dan BUKAN dari config.

3. Baris BONUS (is_bonus = true): melewati seluruh urutan di atas.
   baris_kotor 0, alokasi diskon 0, PPN 0, lot.unit_cost = 0.
   Qty tetap masuk stok penuh. Bonus SELALU produk yang sama dengan yang dibeli.

4. Jurnal (company_is_pkp = false, keadaan sekarang):
   Persediaan (D) Sigma harga_pokok      <- SUDAH termasuk PPN masukan
       Hutang Usaha (K) Sigma harga_pokok
   Siapkan cabang company_is_pkp = true (Persediaan = baris_final,
   PPN Masukan terpisah) walau belum dipakai.

5. Faktur pembelian SELALU masuk gudang STORE. Tidak pernah langsung ke BAD_STOCK.
   Field "stock ke" di sistem lama tidak ditiru.
6. Ongkos kirim TIDAK dikapitalisasi ke harga pokok — masuk biaya operasional
   (Hari 17). Jangan menambahkan kolom ongkir di faktur ini.
7. Field Adjust di sistem lama TIDAK dipakai. Order Pembelian TIDAK dibangun.

ATURAN WAJIB HARI INI:
- Diskon pembelian TIDAK PERNAH masuk jurnal. Ia larut ke harga pokok.
  Akun "Diskon Pembelian" TIDAK dibuat. Nilainya tetap disimpan di baris dan
  tercetak di faktur. Kalau metode bruto dipakai di sini, saldo akun Persediaan
  tidak akan pernah sama lagi dengan Sigma nilai lot.
- Tidak ada pembulatan. total_amount eksak sampai rupiah.
- Semua ini dalam SATU DB transaction: nomor, faktur, GR, stok, lot, jurnal.

DEFINITION OF DONE:
- 1 faktur 3 baris + 1 baris bonus:
  * jurnal balance
  * 4 lot terbentuk, satu di antaranya unit_cost = 0
  * Sigma alokasi diskon faktur PERSIS sama dengan invoice_discount_amount
  * total_amount persis sama dengan nota supplier, tanpa pembulatan
  * invarian ke-5 Hari 11 tetap hijau setelahnya
- Supplier non-PKP -> input_vat 0 meski produknya BKP
- Supplier PKP + produk non-BKP -> input_vat 0
- lot_date = receipt_date (buktikan dengan mengisi tiga tanggal yang berbeda)
- due_date = supplier_invoice_date + term_days, BUKAN receipt_date + term_days

SETELAH SELESAI: tampilkan isi purchase_invoice_lines dan stock_cost_lots untuk
faktur uji itu, plus jurnalnya, berdampingan.
```

### 🎨 Frontend

```
KONTEKS: Hari 14 dari 37. Form transaksi pertama yang sungguhan.
Operator memakai ini 11-12 kali sehari dalam pola burst (10 input dalam 20 menit,
lalu jeda 1-2 jam). Kejelasan lebih penting daripada kecepatan ekstrem.

TUGAS (FRONTEND):
1. Form Purchase Invoice multi-baris:
   - header: supplier, supplier_invoice_no, TIGA tanggal terpisah dengan label
     yang jelas (Tgl Terima Barang / Tgl Faktur Supplier / Jatuh Tempo),
     term_days mengisi due_date otomatis dari tgl faktur supplier
   - grid baris: produk (autocomplete display_name), qty + pilihan satuan
     (default DUS), kolom ISI (jumlah satuan dasar per satuan besar) DITAMPILKAN,
     harga, diskon (% atau Rp, alternatif), subtotal baris
   - checkbox "Bonus" per baris -> harga terkunci 0 dan diberi penanda visual
   - footer: subtotal, diskon faktur (% atau Rp), PPN masukan, TOTAL, semuanya live
2. Preview alokasi diskon faktur per baris ditampilkan sebelum simpan, supaya
   operator melihat ke mana diskonnya jatuh.
3. Input qty: SATU angka + pilihan satuan. BUKAN pola dua kolom KTN+PCS seperti
   sistem lama. Klien tidak pernah mencampur satuan dalam satu transaksi.

ATURAN WAJIB HARI INI:
- Format angka lewat useRupiah()/useQty(). Tidak ada toLocaleString tersebar.
- Tidak ada pembulatan di tampilan mana pun. Yang tampil = yang disimpan.

DEFINITION OF DONE:
- Menambah baris bonus tidak mengubah total faktur
- Mengubah diskon faktur memperbarui preview alokasi semua baris seketika
- Mengisi term_days mengisi due_date dari TGL FAKTUR SUPPLIER, bukan tgl terima
- npm run build 0 error, npm run lint bersih

SETELAH SELESAI: rekaman input satu faktur 3 baris + 1 bonus dari kosong sampai simpan.
```

### ✅ Verifikasi Hari 14

- [ ] Faktur 3 baris + 1 bonus → jurnal balance, 4 lot, satu ber-`unit_cost` 0
- [ ] Σ alokasi diskon faktur **persis** = `invoice_discount_amount`
- [ ] `total_amount` sama persis dengan nota supplier, tanpa pembulatan
- [ ] Invarian ke-5 Hari 11 tetap hijau setelah faktur masuk
- [ ] `lot_date` = `receipt_date`; `due_date` = `supplier_invoice_date` + termin
- [ ] Gerbang PPN: non-PKP supplier → 0; produk non-BKP → 0
- [ ] Tidak ada akun "Diskon Pembelian" di COA
- [ ] `./scripts/verify.sh` hijau

---

## Hari 15 ♻️ — Kunci Cetak Generik + Edit/VOID Pembelian  *(v2: Hari 12)*

> Mekanisme kunci cetak dibangun **sekali** di sini dan dipakai 7 dokumen:
> `JL`, `B1`, `GD`, `SJ`, `RJ`, `RB`, `PAY`. Kalau dibangun per modul, tujuh salinan
> aturan yang harus dijaga tetap sama — dan mereka tidak akan tetap sama.

### 🔧 Backend

```
KONTEKS: Hari 15 dari 37. Sistem lama klien (Affari) SUDAH punya tombol
"Btl Cetak" dan "Checked" — kunci cetak bukan konsep baru bagi mereka.
Yang kita tambahkan adalah otorisasi dan jejak audit yang selama ini tidak ada.

TUGAS (BACKEND):
1. Mekanisme kunci cetak GENERIK di src/core/print-lock/.
   TIGA SUMBU STATUS YANG TIDAK BOLEH DICAMPUR:
     posting_status : POSTED -> VOIDED
     print_status   : NOT_PRINTED -> PRINTED -> PRINT_CANCELLED
     review_status  : BELUM_DICEK -> DISETUJUI / BERMASALAH
   Tiga kolom terpisah. Jangan digabung jadi satu enum "status" — begitu digabung,
   dokumen yang sudah dicetak dan disetujui lalu di-VOID kehilangan dua informasi.

2. Aturan:
   - Cetak ulang IDENTIK: bebas, tanpa izin. print_count++, dicatat di audit_logs.
   - Edit atau VOID SETELAH dicetak: wajib batal cetak dulu.
     SATU PERMINTAAN, SATU PERSETUJUAN, dengan niat dideklarasikan DI DEPAN:
       actionType: UNLOCK_PRINT, intent: EDIT | VOID, reason wajib.
     Token yang disetujui untuk VOID HANYA bisa dipakai untuk VOID.
     Kalau intent tidak diikat, satu approval "mau perbaiki typo" bisa dipakai
     menghapus faktur.
   - Nota hasil revisi wajib mencantumkan NOMOR REVISI.
   - Dokumen VOIDED BOLEH dicetak ulang DENGAN TANDA VOID untuk arsip.

3. Terapkan ke purchase_invoices + tambahkan kolom ke enam tabel dokumen lain
   (yang sudah ada) supaya modul berikutnya tinggal memakai.

4. Edit bersyarat + VOID Purchase Invoice lewat VoidEngine Hari 11:
   - edit ditolak kalau lot sudah terkonsumsi
   - VOID ditolak kalau lot sudah terkonsumsi sebagian ("sudah terjual, buat retur")

ATURAN WAJIB HARI INI:
- Satu mekanisme, tujuh pemakai. Kalau kamu menulis logika print_status di dalam
  modul purchase-invoice, berhenti dan pindahkan ke core.
- consumeApproval() memvalidasi ulang payload (Hari 9). Token UNLOCK_PRINT untuk
  dokumen A tidak boleh bisa dipakai untuk dokumen B.

DEFINITION OF DONE:
- Cetak ulang identik: print_count naik, tidak ada permintaan izin, masuk audit_logs
- Edit setelah PRINTED tanpa batal cetak -> ditolak
- Token ber-intent EDIT dipakai untuk VOID -> ditolak
- Token UNLOCK_PRINT dokumen A dipakai di dokumen B -> ditolak
- Dokumen VOIDED tetap bisa dicetak, hasilnya bertanda VOID
- Edit setelah lot terkonsumsi -> ditolak dengan pesan berbahasa Indonesia yang
  bisa dibaca operator, bukan pesan teknis

SETELAH SELESAI: verify.sh + checklist DoD + daftar 7 dokumen yang sudah punya
kolom kunci cetak.
```

### 🎨 Frontend

```
KONTEKS: Hari 15 dari 37.

TUGAS (FRONTEND):
1. Komponen <DocumentActions> generik: menampilkan tombol Cetak / Batal Cetak /
   Edit / VOID sesuai kombinasi tiga sumbu status. Dibuat SEKALI, dipakai 7 dokumen.
   - tombol yang tidak berlaku: SEMBUNYIKAN, jangan tampilkan lalu tolak
   - Batal Cetak membuka dialog yang MEMINTA NIAT DI DEPAN:
     "Mau diapakan setelah dibatalkan? [Diperbaiki] [Dibatalkan/VOID]" + alasan
2. Halaman detail Purchase Invoice memakai komponen itu.
3. Badge status: tiga badge terpisah (posting / cetak / pengecekan), bukan satu.

DEFINITION OF DONE:
- <DocumentActions> tidak memuat satu pun logika khusus pembelian
- Operator melihat tiga badge status yang berbeda dan mengerti bedanya
- Dialog batal cetak memaksa memilih niat sebelum tombol kirim aktif
```

### ✅ Verifikasi Hari 15

- [ ] Kunci cetak hidup di `src/core/`, bukan di modul pembelian
- [ ] Cetak ulang identik bebas, `print_count++`, masuk `audit_logs`
- [ ] Edit setelah dicetak tanpa batal cetak → ditolak
- [ ] Token `intent: EDIT` dipakai untuk VOID → ditolak
- [ ] Token dokumen A dipakai di dokumen B → ditolak
- [ ] Dokumen VOIDED bisa dicetak dengan tanda VOID
- [ ] Tujuh tabel dokumen sudah punya kolom kunci cetak
- [ ] `./scripts/verify.sh` hijau

---

## Hari 16 ♻️🛑 — Retur Pembelian (dari BAD_STOCK)  *(v2: Hari 13)*

### 🔧 Backend

```
KONTEKS: Hari 16 dari 37.

BERHENTI DAN BACA DULU — PR TERBUKA #2 (KONTEKS_REVISI Sec.4.2):
Lot yang lahir dari retur pelanggan punya supplier_id NULL. Klien meminta supplier
asal dilacak, tapi barang yang dikembalikan pelanggan tidak punya jejak supplier
yang bersih. Belum diputuskan: boleh diretur ke supplier mana pun, atau diblokir?
Bangun alurnya untuk lot yang supplier_id-nya TERISI. Untuk yang NULL, tulis
TODO eksplisit dan BERHENTI. Jangan menebak — pilihan yang salah di sini baru
ketahuan setelah barang telanjur diretur ke supplier yang keliru.

TUGAS (BACKEND):
1. Migration `purchase_returns`(+lines) + nomor RB. Ikut kunci cetak Hari 15.
2. Alur WAJIB: pilih SUPPLIER dulu -> daftar bad stock DISARING ke produk yang
   pernah dibeli dari supplier itu -> pilih barang.
   TIDAK menunjuk faktur pembelian asal. Ini beda dari retur penjualan.
3. Retur SELALU mengambil dari gudang BAD_STOCK, tidak pernah dari STORE.
4. Nilai retur DINEGOSIASIKAN dengan supplier dan bisa berbeda dari harga pokok
   lot. Prinsip klien: ambil yang menguntungkan toko.
   Contoh: beli 90.000, harga kini 87.000 -> minta retur 90.000.
           beli 90.000, harga kini 92.000 -> minta retur 92.000.
   Jurnal:
     Hutang Usaha / Kas       (D) nilai_retur_disepakati
         Persediaan               (K) Sigma harga pokok lot (FIFO dari BAD_STOCK)
         Selisih Retur Pembelian  (K) selisih, bila nilai_retur > harga pokok
   Bila nilai_retur < harga pokok, akun Selisih Retur Pembelian jadi DEBIT.
   Klien menyatakan ini tidak akan terjadi, tapi sistem WAJIB menanganinya —
   "tidak akan terjadi" bukan alasan untuk membuat jurnal yang tidak balance.
5. settlement_type: REDUCE_INVOICE | CASH.
6. Akun Retur Pembelian TIDAK ADA (sistem perpetual). Persediaan langsung dikredit.
7. Tukar barang dengan supplier = DUA DOKUMEN, bukan satu tombol:
   Retur Pembelian (RB) lalu Faktur Pembelian (B1) baru. Hutang saling menutup.
   Jangan membuat fitur "tukar" yang menggabungkan keduanya.

DEFINITION OF DONE:
- Pilih supplier -> daftar BS tersaring, produk yang tidak pernah dibeli dari
  supplier itu TIDAK muncul
- Retur di atas harga pokok -> Selisih Retur Pembelian KREDIT, jurnal balance
- Retur di bawah harga pokok -> Selisih Retur Pembelian DEBIT, jurnal balance
- Stok BS berkurang dari lot yang benar (FIFO dari BAD_STOCK)
- Invarian ke-5 Hari 11 tetap hijau
- Lot ber-supplier_id NULL: ditandai TODO, tidak dipaksa jalan

SETELAH SELESAI: verify.sh + checklist DoD + pertanyaan PR #2 dalam bentuk yang
bisa saya kirim langsung ke klien.
```

### 🎨 Frontend

```
KONTEKS: Hari 16 dari 37.

TUGAS (FRONTEND):
1. Halaman Retur Pembelian, urutan layar mengikuti urutan berpikir operator:
   pilih supplier -> daftar bad stock tersaring muncul -> centang barang -> isi
   nilai retur yang disepakati per baris -> pilih settlement_type -> simpan.
2. Tampilkan harga pokok lot di sebelah kolom nilai retur, supaya operator tahu
   posisi tawarnya. Ini SATU-SATUNYA tempat harga pokok boleh dilihat operator —
   di form penjualan tidak boleh.
3. Cetak nota retur A5 + <DocumentActions> dari Hari 15.

DEFINITION OF DONE:
- Daftar BS kosong sampai supplier dipilih (bukan menampilkan semua lalu memfilter)
- Selisih nilai retur vs harga pokok tampil live per baris
```

### ✅ Verifikasi Hari 16

- [ ] Daftar BS tersaring per supplier; produk lain tidak muncul
- [ ] Selisih retur ke atas → kredit; ke bawah → debit; keduanya balance
- [ ] Stok BS berkurang dari lot FIFO yang benar
- [ ] Invarian ke-5 tetap hijau
- [ ] Tidak ada akun "Retur Pembelian" di COA
- [ ] Tidak ada fitur "tukar barang" satu tombol
- [ ] **Pertanyaan PR #2 sudah dikirim ke klien**
- [ ] `./scripts/verify.sh` hijau

---

## Hari 17 🛑 — Biaya Operasional + Approval Kas Besar  *(v2: Hari 14)*

### 🔧 Backend

```
KONTEKS: Hari 17 dari 37.

BERHENTI DAN BACA DULU: modul biaya operasional DITUNDA klien
(KONTEKS_REVISI Sec.4.1). Dua hal yang SUDAH PASTI dibutuhkan dan boleh
dikerjakan hari ini:
  (a) ongkos kirim pembelian — sudah diputuskan masuk biaya operasional,
      tidak dikapitalisasi ke harga pokok
  (b) gaji harian salesman — masuk biaya operasional tanpa dikaitkan ke salesman,
      karena tidak ada komisi
Sisanya (kategori biaya, alur persetujuan bertingkat, anggaran) TUNGGU JAWABAN.

TUGAS (BACKEND):
1. Migration `operational_expenses` + CRUD + jurnal + VOID lewat VoidEngine.
2. APPROVAL PENGELUARAN KAS BESAR:
   - chart_of_accounts.requires_outflow_approval (boolean, dicentang MASTER
     untuk akun Kas Besar)
   - settings.cash_outflow_approval_threshold (nominal ambang)
   - Karena syaratnya bergantung pada ISI transaksi (akun mana + nominal berapa),
     BUKAN sekadar role, pakai StepUpService.requireApproval() yang dipanggil
     DARI DALAM SERVICE dan melempar 412 dengan kontrak yang sama seperti guard.
     Frontend cukup punya satu jalur penanganan — yang sudah dibuat Hari 9.
   - actionType: CASH_OUTFLOW. context_summary WAJIB memuat nama akun dan nominal.

ATURAN WAJIB HARI INI:
- Ambang persetujuan TIDAK ditampilkan ke operator. Kontrol ini menghadang saat
  dilanggar, tidak mengajari cara menghindarinya.
- VOID menghasilkan jurnal pembalik bertanggal hari ini; baris asli tetap ada.

DEFINITION OF DONE:
- Pengeluaran di bawah ambang dari akun bertanda -> langsung sukses
- Pengeluaran di atas ambang -> 412, context_summary terbaca supervisor
- Pengeluaran di atas ambang dari akun TIDAK bertanda -> langsung sukses
- VOID menghasilkan pembalik, baris asli tetap ada
- Ongkir pembelian bisa dicatat dan TIDAK menyentuh nilai lot mana pun

SETELAH SELESAI: verify.sh + checklist DoD + daftar pertanyaan biaya operasional
untuk klien.
```

### 🎨 Frontend

```
KONTEKS: Hari 17 dari 37.

TUGAS (FRONTEND):
1. Halaman Biaya Operasional: bentuk paling sederhana — tanggal, akun biaya,
   akun kas sumber, nominal, keterangan, lampiran opsional.
2. Alur 412 memakai <StepUpDialog> yang sudah ada. Jangan bikin alur baru.
3. JANGAN membangun kategori biaya, anggaran, atau persetujuan bertingkat.
   Belum diputuskan klien.

DEFINITION OF DONE:
- Pengeluaran di atas ambang memicu <StepUpDialog>, lalu lanjut sendiri setelah
  disetujui
- Tidak ada angka ambang yang bocor ke layar operator
```

### ✅ Verifikasi Hari 17

- [ ] 412 hanya muncul untuk akun bertanda **dan** di atas ambang
- [ ] `context_summary` memuat nama akun + nominal
- [ ] Ambang tidak pernah tampil di layar operator
- [ ] Ongkir tercatat sebagai biaya, tidak menyentuh lot
- [ ] Tidak ada fitur yang dibangun di luar (a) dan (b)
- [ ] Pertanyaan biaya operasional sudah ditulis untuk klien
- [ ] `./scripts/verify.sh` hijau

---

## Hari 18 — BUFFER TERPAKAI + CRUD COA Penuh  *(v2: Hari 15)*

### 🔧 Backend

```
KONTEKS: Hari 18 dari 37. Hari ini separuh buffer, separuh pekerjaan.
Kalau Fase 4 meninggalkan sisa, KERJAKAN SISANYA DULU sebelum menyentuh COA.

TUGAS (BACKEND):
1. CRUD COA penuh untuk MASTER:
   - is_cash_account (boolean) — menandai akun kas/bank supaya muncul di form
     pembayaran. Akun kas & bank TIDAK di-seed; Master yang membuatnya.
   - requires_outflow_approval (dari Hari 17)
   - akun piutang custom untuk customers.ar_account_id
2. Kunci penting: ar_account_id pelanggan TERKUNCI selama saldo pelanggan itu
   belum nol. Mengubah akun piutang di tengah jalan memindahkan saldo tanpa jurnal.
3. Audit: pastikan KELIMA tempat yang menyentuh akun piutang memakai
   resolveArAccount() dari Hari 8 — faktur penjualan, alokasi pembayaran, retur
   penjualan, pembalikan VOID, saldo awal piutang.
   Grep-lah. Satu saja yang menulis akun default langsung -> saldo pelanggan
   bocor tanpa error apa pun.

DEFINITION OF DONE:
- Master membuat akun kas baru -> langsung muncul di dropdown form pembayaran
- Mengubah ar_account_id pelanggan bersaldo -> ditolak dengan pesan jelas
- Grep membuktikan tidak ada pembacaan akun piutang di luar resolveArAccount()
- Sisa pekerjaan Fase 4 (kalau ada) sudah beres dan dicatat di PROGRESS.md
```

### 🎨 Frontend

```
KONTEKS: Hari 18 dari 37.

TUGAS (FRONTEND):
1. Form tambah/ubah akun COA (MASTER only) dengan checkbox is_cash_account dan
   requires_outflow_approval, keduanya berlabel bahasa manusia.
2. Dropdown ar_account_id di form pelanggan: TERSARING hanya akun bertipe piutang
   yang aktif. Bukan seluruh COA lalu berharap Master memilih yang benar.
3. Sisa polish Fase 4.

DEFINITION OF DONE:
- Dropdown akun piutang tidak memuat satu pun akun non-piutang
- Field terkunci saat pelanggan masih bersaldo, dengan penjelasan kenapa
```

### ✅ Verifikasi Hari 18

- [ ] Akun kas baru langsung terpakai di form pembayaran
- [ ] `ar_account_id` terkunci saat saldo ≠ 0
- [ ] Grep: tidak ada pembacaan akun piutang di luar `resolveArAccount()`
- [ ] Dropdown akun piutang tersaring
- [ ] Sisa Fase 4 beres, drift tercatat di `PROGRESS.md` §0
- [ ] `./scripts/verify.sh` hijau

---
---

# FASE 5 — PENJUALAN (Hari 19–23A)

---

## Hari 19 ♻️ — Sales Order + Saluran Penjualan  *(v2: Hari 16)*

### 🔧 Backend

```
KONTEKS: Hari 19 dari 37. Di sistem lama, order penjualan berjumlah 0 record —
selama ini ditulis manual di kertas. Klien ingin memindahkannya ke program.
Ini satu-satunya modul di daftar potong yang TIDAK BOLEH dipotong.

TUGAS (BACKEND):
1. Migration `sales_orders`(+lines) + nomor SO + CRUD + convert-to-invoice.
2. SALURAN PENJUALAN sebagai field EKSPLISIT di faktur (bukan disimpulkan):
     PENGIRIMAN : Sales Order WAJIB, surat jalan ya, nota dibawa sopir untuk menagih
     TOKO       : Sales Order tidak perlu, tanpa surat jalan, nota diserahkan di tempat
   Validasi: faktur bersaluran PENGIRIMAN tanpa SO -> ditolak.
   Jangan menyimpulkan saluran dari ada/tidaknya surat jalan. Simpulan itu benar
   99% waktu dan salah persis saat ada yang tidak beres.
3. SALES ORDER TIDAK IKUT KUNCI CETAK dan TIDAK MASUK Laporan Kontinuitas Nomor
   (keputusan 29 Juli). SO bukan dokumen yang mengikat uang atau stok.
4. SALES ORDER TIDAK MENAHAN STOK. Qty terikat SO terbuka hanya DITAMPILKAN
   sebagai informasi. Stok berkurang saat faktur, bukan saat SO.
   Sediakan endpoint GET /products/:id/committed-qty untuk angka informatif itu.
5. SO yang sudah CONVERTED tidak bisa diubah.

ATURAN WAJIB HARI INI:
- Tidak ada status DRAFT di dokumen mana pun. Draft membakar nomor dokumen dan
  meninggalkan lubang yang harus dijustifikasi ke pemilik. Kalau butuh "simpan
  sementara", itulah gunanya Sales Order.

DEFINITION OF DONE:
- Faktur PENGIRIMAN tanpa SO -> ditolak dengan pesan jelas
- Faktur TOKO tanpa SO -> sukses
- SO terbuka TIDAK mengurangi qty tersedia di endpoint stok mana pun
- SO CONVERTED tidak bisa diubah
- Nomor SO tidak pernah lompat, bahkan saat pembuatan gagal di tengah
```

### 🎨 Frontend

```
KONTEKS: Hari 19 dari 37.

TUGAS (FRONTEND):
1. Halaman Sales Order: form mirip faktur tapi lebih ringan (tanpa harga pokok,
   tanpa jurnal). Tombol "Jadikan Faktur".
2. Di layar stok dan autocomplete produk, tampilkan "terikat SO: N" sebagai
   INFORMASI terpisah dari sisa stok. Jangan mengurangi angka sisa stok —
   operator harus melihat keduanya, bukan satu angka yang sudah dicampur.
3. Pilihan saluran penjualan di form faktur: dua tombol besar (PENGIRIMAN / TOKO),
   dipilih SEBELUM mengisi baris, karena menentukan wajib-tidaknya SO.

DEFINITION OF DONE:
- Sisa stok dan qty terikat SO tampil sebagai dua angka terpisah
- Memilih PENGIRIMAN tanpa SO menampilkan penjelasan sebelum submit, bukan setelah
```

### ✅ Verifikasi Hari 19

- [ ] Faktur `PENGIRIMAN` tanpa SO ditolak; `TOKO` tanpa SO sukses
- [ ] SO terbuka tidak mengurangi stok tersedia di endpoint mana pun
- [ ] Sisa stok & qty terikat SO tampil terpisah di layar
- [ ] SO `CONVERTED` tidak bisa diubah
- [ ] Tidak ada status DRAFT di dokumen mana pun
- [ ] `./scripts/verify.sh` hijau

---

## Hari 20 ⚠️🛑 — Price Suggestion + Skema Faktur Penjualan  *(v2: Hari 17)*

> **Panel riwayat harga bukan kenyamanan.** Harga jual berbeda per pelanggan dan
> fluktuatif — produk yang sama bisa 119 rb, 120 rb, 121 rb ke pelanggan berbeda.
> Harga master hanya seed dan tidak dipakai di lapangan. Tanpa panel ini operator
> **tidak punya cara** mengetahui harga yang benar. Ini di daftar tidak-boleh-dipotong.

### 🔧 Backend

```
KONTEKS: Hari 20 dari 37. Ini JALUR TERPANAS APLIKASI — dipanggil tiap kali
operator mengetik baris faktur.

BERHENTI DAN BACA DULU — PR TERBUKA #3 (KONTEKS_REVISI Sec.4.2):
Panel disaring per satuan. Kalau sebuah produk belum pernah dijual dalam satuan
renceng ke siapa pun, fallback terakhir adalah harga master — yang klien bilang
tidak dipakai. Belum diputuskan: tampilkan harga master, atau tampilkan kosong
dengan pesan jelas? Bangun fallback tingkat 1 dan 2 sekarang; tingkat 3 tulis
di belakang satu flag dan BERHENTI.

TUGAS (BACKEND):
1. GET /price-suggestion?customerId=&productId=&unitId=
   - 10 TRANSAKSI TERAKHIR untuk kombinasi pelanggan + produk + SATUAN YANG
     SEDANG DIKETIK, dari faktur yang TIDAK VOID
   - kolom: Tanggal, Qty, Satuan, @Harga
   - fallback berurutan:
     (1) pelanggan + produk + satuan
     (2) produk + satuan, ke pelanggan mana pun
     (3) harga master   <- PR #3, di belakang flag
2. OPTIMASI YANG DIPUTUSKAN SEKARANG, BUKAN NANTI:
   customer_id DIDENORMALISASI ke sales_invoice_lines, dengan indeks
   (customer_id, product_id, unit_id, id DESC).
   Ini ditulis DI MIGRATION INI. Menambahkannya setelah tabel berisi data berarti
   backfill + reindex di mesin klien yang HDD.
3. Migration `sales_invoices`(+lines):
   - saluran penjualan, salesman_id, term_days (diinput PER FAKTUR, bukan dari
     master pelanggan; nilai default boleh diambil dari faktur terakhir pelanggan itu)
   - unit_cost_fifo per baris (diisi saat posting Hari 21) — retur penjualan
     nanti WAJIB memakai angka ini, bukan harga pokok baru
   - kolom kunci cetak + review_status + void_reason_*

ATURAN WAJIB HARI INI:
- BAHAYA YANG HARUS DICEGAH: harga dus dan harga renceng berbeda sebesar angka
  konversi (bisa 25x). Panel WAJIB menampilkan kolom satuan, dan WAJIB berganti
  isi saat satuan yang diketik berganti. Kalau tidak, operator akan melihat harga
  dus lalu memakainya untuk renceng.
- Target < 300 ms. Kalau meleset, cek indeks dulu, jangan tambah cache.

DEFINITION OF DONE:
- Pilih pelanggan + produk -> 10 harga terakhir muncul < 300 ms
- Ganti satuan DUS -> RENCENG mengubah isi panel
- Faktur VOID tidak pernah muncul di panel
- EXPLAIN ANALYZE menunjukkan indeks (customer_id, product_id, unit_id, id DESC)
  benar-benar dipakai — tempelkan outputnya
```

### 🎨 Frontend

```
KONTEKS: Hari 20 dari 37. Form penjualan adalah layar yang paling sering dilihat
operator. Tiga hal di daftar tidak-boleh-dipotong ada di sini: panel riwayat harga,
sisa stok saat mengetik, dan modal tambah pelanggan.

TUGAS (FRONTEND):
1. Mulai form Sales Invoice:
   - autocomplete produk berdasarkan display_name (operator mencari lewat nama,
     bukan kode)
   - kolom ISI ditampilkan di grid
   - qty: satu angka + pilihan satuan, default DUS
   - <StockBadge> dari Hari 10: sisa stok tampil SAAT MENGETIK, bukan setelah simpan
2. PANEL RIWAYAT HARGA di sebelah baris yang sedang diketik:
   - 10 baris: Tanggal, Qty, Satuan, @Harga
   - KOLOM SATUAN WAJIB TERLIHAT, jangan disembunyikan demi ruang
   - panel ini REFERENSI, bukan pilihan: harga tetap diketik manual.
     Klien secara eksplisit meminta ini. Jangan bikin baris panel bisa diklik
     untuk mengisi harga.
3. MODAL TAMBAH PELANGGAN dari dalam form (bukan pindah halaman).
   Modal ini menyimpan ar_account_id NULL — operator tidak pernah melihat
   field itu, dan tidak butuh akses COA.
4. Ctrl+H (ubah harga) dan Ctrl+D (ubah diskon): pola dari sistem lama yang
   dipertahankan, TAPI WAJIB DIBUAT TERLIHAT. Operator lama tidak tahu cara
   memakainya selama bertahun-tahun. Tampilkan petunjuknya di layar, jangan
   mengandalkan orang mengingat.

ATURAN WAJIB HARI INI:
- Ergonomi keyboard diturunkan ke "cukup baik" (disetujui klien): navigasi
  keyboard tetap dibangun, tapi tidak dipoles sampai bebas-mouse total.
  Yang TIDAK boleh diturunkan: panel harga, sisa stok, modal tambah pelanggan.

DEFINITION OF DONE:
- Panel muncul < 300 ms setelah produk dipilih, dengan kolom satuan terlihat
- Mengganti satuan mengubah isi panel
- Modal tambah pelanggan menyimpan dan langsung terpilih di form
- Petunjuk Ctrl+H / Ctrl+D terlihat tanpa perlu dihafal
```

### ✅ Verifikasi Hari 20

- [ ] Panel 10 harga muncul < 300 ms, **kolom satuan terlihat**
- [ ] Ganti satuan → isi panel ikut berganti
- [ ] Faktur VOID tidak muncul di panel
- [ ] `EXPLAIN ANALYZE` membuktikan indeks denormalisasi dipakai
- [ ] Baris panel **tidak** bisa diklik untuk mengisi harga
- [ ] Modal tambah pelanggan jalan, `ar_account_id` NULL
- [ ] Sisa stok tampil saat mengetik
- [ ] **Pertanyaan PR #3 sudah dikirim ke klien**
- [ ] `./scripts/verify.sh` hijau

---

## Hari 21 ⚠️♻️ — POST /sales-invoices + Batas Jual di Bawah Harga Pokok  *(v2: Hari 18)*

### 🔧 Backend

```
KONTEKS: Hari 21 dari 37. Endpoint paling ramai di aplikasi.

TUGAS (BACKEND):
1. POST /sales-invoices alur penuh dalam SATU transaction:
   nomor -> faktur -> StockRecorder.recordOut -> JournalPoster -> selesai.
   Gagal di tengah = rollback penuh, termasuk nomornya.
2. RUMUS (CLAUDE.md Sec.4):
   baris_kotor   = qty x unit_price
   diskon_baris  = persen ATAU rupiah (alternatif, bukan bertingkat)
   baris_bersih  = baris_kotor - diskon_baris
   subtotal      = Sigma baris_bersih
   diskon_faktur = persen ATAU rupiah, atas subtotal
   total_diskon  = Sigma diskon_baris + diskon_faktur
   ppn           = company_is_pkp ? (subtotal - diskon_faktur) x tarif : 0
   total_amount  = subtotal - diskon_faktur + ppn      <- EKSAK, TIDAK DIBULATKAN

   TIDAK ADA PEMBULATAN di dokumen mana pun. Aturan pembulatan kelipatan 100 dari
   v1 SUDAH DICABUT dan akun Pendapatan Pembulatan TIDAK dibuat. Selisih
   diselesaikan saat alokasi pembayaran (CLAUDE.md Sec.2 aturan 18), bukan di sini.

   Syarat PPN keluaran HANYA company_is_pkp. Status PKP pelanggan TIDAK menentukan
   apakah PPN dipungut — hanya menentukan apakah pelanggan bisa mengkreditkannya.

3. Jurnal metode BRUTO (pendapatan dicatat kotor, diskon jadi akun kontra):
   Piutang/Kas      (D) total_amount
   Diskon Penjualan (D) total_diskon
       Pendapatan       (K) Sigma baris_kotor
       PPN Keluaran     (K) ppn
   HPP              (D) totalCOGS
       Persediaan       (K) totalCOGS
   Akun piutang lewat resolveArAccount(), BUKAN akun default langsung.

4. BATAS JUAL DI BAWAH HARGA POKOK:
   - batas = getLatestCostBasis(product) dari Hari 10 (lot terbaru yang
     unit_cost > 0 — LOT BONUS BERHARGA NOL WAJIB DILEWATI) x angka konversi
     ke satuan baris
   - dibandingkan terhadap HARGA BERSIH SETELAH DISKON, bukan harga kotor
   - nilai batasnya TIDAK DITAMPILKAN ke operator; hanya menghadang saat dilanggar
   - produk yang belum pernah dibeli (belum ada lot) -> TIDAK ADA batas, jangan error
   - actionType SELL_BELOW_COST, SATU PERMINTAAN PER FAKTUR yang memuat SEMUA
     baris yang melanggar — bukan satu permintaan per baris. Operator tidak boleh
     dipaksa memanggil supervisor lima kali untuk satu nota.

ATURAN WAJIB HARI INI:
- Kalau lot bonus tidak dilewati, batas jual-rugi jadi nol dan kontrol ini
  BERHENTI BEKERJA tanpa satu pun error muncul. Tulis test khusus untuk kasus:
  produk dibeli 100.000, lalu dapat bonus (lot 0), lalu dijual 50.000 ->
  HARUS tetap tertahan.
- unit_cost_fifo per baris WAJIB disimpan. Retur penjualan Hari 23 memakainya.

DEFINITION OF DONE:
- Faktur bertotal 33.253.125 tersimpan APA ADANYA (tidak jadi 33.253.100)
- Produk yang lot terbarunya bonus tetap memakai lot berbayar terakhir sebagai batas
- Produk tanpa lot -> tidak ada batas, tidak error
- Satu faktur dengan 3 baris melanggar -> SATU permintaan approval, bukan tiga
- Jurnal balance; invarian 1-5 Hari 11 semuanya tetap hijau
- unit_cost_fifo terisi di setiap baris
```

### 🎨 Frontend

```
KONTEKS: Hari 21 dari 37. Melanjutkan form dari Hari 20.

TUGAS (FRONTEND):
1. Preview total live: subtotal, diskon baris, diskon faktur, PPN, TOTAL.
   Angka yang tampil = angka yang disimpan. Tidak ada pembulatan tampilan.
2. Diskon per baris DAN per faktur, keduanya persen ATAU rupiah (alternatif,
   bukan bertingkat). Diskon jarang dipakai tapi tetap ada sebagai konvensi.
3. Saat backend menolak dengan SELL_BELOW_COST:
   - <StepUpDialog> muncul SEKALI untuk seluruh faktur
   - daftar baris yang melanggar ditampilkan TANPA menyebut nilai batasnya
   - setelah disetujui, faktur dikirim ulang otomatis
4. Ctrl+H dan Ctrl+D dengan petunjuk terlihat (lanjutan Hari 20).

DEFINITION OF DONE:
- Total di layar identik dengan total di DB, sampai satuan rupiah
- Tiga baris melanggar -> satu dialog, bukan tiga
- Tidak ada angka harga pokok atau batas yang bocor ke layar operator
```

### ✅ Verifikasi Hari 21

- [ ] Total eksak, tidak dibulatkan, di layar maupun di DB
- [ ] Tidak ada akun Pendapatan Pembulatan di COA
- [ ] PPN keluaran hanya digerbangi `company_is_pkp`
- [ ] Batas jual-rugi **melewati** lot bonus — ada test khususnya
- [ ] Produk tanpa lot tidak error
- [ ] Satu permintaan approval per faktur, bukan per baris
- [ ] Batas tidak pernah ditampilkan ke operator
- [ ] `unit_cost_fifo` terisi; invarian 1–5 hijau
- [ ] `./scripts/verify.sh` hijau

---

## Hari 22 ♻️ — Edit/VOID Penjualan + Cetak Nota A5  *(v2: Hari 19)*

### 🔧 Backend

```
KONTEKS: Hari 22 dari 37. Mekanisme kunci cetak sudah ada sejak Hari 15 —
hari ini memakainya, bukan membangunnya ulang.

TUGAS (BACKEND):
1. Edit bersyarat + VOID Sales Invoice lewat VoidEngine + print-lock.
   VOID oleh OPERATOR WAJIB lewat authorization_requests (step-up).
2. VOID mengembalikan qty_remaining ke LOT ASAL sesuai stock_cost_consumptions,
   bukan membuat lot baru.
3. Endpoint cetak: kembalikan data + nomor revisi + penanda VOID bila perlu.
4. Faktur yang di-VOID tetap punya nomor dan tetap muncul di Laporan Kontinuitas
   (Hari 28). Nomor tidak boleh hilang, dan void_reason_note WAJIB terisi.

DEFINITION OF DONE:
- VOID mengembalikan stok & lot persis seperti semula (bandingkan isi tabel lots
  sebelum dan sesudah)
- VOID oleh Operator memicu step-up; oleh Master tidak
- Edit setelah dicetak tanpa batal cetak -> ditolak
- Nota revisi membawa nomor revisi yang naik
```

### 🎨 Frontend

```
KONTEKS: Hari 22 dari 37. FORMAT NOTA: klien menjanjikan contoh 27 Juli dan
belum mengirimkannya (PROGRESS.md Sec.1). Kalau sampai hari ini belum ada,
pakai LAYOUT STANDAR sesuai aturan cadangan, dan catat di PROGRESS.md Sec.3
bahwa revisi format masuk pasca-MVP.

TUGAS (FRONTEND):
1. CETAK NOTA — semua dokumen A5 LANDSCAPE, DUA PER LEMBAR A4 PORTRAIT,
   dipotong mendatar. Klien mencetak di kertas A5 kosong hasil membelah A4.
   - MUAT 14 BARIS per halaman; lebih dari itu lanjut ke halaman 2 (Hal. 1/2)
   - di lapangan tidak pernah lebih dari 20 SKU, rata-rata 2-7
2. Kepala nota: identitas toko dari settings (nama, kota, telepon) — yang kosong
   TIDAK DICETAK. Lalu nama toko tujuan (pelanggan) dan kotanya bila ada.
3. Kolom mengikuti kebiasaan nota lama klien:
   NO, BARCODE, NAMA PRODUK, QTY, HARGA @, DISC %, DISC RP, JUMLAH
   plus JTH. TEMPO, MEMO, SALES.
   Satuan TIDAK perlu dicetak eksplisit di kolom QTY — hampir semua transaksi
   memakai satuan Dus.
4. Kaki nota: baris audit cetak (siapa & kapan), sesuai kebiasaan sistem lama.
5. Dokumen VOIDED dicetak DENGAN TANDA VOID yang jelas, untuk arsip.
6. Nota revisi mencantumkan nomor revisi.

ATURAN WAJIB HARI INI:
- Uji cetak SUNGGUHAN ke kertas, bukan hanya preview browser. Dua nota A5 harus
  jatuh presisi di satu lembar A4 dan garis potongnya masuk akal.

DEFINITION OF DONE:
- Nota 16 baris pecah ke 2 halaman dengan benar (Hal. 1/2, Hal. 2/2)
- Dua nota A5 muat presisi di satu A4 saat dicetak sungguhan
- Identitas toko kosong tidak meninggalkan baris kosong menganga
- Nota VOID bertanda jelas
```

### ✅ Verifikasi Hari 22

- [ ] VOID mengembalikan lot asal, bukan lot baru
- [ ] VOID oleh Operator memicu step-up
- [ ] Nota 16 baris pecah 2 halaman dengan penomoran benar
- [ ] **Uji cetak sungguhan** ke A4, dua A5 presisi
- [ ] Nota VOID bertanda; nota revisi bernomor revisi
- [ ] Kalau format klien belum datang: dicatat di `PROGRESS.md` §3
- [ ] `./scripts/verify.sh` hijau

---

## Hari 22A 🆕 — Halaman Pengecekan Invoice Harian (Supervisor)

> Klien menyatakan tugas supervisor hanya **dua**: menyetujui invoice dan menyetujui
> step-up. Supervisor **tidak punya dashboard**. Pengecekan dilakukan **di akhir hari**
> untuk mencocokkan dengan realita — **tidak memblokir** operasional.

### 🔧 Backend

```
KONTEKS: Hari 22A dari 37 (hari sisipan). Faktur penjualan dan pembelian sudah
lengkap, jadi sekarang ada yang bisa dicek.

TUGAS (BACKEND):
1. review_status (BELUM_DICEK -> DISETUJUI / BERMASALAH) + review_note +
   reviewed_by + reviewed_at, di sales_invoices DAN purchase_invoices.
2. PAKAI ULANG endpoint yang sudah ada:
   GET /sales-invoices?reviewStatus=&date=
   GET /purchase-invoices?reviewStatus=&date=
   DILARANG membuat keluarga endpoint /supervisor/*. Dua keluarga endpoint untuk
   data yang sama berarti dua tempat memperbaiki bug filter, dan yang kedua
   selalu terlupakan.
3. PATCH /sales-invoices/:id/review — SUPERVISOR & MASTER saja.
   Supervisor TIDAK PERNAH menulis ke isi faktur. Ia hanya mengubah review_status.
   Kalau menemukan kesalahan, ia menandai BERMASALAH dan MEMINTA OPERATOR
   memperbaiki. Ini yang menjaga permission matrix tetap utuh.
4. Selisih pembayaran di atas Rp 10.000 (Hari 27) OTOMATIS ditandai di layar ini.
   Siapkan field penanda sekarang. Ditandai — bukan diblokir, bukan minta step-up.

ATURAN WAJIB HARI INI:
- Pengecekan bersifat SETELAH-FAKTA dan TIDAK MEMBLOKIR. Operator tidak pernah
  menunggu supervisor untuk mencetak nota atau melanjutkan hari.

DEFINITION OF DONE:
- SUPERVISOR mencoba PATCH isi faktur -> 403
- SUPERVISOR mengubah review_status -> 200
- Filter reviewStatus jalan di kedua endpoint yang SUDAH ADA
- Tidak ada satu pun route /supervisor/* di aplikasi
```

### 🎨 Frontend

```
KONTEKS: Hari 22A dari 37 (hari sisipan).

TUGAS (FRONTEND):
1. Halaman Pengecekan Invoice Harian:
   - default: hari ini, status BELUM_DICEK
   - kolom: nomor invoice, toko/pelanggan, nominal, status, tombol detail
   - detail membuka faktur READ-ONLY dengan tombol [Setujui] [Tandai Bermasalah]
   - "Tandai Bermasalah" wajib mengisi catatan yang akan dibaca operator
   - penanda otomatis untuk selisih pembayaran > Rp 10.000
2. NAVIGASI SUPERVISOR HANYA 3 ITEM:
   Pengecekan Invoice - Antrian Persetujuan - Laporan.
   TIDAK ADA DASHBOARD. Kalau supervisor membuka /, arahkan ke Pengecekan Invoice.
3. Sisi operator: faktur ber-status BERMASALAH muncul menonjol di daftar faktur
   operator, dengan catatan supervisornya terbaca.

DEFINITION OF DONE:
- Login SUPERVISOR: sidebar 3 item, tidak ada dashboard, / -> Pengecekan
- Supervisor tidak menemukan satu pun tombol edit di detail faktur
- Operator melihat faktur BERMASALAH beserta catatannya
- Mencetak nota sebagai operator tetap bisa meski faktur BELUM_DICEK
```

### ✅ Verifikasi Hari 22A

- [ ] Supervisor: sidebar 3 item, tanpa dashboard
- [ ] Supervisor PATCH isi faktur → 403; ubah `review_status` → 200
- [ ] Tidak ada route `/supervisor/*`
- [ ] Operator melihat catatan `BERMASALAH` dan bisa memperbaiki
- [ ] Pengecekan tidak memblokir cetak nota
- [ ] `./scripts/verify.sh` hijau

---

## Hari 23 ♻️ — Retur Penjualan  *(v2: Hari 20)*

### 🔧 Backend

```
KONTEKS: Hari 23 dari 37. Di sistem lama retur penjualan hanya 1 record —
jarang terjadi, tapi ketika terjadi harus benar.

TUGAS (BACKEND):
1. Migration `sales_returns`(+lines) + nomor RJ. Ikut kunci cetak.
2. RETUR PENJUALAN WAJIB MENUNJUK FAKTUR ASAL. Beda dari retur pembelian
   (yang menunjuk supplier). Tanpa faktur asal, harga pokoknya tidak bisa
   ditentukan dengan benar.
3. Harga pokok WAJIB dari sales_invoice_lines.unit_cost_fifo (Hari 21),
   BUKAN harga pokok baru. Barang yang kembali harus dinilai dengan biaya yang
   dulu dikeluarkan untuknya, bukan dengan harga hari ini.
4. Barang masuk gudang BAD_STOCK, SELALU. Retur pelanggan TIDAK PERNAH kembali
   langsung ke stok jual.
5. Jurnal:
   Retur Penjualan (D) DPP
   PPN Keluaran    (D) bila ada
       Piutang/Kas     (K) total
   Persediaan      (D) HPP asli (unit_cost_fifo faktur asal)
       HPP             (K) HPP asli
   Akun Retur Penjualan TETAP ADA (kontra pendapatan) — beda dari retur pembelian.
6. settlement_type: REDUCE_INVOICE | CASH.

DEFINITION OF DONE:
- Retur tanpa faktur asal -> ditolak
- Lot yang terbentuk di BAD_STOCK ber-unit_cost SAMA PERSIS dengan unit_cost_fifo
  faktur asal (bandingkan isi tabelnya)
- Retur atas faktur LUNAS dengan CASH -> jurnal kas benar, paid_amount tidak
  pernah melebihi total_amount
- Invarian 1-5 Hari 11 tetap hijau
```

### 🎨 Frontend

```
KONTEKS: Hari 23 dari 37.

TUGAS (FRONTEND):
1. Halaman Retur Penjualan: cari faktur asal dulu -> baris faktur muncul ->
   pilih baris & qty yang diretur. Qty retur tidak boleh melebihi qty faktur.
2. Cetak dokumen retur A5 + <DocumentActions>.
3. Tampilkan penjelasan bahwa barang masuk gudang bad stock, supaya operator
   tidak mencarinya di stok jual.

DEFINITION OF DONE:
- Qty retur > qty faktur -> ditahan di layar sebelum submit
- Dokumen retur tercetak A5 dan ikut terkunci setelah dicetak
```

### ✅ Verifikasi Hari 23

- [ ] Retur tanpa faktur asal ditolak
- [ ] `unit_cost` lot BS = `unit_cost_fifo` faktur asal
- [ ] Barang selalu masuk BAD_STOCK
- [ ] Retur atas faktur lunas dengan CASH → jurnal kas benar
- [ ] Akun Retur Penjualan ada (kontra pendapatan)
- [ ] Invarian 1–5 hijau
- [ ] `./scripts/verify.sh` hijau

---

## Hari 23A ⏸ — Tutup Bulan + Buka Kembali · **DITUNDA KE PASCA-MVP**

> **Jangan dikerjakan sebelum 30 Agustus.** Bulan pertama yang perlu ditutup adalah September,
> sekitar 1 Oktober — sebulan setelah serah terima. Prompt ini disimpan utuh dan tinggal
> dijalankan nanti.
>
> **Yang TETAP dikerjakan di MVP:** validator backdate 2 hari (sudah ada sejak Hari 6) dengan
> bentuk `PeriodLockValidator` sebagai satu titik masuk, supaya pemeriksaan periode tinggal
> diselipkan tanpa menyentuh semua modul lagi.
>
> Aman **hanya karena** jurnal pembalik bertanggal hari ini (aturan §2.2 CLAUDE.md).
> Kalau suatu saat ada yang "memperbaiki" jurnal pembalik agar bertanggal dokumen asli,
> tutup bulan ikut rusak dan tidak ada test yang memberi tahu — kecuali yang ditulis hari ini.

### 🔧 Backend

```
KONTEKS: Hari 23A dari 37 (hari sisipan). Klien tidak jadi memakai konsep
closing harian; yang dipakai adalah TUTUP BULAN.

TUGAS (BACKEND):
1. Migration `accounting_periods`: tahun, bulan, status (OPEN/CLOSED),
   closed_by, closed_at, reopened_count, reopen_reason, reopened_at, reopened_by.
2. Tutup bulan dilakukan MASTER. Setelah ditutup, untuk dokumen bulan itu:
   - edit DITOLAK
   - VOID DITOLAK
   - tidak ada transaksi baru bertanggal di dalamnya
   Koreksi jalannya lewat Retur Penjualan / Retur Pembelian — dan itu memang
   akuntansi yang benar, karena barang yang kembali di bulan berikutnya adalah
   peristiwa bulan berikutnya.
3. SATU VALIDATOR BERSAMA — PeriodLockValidator di src/core/ — yang menggabungkan
   DUA pemeriksaan:
     (a) backdate maksimum 2 hari  -> lebih dari itu 400
     (b) tanggal tidak jatuh di periode CLOSED
   Dipanggil SEMUA modul transaksi. Dua validator terpisah akan berpisah
   perilakunya dalam sebulan.
4. BUKA KEMBALI: MASTER boleh membuka bulan mana pun, WAJIB mengisi alasan,
   tercatat di audit_logs, dan bulan yang pernah dibuka diberi PENANDA PERMANEN
   di daftar periode (reopened_count tidak pernah direset).
5. Endpoint daftar periode + status.
6. CLOSING & SALDO AWAL PERIODE (aturan klien, CLAUDE.md Sec.2.15):
   - akun LABA-RUGI ditutup, saldonya TIDAK terbawa ke bulan berikutnya
   - akun NERACA: saldo akhir bulan N jadi saldo awal bulan N+1, dan buku besarnya
     dibuka dengan baris Saldo Awal di posisi normalnya
   - contoh baku klien: piutang A 5 jt tgl 29 belum dibayar -> neraca tgl 31 memuat
     saldo akhir 5 jt di KREDIT -> tgl 1 bulan berikutnya buku besar AR dibuka dengan
     saldo awal 5 jt di DEBIT -> saat A membayar, muncul 5 jt di KREDIT
   BERHENTI DAN TANYA sebelum menulis kodenya: apakah baris Saldo Awal/Saldo Akhir itu
   JURNAL SUNGGUHAN (ada journal_entries penutup & pembuka tiap bulan) atau KONSTRUKSI
   TAMPILAN buku besar per periode? Keduanya menghasilkan laporan yang sama tapi skema,
   jumlah baris jurnal, dan invarian testnya berbeda.

ATURAN WAJIB HARI INI:
- PEMBAYARAN DAN RETUR ATAS FAKTUR BULAN TERTUTUP TETAP HARUS BISA JALAN.
  Faktur kredit hampir selalu ditagih setelah bulannya ditutup. Yang diblokir adalah
  EDIT dan VOID dokumen; memperbarui paid_amount/sisa tagihan adalah perubahan status
  sub-ledger dengan jurnal bertanggal hari ini, dan itu WAJIB diizinkan.
  Tulis test khusus: tutup bulan Juli, lalu bayar faktur Juli di bulan Agustus -> HARUS SUKSES.
- Mem-VOID dokumen bulan LALU saat bulan itu sudah ditutup -> DITOLAK.
- Mem-VOID dokumen bulan lalu saat bulan itu MASIH TERBUKA -> boleh, dan jurnal
  pembaliknya BERTANGGAL HARI INI. Konsekuensinya angka bulan lalu tidak bergerak.
  Tulis test yang membuktikan ini, karena inilah satu-satunya alasan tutup bulan aman.

DEFINITION OF DONE:
- Tutup bulan Juli, lalu coba edit faktur Juli -> ditolak
- Tutup bulan Juli, lalu coba VOID faktur Juli -> ditolak
- Tutup bulan Juli, lalu coba buat faktur bertanggal 30 Juli -> ditolak
- Buka kembali tanpa alasan -> ditolak
- Bulan yang pernah dibuka tetap bertanda meski ditutup lagi
- Grep membuktikan hanya ADA SATU validator periode+backdate, dan semua modul
  transaksi memanggilnya
```

### 🎨 Frontend

```
KONTEKS: Hari 23A dari 37 (hari sisipan).

TUGAS (FRONTEND):
1. Halaman Periode Akuntansi (MASTER only): daftar bulan + status + tombol
   Tutup / Buka Kembali.
2. Dialog Buka Kembali WAJIB memperingatkan secara eksplisit bahwa laporan yang
   sudah diserahkan ke pemilik/auditor BISA BERUBAH. Alasan wajib diisi.
3. Bulan yang pernah dibuka diberi penanda permanen di daftar, dengan berapa kali.
4. Pesan error di modul transaksi harus menyebut BULANNYA, bukan cuma "periode
   tertutup" — operator perlu tahu bulan mana yang bermasalah.

DEFINITION OF DONE:
- Peringatan buka-kembali muncul sebelum konfirmasi, bukan sesudah
- Penanda "pernah dibuka" tidak hilang setelah bulan ditutup lagi
- Pesan error menyebut bulan yang tertutup
```

### ✅ Verifikasi Hari 23A

- [ ] Edit, VOID, dan transaksi baru di bulan tertutup → ketiganya ditolak
- [ ] **Pembayaran atas faktur bulan tertutup tetap sukses** — ada test-nya
- [ ] Bentuk closing (jurnal sungguhan vs tampilan) sudah dikonfirmasi klien sebelum dikoding
- [ ] VOID dokumen bulan **terbuka** → jurnal pembalik bertanggal hari ini
- [ ] Angka bulan tertutup tidak bergerak setelah VOID dokumen lama (ada test-nya)
- [ ] Buka kembali tanpa alasan ditolak; penanda permanen bertahan
- [ ] **Satu** validator periode+backdate, dipanggil semua modul (grep)
- [ ] `./scripts/verify.sh` hijau

---
---

# FASE 6 — PENGIRIMAN & PEMBAYARAN (Hari 24–28)

---

## Hari 24 — Agen, Kendaraan, Skema Surat Jalan  *(v2: Hari 21)*

### 🔧 Backend

```
KONTEKS: Hari 24 dari 37. Rekap setoran agen SUDAH DIPOTONG dari scope, tapi
agen dan kendaraan TETAP DIBANGUN — surat jalan membawa keduanya, dan sopir
adalah orang yang menagih dengan nota.

TUGAS (BACKEND):
1. Migration `agents`, `vehicles` + CRUD sederhana (kode, nama, aktif).
2. Migration `delivery_orders`(+lines) + nomor SJ. Ikut kunci cetak.
3. Surat jalan terbentuk DARI faktur bersaluran PENGIRIMAN, membawa agent_id
   dan vehicle_id. Faktur bersaluran TOKO tidak punya surat jalan.
4. Format nomor surat jalan mengikuti format baku KODE/RM01-YYMMXXXX.

ATURAN WAJIB HARI INI:
- Jangan membangun rekap setoran agen. Item itu dipotong 28 Juli dan
  penggantinya adalah kontrol manual (lihat Hari 28).

DEFINITION OF DONE:
- Surat jalan dari faktur PENGIRIMAN membawa agen & kendaraan
- Faktur TOKO tidak bisa dibuatkan surat jalan
- Nomor SJ mengikuti format baku
```

### 🎨 Frontend

```
KONTEKS: Hari 24 dari 37.

TUGAS (FRONTEND):
1. Halaman Agen dan Kendaraan — <DataTable> + <CrudFormPage>, sederhana saja.
2. Tombol "Buat Surat Jalan" di detail faktur PENGIRIMAN.

DEFINITION OF DONE:
- Tombol surat jalan hanya muncul untuk faktur PENGIRIMAN
```

### ✅ Verifikasi Hari 24

- [ ] Surat jalan terbentuk dari faktur `PENGIRIMAN`, membawa agen & kendaraan
- [ ] Faktur `TOKO` tidak bisa dibuatkan surat jalan
- [ ] Tidak ada kode rekap setoran agen yang terlanjur dibangun
- [ ] `./scripts/verify.sh` hijau

---

## Hari 25 ♻️ — Endpoint & Cetak Surat Jalan  *(v2: Hari 22)*

### 🔧 Backend

```
KONTEKS: Hari 25 dari 37.

TUGAS (BACKEND):
1. Endpoint surat jalan + status: PENDING / DELIVERED / POSTPONED / RETURNED.
2. POSTPONED harus bisa ditarik sebagai daftar "belum terkirim" — inilah yang
   dilihat orang toko keesokan harinya.
3. Surat jalan IKUT KUNCI CETAK (Hari 15): setelah dicetak, edit wajib batal
   cetak dulu. Sopir sudah membawa lembar itu ke jalan.

DEFINITION OF DONE:
- Daftar "belum terkirim" menampilkan seluruh SJ ber-status POSTPONED
- Edit SJ yang sudah dicetak tanpa batal cetak -> ditolak
```

### 🎨 Frontend

```
KONTEKS: Hari 25 dari 37.

TUGAS (FRONTEND):
1. Halaman Surat Jalan + filter status.
2. CETAK A5 (landscape, 2-up di A4) — sama seperti nota. Isinya qty dan barang,
   tanpa nilai rupiah kalau klien tidak memintanya.
3. <DocumentActions> untuk kunci cetak.

DEFINITION OF DONE:
- Surat jalan tercetak A5, dua per lembar A4
- Status POSTPONED tampil sebagai daftar tersendiri
```

### ✅ Verifikasi Hari 25

- [ ] SJ tercetak A5 2-up
- [ ] Kunci cetak berlaku untuk SJ
- [ ] Daftar "belum terkirim" jalan
- [ ] `./scripts/verify.sh` hijau

---

## Hari 26 ⚠️🛑 — Payment: Skema + Preview Alokasi  *(v2: Hari 23)*

> **Modul ini belum pernah dibahas dengan klien** dan plan menandainya sebagai bagian
> tersulit. Dua hari (26–27) dialokasikan untuk sesuatu yang bentuknya belum diketahui.
> Kalau jawaban klien belum turun saat hari ini tiba, itu risiko jadwal — catat di §3
> `PROGRESS.md` hari itu juga, jangan diserap diam-diam.

### 🔧 Backend

```
KONTEKS: Hari 26 dari 37.

BERHENTI DAN BACA DULU: modul Pembayaran / Kas & Bank BELUM DIBAHAS SAMA SEKALI
(KONTEKS_REVISI Sec.4.1 dan Sec.4.2 PR #8). Yang boleh dikerjakan hari ini adalah
skema + preview alokasi berdasarkan plan v2. Yang HARUS ditunggu sebelum menulis
jurnalnya (Hari 27): bentuk setoran sopir, pembayaran sebagian, dan pembayaran
yang menutup beberapa faktur sekaligus.

Kalau selama mengerjakan kamu menemukan pertanyaan yang jawabannya menentukan
bentuk tabel, BERHENTI dan tulis pertanyaannya. Mengubah skema pembayaran setelah
data masuk jauh lebih mahal daripada menunggu sehari.

TUGAS (BACKEND):
1. Migration:
   `payment_batches`: id, batch_number (PAY/RM01-YYMMXXXX), payment_date,
     party_type ENUM('CUSTOMER','SUPPLIER'), party_id, total_amount,
     agent_id, vehicle_id (untuk setoran yang dibawa sopir),
     posting_status, print_status, void_reason_*
   `payment_batch_methods`: id, payment_batch_id, cash_account_id, amount
     (multi-metode: sebagian kas, sebagian transfer)
   `payments`: id, payment_batch_id, invoice_type ENUM('SALES','PURCHASE'),
     invoice_id, allocated_amount
2. POST /payments/preview-allocation:
   - alokasi FIFO ke faktur tertua yang belum lunas
   - TOLAK overpayment
   - kembalikan rincian: faktur mana, dialokasikan berapa, sisa berapa
3. Akun kas dari chart_of_accounts.is_cash_account (Hari 18), bukan hardcode.

DEFINITION OF DONE:
- 30 jt kas + 50 jt transfer atas tagihan 100 jt -> preview benar,
  sisa 20 jt tetap outstanding
- Pembayaran melebihi total tagihan -> ditolak
- Preview TIDAK menulis apa pun ke DB

SETELAH SELESAI: verify.sh + checklist DoD + daftar pertanyaan pembayaran dalam
bentuk yang bisa saya kirim langsung ke klien.
```

### 🎨 Frontend

```
KONTEKS: Hari 26 dari 37.

TUGAS (FRONTEND):
1. Payment step 1: pilih pihak (pelanggan/supplier) -> daftar faktur outstanding
   -> input multi-metode (baris: akun kas + nominal, bisa lebih dari satu).
2. Tampilkan preview alokasi hasil endpoint, jangan menghitung sendiri di frontend.
   Perhitungan uang hidup di satu tempat: backend.
3. JANGAN membangun layar setoran sopir. Bentuknya belum diputuskan.

DEFINITION OF DONE:
- Preview alokasi tampil sebelum konfirmasi
- Tidak ada satu pun perhitungan alokasi di sisi frontend
```

### ✅ Verifikasi Hari 26

- [ ] Preview multi-metode benar, sisa tetap outstanding
- [ ] Overpayment ditolak
- [ ] Preview tidak menulis ke DB
- [ ] Tidak ada perhitungan uang di frontend
- [ ] **Pertanyaan modul pembayaran sudah dikirim ke klien**
- [ ] `./scripts/verify.sh` hijau

---

## Hari 27 ⚠️♻️🛑 — Payment: Confirm + Selisih Pembayaran  *(v2: Hari 24)*

### 🔧 Backend

```
KONTEKS: Hari 27 dari 37. Lanjutan Hari 26 — jangan mulai sebelum pertanyaan
klien terjawab.

TUGAS (BACKEND):
1. POST /payments/confirm — multi-metode, AR dan AP simetris, satu transaction.
2. SELISIH PEMBAYARAN. Aturan klien, presisinya penting:
   - Muncul HANYA saat operator menyatakan faktur LUNAS. Pembayaran sebagian
     BUKAN selisih — itu cuma belum lunas.
   - Klien TIDAK memakai pembulatan sama sekali. Selisih diakui sebagai selisih,
     bukan diakali jadi angka bulat.
   - SATU akun "Selisih Pembayaran", dipakai DUA ARAH:
       Pelanggan kurang bayar : Kas (D) - Selisih Pembayaran (D) - Piutang (K)
       Pelanggan lebih bayar  : Kas (D) - Piutang (K) - Selisih Pembayaran (K)
       Kita kurang bayar supplier : Hutang (D) - Kas (K) - Selisih Pembayaran (K)
       Kita lebih bayar supplier  : Hutang (D) - Selisih Pembayaran (D) - Kas (K)
   - Contoh nyata dari klien: tagihan 33.253.125 dibayar 33.253.000 -> 125 jadi
     selisih; dibayar 33.254.000 -> 875 jadi selisih arah sebaliknya.
   - TIDAK ADA BATAS nominal. Selisih bisa 2-3 ribu. Yang ada hanyalah:
     selisih di atas Rp 10.000 OTOMATIS DITANDAI di layar pengecekan supervisor
     (Hari 22A). DITANDAI — bukan diblokir, bukan minta step-up.
3. VOID payment batch lewat VoidEngine.
4. Akun piutang lewat resolveArAccount(), bukan akun default langsung.

DEFINITION OF DONE:
- 33.253.125 dibayar 33.253.000 -> faktur LUNAS, 125 di akun Selisih Pembayaran
  sisi debit, jurnal balance
- 33.253.125 dibayar 33.254.000 -> faktur LUNAS, 875 sisi kredit, jurnal balance
- Pembayaran sebagian -> TIDAK menghasilkan baris selisih apa pun
- Selisih Rp 15.000 -> faktur ditandai di layar pengecekan, TIDAK diblokir
- VOID batch membalik seluruh alokasi dan jurnalnya
```

### 🎨 Frontend

```
KONTEKS: Hari 27 dari 37.

TUGAS (FRONTEND):
1. Payment step 2: alokasi DAPAT DIEDIT MANUAL. Operator kadang perlu
   mengalokasikan ke faktur hari ini, bukan ke tunggakan lama — itu keputusan
   bisnis, bukan bug.
2. Saat operator menandai LUNAS sementara nominal tidak persis: tampilkan selisih
   dengan jelas beserta arahnya, minta konfirmasi sekali, lalu lanjut. Jangan
   memaksa membulatkan.
3. Riwayat batch pembayaran + cetak kwitansi A5 (ikut kunci cetak).

DEFINITION OF DONE:
- Alokasi hasil edit manual tersimpan sesuai editan, bukan hasil FIFO
- Selisih tampil dengan arah yang benar sebelum konfirmasi
- Kwitansi tercetak A5 dan terkunci setelah dicetak
```

### ✅ Verifikasi Hari 27

- [ ] Dua contoh selisih klien menghasilkan jurnal balance dengan arah benar
- [ ] Pembayaran sebagian tidak menghasilkan selisih
- [ ] Selisih > Rp 10.000 ditandai, **tidak** diblokir
- [ ] Alokasi manual tersimpan sesuai editan
- [ ] Kwitansi A5 + kunci cetak
- [ ] `./scripts/verify.sh` hijau

---

## Hari 28 🆕♻️ — Laporan Kontinuitas Nomor Dokumen  *(v2: Hari 25, rekap setoran agen dipotong)*

> Inilah dokumen yang diserahkan ke pemilik/auditor. Klien menyatakan nomor invoice
> **tidak boleh hilang** dan nomor yang tidak terpakai **perlu justifikasi**.

### 🔧 Backend

```
KONTEKS: Hari 28 dari 37. Contoh kasus dari klien: INV 95/96/97 dibuat untuk toko
A/B/C sebelum pengiriman. Toko A tutup dan membatalkan -> INV 95 di-VOID, arsipnya
tetap ada, tidak boleh dihapus.

TUGAS (BACKEND):
1. GET /reports/document-continuity?type=&year=&month=
   Menampilkan SETIAP nomor dari 0001 sampai terakhir terbit untuk jenis dokumen
   dan periode itu, beserta:
     - status (POSTED / VOIDED)
     - tanggal, pihak, nominal
     - void_reason_code + void_reason_note untuk yang VOID
2. Deteksi LUBANG: nomor yang tidak ada barisnya sama sekali ditandai MERAH
   sebagai "hilang tanpa penjelasan". Secara desain ini tidak boleh pernah terjadi
   (counter berupa tabel di dalam transaction pemanggil, jadi rollback mengembalikan
   nomor) — tapi laporan ini justru ada untuk membuktikannya, bukan mengasumsikannya.
3. Berlaku untuk semua jenis dokumen KECUALI Sales Order (keputusan 29 Juli:
   SO tidak ikut kunci cetak dan tidak masuk laporan ini).
4. Export Excel.

DEFINITION OF DONE:
- VOID satu faktur di tengah bulan -> nomor itu TETAP MUNCUL, dengan alasannya
- Tidak ada satu pun lubang antara 0001 dan nomor terakhir
- Buat 5 faktur, gagalkan yang ke-3 di tengah transaksi (paksa error), lalu buka
  laporan: nomor harus tetap berurutan 1-2-3-4, tanpa lubang
- Laporan bisa ditarik untuk semua jenis dokumen selain SO
```

### 🎨 Frontend

```
KONTEKS: Hari 28 dari 37.

TUGAS (FRONTEND):
1. Halaman Laporan Kontinuitas Nomor Dokumen: pilih jenis dokumen + periode,
   tabel menampilkan seluruh nomor berurutan, baris VOID berwarna berbeda dengan
   alasannya terbaca, baris hilang berwarna merah.
2. Export Excel.

DEFINITION OF DONE:
- Baris VOID menampilkan alasan tanpa perlu diklik
- Export Excel memuat kolom yang sama dengan layar
```

### ⚠️ Kontrol pengganti yang WAJIB dipastikan hari ini

Rekap setoran agen **dipotong** dari scope. Rekap itu berdiri persis di titik uang tunai
berpindah tangan — sopir membawa pulang uang. "Manual bulan pertama" gampang berubah jadi
tidak ada yang mengerjakan.

- [ ] **Siapa** yang mencocokkan setoran sopir dengan faktur terkirim: `__________`
- [ ] **Kapan**: `__________` (tempelkan ke ritual pengecekan sore supervisor — itu gratis)
- [ ] **Siapa yang memeriksa** bahwa pencocokan itu benar-benar dilakukan: `__________`

Kalau ketiga baris ini masih kosong saat Hari 28 selesai, catat di `PROGRESS.md` §3
sebagai risiko terbuka dan bawa ke klien. Jangan diserahterimakan dalam keadaan kosong.

### ✅ Verifikasi Hari 28

- [ ] Nomor VOID tetap muncul beserta alasannya
- [ ] Tidak ada lubang nomor, termasuk setelah transaksi yang sengaja digagalkan
- [ ] Laporan jalan untuk semua jenis dokumen selain SO
- [ ] Export Excel
- [ ] Tiga baris kontrol pengganti terisi **atau** tercatat sebagai risiko
- [ ] `./scripts/verify.sh` hijau

---
---

# FASE 7 — LAPORAN & SERAH TERIMA (Hari 29–37)

## Template Prompt Laporan (dipakai Hari 29–32)

```
KONTEKS: Hari <N> dari 37. Modul laporan.

CATATAN: isi laporan yang benar-benar dipakai klien BELUM DIBAHAS
(KONTEKS_REVISI Sec.4.1). Bangun yang jelas dibutuhkan mesin akuntansi dan
operasional harian; jangan menambah laporan "kalau-kalau berguna". Setiap laporan
tambahan adalah query yang harus tetap benar setelah setiap perubahan skema.

TUGAS (BACKEND):
1. Endpoint laporan <nama>, parameter periode + filter yang relevan.
2. Semua nilai uang dari BUKU BESAR atau dari tabel transaksi — tidak pernah
   dihitung ulang dengan rumus yang disalin dari modul lain. Kalau butuh rumus
   yang sama, panggil fungsinya, jangan salin.
3. Export Excel lewat modul export generik Hari 5. Export PDF SUDAH DIPOTONG.

ATURAN WAJIB:
- Angka di laporan wajib bisa ditelusuri ke dokumen sumbernya. Kalau ada angka
  yang tidak bisa diklik sampai ke dokumen, itu angka yang tidak bisa dipercaya.
- Stok ditampilkan dalam pecahan satuan lewat formatQtyBreakdown, bukan desimal.

DEFINITION OF DONE:
- Angka laporan cocok dengan buku besar untuk periode yang sama (buktikan dengan
  satu contoh yang dihitung manual)
- Export Excel jalan
```

---

## Hari 29 🛑 — Laporan Stok & Barang Titipan  *(v2: Hari 26)*

### 🔧 Backend

```
KONTEKS: Hari 29 dari 37.

TUGAS (BACKEND):
1. Laporan stok per gudang. Satuan DIPECAH ("12 dus 15 renceng"), bukan desimal.
   Tiga gudang punya arti berbeda dan harus dipisah di laporan:
   STORE (barang jual), BAD_STOCK (rusak/retur, tidak dijual lagi),
   TITIPAN_PELANGGAN (bukan milik toko lagi).
2. LAPORAN BARANG TITIPAN PER PELANGGAN — sumbernya warehouse_mutations,
   BUKAN stock_movements (mutasi titipan sengaja tidak membuat movement).
   Klien meminta laporan ini secara eksplisit.
3. Daftar titipan WAJIB MUNCUL DI PROSES STOK OPNAME sebagai penjelasan selisih
   fisik. Barang titipan ada di gudang secara fisik tapi bukan milik toko —
   tanpa daftar ini, stok opname akan selalu menemukan selisih yang tidak
   terjelaskan dan orang akan berhenti mempercayainya.

DEFINITION OF DONE:
- Stok 255 renceng dengan konversi 1 dus = 20 -> "12 dus 15 renceng"
- Laporan titipan menampilkan per pelanggan, angkanya cocok dengan
  warehouse_mutations
- Layar stok opname menampilkan daftar titipan sebagai penjelas
```

### 🎨 Frontend

```
TUGAS (FRONTEND):
1. Halaman Laporan Stok (filter gudang) dan Laporan Barang Titipan (filter pelanggan).
2. Export Excel.

DEFINITION OF DONE:
- Tiga jenis gudang tampil terpisah, tidak dijumlahkan jadi satu angka
```

### ✅ Verifikasi Hari 29

- [ ] Stok tampil dalam pecahan satuan
- [ ] Laporan titipan per pelanggan cocok dengan `warehouse_mutations`
- [ ] Titipan muncul sebagai penjelas di stok opname
- [ ] Tiga gudang tidak dijumlahkan jadi satu
- [ ] `./scripts/verify.sh` hijau

---

## Hari 30 ⏸ — Laporan Penjualan, Piutang, Hutang · **DITUNDA KE PASCA-MVP**  *(v2: Hari 27)*

> **Jangan dikerjakan sebelum 30 Agustus.** Di bulan pertama, daftar faktur outstanding per
> pelanggan dan per supplier sudah tersedia di **layar pembayaran** (Hari 26) — itu yang
> dipakai untuk menagih dan membayar. Yang ditunda adalah laporan umur piutang, umur hutang,
> dan penjualan per salesman.
>
> ⚠️ Pastikan layar pembayaran benar-benar menampilkan sisa tagihan per faktur dengan jelas.
> Selama laporan piutang belum ada, layar itulah satu-satunya cara klien melihat siapa
> berutang berapa.

### 🔧 Backend

```
KONTEKS: Hari 30 dari 37.

TUGAS (BACKEND):
1. Laporan penjualan: per periode, per pelanggan, PER SALESMAN.
   Salesman dipilih per faktur (bukan per pelanggan) dan tercetak di nota.
   TIDAK ADA KOMISI — laporan ini untuk melihat kinerja, bukan menghitung upah.
2. Laporan piutang (umur piutang) — akun piutang lewat resolveArAccount().
   Pelanggan yang punya akun piutang custom TIDAK BOLEH hilang dari laporan
   hanya karena query memfilter akun default.
3. Laporan hutang per supplier, umur dari due_date (= tanggal faktur supplier
   + termin, bukan tanggal terima barang).

DEFINITION OF DONE:
- Total piutang di laporan = saldo akun-akun piutang di buku besar
- Pelanggan ber-ar_account_id custom muncul di laporan
- Umur hutang dihitung dari due_date, dibuktikan dengan satu faktur yang tiga
  tanggalnya sengaja berbeda
```

### 🎨 Frontend

```
TUGAS (FRONTEND):
1. Tiga halaman laporan + export Excel.
2. Angka bisa diklik sampai ke dokumen sumbernya.

DEFINITION OF DONE:
- Klik nominal piutang -> membuka faktur yang membentuknya
```

### ✅ Verifikasi Hari 30

- [ ] Total piutang laporan = saldo buku besar
- [ ] Pelanggan ber-akun custom tidak hilang dari laporan
- [ ] Umur hutang dari `due_date`
- [ ] Angka bisa ditelusuri ke dokumen
- [ ] `./scripts/verify.sh` hijau

---

## Hari 31 ♻️ — Rekap Kas Harian  *(v2: Hari 28 — cash opname dipotong, laporan biaya ⏸ pasca-MVP)*

### 🔧 Backend

```
KONTEKS: Hari 31 dari 37. Cash opname SUDAH DIPOTONG dari scope.

TUGAS (BACKEND):
1. LAPORAN BIAYA OPERASIONAL DITUNDA KE PASCA-MVP (keputusan 29 Juli).
   Jangan dibangun hari ini.
2. REKAP KAS HARIAN PER AKUN — TETAP DIBANGUN. Ini yang dipakai menutup hari
   secara praktis dan sudah jadi pengganti cash opname yang dipotong: saldo awal, masuk, keluar, saldo akhir per akun kas.
   Ini yang dipakai menutup hari secara praktis, dan ini pengganti terdekat dari
   cash opname yang dipotong.
3. JANGAN membangun cash opname (input hitungan fisik + selisih). Dipotong.
4. Hari ini jadi setengah hari. Sisanya dipakai melunasi utang teknis yang tercatat
   di PROGRESS.md, bukan menambah fitur.

DEFINITION OF DONE:
- Rekap kas harian cocok dengan mutasi akun kas di buku besar untuk tanggal sama
- Saldo akhir hari N = saldo awal hari N+1
```

### 🎨 Frontend

```
TUGAS (FRONTEND):
1. Halaman Kas: rekap harian per akun. Export Excel. (Laporan biaya pasca-MVP.)

DEFINITION OF DONE:
- Rekap kas bisa ditarik per tanggal dan per akun
```

### ✅ Verifikasi Hari 31

- [ ] Rekap kas cocok dengan buku besar
- [ ] Saldo bersambung antar hari
- [ ] Tidak ada cash opname maupun laporan biaya yang terlanjur dibangun
- [ ] `./scripts/verify.sh` hijau

---

## Hari 32 ♻️ — Rekonsiliasi Stok  *(v2: Hari 29, laporan retur & stok minus dipotong)*

### 🔧 Backend

```
KONTEKS: Hari 32 dari 37. Laporan retur dan laporan produk stok minus SUDAH
DIPOTONG (sementara pakai query manual).

TUGAS (BACKEND):
1. Endpoint rekonsiliasi stok: bandingkan SUM(stock_movements) dengan
   product_stock_balance per (produk, gudang) — memakai reconcile() dari Hari 10.
2. Sertakan daftar barang titipan sebagai PENJELAS selisih fisik.
3. Sediakan satu query SQL siap pakai untuk stok minus dan untuk retur, disimpan
   di docs/queries.md supaya "manual" berarti "jalankan query ini", bukan
   "karang sendiri nanti".

DEFINITION OF DONE:
- Rekonsiliasi mengembalikan selisih 0 pada DB yang sehat
- Selisih fisik yang disebabkan barang titipan terjelaskan otomatis
- docs/queries.md berisi query stok minus dan retur yang sudah diuji jalan
```

### 🎨 Frontend

```
TUGAS (FRONTEND):
1. Halaman Rekonsiliasi Stok + export Excel.

DEFINITION OF DONE:
- Baris berselisih ditandai jelas; baris yang terjelaskan titipan diberi keterangan
```

### ✅ Verifikasi Hari 32

- [ ] Rekonsiliasi selisih 0 di DB sehat
- [ ] Selisih karena titipan terjelaskan
- [ ] `docs/queries.md` berisi query pengganti yang sudah diuji
- [ ] `./scripts/verify.sh` hijau

---

## Hari 33 ⚠️♻️ — Deploy Windows-Native + Export Excel  *(v2: Hari 30)*

> Hari paling berisiko di fase akhir. Mesin klien: **i5-4690, 8 GB DDR3, 1 TB HDD**,
> merangkap komputer operator. Tanpa Docker, tanpa mini PC. Risiko HDD bukan kecepatan
> (11–12 transaksi/hari = satu tiap ~50 menit) melainkan **kegagalan mekanis** —
> dan backup adalah satu-satunya jaring pengaman.

### 🔧 Backend + Deploy

```
KONTEKS: Hari 33 dari 37. Deploy ke mesin klien sungguhan, di toko.

TUGAS:
1. Postgres NATIVE Windows (bukan Docker). docker-compose.yml TETAP di repo untuk
   kemungkinan pindah mesin, tapi tidak dipakai di produksi.
2. NestJS sebagai Windows service lewat nssm. Auto-start saat boot.
3. nginx melayani frontend STATIS (nuxt generate, ssr: false). Tidak ada manfaat
   SSR untuk aplikasi LAN satu toko.
4. Tuning Postgres untuk mesin yang dipakai bersama:
   shared_buffers 1GB
   effective_cache_size 3GB
   checkpoint_timeout 15min
   checkpoint_completion_target 0.9
   max_wal_size 2GB
   random_page_cost 4.0        <- biarkan, ini nilai yang benar untuk HDD
   synchronous_commit ON       <- JANGAN dimatikan demi kecepatan. Pada 11-12
                                  transaksi/hari, commit 10-20 ms tidak akan
                                  pernah terasa. Yang hilang kalau dimatikan
                                  adalah transaksi terakhir saat listrik padam.
5. GRATIS DAN WAJIB:
   - matikan restart otomatis Windows Update
   - pg_dump terjadwal DI LUAR JAM KERJA, hasilnya disalin ke media terpisah
   - Postgres & NestJS auto-start sebagai service
6. UPS terpasang dan DIUJI.
7. Export EXCEL seluruh laporan (export PDF sudah dipotong).

ATURAN WAJIB HARI INI:
- Backup yang belum pernah di-restore bukan backup. Uji restore hari ini juga,
  ke database terpisah, dan catat langkahnya.

DEFINITION OF DONE:
- Reboot mesin -> aplikasi hidup sendiri tanpa disentuh
- Cabut listrik saat 3 faktur sedang diinput -> setelah listrik kembali, DB
  konsisten dan tidak ada dokumen setengah jadi
- pg_dump terjadwal jalan, hasilnya BERHASIL DI-RESTORE ke DB terpisah
- Operator membuka aplikasi dari komputernya sendiri, supervisor dari komputernya,
  keduanya lewat LAN
- Waktu buka halaman faktur < 2 detik di mesin itu
```

### ✅ Verifikasi Hari 33

- [ ] Reboot → aplikasi hidup sendiri
- [ ] Cabut listrik → DB konsisten, tidak ada dokumen setengah jadi
- [ ] UPS terpasang dan diuji
- [ ] `pg_dump` terjadwal **dan** restore-nya terbukti jalan
- [ ] `synchronous_commit` tetap `on`
- [ ] Dua komputer mengakses lewat LAN
- [ ] Export Excel jalan di semua laporan
- [ ] `./scripts/verify.sh` hijau

---

## Hari 34 — BUFFER

```
KONTEKS: Hari 34 dari 37. BUFFER.

TUGAS: perbaikan temuan UAT minggu 1-4. Kerjakan dari yang paling menyentuh
kebenaran data, bukan yang paling mudah.

Kalau tidak ada temuan tersisa, JANGAN menambah fitur. Pakai hari ini untuk:
1. menjalankan seluruh test suite dan mengukur waktunya
2. membaca ulang CLAUDE.md Sec.2 dan mencari aturan yang diam-diam dilanggar
3. memperbaiki pesan error yang masih berbahasa teknis
```

### ✅ Verifikasi Hari 34

- [ ] Semua temuan UAT berstatus jelas: selesai, ditunda dengan alasan, atau ditolak
- [ ] Tidak ada fitur baru yang diselipkan
- [ ] `./scripts/verify.sh` hijau

---

## Hari 35 — Audit Permission Matrix  *(v2: Hari 32)*

### 🔧 Backend + Frontend

```
KONTEKS: Hari 35 dari 37. Audit menyeluruh, bukan sampling.

TUGAS:
1. Telusuri SETIAP endpoint terhadap matriks di CLAUDE.md Sec.5. Buat tabel hasil:
   endpoint, role, harapan, hasil nyata.
2. Titik yang paling gampang meleset:
   - SUPERVISOR: tidak punya dashboard, hanya 3 menu, TIDAK PERNAH menulis ke faktur
   - OPERATOR: GET /chart-of-accounts -> 403; supplier ter-mask
     (name, contact_phone, contact_address), display_code tetap tampil
   - Jurnal Manual ditolak untuk Persediaan/Piutang/Hutang MESKI Master
   - Tutup/buka bulan: MASTER saja
   - Approve authorization_requests: MASTER & SUPERVISOR
3. Audit juga sisi frontend: menu yang tidak boleh terlihat memang tidak
   ter-render, bukan sekadar disembunyikan CSS.

DEFINITION OF DONE:
- Tabel audit lengkap, setiap baris terbukti dengan curl atau test
- Tidak ada satu pun baris merah yang dibiarkan
```

### ✅ Verifikasi Hari 35

- [ ] Tabel audit permission lengkap dan hijau
- [ ] Supervisor: 3 menu, tanpa dashboard, tidak bisa menulis faktur
- [ ] Operator: COA 403, supplier ter-mask
- [ ] Menu terlarang tidak ter-render di DOM
- [ ] `./scripts/verify.sh` hijau

---

## Hari 36 — INPUT SALDO AWAL (buffer terpakai)

```
KONTEKS: Hari 36 dari 37, 29 Agustus. Buffer terakhir, dan sudah punya pemilik:
INPUT SALDO AWAL. Mesinnya dibangun Hari 12; hari ini mengisinya dengan angka
sungguhan dari klien.

TUGAS:
1. Input saldo awal STOK (qty + harga pokok per produk), PIUTANG per pelanggan,
   dan HUTANG per supplier. Semuanya BERTANGGAL 1 SEPTEMBER 2026.
2. Jalankan GET /opening-balance/verify: selisih Sigma nilai lot pembuka vs saldo
   akun Persediaan harus 0.
3. Jalankan invarian 1-5 Hari 11 SETELAH saldo awal masuk. Saldo awal adalah
   suntikan data terbesar yang pernah masuk sekaligus — kalau ada yang retak,
   di sinilah retaknya muncul.
4. CATAT TANGGAL POTONG yang dipakai klien saat menyiapkan angkanya.

PERINGATAN YANG HARUS DISAMPAIKAN KE KLIEN HARI INI:
Angka yang diinput hari ini adalah angka per tanggal potong, sementara klien masih
memakai sistem lama sampai 31 Agustus. Transaksi 29-31 Agustus BELUM tercermin.
Sebelum operasi pertama 1 September, selisih tiga hari itu WAJIB disesuaikan —
entah dengan mengulang input saldo awal, atau memasukkannya sebagai transaksi biasa.
Tanyakan ke klien mana yang mereka pilih, dan tulis jawabannya di PROGRESS.md Sec.3.

Kalau saldo awal selesai lebih cepat, sisa hari dipakai untuk perbaikan tertunda.
Kalau ada yang belum selesai dan tidak bisa selesai hari ini, KATAKAN SEKARANG,
bukan besok. Klien masih punya satu hari untuk menyesuaikan rencana.
```

### ✅ Verifikasi Hari 36

- [ ] Saldo awal stok, piutang, hutang masuk, bertanggal **1 September 2026**
- [ ] `GET /opening-balance/verify` selisih 0
- [ ] Invarian 1–5 tetap hijau **setelah** saldo awal masuk
- [ ] Rencana penyesuaian selisih 29–31 Agustus sudah disepakati klien dan dicatat
- [ ] Semua yang menyentuh mesin akuntansi sudah selesai
- [ ] Yang belum selesai sudah dikomunikasikan ke klien hari ini juga
- [ ] `./scripts/verify.sh` hijau

---

## Hari 37 — Smoke Test, Dokumentasi, Serah Terima  *(v2: Hari 34)*

### 🔧 Backend + Frontend (satu sesi, ini hari integrasi)

```
KONTEKS: Hari 37 dari 37. Cut-over 1 September, TANPA periode paralel.
Tidak ada jaring pengaman berupa "sistem lama masih jalan" — jadi yang belum
benar hari ini akan ketahuan oleh operator di hari pertama, bukan oleh kita.

TUGAS:
1. SMOKE TEST END-TO-END dengan data yang menyerupai hari kerja sungguhan:
   login -> master data -> faktur pembelian (dengan bonus) -> mutasi ke bad stock
   -> retur pembelian -> sales order -> faktur penjualan (dengan step-up jual rugi)
   -> cetak nota -> surat jalan -> pembayaran dengan selisih -> pengecekan
   supervisor -> tutup bulan -> laporan -> logout.
   Jalankan sebagai TIGA role bergantian.
2. DOKUMENTASI:
   - setup & deploy (termasuk cara menyalakan ulang service)
   - PROSEDUR RESTORE BACKUP, ditulis untuk orang yang panik
   - panduan operator: alur input harian, arti tiga status dokumen,
     cara meminta persetujuan supervisor
   - panduan master: tutup bulan, buka kembali, saldo awal, CRUD COA
3. Serah terima: repo dipindah ke akun klien, kredensial diserahkan,
   Checklist Go-Live dijalankan bersama.

DEFINITION OF DONE:
- Smoke test lolos untuk ketiga role tanpa satu pun error
- KLIEN MENJALANKAN RESTORE BACKUP SENDIRI dengan panduan tertulis, tanpa dibantu.
  Kalau tidak bisa, backup itu tidak nyata dan dokumentasinya belum selesai.
- Repo sudah di akun klien
- Operator berhasil menginput satu faktur lengkap sendiri, tanpa dipandu
```

### ✅ Verifikasi Hari 37 (Gerbang Serah Terima)

- [ ] Smoke test end-to-end lolos untuk 3 role
- [ ] Dokumentasi setup, deploy, **restore backup**, panduan operator & master
- [ ] **Klien berhasil restore backup sendiri**
- [ ] Operator menginput satu faktur lengkap tanpa dipandu
- [ ] Repo di akun klien, kredensial diserahkan
- [ ] Checklist Go-Live dijalankan bersama klien
- [ ] `./scripts/verify.sh` hijau

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
| 5 | `npm run test` BE (termasuk **5 invarian** setelah Hari 11) | logika bisnis rusak |
| 6 | Server start & `GET /health` 200 | aplikasi tidak bisa dijalankan |
| 7 | `npm run build` FE | ada error di frontend |
| 8 | `npm run lint` FE | konvensi FE dilanggar |
| 9 | Tidak ada route DELETE terdaftar | melanggar aturan no-hard-delete |
| 10 | `.env` tidak ter-stage di git | risiko kebocoran kredensial |
| 11 | `migration:run` sudah diterapkan ke DB dev harian | migration baru dibuat tapi lupa dijalankan (kejadian di Hari 6) |
| 12 | Grep bersih: `INV/`, `YYMM/`, `CUSTOMER_CONSIGNMENT`, `428`, `tax_status` | sisa istilah dari aturan yang sudah dicabut |

Keluarannya berupa daftar ✅/❌ dan exit code 1 kalau ada yang gagal —
sehingga bisa dipasang sebagai pre-push hook.

> **Pemeriksaan 11 ditambahkan setelah kejadian Hari 6:** migration dibuat tapi lupa
> dijalankan di DB dev, dan yang menemukannya adalah integration test yang gagal, bukan
> `verify.sh` — karena skrip itu hanya menguji up→down→up di DB sementara.
>
> **Pemeriksaan 12** menjaga agar istilah dari aturan yang sudah dicabut tidak diam-diam
> hidup lagi lewat copy-paste dari kode lama.

---

# Lampiran B — Prompt Darurat

## Kalau drift ≥ 1 hari — **DAFTAR POTONG SUDAH HABIS**

> Prompt ini menggantikan prosedur potong darurat v2. Keempat item yang bisa dipotong
> sudah diambil 28 Juli untuk membiayai revisi klien, dan dua sisanya (Sales Order,
> Bad Stock) sudah dinyatakan tidak bisa dipotong. Margin sekarang **nol**.

```
Baca PROGRESS.md Sec.0 (neraca kapasitas) dan Sec.6.

Drift saat ini <N> hari. Daftar potong darurat SUDAH HABIS — jangan mencari
item untuk dipotong, tidak ada lagi. Yang tersisa hanya dua tuas, dan keduanya
keputusan KLIEN, bukan keputusan saya:

  A. TUKAR SCOPE  — buang pekerjaan yang belum dikerjakan, senilai drift-nya
  B. GESER CUT-OVER — mundurkan 1 September

Bantu saya menyiapkan bahan untuk klien:
1. Sebutkan penyebab drift-nya secara spesifik, bukan "lebih lama dari perkiraan".
2. Kalau tuas A: daftar 3 kandidat yang bisa ditukar, masing-masing dengan
   berapa hari yang dihemat, apa konsekuensinya bagi operasional bulan pertama,
   dan apa jalan memutar manualnya.
   JANGAN mengusulkan yang ada di daftar tidak-boleh-dipotong.
3. Kalau tuas B: berapa hari mundur yang realistis, dan apa konsekuensinya bagi
   klien (sistem lama harus jalan lebih lama, tutup buku bulan Agustus di mana).
4. Rekomendasi saya harus mana, dan kenapa.
5. Draf pesan singkat, jujur, dan konkret untuk klien. Tanpa menyalahkan siapa pun
   dan tanpa menjanjikan "akan dikejar" kalau memang tidak ada ruang mengejar.

JANGAN memotong: Journal Poster, Stock Recorder + FIFO, VOID + reversing,
integration test Hari 11, alur Saldo Awal, validator tutup bulan + backdate,
panel riwayat harga, sisa stok saat mengetik, modal tambah pelanggan,
batas jual di bawah harga pokok, kunci cetak + jejak otorisasinya.
```

## Kalau ada bug yang menyentuh engine

```
Ada bug di <modul>. Sebelum memperbaiki:
1. Tulis test yang GAGAL karena bug ini. Tunjukkan test-nya gagal.
2. Baru perbaiki. Tunjukkan test-nya lulus.
3. Jalankan 5 invarian Hari 11 — pastikan tidak ada yang pecah.
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

## Kalau klien memberi jawaban yang membuka PR terbuka

```
Klien menjawab PR #<nomor> dari KONTEKS_REVISI Sec.4.2: <jawaban>.

Lakukan:
1. Terjemahkan jawaban itu jadi aturan konkret, dan periksa apakah ia bertabrakan
   dengan aturan mana pun di CLAUDE.md Sec.2. Kalau ya, SEBUTKAN dan berhenti.
2. Sebutkan hari mana saja yang terpengaruh, termasuk hari yang SUDAH selesai.
3. Kalau ada hari yang sudah selesai dan perlu rework, estimasi berapa lama, dan
   ingat: margin jadwal nol, jadi rework berarti drift.
4. Update PROGRESS.md Sec.1 (kolom Diterima tgl) dan Sec.3.
5. Baru setelah itu kerjakan, kalau saya setuju.
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
