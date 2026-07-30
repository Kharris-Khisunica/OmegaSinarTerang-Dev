# Konteks Revisi — 28–29 Juli 2026

Hasil sesi diskusi klien sepanjang 28 Juli 2026. Menutup revisi pasca-plan v2 dan
diskusi modul Master Data + Transaksi.

**Cara pakai file ini:** `CLAUDE.md` v2 memuat aturan yang **sudah final** dan itu yang
dibaca Claude Code tiap sesi. File ini memuat **alasan di balik keputusan**, **delta jadwal**,
dan **PR yang masih terbuka**. Baca §4 sebelum mengerjakan hari yang menyentuhnya.

---

## 1. Ringkasan Posisi

| | |
|---|---|
| Hari selesai | 6 (per 27 Juli) |
| Drift awal | −5 hari (lebih cepat) |
| Buffer plan | 3 hari (Hari 15, 31, 33) |
| **Total tersedia** | **8 hari** |
| Potongan darurat diambil | 4 item = **+2,25 hari** → tersedia **10,25** |
| Beban revisi | **≈ 10,35 hari** |
| **Posisi** | **Praktis pas. Margin nol.** |

**Daftar potong darurat sudah habis.** Permintaan baru harus menukar scope atau
menggeser tanggal cut-over. Ubah §0 `PROGRESS.md` dari "−5 hari" jadi
**"0 hari — buffer dan daftar potong terpakai"**.

---

## 2. Keputusan Final per Tema

### 2.1 Siklus hidup dokumen

- Tiga sumbu status terpisah: `posting_status`, `print_status`, `review_status`.
- **Tidak ada status DRAFT.** Draft akan membakar nomor dokumen dan meninggalkan lubang.
  Kalau butuh "simpan sementara", pakai Sales Order.
- Cetak ulang identik bebas. Edit/VOID setelah cetak wajib batal cetak dulu.
- **Satu permintaan, satu persetujuan**, dengan `intent: EDIT | VOID` dideklarasikan di depan.
- Nota revisi wajib bernomor revisi. Dokumen VOID boleh dicetak ulang bertanda VOID.
- Kunci cetak berlaku untuk 6 dokumen: `JL`, `PI`, `SJ`, `RJ`, `RB`, `PAY`.

> **Temuan:** sistem lama klien (Affari) **sudah punya** tombol `Btl Cetak` dan `Checked`.
> Kunci cetak dan pengecekan bukan konsep baru bagi mereka — kita hanya menambahkan
> otorisasi dan jejak audit yang selama ini tidak ada.

### 2.2 Pengawasan supervisor

- Supervisor **tidak punya dashboard**. Tiga menu: Pengecekan Invoice, Antrian Persetujuan, Laporan.
- Pengecekan dilakukan **di akhir hari, tidak memblokir**. Operator tidak pernah menunggu.
- Supervisor **tidak menulis ke faktur** — menandai `BERMASALAH` lalu meminta operator memperbaiki.
- Endpoint pengecekan **memakai ulang** `GET /sales-invoices` dan `GET /purchase-invoices`
  dengan filter `reviewStatus` — jangan membuat keluarga endpoint `/supervisor/*`.
- Selisih pembayaran di atas Rp 10.000 **otomatis ditandai** di layar ini.
- Klien **menolak** pola supervisor mengetik password di layar operator (risiko password bocor).

### 2.3 Penomoran

- Format `KODE/RM01-YYMMXXXX`, reset bulanan. Faktur penjualan tetap **`JL`** (bukan `INV`) —
  pelanggan dan staf sudah terbiasa.
- **Nomor tidak boleh hilang.** Pilihan v2 memakai tabel `document_counters` (bukan `SEQUENCE`)
  ternyata membayar untuk persyaratan yang belum ada saat itu: rollback mengembalikan nomor.
- **Laporan Kontinuitas Nomor Dokumen** wajib — menampilkan setiap nomor beserta status dan
  justifikasi VOID-nya. Ini yang diserahkan ke pemilik/auditor.
- Alasan VOID wajib: `void_reason_code` (enum) + `void_reason_note` (teks bebas, wajib).

### 2.4 Pajak & harga pokok — perubahan terbesar

Ini menyentuh dua aturan terkunci sekaligus dan konsekuensinya diam-diam besar.

| | v1 | v2 |
|---|---|---|
| Pembulatan invoice | Wajib, kelipatan 100 | **Dicabut.** Total eksak |
| `products.tax_status` | Tidak ada | **`is_bkp` ada** |
| PPN masukan | Ikut dormant (0) | **Dikapitalisasi ke harga pokok lot** |
| Syarat PPN keluaran | `company_is_pkp && customer.is_pkp` | **`company_is_pkp` saja** |
| Diskon pembelian | — | **Neto**, larut ke harga pokok, tidak masuk jurnal |
| Diskon penjualan | — | **Bruto**, muncul sebagai akun kontra |

**Kenapa PPN masukan penting:** klien non-PKP tetap membayar PPN ke supplier PKP dan
tidak bisa mengkreditkannya. Kalau PPN diperlakukan 0, jurnal tidak seimbang — atau kalau
dipaksa seimbang, harga pokok setiap lot kurang ~11%, laba kotor terlihat lebih besar dari
kenyataan, dan persediaan di neraca kurang **terus-menerus tanpa satu pun error muncul**.

**Kenapa diskon pembelian tidak boleh masuk jurnal:** metode bruto akan mencatat Persediaan
di harga kotor sementara lot FIFO mencatat harga neto. Saldo akun Persediaan tidak akan pernah
sama lagi dengan Σ nilai lot, dan invarian Hari 8 merah sejak faktur pembelian pertama.
Asimetrinya wajar: pendapatan tidak punya kewajiban rekonsiliasi, persediaan punya.

**Diskon faktur pembelian wajib dialokasikan pro-rata ke baris** (berdasarkan nilai baris),
karena tiap baris membentuk lot dengan harga pokok sendiri. Sisa pembulatan ke baris terakhir.

### 2.5 Harga jual

- Harga master **hanya seed** — tidak dipakai di lapangan.
- Harga **bebas diketik per pelanggan**, fluktuatif (produk sama bisa 119/120/121 rb).
- Diskon per baris **dan** per faktur, keduanya persen ATAU rupiah (alternatif, bukan bertingkat).
  Diskon jarang dipakai tapi dipertahankan sebagai konvensi.
- **Panel 10 harga terakhir** per pelanggan + produk + **satuan yang sedang diketik**.
  Ini bukan kenyamanan — dengan 260 pelanggan dan harga fluktuatif, ini satu-satunya cara
  operator tahu harga yang benar.
- **Bahaya yang harus dicegah:** harga dus dan renceng berbeda sebesar angka konversi (±25×).
  Panel wajib menampilkan kolom satuan. Kontrol jual-rugi jadi jaring pengaman kedua.
- Batas bawah = `unit_cost` lot terbaru × konversi, dibanding **harga bersih setelah diskon**.
  Tidak ditampilkan, hanya menghadang. Otorisasi `SELL_BELOW_COST`, satu permintaan per faktur.

### 2.6 Barang titipan (bukan konsinyasi)

Klien **tidak menerima konsinyasi dari supplier** — risiko terbesar yang sempat dikhawatirkan,
tertutup dengan biaya nol.

"Barang titipan" = **pelanggan sudah membeli dan sudah bayar, belum mengambil barang.**
Aturan v1 (`CUSTOMER_CONSIGNMENT`) ternyata **sudah tepat mekanismenya** — validasi
"qty ≤ qty yang sudah dibeli customer" hanya masuk akal untuk skenario ini. **Namanya yang
salah** dan menyesatkan siapa pun yang membacanya. Diganti `TITIPAN_PELANGGAN`.

### 2.7 Bad stock — naik dari fitur pinggiran jadi simpul

```
Barang rusak ──────────┐
                       ├──→ [BAD_STOCK] ──→ Retur ke supplier (dengan selisih nilai)
Retur pelanggan ───────┘         │
                                 └──→ Kembali ke STORE (perlu otorisasi supervisor)
```

- Retur pelanggan **selalu** masuk BS, tidak pernah kembali langsung ke stok jual.
- BS **tidak dijual** ke pelanggan; nilainya tetap penuh.
- Retur pembelian **selalu** dari BS, dipilih lewat supplier → daftar BS tersaring ke produk
  yang pernah dibeli dari supplier itu.
- Nilai retur dinegosiasikan (prinsip klien: ambil yang menguntungkan toko). Persediaan
  **selalu** dikreditkan sebesar harga pokok lot; selisihnya ke akun `Selisih Retur Pembelian`.
- BS → STORE **wajib otorisasi** (barang jadi bisa dijual lagi).
- Tukar barang = **dua dokumen** (RB lalu PI baru), bukan satu tombol.

### 2.8 Pembelian & bonus (29 Juli)

- **Tiga tanggal dipisah**: `receipt_date` (→ `lot_date` FIFO), `supplier_invoice_date`,
  `due_date = supplier_invoice_date + termin`. Sistem lama sudah memisahkannya dan nilainya
  memang berbeda — PR #1 tertutup dengan sendirinya.
- `supplier_invoice_no` disimpan. Faktur pembelian **selalu ke `STORE`**.
- **Diskon pembelian satu tingkat** (persen ATAU rupiah, interchangeable) — sama seperti penjualan.
  Kolom Disc-2 dan Disc-3 di sistem lama tidak dipakai.
- **Ongkir → biaya operasional**, tidak dikapitalisasi ke harga pokok. Konsekuensinya nilai
  persediaan sedikit di bawah biaya perolehan sebenarnya; tidak material kalau supplier besar
  mengantar gratis.
- Field `Adjust` **tidak dipakai**. **Order Pembelian tidak dibangun.**
- **Bonus: harga pokok nol.** Keputusan klien. Dua konsekuensi mekanis yang wajib ditangani:
  1. Setiap pencarian "lot terbaru" sebagai dasar biaya **wajib melewati lot berharga nol**
     (§2.8 dan §2.17 CLAUDE.md). Tanpa ini, satu pembelian berbonus **mematikan batas
     jual-rugi** sampai lot bonusnya habis — tanpa error apa pun.
  2. Saat FIFO sampai ke lot bonus, HPP nol dan margin faktur tampak 100%. **Disengaja**,
     bukan kesalahan hitung.
- Bonus selalu produk yang sama. Nilai persediaan **total** tetap benar di kedua metode —
  yang berbeda hanya alokasi per unit dan waktu pengakuan marginnya.

### 2.9 Mutasi gudang (29 Juli)

- Kode `GD`, **ikut kunci cetak** (daftar naik jadi 7 dokumen).
- **`unit_cost` di layar mutasi read-only.** Kalau bisa diketik, operator punya jalan mengubah
  nilai persediaan tanpa jurnal: `STORE` → `BAD_STOCK`, ubah harga, pindah balik.
- Nota mutasi mencetak qty tanpa nilai. Alur "Permintaan Mutasi Gudang" tidak dipakai.

### 2.10 Hosting

- **Tanpa mini PC.** PC operator (i5-4690, 8 GB DDR3, 1 TB HDD) merangkap server.
- **UPS wajib** — satu-satunya belanja yang tidak bisa direlakan. Membatalkan mini PC
  menghemat jauh lebih banyak daripada harga UPS, jadi ini net pengurangan belanja.
- **Tanpa Docker.** Postgres native + NestJS sebagai Windows service (`nssm`) + nginx untuk
  frontend statis. `docker-compose.yml` tetap di repo untuk kemungkinan pindah mesin.
- Frontend dibangun **statis** (`ssr: false`) — tidak ada manfaat SSR untuk aplikasi LAN.
- Tuning Postgres: `shared_buffers 1GB` (mesin dipakai bersama), `effective_cache_size 3GB`,
  `checkpoint_timeout 15min`, `checkpoint_completion_target 0.9`, `max_wal_size 2GB`,
  `random_page_cost 4.0` (biarkan — ini nilai HDD), **`synchronous_commit` tetap `on`**.
- **HDD bukan masalah pada volume ini.** 11–12 transaksi/hari = satu tiap ~50 menit;
  commit ~10–20 ms tidak akan pernah terasa. Risiko HDD adalah **kegagalan mekanis**, bukan
  kecepatan — dan backup adalah satu-satunya jaring pengaman.
- Gratis dan wajib: matikan restart otomatis Windows Update, `pg_dump` dijadwalkan
  **di luar jam kerja**, Postgres & NestJS auto-start sebagai service.
- Approval memakai **polling 5 detik**, bukan WebSocket. Supervisor selalu di tempat.

### 2.11 Volume — koreksi asumsi

Dari penomoran faktur sistem lama (`JL/RM01-26040331` lalu `26050001`): **±330 faktur/bulan,
11–12 per hari kerja.** Dikonfirmasi klien. CLAUDE.md §1 sudah dikoreksi.

Konsekuensinya §9.2 plan (daftar tidak-boleh-dipotong) disusun ulang: pembenarannya adalah
**kebenaran data**, bukan kecepatan input. Panel harga, sisa stok, modal pelanggan, batas
jual-rugi, dan kunci cetak tetap wajib. Navigasi keyboard bebas-mouse total diturunkan ke
"cukup baik". Menghemat ±1,25 hari.

---

## 3. Delta Jadwal per Hari

Hanya hari yang berubah. Yang tidak tercantum tetap seperti plan v2.

| Hari | Perubahan | Δ |
|---|---|---|
| **3** | Generator nomor → format `JL/RM01-YYMMXXXX`. `store_code` ke `settings`. Rework + test | +0,25 |
| **4** | `products`: barcode-as-code, `is_bkp`, nama tersusun 4 bagian + `display_name` terindeks. `customers.ar_account_id`. `suppliers.is_pkp`. **Master baru: Merek, UoM, Salesman** | +0,60 |
| **5** | `authorization_requests` + `payload` + `context_summary` + **validasi ulang saat consume** | +0,25 |
| **8** | `StepUpService` dinamis (step-up bergantung isi transaksi, bukan hanya role) | +0,50 |
| **10** | Rename `TITIPAN_PELANGGAN`. Mutasi **BS → STORE wajib otorisasi** | +0,15 |
| **11** | Diskon **baris + faktur** dengan alokasi pro-rata. **PPN masukan ke harga pokok**. Gerbang `supplier.is_pkp` × `product.is_bkp` | +0,50 |
| **12** | **Kunci cetak + batal cetak** (mekanisme generik, dipakai 6 dokumen) | +0,50 |
| **13** | Retur pembelian **dari BS**, alur pilih-supplier, `stock_cost_lots.supplier_id`, akun **Selisih Retur Pembelian** | +0,40 |
| **14** | Approval **kas besar** (`requires_outflow_approval` + ambang + StepUpService) | +0,25 |
| **16** | **Saluran penjualan** eksplisit + validasi SO wajib untuk `PENGIRIMAN`. SO **tidak menahan stok** | +0,20 |
| **17** | Panel harga: **10 baris, per satuan**, kolom Tanggal/Qty/Satuan/@Harga, fallback bertingkat, indeks denormalisasi `customer_id` | +0,25 |
| **18** | **Pembulatan dicabut**. Diskon baris+faktur. **Batas jual di bawah harga pokok** (`SELL_BELOW_COST`) | +0,25 |
| **19** | Kunci cetak nota. Layout **A5 landscape 2-up**, 14 baris/halaman, nomor revisi | +0,25 |
| **20** | Retur penjualan **wajib faktur asal**, barang **selalu ke BS** | +0,25 |
| **22** | Surat jalan A5 + kunci cetak | +0,10 |
| **23–24** | **Selisih pembayaran** (satu akun dua arah) + penandaan > Rp 10.000 | +0,50 |
| **26** | **Laporan barang titipan per pelanggan** + muncul di stok opname | +0,25 |
| **BARU** | **Halaman Pengecekan Invoice Harian** (supervisor) + polling + nav supervisor 3 item | +0,85 |
| **BARU** | **Tutup bulan** + buka kembali + validator periode digabung ke validator backdate | +0,75 |
| **BARU** | **Laporan Kontinuitas Nomor Dokumen** (semua jenis dokumen sekaligus) | +0,50 |
| **30** | Deploy: Windows-native, tanpa Docker, FE statis | +0,50 |
| — | Ergonomi keyboard diturunkan ke "cukup baik" (§8 v2) | **−1,25** |
| — | Export PDF laporan, laporan retur & stok minus, cash opname, rekap setoran agen | **−2,25** |
| | **Total bersih** | **≈ +5,5** |

*(Angka +5,5 di atas adalah tambahan bersih terhadap plan v2. Dihitung terhadap 8 hari
kredit + buffer, posisi akhirnya ≈ 10,35 beban vs 10,25 tersedia — lihat §1.)*

**Urutan pengerjaan yang saya sarankan:** Hari 5 dan 8 dulu (payload + StepUpService) —
keduanya tidak bergantung pada PR terbuka mana pun dan menjadi fondasi kunci cetak,
kas besar, dan jual-rugi. Hari 3 (format nomor) **wajib sebelum Hari 11**, karena setelah
itu dokumen mulai terbit dengan nomor sungguhan.

---

## 4. PR Terbuka

### 4.1 Modul yang belum dibahas sama sekali

| Modul | Hari | Catatan |
|---|---|---|
| ~~Faktur Pembelian~~ | 11 | ✅ **Tuntas 29 Juli** — tiga tanggal, `supplier_invoice_no`, bonus, ongkir ke opex, selalu ke STORE |
| ~~Mutasi Gudang~~ | 10 | ✅ **Tuntas 29 Juli** — kode `GD`, ikut kunci cetak, `unit_cost` read-only |
| **Pembayaran / Kas & Bank** | 23–24 | **Belum dibahas.** Alokasi ke faktur, multi-metode, setoran sopir. Plan menandainya sebagai bagian tersulit |
| **Biaya Operasional** | 14 | Ditunda klien. Termasuk gaji harian salesman dan **ongkos kirim pembelian** |
| **Laporan** | 26–30 | Ditunda klien |
| **Saldo Awal (bentuk)** | 9 | Ada di daftar tidak-boleh-dipotong, bentuknya belum dibahas |

### 4.2 Pertanyaan terbuka yang bisa menghambat

| # | Pertanyaan | Menghambat | Prioritas |
|---|---|---|---|
| 1 | ~~Tanggal faktur supplier vs tanggal terima dipisah?~~ **TERTUTUP 29 Juli** — sistem lama memang memisahkan `Tanggal`, `Tgl. Nota`, dan `Jth. Tempo`, dan nilainya bisa berbeda. Ketiganya disimpan | — | ✅ |
| 2 | **Lot dari retur pelanggan punya `supplier_id` NULL.** Klien minta supplier asal dilacak, tapi barang yang dikembalikan pelanggan tidak punya jejak supplier yang bersih. Boleh diretur ke supplier mana pun, atau diblokir? | Hari 13 | **Tinggi** |
| 3 | **Panel harga kosong untuk satuan yang belum pernah dipakai.** Panel disaring per satuan; kalau produk belum pernah dijual dalam renceng ke siapa pun, fallback terakhir adalah harga master — yang klien bilang tidak dipakai | Hari 17 | Sedang |
| 4 | **Hari pertama panel harga kosong total.** Data Affari tidak bisa diekspor. Mitigasi: sistem lama read-only 3 bulan (plan §9.1); dengan ±61 produk riwayat terisi 1–2 minggu. Opsi: klien mengetik manual 10–20 pelanggan terbesar × produk rutin (±150–250 baris) sebelum go-live | Cut-over | Sedang |
| 5 | **Ekspor Affari — dorong sekali lagi.** Cek menu `Laporan` (kemungkinan ada tombol ekspor Excel), tanya vendor, atau baca file database di PC klien | Cut-over | Sedang |
| 6 | **`REC(s): 61` dan `260` — jumlah total atau tampilan terfilter?** Menentukan apakah migrasi manual setengah hari atau berminggu-minggu | Hari 10+ | Sedang |
| 7 | **Format nota belum diterima klien.** Dijanjikan 27 Juli. Aturan cadangan plan: lewat Hari 12 → layout standar, revisi pasca-MVP. Hari 12 jatuh ±2 Agustus | Hari 19, 22 | Sedang |
| 8 | **Modul Pembayaran / Kas & Bank belum dibahas sama sekali** — Hari 23–24 ditandai plan sebagai bagian tersulit. Belum ada estimasi | Hari 23–24 | **Tinggi** |

### 4.3 Tugas klien yang belum dijadwalkan

Karena **tidak ada ekspor dari Affari**, semuanya manual dan semuanya di sisi klien:

- Master produk (±61?), pelanggan (±260), merek, UoM, salesman, supplier
- Saldo awal stok + harga pokok per produk
- Saldo awal piutang per pelanggan, hutang per supplier
- (Opsional) riwayat harga untuk pelanggan terbesar

Plan menaruh ini di **Hari 32 — 27 Agustus, lima hari sebelum cut-over.** Terlalu mepet.
Plan sendiri sudah mengantisipasi: §10 mensyaratkan keputusan hosting selesai Hari 4
*"agar input master data langsung ke instance produksi"* — dan keputusan itu kini final.

**Rekomendasi:** begitu master produk & pelanggan jadi (±Hari 10, awal Agustus), server
dinyalakan di toko dan klien mulai mengisi, paralel. Klien setuju paralel, "tapi bisa menyusul" —
perlu **tenggat internal**: master produk & pelanggan selesai **±20 Agustus**, menyisakan
10 hari untuk saldo awal dan gladi bersih.

### 4.4 Kontrol yang dilepas — pastikan ada penggantinya di kertas

**Rekap setoran agen dipotong.** Rekap itu berdiri persis di titik uang tunai berpindah
tangan — sopir membawa pulang uang. "Manual bulan pertama" gampang berubah jadi tidak ada
yang mengerjakan. Pastikan ada **nama dan waktunya**: siapa mencocokkan setoran sopir dengan
faktur terkirim, kapan, siapa memeriksa. Menempelkannya ke ritual pengecekan sore supervisor
itu gratis dan menutup lubangnya.

---

## 5. Catatan Kecil dari Data Klien

- Baris `ROYCO 94 GR` di master Affari menampilkan harga jual **23.000.000** — salah ketik
  yang tidak pernah tertangkap. Sistem baru sebaiknya memvalidasi harga jual terhadap
  **besaran yang wajar**, bukan hanya terhadap harga pokok.
- Retur penjualan di sistem lama: **1 record**. Retur pembelian: 34. Order penjualan: **0**
  (ditulis manual di kertas — inilah yang ingin klien pindahkan ke program).
- Kode produk `2401200034` = produk ke-34 yang dibuat 20 Januari 2024. Format `YYMMDDXXXX`
  terkonfirmasi dari data nyata.
- Sistem lama: Affari Retail System v7.57.27, dipakai untuk toko ber-scope lebih besar —
  banyak fiturnya (multi-outlet, lokasi per baris, harga bertingkat, SN/IMEI, konsinyasi)
  memang tidak dipakai klien. Jangan tiru kompleksitasnya.

---

## 6. Yang Sudah Tuntas

Master produk · master pelanggan · master salesman · faktur penjualan · retur penjualan ·
retur pembelian · bad stock · order penjualan · penomoran dokumen · kunci cetak ·
tutup bulan · pengawasan supervisor · pajak & harga pokok · diskon · harga jual ·
barang titipan · hosting & deploy · daftar potong darurat.
