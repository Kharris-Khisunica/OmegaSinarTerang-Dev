# CLAUDE.md — Konteks Permanen Proyek

> Letakkan file ini di **root repo**. Claude Code membacanya otomatis setiap sesi.
> Tujuannya: prompt harian bisa pendek karena aturan main sudah ada di sini.
>
> **Versi 3 — 29 Juli 2026.** Menggantikan v2. Perubahan dari v2:
> **posting dipisahkan dari pelaporan** (§0),
> penomoran hari digeser (§1), kode faktur pembelian diseragamkan jadi `B1` (§3),
> kode status step-up ditetapkan **412** (§2.13), mekanisme **closing & saldo awal periode**
> ditambahkan (§2.15 + §4), Sales Order dikeluarkan dari kunci cetak (§2.16),
> rujukan silang §2.10 diperbaiki, dan akun COA disesuaikan (§3).
>
> **Peta penomoran hari lama → baru ada di `PROGRESS.md` §0.1.** Setiap penyebutan
> "Hari N" di file ini memakai penomoran v3.

---

## 0. Batas MVP: Posting Jalan, Pelaporan Menyusul

**Keputusan 29 Juli 2026.** Jurnal tetap ditulis di detik yang sama dengan transaksi —
itu tidak bisa ditunda, karena `unit_cost_fifo`, alokasi diskon, dan PPN masukan per baris
hanya bisa direkam saat kejadiannya. Yang ditunda adalah hal-hal yang sekadar **membaca**
data tersimpan; biayanya sama saja dikerjakan sekarang atau bulan depan.

**Aturan pemisahnya:** apa pun yang harus **direkam saat transaksi terjadi** tidak boleh
ditunda. Apa pun yang hanya **membaca** data yang sudah tersimpan, boleh.

| Ditunda ke pasca-MVP | Bekas hari | Tenggat sebenarnya |
|---|---|---|
| Tutup bulan + closing + buka kembali (§2.15) | 23A | sebelum 1 Okt (tutup bulan September) |
| Laporan penjualan, piutang, hutang | 30 | bulan pertama operasi |
| Laporan biaya operasional | 31 | bulan pertama operasi |
| Layar Jurnal Manual (mesinnya tetap dibangun) | 12 | tidak mendesak |

**Yang tetap dibangun dan tidak boleh ikut ditunda:** seluruh posting jurnal · 5 invarian ·
validator **backdate 2 hari** · laporan stok & barang titipan · rekap kas harian ·
Laporan Kontinuitas Nomor Dokumen · saldo awal.

Bentuk `PeriodLockValidator` (§2.9) tetap dibuat sebagai **satu titik masuk**, hanya saja
untuk MVP ia baru memeriksa backdate. Pemeriksaan periode tertutup menyusul ke tempat yang
sudah disediakan — jangan menyebar pemeriksaan tanggal ke tiap modul, atau menambahkannya
nanti berarti menyentuh semua modul lagi.

---

## 1. Identitas Proyek

Website operasional FMCG B2B grosir. Solo developer, **37 hari + 2 hari sisipan**
(27 Jul – 30 Agu 2026), cut-over **1 September 2026 tanpa periode paralel**.

Hari 7–9 adalah **rework** hasil revisi klien 28–29 Juli; seluruh hari sesudahnya bergeser +3
dari plan v2. Margin jadwal sekarang **nol** — buffer dan daftar potong sudah habis terpakai.

**Volume sebenarnya: ±330 faktur penjualan per bulan, 11–12 per hari kerja.**
Angka ini diverifikasi dari penomoran faktur sistem lama dan dikonfirmasi klien.
(v1 mengasumsikan 50–100/hari — asumsi itu salah dan sudah dicabut. Beberapa keputusan
di v1 dibangun di atas angka lama; lihat §8.)

Pola beban: burst — ±10 input dalam 20 menit, lalu jeda 1–2 jam.

Satu toko (`RM01`). Kemungkinan cabang kedua ada, **tapi di luar scope**:
identitas toko hidup di `settings`, tidak di-hardcode. Tidak ada `store_id` di tabel
transaksi. Cabang kedua = proyek terpisah berskala minggu, bukan setelan.

**Stack (jangan diganti tanpa diminta):**

| Lapis | Teknologi |
|---|---|
| Backend | NestJS (modular), TypeORM, PostgreSQL + `pgcrypto` |
| Frontend | Nuxt 3, Nuxt UI, Pinia/composables |
| Export | ExcelJS (**export PDF dipotong** 28 Juli) |
| Auth | JWT access + refresh (1 hari), bcrypt |
| Deploy | PC operator (Windows) merangkap server, **tanpa Docker** — Postgres native + NestJS sebagai Windows service + nginx untuk frontend statis |

**Role:** `MASTER`, `SUPERVISOR`, `OPERATOR`.

**Dua saluran penjualan** (field eksplisit di faktur, bukan disimpulkan):

| | `PENGIRIMAN` | `TOKO` |
|---|---|---|
| Sales Order | **Wajib** | Tidak perlu |
| Surat jalan | Ya | Tidak |
| Nota | Dibawa sopir untuk menagih | Diserahkan di tempat |

---

## 2. Aturan Arsitektur yang Tidak Boleh Dilanggar

1. **Tidak ada hard-delete.** Semua pembatalan lewat VOID + jurnal pembalik.
2. **Jurnal pembalik bertanggal hari ini**, bukan tanggal dokumen asli.
   Konsekuensi yang disengaja: mem-VOID dokumen lama **tidak pernah mengubah angka
   bulan yang sudah ditutup**. Ini yang membuat §2.15 aman.
3. **Semua transaksi yang menyentuh stok + jurnal wajib dalam satu DB transaction.**
   Gagal di tengah = rollback penuh. Tidak ada state setengah jadi.
4. **Nomor dokumen** hanya boleh dari `DocumentCounterService.getNextNumber()`
   (`SELECT ... FOR UPDATE` di dalam transaction pemanggil). Dilarang `CREATE SEQUENCE`
   kecuali `supplier_code_seq` yang memang tidak reset bulanan.

   **Format: `KODE/{settings.store_code}-YYMMXXXX`** → `JL/RM01-26090001`
   Reset tiap bulan. `XXXX` 4 digit. Segmen toko dari `settings`, **tidak di-hardcode**.

   | Dokumen | Kode | Sumber |
   |---|---|---|
   | Faktur Penjualan | `JL` | sistem nyata |
   | Faktur Pembelian | `B1` | sistem nyata |
   | Mutasi Gudang | `GD` | sistem nyata |
   | Sales Order | `SO` | plan |
   | Surat Jalan | `SJ` | plan |
   | Retur Penjualan | `RJ` | plan |
   | Retur Pembelian | `RB` | plan |
   | Pembayaran | `PAY` | plan |
   | Jurnal Manual | `JE` | plan |

   **Nomor tidak boleh hilang.** Karena counter berupa tabel di dalam transaction
   pemanggil, rollback ikut mengembalikan nomor — tidak ada lubang dari transaksi gagal.
   Dokumen batal **selalu** VOID, tidak pernah dihapus. Wajib ada
   **Laporan Kontinuitas Nomor Dokumen** per jenis per periode yang menampilkan setiap
   nomor dari 0001 sampai terakhir terbit, statusnya, dan justifikasi VOID-nya.
5. **Setiap perubahan stok wajib lewat `StockRecorderService`.** Dilarang UPDATE langsung
   ke `product_stock_balance` dari modul lain.
6. **Setiap jurnal wajib lewat `JournalPosterService`** dengan 5 validasi:
   minimal 2 baris · satu sisi > 0 (`CHECK ((debit_amount > 0) <> (credit_amount > 0))`) ·
   `SUM(debit) = SUM(credit)` · akun aktif · nomor entry terisi.
7. **FIFO** pakai `SELECT ... FOR UPDATE` pada `stock_cost_lots` urut `lot_date` tertua.
   `lot_date` = **tanggal terima barang** (`receipt_date`), bukan tanggal invoice.
8. **Stok minus diizinkan**, bukan ditolak. Response mengandung `stockWarning`.
   Cost fallback = `unit_cost` lot terakhir **yang `unit_cost > 0`** — lot bonus berharga nol
   wajib dilewati (§3 Bonus). Satu fungsi bersama `getLatestCostBasis()` melayani ini dan §2.17.
9. **Backdate maksimum 2 hari.** Lebih dari itu → 400.
   Nanti ditambah: tidak boleh masuk ke bulan yang sudah ditutup (§2.15, **pasca-MVP**).
   Kedua pemeriksaan hidup di **satu validator bersama** (`PeriodLockValidator`) yang
   dipanggil semua modul transaksi. Untuk MVP validator itu baru memeriksa backdate,
   **tapi bentuknya tetap satu titik masuk** supaya pemeriksaan periode tinggal diselipkan.
10. **Tidak ada pembulatan di dokumen mana pun.** `total_amount` = nilai eksak sampai rupiah.
    Selisih diselesaikan saat alokasi pembayaran (**§2.18**), bukan saat dokumen dibuat.
    *(v1 mewajibkan pembulatan ke kelipatan 100 dengan akun Pendapatan Pembulatan.
    Klien tidak pernah memakainya. Aturan itu dicabut, akunnya tidak dibuat.)*
11. **PPN Keluaran dormant** — `settings.company_is_pkp = false` → PPN keluaran selalu 0,
    tidak peduli produknya BKP atau pelanggannya PKP.

    **PPN Masukan tidak pernah dormant.** Selama `supplier.is_pkp = true` dan
    `product.is_bkp = true`, PPN masukan tetap dibayar ke supplier:
    - `company_is_pkp = false` → PPN masukan **masuk ke `stock_cost_lots.unit_cost`**
      (tidak dapat dikreditkan, jadi bagian biaya perolehan)
    - `company_is_pkp = true` → PPN masukan masuk akun PPN Masukan, harga pokok = DPP

    Tarif dari tabel `tax_rates` (`effective_from`/`effective_to`) — **bukan** dari master
    produk dan bukan dari config.
12. **`audit_logs`**: strip `password`, `password_hash`, `token`, `refresh_token` dari
    `before_data`/`after_data` sebelum disimpan.
13. **VOID oleh Operator wajib lewat `authorization_requests`** (step-up, TTL 15 menit,
    `expires_at` dicek saat eksekusi, bukan hanya saat approve).
    **Kode status step-up = `412`**, baik dari guard maupun dari
    `StepUpService.requireApproval()` di dalam service. Satu kode, satu jalur penanganan
    di frontend. *(Implementasi Hari 5 memakai `428`; diseragamkan di Hari 9.)*
14. **Uang** disimpan `NUMERIC(16,2)`, **harga pokok** `NUMERIC(16,4)`,
    **qty** `NUMERIC(16,4)` dalam base unit. Dilarang `float`.
15. **Tutup bulan — ⏸ PASCA-MVP (ditunda 29 Juli).** Bulan pertama yang perlu ditutup adalah
    September, sekitar 1 Oktober — sebulan setelah serah terima. Aturan di bawah tetap
    mengikat saat dikerjakan nanti; jangan dirancang ulang dari nol.

    Ditutup oleh **MASTER**.

    **Yang diblokir** untuk dokumen bulan tertutup: edit · VOID · transaksi baru bertanggal
    di dalamnya. Koreksi jalannya lewat Retur Penjualan / Retur Pembelian — dan itu memang
    akuntansi yang benar, karena barang yang kembali di bulan berikutnya adalah peristiwa
    bulan berikutnya.

    **Yang TIDAK diblokir** — dan ini wajib, bukan kelonggaran: **pembayaran, retur, dan
    alokasi bertanggal hari ini yang menunjuk faktur bulan tertutup.** Faktur kredit hampir
    selalu ditagih setelah bulannya ditutup; kalau ini ikut diblokir, tidak ada satu pun
    piutang bulan lalu yang bisa ditagih. Memperbarui `paid_amount`/sisa tagihan faktur lama
    adalah perubahan **status sub-ledger**, bukan pengubahan dokumen, dan jurnalnya
    bertanggal hari ini.

    **Closing & saldo awal periode.** Saat bulan ditutup:
    - **Akun laba-rugi ditutup** — saldonya **tidak** terbawa ke bulan berikutnya.
    - **Akun neraca**: saldo akhir bulan ini **menjadi saldo awal bulan berikutnya**.
      Buku besar per akun dibuka dengan baris **Saldo Awal** di posisi normalnya, lalu diikuti
      transaksi bulan berjalan.
    - Contoh baku dari klien: piutang pelanggan A Rp 5 jt tanggal 29 belum dibayar →
      di neraca tanggal 31 muncul **saldo akhir Rp 5 jt di kredit** sebagai penyeimbang →
      tanggal 1 bulan berikutnya buku besar AR dibuka dengan **saldo awal Rp 5 jt di debit** →
      saat A membayar, muncul **Rp 5 jt di kredit**.
    - ⚠️ **PR terbuka:** apakah baris Saldo Awal / Saldo Akhir itu **jurnal sungguhan**
      (ada `journal_entries` penutup & pembuka tiap bulan) atau **konstruksi tampilan**
      buku besar per periode. Keduanya menghasilkan laporan yang sama tapi skema dan
      invarian testnya berbeda. **Berhenti dan tanya sebelum mengerjakan Hari 23A.**

    **Buka kembali**: MASTER boleh membuka bulan mana pun, **wajib mengisi alasan**,
    tercatat di `audit_logs`, dan bulan yang pernah dibuka diberi penanda permanen di
    daftar periode. Layar wajib memperingatkan bahwa laporan yang sudah diserahkan bisa berubah.

16. **Kunci cetak.** Berlaku untuk **7 dokumen**: `JL`, `B1`, `GD`, `SJ`, `RJ`, `RB`, `PAY`.
    **Sales Order (`SO`) tidak ikut** — keputusan 29 Juli. SO bukan dokumen yang mengikat
    uang atau stok.

    Tiga sumbu status yang **tidak boleh dicampur**:

    | Sumbu | Nilai |
    |---|---|
    | `posting_status` | `POSTED` → `VOIDED` |
    | `print_status` | `NOT_PRINTED` → `PRINTED` → `PRINT_CANCELLED` |
    | `review_status` | `BELUM_DICEK` → `DISETUJUI` / `BERMASALAH` |

    - **Cetak ulang identik**: bebas, tanpa izin. `print_count++`, tercatat di `audit_logs`.
    - **Edit atau VOID setelah dicetak**: wajib batal cetak dulu.
      **Satu permintaan, satu persetujuan**, dengan niat dideklarasikan di depan:
      `actionType: UNLOCK_PRINT`, `intent: EDIT | VOID`, `reason` wajib.
      Token yang disetujui untuk `VOID` **hanya** bisa dipakai untuk VOID.
    - Nota hasil revisi wajib mencantumkan **nomor revisi**.
    - Dokumen ber-status `VOIDED` **boleh dicetak ulang dengan tanda VOID** untuk arsip.
17. **Jual di bawah harga pokok wajib otorisasi.**
    Batas = `unit_cost` **lot terbaru yang `unit_cost > 0`** (urut `lot_date` terbaru)
    × angka konversi ke satuan baris. **Lot bonus berharga nol wajib dilewati** — kalau tidak,
    batasnya jadi nol dan kontrol ini berhenti bekerja tanpa error apa pun. Dibandingkan terhadap **harga bersih setelah diskon**, bukan harga kotor.
    Nilai batasnya **tidak ditampilkan** ke operator — hanya menghadang saat dilanggar.
    Produk yang belum pernah dibeli (belum ada lot) → tidak ada batas, jangan error.
    Jenis aksi `SELL_BELOW_COST`, **satu permintaan per faktur** yang memuat semua baris
    yang melanggar — bukan satu permintaan per baris.
18. **Selisih pembayaran.** Muncul hanya saat operator menyatakan faktur **lunas**;
    pembayaran sebagian bukan selisih. Semua kasus masuk **satu akun `Selisih Pembayaran`**,
    dipakai dua arah. Selisih di atas **Rp 10.000** otomatis **ditandai** di layar
    pengecekan supervisor (tidak diblokir, tidak minta step-up).
19. **`authorization_requests` wajib membawa konteks dan mengikat aksi.**
    Kolom `payload` (JSONB) + `context_summary` (teks). Saat eksekusi, `consumeApproval`
    **memvalidasi ulang bahwa body request cocok dengan payload yang disetujui**.
    Tanpa ini, approval Rp 1 juta bisa dipakai untuk mengeksekusi Rp 100 juta.

---

## 3. Aturan Data Penting

**Produk**
- Kode produk = **barcode** format `YYMMDDXXXX` (contoh `2401200001` = 20 Jan 2024, produk ke-1).
  Diinput manual operator; kalau kosong, dibangkitkan otomatis. **Unik**, dan **dikunci
  setelah produk dipakai di transaksi pertama** — kode itu sudah tercetak di nota yang beredar.
  Tidak ada kode berjenjang, **tidak ada master kategori** (kategori diwakili merek).
- **`products.is_bkp`** ADA (boolean). Menentukan apakah PPN masukan dihitung (§2.11).
  *(v1 menyatakan `products.tax_status` tidak ada — itu keliru dan sudah dicabut.)*
- Nama tersusun dari **Merek** (master) + Keterangan + Kemasan + Ukuran + **UoM** (master).
  Contoh: `Bendera Putih Sachet 37 gr`. Simpan keempat bagiannya **plus** kolom
  `display_name` gabungan yang **terindeks** — operator mencari produk berdasarkan nama.
- **Dua konsep "satuan" yang tidak boleh tertukar:**

  | | Contoh | Fungsi |
  |---|---|---|
  | UoM kemasan | gr, ml, kg | Bagian dari **nama**. Deskriptif. Tidak pernah dihitung |
  | Satuan jual/beli | DUS, SACHET, RENCENG | Konversi qty dan penyimpanan stok |

- Konversi **satu tingkat saja**: `1 <satuan besar> = N <satuan dasar>`. Qty disimpan dalam
  satuan dasar. Tampilan stok dipecah per satuan ("12 dus 15 renceng"), bukan desimal.
- Input qty = **satu angka + pilihan satuan**, default **DUS**. Satu baris satu satuan.
  Klien tidak pernah mencampur satuan dalam satu transaksi.
- Kolom `Isi` (jumlah satuan dasar per satuan besar) **ditampilkan** di grid transaksi.
- Harga jual di master **hanya seed awal** — tidak dipakai di lapangan. **Satu tingkat harga**,
  tanpa harga bertingkat berdasarkan qty.
- Barcode EAN disimpan sebagai **field opsional**, tidak dipakai, tidak ada scanner di MVP.

**Riwayat harga (`price-suggestion`)**
- Panel menampilkan **10 transaksi terakhir** untuk kombinasi pelanggan + produk +
  **satuan yang sedang diketik**, dari faktur yang **tidak VOID**.
  Kolom: Tanggal · Qty · Satuan · @Harga.
- Fallback berurutan: (1) pelanggan+produk+satuan → (2) produk+satuan ke pelanggan mana pun
  → (3) harga master.
- Ini **jalur terpanas aplikasi**. `customer_id` **didenormalisasi** ke `sales_invoice_lines`
  dengan indeks `(customer_id, product_id, unit_id, id DESC)`. Keputusan ini diambil saat
  migration ditulis, bukan sesudahnya.
- Harga di faktur **diketik bebas** (harga berbeda per pelanggan dan fluktuatif).
  Field harga terkunci di balik **Ctrl+H**, diskon di balik **Ctrl+D** — pola dari sistem lama
  yang dipertahankan, **tapi wajib dibuat terlihat** (operator lama tidak tahu cara pakainya).

**Pelanggan & Supplier**
- `customers.is_pkp`. Termin **diinput per faktur**, bukan disimpan di master pelanggan.
  Nilai default boleh diambil dari faktur terakhir pelanggan itu.
- **`suppliers.is_pkp`** ADA. Menggerbangi perhitungan PPN masukan (§2.11).
- **`customers.ar_account_id`** (nullable, FK ke `chart_of_accounts`).
  NULL = `settings.default_ar_account_id` (Piutang Usaha).
  - **Operator tidak pernah melihat field ini.** Modal tambah pelanggan dari form penjualan
    menyimpan NULL. §5 tetap utuh: operator tidak butuh akses COA.
  - **MASTER** memilihnya dari dropdown **tersaring hanya akun bertipe piutang yang aktif**.
  - **Lima tempat** menyentuh akun piutang: faktur penjualan, alokasi pembayaran,
    retur penjualan, pembalikan VOID, saldo awal piutang. Kelimanya **wajib** membaca
    `customer.ar_account_id ?? default` lewat **satu fungsi bersama**. Satu saja yang
    menuliskan akun default secara langsung → saldo pelanggan bocor tanpa error apa pun.
  - **Dikunci selama saldo pelanggan belum nol.**
- Data Pajak (nama, alamat, kota, NPWP, alias) disimpan, belum dipakai selama non-PKP.
- Akun kas & bank **tidak di-seed** — diinput Master lewat CRUD COA (`is_cash_account`).

**Salesman**
- Master kecil: kode, nama, status aktif. Dipilih **per faktur penjualan**, bukan per pelanggan.
  Tercetak di nota. Tidak ada komisi. Gaji masuk biaya operasional tanpa dikaitkan ke salesman.
  Perlu laporan penjualan per salesman.

**Gudang**
- `warehouse_type`: `STORE` · `TITIPAN_PELANGGAN` · `BAD_STOCK`.
  *(v1 menamainya `CUSTOMER_CONSIGNMENT` — nama itu salah dan menyesatkan. Klien
  **tidak menerima konsinyasi**. "Barang titipan" = pelanggan **sudah membeli dan sudah bayar**
  tapi belum mengambil barang. Barangnya bukan milik toko lagi.)*
- Mutasi ke `TITIPAN_PELANGGAN` → **hanya** insert `warehouse_mutations`.
  Tidak menyentuh `stock_movements` / `product_stock_balance` / lots. Tidak ada jurnal.
  Validasi: qty kumulatif ≤ qty yang sudah dibeli pelanggan tsb.
  Wajib ada **laporan barang titipan per pelanggan**, dan daftar titipan wajib muncul di
  proses stok opname sebagai penjelasan selisih fisik.
- Mutasi ke `STORE` / `BAD_STOCK` → 2 baris `stock_movements` type `transfer`,
  lot ikut pindah dengan `unit_cost` sama, **tanpa jurnal**.
- **Lokasi tidak dipilih per baris** — selalu `STORE` secara default. Kolom lokasi di sistem
  lama adalah warisan multi-outlet dan sengaja tidak ditiru.

**Pembelian**
- Faktur pembelian **selalu masuk ke gudang `STORE`**. Tidak pernah langsung ke BAD_STOCK.
  Field "stock ke" di sistem lama tidak ditiru.
- **Tiga tanggal, semuanya disimpan terpisah:**

  | Field | Arti | Dipakai untuk |
  |---|---|---|
  | `receipt_date` | Tanggal barang diterima | **`lot_date` FIFO** (§2.7) |
  | `supplier_invoice_date` | Tanggal faktur supplier | Dasar hitung jatuh tempo |
  | `due_date` | `supplier_invoice_date + termin` | Umur hutang |

  Sistem lama memisahkan ketiganya dan nilainya memang bisa berbeda. Kalau digabung jadi
  satu kolom, urutan FIFO akan mengikuti tanggal yang salah **tanpa satu pun error muncul**.
- **`supplier_invoice_no`** disimpan — nomor faktur dari supplier. Tanpa ini rekonsiliasi
  dengan tagihan supplier tidak punya pegangan.
- **Ongkos kirim tidak dikapitalisasi** ke harga pokok. Masuk biaya operasional.
- Field `Adjust` di sistem lama **tidak dipakai**. Tidak ada Order Pembelian.

**Bonus dari supplier**
- Barang bonus dicatat sebagai **baris tersendiri dengan `unit_price = 0`** dan flag `is_bonus`.
  Lot terbentuk dengan **`unit_cost = 0`**.
- **Bonus selalu produk yang sama** dengan yang dibeli. Tidak ada kasus bonus produk berbeda.
- Karena nilainya nol, baris bonus mendapat **alokasi diskon faktur nol** (pro-rata nilai) dan
  **PPN masukan nol**. Total faktur tidak berubah.
- **Aturan lintas modul:** setiap kali sistem mencari "lot terbaru" sebagai **dasar biaya**,
  lot berharga nol **dilewati**. Berlaku di §2.8 (fallback stok minus) dan §2.17 (batas jual-rugi).
  Tanpa aturan ini, satu pembelian berbonus mematikan batas jual-rugi sampai lot bonusnya habis.
- **Perilaku yang disengaja, bukan kesalahan hitung:** saat FIFO sampai ke lot bonus, HPP-nya
  nol dan margin faktur itu tampak 100%. Ini konsekuensi langsung dari keputusan harga pokok nol.
  Jangan "diperbaiki" tanpa perintah.

**Mutasi gudang**
- Nomor `GD`. **Ikut kunci cetak** (§2.16).
- **`unit_cost` di layar mutasi wajib read-only.** Ditampilkan sebagai informasi, tidak pernah
  bisa diketik. Kalau bisa diubah, operator punya jalan mengubah nilai persediaan tanpa jurnal:
  pindah `STORE` → `BAD_STOCK`, ubah harga, pindah balik. Tidak ada jurnal, tidak ada jejak.
- Nota mutasi hanya mencetak qty, **tanpa nilai** — mutasi tidak menyentuh uang.
- Alur "Permintaan Mutasi Gudang" di sistem lama **tidak dipakai**.

**Bad stock**
- Isinya berasal dari: **barang rusak** dan **retur pelanggan** (retur pelanggan
  **selalu** masuk BS, tidak pernah kembali langsung ke stok jual).
- **Tidak dijual lagi ke pelanggan.** Nilai harga pokoknya tetap penuh, tidak diturunkan.
- **Bisa diretur ke supplier** (§4). Retur pembelian **selalu** mengambil dari BS.
- **`stock_cost_lots.supplier_id`** ADA (nullable) — melacak supplier asal.
  Lot dari faktur pembelian terisi; lot dari retur pelanggan bisa NULL.
- Alur retur: pilih **supplier** dulu → daftar BS **disaring ke produk yang pernah dibeli
  dari supplier itu** → pilih barang. Tidak menunjuk faktur pembelian asal.
- **BS → STORE wajib otorisasi supervisor** (barang jadi bisa dijual lagi).
  Arah sebaliknya (STORE → BS) bebas.
- **Tukar barang dengan supplier = dua dokumen**, bukan satu: Retur Pembelian (`RB`)
  lalu Faktur Pembelian (`B1`) baru. Hutang saling menutup.

**Saldo Awal**
- **Bertanggal 1 September 2026.** Diinput di **Hari 36** (29 Agustus), memakai buffer.
- Karena tanggalnya di depan tanggal input, alur saldo awal adalah **satu-satunya
  pengecualian** terhadap validator tanggal (§2.9) — kecualikan secara eksplisit, jangan
  dengan melonggarkan validatornya untuk semua modul.
- Angka final baru ada setelah klien berhenti memakai sistem lama 31 Agustus. Yang diinput
  Hari 36 adalah angka per tanggal potong; selisih 29–31 Agustus disesuaikan sebelum
  operasi pertama.
- Saldo awal stok, piutang, dan hutang **satu alur**: lot pembuka dan jurnal pembuka lahir
  dari angka yang sama, lewat `StockRecorder` dan `JournalPoster` yang sama dengan transaksi
  biasa. Tidak ada jalur khusus yang menulis langsung ke tabel.

**Akun (COA)**
- **Tidak ada** akun `Pendapatan Pembulatan` dan **tidak ada** `settings.rounding_multiple`
  — pembulatan dicabut (§2.10). Kalau masih ada sisa dari seed lama, hapus/nonaktifkan.
- Akun **Retur Pembelian tidak ada** (sistem perpetual).
- Akun **Retur Penjualan tetap ada** (kontra pendapatan).
- Wajib ada: `Diskon Penjualan` (kontra pendapatan, metode bruto) · `Selisih Pembayaran`
  (satu akun, dua arah) · `Selisih Retur Pembelian` (dua arah).

**Lain-lain**
- **Retur penjualan wajib menunjuk faktur asal.** Harga pokoknya wajib dari
  `sales_invoice_lines.unit_cost_fifo`, bukan harga baru.
- `GET /suppliers` untuk `OPERATOR`: `name`, `contact_phone`, `contact_address` **ter-mask**;
  `display_code` tetap tampil.
- **Sales Order tidak menahan stok.** Qty terikat SO terbuka hanya **ditampilkan** sebagai
  informasi. Stok berkurang saat faktur, bukan saat SO.
  SO **tidak ikut kunci cetak** dan **tidak masuk Laporan Kontinuitas Nomor** (§2.16).

---

## 4. Rumus Baku

### Faktur Penjualan

```
baris_kotor    = qty × unit_price
diskon_baris   = persen ATAU rupiah (alternatif, bukan bertingkat)
baris_bersih   = baris_kotor − diskon_baris

subtotal       = Σ baris_bersih
diskon_faktur  = persen ATAU rupiah, atas subtotal
total_diskon   = Σ diskon_baris + diskon_faktur

ppn            = company_is_pkp ? (subtotal − diskon_faktur) × tax_rate : 0
total_amount   = subtotal − diskon_faktur + ppn        ← EKSAK, tidak dibulatkan
```

> Syarat PPN keluaran **hanya** `company_is_pkp`. Status PKP pelanggan **tidak** menentukan
> apakah PPN dipungut — hanya menentukan apakah pelanggan bisa mengkreditkannya.
> (v1 menulis `company_is_pkp && customer.is_pkp` — itu keliru.)

Metode **bruto**: pendapatan dicatat kotor, diskon muncul sebagai akun kontra.

```
Piutang/Kas       (D) total_amount
Diskon Penjualan  (D) total_diskon
    Pendapatan        (K) Σ baris_kotor
    PPN Keluaran      (K) ppn
HPP               (D) totalCOGS
    Persediaan        (K) totalCOGS
```

Akun piutang = `customer.ar_account_id ?? settings.default_ar_account_id`.

### Faktur Pembelian

Urutan hitung wajib, per baris:

```
1. baris_kotor    = qty × harga
2. diskon_baris   = persen ATAU rupiah
3. baris_bersih   = baris_kotor − diskon_baris
4. subtotal       = Σ baris_bersih
5. alokasi[i]     = diskon_faktur × (baris_bersih[i] / subtotal)     ← pro-rata NILAI baris
6. baris_final[i] = baris_bersih[i] − alokasi[i]
7. ppn_masukan[i] = (supplier.is_pkp && product.is_bkp) ? baris_final[i] × tax_rate : 0
8. harga_pokok[i] = baris_final[i] + (company_is_pkp ? 0 : ppn_masukan[i])
9. lot.unit_cost  = harga_pokok[i] ÷ qty dalam satuan dasar
```

Sisa pembulatan langkah 5 dibebankan ke **baris terakhir**, supaya Σ alokasi persis sama
dengan `diskon_faktur`. Tanpa aturan ini nilai persediaan tidak akan pernah cocok.

**Baris bonus** (`is_bonus = true`) melewati seluruh urutan di atas: `baris_kotor = 0`,
alokasi diskon 0, PPN 0, `lot.unit_cost = 0`. Qty-nya tetap masuk stok penuh.

```
company_is_pkp = false (sekarang):
  Persediaan   (D) Σ harga_pokok        ← sudah termasuk PPN masukan
      Hutang Usaha  (K) Σ harga_pokok

company_is_pkp = true (nanti):
  Persediaan   (D) Σ baris_final
  PPN Masukan  (D) Σ ppn_masukan
      Hutang Usaha  (K) Σ (baris_final + ppn_masukan)
```

**Diskon pembelian tidak pernah masuk jurnal** — ia larut ke harga pokok. Akun
"Diskon Pembelian" **tidak dibuat**. Nilainya tetap tersimpan di `purchase_invoice_lines`
dan tercetak di faktur.

### Retur Pembelian (dari gudang BAD_STOCK)

Nilai retur **dinegosiasikan dengan supplier** dan bisa berbeda dari harga pokok lot —
prinsip klien: ambil yang menguntungkan toko. Persediaan **selalu** dikreditkan sebesar
harga pokok lot asal (FIFO dari BS); selisihnya adalah keuntungan negosiasi.

```
Hutang Usaha / Kas          (D) nilai_retur_disepakati
    Persediaan                  (K) Σ harga pokok lot (FIFO dari BAD_STOCK)
    Selisih Retur Pembelian     (K) selisih, bila nilai_retur > harga pokok
```

Bila `nilai_retur < harga pokok`, akun `Selisih Retur Pembelian` menjadi **debit** (kerugian).
Klien menyatakan ini tidak akan terjadi, tapi sistem wajib menanganinya.

### Retur Penjualan (wajib menunjuk faktur asal)

```
Retur Penjualan  (D) DPP
PPN Keluaran     (D) bila ada
    Piutang/Kas      (K) total
Persediaan       (D) HPP asli (unit_cost_fifo faktur asal)
    HPP              (K) HPP asli
```

Barang masuk ke gudang **BAD_STOCK**, selalu.

### Selisih Pembayaran

Hanya saat faktur dinyatakan **lunas**. Satu akun, dua arah.

| Situasi | Jurnal |
|---|---|
| Pelanggan kurang bayar | Kas (D) · **Selisih Pembayaran (D)** · Piutang (K) |
| Pelanggan lebih bayar | Kas (D) · Piutang (K) · **Selisih Pembayaran (K)** |
| Kita kurang bayar supplier | Hutang (D) · Kas (K) · **Selisih Pembayaran (K)** |
| Kita lebih bayar supplier | Hutang (D) · **Selisih Pembayaran (D)** · Kas (K) |

`settlement_type` di setiap dokumen retur: `REDUCE_INVOICE` | `CASH`.
`REDUCE_INVOICE` atas faktur bulan **tertutup** tetap diizinkan — jurnalnya bertanggal hari
ini dan yang berubah adalah sisa tagihan, bukan isi dokumennya (§2.15).

### Closing Bulanan

```
Akun laba-rugi   → ditutup, saldo TIDAK terbawa ke bulan berikutnya
Akun neraca      → saldo akhir bulan N menjadi saldo awal bulan N+1
```

Buku besar tiap akun neraca dibuka dengan baris **Saldo Awal** di posisi normalnya.
Bentuk teknisnya (jurnal sungguhan vs konstruksi tampilan) masih **PR terbuka** — lihat §2.15.

---

## 5. Permission Matrix (ringkas — sumber kebenaran ada di plan §7)

| Endpoint / Fitur | MASTER | SUPERVISOR | OPERATOR |
|---|---|---|---|
| Sales Order / Sales Invoice / Purchase Invoice (write) | ✅ | ❌ 403 | ✅ |
| `GET /chart-of-accounts` | ✅ | ✅ | ❌ 403 |
| `POST/PATCH/DELETE /chart-of-accounts` | ✅ | ❌ 403 | ❌ 403 |
| Jurnal Manual | ✅* | ❌ 403 | ❌ 403 |
| Saldo Awal, Settings | ✅ | ❌ | ❌ 403 |
| **Tutup / buka bulan** | ✅ | ❌ 403 | ❌ 403 |
| Approve `authorization_requests` | ✅ | ✅ | ❌ |
| **Halaman Pengecekan Invoice Harian** | ✅ | ✅ | ❌ |
| Retur, Payment, Surat Jalan, Mutasi Gudang, Biaya Operasional | ✅ | ❌ write | ✅ |
| Laporan | ✅ | ✅ | ✅ (kecuali COA) |

\* Jurnal Manual **ditolak** untuk akun Persediaan, Piutang, Hutang — meski Master.

**Supervisor tidak punya dashboard.** Navigasinya hanya 3 item:
Pengecekan Invoice · Antrian Persetujuan · Laporan.

**Supervisor tidak pernah menulis ke faktur.** Kalau menemukan kesalahan saat pengecekan
sore, ia menandai `BERMASALAH` dan **meminta operator** yang memperbaiki. Ini menjaga §5 utuh.

**Pengecekan bersifat setelah-fakta, tidak memblokir.** Operator tidak pernah menunggu
supervisor untuk mencetak nota.

**Pengeluaran kas besar** butuh approval: kolom `chart_of_accounts.requires_outflow_approval`
dicentang Master untuk akun Kas Besar, ambang di `settings.cash_outflow_approval_threshold`.
Karena syaratnya bergantung pada isi transaksi (bukan sekadar role), dipakai
`StepUpService.requireApproval()` yang dipanggil **dari dalam service** dan melempar 412
dengan kontrak yang sama seperti guard — frontend cukup punya satu jalur penanganan.

---

## 6. Konvensi Kode

**Backend**
- Satu modul = satu folder: `entities/`, `dto/`, `*.service.ts`, `*.controller.ts`, `*.module.ts`.
- Service engine (`JournalPoster`, `StockRecorder`, `DocumentCounter`, `VoidEngine`,
  `StepUpService`, `PeriodLockValidator`) hidup di `src/core/` dan **menerima `EntityManager`**
  dari pemanggil agar ikut transaction yang sama.
- DTO pakai `class-validator`. Tidak ada `any` di boundary controller.
- Migration TypeORM manual (bukan `synchronize: true`). Setiap migration wajib `down()` yang benar.
- Error bisnis → `BadRequestException` dengan `message` berbahasa Indonesia yang bisa dibaca operator.

**Frontend**
- Semua tabel list memakai `<DataTable>`; semua form create/edit memakai `<CrudFormPage>`.
  **Dilarang copy-paste layout tabel/form.** Kalau butuh varian, tambah prop, jangan fork komponen.
- Format angka pakai satu composable `useRupiah()` / `useQty()`. Tidak ada `toLocaleString` tersebar.
- Panggilan API lewat `useApi()` yang sudah menyisipkan token & menangani 401 → refresh.

**Cetak**
- **Semua dokumen cetak A5 landscape, dua per lembar A4 portrait**, dipotong mendatar —
  nota penjualan, nota pembelian, surat jalan, dokumen retur, kwitansi, dan nota mutasi gudang.
- Nota pembelian memuat tiga baris tanda tangan (Dibuat / Diterima / Diketahui) — ruangnya
  sempit di A5, alokasikan sejak awal.
- Muat **14 baris** per halaman; lebih dari itu lanjut ke halaman 2 (`Hal. 1/2`).
  Di lapangan tidak pernah lebih dari 20 SKU, rata-rata 2–7.
- Kepala nota: identitas toko dari `settings` (nama, kota, telepon) — yang kosong tidak dicetak.
- Kaki nota: baris audit cetak (siapa & kapan), sesuai kebiasaan sistem lama.

---

## 7. Definition of Done Harian (berlaku untuk SEMUA hari)

Sebuah hari baru boleh ditandai `[x]` di `PROGRESS.md` kalau semuanya hijau:

- [ ] `npm run build` sukses di BE **dan** FE (0 error TypeScript)
- [ ] `npm run lint` bersih
- [ ] `npm run test` hijau (termasuk **5 invarian** setelah **Hari 11**)
- [ ] Migration `up` lalu `down` lalu `up` lagi berhasil di DB kosong
- [ ] `GET /health` mengembalikan 200
- [ ] Halaman/endpoint hari ini diuji manual minimal 1 happy path + 1 error path
- [ ] `PROGRESS.md` diperbarui (checkbox, Tgl Aktual, §4 Modul Selesai)
- [ ] Commit dengan pesan `Hari NN: <ringkasan>`

Jalankan `./scripts/verify.sh` untuk mengecek 5 poin pertama sekaligus.

---

## 8. Yang TIDAK Boleh Dipotong Saat Molor

**Direvisi 28 Juli 2026.** v1 melindungi seluruh ergonomi input dengan alasan yang ditulis
eksplisit: *"50–100 transaksi/hari — satu transaksi tiap 5–6 menit."* **Premis itu salah.**
Volume sebenarnya 11–12/hari — satu transaksi tiap ~50 menit. Daftar ini disusun ulang
berdasarkan **kebenaran data**, bukan kecepatan input.

**Tidak boleh dipotong — mesin akuntansi:**
Journal Poster · Stock Recorder + FIFO · VOID + reversing · **integration test Hari 11** ·
alur Saldo Awal · validator **backdate** (pemeriksaan periode menyusul pasca-MVP, §0).

**Tidak boleh dipotong — karena menyangkut kebenaran, bukan kecepatan:**
- **Panel riwayat harga** — harga berbeda per pelanggan dan fluktuatif. Tanpa ini operator
  tidak punya cara mengetahui harga yang benar. Ini bukan kenyamanan, ini satu-satunya sumber.
- **Sisa stok tampil saat mengetik**
- **Modal tambah pelanggan** dari form penjualan
- **Batas jual di bawah harga pokok** (§2.17)
- **Kunci cetak + jejak otorisasinya** (§2.16)

**Boleh diturunkan dari "sempurna" ke "cukup baik"** (disetujui klien 28 Juli):
navigasi keyboard penuh tanpa mouse · Enter menambah baris · fokus otomatis ke field pertama.
Tetap dibangun, tidak dipoles sampai bebas-mouse total.

**Sudah dipotong** (disepakati 28 Juli, urut): Export PDF laporan (Excel dulu) ·
Laporan retur & stok minus · Cash opname · Rekap setoran agen.
Sisa daftar: Sales Order **tidak boleh** (klien justru ingin memindahkannya dari kertas ke
program) · Bad stock **tidak bisa lagi** (retur pembelian bergantung padanya).

**Daftar potong sudah habis.** Permintaan baru = tukar scope atau geser tanggal.

**Ditunda ke pasca-MVP 29 Juli** (bukan dipotong — tetap dikerjakan, setelah 30 Agustus):
tutup bulan + closing · laporan penjualan/piutang/hutang · laporan biaya operasional ·
layar Jurnal Manual. Rinciannya di §0.

---

## 9. Cara Kerja dengan Saya (instruksi untuk Claude Code)

1. Sebelum mulai, **baca `PROGRESS.md` §4 (Modul Selesai)** supaya tahu apa yang sudah ada.
   Jangan membuat ulang yang sudah jadi.
   ⚠️ §4 merekam keadaan **sebelum** revisi klien: format nomor lama, skema produk lama,
   `CUSTOMER_CONSIGNMENT`, step-up `428`. Semuanya diperbaiki di **Hari 7–9**. Baca §4
   bersama Hari 7–9, jangan sendirian.
2. Kalau sebuah kebutuhan bertabrakan dengan aturan di §2, **berhenti dan tanya**.
   Jangan diam-diam melonggarkan aturan.
3. Kerjakan **hanya lingkup hari itu**. Kalau tergoda menyentuh modul lain,
   tulis catatannya di akhir jawaban, jangan langsung dikerjakan.
4. Setiap selesai, tampilkan: daftar file yang dibuat/diubah, perintah verifikasi yang
   sudah dijalankan beserta hasilnya, dan checklist DoD hari itu dalam bentuk `[x]`/`[ ]`.
5. Kalau ada langkah DoD yang gagal, **jangan lapor selesai**. Perbaiki dulu atau
   laporkan blocker dengan jelas.
6. Beberapa hal masih **PR terbuka** — lihat `KONTEKS_REVISI_2026-07-28.md` §4 dan
   `PROGRESS.md` §1. Kalau pekerjaan hari itu menyentuh salah satunya, **berhenti dan tanya**,
   jangan menebak. Hari bertanda 🛑 di `PROMPTS_HARIAN.md` sudah menandainya di depan.
7. **Margin jadwal nol.** Kalau sebuah hari meleset ≥ 0,5 hari, katakan hari itu juga —
   jangan diserap diam-diam ke hari berikutnya. Tidak ada lagi daftar potong yang tersisa.
