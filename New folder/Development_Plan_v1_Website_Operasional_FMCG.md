# Development Plan v2 — Website Operasional FMCG (B2B Grosir)

**Menggantikan** `Development_Plan_v1_Website_Operasional_FMCG.md`.
Disusun setelah review PM lintas 6 ronde klarifikasi. Seluruh keputusan di §1 sudah dikonfirmasi klien.

| | |
|---|---|
| Durasi development | **34 hari** (sebelumnya 21) |
| Mulai | 27 Juli 2026 |
| Hari 34 | **29 Agustus 2026** |
| Cut-over | **1 September 2026** (tanggal 1 awal bulan, tanpa periode paralel) |
| Pola kerja | 7 hari/minggu, solo developer |
| Buffer terjadwal | Hari 15, 31, 33 (≈9%) |

> **Catatan buffer**: 9% jauh di bawah standar 25–30% untuk sistem akuntansi. Ini konsekuensi sadar dari keputusan scope penuh dengan cut-over 1 September. Mitigasinya ada di §9 (UAT mingguan sejak minggu pertama + daftar potong darurat yang sudah disepakati di muka).

---

## 1. Keputusan Final (hasil review)

### 1.1 Pajak

| Topik | Keputusan |
|---|---|
| Status PKP toko | **Belum PKP.** Config global `company_is_pkp` default `false` |
| Flag PKP customer | Kolom `customers.is_pkp` tetap dibuat, **dormant** selama config toko mati |
| Perhitungan PPN | **Exclude** (harga + PPN), disimpan sebagai config `tax_calculation_mode` |
| `products.tax_status` | **DIHAPUS** — status pajak sepenuhnya ditentukan customer |
| e-Faktur / Coretax / NPWP customer | **Tidak dibangun.** Baru relevan saat toko resmi PKP |
| Tarif PPN | Tetap di `TAX_RATES` dengan `effective_from`/`effective_to`, **bukan** di config, agar invoice historis tidak berubah |

**Tindak lanjut klien**: cek posisi omzet tahunan terhadap ambang wajib PKP ke konsultan pajak. Kalau sudah dekat ambang, jadwal implementasi PPN perlu dimajukan.

### 1.2 Akuntansi

| Topik | Keputusan |
|---|---|
| Pembulatan | **Ke atas, kelipatan Rp100**, dapat diubah lewat config. **Hanya di penjualan**, tidak di pembelian |
| Lokasi pembulatan | **Di invoice** (bukan di pembayaran). Selisih → akun Pendapatan Pembulatan |
| Akun Retur Pembelian | **DIHAPUS dari seed.** Sistem perpetual, jadi jurnalnya Hutang (D) / Persediaan (K) |
| Akun Retur Penjualan | **TETAP** — pendapatan dan HPP terpisah, jadi butuh akun kontra |
| Jurnal manual | **Dibangun** (Master only). **Diblokir** untuk Persediaan, Piutang, Hutang |
| Saldo awal | Alur terpadu: satu input menghasilkan jurnal pembuka **dan** lot FIFO dari angka yang sama |
| Akun kas & bank | **Tidak di-seed.** Diinput manual Master (Kas Besar, Kas Kecil, Kas Toko, BCA, BSI, Mandiri) |
| Backdate transaksi | **Maksimum 2 hari.** FIFO tidak menghitung ulang ke belakang — diterima sebagai selisih wajar |
| Jurnal pembalik VOID | Bertanggal **hari ini**, bukan tanggal dokumen asli |
| Tutup buku / kunci periode | **Tidak dibangun** di MVP |
| Cash opname | **Laporan saja.** Koreksi lewat jurnal manual |

### 1.3 Penjualan

| Topik | Keputusan |
|---|---|
| Kanal | Dua: **toko** (customer datang) dan **agen** (barang dikirim, uang dibawa pulang) |
| Layar khusus penjualan tunai | **Tidak dibuat.** "Penjualan tetaplah penjualan" — yang membeda hanya pelunasan |
| Harga jual | **Diinput manual per transaksi.** Tidak ada harga standar per produk |
| `price-suggestion` | **WAJIB** (naik dari opsional) — satu-satunya jaring pengaman salah ketik harga |
| Customer "Umum/Tunai" | **Tidak di-seed.** Operator menambah customer baru — **wajib bisa lewat modal dari form penjualan**, bukan pindah halaman |
| Diskon penjualan | Tidak ada |
| Termin / jatuh tempo | Tidak ada UI. Kolom `due_date` tetap dipasang (nullable) untuk kebutuhan nanti |
| Uang muka | Tidak ada. "Bayar dulu baru ambil" = **lunas penuh** + gudang titip |
| Nota | **A4, 2 rangkap identik** |
| Sumber pesanan agen | **Sales Order** |

### 1.4 Pembelian

| Topik | Keputusan |
|---|---|
| Nomor faktur supplier | Kolom `supplier_invoice_number` **ditambahkan**, tanpa format baku |
| Dasar urutan FIFO (`lot_date`) | **Tanggal terima barang**, bukan tanggal invoice. Jurnal tetap pakai tanggal invoice |
| Edit invoice | **Diizinkan** selama belum ada pembayaran teralokasi **dan** lot belum terkonsumsi. Di luar itu wajib VOID |
| Bonus barang | **DITUNDA** — lihat §1.7 |
| Ongkos angkut | **Dibayar terpisah** → cukup Biaya Operasional biasa. Tidak masuk harga pokok |
| Diskon supplier | Belum pasti → kolom `discount_amount` disiapkan di header, alokasi proporsional |
| Retur pembelian | Dokumen bernomor. Penyelesaian: **kurangi hutang** atau **uang masuk kas** |

### 1.5 Gudang & Stok

| Topik | Keputusan |
|---|---|
| Jenis gudang | `STORE`, `CUSTOMER_CONSIGNMENT`, `BAD_STOCK` |
| **Mutasi gudang bercabang** | Ke `CUSTOMER_CONSIGNMENT` → Lapisan 2 murni, tanpa movement. Ke `STORE`/`BAD_STOCK` → catat `transfer` (2 baris movement, lot ikut pindah dengan harga pokok sama, tanpa jurnal) |
| Gudang bad stock | **Satu** untuk semua produk |
| Nilai bad stock | **Tetap penuh** (tidak diturunkan) |
| Tukar bad stock ke supplier | **DITUNDA** |
| Validasi gudang titip | Mutasi ke gudang titip **tidak boleh melebihi** qty yang sudah dibeli customer tsb |
| Retur penjualan | Masuk **Gudang Toko** dulu. Bad stock diinput terpisah lewat mutasi |
| Stok minus | Diizinkan sebagai warning. **Laporan "produk dengan histori stok minus" masuk MVP** sebagai mekanisme deteksi |
| Tampilan satuan | **Dipecah** ("12 dus 15 renceng"), bukan desimal |

### 1.6 Pembayaran & Pengiriman

| Topik | Keputusan |
|---|---|
| Pelunasan pecah | **Ya** — multi-metode dalam satu batch (mis. 30jt kas + 50jt transfer, sisa tetap piutang). Berlaku dua arah (customer & supplier) |
| Alokasi | FIFO otomatis, **wajib bisa diedit manual** di layar konfirmasi |
| Giro / cek mundur | Tidak ada |
| Overpayment | Ditolak (pembulatan sudah di invoice, jadi tidak akan terjadi) |
| Surat jalan | **Per customer**, membawa `agen_id` + `kendaraan_id` |
| Agen | Entitas sendiri (id, nama, is_active) |
| Kendaraan | Entitas sendiri (id, nama, plat nomor) |
| Barang tidak jadi terkirim | **Cukup status** di surat jalan (kendaraan belum jadi gudang terlacak) |
| Uang setoran agen | Masuk **Kas Besar** |
| Rekap setoran | Dikelompokkan per **kendaraan + tanggal** |
| Waktu input pelunasan agen | **Akhir hari** |

### 1.7 Ditunda (dengan konsekuensi tercatat)

| Item | Konsekuensi selama ditunda |
|---|---|
| **Bonus barang dari principal** | Operator input qty total termasuk bonus + sesuaikan harga satuan agar total baris persis sama dengan nota. Sisa pembulatan beberapa rupiah per transaksi tidak terhindarkan |
| **Tukar bad stock ke supplier** | Bad stock menumpuk di neraca sebagai aset bernilai penuh tanpa jalan keluar. Perlu ditinjau sebelum tutup buku tahunan |
| **Nilai bad stock diturunkan** | Aset di neraca lebih optimis dari kenyataan |
| **Ongkos angkut ke harga pokok** | HPP lebih rendah dari kenyataan, margin kotor terlihat lebih baik. Lazim di UKM, diterima sadar |
| **Master akses dari luar toko** | Belum diputuskan. Kalau nanti dipakai, wajib tambah rate-limit login + HTTPS (≈0,25 hari) |
| **Tutup buku / kunci periode** | Transaksi lama bisa di-VOID kapan saja. Dibatasi sebagian oleh backdate maks 2 hari |

---

## 2. Perubahan Skema dari v1

### 2.1 Tabel baru (11)

| Tabel | Fungsi |
|---|---|
| `settings` | Config: `company_is_pkp`, `rounding_multiple`, `tax_calculation_mode`, `backdate_max_days` |
| `document_counters` | Penomoran reset bulanan, aman dari race condition |
| `payment_batch_methods` | Pelunasan pecah multi-metode |
| `agents` | Agen pengirim |
| `vehicles` | Kendaraan pengangkut |
| `delivery_orders` + `delivery_order_lines` | Surat jalan |
| `sales_returns` + `sales_return_lines` | Retur penjualan bernomor |
| `purchase_returns` + `purchase_return_lines` | Retur pembelian bernomor |

### 2.2 Kolom baru

| Tabel | Kolom |
|---|---|
| `customers` | `is_pkp BOOLEAN DEFAULT false` |
| `warehouses` | `warehouse_type` += `'BAD_STOCK'` |
| `purchase_invoices` | `supplier_invoice_number`, `discount_amount`, `receipt_date` |
| `sales_invoices` | `due_date` (nullable, tanpa UI), `rounding_amount` |
| `payment_batches` | `agent_id`, `vehicle_id` (nullable, kanal agen) |
| `authorization_requests` | `expires_at` |

### 2.3 Kolom / objek dihapus

- `products.tax_status` — status pajak kini di customer
- `payment_batches.payment_account_id` — pindah ke `payment_batch_methods`
- Seed COA `1-1000 Kas`, `1-1100 Bank` — diinput manual Master
- Seed COA `5-1100 Retur Pembelian` — tidak tepat di sistem perpetual
- `CREATE SEQUENCE supplier_code_seq` **dipertahankan** (kode supplier tidak reset bulanan)

### 2.4 Perbaikan teknis

| Perbaikan | Alasan |
|---|---|
| `stock_cost_lots.unit_cost` → `NUMERIC(16,4)` | Nilai total lot harus cocok dengan saldo GL Persediaan |
| Trigger `updated_at` generik | Update raw SQL (decrement `qty_remaining`) tidak lewat TypeORM |
| `CHECK ((debit_amount > 0) <> (credit_amount > 0))` | Constraint lama meloloskan baris 0/0 |
| `authorization_requests.expires_at` | TTL 15 menit, mencegah approval lama dieksekusi belakangan |
| Endpoint rekonsiliasi stok | Jaring pengaman cache `product_stock_balance` |
| Password/token di-strip dari `audit_logs` | `before_data`/`after_data` JSONB tidak boleh menyimpan kredensial |

---

## 3. Format Penomoran Dokumen

Reset **per bulan**, format `PREFIX/YYMM/NNNN`.

| Dokumen | Prefix | Contoh |
|---|---|---|
| Sales Invoice | `INV` | `INV/2609/0001` |
| Sales Order | `SO` | `SO/2609/0001` |
| Purchase Invoice (internal) | `PI` | `PI/2609/0001` |
| Surat Jalan | `SJ` | `SJ/2609/0001` |
| Retur Penjualan | `RJ` | `RJ/2609/0001` |
| Retur Pembelian | `RB` | `RB/2609/0001` |
| Payment Batch | `PAY` | `PAY/2609/0001` |
| Journal Entry | `JE` | `JE/2609/0001` |
| Supplier (tidak reset) | `SUP` | `SUP-001` |

**Implementasi**: tabel `document_counters(doc_type, period, last_number)` dengan `SELECT ... FOR UPDATE` di dalam transaction pemanggil. Tidak memakai `CREATE SEQUENCE` karena sequence tidak bisa reset otomatis per periode.

---

## 4. Breakdown Harian — 34 Hari

Legenda: ⚠️ risiko molor tinggi · 🔒 blocker bagi hari sesudahnya

### Fase 1 — Fondasi (Hari 1–4) · 27–30 Juli

| Hari | Backend | Frontend |
|---|---|---|
| **1** | Scaffold NestJS modular, PostgreSQL, TypeORM, `pgcrypto`, git, env | Scaffold Nuxt + Nuxt UI, layout (sidebar + topbar), struktur `pages/` |
| **2** | `users`, JWT + refresh (1 hari), bcrypt, RBAC Guard, login/refresh/logout, seed 3 user, **rate-limit login** | Login page, auth composable, route middleware, logout |
| **3** 🔒 | Migration `products`(+conversions), `customers`, `suppliers`, `warehouses`, `tax_rates`, `chart_of_accounts`+seed, `settings`, `document_counters` + **generator nomor** | ⚠️ `<DataTable>` + `<CrudFormPage>` (Frontend Engine) |
| **4** | CRUD Products, Customers, Suppliers (auto-code + masking), Warehouses, Settings | Halaman Products, Customers, Settings |

> Hari 3–4 adalah limpahan resmi satu sama lain, bukan buffer. Frontend Engine di Hari 3 adalah fondasi seluruh frontend — kalau abstraksinya buru-buru, setiap modul sesudahnya membayar bunganya.
> **Mulai Hari 4, klien sudah bisa input master data** (100 produk + konversi satuan, ~100 customer). Keluarkan ini dari jalur kritis cut-over — syaratnya diinput ke instance yang datanya akan dibawa ke produksi.

### Fase 2 — Engine Inti (Hari 5–10) · 31 Juli–5 Agustus

| Hari | Backend | Frontend |
|---|---|---|
| **5** | Export generik (ExcelJS/PDFKit), `authorization_requests` + guard step-up + `expires_at` | Halaman Suppliers, Warehouses (pilih `warehouse_type`) |
| **6** 🔒 | `journal_entries` + lines, **Journal Poster** + 5 validasi wajib | Halaman COA (tree, view only) |
| **7** 🔒 | `stock_movements`, `product_stock_balance`, `stock_cost_lots`, `stock_cost_consumptions`. **Stock Recorder + FIFO + row-lock** | Halaman Authorization Requests (antrian + modal approve) |
| **8** | ⚠️ **Integration test 4 invarian** (§6). VOID generik + reversing. Wiring step-up end-to-end | Dashboard placeholder |
| **9** | **Jurnal Manual** (Master, blokir Persediaan/Piutang/Hutang). **Alur Saldo Awal terpadu** (jurnal + lot sekaligus) | Halaman Jurnal Manual, halaman Saldo Awal |
| **10** | **Warehouse Mutation bercabang** + get-or-create gudang titip + validasi qty titip | Halaman Warehouse Mutation + riwayat. Uji manual CRUD end-to-end |

### Fase 3 — Pembelian (Hari 11–15) · 6–10 Agustus

| Hari | Backend | Frontend |
|---|---|---|
| **11** | `purchase_invoices` + lines, `goods_receipts` + lines. `POST /purchase-invoices` (auto GR + Stock Recorder + Journal). Alokasi `discount_amount` proporsional. `lot_date` = `receipt_date` | Form Purchase Invoice multi-baris (subtotal/total live) |
| **12** | Edit invoice bersyarat, VOID + reversing stock & journal | Detail Purchase Invoice + tombol edit/void |
| **13** | `purchase_returns` + lines + nomor. Endpoint retur (kurangi hutang / uang masuk kas) | Halaman Retur Pembelian + cetak A4 |
| **14** | `operational_expenses` + CRUD + journal + VOID | Halaman Operational Expenses |
| **15** | **Buffer** + CRUD COA penuh Master (termasuk akun kas/bank & piutang custom) | Form tambah/ubah akun COA |

### Fase 4 — Penjualan (Hari 16–20) · 11–15 Agustus

| Hari | Backend | Frontend |
|---|---|---|
| **16** | `sales_orders` + lines + CRUD + `convert-to-invoice` | Halaman Sales Order |
| **17** | `price-suggestion` (wajib). `sales_invoices` + lines migration | ⚠️ Mulai form Sales Invoice — autocomplete produk + suggest harga + **modal tambah customer** |
| **18** | ⚠️ `POST /sales-invoices` full flow: pembulatan invoice, PPN dormant, Stock Recorder, Journal | Lanjut form + preview total live |
| **19** | Edit bersyarat + VOID Sales Invoice | Detail Sales Invoice + **cetak nota A4 2 rangkap** |
| **20** | `sales_returns` + lines + nomor. Jurnal 4 sisi + penyelesaian (kurangi tagihan / uang keluar kas) | Halaman Retur Penjualan + cetak |

### Fase 5 — Pengiriman & Pembayaran (Hari 21–25) · 16–20 Agustus

| Hari | Backend | Frontend |
|---|---|---|
| **21** | `agents`, `vehicles` + CRUD. `delivery_orders` + lines + nomor | Halaman Agen, Kendaraan |
| **22** | Endpoint surat jalan dari invoice + status terkirim/belum | Halaman Surat Jalan + **cetak A4** |
| **23** | ⚠️ `payments/preview-allocation`. `payment_batches` + `payment_batch_methods` + `payments` + `agent_id`/`vehicle_id` | Payment step 1 — pilih pihak, input multi-metode |
| **24** | ⚠️ `payments/confirm` (multi-metode, AR+AP simetris), VOID batch | Payment step 2 — **alokasi dapat diedit**, + riwayat batch |
| **25** | Rekap setoran agen (group kendaraan + tanggal) | Halaman Rekap Setoran Agen |

### Fase 6 — Laporan & Serah Terima (Hari 26–34) · 21–29 Agustus

| Hari | Backend | Frontend |
|---|---|---|
| **26** | Laporan stok per gudang (**satuan dipecah**), laporan barang titipan (sumber: `warehouse_mutations`) | Halaman Laporan Stok, Barang Titipan |
| **27** | Laporan penjualan, piutang, hutang | Halaman laporan tsb |
| **28** | Laporan biaya operasional, **rekap kas harian per akun**, cash opname (laporan) | Halaman Kas |
| **29** | Laporan retur, **laporan produk stok minus**, endpoint rekonsiliasi stok | Halaman laporan sisa |
| **30** | Export Excel/PDF seluruh laporan | Tombol export di semua halaman laporan |
| **31** | **Buffer** — perbaikan temuan UAT minggu 1–4 | Buffer |
| **32** | Audit RBAC/Permission Matrix lintas endpoint (§7) | Audit Permission Matrix lintas halaman |
| **33** | **Buffer** | Buffer |
| **34** | Smoke test end-to-end. **Dokumentasi setup & deploy.** Checklist go-live (§8) | Smoke test UI. Serah terima |

---

## 5. Spec Fungsi yang Berubah

### 5.1 Warehouse Mutation — bercabang

```
mutate(productId, fromWarehouseId, toWarehouseId, qty):
  toType = warehouses[toWarehouseId].warehouse_type

  IF toType == 'CUSTOMER_CONSIGNMENT':
      # Lapisan 2 murni — stok perusahaan sudah berkurang saat Sales Invoice
      validasi: qty kumulatif ke gudang titip ini <= qty dibeli customer tsb
      INSERT warehouse_mutations
      # TIDAK menyentuh stock_movements / product_stock_balance / lots

  ELSE:  # 'STORE' atau 'BAD_STOCK' — persediaan milik perusahaan
      INSERT warehouse_mutations
      stockRecorder.recordMovement(type='transfer', toWarehouseId=...)
      # 2 baris movement, lot FIFO ikut pindah dengan unit_cost yang sama
      # TIDAK ada jurnal — akun Persediaan tidak berubah
```

### 5.2 Perhitungan Total Sales Invoice

```
subtotal      = Σ(qty × unit_price)
ppn           = IF settings.company_is_pkp AND customer.is_pkp
                  THEN subtotal × tax_rate    # exclude: PPN ditambahkan
                  ELSE 0
total_kasar   = subtotal + ppn
total_amount  = CEIL(total_kasar / rounding_multiple) × rounding_multiple
rounding      = total_amount − total_kasar

Jurnal:
  Piutang/Kas         (D)  total_amount
  Pendapatan          (K)  subtotal
  PPN Keluaran        (K)  ppn                    -- bila > 0
  Pendapatan Pembulatan (K) rounding              -- bila > 0
  HPP                 (D)  totalCOGS
  Persediaan          (K)  totalCOGS
```

Pembulatan **tidak berlaku** di Purchase Invoice — total harus persis sama dengan nota supplier.

### 5.3 Jurnal Retur

**Retur Pembelian** (perpetual, tanpa akun kontra):
```
Hutang Usaha atau Kas  (D)  nilai retur
Persediaan             (K)  nilai retur    -- harga pokok lot asal
PPN Masukan            (K)  bila ada
```

**Retur Penjualan** (4 sisi):
```
Retur Penjualan        (D)  DPP
PPN Keluaran           (D)  bila ada
Piutang atau Kas       (K)  total
--- dan ---
Persediaan             (D)  HPP asli saat penjualan
HPP                    (K)  HPP asli saat penjualan
```
Harga pokok barang retur **wajib** memakai `unit_cost_fifo` dari `sales_invoice_lines`, bukan harga baru.

### 5.4 Penyelesaian Retur

Setiap dokumen retur punya field `settlement_type`:

| Nilai | Perlakuan |
|---|---|
| `REDUCE_INVOICE` | Kurangi tagihan — kredit ke Piutang/Hutang |
| `CASH` | Uang berpindah — kredit/debit ke akun Kas terpilih |

Ini yang menutup kasus **retur atas invoice yang sudah lunas** — dominan di kanal toko, karena pembeli toko bayar seketika.

### 5.5 Generator Nomor Dokumen

```
getNextNumber(docType, date, qr):
  period = format(date, 'YYMM')
  row = SELECT * FROM document_counters
        WHERE doc_type = docType AND period = period
        FOR UPDATE                          -- kunci sampai transaction selesai
  IF NOT FOUND: INSERT (docType, period, 0)
  next = row.last_number + 1
  UPDATE document_counters SET last_number = next
  RETURN docType.prefix + '/' + period + '/' + LPAD(next, 4, '0')
```

### 5.6 Tampilan Satuan Pecahan

Stok disimpan dalam base unit sebagai desimal. Untuk tampilan, dipecah memakai `product_unit_conversions`:

```
12,75 dus  →  "12 dus 15 renceng"   (1 dus = 20 renceng)
```

Berlaku di laporan stok, kartu stok, dan layar mutasi.

---

## 6. Integration Test Wajib (Hari 8)

Empat invarian ini adalah satu-satunya alasan refactor di minggu ke-3 masih aman dilakukan:

1. **Jurnal balance** — setiap `journal_entry` punya `SUM(debit) = SUM(credit)`
2. **FIFO urut** — konsumsi selalu mengambil lot dengan `lot_date` tertua yang masih bersisa
3. **VOID simetris** — jurnal pembalik membalik persis seluruh baris asal
4. **Stok rekonsiliasi** — `SUM(stock_movements.qty_base_unit)` = `product_stock_balance.qty_base_unit` setelah rangkaian purchase → sale → return → void

---

## 7. Checklist Permission Matrix

### Master
- [ ] CRUD semua modul tanpa terkecuali
- [ ] Approve `authorization_requests`
- [ ] CRUD `chart_of_accounts` termasuk akun kas/bank & piutang custom
- [ ] Akses Jurnal Manual — **ditolak** untuk akun Persediaan, Piutang, Hutang
- [ ] Akses Saldo Awal

### Supervisor
- [ ] `POST/PATCH /sales-orders` → **403**
- [ ] `POST/PATCH /sales-invoices` → **403**
- [ ] `POST/PATCH /purchase-invoices` → **403**
- [ ] `GET /chart-of-accounts` → **200**, `POST/PATCH/DELETE` → **403**
- [ ] Jurnal Manual → **403**
- [ ] Approve `authorization_requests` → boleh
- [ ] Laporan → boleh

### Operator
- [ ] `GET/POST/PATCH /chart-of-accounts` → **403**
- [ ] Jurnal Manual, Saldo Awal, Settings → **403**
- [ ] Penuh: Sales Order, Sales Invoice, Purchase Invoice, Retur, Payment, Surat Jalan, Warehouse Mutation, Operational Expenses
- [ ] `GET /suppliers` → `name`, `contact_phone`, `contact_address` **ter-mask**; `display_code` tampil
- [ ] VOID → wajib lewat `authorization_requests`

### Lintas-role
- [ ] Tidak ada endpoint hard-delete
- [ ] Setiap VOID menghasilkan reversing journal balance, bertanggal hari ini
- [ ] `product_stock_balance` cocok dengan `SUM(stock_movements)` setelah purchase → sale → return → void
- [ ] Pembayaran multi-metode: `SUM(payment_batch_methods.amount)` = `total_amount_input`
- [ ] Alokasi pembayaran dapat diedit manual dan tersimpan sesuai yang diedit
- [ ] Penjualan melebihi stok → tetap jalan, balance boleh negatif, response mengandung `stockWarning`
- [ ] Mutasi ke `CUSTOMER_CONSIGNMENT` **tidak** membuat `stock_movements`
- [ ] Mutasi ke `BAD_STOCK` **membuat** 2 baris `transfer` dan lot ikut pindah
- [ ] Mutasi ke gudang titip melebihi qty dibeli → **ditolak**
- [ ] Backdate > 2 hari → **ditolak**
- [ ] Pembulatan hanya muncul di Sales Invoice, tidak di Purchase Invoice
- [ ] Retur atas invoice lunas dengan `settlement_type='CASH'` → jurnal kas benar, `paid_amount` tidak melebihi `total_amount`

---

## 8. Checklist Go-Live (di luar 34 hari)

Bukan pekerjaan development, tapi tanpa ini sistem tidak bisa dipakai:

- [ ] **Ganti kredensial** `master/master`, `supervisor/supervisor`, `operator/operator`
- [ ] **Buat akun kas & bank** di COA (Kas Besar, Kas Kecil, Kas Toko, BCA, BSI, Mandiri) — tanpa ini pembayaran & biaya operasional tidak bisa diinput
- [ ] Buat gudang: Gudang Toko (default) + Gudang Bad Stock
- [ ] Input master data: ~100 produk + konversi satuan, ~100 customer, supplier
- [ ] Input **saldo awal** stok + harga terakhir lewat alur Saldo Awal
- [ ] Input saldo awal kas & bank lewat Jurnal Manual
- [ ] Verifikasi: total nilai lot FIFO = saldo GL Persediaan
- [ ] Mini PC + UPS terpasang, Docker Compose jalan, IP lokal tetap
- [ ] 3 komputer bisa akses dan sudah di-bookmark
- [ ] **Backup harian otomatis** (`pg_dump` → disk eksternal + cloud) dan **restore sudah diuji minimal sekali**
- [ ] Repo git dipindah ke akun milik klien
- [ ] Dokumentasi setup & deploy diserahkan
- [ ] Sistem lama tetap dapat dibaca (read-only) minimal 3 bulan
- [ ] Gladi bersih: operator input transaksi asli satu hari penuh sebelum cut-over

---

## 9. Risiko & Mitigasi

### 9.1 Risiko utama

| Risiko | Dampak | Mitigasi |
|---|---|---|
| **Buffer hanya 9%** | Slip 10% menghabiskan seluruh cadangan | UAT mingguan sejak minggu 1 + daftar potong §9.3 disepakati di muka |
| **Cut-over tanpa periode paralel** | Bug pemblokir di hari pertama → toko tetap harus melayani | Sistem lama read-only 3 bulan + gladi bersih |
| **Bus factor 1** | Developer berhalangan = proyek berhenti | Repo dipindah ke akun klien + dokumentasi setup |
| **Format nota belum diterima** | Blocker Hari 19 & 22 (nota dan surat jalan ditandatangani di lapangan) | Dijanjikan besok. Kalau lewat Hari 12, layout standar dipakai dan revisi masuk pasca-MVP |
| **Frontend Engine (Hari 3)** | Kalau abstraksinya buruk, semua modul melambat | Hari 4 dialokasikan sebagai limpahan resmi |
| **Hari 17–18 & 23–24** | Empat hari tersulit, di minggu paling lelah | Kandidat pertama daftar potong |

### 9.2 Yang TIDAK boleh dipotong

Rencana v1 menyebut "potong polish visual dulu" saat molor. Dengan **50–100 transaksi/hari dan satu operator** — satu transaksi tiap 5–6 menit sepanjang jam kerja — ergonomi input bukan polish:

- Navigasi keyboard penuh di form invoice (tanpa perlu mouse)
- Autocomplete produk
- Enter untuk tambah baris
- `price-suggestion`
- Modal tambah customer dari form penjualan

Yang boleh dipotong adalah **estetika**, bukan alur input.

### 9.3 Daftar potong darurat (urut, disepakati di muka)

Dipakai kalau di akhir minggu ke-3 posisi meleset lebih dari 3 hari:

1. Export PDF (Excel saja dulu) — hemat 0,5 hari
2. Laporan retur & laporan stok minus (query manual dulu) — hemat 0,5 hari
3. Rekap setoran agen (rekap manual bulan pertama) — hemat 0,75 hari
4. Cash opname (laporan) — hemat 0,5 hari
5. Modul Sales Order (pesanan agen langsung jadi invoice) — hemat 1,5 hari
6. Bad stock (tangani manual bulan pertama) — hemat 0,5 hari

**Tidak boleh dipotong**: Journal Poster, Stock Recorder + FIFO, VOID + reversing, integration test Hari 8, alur Saldo Awal, ergonomi input.

### 9.4 Aturan main selama development

- **UAT mingguan sejak minggu pertama**, diikuti Master **dan** operator. Operator wajib ikut sejak awal — dialah yang menemukan hambatan input
- Masukan demo masuk backlog. **Hanya bug yang diperbaiki dalam 34 hari**; permintaan fitur baru = tukar scope, bukan tambahan
- PROGRESS.md di-commit ke repo setiap hari
- Review kode eksternal 2 jam setelah Hari 8 (engine selesai) — ROI tertinggi di seluruh proyek

---

## 10. Dependency Terbuka

| Item | Dibutuhkan sebelum | Status |
|---|---|---|
| Format nota A4 & surat jalan | Hari 19 & 22 | Dijanjikan **besok** |
| Format nomor surat jalan | Hari 21 | Menyusul |
| Keputusan hosting final | **Hari 4** (agar input master data langsung ke instance produksi) | Sementara: mini PC |
| Pengadaan mini PC + UPS | Hari 30 | Belum |
| Data saldo awal stok + harga terakhir | Hari 32 | Belum |
| Saldo awal kas & bank | Hari 32 | Belum |
| Keputusan diskon supplier | Hari 11 | Kolom disiapkan (default aman) |
| Master akses dari luar toko | — | Ditunda |
| Posisi omzet vs ambang PKP | — | Perlu dicek klien ke konsultan pajak |
