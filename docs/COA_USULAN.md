# Usulan Bagan Akun (Chart of Accounts)

> Disusun 12–13 Agustus 2026 (Hari 17), untuk di-seed sebelum cut-over 1 September 2026.
>
> **Daftar akun lengkap beserta saldo 31 Juli ada di `docs/COA_Usulan_OmegaSinarTerang.xlsx`** —
> itu berkas yang diserahkan ke klien untuk dicoret. File ini memuat **alasan rancangan** dan
> **spesifikasi teknisnya**.
>
> **Sumber:** `docs/Chart_of_Accounts_Affari.xlsx` (203 baris, sistem lama) ·
> `docs/Laporan_laba_rugi_Neraca_Juli.xlsx` (laporan klien, faktual & terbaru) ·
> `CLAUDE.md` v3 · `KONTEKS_REVISI_2026-07-28.md` ·
> `docs/PERTANYAAN_KLIEN_BIAYA_OPERASIONAL.md` + `_PUTARAN2.md`.

---

## 0. Ringkasan

| | |
|---|---|
| Format kode | `GG.KKK.JJJJJ` — tiga tingkat: **Grup · Kategori · Jenis** |
| Tujuh grup | 01 Aset · 02 Liabilitas · 03 Ekuitas · 04 Pendapatan · 05 HPP · 06 Beban Operasional · 07 Pendapatan & Beban Lain-lain |
| Baris total | **114** — 27 header, sisanya dapat dijurnal |
| Versi A | **82 akun dapat dijurnal** — konsumsi pribadi → Prive |
| Versi B | **87 akun dapat dijurnal** — konsumsi pribadi → kategori `06.130 Beban Pribadi Pemilik` |
| Metode persediaan | **Perpetual FIFO** (Affari & laporan klien memakai periodik) |
| Status PKP | **Non-PKP** — akun PPN disediakan tapi dormant |
| Standar rujukan | SAK-ETAP / SAK-EMKM, penyajian neraca & L/R bertingkat |

### Keputusan yang sudah diambil

| # | Keputusan | Tanggal |
|---|---|---|
| 1 | **Tiga tingkat berformat Affari** (`GG.KKK.JJJJJ`), header tidak bisa dijurnal | 12 Agu |
| 2 | **Satu akun penjualan.** Pemecahan per saluran/salesman/pelanggan lewat laporan | 12 Agu |
| 3 | **Akun penyusutan disediakan tapi dormant** — bersaldo nol sampai klien memutuskan mulai | 12 Agu |
| 4 | **Tetap non-PKP.** PPN Masukan & PPN Keluaran ada tapi tidak dipakai | 13 Agu |
| 5 | **Rumah tinggal & pinjaman BSI TETAP di neraca toko**, ditempatkan di blok **Non-Usaha** (`01.310`, `02.310`) | 13 Agu |
| 6 | **Dua versi dibuat** untuk ditanyakan ke klien: konsumsi pribadi → Prive (A) atau → beban toko (B) | 13 Agu |

### Yang membedakan Versi A dan Versi B

Hanya **lima pos konsumsi pribadi** senilai Rp 28.550.204 pada Juli:

| Pos | Rp | Versi A | Versi B |
|---|---|---|---|
| Kartu kredit Permata + Mega | 21.261.078 | `03.110.00002` Prive | `06.130.00005` |
| Perpuluhan | 4.100.000 | Prive | `06.130.00003` |
| IPL apartemen | 2.129.126 | Prive | `06.130.00002` |
| Asuransi jiwa | 1.000.000 | Prive | `06.130.00001` |
| Biaya pergaulan | 60.000 | Prive | `06.130.00004` |

**Garis pemisah Versi A:** uang toko yang berubah jadi barang yang **masih ada** (rumah,
kendaraan) dicatat sebagai aset; uang yang **habis dikonsumsi** masuk Prive. Garis ini punya dasar
yang bisa dijelaskan ke siapa pun, dan tidak bertabrakan dengan keputusan #5.

**Versi B tetap mengumpulkan kelimanya di satu kategori** (`06.130`), bukan menyebarkannya ke akun
beban biasa. Dengan begitu pemilik masih bisa melihatnya terpisah, dan kalau nanti berubah pikiran,
pemindahan ke Prive adalah satu langkah — bukan penelusuran ulang ratusan baris.

**Kekayaan bersih identik di kedua versi: Rp 2.040.358.869 per 31 Juli.** Tambahan kekayaan dari
Juli juga identik: Rp 7.851.333. Yang berbeda hanya berapa dari angka itu yang disebut "laba toko".

---

## 1. Kenapa tidak menyalin Affari, dan kenapa tidak menyalin laporan klien

### 1.1 Affari — bagan toko retail multi-outlet, bukan grosir satu toko

Affari Retail System v7.57.27 dipakai untuk toko ber-scope jauh lebih besar. Bagannya membawa akun
yang klien **tidak pernah punya kejadiannya**:

| Akun Affari | Kenapa tidak diadopsi |
|---|---|
| `07.001.00101` Mutasi Outlet · `07.001.00102` Mutasi Dalam Perjalanan | Klien satu toko (`RM01`). Cabang kedua di luar scope (`CLAUDE.md` §1) |
| `01.004.00002` Persediaan Dalam Perjalanan | Tidak ada pengiriman antar-outlet |
| `06.001`–`06.003` Penjualan Toko/Cash · Korporat · Satuan | Sembilan akun untuk satu jenis penjualan. Sistem baru menyimpan saluran dan salesman sebagai **field di faktur** |
| `07.001.00001`–`10001` Persediaan Awal · Pembelian · Pot. Pembelian · Retur Pembelian · Persediaan Akhir | Akun **metode periodik**. Sistem baru perpetual FIFO |
| `01.005.00002`–`00007` Piutang HBA / Ade Jaya / Aris / Syamsul / Erby / Tiga Sekawan | Satu akun buku besar per pelanggan. Sistem baru punya sub-ledger |
| `08.003.00001`–`00002` B. BBM per nomor polisi | Klien sendiri memilih **satu akun + kolom kendaraan** (jawaban §2 no. 3) |
| `08.017.00003`–`00004` B. Komisi 30/12 · B. Komisi 8/2 | Tanggal di dalam nama akun — ini catatan, bukan akun |
| `09.001` B. Amortisasi (Sewa/Asuransi/Software) | Tidak ada yang diamortisasi |

**Cacat data di Affari — ini yang menjelaskan kenapa angkanya tidak pernah cocok:**

- **Dari 13 akun Akumulasi Penyusutan, 8 bersaldo normal `Debet`** — arah yang salah untuk akun
  kontra-aset. Yang benar (`Kredit`) hanya 5: Bangunan, Kendaraan F 8764 SR, Komputer Admin, Apar,
  Inventaris II. Akun kontra yang arahnya terbalik akan **menambah** nilai aset setiap kali
  disusutkan. Ini alasan mekanis kenapa penyusutan tidak pernah berjalan.
- `07.001.00004` **Retur Pembelian bersaldo normal `Debet`**, padahal dalam metode periodik ia
  mengurangi pembelian → `Kredit`. Laporan Juli klien memang menghitung retur pembelian **manual**
  (`−C12`), tidak mengambil dari akun ini.
- `06.003.00000` **Penjualan Satuan** (header) bersaldo `Debet`, anaknya `06.003.00001` `Kredit`.
- Kolom **Arus Kas** semua baris berisi `Operasi` — termasuk Tanah, Kendaraan, dan Hutang Bank,
  yang seharusnya `Investasi` dan `Pendanaan`.

Bagan baru menegakkan `normal_balance` sebagai kolom wajib **justru karena** kesalahan ini terjadi
diam-diam, tanpa satu pun error muncul. Lihat §7 untuk validasi yang mencegahnya terulang.

### 1.2 Laporan klien — faktual dan mutakhir, tapi belum laporan usaha

Laporan Juli 2026 buatan klien adalah sumber angka yang **paling bisa dipercaya**: dipakai
sungguhan, seimbang (Aktiva = Pasiva = Rp 4.237.818.106), dan mutakhir. Tiga hal menghalanginya
menjadi laporan usaha:

**a. Harta dan beban pribadi tercampur.** Rumah pemilik Rp 1.356.977.238 sebagai aset toko, plus
Rp 28.550.204/bulan konsumsi pribadi di L/R. Klien memutuskan **rumahnya tetap** (keputusan #5),
karena omzet toko memang yang membiayainya — jadi bagan baru menyediakan blok **Non-Usaha** agar ia
tetap di neraca tanpa mengaburkan aset operasional. Untuk konsumsi pribadi, dua versi disiapkan.

**b. Tidak ada pemisahan aset lancar vs aset tetap.** Kas, bank, persediaan, piutang, kendaraan,
CCTV, dan rumah berjajar dalam satu kolom. Rasio lancar dan modal kerja tidak bisa dihitung.

**c. Aset tetap tidak pernah disusutkan.** Engkel Mitsubishi yang dibeli 14 Juli 2023 masih
tercatat Rp 92.000.000 tiga tahun kemudian.

Satu lagi yang bukan penyimpangan tapi perlu dicatat: **retur penjualan + diskon penjualan
(Rp 351.500) dijumlahkan ke dalam rumus harga pokok**, bukan dikurangkan dari penjualan. Laba
brutonya kebetulan tetap benar — selisihnya sama besar — tetapi penjualan dan harga pokok
sama-sama dilaporkan lebih besar dari sebenarnya. Sistem baru mencatatnya sebagai akun kontra
pendapatan (metode bruto, `CLAUDE.md` §4).

---

## 2. Format kode

```
GG . KKK . JJJJJ
│     │      └─ Jenis   — akun buku besar, dapat dijurnal
│     └──────── Kategori — kelompok penyajian
│                digit-1: 1xx lancar/jangka pendek · 2xx tetap/jangka panjang · 3xx non-usaha
└────────────── Grup     — tujuh blok utama laporan
```

Lebar segmen (2·3·5) **persis format Affari**, dan `.00000` menandai header sama seperti konvensi
`G`/`M` di sana — operator mengenali bentuknya tanpa diajari ulang. Yang berubah adalah **arti
nomor grupnya**, yang kini mengikuti urutan baku laporan keuangan.

**Header tidak dapat dijurnal** (`is_postable = false` pada semua baris Grup dan Kategori). Jurnal
ke akun header adalah cara paling umum sebuah bagan kehilangan makna: saldo menumpuk di induk,
rincian di anaknya tidak lagi menjelaskan apa-apa.

**Nomor Jenis diberi jarak, bukan berurutan rapat.** `01.110.00003` lalu melompat ke
`01.110.00011`; beban berakhir di `00009` lalu `00099` untuk "Lainnya". Ruang kosong itu supaya
akun baru bisa disisipkan **pada tempat yang benar** tanpa menomori ulang apa pun.

---

## 3. Struktur

Daftar lengkap 114 baris ada di **`docs/COA_Usulan_OmegaSinarTerang.xlsx`**, lembar `Bagan Akun`.
Di bawah hanya kerangka dan keputusan yang perlu penjelasan.

| Kategori | Isi | Catatan |
|---|---|---|
| `01.110` Kas dan Setara Kas | Kas Kecil · Kas Toko · Kas Besar · Bank BCA · BSI · Mandiri · BSI (a.n. Asmiati) | Kas Besar & seluruh bank ditandai `requires_outflow_approval` |
| `01.120` Piutang | Piutang Usaha (kontrol) · Karyawan · Pihak Berelasi · Lain-lain | Hanya Piutang Usaha ber-`is_receivable` |
| `01.130` Persediaan | Persediaan Barang Dagang | `is_inventory` — mencakup STORE, BAD_STOCK, TITIPAN |
| `01.140` Uang Muka & Dibayar di Muka | Uang Muka Pembelian · Biaya Dibayar di Muka | |
| `01.150` Pajak Dibayar di Muka | PPN Masukan | Dormant — non-PKP |
| `01.210` Aset Tetap Usaha | Tanah · Bangunan · Kendaraan · Peralatan & Inventaris Kantor · Peralatan Gudang | |
| `01.220` Akumulasi Penyusutan | 4 akun kontra | Dormant |
| **`01.310` Aset Non-Usaha** | **Rumah Tinggal Pemilik · Properti Lain** | **Keputusan #5** |
| `02.110` Liabilitas Jangka Pendek | Hutang Usaha (kontrol) · Hutang Biaya · Gaji · Uang Muka Penjualan · Bank Bag. Lancar · Kartu Kredit · Pajak · PPN Keluaran | |
| `02.210` Liabilitas Jangka Panjang | Hutang Bank Jangka Panjang · Hutang Pihak Berelasi | |
| **`02.310` Liabilitas Non-Usaha** | **Hutang Bank — Pembiayaan Rumah (BSI)** | **Keputusan #5** |
| `03.110` Modal | Modal Pemilik · **Prive** | Prive = kontra-ekuitas, saldo normal Debet |
| `03.120` Saldo Laba | Laba Ditahan · Laba Tahun Berjalan · Ikhtisar Laba Rugi | Ikhtisar **nonaktif**, lihat di bawah |
| `04.110` Pendapatan Penjualan | Penjualan Barang Dagang · Retur Penjualan · Diskon Penjualan | Dua terakhir kontra, saldo normal Debet |
| `05.110` Harga Pokok Penjualan | HPP · Selisih Persediaan (Stok Opname) · Kerugian Barang Rusak | |
| `06.110` Beban Penjualan & Distribusi | 10 akun | |
| `06.120` Beban Umum & Administrasi | 15 akun | |
| **`06.130` Beban Pribadi Pemilik** | **5 akun — HANYA VERSI B** | |
| `07.110` Pendapatan Lain-lain | Jasa Lain · Bunga & Jasa Giro · Pelepasan Aset Tetap · **Selisih Retur Pembelian** | |
| `07.210` Beban Lain-lain | Bunga Pinjaman · Administrasi Bank · Provisi · **Selisih Pembayaran** · Lain-lain | |

### Keputusan yang perlu penjelasan

**Blok Non-Usaha.** Rumah dan pinjaman BSI tetap menyeimbangkan neraca seperti sekarang, tapi tidak
tercampur ke Aset Tetap Usaha dan Hutang Bank usaha. Tanpa pemisahan itu, angka "Aset Tetap"
menjadi campuran kendaraan operasional dan rumah tinggal, dan tidak ada cara membaca kemampuan
bayar toko. Ini kompromi yang menghormati keputusan klien **dan** menjaga laporan tetap terbaca.

**Tidak ada akun `Persediaan Barang Rusak` terpisah.** `CLAUDE.md` §3 menetapkan mutasi
`STORE ⇄ BAD_STOCK` **tidak menghasilkan jurnal** dan harga pokoknya tetap penuh. Barang rusak
memang tetap di `01.130.00001`. Memberinya akun sendiri menuntut jurnal mutasi yang aturannya
justru melarang — dan begitu diberi akun tanpa jurnal, saldonya selamanya nol sementara barangnya
nyata ada. Nilai bad stock dilaporkan lewat **laporan stok per gudang**, dari
`product_stock_balance`, bukan dari buku besar. Hal yang sama berlaku untuk **barang titipan
pelanggan** — sudah dijual dan sudah dibayar, jadi pendapatan dan harga pokoknya sudah diakui.

**`03.120.00009 Ikhtisar Laba Rugi` sengaja nonaktif.** `CLAUDE.md` §2.15 menandai satu PR terbuka:
apakah baris Saldo Awal/Saldo Akhir tiap bulan adalah **jurnal penutup & pembuka sungguhan** atau
**konstruksi tampilan**. Keduanya menghasilkan laporan sama tapi skema dan invarian testnya
berbeda, dan aturannya melarang menebak. Akun ini disediakan supaya kalau jawabannya "jurnal
sungguhan", ia tinggal diaktifkan — bukan disisipkan ke tengah bagan setelah nomor beredar.

**Gaji salesman dan upah tukang angkut wajib dua akun.** Jawaban klien §3 no. 4: upah tukang angkut
diinput **operator** setiap hari, gaji salesman hanya **master**. Kalau satu akun, sistem tidak
punya apa pun untuk membedakan siapa yang boleh memakainya — pemisahan itu harus hidup di bagan
akun, bukan di kebiasaan orang.

**Lima akun periodik Affari tidak ada:** `Persediaan Awal`, `Pembelian`, `Pot. Pembelian`,
`Retur Pembelian`, `Persediaan Akhir`. `CLAUDE.md` §3 sudah menetapkan akun Retur Pembelian dan
Diskon Pembelian **tidak dibuat** — diskon pembelian larut ke harga pokok lot; kalau ia juga masuk
jurnal, saldo akun Persediaan tidak akan pernah lagi sama dengan Σ nilai lot.

**`Selisih Pembayaran` dan `Selisih Retur Pembelian` naik dari `51xx` ke Grup 07.** Seed lama
menaruh keduanya bersama HPP dengan alasan tercatat: "dua arah, tidak pas masuk
ASSET/LIABILITY/EQUITY". Alasannya benar, tempatnya kurang tepat — keduanya bukan biaya memperoleh
barang yang dijual, jadi ia mengaburkan laba kotor.

**Bunga pinjaman dan administrasi bank di Grup 07, bukan Grup 06.** Laporan Juli klien menaruhnya
di "Biaya Administrasi dan Umum" bersama gaji dan listrik, sehingga **laba usaha** tidak bisa
dibaca. Untuk klien yang membayar bunga Rp 12,5 juta/bulan, memisahkan keduanya bukan formalitas:
itu perbedaan antara "toko ini untung" dan "toko ini untung, tapi habis untuk bunga".

---

## 4. Pemetaan dari seed lama (13 akun)

`id` **tidak berubah** — hanya `code`, `name`, dan atribut. Semua `journal_entry_lines`,
`customers.ar_account_id`, dan `settings.default_ar_account_id` yang sudah ada tetap menunjuk baris
yang benar.

| Lama | Nama lama | Baru | Nama baru |
|---|---|---|---|
| `1101` | Persediaan | `01.130.00001` | Persediaan Barang Dagang |
| `1102` | Piutang Usaha | `01.120.00001` | Piutang Usaha |
| `1103` | PPN Masukan | `01.150.00001` | PPN Masukan |
| `2101` | Hutang Usaha | `02.110.00001` | Hutang Usaha |
| `2102` | PPN Keluaran | `02.110.00022` | PPN Keluaran |
| `3101` | Modal | `03.110.00001` | Modal Pemilik |
| `4101` | Pendapatan Penjualan | `04.110.00001` | Penjualan Barang Dagang |
| `4103` | Retur Penjualan | `04.110.00002` | Retur Penjualan |
| `4104` | Diskon Penjualan | `04.110.00003` | Diskon Penjualan |
| `5101` | HPP | `05.110.00001` | Harga Pokok Penjualan |
| `5102` | Biaya Operasional | `06.120.00099` | B. Umum dan Administrasi Lainnya |
| `5103` | Selisih Pembayaran | `07.210.00004` | Selisih Pembayaran |
| `5104` | Selisih Retur Pembelian | `07.110.00004` | Selisih Retur Pembelian *(tipe `EXPENSE` → `INCOME`)* |

`4102 Pendapatan Pembulatan` sudah dihapus di migration `…922` (pembulatan dicabut,
`CLAUDE.md` §2.10) dan tidak dihidupkan kembali.

---

## 5. Rekonsiliasi ke laporan Juli klien

Pemetaan baris-per-baris ada di lembar **`Peta Laporan Juli`** (75 baris). Rekonsiliasinya
dijalankan sebagai pemeriksaan otomatis saat berkas dibangun — **18 titik, semuanya cocok:**

```
Aset Lancar                 2.659.020.673,07     Liabilitas Jangka Pendek      164.479.739
Aset Tetap Usaha              221.820.195        Liabilitas Jangka Panjang     607.000.000
Aset Non-Usaha              1.356.977.238        Liabilitas Non-Usaha        1.425.979.498
                            ───────────────      Ekuitas                     2.040.358.869
TOTAL ASET                  4.237.818.106,07                                ───────────────
                                                 TOTAL                       4.237.818.106,07
```

Laba Rugi Juli:

| | Versi A | Versi B |
|---|---|---|
| Laba Bruto | 100.465.082 | 100.465.082 |
| Laba Usaha | 48.747.765 | 20.197.561 |
| Laba Bersih | 36.401.537 | **7.851.333** ← sama persis dengan laporan klien |
| (−) Prive | (28.550.204) | — |
| **Tambahan kekayaan bersih** | **7.851.333** | **7.851.333** |

Margin kotor 2,05% atas penjualan Rp 4,9 miliar — tipis untuk grosir FMCG. Dengan perpetual,
pemilik akhirnya bisa melihat **produk dan pelanggan mana** yang menariknya ke bawah, dan kontrol
"jual di bawah harga pokok" (`CLAUDE.md` §2.17) baru punya arti setelah harga pokok diketahui per
baris.

Angka Jan–Juni (Rp 273.272.121) **tidak disajikan ulang** — rinciannya tidak kami miliki. Hanya
Juli yang dihitung ulang. Ini dicatat eksplisit di berkas klien.

---

## 6. Bentuk laporan yang dihasilkan

### Laba Rugi

```
  Penjualan Barang Dagang                     04.110.00001
  (−) Retur Penjualan                         04.110.00002
  (−) Diskon Penjualan                        04.110.00003
  ────────────────────────────────────────────────────────
  Penjualan Bersih
  (−) Harga Pokok Penjualan                   05.110
  ────────────────────────────────────────────────────────
  LABA BRUTO
  (−) Beban Penjualan dan Distribusi          06.110
  (−) Beban Umum dan Administrasi             06.120
  (−) Beban Pribadi Pemilik                   06.130   ← Versi B saja
  ────────────────────────────────────────────────────────
  LABA USAHA                     ← angka ini belum pernah ada di laporan klien
  (+) Pendapatan Lain-lain                    07.110
  (−) Beban Lain-lain                         07.210
  ────────────────────────────────────────────────────────
  LABA BERSIH
```

### Neraca

```
  ASET LANCAR              01.110 – 01.150   │  LIABILITAS JANGKA PENDEK    02.110
  ASET TETAP USAHA         01.210            │  LIABILITAS JANGKA PANJANG   02.210
  (−) Akumulasi Penyusutan 01.220            │  LIABILITAS NON-USAHA        02.310
  ASET NON-USAHA           01.310            │  EKUITAS                     03
                                             │    Modal Pemilik
                                             │    (−) Prive
                                             │    Laba Ditahan
                                             │    Laba Tahun Berjalan
```

Pemisahan lancar/tetap/non-usaha datang dari kolom `account_subtype`, bukan dari menebak awalan
kode.

---

## 7. Perubahan skema `chart_of_accounts`

Lima kolom baru. Tiga menegakkan struktur, satu memperbaiki cacat yang sudah ada, satu untuk
Hari 17.

| Kolom | Tipe | Alasan |
|---|---|---|
| `normal_balance` | `ENUM('DEBIT','CREDIT')` NOT NULL | Akun kontra (Retur Penjualan, Diskon Penjualan, Akum. Penyusutan, Prive) bersaldo normal **berlawanan** dengan tipenya. Tanpa kolom ini neraca dan L/R tidak bisa disusun dari data |
| `account_subtype` | `ENUM(...)` NOT NULL | Seksi laporan — **inilah yang memisahkan aset lancar, aset tetap, dan aset non-usaha secara konkret**. Menurunkannya dari awalan kode itu rapuh; kolom eksplisit tidak |
| `is_postable` | `BOOLEAN` NOT NULL DEFAULT true | Header tidak boleh dijurnal |
| `is_opening_balance_equity_account` | `BOOLEAN` NOT NULL DEFAULT false | Lihat §7.2 |
| `requires_outflow_approval` | `BOOLEAN` NOT NULL DEFAULT false | Dijadwalkan Hari 17 (`CLAUDE.md` §5); tabelnya belum punya kolomnya |

Nilai `account_subtype`: `CURRENT_ASSET` · `FIXED_ASSET` · `ACCUMULATED_DEPRECIATION` ·
`NON_OPERATING_ASSET` · `CURRENT_LIABILITY` · `LONG_TERM_LIABILITY` · `NON_OPERATING_LIABILITY` ·
`EQUITY` · `CONTRA_EQUITY` · `REVENUE` · `CONTRA_REVENUE` · `COGS` · `SELLING_EXPENSE` ·
`ADMIN_EXPENSE` · `OWNER_EXPENSE` · `OTHER_INCOME` · `OTHER_EXPENSE`.

### 7.1 Validasi arah saldo — supaya cacat Affari tidak terulang

CRUD COA (Hari 18) **menolak** kombinasi `account_subtype` × `normal_balance` yang mustahil:

| Sub-tipe | Saldo normal wajib |
|---|---|
| `ACCUMULATED_DEPRECIATION` | `CREDIT` |
| `CONTRA_REVENUE` | `DEBIT` |
| `CONTRA_EQUITY` | `DEBIT` |
| `CURRENT_ASSET` · `FIXED_ASSET` · `NON_OPERATING_ASSET` | `DEBIT` |
| `CURRENT_LIABILITY` · `LONG_TERM_LIABILITY` · `NON_OPERATING_LIABILITY` · `EQUITY` | `CREDIT` |
| `REVENUE` · `OTHER_INCOME` | `CREDIT` |
| `COGS` · `SELLING_EXPENSE` · `ADMIN_EXPENSE` · `OWNER_EXPENSE` · `OTHER_EXPENSE` | `DEBIT` |

Di Affari, 8 dari 13 akun Akumulasi Penyusutan tercatat `Debet` dan tidak ada yang menghadangnya.
Validasi ini yang mencegahnya terjadi lagi — termasuk saat MASTER membuat akun sendiri.

### 7.2 🔴 Bug yang harus diperbaiki bersamaan

`backend/src/modules/opening-balance/opening-balance.service.ts:180-185` mencari akun penyeimbang
jurnal pembuka dengan:

```ts
resolveSingleActive("account_type = 'EQUITY'", 'Modal (EQUITY)', manager)
```

`AccountResolverService.resolveSingleActive()` melempar `BadRequestException` kalau hasilnya
**bukan tepat satu** baris. Bagan ini punya lima akun EQUITY aktif. Tanpa perbaikan, seluruh alur
Saldo Awal gagal — dan gagalnya baru terlihat **Hari 36 (29 Agustus)**, tiga hari sebelum
cut-over, di alur yang `CLAUDE.md` §8 tandai tidak-boleh-dipotong.

Perbaikan mengikuti pola yang sudah dipakai empat kali di repo: flag
`is_opening_balance_equity_account` pada `03.110.00001`, lalu ubah baris 182.

Flag lain **tidak** terpengaruh — sudah diverifikasi: `is_inventory_account`, `is_payable_account`,
`is_input_vat_account`, `is_purchase_return_diff_account` masing-masing tetap dimiliki **tepat
satu** akun aktif. `is_receivable_account` boleh lebih dari satu (dipakai
`customers.service.ts:130` untuk validasi pilihan, bukan resolve tunggal) — jadi hanya
`01.120.00001` yang diberi flag, supaya Piutang Karyawan dan Piutang Pihak Berelasi tidak muncul
di dropdown `ar_account_id` pelanggan.

### 7.3 Penyimpangan dari `CLAUDE.md` yang disengaja

Dua, keduanya perlu `CLAUDE.md` diperbarui di commit yang sama supaya aturan dan kode tidak berbeda
isi:

1. **`JournalPoster` menolak jurnal ke akun header** — menambah validasi **keenam** ke lima yang
   terkunci di §2.6. Sifatnya memperketat, dan sudah disetujui lewat keputusan #1.
2. **Akun kas & bank di-seed**, padahal §3 menyatakan tidak. Aturan itu ditulis saat struktur kas
   belum diketahui; sekarang klien sudah menjawabnya lengkap (§4 putaran 1), Hari 17 butuh Kas
   Kecil dan Kas Besar ada sejak hari pertama, dan `requires_outflow_approval` pada Kas Besar
   adalah inti kontrolnya.

---

## 8. Yang masih menunggu klien

16 pertanyaan di `docs/PERTANYAAN_KLIEN_COA.md`, dan lembar `Pertanyaan` di berkas Excel dengan
kolom jawaban. Dua sudah terjawab (K-1 status PKP, K-2 rumah & pinjaman BSI).

Yang menahan pekerjaan, berurut:

| # | Pertanyaan | Menahan |
|---|---|---|
| **K-14** | Persediaan Rp 1,84 M dari opname fisik atau angka buku? | Keandalan saldo awal — pos terbesar di neraca |
| **K-10** | Gaji "Edy" Rp 18 jt/bulan — karyawan atau pemilik? | Beban vs Prive |
| **K-3** | Kartu kredit Rp 21,3 jt/bulan — usaha atau pribadi? | Akun `02.110.00012`, dan isi Versi A/B |
| **K-8** | Rekening atas nama pribadi — mana yang rekening usaha? | Akun kas yang di-seed |
| **K-6** | Dadam, Lichin, Atek — pelanggan atau pihak berelasi? | Sub-ledger vs akun tersendiri |
| **K-7** | Uang muka Ferry Rp 216 jt — perlu alokasi ke faktur? | Modul Pembayaran (Hari 26–27) |

Sisanya bisa menyusul 2–3 hari tanpa menghentikan koding.

**Dua pertanyaan baru** yang muncul saat menyusun berkas Excel:

- **K-15** — di laporan Juli, di sebelah Piutang Tiga Sekawan Cibeber ada angka Rp 12.478.500 yang
  **tidak ikut dijumlahkan** ke total. Piutang yang belum ditagih, atau catatan lain?
- **K-16** — IPL apartemen dibayar tiap bulan, tapi **apartemennya tidak pernah tercatat sebagai
  aset**. Milik siapa, dan perlu masuk `01.310.00002` atau tidak?
