# Skenario Test — Hari 1–11 (Fondasi + Engine Inti)

Dokumen ini mencakup **seluruh fitur yang sudah dibangun dari Hari 1 sampai Hari 11**
(`PROGRESS.md` §4). Sebagian besar dijalankan manual di browser, sebagian (engine murni
tanpa endpoint HTTP: Journal Poster, Stock Recorder/FIFO, VOID Engine) hanya bisa
divalidasi lewat suite test otomatis — dicatat jelas di tiap bagian mana yang mana.

**Fitur Hari 7–9 (rework) sudah menggantikan sebagian hasil Hari 3–5** (format nomor,
skema produk, `warehouse_type`, step-up). Skenario di bawah memakai bentuk **terbaru**
(pasca-rework) saja — tidak menguji bentuk lama yang sudah mati.

Centang `[ ]` → `[x]` sambil jalan, catat di kolom "Hasil" kalau ada yang meleset.

## Prasyarat

- [ ] Postgres native jalan (port 5432), DB `omega_dev`, migration sudah `up` semua
      (`cd backend && npm run migration:run`)
- [ ] Backend jalan: `cd backend && npm run start:dev` → `GET http://localhost:3000/health` → 200
- [ ] Frontend jalan: `cd frontend && pnpm dev` → buka `http://localhost:3001`
- [ ] Seed 3 akun ada: `master/master`, `supervisor/supervisor`, `operator/operator`
      (`npm run seed` di backend kalau 401/belum ada)
- [ ] `npm run test` di backend hijau semua (68+ test) — prasyarat untuk bagian 6, 9, 11

---

## 1. Hari 1–2 — Scaffold, Auth, RBAC, Audit Log

| # | Langkah | Ekspektasi | Hasil |
|---|---|---|---|
| 1.1 | `GET /health` | 200, tanpa perlu token (`@Public()`) |
| 1.2 | `POST /auth/login` body `{username:"master",password:"master"}` | 200, `accessToken`+`refreshToken` |
| 1.3 | `POST /auth/login` password salah 6x berturut-turut dalam 60 detik | Percobaan ke-6 → 429 (rate-limit login) |
| 1.4 | `GET /auth/me` tanpa header `Authorization` | 401 |
| 1.5 | `GET /auth/me` dengan `accessToken` valid | 200, `role` sesuai user |
| 1.6 | `GET /auth/master-only` pakai token `operator` | 403 |
| 1.7 | `POST /auth/refresh` dengan `refreshToken` lama, lalu pakai lagi `refreshToken` yang sama | Percobaan kedua ditolak (rotasi token) |
| 1.8 | Login FE 3 role bergantian di browser | Ketiganya masuk, sidebar terisi sesuai role, token tersimpan di cookie |
| 1.9 | Buka halaman terproteksi tanpa login (hapus cookie / mode incognito) | Redirect ke `/login?returnUrl=...` |
| 1.10 | Lakukan 1 aksi tulis apa pun (mis. buat Brand baru) lalu cek tabel `audit_logs` (psql/DB client) | Baris baru muncul, kolom `before_data`/`after_data` **tidak mengandung** `password`/`password_hash`/`token`/`refresh_token` |
| 1.11 | Logout dari FE | Sesi hilang, kembali ke `/login`, akses halaman terproteksi ditolak lagi |

---

## 2. Hari 3 — Generator Nomor Dokumen (bentuk pasca-rework Hari 7)

> Bentuk lama `INV/YYMM/NNNN` sudah mati — uji bentuk baru saja.

| # | Langkah | Ekspektasi | Hasil |
|---|---|---|---|
| 2.1 | `GET /settings` (token master) | Ada key `store_code` = `RM01`, identitas toko (nama/kota/telepon) |
| 2.2 | Panggil `DocumentCounterService.getNextNumber('JOURNAL_ENTRY', ...)` lewat jalur nyata (posting jurnal, lihat §6) | Nomor berformat `JE/RM01-YYMMXXXX`, 4 digit, reset tiap bulan |
| 2.3 | Jalankan test `document-counter.service.spec.ts` (`npm run test -- document-counter`) | Test 20 pemanggilan paralel → 20 nomor unik berurutan, tanpa duplikat |
| 2.4 | Di test yang sama, cek skenario transaction gagal (rollback) | `last_number` di `document_counters` **sama** sebelum/sesudah — nomor tidak hilang |
| 2.5 | FE `<DataTable>` (buka mana pun, mis. `/master-data/products`) | Search debounce 300ms, pagination, sort, filter — state tersimpan di URL query |
| 2.6 | FE `<CrudFormPage>` (buka `/master-data/products/create`) | Ctrl+S simpan, Esc kembali (konfirmasi kalau dirty), fokus otomatis ke field pertama |

---

## 3. Hari 4 & 8 — CRUD Master Data (bentuk pasca-rework Hari 8)

### 3.1 Produk (skema baru: Merek + Keterangan + Kemasan + Ukuran)

| # | Langkah | Ekspektasi | Hasil |
|---|---|---|---|
| 3.1.1 | Login MASTER → `/master-data/brands/create` → buat Merek "Bendera" | Tersimpan, muncul di list |
| 3.1.2 | `/master-data/products/create` → isi Merek=Bendera, Keterangan="Putih", Kemasan="Sachet", Ukuran="37 gr" | Pratinjau `display_name` **live** menampilkan persis `"Bendera Putih Sachet 37 gr"` |
| 3.1.3 | Kosongkan field `code` saat submit | Kode ter-generate otomatis format `YYMMDDXXXX` (10 digit) |
| 3.1.4 | Isi konversi satuan: DUS → 12 → RENCENG → 10 → (dasar) | Simpan sukses; buka Edit lagi → rasio tampil kembali `dus=12`, `renceng=10` (bukan qty absolut) |
| 3.1.5 | Cari produk lewat kolom search pakai kata dari `display_name` (mis. "bendera") | Ketemu |
| 3.1.6 | Coba ubah `code` produk yang **belum** pernah `lockCode()`-nya dipanggil | Berhasil (belum terkunci — pemanggil produksi baru mulai Hari 10, lihat §5) |
| 3.1.7 | `POST /products` pakai token OPERATOR | 201 (Operator boleh tulis produk) |
| 3.1.8 | `POST /products` pakai token SUPERVISOR | 403 |
| 3.1.9 | Set `is_bkp = true` di form | Tersimpan, field berlabel awam (bukan istilah pajak teknis) |

### 3.2 Customer

| # | Langkah | Ekspektasi | Hasil |
|---|---|---|---|
| 3.2.1 | `/master-data/customers/create` → nomor telepon `0812-3456-7890` (ada strip) | 400, error tepat di bawah field telepon |
| 3.2.2 | Ganti ke `081234567890` + isi 4 field alamat terpisah (Alamat/Kecamatan/Kota/Provinsi) | 201, tersimpan |
| 3.2.3 | Cek toggle "Aktif" saat form create pertama dibuka | Default **ON** tanpa disentuh |
| 3.2.4 | Login OPERATOR → buka `/master-data/customers/create` → `get_page_text` / lihat DOM | Field/teks **"Akun Piutang" tidak ada sama sekali** (bukan cuma tersembunyi CSS) |
| 3.2.5 | Login MASTER → buka form Customer → dropdown Akun Piutang | Hanya berisi **"1102 - Piutang Usaha"** (satu-satunya akun `isReceivableAccount && isActive`) |
| 3.2.6 | `customers.ar_account_id` dikosongkan (NULL) | Resolusi akun piutang jatuh ke `settings.default_ar_account_id` (dibuktikan test `ar-account-resolver.service.spec.ts`) |

### 3.3 Supplier (masking Operator)

| # | Langkah | Ekspektasi | Hasil |
|---|---|---|---|
| 3.3.1 | Buat Supplier "PT Abadi Jaya", telepon `081234567789`, alamat lengkap | `display_code` auto `SUP-001` (bukan dari input) |
| 3.3.2 | `GET /suppliers` token MASTER | `name`/`contact_phone`/`contact_address` **utuh** |
| 3.3.3 | `GET /suppliers` token OPERATOR | `name` → `"PT A***"`, `contact_phone` → `"0812****789"`, alamat ter-mask serupa, **`display_code` tetap utuh** |
| 3.3.4 | Set `is_pkp = true` | Tersimpan (dipakai gerbang PPN masukan Hari 14) |

### 3.4 Warehouse (rename `TITIPAN_PELANGGAN`)

| # | Langkah | Ekspektasi | Hasil |
|---|---|---|---|
| 3.4.1 | Buat Warehouse `warehouseType = STORE` | Tersimpan, field "Customer Penitip" **tersembunyi** |
| 3.4.2 | Ganti `warehouseType = TITIPAN_PELANGGAN` di form | Field "Customer Penitip" **muncul**, jadi wajib |
| 3.4.3 | Submit `TITIPAN_PELANGGAN` tanpa pilih customer | 400 |
| 3.4.4 | Kirim value enum lama `CUSTOMER_CONSIGNMENT` langsung lewat API (curl) | 400 — enum sudah tidak dikenal |
| 3.4.5 | Set 2 warehouse `isDefault=true` dengan `warehouseType` sama | Yang lama otomatis jadi `false` (unik per tipe, bukan global) |

### 3.5 Merek / Satuan / Salesman (master kecil, schema seragam)

| # | Langkah | Ekspektasi | Hasil |
|---|---|---|---|
| 3.5.1 | `/master-data/units/create` → buat satuan "DUS" | Tersimpan |
| 3.5.2 | `/master-data/salesmen/create` → buat salesman aktif | Tersimpan, muncul di list |
| 3.5.3 | Nonaktifkan salah satu (Merek/Satuan/Salesman) lewat row action | `isActive=false`, **bukan** dihapus (tidak ada endpoint `DELETE` di modul manapun) |

### 3.6 Settings

| # | Langkah | Ekspektasi | Hasil |
|---|---|---|---|
| 3.6.1 | `GET /settings` token OPERATOR | 403 (MASTER-only) |
| 3.6.2 | `PATCH /settings/backdate_max_days` value `"abc"` (setting bertipe NUMBER) | 400 |
| 3.6.3 | `PATCH /settings/company_is_pkp` value `true` | 200, `GET /settings` mengembalikan `true` bertipe boolean (bukan string `"true"`) |
| 3.6.4 | Cek COA seed | **Tidak ada** akun "Pendapatan Pembulatan"; **ada** Diskon Penjualan, Selisih Pembayaran, Selisih Retur Pembelian |

---

## 4. Hari 5 & 9 — Authorization Requests + Step-Up (bentuk pasca-rework Hari 9)

> Kode status **412** (bukan 428 lama). `payload`+`context_summary` wajib ada.

| # | Langkah | Ekspektasi | Hasil |
|---|---|---|---|
| 4.1 | Login OPERATOR → buka `/qa/step-up-demo` → trigger aksi step-up | Modal muncul dengan countdown TTL 15 menit + `context_summary` terbaca |
| 4.2 | Cek response HTTP saat trigger pertama kali (Network tab) | Status **412**, body berisi `authorizationRequestId` |
| 4.3 | Login MASTER/SUPERVISOR tab lain → `/persetujuan` | Request tadi muncul di antrian, `context_summary` terbaca jelas |
| 4.4 | Approve request tsb | Tab operator otomatis lanjut (polling 5 detik) **tanpa refresh manual**, < 5 detik |
| 4.5 | Ulangi, kali ini **Reject** tanpa isi alasan | Ditolak — `reason` wajib diisi dulu |
| 4.6 | Reject dengan alasan terisi | Tab operator menampilkan alasan penolakan |
| 4.7 | Trigger step-up baru, di modal klik **Batalkan** (bukan approve/reject) | Request tetap `PENDING` di antrian (tidak menggantung status lain) |
| 4.8 | Approve satu request, lalu coba **eksekusi ulang** dengan `X-Authorization-Request-Id` yang sama | Ditolak — sudah `EXECUTED`, sekali pakai |
| 4.9 | Test `authorization-requests.service.spec.ts` — payload matcher `CASH_OUTFLOW` | Approval untuk payload Rp 1 juta **ditolak** dipakai eksekusi Rp 100 juta |
| 4.10 | Test yang sama — mundurkan `expires_at` 16 menit lalu eksekusi | Ditolak, kedaluwarsa dicek **saat eksekusi**, bukan cuma saat approve |
| 4.11 | `GET /authorization-requests/:id` pakai token requester sendiri (OPERATOR yang membuatnya) | 200 (ownership-gated) |
| 4.12 | `GET /authorization-requests/:id` pakai token OPERATOR lain (bukan requester) | 403/ditolak |

---

## 5. Hari 6 — Journal Poster + COA + Jurnal FE

> `JournalPosterService` **tidak punya endpoint POST langsung** (dipanggil dari modul lain). Uji lewat test otomatis untuk validasi engine, lewat FE untuk baca hasilnya.

| # | Langkah | Ekspektasi | Hasil |
|---|---|---|---|
| 5.1 | Jalankan `journal-poster.service.spec.ts` (`npm run test -- journal-poster`) | 7 test hijau: min 2 baris, satu sisi>0, balance (dibanding sebagai sen integer), akun aktif, nomor entry terisi |
| 5.2 | Di test yang sama, cek posting sengaja tidak balance | Ditolak, **`document_counters` tidak naik** (nomor tidak terpakai untuk posting gagal) |
| 5.3 | Coba (lewat test) posting ke akun `is_active=false` | Ditolak |
| 5.4 | `/akuntansi/bagan-akun` (login MASTER/SUPERVISOR) | Tree 11 akun seed, tombol "Expand semua"/"Collapse semua", search client-side |
| 5.5 | Login OPERATOR → buka `/akuntansi/bagan-akun` lewat URL langsung | Ditolak/403 (`GET /chart-of-accounts` MASTER+SUPERVISOR saja) |
| 5.6 | `/akuntansi/jurnal` (semua role, termasuk OPERATOR) | List entry, filter tanggal + akun jalan |
| 5.7 | Klik satu baris jurnal | Drawer detail terbuka: baris debit/kredit per akun + footer total debit=kredit |
| 5.8 | Cari entry yang `isReversal=true` (kalau ada dari test VOID §11) | Badge "Pembalik" tampil + link ke nomor jurnal asli yang dibalik |

---

## 6. Hari 7 — Rework Format Nomor & Identitas Toko

| # | Langkah | Ekspektasi | Hasil |
|---|---|---|---|
| 6.1 | `GET /settings` → cari `store_code` | `RM01`, dan identitas toko (nama/kota/telepon) tersimpan terpisah |
| 6.2 | `GET /settings/store-code-lock-status` | Mengembalikan status terkunci/belum (terkunci setelah dokumen pertama terbit) |
| 6.3 | Cek tabel COA — akun "Pendapatan Pembulatan" | **Tidak ada** (dihapus, dicek 0 pemakaian) |
| 6.4 | Cek `settings` — key `rounding_multiple` | **Tidak ada lagi** |

---

## 7. Hari 8 — `ProductsService.lockCode()` & `ArAccountResolverService`

| # | Langkah | Ekspektasi | Hasil |
|---|---|---|---|
| 7.1 | Jalankan `ar-account-resolver.service.spec.ts` | 3 test: pakai `arAccountId` eksplisit, fallback ke default, 400 kalau default kosong |
| 7.2 | Panggil `lockCode()` manual (lewat test atau `UPDATE` langsung) atas produk yang `isCodeLocked=false` | Berubah jadi `true`, idempotent (panggil 2x tidak error) |
| 7.3 | Setelah terkunci, `PATCH /products/:id` dengan `code` baru | 400, field lain tetap bisa diubah |

---

## 8. Hari 10 — Stock Recorder + FIFO

> **Tidak ada endpoint HTTP** (pure service, dipanggil modul dokumen mulai Hari 13+).
> Validasi lewat suite `stock-recorder.service.spec.ts` saja.

| # | Langkah (jalankan `npm run test -- stock-recorder`) | Ekspektasi | Hasil |
|---|---|---|---|
| 8.1 | `recordIn` 10 unit @1000, lalu 10 unit @1200 (lot berbeda), `recordOut` 15 | FIFO: lot pertama habis (10@1000), lot kedua sisa 5 → total cost **16.000** |
| 8.2 | `recordOut` melebihi stok yang ada | **Tidak ditolak** — balance jadi negatif, `stockWarning` berisi kata "minus" |
| 8.3 | `transfer` 5 unit STORE→BAD_STOCK | 2 `stock_movements`, lot tujuan `unit_cost` **identik** dengan lot asal |
| 8.4 | 2 `recordOut` paralel (`Promise.all`, 2 transaction terpisah) atas produk yang sama | Balance akhir tepat sesuai net (tidak ada konsumsi lot tumpang tindih — row-lock `FOR UPDATE` bekerja) |
| 8.5 | `getLatestCostBasis()` saat lot terbaru adalah bonus (`unit_cost=0`) | Melewati lot bonus, kembalikan lot berbayar terakhir |
| 8.6 | `formatQtyBreakdown(255, ...)` dengan 1 DUS = 20 PCS | `"12 DUS 15 PCS"` |

---

## 9. Hari 11 — 5 Invarian + VOID Engine

> Backend murni, tanpa endpoint HTTP untuk VOID (dipanggil modul dokumen Hari 13+).

| # | Langkah (jalankan `npm run test -- five-invariants` dan `npm run test -- void`) | Ekspektasi | Hasil |
|---|---|---|---|
| 9.1 | TEST 1 — scan global `journal_entries` | Semua entry: `SUM(debit) = SUM(credit)` |
| 9.2 | TEST 2 — urutan konsumsi FIFO | Lot dikonsumsi urut `lot_date` tertua dulu |
| 9.3 | TEST 3 — VOID dokumen bertanggal 2 hari lalu | Jurnal pembalik **bertanggal hari ini**, bukan tanggal dokumen asli — angka bulan lalu tidak berubah |
| 9.4 | TEST 4 — stok rekonsiliasi | `SUM(stock_movements.qty)` = `product_stock_balance` |
| 9.5 | TEST 5 — nilai persediaan | `Σ stock_cost_lots.qty_remaining × unit_cost` = saldo akun Persediaan di jurnal |
| 9.6 | `voidDocument()` dasar (jurnal + stock bersamaan) | Sukses, jurnal pembalik + movement pembalik tercipta |
| 9.7 | `voidDocument()` dipanggil 2x atas dokumen yang sama | Kedua kali **hanya satu** yang sukses (idempotensi, termasuk race lewat `Promise.allSettled`) |
| 9.8 | `voidDocument()` tanpa `reasonNote` | Ditolak **sebelum** menyentuh DB (lot/balance tidak berubah sama sekali) |
| 9.9 | VOID atas movement yang lot-nya sudah sebagian terjual | Ditolak dengan pesan "Barang dari faktur ini sudah terjual. Buat retur pembelian, bukan pembatalan." + seluruh transaction (termasuk jurnal pembalik yang sempat ditulis) **rollback bersih** |
| 9.10 | `voidDocument()` dengan `sourceType` yang belum `registerHook()` | Error jelas (fail-closed), **bukan** diam-diam meloloskan VOID |
| 9.11 | VOID atas `movementType === TRANSFER` | Ditolak dengan pesan "belum didukung" (lingkup sengaja di luar Hari 11) |
| 9.12 | VOID 1 `sourceId` dengan 2 movement/2 lot sekaligus (kasus multi-baris) | Sekali VOID membalik **keduanya** |

---

## 10. Hari 11 (FE) — Dashboard jujur + Nav Supervisor 3-item

> Skenario lengkap dan lebih detail ada di `SKENARIO_TEST_HARI11.md` — ringkasan di sini,
> jalankan file itu untuk versi penuh.

| # | Langkah | Ekspektasi | Hasil |
|---|---|---|---|
| 10.1 | Login MASTER → `/` | 4 kartu: 3 kartu (Penjualan/Piutang/Stok Minus) = `—`, "Persetujuan Menunggu" = angka sungguhan |
| 10.2 | Login OPERATOR → `/` | Kartu "Persetujuan Menunggu" = `"— (khusus Master/Supervisor)"`, **nol** request ke `/authorization-requests` (cek Network tab) |
| 10.3 | Login SUPERVISOR | Otomatis lempar ke `/pengecekan-invoice`, sidebar **persis 3 item**: Pengecekan Invoice, Antrian Persetujuan, Laporan |
| 10.4 | SUPERVISOR ketik manual URL `/master-data/products` | Bisa masuk (disengaja — hanya sidebar yang dibatasi, bukan akses URL) |
| 10.5 | SUPERVISOR ketik manual URL `/pengaturan` | Ditolak, lempar ke `/pengecekan-invoice` |

---

## 11. Verifikasi Build & DoD Gabungan

```bash
# Backend
cd backend
npm run build       # 0 error TypeScript
npm run lint        # bersih
npm run test         # semua suite hijau (68+ test per Hari 11)
npm run migration:run   # sudah dijalankan di DB dev

# Frontend
cd frontend
pnpm run lint
pnpm run typecheck
pnpm run build
```

- [ ] `GET /health` → 200
- [ ] Tidak ada satu pun endpoint `DELETE` di seluruh modul (`grep -rn "@Delete(" backend/src`)
- [ ] `.env` tidak ter-stage di git
- [ ] Ketiga role bisa login, RBAC per §1–§10 di atas semuanya sesuai
- [ ] Semua `audit_logs` dari sesi ini bersih dari `password`/`token` mentah

---

## Ringkasan cakupan per hari

| Hari | Fitur | Cara uji |
|---|---|---|
| 1 | Scaffold BE+FE, koneksi DB | `/health`, `npm run dev` |
| 2 | Auth JWT+refresh, RBAC, rate-limit, audit log | §1 |
| 3 | Generator nomor dokumen, `<DataTable>`/`<CrudFormPage>` | §2 |
| 4+8 | CRUD Products/Customers/Suppliers/Warehouses/Settings/Brands/Units/Salesmen (skema pasca-rework) | §3 |
| 5+9 | `authorization_requests` + step-up (412, payload+context_summary) | §4 |
| 6 | Journal Poster (5 validasi) + FE COA/Jurnal | §5 |
| 7 | Format nomor `KODE/RM01-YYMMXXXX` + identitas toko | §6 |
| 8 | `lockCode()` + `ArAccountResolverService` | §7 |
| 10 | Stock Recorder + FIFO | §8 |
| 11 | 5 invarian + VOID Engine + Dashboard/Nav Supervisor | §9–§10 |
