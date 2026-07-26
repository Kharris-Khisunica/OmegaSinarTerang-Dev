# CLAUDE.md — Konteks Permanen Proyek

> Letakkan file ini di **root repo**. Claude Code membacanya otomatis setiap sesi.
> Tujuannya: prompt harian bisa pendek karena aturan main sudah ada di sini.

---

## 1. Identitas Proyek

Website operasional FMCG B2B grosir. Solo developer, 34 hari (27 Jul – 29 Agu 2026),
cut-over **1 September 2026 tanpa periode paralel**. Volume target: 50–100 transaksi/hari,
**satu operator**. Artinya: ergonomi input adalah fitur, bukan polish.

**Stack (jangan diganti tanpa diminta):**

| Lapis | Teknologi |
|---|---|
| Backend | NestJS (modular), TypeORM, PostgreSQL + `pgcrypto` |
| Frontend | Nuxt 3, Nuxt UI, Pinia/composables |
| Export | ExcelJS, PDFKit |
| Auth | JWT access + refresh (1 hari), bcrypt |
| Deploy | Docker Compose di mini PC lokal |

**Role:** `MASTER`, `SUPERVISOR`, `OPERATOR`.

---

## 2. Aturan Arsitektur yang Tidak Boleh Dilanggar

1. **Tidak ada hard-delete.** Semua pembatalan lewat VOID + jurnal pembalik.
2. **Jurnal pembalik bertanggal hari ini**, bukan tanggal dokumen asli.
3. **Semua transaksi yang menyentuh stok + jurnal wajib dalam satu DB transaction.**
   Gagal di tengah = rollback penuh. Tidak ada state setengah jadi.
4. **Nomor dokumen** hanya boleh dari `DocumentCounterService.getNextNumber()`
   (`SELECT ... FOR UPDATE` di dalam transaction pemanggil). Dilarang `CREATE SEQUENCE`
   kecuali `supplier_code_seq` yang memang tidak reset bulanan.
   Format: `PREFIX/YYMM/NNNN` → `INV`, `SO`, `PI`, `SJ`, `RJ`, `RB`, `PAY`, `JE`.
5. **Setiap perubahan stok wajib lewat `StockRecorderService`.** Dilarang UPDATE langsung
   ke `product_stock_balance` dari modul lain.
6. **Setiap jurnal wajib lewat `JournalPosterService`** dengan 5 validasi:
   minimal 2 baris · satu sisi > 0 (`CHECK ((debit_amount > 0) <> (credit_amount > 0))`) ·
   `SUM(debit) = SUM(credit)` · akun aktif · nomor entry terisi.
7. **FIFO** pakai `SELECT ... FOR UPDATE` pada `stock_cost_lots` urut `lot_date` tertua.
   `lot_date` = **tanggal terima barang** (`receipt_date`), bukan tanggal invoice.
8. **Stok minus diizinkan**, bukan ditolak. Response mengandung `stockWarning`.
   Cost fallback = `unit_cost` lot terakhir yang diketahui.
9. **Backdate maksimum 2 hari.** Lebih dari itu → 400.
10. **Pembulatan ke atas kelipatan `settings.rounding_multiple` (default 100) hanya di
    Sales Invoice**, tidak pernah di Purchase Invoice. Selisih → akun Pendapatan Pembulatan.
11. **PPN dormant**: `settings.company_is_pkp = false` → PPN selalu 0.
    Tarif dari tabel `tax_rates` (`effective_from`/`effective_to`), bukan dari config.
12. **`audit_logs`**: strip `password`, `password_hash`, `token`, `refresh_token` dari
    `before_data`/`after_data` sebelum disimpan.
13. **VOID oleh Operator wajib lewat `authorization_requests`** (step-up, TTL 15 menit,
    `expires_at` dicek saat eksekusi, bukan hanya saat approve).
14. **Uang** disimpan `NUMERIC(16,2)`, **harga pokok** `NUMERIC(16,4)`,
    **qty** `NUMERIC(16,4)` dalam base unit. Dilarang `float`.

---

## 3. Aturan Data Penting

- `products.tax_status` **tidak ada**. Status pajak ditentukan customer (`customers.is_pkp`).
- Akun kas & bank **tidak di-seed** — diinput Master lewat CRUD COA (`is_cash_account`).
- Akun **Retur Pembelian tidak ada** (sistem perpetual). Jurnalnya Hutang/Kas (D) / Persediaan (K).
- Akun **Retur Penjualan tetap ada** (kontra pendapatan).
- Harga pokok retur penjualan **wajib** dari `sales_invoice_lines.unit_cost_fifo`, bukan harga baru.
- `warehouse_type`: `STORE` · `CUSTOMER_CONSIGNMENT` · `BAD_STOCK`.
  - Mutasi ke `CUSTOMER_CONSIGNMENT` → **hanya** insert `warehouse_mutations`.
    Tidak menyentuh `stock_movements` / `product_stock_balance` / lots.
    Validasi: qty kumulatif ≤ qty yang sudah dibeli customer tsb.
  - Mutasi ke `STORE` / `BAD_STOCK` → 2 baris `stock_movements` type `transfer`,
    lot ikut pindah dengan `unit_cost` sama, **tanpa jurnal**.
- Nilai bad stock **tetap penuh**, tidak diturunkan.
- Tampilan stok **dipecah per satuan** ("12 dus 15 renceng"), bukan desimal.
- `GET /suppliers` untuk `OPERATOR`: `name`, `contact_phone`, `contact_address` **ter-mask**;
  `display_code` tetap tampil.

---

## 4. Rumus Baku

**Total Sales Invoice**
```
subtotal     = Σ(qty × unit_price)
ppn          = (settings.company_is_pkp && customer.is_pkp) ? subtotal × tax_rate : 0
total_kasar  = subtotal + ppn
total_amount = CEIL(total_kasar / rounding_multiple) × rounding_multiple
rounding     = total_amount − total_kasar

Jurnal: Piutang/Kas (D) total_amount · Pendapatan (K) subtotal ·
        PPN Keluaran (K) ppn · Pendapatan Pembulatan (K) rounding ·
        HPP (D) totalCOGS · Persediaan (K) totalCOGS
```

**Retur Penjualan (4 sisi)**
```
Retur Penjualan (D) DPP · PPN Keluaran (D) bila ada · Piutang/Kas (K) total
Persediaan (D) HPP asli · HPP (K) HPP asli
```

**Retur Pembelian**
```
Hutang Usaha atau Kas (D) nilai retur · Persediaan (K) harga pokok lot asal · PPN Masukan (K) bila ada
```

`settlement_type` di setiap dokumen retur: `REDUCE_INVOICE` | `CASH`.

---

## 5. Permission Matrix (ringkas — sumber kebenaran ada di plan §7)

| Endpoint / Fitur | MASTER | SUPERVISOR | OPERATOR |
|---|---|---|---|
| Sales Order / Sales Invoice / Purchase Invoice (write) | ✅ | ❌ 403 | ✅ |
| `GET /chart-of-accounts` | ✅ | ✅ | ❌ 403 |
| `POST/PATCH/DELETE /chart-of-accounts` | ✅ | ❌ 403 | ❌ 403 |
| Jurnal Manual | ✅* | ❌ 403 | ❌ 403 |
| Saldo Awal, Settings | ✅ | ❌ | ❌ 403 |
| Approve `authorization_requests` | ✅ | ✅ | ❌ |
| Retur, Payment, Surat Jalan, Mutasi Gudang, Biaya Operasional | ✅ | ❌ write | ✅ |
| Laporan | ✅ | ✅ | ✅ (kecuali COA) |

\* Jurnal Manual **ditolak** untuk akun Persediaan, Piutang, Hutang — meski Master.

---

## 6. Konvensi Kode

**Backend**
- Satu modul = satu folder: `entities/`, `dto/`, `*.service.ts`, `*.controller.ts`, `*.module.ts`.
- Service engine (`JournalPoster`, `StockRecorder`, `DocumentCounter`, `VoidEngine`) hidup di
  `src/core/` dan **menerima `EntityManager`** dari pemanggil agar ikut transaction yang sama.
- DTO pakai `class-validator`. Tidak ada `any` di boundary controller.
- Migration TypeORM manual (bukan `synchronize: true`). Setiap migration wajib `down()` yang benar.
- Error bisnis → `BadRequestException` dengan `message` berbahasa Indonesia yang bisa dibaca operator.

**Frontend**
- Semua tabel list memakai `<DataTable>`; semua form create/edit memakai `<CrudFormPage>`.
  **Dilarang copy-paste layout tabel/form.** Kalau butuh varian, tambah prop, jangan fork komponen.
- Semua form transaksi wajib: navigasi keyboard penuh, Enter menambah baris,
  autocomplete produk, fokus otomatis ke field pertama.
- Format angka pakai satu composable `useRupiah()` / `useQty()`. Tidak ada `toLocaleString` tersebar.
- Panggilan API lewat `useApi()` yang sudah menyisipkan token & menangani 401 → refresh.

---

## 7. Definition of Done Harian (berlaku untuk SEMUA hari)

Sebuah hari baru boleh ditandai `[x]` di `PROGRESS.md` kalau semuanya hijau:

- [ ] `npm run build` sukses di BE **dan** FE (0 error TypeScript)
- [ ] `npm run lint` bersih
- [ ] `npm run test` hijau (termasuk 4 invarian setelah Hari 8)
- [ ] Migration `up` lalu `down` lalu `up` lagi berhasil di DB kosong
- [ ] `GET /health` mengembalikan 200
- [ ] Halaman/endpoint hari ini diuji manual minimal 1 happy path + 1 error path
- [ ] `PROGRESS.md` diperbarui (checkbox, Tgl Aktual, §4 Modul Selesai)
- [ ] Commit dengan pesan `Hari NN: <ringkasan>`

Jalankan `./scripts/verify.sh` untuk mengecek 5 poin pertama sekaligus.

---

## 8. Yang TIDAK Boleh Dipotong Saat Molor

Journal Poster · Stock Recorder + FIFO · VOID + reversing · integration test Hari 8 ·
alur Saldo Awal · **ergonomi input** (navigasi keyboard, autocomplete, price-suggestion,
modal tambah customer).

Yang boleh dipotong ada di plan v2 §9.3, berurutan. Jangan improvisasi urutan.

---

## 9. Cara Kerja dengan Saya (instruksi untuk Claude Code)

1. Sebelum mulai, **baca `PROGRESS.md` §4 (Modul Selesai)** supaya tahu apa yang sudah ada.
   Jangan membuat ulang yang sudah jadi.
2. Kalau sebuah kebutuhan bertabrakan dengan aturan di §2, **berhenti dan tanya**.
   Jangan diam-diam melonggarkan aturan.
3. Kerjakan **hanya lingkup hari itu**. Kalau tergoda menyentuh modul lain,
   tulis catatannya di akhir jawaban, jangan langsung dikerjakan.
4. Setiap selesai, tampilkan: daftar file yang dibuat/diubah, perintah verifikasi yang
   sudah dijalankan beserta hasilnya, dan checklist DoD hari itu dalam bentuk `[x]`/`[ ]`.
5. Kalau ada langkah DoD yang gagal, **jangan lapor selesai**. Perbaiki dulu atau
   laporkan blocker dengan jelas.
