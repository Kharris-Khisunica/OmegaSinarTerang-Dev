# Rencana Penyelesaian Revisi Hasil Testing dengan Klien

> Sumber: `revisi_hasil_testing_dengan_klien.md` (sesi testing bersama user + product owner).
> Disusun 08 September 2026. **Belum ada baris kode yang ditulis** — dokumen ini rencana, bukan laporan.
> Aturan main tetap `CLAUDE.md` v3; setiap tempat di mana revisi klien **bertabrakan** dengan
> aturan terkunci di §2/§3/§4 ditandai ⚠️ (CLAUDE.md §9.2).
>
> **Revisi 08 Sep, putaran 2.** Tujuh keputusan sudah diambil user (§2A) — R6, R7, dan R8
> tidak lagi diblokir. Empat sisanya berjalan sebagai asumsi kerja (§2B), tidak memblokir.

---

## 0. Ringkasan Eksekutif

24 poin revisi. Hasil telusur kode:

| Kategori | Jumlah | Keterangan |
|---|---|---|
| Sudah ada di backend, tinggal dipasang di frontend | 5 | endpoint/mesinnya sudah jadi, FE-nya masih placeholder |
| Murni frontend (tampilan/ergonomi) | 8 | tidak menyentuh skema atau jurnal |
| Butuh migration + perubahan jurnal/rumus | 4 | ⚠️ mengubah aturan terkunci CLAUDE.md |
| Fitur baru yang belum pernah dibangun | 5 | |
| Perlu direproduksi dulu (belum jelas akar masalahnya) | 2 | |

**Estimasi total: 10–12 hari kerja** (turun dari 11–13 setelah keputusan §2A menyederhanakan
R6 dan R7). Ini **di luar** Hari 32A yang menurut `PROGRESS.md` belum dikerjakan (Pindah Buku
Kas `PB`, Kasbon, master Pekerja, kolom kendaraan BBM, Laporan Biaya Operasional).

**Scope dipertahankan penuh, jadwal yang mengalah** — keputusan user 08 Sep: tidak ada tenggat
keras untuk putaran revisi ini. Karena itu tidak ada satu pun poin revisi yang dipotong atau
diturunkan mutunya. Yang tetap perlu dibawa ke klien adalah **fakta bahwa scope bertambah
10–12 hari** setelah cut-over, supaya ekspektasi kapan sistem "selesai" tidak berdiri di
angka lama (CLAUDE.md §9.7).

**Tidak ada lagi keputusan yang memblokir.** R6/R7/R8 sudah punya bentuk pasti (§2A);
empat asumsi kerja di §2B boleh dikonfirmasi sambil jalan tanpa menghentikan pekerjaan.

---

## 1. Hasil Verifikasi per Poin

Kolom "Status kode" = apa yang benar-benar ada di repo sekarang, bukan dugaan.

### General

| # | Permintaan | Status kode | Paket |
|---|---|---|---|
| G1 | Sidebar jadi dropdown, sub-menu bisa di-minimize | `app/config/navigation.ts` masih **datar** — seksi hanya berupa label teks (`type: 'label'`), bukan `children`. `UNavigationMenu` (Nuxt UI 4.10) mendukung item bersarang + collapsible | **R1** |

### Master Data

| # | Permintaan | Status kode | Paket |
|---|---|---|---|
| M1 | Auto-capitalize semua input master data | Tidak ada normalisasi sama sekali, BE maupun FE | **R1** ⚠️ asumsi A2 |
| M2 | Kode dibangkitkan otomatis; opsi input manual tetap ada | Backend **sudah** membangkitkan otomatis kalau `code` tidak dikirim (`generateSequenceCode`, `ProductsService.generateCode`). Yang salah cuma FE: field Kode tampil sebagai input kosong biasa dengan tombol "Bangkitkan" — operator mengira wajib diisi | **R1** (kecil) |
| P1 | Urutan nama produk → Merk · Kemasan · Keterangan · Isi · Satuan | `buildDisplayName()` (`products.service.ts:298`) sekarang urut Merek · Keterangan · Kemasan · Ukuran+UoM. FE **sudah** memisah `ukuran` dan `ukuranUomPart` — jadi ini murni reorder + backfill | **R2** ⚠️ asumsi A5 |

### Transaksi (umum)

| # | Permintaan | Status kode | Paket |
|---|---|---|---|
| T1 | Pemisah ribuan muncul **saat mengetik** | Semua input angka pakai `<UInputNumber>` (32 pemakaian di 12 file) yang baru memformat saat blur. Inilah penyebab salah-ketik satu nol saat testing | **R1** |

### Order Penjualan

| # | Permintaan | Status kode | Paket |
|---|---|---|---|
| SO1 | Default satuan terbesar (DUS), bukan terkecil | **Sudah benar** di SO (`onLineProductChange` mencari unit bernama `dus`). Perlu diverifikasi ulang bersama klien — kemungkinan yang dilihat tester adalah tampilan **sisa stok** (SO2), bukan field satuan | R3 (verifikasi) |
| SO2 | Sisa stok tidak muncul | Terkonfirmasi bug: `penjualan/order/index.vue:747` mengoper `:qty-base-unit="null"` **hardcoded**. Endpoint `GET /products/:id/stock-balance` sudah ada dan sudah dipakai Faktur Penjualan | **R3** |
| SO3 | Alert kalau qty > sisa stok | Belum ada | **R3** |
| SO4 | "Jadikan Faktur" belum dikerjakan | Tombolnya ada tapi `disabled` dengan tooltip "Menyusul Hari 21". Backend sudah lengkap: `SalesOrdersService.markConverted()` + `assertChannelSalesOrderRequirement()` sudah dipanggil `SalesInvoicesService` | **R4** |

### Faktur Penjualan

| # | Permintaan | Status kode | Paket |
|---|---|---|---|
| FP1 | Qty stok jangan desimal, cukup satuan terbesar | `stockPanelRows` membagi qty base dengan faktor → menghasilkan pecahan (mis. 12,5 dus) | **R3** asumsi A4 |
| FP2 | Saat saluran = Pengiriman, SO tidak bisa dipilih | Dropdown SO `:disabled="!customerId"`, dan `catch { options = [] }` **menelan error diam-diam**. Perlu direproduksi untuk memastikan akar masalahnya (belum pilih pelanggan / tidak ada SO `OPEN` / request gagal) | **R4** |
| FP3 | Tidak ada diskon penjualan — drop | Diskon baris + diskon faktur ada di DTO, entity, service, jurnal (metode bruto, akun `04.110.00003 Diskon Penjualan`), cetak, dan retur | **R5** keputusan A1 |
| FP4 | Hapus lock harga & diskon (Ctrl+H / Ctrl+D) | `hargaLocked`/`diskonLocked` di `penjualan/faktur/index.vue`. Catatan: CLAUDE.md §3 menyebut pola ini "dipertahankan dari sistem lama" — klien sekarang mencabutnya | **R5** |
| FP5 | Jangan cetak PPN keluaran kalau nol | Nota faktur penjualan (`[id]/cetak.vue`) **tidak** mencetak PPN sama sekali. Yang mencetak PPN nol adalah **nota retur penjualan** (`penjualan/retur/[id]/cetak.vue:322`). Perlu dikonfirmasi lembar mana yang dimaksud; usul: sembunyikan baris PPN di **semua** dokumen cetak saat nilainya 0 | **R5** |
| FP6 | Operator boleh ubah **seluruh** faktur setelah disetujui | `UpdateSalesInvoiceDto` sengaja sempit: hanya `salesmanId` + `termDays`. Mesin persetujuan + `revision_number` **sudah ada** (`PrintLockService`, `ActionType.UNLOCK_PRINT` + `intent: EDIT`) | **R6** ⚠️ keputusan K1–K4 — paket terbesar |

### Surat Jalan

| # | Permintaan | Status kode | Paket |
|---|---|---|---|
| SJ1 | Sepertinya belum terimplementasi | **Sudah ada seluruhnya** (modul `delivery-orders`, 3 halaman FE, cetak A5, kunci cetak). Masalahnya **discoverability**: halaman daftar sengaja tanpa tombol "Entri" — surat jalan hanya lahir dari tombol "Buat Surat Jalan" di detail faktur `PENGIRIMAN`, dan tombol itu hanya muncul kalau `canCreateDeliveryOrder`. Tester tidak menemukan jalannya | **R4** (bareng alur SO→Faktur→SJ) |

### Mutasi Gudang

| # | Permintaan | Status kode | Paket |
|---|---|---|---|
| MG1 | Barang titipan per **faktur**, bukan per produk | `assertTitipanQtyWithinPurchased()` menjumlah `sales_invoice_lines` **per produk** lintas semua faktur. Tidak ada kolom `sales_invoice_id` di `warehouse_mutations` | **R8** keputusan K7 |

### Faktur Pembelian

| # | Permintaan | Status kode | Paket |
|---|---|---|---|
| FB1 | Drop nomor faktur supplier | Kolom `supplier_invoice_no VARCHAR(100) **NOT NULL**`, wajib di DTO + FE. CLAUDE.md §3 menyatakan ini wajib untuk rekonsiliasi — klien mencabutnya | **R7** asumsi A3 |
| FB2 | Diskon faktur rupiah saja **dan tidak masuk harga pokok**; masuk pendapatan lain | Sekarang persis kebalikannya: rumus §4 langkah 5–6 mengalokasikan diskon faktur pro-rata ke tiap baris lalu melarutkannya ke `lot.unit_cost`. Itu sumber harga pokok tidak bulat yang dilihat tester | **R7** ⚠️ keputusan K5+K6 — mengubah §3 & §4 CLAUDE.md |
| FB3 | Sisa stok tidak muncul | Bug yang sama dengan SO2: `pembelian/faktur/index.vue:929` `:qty-base-unit="null"` hardcoded | **R3** |
| FB4 | Preview Kalkulasi Baris: font lebih besar, satu komponen per baris | Sekarang `<InfoStrip>` merender semuanya dalam **satu baris** dipisah `\|` dengan `text-sm` | **R7** (kecil) |
| FB5 | Operator boleh ubah seluruh faktur pembelian setelah disetujui | Sama seperti FP6 — `UpdatePurchaseInvoiceDto` juga sempit | **R6** |

### Kas & Bank

| # | Permintaan | Status kode | Paket |
|---|---|---|---|
| KB1 | Penerimaan/pengeluaran kas multi-baris per faktur | **Backend sudah mampu**: `ConfirmPaymentDto.lines[]` hanya berisi `invoiceId` + `amount`, tanpa `partyId` — satu batch boleh lintas pihak. Yang membatasi adalah **frontend**: `PaymentAllocationForm` punya satu `partyId` global lalu memuat faktur terbuka pihak itu saja | **R9** |
| KB2 | Biaya operasional multi-baris, tanggal sebagai data global | `POST /operational-expenses` menerima **satu baris per panggilan**. FE mengirim satu-satu | **R10** |

### Laporan

| # | Permintaan | Status kode | Paket |
|---|---|---|---|
| L1 | Stok opname hanya supervisor/master | `laporan/stok-opname.vue` → `definePageMeta({ title })` **tanpa `roles`**; `GET /reports/stock-opname` **tanpa `@Roles`**. Saat ini operator bisa membukanya | **R11** |
| L2 | Laporan penjualan dirinci per salesman memegang faktur apa | `groupBy=SALESMAN` sudah ada tapi hanya **rekap** (satu baris per salesman). Belum ada rincian faktur per salesman | **R11** |

---

## 2A. Keputusan yang Sudah Diambil (08 Sep 2026)

Tujuh keputusan di bawah diambil **user**, belum dikonfirmasi ulang ke klien — pola yang sama
dengan Payment §2.12 dan Biaya Operasional §3: berlaku sekarang, wajib dibawa ke klien.
Ketujuhnya mengunci bentuk R6, R7, dan R8.

**K1 — Revisi di tempat (FP6/FB5).** Nomor dokumen **tetap**, `revision_number++`, jurnal & stok
lama dibalik lalu diposting ulang di dalam satu transaction. Bukan VOID + faktur baru.
Sejalan dengan §2.16 CLAUDE.md ("nota hasil revisi wajib mencantumkan nomor revisi").

**K2 — Jurnal revisi bertanggal dokumen asli.** Pembalik **dan** posting ulang memakai tanggal
faktur asli, bukan hari ini. Koreksi salah harga faktur kemarin tetap tercatat di hari kemarin,
sehingga rekap kas harian dan laporan penjualan tetap cocok dengan nota fisik.
⚠️ **Ini pengecualian tertulis terhadap §2.2 CLAUDE.md, khusus jalur revisi.** VOID tetap
bertanggal hari ini seperti sebelumnya — dua jalur, dua aturan tanggal, dan bedanya harus
ditulis eksplisit di §2.2 supaya tidak tertukar nanti.

**K3 — Jendela revisi mengikuti batas backdate 2 hari (§2.9).** Faktur berumur lebih dari 2 hari
**tidak bisa direvisi**. Konsekuensi langsung, dan ini perlu disampaikan ke klien karena
bertabrakan dengan alasan mereka meminta fitur ini ("kesalahan di lapangan 80–90% salah input
harga/pelanggan" — sebagian baru ketahuan setelah beberapa hari):

> **Jalan keluar untuk kesalahan yang ketahuan terlambat** tetap ada, cuma bukan lewat revisi:
> **VOID + faktur baru**. VOID tidak terkena batas 2 hari (jurnal pembaliknya bertanggal hari
> ini, §2.2), jadi faktur seminggu lalu tetap bisa dibatalkan dan diterbitkan ulang — bedanya
> nomor dokumen berubah dan pendapatannya berpindah ke hari ini. Alur ini **wajib dijelaskan
> ke operator saat pelatihan**, kalau tidak mereka akan mengira sistem buntu.

Nilai tambahnya: karena 2 hari selalu berada di dalam bulan berjalan, K2 tidak pernah bisa
mengubah angka bulan yang sudah ditutup — §2.15 aman tanpa pemeriksaan tambahan.

**K4 — Revisi faktur yang belum dicetak tidak butuh persetujuan.** Gerbangnya tetap kunci cetak
yang sudah ada: `NOT_PRINTED` → operator bebas merevisi; `PRINTED` → wajib `UNLOCK_PRINT`
dengan `intent: EDIT` lebih dulu. **Tidak perlu `ActionType` baru dan tidak perlu payload
matcher baru** — mesin persetujuannya sudah lengkap sejak Hari 15. Ini yang memangkas R6 dari
2–3 hari jadi ±2 hari.

**K5 — Diskon pembelian: baris DI-DROP, hanya diskon faktur (rupiah) yang tersisa.**
Ini keputusan yang paling banyak menghapus kode. Akibatnya:
- `harga_pokok = qty × harga`, **bulat persis**. Tidak ada alokasi pro-rata, tidak ada
  "sisa pembulatan dibebankan ke baris terakhir". Masalah "harga produk jadi tidak bulat"
  yang dilihat tester hilang di akarnya, bukan ditambal.
- Seluruh rumus §4 CLAUDE.md untuk pembelian menyusut dari 9 langkah jadi 4.
- Diskon faktur tidak lagi menyentuh persediaan sama sekali — ia jadi baris jurnal tersendiri.

**K6 — Akun baru `07.110.00005 Diskon Pembelian`** di bawah `07.110 Pendapatan Lain-lain`
(`INCOME` / `OTHER_INCOME`, `is_postable = true`), sejajar dengan `07.110.00004 Selisih Retur
Pembelian` yang sudah ada.

**K7 — Satu dokumen mutasi titipan merujuk tepat satu faktur penjualan.** Baris titipan dipilih
dari baris faktur itu, dan validasi kumulatif jadi per baris faktur, bukan per produk lintas faktur.

### Rumus & jurnal pembelian setelah K5+K6

Menggantikan §4 CLAUDE.md bagian "Faktur Pembelian":

```
1. baris[i]       = qty × harga                        ← tidak ada diskon baris
2. subtotal       = Σ baris[i]
3. ppn_masukan[i] = (supplier.is_pkp && product.is_bkp) ? baris[i] × tax_rate : 0
4. harga_pokok[i] = baris[i] + (company_is_pkp ? 0 : ppn_masukan[i])
5. lot.unit_cost  = harga_pokok[i] ÷ qty dalam satuan dasar     ← eksak, tidak ada residu
6. diskon_faktur  = angka rupiah di akhir faktur       ← TIDAK menyentuh harga pokok
7. total_bayar    = subtotal + Σ ppn_masukan − diskon_faktur
```

```
company_is_pkp = false (sekarang):
  Persediaan          (D) Σ harga_pokok
      Hutang Usaha        (K) total_bayar
      Diskon Pembelian    (K) diskon_faktur          ← 07.110.00005, pendapatan lain
```

Baris bonus (`is_bonus = true`) tetap seperti sebelumnya: `baris = 0`, PPN 0, `lot.unit_cost = 0`,
qty tetap masuk stok penuh (§3 CLAUDE.md "Bonus dari supplier" tidak berubah).

**Konsekuensi akuntansi yang disengaja, catat supaya tidak dikira bug nanti:** persediaan kini
dicatat sebesar harga sebelum diskon faktur, dan diskonnya diakui sebagai pendapatan saat
pembelian. Nilai persediaan di neraca karena itu **lebih tinggi** daripada uang yang benar-benar
dibayar ke supplier, dan margin penjualan berikutnya tampak lebih tipis. Ini pilihan klien
(dan yang membuat harga pokok bulat); jangan "diperbaiki" tanpa perintah — pola sama dengan
catatan lot bonus di §3 CLAUDE.md.

---

## 2B. Asumsi Kerja — Konfirmasi Sambil Jalan, Tidak Memblokir

Empat hal berikut belum dijawab tapi **tidak menghentikan pekerjaan**: semuanya murni tampilan
atau perubahan yang murah dibalik. Dikerjakan dengan asumsi di bawah; bawa ke klien di putaran
konfirmasi yang sama dengan K1–K7.

**A1 — Cara "drop" diskon penjualan (FP3).** Kolom `discount_percent`/`discount_amount` di
`sales_invoices`/`sales_invoice_lines` **dipertahankan** (dipaksa 0, ditolak DTO kalau ≠ 0),
hanya dihilangkan dari UI dan nota. Akun `04.110.00003 Diskon Penjualan` **dinonaktifkan**,
bukan dihapus. Alasan: faktur lama yang sudah terlanjur punya diskon tetap bisa dibaca,
diretur, dan dicetak ulang. Kalau klien minta kolomnya benar-benar hilang, itu migration
tambahan yang bisa menyusul kapan saja.

**A2 — Bentuk auto-capitalize (M1).** Asumsi: **HURUF BESAR SEMUA**, mengikuti kebiasaan sistem
lama, berlaku pada field **nama & alamat** (bukan keterangan bebas dan bukan email). Data master
yang sudah diinput **di-backfill** di migration yang sama supaya data lama dan baru tidak
berbeda bentuk.

**A3 — Nomor faktur supplier (FB1).** Asumsi: dijadikan **opsional** (`DROP NOT NULL`), bukan
dihapus dari skema. Supplier yang memang menerbitkan nota tetap bisa dicatat, dan itu
satu-satunya pegangan rekonsiliasi yang tersisa. Kolomnya hilang dari grid daftar, tinggal di
form sebagai field opsional.

**A4 — Tampilan sisa stok tanpa desimal (FP1).** Asumsi: **dibulatkan ke bawah, satuan terbesar
saja** — 12,5 dus tampil `12 dus`. Diberi tanda visual (mis. `12 dus +`) supaya operator tidak
menyangka sisanya pas 12 dan mengambil kesimpulan salah saat stok mepet.

**A5 — Arti "Isi" pada penamaan produk (P1).** Asumsi: "Isi" = kolom **Ukuran** yang sudah ada
(mis. `37`), bukan angka konversi satuan (isi per dus). Ini yang membuat urutan Merk · Kemasan ·
Keterangan · Isi · Satuan menghasilkan `Bendera Sachet Putih 37 gr`. **Kalau ternyata yang
dimaksud angka konversi, R2 berubah dari reorder jadi perubahan skema** — konfirmasi poin ini
lebih awal daripada tiga lainnya.

---

## 3. Paket Kerja

Diurutkan supaya fondasi bersama selesai sebelum yang memakainya. `R#` = paket revisi;
masukkan ke `PROGRESS.md` sebagai hari lanjutan setelah Hari 32A.

### R0 — Rapikan baseline (0,5 hari)
1. **Commit 217 file yang belum pernah di-commit** sejak `ed8dacb`. Selama ini belum dilakukan,
   dan tanpa baseline bersih tidak ada cara memisahkan "kerusakan akibat revisi" dari "yang memang sudah begitu".
2. Perbaiki `scripts/verify.sh:149` — tambahkan `NODE_OPTIONS=--max-old-space-size=4096` pada build FE (OOM kalau dijalankan apa adanya).
3. Bawa **K1–K7 + A1–A5** ke klien dalam satu putaran konfirmasi. K1–K7 sudah diputuskan user
   dan pekerjaannya jalan terus — konfirmasi ini untuk merekam persetujuan klien, pola sama
   Payment §2.12 dan Biaya Operasional §3. Yang paling perlu jawaban cepat: **A5** (bisa
   mengubah R2 dari reorder jadi perubahan skema) dan **K3** (batas 2 hari yang mungkin
   terasa sempit di lapangan).
4. Catat K1–K7 di `PROGRESS.md` §1 sebagai baris "menunggu konfirmasi klien", supaya tidak
   hilang seperti keputusan Payment yang sampai sekarang belum dikonfirmasi ulang.

### R1 — Fondasi UI bersama (1 hari) · dipakai hampir semua paket lain
- **T1** Komponen `<MoneyInput>` (bungkus `UInput` + `useRupiah()`): format ribuan **saat mengetik**,
  caret dijaga, tempel/paste dinormalisasi. Ganti 32 pemakaian `UInputNumber` di 12 file.
  Qty pakai varian `<QtyInput>` (`useQty()`, sampai 4 desimal, §2.14). **Ini perbaikan paling berdampak
  di daftar** — kesalahan satu-nol adalah kesalahan uang, bukan ergonomi.
- **M1** Transform auto-capitalize di satu tempat: `CrudFormPage` (saat blur) + normalisasi di service BE
  supaya jalur API juga bersih. *(bentuknya: asumsi A2)*
- **M2** Field Kode di semua master: default **read-only** bertuliskan "(otomatis saat disimpan)",
  dengan sakelar "Isi kode manual" yang membukanya. Tidak ada perubahan backend.
- **G1** `navigation.ts` diubah jadi bersarang (`children`), `UNavigationMenu` collapsible,
  default semua sub-menu terbuka, status buka/tutup disimpan per pengguna (localStorage).

### R2 — Penamaan produk (0,5 hari)
- **P1** `buildDisplayName()` → Merek · Kemasan · Keterangan · Ukuran · UoM.
- Migration backfill `display_name` untuk produk yang sudah ada (kolom ini terindeks dan dipakai
  pencarian operator — kalau tidak di-backfill, produk lama dan baru berbeda format).
- Urutan field di form produk dan urutan kolom grid mengikuti urutan yang sama.
- Uji: `products.service.spec.ts` memuat tes `buildDisplayName` yang harus diperbarui.

### R3 — Sisa stok di seluruh layar entri (1 hari)
- **SO2 / FB3** Pasang `GET /products/:id/stock-balance` ke Sales Order dan Faktur Pembelian
  (pola sudah ada persis di `penjualan/faktur/index.vue:366-383` — angkat jadi composable
  `useStockBalance()` supaya tidak ada tiga salinan, CLAUDE.md §6).
- **FP1** Tampilan sisa stok jadi satuan terbesar bulat *(asumsi A4: dibulatkan ke bawah, satuan terbesar saja)*.
- **SO3** Peringatan qty > sisa stok. **Peringatan, bukan penolakan** — §2.8 CLAUDE.md
  mengizinkan stok minus dan backend mengembalikan `stockWarning`; jangan diubah jadi blokir.
- **SO1** Verifikasi default satuan terbesar di ketiga layar entri.

### R4 — Alur SO → Faktur → Surat Jalan (1 hari)
- **SO4** Aktifkan "Jadikan Faktur": buka entri Faktur Penjualan yang sudah terisi dari SO
  (pelanggan, saluran `PENGIRIMAN`, salesman, seluruh baris). Backend tidak berubah —
  `markConverted()` sudah dipanggil `SalesInvoicesService` saat `salesOrderId` dikirim.
- **FP2** Reproduksi dulu, baru perbaiki. Dua perbaikan yang sudah pasti perlu, apa pun hasilnya:
  (a) jangan telan error dropdown SO diam-diam — tampilkan pesannya;
  (b) izinkan pilih SO **lebih dulu** lalu pelanggan terisi otomatis, bukan sebaliknya.
- **SJ1** Buat surat jalan bisa ditemukan: tombol "Buat Surat Jalan" di **daftar** faktur
  `PENGIRIMAN` yang belum punya SJ, plus penjelasan di halaman daftar Surat Jalan.
  Tidak ada modul baru — hanya jalan masuk.

### R5 — Faktur Penjualan: diskon, kunci, cetak (1 hari)
- **FP3** Hilangkan diskon baris & diskon faktur dari UI penjualan; DTO menolak nilai ≠ 0 *(cara: A1 — kolom dipertahankan, dipaksa 0)*.
  Ikut terpengaruh: `salesInvoiceCalc.ts`, `TotalsBar`, kolom Disc%/DiscRp di nota, layar retur penjualan.
- **FP4** Hapus `hargaLocked`/`diskonLocked` dan hotkey Ctrl+H/Ctrl+D. ⚠️ mencabut satu kalimat §3 CLAUDE.md.
- **FP5** Sembunyikan baris PPN saat nol di **semua** template cetak (faktur, retur penjualan, retur pembelian, kwitansi).

### R6 — Revisi di tempat faktur penjualan & pembelian (±2 hari) · bentuk terkunci K1–K4
Paket paling berisiko: menyentuh jurnal, FIFO, dan stok pada dokumen yang sudah diposting.
Turun dari perkiraan 2–3 hari karena K4 membuat mesin persetujuan **tidak perlu disentuh**.

- Mesin baru `DocumentReviseService` di `src/core/` (menerima `EntityManager`, §6).
  Dalam **satu** transaction, urut:
  1. Kunci dokumen (`SELECT ... FOR UPDATE`), tolak kalau `postingStatus = VOIDED`.
  2. `PeriodLockValidator` atas **tanggal dokumen asli** — inilah yang menegakkan jendela
     2 hari (K3). Tidak ada pemeriksaan tanggal baru yang ditulis sendiri di modul.
  3. Balik jurnal lama + gerakan stok lama, **bertanggal dokumen asli** (K2).
     Pengembalian lot FIFO harus mengembalikan `qty_remaining` ke lot yang benar-benar
     terpakai, bukan ke lot tertua saat ini.
  4. Tulis ulang baris, posting ulang lewat `JournalPoster` / `StockRecorder` yang sama —
     bukan jalur khusus (§3 CLAUDE.md "Saldo Awal", prinsip yang sama).
  5. `revision_number++`, nomor dokumen tetap.
- **Gerbang otorisasi: pakai yang sudah ada, jangan bikin baru** (K4).
  `NOT_PRINTED` → langsung boleh. `PRINTED` → `PrintLockService.preflight/consume` dengan
  `ActionType.UNLOCK_PRINT` + `intent: EDIT`, yang memang **sudah** menaikkan
  `revision_number` hanya untuk `intent = EDIT` (`print-lock.service.ts:184`).
  Tidak ada `ActionType` baru, tidak ada payload matcher baru.
- `UpdateSalesInvoiceDto` / `UpdatePurchaseInvoiceDto` diperluas dari header sempit
  (`salesmanId`, `termDays`) ke **baris + header penuh**, termasuk `customerId`/`supplierId`
  — 80–90% kesalahan lapangan adalah salah harga atau salah pelanggan.
  Ganti akun piutang saat `customerId` berubah **wajib lewat fungsi bersama**
  `ArAccountResolver` (§3 CLAUDE.md "lima tempat menyentuh akun piutang" → jadi enam).
- **Batas jual di bawah harga pokok (§2.17) wajib dievaluasi ulang** pada harga hasil revisi.
  Kalau tidak, revisi jadi pintu belakang untuk melewati kontrol itu: simpan dengan harga
  aman, lalu revisi ke harga rugi.
- Uji invarian setelah revisi: `SUM(debit) = SUM(credit)`, saldo stok = Σ movements,
  nilai persediaan = Σ lot, `qty_remaining` lot tidak pernah negatif.
  **Tambahkan sebagai kasus baru ke 5 invarian Hari 11**, bukan sebagai tes terpisah.
- FE: layar edit penuh (bukan modal dua field), badge "Revisi ke-N", dan pesan yang jelas
  saat faktur berumur > 2 hari — **sebutkan jalan keluarnya (VOID + faktur baru)**, jangan
  hanya menolak. Operator yang buntu akan mencari jalan pintas.

### R7 — Faktur Pembelian: diskon & nomor supplier (1 hari) · bentuk terkunci K5–K6
- **FB1** `supplier_invoice_no` → `DROP NOT NULL`, DTO opsional, FE tidak lagi mewajibkan,
  kolom keluar dari grid daftar (A3). Pencarian di `purchase-invoices.service.ts:430` yang
  memakai kolom ini harus tahan nilai NULL.
- **FB2** Terapkan rumus & jurnal baru di §2A. Yang **dihapus**, bukan diubah:
  alokasi pro-rata diskon faktur, aturan "sisa pembulatan ke baris terakhir", mode diskon
  persen di tingkat faktur, dan seluruh diskon baris (K5).
  Sentuh: migration akun `07.110.00005`, `purchase-invoices.service.ts`,
  `purchaseInvoiceCalc.ts`, `purchase-invoices.service.spec.ts`, layar entri + nota.
  Kolom diskon baris diperlakukan sama seperti A1 — dipertahankan, dipaksa 0.
- **Rumus baru berlaku maju.** Lot yang sudah terbentuk dengan rumus lama **tidak** dihitung
  ulang. Catat tanggal berlakunya di `PROGRESS.md` §3, karena dua faktur pembelian dengan
  angka yang sama tapi beda tanggal akan menghasilkan `unit_cost` berbeda — itu benar,
  tapi hanya kalau ada catatannya.
- **FB4** Preview Kalkulasi Baris: varian vertikal `<InfoStrip>` (`stacked`), font naik ke
  `text-base`, satu komponen per baris. Setelah K5 isinya menyusut jadi
  `Subtotal Baris` + `PPN Baris` — baris "Alokasi Diskon Faktur" **hilang**, karena
  konsepnya memang sudah tidak ada lagi.
- **Tulis ulang §3 dan §4 CLAUDE.md di commit yang sama.** Kalau tidak, aturan tertulis dan
  kode akan bertentangan, dan sesi berikutnya akan membaca yang salah.

### R8 — Mutasi Gudang: titipan per faktur (1 hari) · bentuk terkunci K7
- Migration: `warehouse_mutations.sales_invoice_id` (nullable di kolom, **wajib** di service
  untuk cabang `TITIPAN_PELANGGAN`, karena dua cabang lain tidak memakainya).
  Data titipan yang sudah ada — kalau ada — perlu keputusan backfill; periksa dulu isinya.
- FE: pilih faktur → baris titipan dipilih **dari baris faktur itu**, bukan dari master produk.
  Ini juga menghapus kelas kesalahan lama: menitipkan produk yang tidak ada di faktur mana pun.
- `assertTitipanQtyWithinPurchased()` diganti validasi per baris faktur:
  Σ titipan atas baris faktur ini ≤ qty baris faktur ini.
- Laporan Barang Titipan (`GET /reports/titipan`) dikelompokkan per pelanggan **per faktur**.
- Periksa juga worksheet Stok Opname yang memakai daftar titipan sebagai penjelas selisih fisik.

### R9 — Kas & Bank multi-baris (1,5 hari)
- `PaymentAllocationForm` diubah dari "satu pihak → daftar fakturnya" menjadi **grid baris**:
  tiap baris = pihak + faktur + nominal + tandai lunas, pola sama entri penjualan/pembelian
  (`LineModal` + `DataTable`). Tanggal dan metode pembayaran tetap global di header.
- Backend: `ConfirmPaymentDto` **tidak berubah** (sudah lintas pihak). Yang perlu:
  `GET /payments/open-invoices` boleh dipanggil tanpa `partyId` wajib, atau endpoint pencarian faktur terbuka.
- Perlu diperiksa: `resolvePartyName()` dan kolom `partyNames` di daftar batch harus menangani banyak pihak.

### R10 — Biaya Operasional multi-baris (0,5 hari)
- `POST /operational-expenses/batch`: tanggal + akun kas sebagai data **global**, N baris,
  seluruhnya dalam satu DB transaction (§2.3 CLAUDE.md).
- FE: modal entri jadi repeater baris, bukan satu baris per simpan.
- Backdate 7 hari khusus modul ini tetap berlaku (§3 CLAUDE.md).

### R11 — Laporan (0,5 hari)
- **L1** `GET /reports/stock-opname` → `@Roles(MASTER, SUPERVISOR)`;
  `laporan/stok-opname.vue` → `definePageMeta({ roles: ['MASTER','SUPERVISOR'] })`;
  sembunyikan kartunya dari `laporan/index.vue` untuk operator.
  Catat di audit Permission Matrix (Hari 35).
- **L2** Laporan Penjualan: filter `salesmanId` + mode Detail menampilkan kolom Salesman,
  sehingga terlihat salesman mana memegang faktur apa.

### R12 — Regresi & penutupan (0,5 hari)
- `./scripts/verify.sh` hijau; 5 invarian hijau; migration `up`→`down`→`up` di DB kosong.
- Uji manual: 1 happy path + 1 error path per layar yang disentuh.
- **Perbarui `CLAUDE.md`** untuk setiap aturan yang dicabut klien: §3 (nomor faktur supplier,
  Ctrl+H/Ctrl+D, penamaan produk), §4 (rumus pembelian langkah 5–6, jurnal diskon penjualan),
  §2.16/§2.17 kalau R6 mengubah gerbang edit.
- Perbarui `PROGRESS.md` §0/§3/§4 dan commit per paket dengan pesan `Revisi R#: <ringkasan>`.

---

## 4. Urutan Eksekusi & Ketergantungan

```
R0 (baseline)
 └─ R1 (fondasi UI)  ─┬─ R2 (nama produk)          ← konfirmasi A5 lebih awal
                      ├─ R3 (sisa stok)  ── R4 (SO → Faktur → SJ)
                      ├─ R5 (diskon penjualan, lock, cetak)
                      ├─ R9 (kas multi-baris)   ┐
                      ├─ R10 (biaya operasional)┘ ← gabung dengan Hari 32A, §6
                      └─ R11 (laporan)

jalur skema/jurnal (bentuk sudah terkunci K1–K7, boleh jalan kapan saja):
      R7 (diskon pembelian)  ← kerjakan LEBIH DULU dari R6
      R6 (revisi di tempat)  ← ±2 hari, paling berisiko
      R8 (titipan per faktur)

R12 (regresi + dokumentasi) menutup semuanya
```

**Satu urutan yang penting: R7 sebelum R6.** R6 memposting ulang faktur pembelian, jadi ia
harus sudah memakai rumus final K5. Kalau R6 dikerjakan duluan, mesin revisinya ditulis di
atas rumus alokasi pro-rata yang sebentar lagi dihapus — dan tes revisinya harus ditulis dua kali.

Sisanya bebas urutan. Karena scope dipertahankan penuh dan tidak ada tenggat keras, tidak ada
lagi jalur "kerjakan yang tidak diblokir dulu" — semuanya akan dikerjakan.

---

## 5. Risiko

| Risiko | Dampak | Penanganan |
|---|---|---|
| **Jendela revisi 2 hari (K3) lebih sempit dari kebutuhan lapangan** | Klien meminta fitur ini justru karena salah harga/pelanggan sering baru ketahuan belakangan. Kesalahan hari ke-3 tidak punya jalur revisi | **Risiko paling mungkin muncul lagi di testing berikutnya.** Jalan keluarnya sudah ada (VOID + faktur baru) tapi tidak otomatis terpikirkan operator — wajib masuk pesan error dan materi pelatihan. Kalau klien menolak batas ini setelah dicoba, longgarkan **hanya** angka di `PeriodLockValidator`, bukan strukturnya |
| **R6 menyentuh dokumen yang sudah diposting** | Salah balik jurnal/stok = angka salah tanpa error apa pun | Invarian di dalam transaction yang sama; pengembalian lot FIFO harus ke lot yang benar-benar terpakai; jangan pernah `UPDATE` langsung ke `product_stock_balance` (§2.5) |
| **Revisi jadi pintu belakang §2.17** | Simpan dengan harga aman, lalu revisi ke harga di bawah pokok tanpa otorisasi | Evaluasi ulang batas jual-rugi pada harga hasil revisi — sudah masuk daftar kerja R6 |
| **K2 (tanggal asli) berbeda dari §2.2 (hari ini)** | Dua jalur dengan dua aturan tanggal mudah tertukar oleh sesi berikutnya | Tulis pengecualian ini eksplisit di §2.2 CLAUDE.md, bukan hanya di dokumen ini. Batas 2 hari (K3) membuatnya tidak pernah menyentuh bulan tertutup |
| **K5/K6 menaikkan nilai persediaan** | Persediaan di neraca lebih tinggi dari uang yang dibayar; margin penjualan tampak lebih tipis | Konsekuensi yang disengaja, sudah dicatat di §2A. Rumus baru berlaku **maju**, lot lama tidak dihitung ulang — dokumentasikan tanggal berlakunya |
| **217 file belum di-commit** | Kerusakan tak bisa ditelusuri | R0 poin 1, sebelum apa pun |
| **Scope bertambah 10–12 hari setelah cut-over** | Sistem sudah dipakai; ekspektasi klien soal "selesai" berdiri di angka lama | Jadwal memang dikorbankan untuk scope (keputusan user), tapi **angkanya tetap harus disampaikan** ke klien, bukan didiamkan (§9.7) |
| **Hari 32A masih belum dikerjakan** | Pindah Buku Kas, Kasbon, master Pekerja, Laporan Biaya Operasional belum ada | Gabungkan ke R9+R10 — lihat §6 |
| **FP2 & SJ1 belum direproduksi** | Bisa jadi memperbaiki hal yang salah | R4 dimulai dengan reproduksi bersama tester, bukan langsung menulis kode |
| **A5 ("Isi") ternyata angka konversi** | R2 berubah dari reorder jadi perubahan skema | Konfirmasi A5 lebih awal dari asumsi 2B lainnya — biayanya beda kelas |

---

## 6. Tumpang Tindih dengan Hari 32A

`PROGRESS.md` mencatat Hari 32A belum dikerjakan. Isinya bersinggungan dengan revisi ini:

| Hari 32A | Bersinggungan dengan |
|---|---|
| Laporan Biaya Operasional | R10 (modul yang sama) |
| Pindah Buku Kas (`PB`) | R9 (layar Kas & Bank yang sama) |
| Kasbon / Piutang Karyawan | R10 (baris biaya operasional yang sama) |
| Master Pekerja, kolom kendaraan BBM | R10 (form baris yang sama) |

**Usul: gabungkan 32A ke dalam R9+R10** dan kerjakan sekali jalan, bukan dua kali menyentuh
layar yang sama. Ini menghemat ±0,5 hari dan menghindari dua kali migrasi pada tabel
`operational_expense_lines`.
