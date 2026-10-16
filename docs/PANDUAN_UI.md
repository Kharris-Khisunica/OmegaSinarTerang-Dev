# PANDUAN UI — Bentuk Layar & Nota, Berdasar Sistem Lama

> **Dibuat 10 Agustus 2026.** Sumber: 25 screenshot sistem lama di `docs/referensi/`
> (**Affari Retail System Ver. 7.57.27**, aplikasi desktop Delphi/DevExpress) + 2 foto
> dokumen tercetak.
>
> Frontend sistem baru sampai Hari 16 dibangun **tanpa referensi apa pun** — semua bentuk
> layar adalah tebakan. Dokumen ini menggantikan tebakan itu. Hari 17–37 masih memuat
> sebagian besar layar transaksi (Biaya Operasional, COA, Sales Order, Faktur Penjualan +
> panel riwayat harga, Surat Jalan, Payment, Laporan); mulai sekarang semuanya dibentuk
> dari sini.
>
> **Layar yang terlanjur dibangun sebelum dokumen ini ada** diperbaiki di **Hari 16A**
> (10 Agu 2026) — lihat §16.

---

## §0. Cara Pakai Dokumen Ini

**Wajib dibaca sebelum menyentuh apa pun di `frontend/`.** Bacanya bersama:

| Dokumen | Menjawab |
|---|---|
| `CLAUDE.md` | **Aturan bisnis** — apa yang boleh/tidak boleh terjadi pada data |
| `docs/frontend-engine.md` | **Props** `<DataTable>` & `<CrudFormPage>` |
| `PANDUAN_UI.md` (ini) | **Bentuk** — tata letak, urutan, istilah, kepadatan, cetak |

**Urutan kuasa.** Kalau bertabrakan, `CLAUDE.md` menang untuk aturan bisnis dan dokumen
ini menang untuk bentuk UI. Kalau tabrakannya tidak bisa diselesaikan begitu — misalnya
sistem lama menampilkan sesuatu yang `CLAUDE.md` §5 larang dilihat Operator — **berhenti
dan tanya**, jangan diam-diam memilih salah satu (`CLAUDE.md` §9.2).

**Apa yang bukan tugas dokumen ini.** Ini bukan spesifikasi fitur dan bukan daftar
endpoint. Kalau sebuah layar tidak ada di sini, ambil pola terdekat dari §5–§7 lalu
catat di akhir jawaban bahwa polanya diturunkan, jangan mengarang bentuk baru.

**Penandaan bukti.** Sepanjang dokumen:

- 📸 = terlihat langsung di screenshot, kutip apa adanya
- 🔧 = keputusan sistem baru (sistem lama tidak punya, atau sengaja diubah) — alasannya selalu ditulis

---

## §1. Empat Keputusan Klien yang Mengikat

Dikonfirmasi klien 10 Agustus 2026. **Jangan ditawar ulang tanpa bertanya.**

| # | Keputusan | Isi |
|---|---|---|
| 1 | **Fidelitas visual** | *Struktur sama, skin modern.* Tata letak, urutan field, nama kolom, urutan tombol, dan alur ditiru **persis**. Warnanya memakai palet Nuxt UI yang sudah ada (`primary: green`, `neutral: slate`) dengan **kepadatan tinggi** ala grid lama. Chrome Win32, gradien oranye, dan zebra krem **tidak** ditiru. |
| 2 | **Pola entri transaksi** | *Dua lapis modal murni, tanpa URL.* Daftar → klik **Entri** → **modal dokumen** → klik **Entri** → **modal baris**. Modal dibuka lewat state komponen; URL tidak berubah. |
| 3 | **Navigasi** | *Sidebar sekarang, dikelompokkan ulang* mengikuti menu sistem lama. Shell tidak dibangun ulang. |
| 4 | **Nota cetak A5** | *Persis nota lama*, termasuk nama kolom dan kata-katanya. |

### 1.1 Konsekuensi keputusan #2 dan mitigasi wajibnya

Keputusan #2 diambil sadar akan harganya: **F5 atau tombol Back = isian hilang**, dan satu
faktur tidak bisa di-*link*. Karena itu setiap modal dokumen **wajib** memasang keempat
pengaman ini — bukan opsional, bukan "nanti":

1. 🔧 `:dismissible="false"` — klik di luar modal tidak menutupnya.
2. 🔧 **Esc menutup satu lapis saja**, dan meminta konfirmasi kalau ada perubahan belum tersimpan.
3. 🔧 **Guard `beforeunload`** aktif selama modal dokumen berstatus *dirty*.
4. 🔧 **Draf otomatis ke `sessionStorage`** per jenis dokumen, dipulihkan saat modal jenis
   yang sama dibuka lagi, dihapus setelah `Simpan` berhasil.

Tanpa keempatnya, keputusan #2 berubah dari "sesuai kebiasaan operator" jadi "kehilangan
data diam-diam saat burst input" — dan burst 10 input dalam 20 menit adalah pola beban
nyata di lapangan (`CLAUDE.md` §1).

---

## §2. Peta Screenshot → Pelajaran

Semua path relatif terhadap `docs/referensi/`. Prompt harian boleh menunjuk baris di sini,
misalnya: *"bentuk modal baris lihat `penjualan/Penjualan - Input baris.jpg`"*.

| # | File | Layar | Yang diambil |
|---|---|---|---|
| 1 | `Badstock - Menu.jpg` | Daftar Master Inventori BS | Chrome penuh: menu bar, toolbar ikon, tab dokumen, status bar. Bentuk **halaman daftar** baku (§5) |
| 2 | `Inventori Master - input.jpg` | Master Produk | Header seksi berkelompok. Juga **daftar terpanjang hal yang TIDAK ditiru** (§3) |
| 3 | `Menu Data Pelanggan.jpg` | Master Pelanggan | Blok "Data Ekspedisi"/"Data Pajak", field `Perk. Piutang` = `ar_account_id`, `Termin`, `PKP` |
| 4 | `penjualan/Penjualan - Input.jpg` | **Modal dokumen** Penjualan | Anatomi lapis 1 (§6): band judul, blok field, toolbar baris, grid baris, strip total |
| 5 | `penjualan/Penjualan - Input baris.jpg` | **Modal baris** Penjualan | Anatomi lapis 2 (§7): kolom kiri input, kanan **sisa stok** + **panel riwayat harga** (foto memperlihatkan 6 baris + scrollbar; jumlah baku 10 datang dari `CLAUDE.md` §3), hint `Ctrl+H`/`Ctrl+D` |
| 6 | `penjualan/Faktur Penjualan.jpg` | **Nota tercetak A5** | Template cetak Faktur Penjualan, kata per kata (§13.1) |
| 7 | `penjualan/Laporan-Rekap Penjualan.jpg` | Laporan tercetak | Kepala laporan: judul, parameter dipisah `\|`, `CETAK :`, `HAL :`, baris `GRAND TOTAL` (§14) |
| 8 | `pembelian/Pembelian - Input (Tanggal nota = tanggal input).jpg` | Modal dokumen Pembelian | Field header pembelian, badge `N-PKP`, toolbar baris ber-**Bonus**, strip total bertingkat dua |
| 9 | `pembelian/Pembelian - Input(Tanggal nota bukan tanggal input).jpg` | idem, tanggal berbeda | Bukti **tiga tanggal terpisah**: `Tanggal` ≠ `Tgl. Nota`, dan `Jth. Tempo` mengikuti `Tgl. Nota` |
| 10 | `order-penjualan/Order Penjualan - Input.jpg` | Modal dokumen SO | Versi paling ringkas dari lapis 1 — tanpa Lokasi, tanpa Disc |
| 11 | `retur-penjualan/Retur Penjualan - Input.jpg` | Modal dokumen Retur Jual | Bentuknya kembar Penjualan; kolom `BarcodeAktif` |
| 12 | `retur-pembelian/Retur Pembelian - Input.jpg` | Modal dokumen Retur Beli | Di latar belakang: toolbar daftar **`Cetak \| Btl Cetak \| Checked`** = kunci cetak §2.16 |
| 13 | `retur-pembelian/Retur Pembelian - Input baris.jpg` | Modal baris Retur Beli | Modal baris versi pendek: `No. Nota` + `Qty. Retur`, tanpa panel riwayat |
| 14 | `mutasi-gudang/Mutasi Gudang - Input.jpg` | Modal dokumen Mutasi | `Mutasi Dari` / `Kepada`, kolom `Q.Besar \| Q.Kecil \| Q.Mutasi` |
| 15 | `mutasi-gudang/Mutasi Gudang - Input baris.jpg` | Modal baris Mutasi | Modal baris tanpa panel riwayat; label `Sat-B`/`Sat-K` di kanan tiap field qty. ⚠️ `Harga @` di sistem lama tampak sebagai field biasa — di sistem baru **wajib read-only** (`CLAUDE.md` §3) |
| 16 | `mutasi-gudang/Mutasi Gudang - Nota.jpg` | Nota Mutasi tercetak | Template §13.2 — **tanpa rupiah sama sekali** |
| 17 | `penerimaan-kas/Penerimaan Kas - Input - Before.jpg` | Modal Penerimaan Kas kosong | Grup `PELUNASAN:` (Total/Tunai/Giro/Transfer/Pending), empty state grid |
| 18 | `penerimaan-kas/Penerimaan Kas - Input - After.jpg` | idem, terisi | Judul berubah **Entri → Ubah**; satu penerimaan menutup **banyak faktur** |
| 19 | `penerimaan-kas/Penerimaan Kas - Entri baris - Daftar Nota.jpg` | **Modal lookup** | Pola `<LookupModal>`: toolbar `Pilih \| Refresh` + grid + seleksi baris (§8.4) |
| 20 | `penerimaan-kas/Penerimaan Kas - Entri baris - Tampilan Setelah Input Nota.jpg` | Modal baris Kas | Pola `<InfoStrip>`: `Tanggal : … \| Sisa Faktur : …` (§8.5) |
| 21 | `pengeluaran-kas/Pengeluaran Kas - Operasional - Menu.jpg` | Daftar Pengeluaran Kas | **Referensi terjernih halaman daftar**: urutan toolbar lengkap, kolom `P` & `Checked` |
| 22 | `pengeluaran-kas/Pengeluaran Kas - Operasional - Input.jpg` | Modal Pengeluaran Kas | Kembar Penerimaan Kas, hanya `Dari:` → `Kepada:` |
| 23 | `pengeluaran-kas/Pengeluaran Kas - Operasional - Entri baris.jpg` | Modal baris Kas | Kembar #20 |
| 24 | `laporan-stok/Laporan-Stock-Input.jpg` | **Dialog parameter laporan** | Pola `TIPE:` / `DASAR:` — radio berpasangan dengan filternya (§14.1) |
| 25 | `laporan-stok/Laporan-Stock.jpg` | Hasil laporan stok | Kepala laporan + tabel pivot per gudang, nol = `-` |

---

## §3. Yang TIDAK Ditiru

Sistem lama adalah produk ritel multi-outlet umum; sebagian besar fiturnya tidak dipakai
klien. Daftar ini ada supaya tidak "ditemukan ulang" oleh sesi yang melihat screenshot
tanpa konteks.

| Terlihat di screenshot | Kenapa tidak ditiru |
|---|---|
| `Divisi` / `Departemen` / `Kategori` / `Sub Kategori` | Tidak ada master kategori — kategori diwakili **Merek** (`CLAUDE.md` §3) |
| Kolom `Lokasi` per baris transaksi | Warisan multi-outlet. Selalu `STORE`, tidak dipilih per baris (`CLAUDE.md` §3) |
| `SN / IMEI`, `Scan`, `PDT`, `Barcode`, `Price Card` | Tidak ada scanner/PDT di MVP |
| `Konsinyasi` | Klien **tidak menerima konsinyasi**. "Barang titipan" ≠ konsinyasi (`CLAUDE.md` §3) |
| `Payment Gateway`, `Include Point Belanja`, `Prompt Kasir`, `Open Price` | Fitur ritel POS, bukan grosir B2B |
| `H.Jual-1 / H.Jual-2 / H.Jual-3`, `Harga Sistem H.1/H.2/H.3`, `Tipe H.Jual` | **Satu tingkat harga** saja; harga diketik bebas per faktur (`CLAUDE.md` §3) |
| `Plafon` (limit kredit) | Tidak diminta |
| `Adjust`, `Total Sblm Ongkir` | Ongkir tidak dikapitalisasi ke harga pokok (`CLAUDE.md` §3) |
| `Stock ke` di Pembelian | Pembelian **selalu** masuk gudang `STORE` |
| `Permintaan Mutasi Gudang` (hint `F10`) | Alur permintaan tidak dipakai |
| `Link To Supp`, `Kelompok`, `Wilayah`, `Outlet Aktif`, `Tipe: Regular` | Tidak dipakai |
| `Timbangan`, `Dimensi`, `Berat`, `Photo Produk`, `Panah UP` | Tidak dipakai |
| `Kirim`, `Operator Aktif`, `Histori`, `Reload Harga` | Tidak dipakai / diganti audit log |
| Band `Drag a column header here to group by that column` | Grouping DevExpress. Tidak dibuat; kalau butuh, pakai filter biasa |
| `Pendekatan Harga Terakhir` di laporan stok | Nilai persediaan sudah eksak dari FIFO |

🔧 **Satu penyeragaman yang disengaja.** Sistem lama memakai **dua gaya dialog**: modul
transaksi memakai band gradien oranye ("Data Penjualan"), modul Kas & Bank memakai dialog
polos ("Entri Penerimaan Kas / [PJK] Kas Besar"). Perbedaan itu tidak berarti apa-apa bagi
operator — hanya jejak dua generasi kode. Sistem baru memakai **satu** gaya dialog (§6)
untuk semua modul.

---

## §4. Kerangka Aplikasi

### 4.1 Pemetaan menu lama → sidebar baru

Menu lama: `Aplikasi · Master Data · Transaksi · General Ledger · Marketing · Laporan ·
Pemeliharaan · Window`. `Marketing`, `Pemeliharaan`, dan `Window` tidak punya padanan.

Grup sidebar baku (`frontend/app/config/navigation.ts`) — **judul grup ditampilkan**, tidak
cuma divider:

```
MASTER DATA   Produk · Merek · Satuan · Pelanggan · Supplier · Salesman · Gudang
TRANSAKSI     Order Penjualan · Penjualan · Retur Penjualan · Surat Jalan
              Pembelian · Retur Pembelian · Mutasi Gudang
KAS & BANK    Penerimaan Kas · Pengeluaran Kas · Biaya Operasional
AKUNTANSI     Bagan Akun · Jurnal · Saldo Awal
PENGECEKAN    Pengecekan Invoice · Antrian Persetujuan
LAPORAN       Laporan
PENGATURAN    Pengaturan
```

Aturan yang tidak berubah: penyaringan `roles` per item tetap seperti sekarang, dan
**Supervisor tetap hanya melihat 3 item** (Pengecekan Invoice · Antrian Persetujuan ·
Laporan) — `CLAUDE.md` §5. Grup yang kosong setelah penyaringan tidak dirender, termasuk
judulnya.

📸 Urutan di dalam grup TRANSAKSI mengikuti urutan tab sistem lama (penjualan lebih dulu,
pembelian sesudahnya) — itu urutan yang dilihat operator tiap hari.

### 4.2 Status bar

📸 Sistem lama punya status bar permanen:
`Affari Retail System Ver : 7.57.27 | WELCOME : KASIR | REC(s) : 958 | READY | CAPS NUM INS | 28-07-2026`

🔧 Padanannya di sistem baru: **baris tipis di kaki panel utama**, teks kecil `text-muted`:

```
Omega Sinar Terang v1.0  ·  KASIR (Operator)  ·  958 data  ·  10-08-2026 14:32
```

Jumlah data (`REC(s)`) diisi dari `meta.total` halaman daftar yang sedang terbuka; kosong
di halaman non-daftar. Jam berdetak memakai `useClockTick()` yang sudah ada.

---

## §5. Anatomi Halaman Daftar

Referensi utama: `pengeluaran-kas/Pengeluaran Kas - Operasional - Menu.jpg`.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Faktur Pembelian                                                           │  ← judul halaman
├────────────────────────────────────────────────────────────────────────────┤
│ [+ Entri] [Ubah] [Refresh] [Hapus] │ [Cetak] [Batal Cetak] [Pengecekan]     │  ← toolbar
│ Cari : [________________]  [Filter ▾]                    [Ekspor ke Excel] │
├────────────────────────────────────────────────────────────────────────────┤
│▶│ Tgl.Bukti │ No.Bukti      │ Nama      │ Keterangan │  Jumlah │P│ ✓ │ Oper │
│ │ 30-07-2026│ B1/RM01-26070…│ INDOMARCO │ …          │ 795.000 │☑│ ☐ │ KASIR│  ← baris terpilih
│ │ 29-07-2026│ B1/RM01-26070…│ MMU       │ …          │ 712.000 │☐│ ☐ │ KASIR│
│ │ …                                                                        │
├────────────────────────────────────────────────────────────────────────────┤
│ 958 data · Halaman 1 dari 48                              [‹ 1 2 3 … 48 ›] │
└────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Urutan toolbar — **jangan ditukar**

📸 Urutan baku, diambil dari sistem lama:

```
Entri · Ubah · Refresh · Hapus │ Cetak · Batal Cetak · Pengecekan │ Cari : [___] · View Detail · Ekspor ke Excel
```

- Tombol yang tidak berlaku untuk modul itu **dihilangkan**, tidak digeser posisinya.
- ℹ️ Sistem lama sendiri tidak konsisten: `Pengeluaran Kas` menaruh `Checked` **setelah**
  `Cari`/`View Detail`, `Retur Pembelian` menaruhnya **sebelum** `Cari`. Yang dipilih di
  atas adalah versi Retur Pembelian — `Cetak · Batal Cetak · Pengecekan` dikelompokkan
  karena ketiganya menyangkut status dokumen yang sama. Ikuti satu versi ini di semua modul.
- `Entri` selalu paling kiri. 🔧 Ini **menggantikan** tombol "Tambah" di kanan atas yang
  dipakai `<DataTable>` sekarang lewat prop `createTo` — posisi kanan atas itu tebakan
  dan bertentangan dengan kebiasaan operator.
- Aksi yang menyentuh baris terpilih (`Ubah`, `Hapus`, `Cetak`, `Batal Cetak`,
  `Pengecekan`, `View Detail`) **disabled** selama belum ada baris terpilih.
- 🔧 Menu titik-tiga per baris (`rowActions`) tetap boleh ada sebagai jalan pintas, tapi
  **bukan satu-satunya jalan** — semua aksinya wajib ada juga di toolbar.

### 5.2 Grid

| Aspek | Aturan |
|---|---|
| Kepadatan | 📸 Padat. Tinggi baris ±32 px, padding sel `px-2 py-1`, font `text-sm` |
| Zebra | 📸 Ada. 🔧 Krem/putih → `odd:bg-elevated/30` |
| Seleksi | 📸 Satu baris penuh tersorot. 🔧 Biru penuh → `bg-primary/10` + border kiri `border-l-2 border-primary`. **Seleksi baris ≠ hover** — keduanya harus bisa dibedakan |
| Penunjuk baris | 📸 Kolom sempit paling kiri berisi `▶` pada baris terpilih. Ditiru |
| Angka | 📸 Rata kanan. Nol/kosong tampil **`-`**, bukan `0` dan bukan sel kosong |
| Teks | Rata kiri. Kolom kode/nomor pakai `font-mono` |
| Kolom ekor | 📸 Selalu urutan ini di kanan: `… │ P │ Pengecekan │ Operator │ Waktu` |
| `Waktu` | 📸 Format `dd-MM-yyyy ( HH:mm )` |
| Empty state | 📸 `< Tidak Ada Data Untuk Ditampilkan >` — teks di tengah grid. 🔧 Ganti `<UEmpty>` "Belum ada data" yang dipakai sekarang |
| Kolom status | `P` = sudah dicetak, `Pengecekan` = sudah dicek. 📸 Keduanya checkbox read-only, bukan badge |

⚠️ Kolom `P` dan `Pengecekan` **tidak boleh digabung** dengan status posting. Tiga sumbu
status tidak pernah dicampur (`CLAUDE.md` §2.16) — `DocumentStatusBadges.vue` sudah benar,
pakai itu untuk tampilan detail dan checkbox untuk kolom grid.

---

## §6. Anatomi Modal Dokumen (Lapis 1)

Referensi: `penjualan/Penjualan - Input.jpg`,
`pembelian/Pembelian - Input (Tanggal nota = tanggal input).jpg`.

```
┌──────────────────────────────────────────────────────────────────────── [X] ┐
│  Faktur Pembelian                                                           │  ← band judul
│  Operator : KASIR                          Tekan Ctrl+S untuk simpan        │  ← subjudul kiri, hint kanan
├─────────────────────────────────────────────────────────────────────────────┤
│  No. Trans   : B1/RM01-26080001      Tanggal   : [10-08-2026 ▾]             │
│  No. Order   : [________] […]        Supplier  : [V-00007] […] INDOMARCO    │
│                                                  Jl. …              [Non-PKP]│
│                                      No. Nota  : [________]                 │
│                                      Tgl. Nota : [10-08-2026 ▾]             │
│                                      Jatuh Tempo: [12-08-2026 ▾]            │
│  Keterangan : [_____________________________________________________]       │
├─────────────────────────────────────────────────────────────────────────────┤
│  [+ Entri] [Ubah] [Hapus] [Bonus]                        Cari : [_________] │  ← toolbar baris
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │▶│ Kode      │ Barcode    │ Nama            │ Qty Beli │ H.Netto │ Jumlah│ │
│ │ │ 010102001…│ 2312280001 │ ADEM SARI …     │   110,00 │ 130.000 │14.300…│ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│  Item : 3   Qty : 460,00   Diskon Faktur : [0]   Total : 65.900.000         │  ← strip total
│                                              [💾 Simpan]  [✕ Keluar]        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Band judul

📸 Judul besar tebal + subjudul kecil `Operator :`. Judul berubah menurut modus:
**`Entri …` saat membuat, `Ubah …` saat menyunting** (terlihat di `Penerimaan Kas - Input
- Before/After.jpg`). Sisi kanan band dipakai untuk **hint** kalau ada (📸 sistem lama
menaruh `Tekan F10 Untuk Proses…` di sana).

🔧 Gradien oranye tidak ditiru (keputusan #1). Gantinya: latar `bg-elevated`, garis bawah,
judul `text-lg font-bold`.

### 6.2 Blok field

- 📸 Pola `Label : [field]` — label rata kiri, **titik dua sejajar** di seluruh blok,
  field mulai di kolom yang sama. Bukan label di atas field.
- 📸 Dua kolom. Kolom kiri = identitas dokumen, kolom kanan = tanggal & lawan transaksi.
- 📸 Field panjang (`Keterangan`, `Memo`) memakai **lebar penuh** di baris tersendiri paling bawah.
- 📸 Field tanggal: teks **biru**, format `dd-MM-yyyy`, dengan chevron. 🔧 Biru → `text-primary`.
- 📸 Field turunan yang tidak diisi manual (nama supplier, alamat, badge `Non-PKP`) tampil
  **read-only tanpa border** — jelas terbaca sebagai informasi, bukan isian.

### 6.3 Toolbar baris

📸 Urutan baku: `Entri · Ubah · Hapus · Cari : [___]`.
Tambahan per modul: `Bonus` (Pembelian saja 📸). Toolbar sistem lama juga memuat `Scan`,
`PDT`, `SN/IMEI`, `Reload Harga` — semuanya dibuang (§3).

### 6.4 Strip total

📸 Selalu di kaki modal, satu baris, kiri ke kanan, dengan `Total` paling kanan sebelum
tombol. Isinya per dokumen:

| Dokumen | Isi strip |
|---|---|
| Penjualan | `Item · Qty · Diskon Faktur · Total` |
| Pembelian | `Item · Qty · Total Sblm Disc · Diskon Faktur · Total` |
| Retur Pembelian | `Item · Qty · Diskon Faktur · Total` |
| Retur Penjualan | `Item · Qty · Total` |
| Order Penjualan | `Item · Qty · Total` |
| Mutasi Gudang | `Item · Qty` — 📸 **tanpa Total**, mutasi tidak menyentuh uang |
| Penerimaan/Pengeluaran Kas | Grup `PELUNASAN :` di kanan atas (Total · Tunai · Giro · Transfer · Pending), bukan strip kaki |

### 6.5 Tombol

📸 `[💾 Simpan]` lalu `[✕ Keluar]`, kanan bawah, **urutan itu**. Bukan "Batal"/"Tutup".
`Simpan` = `primary`, `Keluar` = `neutral ghost`.

---

## §7. Anatomi Modal Baris (Lapis 2)

Referensi: `penjualan/Penjualan - Input baris.jpg`. **Ini layar terpenting di seluruh
aplikasi** — di sinilah operator memutuskan harga, dan panel riwayat harga adalah
satu-satunya sumber kebenarannya (`CLAUDE.md` §8).

```
┌───────────────────────────────────────────────────────────────────── [X] ┐
│  Item Penjualan                                                          │
├──────────────────────────────────┬───────────────────────────────────────┤
│ Kode    : [__________] […]       │  SISA STOK                            │
│ Barcode : 2401200004             │  ┌──────────┬────────┬──────────────┐ │
│ Nama    : BANGO 25 GR            │  │ Gudang   │ Satuan │        Qty   │ │
│ Isi     : 1 DUS = 24 SACHET      │  │ Toko     │ SACHET │     1.513,00 │ │
│ Satuan  : [DUS ▾]                │  └──────────┴────────┴──────────────┘ │
│                                  │                                       │
│ Harga @ : [    124.051] 🔒 Ctrl+H│  RIWAYAT HARGA — TOKO ADE JAYA        │
│ Diskon  : [  0 %] [      0] 🔒 ⌃D│  ┌──────────┬───────────┬────┬──────┐ │
│ H.Netto :      124.051           │  │ Tanggal  │ No. Trans │Qty │@Harga│ │
│                                  │  │ 01-10-24 │ JL/RM01-… │1,00│108.000│ │
│ Qty     : [      0,00]           │  │ 23-07-24 │ JL/RM01-… │1,00│109.000│ │
│ Jumlah  :            0           │  │ … (10 baris terakhir)             │ │
│                                  │  └──────────┴───────────┴────┴──────┘ │
├──────────────────────────────────┴───────────────────────────────────────┤
│  Ubah Harga: Ctrl + H   ·   Ubah Diskon: Ctrl + D                        │
│                                             [💾 Simpan]  [✕ Keluar]      │
└──────────────────────────────────────────────────────────────────────────┘
```

### 7.1 Aturan

1. 📸 **Dua kolom.** Kiri = isian. Kanan = konteks yang tidak bisa diketik (sisa stok,
   riwayat harga). Kanan **tidak pernah** berisi field yang bisa diubah.
2. 📸 **Panel riwayat harga wajib** di Penjualan dan Order Penjualan: 10 transaksi terakhir,
   kolom `Tanggal · Qty · Satuan · @Harga`, dari faktur yang tidak VOID, dengan urutan
   fallback pelanggan+produk+satuan → produk+satuan → harga master (`CLAUDE.md` §3).
   Judul panel menyebut **nama pelanggan yang sedang aktif** supaya operator tahu ia
   sedang melihat harga siapa.
3. 📸 **Sisa stok wajib tampil** begitu produk dipilih, sebelum qty diketik.
4. 📸 **Hint hotkey di kaki modal**, teks kecil: `Ubah Harga: Ctrl + H · Ubah Diskon: Ctrl + D`.
   🔧 Di sistem lama hint ini ada tapi operator **tidak tahu cara memakainya**
   (`CLAUDE.md` §3). Karena itu tambahan wajib: field Harga dan Diskon diberi **ikon
   gembok yang bisa diklik** — mouse dan keyboard sama-sama bisa membukanya.
5. 🔧 **Satu baris = satu satuan.** Sistem lama punya `Qty. Besar` + `Qty. Kecil` +
   `Qty. Total`. Diganti **satu angka + pilihan satuan, default DUS** (`CLAUDE.md` §3) —
   klien tidak pernah mencampur satuan dalam satu baris. Kolom `Isi` tetap ditampilkan.
6. 📸 `Jumlah` (kiri bawah) berlabel **tebal** — itu angka yang dicek operator sebelum menyimpan.
7. 📸 Modal baris **selalu lebih sempit** dari modal dokumen, dan muncul menimpanya —
   operator harus bisa melihat bahwa dokumennya masih di belakang.

### 7.2 Varian pendek

📸 Modal baris Retur Pembelian dan Mutasi Gudang **tidak punya panel riwayat harga** —
kolom kanan diisi sisa stok saja, modalnya jadi jauh lebih kecil. Untuk Mutasi Gudang,
`Harga @` tampil **read-only** dan tidak pernah bisa diketik (`CLAUDE.md` §3 — kalau bisa
diubah, operator punya jalan mengubah nilai persediaan tanpa jurnal).

---

## §8. Komponen yang Harus Ada

Semuanya dibangun di **Hari 16A** (10 Agu 2026) sebagai satu paket, sebelum layar baru
mana pun ditambahkan — supaya Hari 17 dan sesudahnya tinggal memakai, bukan menambal.
Semuanya generik — dilarang memfork per modul (`CLAUDE.md` §6).

### 8.1 `<DocumentModal>` — lapis 1
```
title        judul band ("Faktur Pembelian")
mode         'entri' | 'ubah'   → memilih awalan judul
operator     nama operator untuk subjudul
hint         teks kanan band (opsional)
dirty        v-model, menyalakan guard §1.1
width        default '1100px'
#header      slot blok field
#lines       slot toolbar + grid baris
#totals      slot strip total
```
Wajib memasang keempat pengaman §1.1 di dalam komponen ini, **bukan di halaman pemanggil** —
kalau di pemanggil, satu halaman lupa memasang dan tidak ada error apa pun yang memberi tahu.

### 8.2 `<LineModal>` — lapis 2
```
title, mode, width (default '900px')
#form        kolom kiri
#context     kolom kanan (sisa stok, riwayat harga)
#hotkeys     baris hint kaki
```

### 8.3 `<LookupField>` — triplet `[kode] […] [nama]`
📸 Pola yang muncul di hampir setiap dokumen: kotak kode sempit, tombol `…`, lalu nama
read-only lebar. Baris kedua opsional untuk detail (alamat + badge).
```
modelValue   kode terpilih
endpoint     sumber lookup
columns      kolom yang tampil di <LookupModal>
displayField field yang ditampilkan di kotak nama
#detail      slot baris kedua read-only
```
Mengetik kode langsung lalu Tab harus bekerja tanpa membuka modal — 📸 itu yang dilakukan
operator lama.

### 8.4 `<LookupModal>` — pemilih baris
📸 Referensi `penerimaan-kas/Penerimaan Kas - Entri baris - Daftar Nota.jpg`.
Toolbar **`Pilih · Refresh`**,
grid seleksi satu baris, dobel-klik = pilih + tutup, `Esc` = batal.

### 8.5 `<InfoStrip>` — baris konteks read-only
📸 `Tanggal : 30-07-2026 | Sisa Faktur : 1.968.000,00` dalam kotak berbingkai selebar
penuh. Dipakai di modal baris pembayaran, alokasi, dan retur — di mana pun operator perlu
melihat konsekuensi pilihannya sebelum mengetik angka.

**Varian `stacked`** (`variant="stacked"`, paket R7 FB4) — satu baris label/nilai
sejajar kiri-kanan per item, font `text-base` (bukan digabung "|" ber-`text-sm`).
Dipakai Preview Kalkulasi Baris Faktur Pembelian, prop tambahan pada komponen yang
sama (CLAUDE.md §6: tambah prop, jangan fork). Varian default (`items`/`text`
satu baris) tetap dipakai di tempat lain — tidak diganti.

### 8.6 Sisanya
`<TotalsBar>` (§6.4) · `<PriceHistoryPanel>` (§7.1) · `<StockPanel>` (§7.1) ·
`<HotkeyHint>` (§7.1) · composable `useDocumentHotkeys()` (§12).

### 8.7 Prop baru `<DataTable>` — **tambah prop, jangan fork**
```
dense        boolean  kepadatan §5.2
zebra        boolean
selectable   boolean  seleksi satu baris + penunjuk ▶, expose selectedRow
toolbar      slot     menggantikan tombol "Tambah" bawaan (§5.1)
footerTotals slot     strip agregat untuk grid baris di dalam modal
emptyText    string   default '< Tidak Ada Data Untuk Ditampilkan >'
```
Grid **baris di dalam modal** (§6) memakai `<DataTable>` yang sama dalam mode data lokal
(tanpa `endpoint`) — jangan menulis `<table>` manual di halaman modul (`CLAUDE.md` §6).

---

## §9. Token Visual

| Token | Nilai |
|---|---|
| Font grid & form | `text-sm` (14 px) |
| Tinggi baris grid | ±32 px (`py-1`) |
| Padding sel | `px-2 py-1` |
| Jarak antar field dalam blok | `gap-y-1.5` — rapat, bukan `gap-4` |
| Lebar modal lapis 1 | `1100px` / `min(1100px, 92vw)` |
| Lebar modal lapis 2 | `900px` (panel riwayat) · `640px` (varian pendek §7.2) |
| Baris terpilih | `bg-primary/10` + `border-l-2 border-primary` |
| Baris hover | `bg-elevated/40` — wajib berbeda dari terpilih |
| Zebra | `odd:bg-elevated/30` |
| Band judul modal | `bg-elevated` + `border-b border-default` |
| Field read-only turunan | tanpa border, `text-muted` |
| Angka | `tabular-nums text-right` |
| Kode & nomor dokumen | `font-mono` |

🔧 **Mode gelap.** Sistem lama tidak punya. `UColorModeButton` boleh tetap ada, tapi
**seluruh token di atas wajib terbaca di kedua mode** — jangan menulis warna mentah
(`bg-white`, `text-black`) di layar operasional. Pengecualian: halaman cetak (§13) memang
selalu terang.

---

## §10. Format Angka, Tanggal, Teks

| Hal | Aturan | Contoh |
|---|---|---|
| Tanggal | `dd-MM-yyyy` di **seluruh** layar dan cetak | `10-08-2026` |
| Tanggal + jam | `dd-MM-yyyy HH:mm:ss` di baris cetak, `dd-MM-yyyy ( HH:mm )` di kolom `Waktu` | |
| Bulan pada nota | 📸 Nama bulan disingkat di kepala nota | `CIANJUR, 06-Agu-2026` |
| Uang di grid | **Tanpa `Rp`**, tanpa desimal | `65.900.000` |
| Uang di total/ringkasan | Dengan `Rp` | `Rp 65.900.000` |
| Uang nol/kosong | `-` | |
| Qty di grid transaksi | 2 desimal | `460,00` |
| Qty pecahan satuan | `computeQtyBreakdown()` — dipakai di panel stok & laporan, **bukan** di kolom Qty grid transaksi | `12 dus 15 renceng` |
| Persen | 2 desimal, akhiran `%` | `2,50 %` |

**Kenapa uang tanpa desimal.** `total_amount` eksak sampai rupiah dan tidak pernah
dibulatkan (`CLAUDE.md` §2.10) — sen tidak pernah ada. Sistem lama menampilkan `,00`
di modul kas dan tanpa desimal di modul transaksi; kita seragamkan ke tanpa desimal.

🔧 **`useRupiah()` perlu opsi.** Sekarang `format()` selalu menempelkan `Rp`. Tambahkan
`format(value, { bare: true })` untuk sel grid. **Jangan** membuat formatter kedua —
`CLAUDE.md` §6 mensyaratkan satu composable.

⚠️ **Koreksi terhadap nota lama.** `penjualan/Faktur Penjualan.jpg` mencetak `5,733,000` dan
`198,000` — koma sebagai pemisah ribuan. Di Indonesia koma dibaca sebagai **desimal**;
pada dokumen yang dipakai pelanggan untuk membayar, ini risiko salah baca yang nyata.
Sistem baru mencetak `5.733.000`. Ini satu-satunya penyimpangan yang disengaja dari
keputusan #4, dan sudah dicatat di sini supaya tidak dianggap kelalaian.

---

## §11. Glosarium & Label Baku

### 11.1 Istilah layar

| Sistem lama 📸 | Sistem baru | Catatan |
|---|---|---|
| Korporat / Pelanggan | **Pelanggan** | |
| Perkiraan / P.erk.iraan | **Akun** | Operator tidak pernah melihat layar ini (`CLAUDE.md` §5) |
| Lokasi | **Gudang** | |
| Outlet | **Toko** | Satu toko; identitas dari `settings`, umumnya tidak ditampilkan |
| KTN | **Dus** | |
| Sat-B / Sat-K | **Satuan Besar / Satuan Kecil** | |
| Isi | **Isi** | Dipertahankan — `CLAUDE.md` §3 mensyaratkannya tampil di grid |
| H.Jual / H.Netto | **Harga Jual / Harga Netto** | |
| Harga @ | **Harga @** | Dipertahankan |
| Q.Beli / Q.Mutasi / Q.Retur | **Qty Beli / Qty Mutasi / Qty Retur** | |
| Jth. Tempo | **Jatuh Tempo** | |
| TOP | **Termin** | |
| Disc / Disc-1 | **Diskon** | |
| Btl Cetak | **Batal Cetak** | |
| Checked | **Pengecekan** (kolom) / **Sudah Dicek** (status) | |
| BS | **Bad Stock** | |
| N-PKP | **Non-PKP** | |
| No. Trans | **No. Trans** di layar · **NO. NOTA** di cetakan | 📸 Sistem lama membedakan keduanya; ditiru |
| Memo (penjualan) / Keterangan (lainnya) | Dipertahankan apa adanya | 📸 "MEMO" tercetak di nota penjualan |
| Nama Struk, Price Tag, Vendor, Principle | — | Dibuang (§3) |

### 11.2 Label tombol baku

**Pakai:** `Entri` · `Ubah` · `Hapus` · `Refresh` · `Cetak` · `Batal Cetak` ·
`Pengecekan` · `Simpan` · `Keluar` · `Pilih` · `Cari` · `Ekspor ke Excel`

**Jangan pakai:** ~~Tambah~~ · ~~Baru~~ · ~~Edit~~ · ~~Batal~~ · ~~Tutup~~ ·
~~Simpan Perubahan~~ · ~~Kembali~~

Konsistensi label ini yang membuat operator tidak perlu belajar ulang; satu halaman yang
memakai "Tambah" merusak pola untuk seluruh aplikasi.

### 11.3 Pesan

- Empty state grid: `< Tidak Ada Data Untuk Ditampilkan >`
- Konfirmasi tutup: `Ada perubahan yang belum disimpan. Tutup dan buang perubahan?`
- Pesan error bisnis tetap datang dari backend dalam bahasa Indonesia (`CLAUDE.md` §6) —
  tampilkan apa adanya, jangan diterjemahkan ulang di frontend.

---

## §12. Peta Keyboard

📸 = terbukti ada di sistem lama · 🔧 = tambahan sistem baru

| Tombol | Aksi | Konteks |
|---|---|---|
| 📸 `Ctrl + H` | Buka kunci & fokus field **Harga** | Modal baris |
| 📸 `Ctrl + D` | Buka kunci & fokus field **Diskon** | Modal baris |
| 📸 `Ctrl + Insert` | Pilih banyak nota sekaligus | Modal baris pembayaran |
| 🔧 `Enter` | Field berikutnya; di field terakhir = `Simpan` baris lalu buka modal baris kosong | Modal baris |
| 🔧 `Esc` | Tutup **satu** lapis (konfirmasi bila dirty) | Semua modal |
| 🔧 `Ctrl + S` | Simpan dokumen | Modal dokumen |
| 🔧 `Insert` | Entri baris baru | Modal dokumen |
| 🔧 `F2` | Ubah baris terpilih | Grid mana pun |
| 🔧 `Delete` | Hapus baris terpilih (dengan konfirmasi) | Grid baris |
| 🔧 `/` | Fokus ke kotak `Cari` | Halaman daftar |

Semua terpasang lewat **satu** composable `useDocumentHotkeys()`, bukan listener tersebar.
Hotkey tidak boleh aktif saat fokus ada di dalam `<input type="text">` kecuali yang memang
ditujukan ke sana (`Ctrl+H`, `Ctrl+D`, `Enter`, `Esc`).

`CLAUDE.md` §8: navigasi keyboard penuh boleh berhenti di "cukup baik" — tapi
**`Ctrl+H`, `Ctrl+D`, dan hint-nya tidak termasuk yang boleh diturunkan**, karena itu satu-
satunya cara operator mengubah harga.

---

## §13. Template Cetak A5

Aturan bersama (`CLAUDE.md` §6): **A5 landscape, dua per lembar A4 portrait**, dipotong
mendatar; muat **14 baris** per halaman, lebih dari itu lanjut `Hal. 1 / 2`; identitas toko
dari `settings`, **yang kosong tidak dicetak**. `frontend/app/layouts/print.vue` sudah benar
(`@page { size: A4 portrait; margin: 0 }`) — pakai itu, jangan buat layout cetak baru.

Gaya garis: 📸 **garis horizontal saja, tanpa kotak dan tanpa garis vertikal.**

### 13.1 Faktur Penjualan (`JL`)

📸 Sumber: `penjualan/Faktur Penjualan.jpg`. Tiru struktur dan kata-katanya.

```
FAKTUR PENJUALAN                              CIANJUR, 06-Agu-2026
( 087714730066 )                              Kepada Yth :
NO. NOTA    : JL/RM01-26080047                TIGA SEKAWAN MALEBER      ← tebal
JTH. TEMPO  : 30 Hari ( 05-09-2026 )          MALEBER
MEMO        :                                 TEL :
────────────────────────────────────────────────────────────────────────
 NO   BARCODE       NAMA PRODUK        QTY   HARGA @  DISC %  DISC RP   JUMLAH
────────────────────────────────────────────────────────────────────────
  1   2401200001    ROYCO 220 GR      1,00   198.000       -        -   198.000
  2   2401200003    ROYCO 94 GR       3,00   148.000       -        -   444.000
  …
────────────────────────────────────────────────────────────────────────
        Dikirim Oleh,      Diterima Oleh,       GRAND TOTAL :      5.733.000
                                                                 ══════════
        ____________       ____________         SALES : ZB
                                                Hal. 1 / 1
                                                CETAK : KASIR - 06-08-2026 10:03:46
```

Rinciannya:
- 📸 Nomor telepon toko dalam kurung tepat di bawah judul.
- 📸 `JTH. TEMPO : <termin> Hari ( <tanggal jatuh tempo> )`. Termin 0/kosong → `-  Hari`.
- 📸 Kota + tanggal kanan atas, bulan disingkat (`06-Agu-2026`).
- 📸 Nama pelanggan **tebal**, alamat di bawahnya, lalu `TEL :`.
- 📸 Kolom persis: `NO · BARCODE · NAMA PRODUK · QTY · HARGA @ · DISC % · DISC RP · JUMLAH`.
  Diskon kosong dicetak `-`.
- 📸 `GRAND TOTAL` digarisbawahi ganda.
- 📸 Kaki kanan berurutan: `GRAND TOTAL` → `SALES` → `Hal. n / m` → `CETAK : <user> - <timestamp>`.
- 📸 Dua baris tanda tangan: `Dikirim Oleh,` dan `Diterima Oleh,`.
- ⚠️ Angka memakai pemisah ribuan **titik**, bukan koma — lihat §10.

**Nota revisi.** Dokumen hasil revisi wajib mencantumkan **nomor revisi** (`CLAUDE.md`
§2.16); taruh di sebelah `NO. NOTA` sebagai `( Revisi ke-2 )`.
**Dokumen VOID** boleh dicetak ulang dengan tanda `VOID` besar melintang untuk arsip.

### 13.2 Nota Mutasi Gudang (`GD`)

📸 Sumber: `mutasi-gudang/Mutasi Gudang - Nota.jpg`.

```
NOTA MUTASI GD                                                    OST
NO. NOTA  : GD/RM01-26070001              TGL. NOTA :   29-07-2026
KET.      :
DARI      : BS                KEPADA TOKO                    Hal. 1 / 1
────────────────────────────────────────────────────────────────────────
 NO.   BARCODE        NAMA BARANG                QTY   SATUAN   Q.MUTASI
────────────────────────────────────────────────────────────────────────
  1.   2308270008     CLEAR SACHET             10,00              10,00
```

- 📸 **Tidak ada rupiah sama sekali** — mutasi tidak menyentuh uang (`CLAUDE.md` §3).
  Dilarang memanggil `useRupiah()` di berkas ini.
- 📸 Kode toko singkat (`OST`) di kanan atas.
- 📸 Kolom: `NO. · BARCODE · NAMA BARANG · QTY · SATUAN · Q.MUTASI`.

⚠️ **Koreksi terjadwal.** `frontend/app/pages/gudang/mutasi/[id]/cetak.vue` sekarang
memakai blok identitas toko rata tengah dan band `MUTASI GUDANG` — bentuk tebakan
sebelum referensi ini ada. Sesuaikan ke bentuk di atas di **Hari 16B** (§16.2); jangan
dikerjakan di luar hari itu.

### 13.3 Dokumen yang belum ada fotonya

Faktur Pembelian (`B1`), Surat Jalan (`SJ`), Retur (`RJ`/`RB`), dan Kwitansi (`PAY`)
tidak ada di referensi. **Turunkan dari §13.1**: kepala kiri/kanan yang sama, kolom
disesuaikan isinya, kaki yang sama. Bedanya yang sudah diketahui: 📸→🔧 **nota pembelian
memuat tiga baris tanda tangan** — `Dibuat` / `Diterima` / `Diketahui` — dan ruangnya sempit
di A5, alokasikan sejak awal (`CLAUDE.md` §6).

---

## §14. Halaman Laporan

### 14.1 Panel parameter

📸 Sumber: `laporan-stok/Laporan-Stock-Input.jpg`. Polanya: **radio "dasar pengelompokan"
di kolom kiri, berpasangan sebaris dengan filternya di kolom kanan.**

```
┌ TIPE: ────────────────┐   Gudang  : [Semua ▾]     Periode : [30-07-2026 ▾]
│ (•) Rekap  ( ) Detail │
└───────────────────────┘
┌ DASAR: ───────────────┐
│ (•) Produk            │   Produk  : [________] […]
│ ( ) Merek             │   Merek   : [________ ▾]
│ ( ) Supplier          │   Supplier: [________] […]
└───────────────────────┘
                                          [Tampilkan]  [Cetak]  [Ekspor]  [Keluar]
```

Radio yang tidak terpilih membuat filter pasangannya **disabled**, bukan disembunyikan —
📸 itu yang dilakukan sistem lama, dan itu yang membuat operator melihat pilihan yang ada.

🔧 Sistem lama langsung `Cetak` tanpa pratinjau. Sistem baru menambah **`Tampilkan`** —
hasil muncul di layar dulu, baru `Cetak`/`Ekspor`. `Ekspor` = Excel **dan** PDF (A4,
di-un-cut 05 Sep 2026, `CLAUDE.md` §1/§8) — dua tombol lewat `<ExportButton>`.

### 14.2 Kepala hasil laporan

📸 Sumber: `laporan-stok/Laporan-Stock.jpg` dan `penjualan/Laporan-Rekap Penjualan.jpg`.

```
                    LAPORAN DETAIL STOCK PER LOKASI              ← tebal, rata tengah
      OUTLET : RM01 | TANGGAL 30-07-2026 | LOKASI : SEMUA | JENIS : Semua
CETAK : 30-07-2026 23:30:06                                     HAL : 1 / 1
────────────────────────────────────────────────────────────────────────────
```

- 📸 Baris parameter = **echo semua parameter yang dipilih**, dipisah ` | `. Ini yang
  membuat laporan tercetak bisa dipertanggungjawabkan berbulan-bulan kemudian.
- 📸 `CETAK : <timestamp>` kiri, `HAL : n / m` kanan.
- 📸 Baris agregat berlabel `GRAND TOTAL :` dengan garis ganda di bawahnya.
- 📸 Nol tampil `-`.
- 📸 Laporan yang dicetak ke kertas pakai garis horizontal saja; laporan pivot yang
  dilihat di layar boleh berkotak penuh.

---

## §15. Checklist Sebelum Menandai Halaman Selesai

Jalankan untuk **setiap** halaman/modal frontend baru. Ini melengkapi DoD harian
`CLAUDE.md` §7, tidak menggantikannya.

- [ ] Urutan toolbar daftar sesuai §5.1, tidak ditukar, `Entri` paling kiri
- [ ] Aksi baris terpilih disabled saat belum ada seleksi
- [ ] Grid padat (§5.2): zebra, penunjuk `▶`, angka rata kanan, nol = `-`
- [ ] Kolom ekor berurut `P · Pengecekan · Operator · Waktu`
- [ ] Empty state berbunyi `< Tidak Ada Data Untuk Ditampilkan >`
- [ ] Modal dokumen: band judul `Entri …`/`Ubah …` + `Operator :`, titik dua sejajar
- [ ] Modal dokumen memasang **keempat pengaman §1.1** (tidak dismissible, Esc bertingkat, `beforeunload`, draf `sessionStorage`)
- [ ] Strip total sesuai §6.4 untuk dokumen itu
- [ ] Tombol `[Simpan] [Keluar]` — bukan Batal/Tutup
- [ ] Modal baris: kolom kanan berisi konteks read-only; riwayat harga ada di Penjualan & SO
- [ ] Hint `Ctrl+H` / `Ctrl+D` terlihat **dan** ada ikon gembok yang bisa diklik
- [ ] Satu baris = satu satuan, default DUS, kolom `Isi` tampil
- [ ] Tanggal `dd-MM-yyyy`; uang di grid tanpa `Rp` tanpa desimal; qty 2 desimal
- [ ] Tidak ada istilah terlarang §11.2 di seluruh berkas
- [ ] Tidak ada `toLocaleString` baru — lewat `useRupiah()` / `useQty()` saja
- [ ] Tidak menulis `<table>` manual — lewat `<DataTable>`
- [ ] Terbaca di mode terang **dan** gelap
- [ ] Halaman cetak: A5×2 di A4, 14 baris/halaman, garis horizontal saja, field kosong tidak dicetak

---

## §16. Layar Lama & Jadwal Penyesuaiannya

Dokumen ini ditulis 10 Agu 2026, setelah Hari 1–16 selesai. Semua layar yang sudah ada
dibangun sebelum referensi sistem lama tersedia. Penyesuaiannya dikerjakan di
**Hari 16A** (`docs/PROMPTS_HARIAN.md`), bukan disebar ke hari-hari berikutnya.

### 16.1 Wajib di Hari 16A

| Yang disesuaikan | Ke bagian |
|---|---|
| Komponen dasar §8 dibangun sebagai satu paket | §8.1–§8.6 |
| `<DataTable>` dapat prop baru + toolbar + `emptyText` | §8.7, §5 |
| `<CrudFormPage>` dapat mode `modal` | §6 |
| **7 modul master data**: 7 halaman daftar + **14 halaman form** (`master-data/*/create.vue`, `[id]/edit.vue`) | §5, §6 |
| `useRupiah({ bare })` | §10 |
| `navigation.ts` dikelompokkan ulang + status bar | §4.1, §4.2 |

🔧 **Keputusan klien 10 Agu 2026:** master data **ikut** disesuaikan, tidak
di-*grandfather*. Sistem lama memang memakai modal juga untuk master data 📸, jadi
mempertahankan halaman ber-rute di sana berarti operator menghadapi dua pola berbeda
untuk pekerjaan yang sama. Rute lama (`/master-data/*/create`) **tetap hidup** sebagai
pembungkus tipis supaya bookmark dan tautan lama tidak mati.

### 16.2 Wajib di Hari 16B

**3 modul transaksi** yang dibangun Hari 13–16, sebelum referensi ini ada — 10 berkas,
±3.600 baris:

| Modul | Yang disesuaikan |
|---|---|
| `gudang/mutasi` | daftar §5 · entri §6/§7 · **nota → §13.2** (koreksi yang ditunda dari 16A) |
| `pembelian/faktur` | daftar §5 · entri §6/§7 (satu-satunya dengan tombol `Bonus`) |
| `pembelian/retur` | daftar §5 · entri §6/§7 · nota selaras §13.1/§13.3 |
| `DocumentActions.vue` | **label saja** (`Edit`→`Ubah`, `Batal`→`Keluar`); logika tampil/sembunyi tidak disentuh |

🔧 **Keputusan klien 10 Agu 2026** (menyusul beberapa jam setelah keputusan §16.1): ketiganya
ikut disesuaikan, tidak dibiarkan. Dua pola entri yang hidup berdampingan adalah persis
kebingungan yang dokumen ini ada untuk mencegahnya.

⚠️ **Utang `CLAUDE.md` §6 yang ikut lunas.** Ketiga `create.vue` memuat total **lima
`<table>` manual**, padahal aturannya "dilarang menulis `<table>` manual — tambah prop di
`<DataTable>`". Pelanggaran itu sudah ada sejak Hari 13; baru sekarang penggantinya ada.

⚠️ **Delapan perilaku halus wajib selamat** — rusaknya tidak memunculkan error apa pun.
Didaftar sebagai N1–N8 di prompt Hari 16B dan wajib **dibuktikan satu per satu**, bukan
diklaim. Yang paling gampang rusak: gerbang supplier di Retur Pembelian (daftar Bad Stock
kosong sampai supplier dipilih, lewat `watch(supplierId)` ke endpoint — **bukan** filter
client-side; kalau diubah, operator melihat stok supplier lain dan layarnya tetap tampak benar).

### 16.3 Setelah 16A & 16B

Tidak ada lagi layar yang dibangun sebelum dokumen ini. Mulai Hari 17, §15 berlaku penuh
untuk setiap halaman baru tanpa pengecualian.
