# Prompt Development — Putaran Revisi Hasil Testing Klien

Pendamping `docs/RENCANA_REVISI_TESTING_KLIEN.md`, `CLAUDE.md` v3, dan `PROGRESS.md` v3.
Format mengikuti `docs/PROMPTS_HARIAN.md`: tiap paket punya **prompt Backend**, **prompt
Frontend**, dan **blok verifikasi**. Paket yang murni satu sisi hanya punya satu prompt.

> **Disusun 08 September 2026, setelah sesi testing bersama user + product owner.**
> Sumber kebutuhan: `revisi_hasil_testing_dengan_klien.md` (24 poin).
> Rencana, estimasi, dan hasil telusur kode: `docs/RENCANA_REVISI_TESTING_KLIEN.md`.
>
> **Penomoran memakai `R0`–`R12`, bukan "Hari N".** Spine hari (1–37) sudah habis di
> `PROMPTS_HARIAN.md`; putaran ini berdiri sendiri di atasnya. Hari 32A **belum dikerjakan**
> dan sebagian isinya digabung ke R9/R10 — lihat §Penutup.
>
> **Scope dipertahankan penuh, jadwal yang mengalah** (keputusan user 08 Sep). Tidak ada
> daftar potong di putaran ini. Kalau sebuah paket meleset, catat di `PROGRESS.md` §3 —
> jangan menurunkan mutu untuk mengejar tanggal yang memang sudah tidak mengikat.

---

## Cara Pakai

1. `CLAUDE.md` sudah otomatis terbaca tiap sesi. Prompt di bawah sengaja tidak mengulang
   aturan §2 — kecuali di titik yang paling gampang dilanggar hari itu.
2. **Setiap sesi Frontend wajib membaca `docs/PANDUAN_UI.md` lebih dulu.** Sama seperti
   `PROMPTS_HARIAN.md` poin 2. Tanpa itu bentuk layar kembali jadi tebakan.
3. **Setiap sesi wajib membaca `docs/RENCANA_REVISI_TESTING_KLIEN.md` §2A dan §2B lebih
   dulu.** Tujuh keputusan (K1–K7) dan lima asumsi kerja (A1–A5) hidup di sana. Prompt di
   bawah merujuknya dengan kode, bukan mengulang isinya.
4. Jalankan **Prompt Pembuka** (§A) sekali di awal tiap paket, lalu BE di satu sesi dan FE
   di sesi terpisah.
5. Setelah keduanya selesai: `./scripts/verify.sh`, lalu **Prompt Penutup** (§C).
6. Kalau ada yang merah, jangan lanjut ke paket berikutnya. Catat di `PROGRESS.md` §3.

**Urutan yang mengikat:**

```
R0 → R1 → { R2, R3→R4, R5, R9, R10, R11 }   ← bebas urutan
R0 → R7 → R6                                 ← R7 WAJIB sebelum R6
R0 → R8                                      ← bebas
semuanya → R12
```

**Kenapa R7 sebelum R6:** R6 memposting ulang faktur pembelian. Kalau R6 lebih dulu, mesin
revisinya ditulis di atas rumus alokasi pro-rata yang dihapus R7 — dan tesnya ditulis dua kali.

---

## A. Prompt Pembuka (jalankan sekali di awal tiap paket)

```
Baca CLAUDE.md, docs/RENCANA_REVISI_TESTING_KLIEN.md (§1 baris paket ini,
§2A keputusan K1-K7, §2B asumsi A1-A5, dan §3 paket R11), lalu PROGRESS.md §4.

Jawab singkat (maksimal 20 baris):
1. Apa persisnya yang sudah ada di repo untuk area yang disentuh paket R11?
   Sebutkan file + baris. Rencana sudah memuat hasil telusur — konfirmasi
   apakah masih akurat, jangan mengulang telusur dari nol.
2. Keputusan K berapa saja dan asumsi A berapa saja yang mengikat paket ini?
   Tulis ulang isinya dengan kalimatmu sendiri sebagai bukti sudah terbaca.
3. Apakah paket ini menyentuh aturan terkunci CLAUDE.md §2? Kalau ya,
   sebutkan nomornya dan sebutkan apakah §2A sudah memberi pengecualian
   tertulis untuk itu. Kalau BELUM ada pengecualiannya, BERHENTI dan tanya.
4. File/service existing mana yang akan kamu sentuh, supaya tidak ada duplikat?
5. Kalau ada pekerjaan FRONTEND: baca docs/PANDUAN_UI.md dan sebutkan bagian
   (§) mana yang mengatur layar ini.

Jangan menulis kode dulu. Tunggu prompt tugas berikutnya.
```

---

## B. Prompt Penutup (jalankan setelah BE + FE satu paket selesai)

```
Paket 2 selesai. Lakukan:

1. Jalankan ./scripts/verify.sh dan tampilkan hasil lengkapnya.
2. Update PROGRESS.md:
   - tambahkan baris paket 2 di §3 Catatan Harian dengan tanggal hari ini
   - perbarui §4 Modul Selesai untuk modul yang berubah bentuknya
   - kalau paket ini mencabut atau mengubah aturan CLAUDE.md, catat di §3
     bahwa CLAUDE.md sudah ikut diperbarui (sebutkan § mana)
3. JANGAN commit dan jangan bertanya soal commit. Biarkan perubahan di
   working tree.
4. Terakhir, beri saya 3 kalimat: apa yang paling berisiko di paket
   berikutnya, utang teknis apa yang kamu buat hari ini, dan apakah ada
   aturan CLAUDE.md §2 yang terasa sempit — kalau ada, sebutkan nomornya.
```

> **Catatan commit.** Berbeda dari `PROMPTS_HARIAN.md` §C yang memerintahkan commit tiap
> hari, putaran ini **tidak pernah commit otomatis**. Instruksi user 08 Sep: commit hanya
> kalau diminta eksplisit. R0 poin 1 (commit baseline) juga menunggu perintah terpisah.

---

## R0 — Rapikan Baseline

> **Tidak ada kode fitur di paket ini.** Isinya membereskan dua hal yang akan menyusahkan
> seluruh paket sesudahnya, plus menyiapkan bahan konfirmasi klien.

```
KONTEKS: Paket R0 dari putaran revisi. Baca docs/RENCANA_REVISI_TESTING_KLIEN.md §3 R0.

TUGAS:

1. scripts/verify.sh baris ~149: perintah build frontend (`cd $FE_DIR &&
   npm run build`) dijalankan TANPA NODE_OPTIONS, dan OOM di mesin ini.
   Tambahkan NODE_OPTIONS=--max-old-space-size=4096 pada baris itu saja.
   JANGAN mengubah struktur skrip lain — ini perbaikan satu baris.
   Buktikan dengan menjalankan ./scripts/verify.sh sampai selesai.

2. Siapkan docs/KONFIRMASI_KLIEN_REVISI.md — satu halaman yang bisa dibacakan
   ke klien, berisi K1-K7 dan A1-A5 dari RENCANA_REVISI_TESTING_KLIEN.md,
   ditulis ulang dalam bahasa awam (tanpa istilah teknis: tanpa "DTO",
   "migration", "FIFO", "endpoint"). Tiap poin: apa yang berubah, apa
   akibatnya bagi operator sehari-hari, dan satu pertanyaan ya/tidak.
   Dua poin yang WAJIB ditulis paling menonjol karena paling mungkin
   ditolak klien setelah dicoba:
   - K3 (revisi faktur hanya untuk dokumen berumur maksimal 2 hari; lebih
     tua dari itu jalannya VOID + faktur baru dengan nomor baru)
   - A5 (arti "Isi" di penamaan produk — Ukuran seperti "37", BUKAN angka
     isi per dus). Kalau A5 salah, paket R2 berubah bentuk.

3. Tambahkan baris di PROGRESS.md §1 (Menunggu Klien) untuk K1-K7 sebagai
   satu item: "Konfirmasi 7 keputusan revisi hasil testing (K1-K7)",
   dibutuhkan sebelum R12, diminta tanggal hari ini. Pola sama baris
   Payment §2.12 dan Biaya Operasional yang sudah ada di sana.

ATURAN WAJIB:
- JANGAN commit apa pun dan jangan menawarkan commit. Perubahan tinggal di
  working tree. (Ada 217 file yang belum pernah di-commit sejak ed8dacb —
  itu disengaja untuk sekarang, bukan sesuatu yang kamu bereskan sendiri.)
- JANGAN menyentuh kode fitur di paket ini.

DEFINITION OF DONE:
- ./scripts/verify.sh berjalan sampai akhir tanpa OOM, hasilnya ditampilkan
- docs/KONFIRMASI_KLIEN_REVISI.md ada, memuat 12 poin (K1-K7 + A1-A5),
  bebas istilah teknis, K3 dan A5 ditandai sebagai prioritas
- PROGRESS.md §1 punya baris baru untuk K1-K7
```

### ✅ Verifikasi R0

- [ ] `./scripts/verify.sh` selesai tanpa OOM
- [ ] `docs/KONFIRMASI_KLIEN_REVISI.md` ada dan bisa dibacakan ke orang non-teknis
- [ ] `PROGRESS.md` §1 memuat baris K1–K7
- [ ] Tidak ada commit yang dibuat

---

## R1 — Fondasi UI Bersama

> **Paket dengan dampak terbesar per jam kerja.** Empat perbaikan yang dipakai hampir semua
> layar. Yang nomor satu — pemisah ribuan saat mengetik — adalah penyebab langsung kesalahan
> input satu nol yang terjadi berkali-kali saat testing. Itu kesalahan uang, bukan ergonomi.

### 🔧 Backend

```
KONTEKS: Paket R1. Hanya satu tugas backend; sisanya frontend.
Baca docs/RENCANA_REVISI_TESTING_KLIEN.md §2B A2 dulu.

TUGAS (BACKEND):

1. Normalisasi auto-capitalize di lapisan service master data, bukan hanya
   di frontend — jalur API harus ikut bersih (asumsi A2: HURUF BESAR SEMUA,
   berlaku pada field NAMA dan ALAMAT, TIDAK pada email/keterangan bebas).

   Buat SATU helper bersama di src/common/ (mis. normalize-text.ts) berisi
   fungsi toUpperTrim(value). Panggil dari create() DAN update() di:
   brands, units, salesmen, agents, vehicles, warehouses, customers,
   suppliers, products, workers (kalau workers sudah ada dari Hari 32A;
   kalau belum, lewati).

   Field yang dinormalisasi: name, dan untuk customers/suppliers juga
   field alamat (lihat entity masing-masing — alamat dipecah 4 field sejak
   Hari 4). JANGAN menormalisasi: email, kode/`code`, NPWP, nomor telepon,
   dan field keterangan/catatan bebas.

   JANGAN menaruh normalisasi di entity @BeforeInsert — itu menyembunyikan
   perilaku dari test dan dari pembaca DTO. Satu helper, dipanggil eksplisit.

2. Migration backfill: UPDATE nama (dan alamat) yang sudah tersimpan jadi
   HURUF BESAR untuk seluruh tabel di atas. down() WAJIB benar — karena
   huruf asli tidak bisa dipulihkan, down() cukup no-op yang TERDOKUMENTASI
   di komentar (bukan diam-diam kosong), dan itu ditulis eksplisit di
   pesan migration.

ATURAN WAJIB HARI INI:
- products.display_name IKUT ter-backfill, karena ia gabungan yang
  terindeks dan dipakai pencarian operator (CLAUDE.md §3). Kalau tidak,
  produk lama dan baru beda bentuk dan pencarian jadi tidak konsisten.
  CATATAN: urutan display_name diubah di R2 — kalau R2 dikerjakan lebih
  dulu, cukup satu migration backfill untuk keduanya. Jangan menulis dua
  migration yang menyentuh kolom yang sama dua kali.
- Kode produk (products.code, barcode YYMMDDXXXX) TIDAK ikut — angka,
  bukan teks.

DEFINITION OF DONE:
- POST /brands { name: "indofood" } -> tersimpan "INDOFOOD"
- PATCH /customers { name: "toko abc" } -> tersimpan "TOKO ABC"
- POST /customers dengan email "a@b.com" -> email TIDAK berubah jadi kapital
- Migration up lalu down lalu up di DB kosong berhasil
- SELECT name FROM brands membuktikan data lama sudah kapital
```

### 🎨 Frontend

```
KONTEKS: Paket R1. Baca docs/PANDUAN_UI.md dulu.
Baca docs/RENCANA_REVISI_TESTING_KLIEN.md §3 R1 dan §2B A2.

TUGAS (FRONTEND):

1. KOMPONEN <MoneyInput> DAN <QtyInput> — INI TUGAS UTAMA HARI INI.

   Masalah yang diperbaiki: semua input angka sekarang memakai
   <UInputNumber> yang baru memformat SETELAH blur. Saat testing, tester
   berkali-kali mengetik satu nol kelebihan tanpa sadar karena tidak ada
   umpan balik saat mengetik. Yang diminta klien: ketik 1350 -> langsung
   tampil 1.350; ketik 135000 -> langsung tampil 135.000.

   Bangun <MoneyInput> sebagai bungkus <UInput> (BUKAN <UInputNumber>):
   - v-model tetap bertipe number | undefined — pemanggil tidak berubah
   - format ribuan id-ID dijalankan pada setiap input event
   - posisi caret DIJAGA saat pemisah bertambah/berkurang (hitung ulang
     offset dari jumlah digit di kiri caret, bukan dari panjang string)
   - paste "Rp 1.350.000" atau "1350000" sama-sama jadi 1350000
   - kosong -> undefined, bukan 0 (supaya field wajib tetap bisa dideteksi)
   - prop :min, :max, :disabled diteruskan seperti UInputNumber sebelumnya
   Formatnya WAJIB lewat useRupiah() yang sudah ada — CLAUDE.md §6 melarang
   toLocaleString tersebar. Tambahkan fungsi yang kurang ke composable itu,
   jangan bikin formatter kedua.

   <QtyInput> pola sama tapi lewat useQty() dan mengizinkan sampai 4
   desimal (qty NUMERIC(16,4), CLAUDE.md §2.14) — pemisah ribuan tetap
   muncul untuk bagian bulatnya.

   Lalu GANTI 32 pemakaian <UInputNumber> di 12 file berikut. Uang pakai
   <MoneyInput>, qty pakai <QtyInput>:
     app/pages/penjualan/faktur/index.vue        (7)
     app/pages/pembelian/faktur/index.vue        (7)
     app/components/CrudFormPage.vue             (6)
     app/pages/penjualan/order/index.vue         (2)
     app/pages/pembelian/retur/index.vue         (2)
     app/components/PaymentAllocationForm.vue    (2)
     app/pages/penjualan/retur/index.vue         (1)
     app/pages/penjualan/faktur/[id]/index.vue   (1)
     app/pages/pengaturan/index.vue              (1)
     app/pages/pembelian/faktur/[id]/index.vue   (1)
     app/pages/kas-bank/biaya-operasional/index.vue (1)
     app/pages/gudang/mutasi/index.vue           (1)
   Di CrudFormPage.vue, field type 'currency' -> <MoneyInput>, type
   'number' -> <QtyInput> (atau <MoneyInput> kalau field itu jelas uang —
   periksa pemakaiannya, jangan menebak dari nama tipe saja).

2. AUTO-CAPITALIZE DI FORM (pasangan tugas backend nomor 1).
   Di CrudFormPage.vue: field type 'text' yang ditandai uppercase: true
   pada FieldDef-nya diubah jadi HURUF BESAR saat blur, dan ditampilkan
   dengan CSS text-transform: uppercase saat mengetik supaya operator
   langsung melihat hasilnya.
   Tandai uppercase: true hanya pada field nama & alamat di skema master
   (useSimpleMasterSchema, useCustomerSchema, useSupplierSchema,
   useProductSchema, useWarehouseSchema, dan skema master kecil lain).
   JANGAN menandai email, kode, NPWP, telepon, keterangan bebas.

3. FIELD KODE OTOMATIS (Master Data poin 2 dari klien).
   Sekarang field Kode tampil sebagai input kosong dengan tombol
   "Bangkitkan" — operator mengira wajib diisi. Backend SUDAH membangkitkan
   otomatis kalau `code` tidak dikirim (generateSequenceCode /
   ProductsService.generateCode) — jadi ini murni perubahan tampilan,
   TIDAK ADA perubahan backend.
   Ubah di useSimpleMasterSchema.ts dan useProductSchema.ts:
   - default: field Kode read-only, isi placeholder "(otomatis saat disimpan)"
   - di sampingnya sakelar "Isi kode manual" yang membukanya
   - saat sakelar mati, form TIDAK mengirim key `code` sama sekali
     (transformOut yang sudah ada sudah benar — jangan diubah logikanya)
   - pada mode EDIT, kode yang sudah ada tetap tampil dan tetap read-only
     kecuali sakelar dinyalakan (dan untuk produk: tetap terkunci kalau
     isCodeLocked true, CLAUDE.md §3)

4. SIDEBAR DROPDOWN (General poin 1 dari klien).
   app/config/navigation.ts sekarang DATAR: judul grup dirender sebagai
   item bertipe 'label', bukan sebagai induk. Ubah jadi bersarang memakai
   `children` UNavigationMenu (Nuxt UI 4.10), sehingga tiap grup bisa
   dilipat.
   - default: SEMUA grup terbuka (klien minta default menampilkan semua
     menu + submenu)
   - status buka/tutup per grup disimpan di localStorage per pengguna
   - penyaringan roles yang sudah ada di layouts/default.vue WAJIB tetap
     jalan pada level anak, bukan cuma induk — grup yang seluruh anaknya
     tersaring habis TIDAK boleh muncul sebagai induk kosong.
     Ini penting: Supervisor hanya boleh melihat 3 item (CLAUDE.md §5).

DEFINITION OF DONE:
- Ketik 1350 di field harga faktur penjualan -> tampil 1.350 saat itu juga,
  tanpa blur; nilai terkirim ke API tetap number 1350
- Ketik 135000 -> tampil 135.000; caret tidak melompat ke ujung saat
  pemisah bertambah
- Paste "Rp 1.350.000" -> jadi 1350000
- Tidak ada lagi <UInputNumber> tersisa di app/ (grep membuktikannya)
- Ketik "toko abc" di nama pelanggan -> tampil TOKO ABC
- Form tambah Merek: field Kode read-only bertuliskan (otomatis saat
  disimpan); simpan -> kode terbit dari sequence
- Nyalakan "Isi kode manual", ketik MRK99 -> tersimpan MRK99
- Sidebar: tiap grup bisa dilipat, status bertahan setelah reload
- Login sebagai SUPERVISOR -> sidebar tetap hanya 3 item, tidak ada grup
  induk kosong
```

### ✅ Verifikasi R1

- [ ] Pemisah ribuan muncul saat mengetik di seluruh layar transaksi, caret tidak melompat
- [ ] `grep -r "UInputNumber" frontend/app` tidak menghasilkan apa pun
- [ ] Auto-capitalize jalan di FE dan di jalur API langsung
- [ ] Email/kode/NPWP/telepon **tidak** ikut dikapitalkan
- [ ] Field Kode default otomatis; sakelar manual berfungsi; kode produk terkunci tetap terkunci
- [ ] Sidebar bisa dilipat, default terbuka, status bertahan
- [ ] Sidebar Supervisor tetap 3 item, tanpa grup induk kosong
- [ ] Migration backfill `up`→`down`→`up` berhasil
- [ ] `./scripts/verify.sh` hijau

---

## R2 — Penamaan Produk

> 🛑 **Gerbang berhenti-dan-tanya.** Paket ini berdiri di atas asumsi **A5**: "Isi" =
> kolom **Ukuran** yang sudah ada (mis. `37`), bukan angka konversi satuan (isi per dus).
> Kalau klien menjawab bahwa yang dimaksud angka konversi, paket ini berubah dari
> *reorder* jadi *perubahan skema* — **berhenti dan tanya sebelum menulis migration.**

### 🔧 Backend

```
KONTEKS: Paket R2. Baca docs/RENCANA_REVISI_TESTING_KLIEN.md §2B A5 dulu.
Kalau A5 belum dikonfirmasi klien, kerjakan tetap dengan asumsi A5 TAPI
sebutkan di akhir bahwa hasilnya bergantung pada jawaban itu.

TUGAS (BACKEND):

1. buildDisplayName() di src/modules/products/products.service.ts:298
   sekarang menyusun: brandName, keterangan, kemasan, ukuranUom.
   Klien meminta urutan: Merk -> Kemasan -> Keterangan -> Isi -> Satuan.
   Karena `ukuranUom` menyimpan "Ukuran + UoM" sebagai satu string (FE sudah
   memisahnya jadi field `ukuran` + `ukuranUomPart` sejak Hari 8), urutan
   barunya jadi:
       brandName, kemasan, keterangan, ukuranUom
   Contoh hasil: "BENDERA SACHET PUTIH 37 GR" (kapital dari R1).

   Ubah HANYA urutan argumen dan urutan di dalam fungsi. JANGAN mengubah
   tipe kolom, jangan memecah ukuranUom jadi dua kolom — itu perubahan
   skema yang menunggu jawaban A5.

2. Migration backfill products.display_name untuk seluruh produk yang sudah
   ada, memakai urutan baru. Kolom ini TERINDEKS dan dipakai pencarian
   operator (CLAUDE.md §3) — kalau tidak di-backfill, produk lama dan baru
   beda bentuk dan operator tidak menemukan barangnya.
   Kalau R1 sudah dikerjakan, GABUNGKAN dengan backfill kapitalisasi R1
   jadi SATU migration — jangan menyentuh kolom yang sama dua kali.

3. Perbarui products.service.spec.ts — tes buildDisplayName yang ada
   sekarang menegakkan urutan LAMA dan akan merah. Ubah ekspektasinya,
   dan tambahkan satu kasus dengan keterangan kosong (harus tetap rapi
   tanpa spasi ganda).

ATURAN WAJIB HARI INI:
- JANGAN menyentuh products.code (barcode YYMMDDXXXX) — tidak ada
  hubungannya dengan nama, dan terkunci setelah produk dipakai (§3).
- JANGAN mengubah urutan field di entity — hanya urutan penggabungan.

DEFINITION OF DONE:
- POST /products (Bendera, kemasan Sachet, keterangan Putih, ukuran 37,
  uom gr) -> displayName "BENDERA SACHET PUTIH 37 GR"
- Produk tanpa keterangan -> "BENDERA SACHET 37 GR", tanpa spasi ganda
- SELECT display_name FROM products membuktikan produk lama sudah memakai
  urutan baru
- Migration up/down/up berhasil, npm run test hijau
```

### 🎨 Frontend

```
KONTEKS: Paket R2. Baca docs/PANDUAN_UI.md.

TUGAS (FRONTEND):
1. useProductSchema.ts: urutkan field form mengikuti urutan nama yang baru —
   Merek, Kemasan, Keterangan, Ukuran, Satuan(UoM). Sekarang urutannya
   Keterangan lebih dulu dari Kemasan.
2. Field displayNamePreview (yang sudah ada) WAJIB memakai urutan baru,
   sehingga operator melihat hasil akhirnya saat mengetik.
3. Urutan kolom di grid daftar produk (useProductColumns.ts) mengikuti
   urutan yang sama, kalau kolom-kolom itu ditampilkan terpisah.

DEFINITION OF DONE:
- Buka form tambah produk -> urutan field Merek, Kemasan, Keterangan,
  Ukuran, Satuan
- Preview nama berubah live dan cocok persis dengan displayName yang
  dikembalikan backend setelah simpan
```

### ✅ Verifikasi R2

- [ ] Urutan nama produk baru berlaku di backend, preview FE, dan data lama (backfill)
- [ ] Produk tanpa keterangan tidak menghasilkan spasi ganda
- [ ] Urutan field form dan kolom grid mengikuti
- [ ] `npm run test` hijau (spec `buildDisplayName` sudah diperbarui)
- [ ] Catatan tertulis: hasil paket ini bergantung pada konfirmasi A5

---

## R3 — Sisa Stok di Seluruh Layar Entri

> **Tiga keluhan berbeda, satu akar masalah.** `<StockBadge>` di Sales Order dan Faktur
> Pembelian menerima `:qty-base-unit="null"` **hardcoded** — dibuat Hari 19/14 saat endpoint
> saldo stok belum ada. Endpointnya sudah ada sejak Hari 20 dan sudah dipakai Faktur
> Penjualan; dua layar lain tidak pernah menyusul.

### 🎨 Frontend (tidak ada pekerjaan backend)

```
KONTEKS: Paket R3. Baca docs/PANDUAN_UI.md dan
docs/RENCANA_REVISI_TESTING_KLIEN.md §2B A4.

TIDAK ADA PEKERJAAN BACKEND. Endpoint GET /products/:id/stock-balance sudah
ada (products.controller.ts:42) dan sudah dipakai
penjualan/faktur/index.vue:366-383. Jangan membuat endpoint baru.

TUGAS (FRONTEND):

1. ANGKAT jadi composable bersama useStockBalance().
   Logika fetch di penjualan/faktur/index.vue baris 366-383 akan dipakai
   tiga layar. CLAUDE.md §6 melarang copy-paste — pindahkan ke
   app/composables/useStockBalance.ts, lalu pakai dari ketiga layar.
   Composable mengembalikan { qtyBaseUnit, loading, fetch(productId) }.
   Pertahankan perilaku yang sudah ada: gagal fetch -> null, bukan 0
   (nol berarti "stok habis", null berarti "belum tahu" — jangan disamakan).

2. PASANG di dua layar yang masih hardcoded null:
   - penjualan/order/index.vue:747  (<StockBadge :qty-base-unit="null">)
   - pembelian/faktur/index.vue:929 (<StockBadge :qty-base-unit="null">)
   Panggil fetch saat produk baris dipilih/diubah, sama seperti yang sudah
   dilakukan onLineProductChange di faktur penjualan.

3. SISA STOK TANPA DESIMAL (asumsi A4).
   Sekarang stockPanelRows di penjualan/faktur/index.vue membagi qty base
   dengan faktor satuan dan menghasilkan pecahan (mis. 12,5 dus).
   Klien: qty stok jangan desimal, cukup satuan terbesar.
   Ubah supaya menampilkan HANYA satuan terbesar, DIBULATKAN KE BAWAH,
   dan diberi tanda kalau ada sisa yang dibuang — mis. "12 dus +".
   Tanda "+" itu WAJIB: tanpa itu operator menyangka sisanya pas 12 dan
   mengambil keputusan salah saat stok mepet.
   Terapkan lewat computeQtyBreakdown.ts (app/utils/) dengan opsi baru
   (mis. `largestOnly: true`), BUKAN dengan menghitung sendiri di halaman.
   Berlaku ke ketiga layar sekaligus, supaya bentuknya seragam.

4. ALERT QTY > SISA STOK (Order Penjualan poin 3).
   Di Sales Order: kalau qty baris (dikonversi ke satuan dasar) melebihi
   sisa stok, tampilkan peringatan di dekat field qty.
   INI PERINGATAN, BUKAN PENOLAKAN. CLAUDE.md §2.8 mengizinkan stok minus
   secara sengaja, dan backend mengembalikan stockWarning, bukan error.
   Operator tetap boleh menyimpan. Jangan men-disable tombol Simpan.
   Pakai warna peringatan (bukan error) dan kalimat yang menyebut angkanya:
   "Qty melebihi sisa stok (sisa 12 dus). Boleh dilanjutkan."

5. VERIFIKASI SATUAN DEFAULT (Order Penjualan poin 1).
   Klien bilang default harus satuan terbesar (DUS). Di Sales Order
   onLineProductChange SUDAH mencari unit bernama 'dus' lebih dulu.
   Periksa apakah perilaku yang sama sudah ada di Faktur Penjualan dan
   Faktur Pembelian; kalau belum, samakan. Kalau produk tidak punya satuan
   bernama 'dus', pakai satuan dengan faktor TERBESAR, bukan yang pertama
   di daftar.

DEFINITION OF DONE:
- Sales Order: pilih produk -> SISA STOK menampilkan angka sungguhan, bukan "-"
- Faktur Pembelian: sama
- Produk dengan 12,5 dus -> tampil "12 dus +" di ketiga layar
- Produk dengan stok pas 12 dus -> tampil "12 dus" tanpa "+"
- Sales Order: qty 20 dus saat sisa 12 dus -> peringatan muncul, tombol
  Simpan TETAP aktif, dokumen tetap bisa disimpan
- Pilih produk di ketiga layar -> satuan default terisi DUS (atau satuan
  berfaktor terbesar)
- Tidak ada duplikasi logika fetch stok: grep menunjukkan hanya
  useStockBalance.ts yang memanggil /stock-balance
```

### ✅ Verifikasi R3

- [ ] Sisa stok tampil di Sales Order, Faktur Pembelian, dan Faktur Penjualan
- [ ] Format satuan terbesar bulat + tanda "+" saat ada sisa
- [ ] Peringatan qty > stok muncul dan **tidak** memblokir simpan
- [ ] Satuan default = satuan berfaktor terbesar di ketiga layar
- [ ] Hanya satu tempat yang memanggil `/stock-balance`
- [ ] `./scripts/verify.sh` hijau

---

## R4 — Alur SO → Faktur → Surat Jalan

> **Dua dari tiga poin di paket ini bukan fitur yang hilang, tapi jalan masuk yang tidak
> ketemu.** Surat Jalan sudah lengkap sejak Hari 24–25 (modul `delivery-orders`, 3 halaman,
> cetak A5, kunci cetak); tester tidak menemukannya karena satu-satunya pintu ada di detail
> faktur `PENGIRIMAN`. Mulai paket ini dengan **reproduksi bersama tester**, bukan langsung
> menulis kode — khususnya untuk FP2.

### 🎨 Frontend (tidak ada pekerjaan backend)

```
KONTEKS: Paket R4. Baca docs/PANDUAN_UI.md.

TIDAK ADA PEKERJAAN BACKEND. Semua yang dibutuhkan sudah ada:
- SalesOrdersService.markConverted() (sales-orders.service.ts:256) sudah
  dipanggil SalesInvoicesService saat dto.salesOrderId dikirim
  (sales-invoices.service.ts:399-401)
- assertChannelSalesOrderRequirement() sudah menegakkan SO wajib untuk
  saluran PENGIRIMAN
- Modul delivery-orders lengkap sejak Hari 24-25
Jangan membuat endpoint /sales-orders/:id/convert-to-invoice — konversi
adalah primitif internal, bukan endpoint publik (lihat komentar di
sales-orders.controller.ts).

TUGAS (FRONTEND):

0. REPRODUKSI DULU, BARU PERBAIKI (untuk tugas 2).
   Buat satu Sales Order berstatus OPEN untuk satu pelanggan, lalu buka
   entri Faktur Penjualan, pilih pelanggan itu, pilih saluran Pengiriman.
   Laporkan APA YANG SEBENARNYA TERJADI sebelum mengubah kode: dropdown
   kosong? disabled? request gagal? Baru sesudah itu perbaiki.

1. "JADIKAN FAKTUR" (Order Penjualan poin 4).
   penjualan/order/index.vue baris ~543-551: tombolnya ada tapi disabled
   dengan tooltip "Menyusul Hari 21 - modul Faktur Penjualan belum tersedia."
   Modul itu sudah ada sejak lama. Aktifkan:
   - klik -> buka entri Faktur Penjualan dengan isi ter-prefill dari SO:
     pelanggan, saluran PENGIRIMAN, salesman, salesOrderId, dan SELURUH
     baris (produk, qty, satuan, harga)
   - operator masih bisa mengubah apa pun sebelum menyimpan — SO tidak
     mengikat stok maupun harga (CLAUDE.md §3 "Sales Order tidak menahan stok")
   - setelah faktur tersimpan, SO otomatis jadi CONVERTED (backend yang
     melakukannya; FE cukup me-refresh daftar SO)
   - tombol hanya muncul saat status SO = OPEN
   Cara prefill: pilih mekanisme yang paling sederhana dan tahan reload —
   query param + fetch SO di halaman faktur lebih baik daripada menitipkan
   objek besar lewat state navigasi. Jelaskan pilihanmu.

2. PEMILIHAN SO DI FAKTUR PENGIRIMAN (Faktur Penjualan poin 2).
   penjualan/faktur/index.vue baris 262-272. Dua hal WAJIB diperbaiki
   apa pun hasil reproduksi:
   a. `catch { salesOrderOptions.value = [] }` MENELAN error diam-diam.
      Ganti jadi menampilkan pesannya ke operator. Dropdown kosong karena
      "tidak ada SO terbuka" dan karena "request gagal" sekarang terlihat
      sama persis — itu yang membuat tester bingung.
   b. Dropdown `:disabled="!customerId"` memaksa urutan pelanggan-dulu.
      Balik alurnya: izinkan memilih SO LEBIH DULU, dan saat SO dipilih,
      pelanggan + salesman terisi otomatis dari SO itu. Kalau pelanggan
      sudah dipilih duluan, perilaku sekarang (menyaring SO milik
      pelanggan itu) tetap dipertahankan.
   Tambahkan juga pesan kosong yang informatif: "Tidak ada Sales Order
   terbuka untuk pelanggan ini." — bukan dropdown kosong tanpa penjelasan.

3. SURAT JALAN BISA DITEMUKAN (Surat Jalan poin 1).
   Modulnya SUDAH ADA. Yang kurang jalan masuknya:
   - di penjualan/faktur/index.vue (DAFTAR faktur): tambah tombol/aksi
     "Buat Surat Jalan" untuk baris faktur bersaluran PENGIRIMAN yang
     belum punya SJ, mengarah ke alur yang sudah ada di
     penjualan/faktur/[id]/index.vue (openDeliveryOrderModal)
   - di penjualan/surat-jalan/index.vue: ganti ketiadaan tombol Entri
     dengan penjelasan yang terlihat (mis. baris info di toolbar):
     "Surat Jalan dibuat dari Faktur Penjualan bersaluran Pengiriman."
     plus tautan ke daftar faktur. Jangan menambah tombol Entri di sini —
     SJ memang harus lahir dari faktur.

DEFINITION OF DONE:
- SO status OPEN -> tombol "Jadikan Faktur" aktif; klik -> entri faktur
  terbuka dengan pelanggan, saluran PENGIRIMAN, salesman, dan semua baris
  sudah terisi
- Simpan faktur itu -> SO berubah jadi CONVERTED, dan tombol "Jadikan
  Faktur" hilang dari SO tersebut
- Di entri faktur: pilih saluran Pengiriman TANPA memilih pelanggan ->
  dropdown SO tetap bisa dibuka; pilih SO -> pelanggan terisi otomatis
- Matikan backend, buka dropdown SO -> muncul pesan error yang terbaca,
  bukan dropdown kosong senyap
- Pelanggan tanpa SO terbuka -> pesan "Tidak ada Sales Order terbuka
  untuk pelanggan ini."
- Dari DAFTAR faktur, faktur PENGIRIMAN tanpa SJ -> ada aksi "Buat Surat
  Jalan" yang berfungsi
- Halaman daftar Surat Jalan menjelaskan dari mana SJ dibuat
```

### ✅ Verifikasi R4

- [ ] Hasil reproduksi FP2 dilaporkan sebelum kode diubah
- [ ] "Jadikan Faktur" berfungsi, prefill lengkap, SO jadi CONVERTED
- [ ] SO bisa dipilih lebih dulu; pelanggan terisi otomatis
- [ ] Error dropdown SO tidak lagi ditelan diam-diam
- [ ] Surat Jalan punya jalan masuk yang terlihat dari daftar faktur
- [ ] `./scripts/verify.sh` hijau

---

## R5 — Faktur Penjualan: Diskon, Kunci Harga, Cetak

> ⚠️ **Mencabut dua aturan tertulis CLAUDE.md §3** sekaligus: pola Ctrl+H/Ctrl+D "yang
> dipertahankan dari sistem lama", dan keberadaan diskon penjualan. Keduanya keputusan
> klien langsung di sesi testing. Perbarui `CLAUDE.md` di paket yang sama.

### 🔧 Backend

```
KONTEKS: Paket R5. Baca docs/RENCANA_REVISI_TESTING_KLIEN.md §2B A1 dulu.

TUGAS (BACKEND):

1. DISKON PENJUALAN DI-DROP (keputusan A1: kolom DIPERTAHANKAN, dipaksa 0).
   Klien: "Dalam penjualan, tidak ada diskon penjualan. Drop."
   Alasannya masuk akal — harga diketik bebas per pelanggan (CLAUDE.md §3),
   jadi diskon jadi jalur kedua untuk hal yang sama.

   JANGAN menghapus kolom discount_percent/discount_amount dari
   sales_invoices dan sales_invoice_lines. Faktur lama yang sudah terlanjur
   punya diskon harus tetap bisa dibaca, diretur, dan dicetak ulang.
   Yang dilakukan:
   - CreateSalesInvoiceDto + CreateSalesInvoiceLineDto: tolak 400 kalau
     diskon dikirim dengan nilai != 0, dengan pesan berbahasa Indonesia
     ("Diskon penjualan sudah tidak dipakai — masukkan harga bersih
     langsung di kolom Harga.")
   - Perhitungan di sales-invoices.service.ts tetap utuh (nilainya nol,
     jadi hasilnya sama) — JANGAN membongkar rumus brutonya. Kalau diskon
     selalu 0, baris jurnal Diskon Penjualan otomatis tidak terbentuk
     karena JournalPoster menolak baris bernilai nol di kedua sisi.
     BUKTIKAN itu benar dengan tes, jangan diasumsikan.
   - Migration: nonaktifkan akun 04.110.00003 Diskon Penjualan
     (is_active = false). JANGAN dihapus — jurnal lama menunjuk ke sana.
   - Retur penjualan: pastikan retur atas faktur LAMA yang punya diskon
     tetap menghitung dengan benar. Ini yang paling mungkin pecah.

2. Perbarui sales-invoices.service.spec.ts: tambah kasus "diskon != 0
   ditolak 400", dan kasus "retur atas faktur lama berdiskon tetap benar".

ATURAN WAJIB HARI INI:
- JANGAN menyentuh diskon PEMBELIAN di paket ini — itu R7, dan bentuknya
  berbeda (diskon faktur tetap ada, hanya pindah ke pendapatan lain).
- JANGAN menghapus kolom apa pun.

DEFINITION OF DONE:
- POST /sales-invoices dengan discountAmount 5000 -> 400 dengan pesan
  berbahasa Indonesia
- POST /sales-invoices tanpa diskon -> 201, jurnal TIDAK memuat baris
  Diskon Penjualan sama sekali
- Retur atas faktur lama yang punya diskon -> nilai retur benar
- SELECT is_active FROM chart_of_accounts WHERE code='04.110.00003' -> false
- npm run test hijau
```

### 🎨 Frontend

```
KONTEKS: Paket R5. Baca docs/PANDUAN_UI.md.

TUGAS (FRONTEND):

1. HILANGKAN DISKON DARI SELURUH LAYAR PENJUALAN.
   - penjualan/faktur/index.vue: field diskon baris (persen & rupiah),
     field diskon faktur, tombol mode diskon (setLineDiscountMode), dan
     baris Diskon di TotalsBar
   - app/utils/salesInvoiceCalc.ts: sederhanakan — subtotal = jumlah baris,
     tidak ada pengurangan diskon. Pertahankan fungsi bentuknya supaya
     pemanggil lain tidak pecah.
   - penjualan/faktur/[id]/cetak.vue: HAPUS kolom Disc% dan DiscRp dari
     tabel nota. Lebar kolom sisanya disesuaikan — nota A5 sempit dan dua
     kolom yang hilang adalah ruang yang berguna untuk nama produk.
   - penjualan/faktur/[id]/index.vue: hilangkan tampilan diskon di detail
   - layar retur penjualan: sesuaikan kalau menampilkan diskon faktur asal

2. HAPUS LOCK HARGA & DISKON (Faktur Penjualan poin 4).
   penjualan/faktur/index.vue: hapus hargaLocked, diskonLocked,
   unlockDiskon(), dan hotkey Ctrl+H / Ctrl+D. Field harga langsung bisa
   diketik begitu baris dibuka.
   Hapus juga baris hotkey "Ubah Harga: Ctrl + H - Ubah Diskon: Ctrl + D"
   dari template #hotkeys LineModal.
   Periksa useDocumentHotkeys.ts — kalau Ctrl+H/Ctrl+D terdaftar di sana,
   cabut pendaftarannya juga, jangan hanya menyembunyikan tampilannya.

3. PPN NOL TIDAK DICETAK (Faktur Penjualan poin 5).
   Catatan hasil telusur: nota faktur penjualan TIDAK mencetak PPN sama
   sekali. Yang mencetak "PPN Keluaran : 0" adalah nota RETUR PENJUALAN
   (penjualan/retur/[id]/cetak.vue:322). Klien kemungkinan melihat lembar
   itu.
   Terapkan aturan seragam ke SEMUA template cetak: baris PPN hanya
   dicetak kalau nilainya > 0. Berlaku untuk nota retur penjualan, retur
   pembelian, nota pembelian, dan kwitansi.
   Selama settings.company_is_pkp = false, PPN keluaran selalu 0
   (CLAUDE.md §2.11) sehingga barisnya tidak pernah muncul — tapi
   implementasinya berdasar NILAI, bukan berdasar flag, supaya begitu
   klien jadi PKP barisnya muncul sendiri tanpa perubahan kode.

DEFINITION OF DONE:
- Entri faktur penjualan: tidak ada field diskon di mana pun
- Field harga bisa langsung diketik tanpa menekan Ctrl+H
- Ctrl+H dan Ctrl+D tidak melakukan apa pun lagi
- Cetak nota penjualan: tidak ada kolom Disc% / DiscRp
- Cetak nota retur penjualan saat PPN 0: baris PPN TIDAK muncul
- Set nilai PPN > 0 secara manual di data uji -> baris PPN muncul kembali
```

### ✅ Verifikasi R5

- [ ] Diskon hilang dari seluruh layar dan nota penjualan; API menolak diskon != 0
- [ ] Faktur lama berdiskon tetap bisa dibuka, dicetak ulang, dan diretur dengan benar
- [ ] Ctrl+H / Ctrl+D tercabut, bukan sekadar disembunyikan
- [ ] Baris PPN nol tidak dicetak di semua template; muncul lagi kalau nilainya > 0
- [ ] Akun `04.110.00003` nonaktif, tidak dihapus
- [ ] `CLAUDE.md` §3 (Ctrl+H/Ctrl+D) dan §4 (jurnal penjualan) sudah diperbarui
- [ ] `./scripts/verify.sh` hijau

---

## R7 — Faktur Pembelian: Diskon & Nomor Supplier

> ⚠️ **Dikerjakan SEBELUM R6.** Lihat §Cara Pakai.
>
> **Paket ini menghapus lebih banyak kode daripada menambah.** Keputusan K5 mencabut diskon
> baris pembelian sepenuhnya, sehingga `harga_pokok = qty × harga` — bulat persis, tanpa
> alokasi pro-rata, tanpa "sisa pembulatan ke baris terakhir". Inilah yang menyelesaikan
> keluhan "harga produk jadi tidak bulat" di akarnya. Rumus & jurnal lengkap ada di
> `RENCANA_REVISI_TESTING_KLIEN.md` §2A.

### 🔧 Backend

```
KONTEKS: Paket R7. WAJIB baca docs/RENCANA_REVISI_TESTING_KLIEN.md §2A
(K5, K6, dan blok "Rumus & jurnal pembelian setelah K5+K6") sebelum menulis
kode. Rumus barunya sudah ditulis lengkap di sana — tugas ini
memindahkannya ke kode, bukan merancang ulang.

TUGAS (BACKEND):

1. AKUN BARU (K6) — migration:
   07.110.00005  Diskon Pembelian
   - parent: 07.110.00000 Pendapatan Lain-lain
   - account_type INCOME, account_subtype OTHER_INCOME
   - normal_balance CREDIT, is_postable true
   Copy pola INSERT persis dari akun 07.110.00001/00002/00003 di migration
   1785080602948 (RestructureChartOfAccountsV2). Tambahkan juga flag
   singleton is_purchase_discount_account (pola sama is_payment_diff_account
   yang sudah ada) supaya service tidak mencari akun lewat string kode.

2. HAPUS DISKON BARIS PEMBELIAN (K5).
   Perlakuan sama seperti diskon penjualan di R5 (asumsi A1): kolom
   discount_percent/discount_amount di purchase_invoice_lines
   DIPERTAHANKAN, dipaksa 0, DTO menolak nilai != 0 dengan pesan
   berbahasa Indonesia. Faktur pembelian lama harus tetap terbaca.

3. DISKON FAKTUR: RUPIAH SAJA, TIDAK MENYENTUH HARGA POKOK (K5).
   Di purchase-invoices.service.ts dan app/utils/purchaseInvoiceCalc.ts,
   HAPUS (bukan ubah):
   - alokasi pro-rata diskon faktur ke baris (langkah 5-6 rumus lama §4)
   - aturan "sisa pembulatan dibebankan ke baris terakhir"
   - mode diskon PERSEN di tingkat faktur (rupiah saja sekarang)
   Rumus baru (dari §2A):
     baris[i]       = qty x harga
     subtotal       = SUM(baris[i])
     ppn_masukan[i] = (supplier.is_pkp && product.is_bkp) ? baris[i] x rate : 0
     harga_pokok[i] = baris[i] + (company_is_pkp ? 0 : ppn_masukan[i])
     lot.unit_cost  = harga_pokok[i] / qty base unit      <- eksak
     total_bayar    = subtotal + SUM(ppn_masukan) - diskon_faktur

   Jurnal baru (company_is_pkp = false):
     Persediaan        (D) SUM(harga_pokok)
         Hutang Usaha      (K) total_bayar
         Diskon Pembelian  (K) diskon_faktur
   Baris Diskon Pembelian HANYA dibuat kalau diskon_faktur > 0.

   Baris bonus TIDAK berubah: baris = 0, PPN 0, lot.unit_cost = 0, qty
   tetap masuk stok penuh (CLAUDE.md §3 "Bonus dari supplier").

4. supplier_invoice_no JADI OPSIONAL (asumsi A3, bukan dihapus).
   - migration: ALTER TABLE purchase_invoices ALTER COLUMN
     supplier_invoice_no DROP NOT NULL
   - CreatePurchaseInvoiceDto / UpdatePurchaseInvoiceDto: @IsOptional()
   - purchase-invoices.service.ts:430 — pencarian
     `invoice.supplierInvoiceNo ILIKE :search` harus tahan NULL
     (baris dengan nilai NULL tidak boleh membuat query gagal atau
     menghilangkan faktur dari hasil pencarian nomor internal)

5. Perbarui purchase-invoices.service.spec.ts:
   - kasus diskon faktur 100.000 -> unit_cost lot TIDAK berubah, jurnal
     memuat baris Diskon Pembelian 100.000 di kredit
   - kasus diskon faktur 0 -> TIDAK ada baris Diskon Pembelian
   - kasus diskon baris != 0 -> 400
   - kasus supplierInvoiceNo kosong -> 201
   - kasus baris bonus tetap unit_cost 0

ATURAN WAJIB HARI INI:
- RUMUS BARU BERLAKU MAJU. Lot yang sudah terbentuk dengan rumus lama
  TIDAK dihitung ulang. Jangan menulis migration yang menyentuh
  stock_cost_lots.unit_cost — nilai persediaan yang sudah terposting akan
  berubah tanpa jurnal, dan itu melanggar seluruh premis §2.
  Catat tanggal berlakunya di PROGRESS.md §3.
- Konsekuensi akuntansi yang DISENGAJA: persediaan kini tercatat sebelum
  diskon faktur, jadi lebih tinggi dari uang yang dibayar ke supplier, dan
  margin penjualan berikutnya tampak lebih tipis. Ini pilihan klien.
  JANGAN "memperbaikinya" — pola sama catatan lot bonus di §3.
- WAJIB tulis ulang CLAUDE.md §3 ("Pembelian", "Bonus dari supplier" bagian
  alokasi diskon) dan §4 ("Faktur Pembelian") di paket yang sama. Kalau
  tidak, aturan tertulis dan kode bertentangan, dan sesi berikutnya akan
  membangun di atas rumus yang sudah mati.

DEFINITION OF DONE:
- Faktur pembelian 10 dus x Rp 125.000, diskon faktur Rp 100.000:
  -> lot.unit_cost = 125.000 / (isi per dus), BULAT, tidak terpengaruh diskon
  -> jurnal: Persediaan D 1.250.000 | Hutang K 1.150.000 | Diskon
     Pembelian K 100.000
  -> SUM(debit) = SUM(credit) (invarian)
- Faktur tanpa diskon -> tidak ada baris Diskon Pembelian di jurnal
- Faktur dengan diskon baris != 0 -> 400
- POST tanpa supplierInvoiceNo -> 201
- Pencarian faktur tetap berfungsi saat ada baris ber-supplier_invoice_no NULL
- SELECT dari chart_of_accounts membuktikan 07.110.00005 ada dan postable
- Migration up/down/up berhasil, npm run test hijau
- CLAUDE.md §3 & §4 sudah memuat rumus baru
```

### 🎨 Frontend

```
KONTEKS: Paket R7. Baca docs/PANDUAN_UI.md dan
docs/RENCANA_REVISI_TESTING_KLIEN.md §2A.

TUGAS (FRONTEND):

1. app/utils/purchaseInvoiceCalc.ts — port rumus baru dari backend
   (lihat §2A). Hapus perhitungan allocatedInvoiceDiscount sepenuhnya.
   File ini adalah port murni rumus backend; keduanya WAJIB cocok, jadi
   bandingkan hasilnya dengan response API pada satu faktur uji.

2. pembelian/faktur/index.vue:
   - hapus field diskon BARIS (persen & rupiah) dari modal baris
   - diskon FAKTUR: hanya rupiah, hapus opsi persen
   - field "No. Faktur Supplier" (baris ~642) TIDAK lagi wajib; hapus
     validasi `if (!supplierInvoiceNo.value.trim()) return '...'`
     (baris ~388). Beri hint: "Boleh dikosongkan kalau supplier tidak
     menerbitkan nota."
   - hapus kolom 'supplierInvoiceNo' dari daftar (baris ~116); tetap
     tampil di halaman detail

3. PREVIEW KALKULASI BARIS (Faktur Pembelian poin 4).
   Sekarang <InfoStrip> merender semuanya dalam SATU baris dipisah "|"
   dengan text-sm (pembelian/faktur/index.vue baris ~933-939). Klien minta
   font lebih besar dan satu komponen per baris:

       Subtotal Baris: 125.000.000
       PPN Baris: 0

   - tambahkan varian `stacked` ke app/components/InfoStrip.vue (prop baru,
     JANGAN fork komponennya — CLAUDE.md §6)
   - font naik ke text-base, label dan nilai sejajar kiri-kanan
   - baris "Alokasi Diskon Faktur" HILANG — konsepnya sudah tidak ada
     lagi setelah K5. Jangan menampilkannya bernilai 0.

4. Halaman detail & nota pembelian: sesuaikan tampilan diskon (rupiah saja,
   tanpa diskon baris), dan terapkan aturan PPN-nol-tidak-dicetak dari R5
   kalau nota pembelian belum ikut.

DEFINITION OF DONE:
- Entri faktur pembelian: tidak ada field diskon baris; diskon faktur hanya rupiah
- Simpan tanpa No. Faktur Supplier -> berhasil
- Preview Kalkulasi Baris tampil bertumpuk, font lebih besar, tanpa baris
  "Alokasi Diskon Faktur"
- Angka preview FE cocok persis dengan response backend untuk faktur uji
  yang sama (bandingkan langsung, jangan asumsikan)
- Kolom No. Faktur Supplier hilang dari grid daftar, masih ada di detail
```

### ✅ Verifikasi R7

- [ ] Akun `07.110.00005 Diskon Pembelian` ada, postable, punya flag singleton
- [ ] `lot.unit_cost` bulat dan tidak terpengaruh diskon faktur
- [ ] Jurnal memuat baris Diskon Pembelian hanya saat diskon > 0; debit = kredit
- [ ] Diskon baris ditolak 400; faktur lama berdiskon baris tetap terbaca
- [ ] `supplier_invoice_no` opsional; pencarian tahan NULL
- [ ] Lot lama **tidak** dihitung ulang; tanggal berlaku tercatat di `PROGRESS.md` §3
- [ ] `purchaseInvoiceCalc.ts` cocok dengan backend pada faktur uji
- [ ] Preview Kalkulasi Baris bertumpuk, tanpa baris alokasi diskon
- [ ] **`CLAUDE.md` §3 dan §4 sudah ditulis ulang**
- [ ] `./scripts/verify.sh` hijau

---

## R6 — Revisi di Tempat Faktur Penjualan & Pembelian

> ⚠️ **Paket paling berisiko di seluruh putaran ini.** Menyentuh jurnal, FIFO, dan stok pada
> dokumen yang sudah diposting. **Jangan dikerjakan sebelum R7 selesai** — mesin revisi harus
> berdiri di atas rumus pembelian yang final.
>
> **Bentuknya sudah terkunci K1–K4**, jangan dirancang ulang:
> K1 revisi di tempat (nomor tetap, `revision_number++`) · K2 jurnal bertanggal dokumen asli ·
> K3 jendela 2 hari (§2.9) · K4 belum dicetak = tanpa persetujuan, sudah dicetak = lewat
> kunci cetak yang sudah ada.
>
> **Yang PALING sering salah dikerjakan di paket seperti ini:** membangun mesin persetujuan
> baru. Jangan. `PrintLockService` + `ActionType.UNLOCK_PRINT` + `intent: EDIT` sudah lengkap
> sejak Hari 15, dan sudah menaikkan `revision_number` khusus untuk `intent = EDIT`
> (`print-lock.service.ts:184`).

### 🔧 Backend

```
KONTEKS: Paket R6, dikerjakan SETELAH R7. WAJIB baca
docs/RENCANA_REVISI_TESTING_KLIEN.md §2A (K1-K4) dan §3 R6 sebelum menulis
kode. Bentuknya sudah diputuskan — tugas ini memindahkannya ke kode.

BACA DULU dan laporkan isinya sebelum mulai:
- src/core/void/void.service.ts (voidDocument: urutan balik jurnal + stok)
- src/core/stock-recorder/stock-recorder.service.ts (reverseIn, reverseOut,
  assertLotsUnconsumed)
- src/core/print-lock/print-lock.service.ts (preflight, consume, baris 184)
- src/core/period-lock/period-lock-validator.service.ts (validate +
  maxDaysOverride yang sudah ada sejak Hari 17)
Mesin revisi ini SEBAGIAN BESAR menyusun ulang potongan yang sudah ada,
bukan menulis primitif baru. Kalau kamu merasa perlu menulis pembalik
jurnal atau pembalik stok sendiri, berhenti — berarti ada yang terlewat.

TUGAS (BACKEND):

1. DocumentReviseService baru di src/core/document-revise/.
   Menerima EntityManager dari pemanggil (CLAUDE.md §6), stateless seperti
   VoidEngineService. Satu method:
     revise({ sourceType, sourceId, userId, manager, applyChanges })
   Urutan WAJIB, seluruhnya dalam SATU transaction:

   a. Kunci dokumen (SELECT ... FOR UPDATE). Tolak kalau posting_status
      sudah VOIDED.
   b. PeriodLockValidator.validate(tanggal_dokumen_asli, manager) —
      inilah yang menegakkan jendela 2 hari (K3). JANGAN menulis
      pemeriksaan tanggal sendiri di modul; §2.9 mewajibkan satu titik masuk.
      Pesan errornya WAJIB menyebut jalan keluarnya, bukan cuma menolak:
        "Faktur berumur lebih dari 2 hari tidak bisa direvisi. Gunakan
         VOID lalu terbitkan faktur baru."
   c. Untuk FAKTUR PEMBELIAN: panggil
      StockRecorderService.assertLotsUnconsumed('PURCHASE_INVOICE',
      sourceId, manager, pesan) — lot yang barangnya sudah terjual TIDAK
      bisa dibalik. Ini sudah jadi perilaku VOID (purchase-invoice-void.hook.ts:28),
      jadi revisi mewarisi batas yang sama. Pesannya harus jelas:
        "Barang dari faktur ini sudah terjual sebagian — tidak bisa
         direvisi. Gunakan Retur Pembelian."
   d. Balik jurnal lama + gerakan stok lama, memakai reverseIn/reverseOut
      yang sudah ada. BEDA PENTING dari VOID: jurnal pembalik di sini
      bertanggal TANGGAL DOKUMEN ASLI (K2), bukan hari ini.
      VOID tetap bertanggal hari ini — jangan menyeragamkan keduanya.
   e. applyChanges(manager) — modul menulis ulang baris & headernya sendiri.
   f. Posting ulang lewat JournalPosterService + StockRecorderService yang
      SAMA dengan transaksi biasa, entryDate = tanggal dokumen asli.
      TIDAK ADA jalur khusus yang menulis langsung ke tabel (prinsip yang
      sama dengan Saldo Awal, CLAUDE.md §3).
   g. revision_number++ (kecuali sudah dinaikkan PrintLockService.consume()
      untuk dokumen PRINTED — jangan menaikkan dua kali).

2. GERBANG OTORISASI — PAKAI YANG SUDAH ADA (K4).
   - posting_status POSTED + print_status NOT_PRINTED -> revisi langsung
     boleh, tanpa persetujuan
   - print_status PRINTED -> wajib PrintLockService.preflight/consume
     dengan ActionType.UNLOCK_PRINT + intent 'EDIT' lebih dulu, persis
     seperti alur edit yang sudah ada di Hari 15/22
   TIDAK ADA ActionType baru. TIDAK ADA payload matcher baru.
   Kalau kamu merasa butuh keduanya, baca ulang K4.

3. PERLUAS DTO EDIT.
   UpdateSalesInvoiceDto sekarang hanya salesmanId + termDays; sengaja
   sempit (baca komentarnya). Perluas ke header + BARIS penuh:
   - sales: customerId, salesChannel, salesOrderId, salesmanId, invoiceDate,
     termDays, lines[] (produk, qty, satuan, harga)
   - purchase: supplierId, receiptDate, supplierInvoiceDate, termin,
     supplierInvoiceNo (opsional setelah R7), lines[]
   80-90% kesalahan lapangan adalah salah harga atau salah pelanggan
   (kata klien), jadi keduanya WAJIB bisa diubah.

4. DUA JEBAKAN YANG WAJIB DITANGANI:
   a. AKUN PIUTANG. Kalau customerId berubah, akun piutang ikut berubah.
      WAJIB lewat ArAccountResolverService (src/core/receivables/) —
      CLAUDE.md §3 menyebut "lima tempat menyentuh akun piutang", dan
      revisi menjadikannya ENAM. Satu saja yang menulis akun default
      langsung, saldo pelanggan bocor tanpa error apa pun.
      Perbarui daftar lima->enam itu di CLAUDE.md §3.
   b. BATAS JUAL DI BAWAH HARGA POKOK (§2.17). WAJIB dievaluasi ulang
      pada harga HASIL revisi. Tanpa ini revisi jadi pintu belakang:
      simpan dengan harga aman, lalu revisi ke harga rugi tanpa otorisasi.
      Pakai jalur SELL_BELOW_COST yang sudah ada, satu permintaan per
      faktur (bukan per baris).

5. Endpoint: PATCH /sales-invoices/:id/revise dan
   PATCH /purchase-invoices/:id/revise. Roles: MASTER, OPERATOR
   (sama seperti create — operator memang yang memperbaiki, CLAUDE.md §5:
   supervisor tidak pernah menulis ke faktur).
   audit_logs WAJIB mencatat before/after lengkap (§2.12: strip password/token).

6. INVARIAN. Tambahkan kasus revisi ke 5 invarian Hari 11 (BUKAN file test
   terpisah):
   - setelah revisi: SUM(debit) = SUM(credit)
   - saldo stok = SUM(stock_movements)
   - nilai persediaan = SUM(lot.qty_remaining x unit_cost)
   - stock_cost_lots.qty_remaining TIDAK PERNAH negatif
   - revisi dua kali berturut-turut tetap konsisten (revision_number = 2)

ATURAN WAJIB HARI INI:
- JANGAN mengubah perilaku VOID. VOID tetap bertanggal hari ini (§2.2).
  Revisi bertanggal dokumen asli (K2). Dua jalur, dua aturan tanggal.
  Tulis perbedaan ini EKSPLISIT di CLAUDE.md §2.2 — kalau tidak, sesi
  berikutnya akan menyeragamkannya dan merusak salah satunya.
- JANGAN melonggarkan PeriodLockValidator secara global untuk mengakomodasi
  revisi. Jendelanya memang 2 hari (K3).
- JANGAN membuat mesin persetujuan baru (K4).

DEFINITION OF DONE:
- Faktur penjualan hari ini, NOT_PRINTED: PATCH /revise mengubah harga satu
  baris -> 200, revision_number 1, jurnal lama terbalik + jurnal baru,
  KEDUANYA bertanggal tanggal faktur asli (bukan hari ini)
- Setelah revisi itu: SUM(debit)=SUM(credit), saldo stok cocok, nilai
  persediaan cocok (buktikan dengan query, bukan klaim)
- Faktur yang sudah PRINTED: PATCH /revise tanpa token -> 412 dengan
  kontrak step-up yang sama seperti sebelumnya; setelah UNLOCK_PRINT
  intent EDIT disetujui -> 200
- Faktur bertanggal 5 hari lalu -> 400 dengan pesan yang MENYEBUT jalan
  keluarnya (VOID + faktur baru)
- Revisi mengubah customerId -> jurnal baru memakai akun piutang milik
  pelanggan BARU (buktikan lewat ar_account_id pelanggan itu)
- Revisi menurunkan harga di bawah harga pokok -> 412 SELL_BELOW_COST
- Faktur PEMBELIAN yang barangnya sudah terjual sebagian -> 400 dengan
  pesan yang menyarankan Retur Pembelian
- Faktur VOIDED -> PATCH /revise ditolak
- npm run test hijau termasuk invarian baru
```

### 🎨 Frontend

```
KONTEKS: Paket R6. Baca docs/PANDUAN_UI.md.

TUGAS (FRONTEND):

1. LAYAR EDIT PENUH untuk faktur penjualan dan pembelian.
   Sekarang halaman detail hanya punya modal edit dua field
   (penjualan/faktur/[id]/index.vue). Ganti dengan layar entri yang SAMA
   dengan entri baru (komponen yang sama, mode 'edit'), ter-prefill dari
   faktur, termasuk seluruh baris.
   JANGAN membuat form kedua yang mirip — CLAUDE.md §6 melarang fork.

2. ALUR PERSETUJUAN mengikuti K4, dan operator harus melihat bedanya:
   - faktur BELUM dicetak: tombol "Ubah" langsung membuka layar edit
   - faktur SUDAH dicetak: tombol "Ubah" memicu alur UNLOCK_PRINT yang
     SUDAH ADA (StepUpDialog + intent EDIT), baru setelah disetujui layar
     edit terbuka
   Tampilkan badge "Revisi ke-N" di header detail (revisionNumber sudah
   ada di response).

3. PESAN GAGAL YANG BISA DITINDAKLANJUTI. Ini bagian yang paling mudah
   dianggap sepele dan paling berpengaruh di lapangan:
   - faktur > 2 hari: tampilkan penolakan BERSAMA tombol/tautan ke alur
     VOID, dengan kalimat "Faktur ini terlalu lama untuk direvisi.
     Batalkan (VOID) lalu terbitkan faktur baru."
   - faktur pembelian yang barangnya sudah terjual: arahkan ke Retur Pembelian
   Operator yang merasa buntu akan mencari jalan pintas — jalan keluarnya
   wajib ada di layar, bukan cuma di dokumen.

4. Nota hasil revisi WAJIB mencantumkan nomor revisi (CLAUDE.md §2.16).
   Periksa penjualan/faktur/[id]/cetak.vue — kalau revisionNumber > 0
   belum tercetak, tambahkan.

DEFINITION OF DONE:
- Faktur belum dicetak: klik Ubah -> layar entri penuh terbuka ter-prefill,
  ubah harga & pelanggan -> simpan -> detail menampilkan "Revisi ke-1"
- Faktur sudah dicetak: klik Ubah -> StepUpDialog muncul; setelah
  disetujui, layar edit terbuka
- Faktur 5 hari lalu: pesan penolakan muncul BERSAMA jalan keluar VOID
- Cetak faktur hasil revisi -> nomor revisi tercetak di nota
```

### ✅ Verifikasi R6

- [ ] R7 sudah selesai sebelum paket ini dimulai
- [ ] Jurnal revisi bertanggal **dokumen asli**; VOID tetap bertanggal hari ini
- [ ] Jendela 2 hari ditegakkan lewat `PeriodLockValidator`, bukan cek tanggal baru di modul
- [ ] Pesan penolakan > 2 hari menyebut jalan keluar (VOID + faktur baru), di API dan di layar
- [ ] Tidak ada `ActionType` baru dan tidak ada payload matcher baru
- [ ] Ganti pelanggan memakai `ArAccountResolverService`; daftar "lima tempat" di CLAUDE.md §3 jadi enam
- [ ] Batas jual di bawah harga pokok dievaluasi ulang pada harga hasil revisi
- [ ] Faktur pembelian dengan lot terkonsumsi ditolak dengan saran Retur Pembelian
- [ ] Invarian revisi masuk ke 5 invarian Hari 11, semuanya hijau
- [ ] Nomor revisi tercetak di nota
- [ ] `CLAUDE.md` §2.2 memuat perbedaan tanggal VOID vs revisi secara eksplisit
- [ ] `./scripts/verify.sh` hijau

---

## R8 — Mutasi Gudang: Titipan per Faktur

> **Perubahan ini juga menutup satu kelas kesalahan lama:** sekarang operator bisa menitipkan
> produk apa pun asal pelanggan itu pernah membelinya — validasinya menjumlah **per produk
> lintas seluruh faktur**. Setelah K7, titipan selalu menunjuk baris faktur tertentu.

### 🔧 Backend

```
KONTEKS: Paket R8. Baca docs/RENCANA_REVISI_TESTING_KLIEN.md §2A K7.

TUGAS (BACKEND):

1. PERIKSA DATA DULU sebelum menulis migration:
   SELECT COUNT(*) FROM warehouse_mutations WHERE mutation_type =
   'TITIPAN_PELANGGAN';
   Kalau sudah ada barisnya, LAPORKAN dan tanya bagaimana mereka
   di-backfill — jangan memutuskan sendiri. Kalau nol, lanjut.

2. Migration: warehouse_mutations.sales_invoice_id UUID NULL
   REFERENCES sales_invoices(id).
   Nullable di kolom (dua cabang mutasi lain tidak memakainya), tapi
   WAJIB di service untuk cabang TITIPAN_PELANGGAN.
   Opsional tapi lebih baik: sales_invoice_line_id di
   warehouse_mutation_lines, supaya validasi per baris tidak perlu
   mencocokkan lewat product_id.

3. CreateWarehouseMutationDto: untuk cabang titipan (customerId terisi),
   salesInvoiceId jadi WAJIB. Tolak 400 kalau kosong, dan tolak kalau
   faktur itu bukan milik customerId yang dipilih atau sudah VOIDED.

4. GANTI assertTitipanQtyWithinPurchased() (warehouse-mutations.service.ts
   ~baris 293) yang sekarang menjumlah sales_invoice_lines per PRODUK
   lintas semua faktur. Validasi baru:
     SUM(titipan atas baris faktur ini) + qty_baru <= qty baris faktur ini
   Pesan error menyebut nomor fakturnya, bukan cuma nama produk.

5. GET /reports/titipan — kelompokkan per pelanggan PER FAKTUR, bukan per
   produk. Tambahkan kolom nomor faktur dan tanggal faktur.
   Periksa juga getStockOpnameWorksheet() yang memakai daftar titipan
   sebagai penjelas selisih fisik — bentuk datanya berubah, jangan sampai
   pecah diam-diam.

ATURAN WAJIB HARI INI:
- Mutasi ke TITIPAN_PELANGGAN tetap HANYA insert warehouse_mutations —
  tidak menyentuh stock_movements / product_stock_balance / lots, dan
  TIDAK ADA jurnal (CLAUDE.md §3 "Gudang"). Jangan tergoda menambah
  gerakan stok karena sekarang ada rujukan faktur.
- "Barang titipan" BUKAN konsinyasi: pelanggan sudah membeli dan sudah
  bayar. Barangnya bukan milik toko lagi.

DEFINITION OF DONE:
- Mutasi titipan tanpa salesInvoiceId -> 400
- salesInvoiceId milik pelanggan lain -> 400
- Titipan 5 dus atas baris faktur berqty 10 dus -> 201; titipan 6 dus
  berikutnya atas baris yang sama -> 400 dengan pesan menyebut nomor faktur
- Titipan atas produk yang sama tapi dari faktur BERBEDA -> 201 (tidak lagi
  saling menghabiskan kuota)
- Tidak ada baris stock_movements / journal_entries yang terbentuk
- GET /reports/titipan menampilkan pengelompokan per faktur
- Worksheet stok opname tetap berfungsi
```

### 🎨 Frontend

```
KONTEKS: Paket R8. Baca docs/PANDUAN_UI.md.

TUGAS (FRONTEND):
1. gudang/mutasi/index.vue, cabang titipan pelanggan:
   - setelah memilih pelanggan, tambahkan pemilihan FAKTUR (hanya faktur
     POSTED milik pelanggan itu yang masih punya sisa qty belum dititip)
   - baris titipan dipilih DARI BARIS FAKTUR itu, bukan dari master produk.
     Tampilkan qty faktur, qty sudah dititip, dan sisa yang boleh dititip
     per baris — operator tidak perlu menghitung sendiri.
   - qty yang melebihi sisa -> ditolak di FE juga (di sini memang MENOLAK,
     beda dari peringatan stok R3: ini batas yang punya dasar dokumen,
     bukan perkiraan stok)
2. Laporan Barang Titipan (laporan/titipan.vue): tampilkan pengelompokan
   per faktur mengikuti bentuk response baru.

DEFINITION OF DONE:
- Pilih pelanggan -> daftar faktur miliknya muncul
- Pilih faktur -> hanya baris faktur itu yang bisa dipilih jadi titipan
- Sisa yang boleh dititip tampil per baris dan berkurang setelah disimpan
- Laporan titipan menampilkan nomor faktur
```

### ✅ Verifikasi R8

- [ ] Data titipan lama diperiksa sebelum migration; hasilnya dilaporkan
- [ ] Titipan wajib menunjuk satu faktur milik pelanggan itu
- [ ] Validasi kuota per baris faktur, bukan per produk lintas faktur
- [ ] Tidak ada `stock_movements` / jurnal yang terbentuk dari titipan
- [ ] Laporan titipan & worksheet opname mengikuti bentuk baru
- [ ] `./scripts/verify.sh` hijau

---

## R9 — Kas & Bank Multi-Baris

> **Backend sudah mampu multi-pihak sejak Hari 27** — `ConfirmPaymentDto.lines[]` hanya
> berisi `invoiceId` + `amount`, tanpa `partyId`. Yang membatasi satu pihak per entri adalah
> `PaymentAllocationForm.vue` yang punya satu `partyId` global. Jadi paket ini sebagian besar
> frontend.
>
> **Digabung dengan sisa Hari 32A** yang menyentuh layar yang sama: Pindah Buku Kas (`PB`).

### 🔧 Backend

```
KONTEKS: Paket R9 (menyerap bagian Pindah Buku Kas dari Hari 32A yang belum
dikerjakan — lihat docs/PROMPTS_HARIAN.md Hari 32A tugas 7).

BACA DULU src/modules/payments/payments.service.ts (confirm, findOpenInvoices,
resolvePartyName) dan laporkan: apakah confirm() benar-benar sudah menerima
faktur dari beberapa pihak dalam satu batch? Komentar di baris ~119
menyiratkan ya. Kalau ternyata ada penghalang, sebutkan barisnya.

TUGAS (BACKEND):

1. GET /payments/open-invoices — partyId sekarang WAJIB
   (OpenInvoicesQueryDto: @IsUUID() partyId). Jadikan OPSIONAL, sehingga
   operator bisa mencari faktur terbuka lintas pihak.
   Tambahkan juga parameter `search` (nomor faktur) dan `limit`, supaya
   daftar lintas pihak tidak membanjiri layar. findOpenInvoices() sudah
   menerima partyId opsional secara internal (dipakai Laporan Hutang
   Hari 30) — manfaatkan itu, jangan tulis query kedua.

2. Response open-invoices WAJIB memuat identitas pihak per faktur
   (partyId + partyName), karena FE sekarang menampilkan faktur dari
   beberapa pihak dalam satu daftar.

3. resolvePartyName() dan kolom partyNames di daftar batch: pastikan
   menangani batch multi-pihak (gabungan nama, atau "3 pelanggan").
   Sekarang bentuknya mengasumsikan satu pihak — periksa dan sesuaikan.

4. PINDAH BUKU KAS (dari Hari 32A tugas 7, belum dikerjakan).
   Tabel cash_transfers + migration:
   - id, document_number unik (format PB/{store_code}-YYMMXXXX lewat
     DocumentCounterService — tambah 'CASH_TRANSFER' ke DocumentType union
     dan DOCUMENT_PREFIXES 'PB')
   - transfer_date DATE
   - from_cash_account_id, to_cash_account_id (keduanya wajib
     is_cash_account = true dan wajib BERBEDA)
   - amount NUMERIC(16,2), note TEXT NULL
   - posting_status ENUM('POSTED','VOIDED') default POSTED
   - review_status ENUM('BELUM_DICEK','DISETUJUI','BERMASALAH')
     default 'BELUM_DICEK'
   - void_reason_code/void_reason_note (pola VoidEngine standar)
   - created_by, timestamps
   Jurnal: Dr to_cash_account / Cr from_cash_account, sourceType
   'CASH_TRANSFER'. VoidHook baru, reversing bertanggal hari ini (§2.2).
   Endpoint: POST /cash-transfers, POST /cash-transfers/:id/void,
   PATCH /cash-transfers/:id/review, GET /cash-transfers.
   Roles POST: MASTER, OPERATOR. Roles review: MASTER, SUPERVISOR.
   Backdate 7 hari (lewat maxDaysOverride yang SUDAH ADA di
   PeriodLockValidatorService — jangan menambah mekanisme baru).

ATURAN WAJIB HARI INI:
- cash_transfers TIDAK lewat StepUpService/CASH_OUTFLOW meski salah satu
  sisinya Kas Besar (requires_outflow_approval). Ini pemindahan antar kas
  milik sendiri, bukan pengeluaran ke pihak luar — approval-nya
  setelah-fakta lewat review_status (CLAUDE.md §3 "Biaya Operasional").
- cash_transfers TIDAK ikut kunci cetak §2.16 (daftar 7 dokumen tetap).
- JANGAN mengubah ConfirmPaymentDto — ia sudah benar.

DEFINITION OF DONE:
- GET /payments/open-invoices tanpa partyId -> daftar faktur terbuka lintas
  pihak, tiap baris memuat partyId + partyName
- POST /payments/confirm dengan 3 baris dari 2 pelanggan berbeda -> 201,
  satu batch, jurnal seimbang, piutang MASING-MASING pelanggan berkurang
  benar (buktikan lewat ar_account_id masing-masing)
- Daftar batch menampilkan nama pihak yang masuk akal untuk batch multi-pihak
- POST /cash-transfers Kas Toko -> Kas Besar: jurnal Dr Kas Besar / Cr Kas
  Toko, nomor PB/RM01-YYMMXXXX, review_status BELUM_DICEK
- from = to -> 400
- Backdate 8 hari -> 400; 6 hari -> 201
- Faktur penjualan backdate 3 hari tetap 400 (override tidak bocor)
```

### 🎨 Frontend

```
KONTEKS: Paket R9. Baca docs/PANDUAN_UI.md.

TUGAS (FRONTEND):

1. PaymentAllocationForm.vue: ubah dari "satu pihak -> daftar fakturnya"
   jadi GRID BARIS, mengikuti pola entri penjualan/pembelian yang sudah
   ada (<LineModal> + <DataTable>), karena itu yang diminta klien:
   "sekali entri dapat melakukan entri beberapa faktur dalam sekali jalan",
   dengan bentuk "seperti input penjualan/pembelian".
   - header (global): tanggal, metode pembayaran (multi-baris metode yang
     sudah ada sekarang TETAP), catatan
   - baris: pihak + faktur + nominal + tandai lunas
   - saat menambah baris, operator memilih faktur dari daftar faktur
     terbuka (boleh lintas pihak); memilih pihak lebih dulu tetap boleh
     sebagai penyaring, bukan sebagai syarat
   - total baris vs total metode ditampilkan dan harus cocok sebelum
     Simpan aktif (perilaku yang sudah ada sekarang — pertahankan)
   - dialog selisih pembayaran saat "tandai lunas" TETAP seperti sekarang
     (CLAUDE.md §2.18) — jangan dirombak
   Satu komponen ini dipakai Penerimaan Kas (SALES) dan Pengeluaran Kas
   (PURCHASE), seperti sekarang. Jangan fork jadi dua.

2. Halaman baru Pindah Buku Kas (kas-bank/pindah-buku/), ikuti pola
   direktori kas-bank/ yang sudah ada: dari kas -> ke kas (tidak boleh
   sama) -> nominal -> keterangan. Cetak A5 memakai komponen cetak yang
   sudah ada — JANGAN membuat sistem cetak baru.

3. Tab tambahan di pengecekan-invoice/index.vue untuk Pindah Buku Kas
   (supervisor menandai DISETUJUI/BERMASALAH per bukti). JANGAN fork
   halaman itu jadi halaman baru.

DEFINITION OF DONE:
- Entri Penerimaan Kas: tambah 3 baris dari 2 pelanggan berbeda dalam satu
  entri -> tersimpan sebagai satu batch
- Total baris != total metode -> tombol Simpan nonaktif dengan penjelasan
- Tandai lunas dengan nominal kurang -> dialog selisih tetap muncul
- Pengeluaran Kas berperilaku sama dengan supplier
- Pindah Buku Kas tersimpan, nomor PB/RM01-YYMMXXXX terlihat, cetak A5 jalan
- Tab Pindah Buku Kas muncul di Pengecekan Invoice Harian
```

### ✅ Verifikasi R9

- [ ] Satu batch bisa memuat faktur dari beberapa pihak, piutang masing-masing benar
- [ ] `open-invoices` bisa dipanggil tanpa `partyId` dan memuat identitas pihak
- [ ] Dialog selisih pembayaran (§2.18) tidak berubah perilakunya
- [ ] Pindah Buku Kas: jurnal benar, nomor `PB` berurut, review setelah-fakta tidak menahan transaksi
- [ ] `PB` tidak lewat StepUp dan tidak masuk kunci cetak
- [ ] Backdate 7 hari khusus modul ini; modul lain tetap 2 hari
- [ ] `./scripts/verify.sh` hijau

---

## R10 — Biaya Operasional Multi-Baris

> **Digabung dengan sisa Hari 32A** yang menyentuh layar yang sama: Kasbon (Piutang
> Karyawan), master Pekerja, kolom kendaraan BBM, edit-sebelum-approve, dan Laporan Biaya
> Operasional. Mengerjakannya terpisah berarti dua kali migrasi pada tabel yang sama.
>
> 🛑 **JANGAN mengulang riset akun.** Akun biaya real (`06.110.xxx` / `06.120.xxx`) **sudah
> di-seed sejak Hari 17A** — 11 placeholder `52xx` sudah dihapus migration yang sama hari itu.
> Jalankan `SELECT code, name FROM chart_of_accounts WHERE code LIKE '06.11%' OR code LIKE
> '06.12%'` **sebelum menulis satu baris migration pun.**

### 🔧 Backend

```
KONTEKS: Paket R10 (menyerap Hari 32A tugas 1-6, 8-10 yang belum dikerjakan
— buka docs/PROMPTS_HARIAN.md bagian "Hari 32A" dan KERJAKAN SELURUH tugas
backend di sana KECUALI tugas 7 (Pindah Buku Kas) yang sudah masuk R9).

Tugas di bawah ini adalah TAMBAHAN dari revisi klien 08 Sep, di atas
Hari 32A itu.

TUGAS (BACKEND) — TAMBAHAN:

1. POST /operational-expenses/batch — entri multi-baris.
   Klien: "Entri biaya operasional juga berbentuk multibaris: sekali entri
   dapat melakukan beberapa input biaya operasional... tanggal dapat
   diinput sebagai data global."
   Body:
     { expenseDate?, cashAccountId, lines: [ { expenseAccountId, amount,
       description?, referenceNumber?, workerId?, vehicleId? } ] }
   - expenseDate dan cashAccountId GLOBAL untuk seluruh baris
   - SELURUH baris dalam SATU DB transaction (CLAUDE.md §2.3) — gagal di
     baris ke-3 berarti baris 1-2 ikut batal, tidak ada state setengah jadi
   - validasi akun per baris sama persis dengan createLine yang sudah ada
     (termasuk aturan Kasbon & restricted_to_master dari Hari 32A tugas 8)
   - satu bukti per hari per akun kas tetap berlaku: kalau bukti untuk
     tanggal itu sudah ada, baris ditambahkan ke bukti yang sama
     (CLAUDE.md §3 "Biaya Operasional")
   POST /operational-expenses (satu baris) yang lama TETAP ADA — jangan
   dihapus, dipakai alur lain dan tes yang sudah jalan.

DEFINITION OF DONE (tambahan, di luar DoD Hari 32A):
- POST /batch dengan 4 baris -> 201, keempatnya masuk satu bukti,
  satu tanggal, satu akun kas
- POST /batch dengan baris ke-3 memakai akun terlarang -> 400 dan
  TIDAK ADA satu baris pun tersimpan (buktikan dengan SELECT COUNT)
- POST /batch untuk tanggal yang bukti-nya sudah ada -> baris menempel ke
  bukti yang sama, bukan membuat bukti kedua
- Endpoint satu-baris yang lama tetap berfungsi
```

### 🎨 Frontend

```
KONTEKS: Paket R10. Baca docs/PANDUAN_UI.md.
Kerjakan juga SELURUH tugas frontend Hari 32A di docs/PROMPTS_HARIAN.md
(kolom Kendaraan, dropdown Pekerja, tombol Edit sebelum disetujui, tab
Kasbon, Laporan Biaya Operasional) KECUALI halaman Pindah Buku Kas yang
sudah masuk R9.

TUGAS (FRONTEND) — TAMBAHAN:

1. kas-bank/biaya-operasional/index.vue: ubah modal entri dari SATU baris
   per simpan jadi REPEATER BARIS.
   - header: tanggal (global) + akun kas (global, selalu Kas Kecil sesuai
     CLAUDE.md §3 tapi tetap ditampilkan)
   - grid baris: akun biaya, nominal, keterangan, no. referensi, dan
     (dari Hari 32A) dropdown Kendaraan/Pekerja yang muncul sesuai akun
   - satu kali Simpan -> POST /operational-expenses/batch
   Pakai pola repeater yang sudah ada (CrudFormPage repeaterColumns) atau
   pola LineModal seperti entri faktur — pilih yang paling cocok dengan
   bentuk layar ini dan jelaskan pilihanmu. JANGAN membuat pola ketiga.

DEFINITION OF DONE (tambahan):
- Entri 4 baris biaya sekaligus dengan satu tanggal -> tersimpan sebagai
  satu bukti berisi 4 baris
- Baris yang akunnya BBM memunculkan dropdown Kendaraan; baris Gaji Tukang
  Angkut / Kasbon memunculkan dropdown Pekerja
- Gagal di satu baris -> tidak ada baris yang tersimpan, pesan menyebut
  baris keberapa
```

### ✅ Verifikasi R10

- [ ] `SELECT` membuktikan akun `06.110.xxx`/`06.120.xxx` sudah ada sebelum migration hari ini
- [ ] Entri multi-baris tersimpan sebagai satu bukti, satu transaction
- [ ] Gagal di tengah = tidak ada baris tersimpan sama sekali
- [ ] Seluruh DoD Hari 32A (kecuali Pindah Buku Kas) terpenuhi
- [ ] Backdate 7 hari khusus modul ini tetap berlaku
- [ ] `./scripts/verify.sh` hijau

---

## R11 — Laporan

> Poin L1 adalah **lubang permission yang nyata sekarang**: `GET /reports/stock-opname`
> tanpa `@Roles`, dan `laporan/stok-opname.vue` tanpa `roles` di `definePageMeta`. Operator
> bisa membukanya hari ini.

### 🔧 Backend

```
KONTEKS: Paket R11.

TUGAS (BACKEND):

1. STOK OPNAME HANYA SUPERVISOR/MASTER (Laporan poin 1 — "mencegah
   kecurangan dari operator").
   reports.controller.ts:61 GET /reports/stock-opname belum punya @Roles.
   Tambah @Roles(Role.MASTER, Role.SUPERVISOR).
   PERHATIKAN komentar di kepala ReportsController: "Tidak ada @Roles()
   dengan sengaja — Laporan terbuka untuk semua role login". Komentar itu
   sekarang tidak lagi benar seluruhnya. PERBARUI komentarnya sekaligus,
   sebutkan stock-opname sebagai pengecualian dan kenapa — kalau tidak,
   sesi berikutnya akan mengira @Roles itu kekeliruan dan mencabutnya.

2. LAPORAN PENJUALAN PER SALESMAN (Laporan poin 2 — "perlu ditambahkan
   pembagian per salesman memegang faktur apa saja").
   SalesReportQueryDto sudah punya groupBy CUSTOMER|SALESMAN|INVOICE, tapi
   SALESMAN hanya menghasilkan REKAP satu baris per salesman. Yang diminta
   klien adalah rinciannya.
   Tambahkan:
   - filter opsional salesmanId (dipakai bersama groupBy=INVOICE)
   - kolom Salesman di hasil groupBy=INVOICE, supaya terlihat faktur mana
     dipegang siapa tanpa harus memfilter satu per satu
   Jangan menambah mode groupBy keempat — cukup filter + kolom.

3. Perbarui CLAUDE.md §5 (Permission Matrix) untuk baris Laporan:
   sebutkan Stok Opname sebagai pengecualian MASTER+SUPERVISOR.

DEFINITION OF DONE:
- OPERATOR memanggil GET /reports/stock-opname -> 403
- SUPERVISOR dan MASTER -> 200
- Laporan lain tetap 200 untuk OPERATOR (jangan kelewat ketat)
- GET /reports/sales?groupBy=INVOICE&salesmanId=... -> hanya faktur
  salesman itu
- GET /reports/sales?groupBy=INVOICE tanpa filter -> semua faktur, dengan
  kolom Salesman terisi
- Export Excel & PDF kedua mode tetap berfungsi
```

### 🎨 Frontend

```
KONTEKS: Paket R11. Baca docs/PANDUAN_UI.md §14 (pola laporan generik).

TUGAS (FRONTEND):
1. laporan/stok-opname.vue: definePageMeta({ title: 'Stok Opname',
   roles: ['MASTER','SUPERVISOR'] }).
2. laporan/index.vue: sembunyikan kartu Stok Opname untuk OPERATOR
   (pola penyaringan roles yang sudah dipakai navigation.ts).
   Kartu yang tidak boleh diakses TIDAK boleh tampil lalu menolak saat
   diklik — itu membingungkan dan mengundang percobaan.
3. laporan/penjualan.vue: tambah filter Salesman di panel parameter, dan
   tampilkan kolom Salesman di mode Detail.

DEFINITION OF DONE:
- Login OPERATOR -> kartu Stok Opname tidak muncul di /laporan; akses
  langsung ke URL-nya ditolak
- Login SUPERVISOR -> kartu muncul dan halaman terbuka
- Laporan Penjualan mode Detail menampilkan kolom Salesman dan bisa
  disaring per salesman
```

### ✅ Verifikasi R11

- [ ] `GET /reports/stock-opname` 403 untuk OPERATOR, 200 untuk SUPERVISOR/MASTER
- [ ] Laporan lain tetap terbuka untuk OPERATOR
- [ ] Kartu Stok Opname tidak tampil untuk OPERATOR
- [ ] Laporan Penjualan bisa disaring per salesman, kolom Salesman ada di mode Detail
- [ ] Komentar kepala `ReportsController` dan `CLAUDE.md` §5 sudah diperbarui
- [ ] `./scripts/verify.sh` hijau

---

## R12 — Regresi & Penutupan

> Paket ini **tidak menambah fitur**. Isinya memastikan 24 poin revisi benar-benar tertutup,
> dan yang lebih penting: memastikan `CLAUDE.md` tidak lagi bertentangan dengan kode.

```
KONTEKS: Paket R12, penutup putaran revisi. Baca
docs/RENCANA_REVISI_TESTING_KLIEN.md seluruhnya.

TUGAS:

1. REGRESI PENUH:
   - ./scripts/verify.sh hijau
   - 5 invarian Hari 11 hijau, TERMASUK kasus revisi yang ditambahkan R6
   - migration up -> down -> up di DB KOSONG berhasil dari nol
   - GET /health 200

2. UJI MANUAL: 1 happy path + 1 error path untuk SETIAP layar yang
   disentuh putaran ini. Tampilkan hasilnya, bukan klaim "sudah diuji".

3. AUDIT KONSISTENSI CLAUDE.md. Ini bagian terpenting paket ini.
   Telusuri dan pastikan setiap aturan berikut sudah ditulis ulang:
   - §2.2  — perbedaan tanggal: VOID = hari ini, REVISI = tanggal dokumen
             asli (K2). Kalau ini tidak tertulis, sesi berikutnya akan
             menyeragamkannya dan merusak salah satunya.
   - §2.9  — jendela revisi 2 hari (K3) dan pengecualian 7 hari yang sudah
             ada untuk Biaya Operasional & Pindah Buku Kas
   - §2.16 — nomor revisi di nota; daftar 7 dokumen kunci cetak TIDAK berubah
   - §2.17 — batas jual-rugi dievaluasi ulang saat revisi
   - §3 "Produk"    — urutan penamaan baru (R2)
   - §3 "Pembelian" — supplier_invoice_no opsional; diskon baris dihapus
   - §3 "Gudang"    — titipan wajib menunjuk satu faktur (K7)
   - §3 (harga)     — Ctrl+H/Ctrl+D dicabut (R5)
   - §3 (piutang)   — "lima tempat menyentuh akun piutang" jadi ENAM
   - §4 "Faktur Penjualan"  — tanpa diskon
   - §4 "Faktur Pembelian"  — rumus 4 langkah, jurnal dengan Diskon Pembelian
   - §5 — Stok Opname MASTER+SUPERVISOR
   Untuk SETIAP poin: tunjukkan potongan CLAUDE.md yang sekarang berlaku.
   Kalau ada yang belum diperbarui, PERBAIKI SEKARANG, jangan dicatat
   sebagai utang.

4. Update PROGRESS.md: §0 papan status, §3 catatan per paket, §4 modul
   selesai. Tandai di §1 bahwa K1-K7 masih menunggu konfirmasi klien
   kalau memang belum turun.

5. Buat docs/RINGKASAN_REVISI_UNTUK_TESTING.md — daftar 24 poin revisi
   dengan status (selesai / berubah bentuk / menunggu klien) dan CARA
   MENGUJINYA satu per satu, supaya sesi testing berikutnya bersama klien
   tidak perlu menebak dari mana mulai.

ATURAN WAJIB:
- JANGAN commit dan jangan menawarkan commit.
- Kalau ada DoD paket sebelumnya yang ternyata belum benar-benar hijau,
  LAPORKAN sebagai blocker. Jangan menandainya selesai.

DEFINITION OF DONE:
- verify.sh hijau, invarian hijau, migration bersih dari DB kosong
- 13 poin audit CLAUDE.md di atas dibuktikan satu per satu dengan kutipan
- docs/RINGKASAN_REVISI_UNTUK_TESTING.md ada dan bisa dipakai memandu
  sesi testing berikutnya
- PROGRESS.md mutakhir
```

### ✅ Verifikasi R12

- [ ] `./scripts/verify.sh` hijau
- [ ] 5 invarian + kasus revisi hijau
- [ ] Migration `up`→`down`→`up` bersih dari DB kosong
- [ ] 13 poin audit `CLAUDE.md` dibuktikan dengan kutipan, bukan klaim
- [ ] `docs/RINGKASAN_REVISI_UNTUK_TESTING.md` ada
- [ ] `PROGRESS.md` mutakhir
- [ ] Tidak ada commit yang dibuat

---

## Penutup — Hubungan dengan `PROMPTS_HARIAN.md`

**Hari 32A tidak dijalankan sebagai satu hari utuh.** Isinya dipecah:

| Bagian Hari 32A | Dikerjakan di |
|---|---|
| Tugas 1–6, 8–10 (flag COA, akun baru, master `workers`, kolom `worker_id`/`vehicle_id`, `review_status`, PATCH baris, perbaikan dua bug, backdate 7 hari, Laporan Biaya Operasional) | **R10** |
| Tugas 7 (Pindah Buku Kas `PB`) | **R9** |

Alasannya: R9 dan R10 menyentuh layar dan tabel yang sama dengan 32A. Mengerjakannya
terpisah berarti dua kali migrasi pada `operational_expense_lines` dan dua kali menyentuh
`kas-bank/`. Tandai Hari 32A di `PROMPTS_HARIAN.md` sebagai "diserap ke R9+R10" supaya tidak
dikerjakan dua kali.

**Hari 33, 35, 36, 37 belum dikerjakan** dan tidak tersentuh putaran ini (deploy
Windows-native, audit permission matrix, input saldo awal, serah terima). Setelah R12,
lanjutkan dari `PROMPTS_HARIAN.md` Hari 33 — dengan catatan **R11 sudah mengubah satu baris
Permission Matrix**, jadi audit Hari 35 harus membaca `CLAUDE.md` §5 versi terbaru.

**Hari 23A (Tutup Bulan) masih ⏸ pasca-MVP** dan masih memuat PR terbuka: apakah baris Saldo
Awal/Saldo Akhir itu jurnal sungguhan atau konstruksi tampilan. Putaran revisi ini **tidak
menyentuhnya** — tapi K2 (revisi bertanggal dokumen asli) dan K3 (jendela 2 hari) membuat
jawabannya lebih mudah: revisi tidak akan pernah bisa menyentuh bulan tertutup, jadi kedua
bentuk closing sama-sama aman dari sisi revisi.
