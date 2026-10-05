# Pertanyaan Klien — Bagan Akun (Chart of Accounts)

> Disusun 12 Agustus 2026, diperbarui 13 Agustus setelah jawaban klien atas K-1 dan K-2.
> Sumber: `Chart_of_Accounts_Affari.xlsx` dan `Laporan_laba_rugi_Neraca_Juli.xlsx`.
>
> **Pendamping:**
> `docs/COA_Usulan_OmegaSinarTerang.xlsx` — berkas yang diserahkan ke klien (bagan lengkap,
> saldo 31 Juli, dua versi, lembar jawaban) ·
> `docs/COA_USULAN.md` — alasan rancangan dan spesifikasi teknis.
>
> **Cara pakai:** setiap blok punya **Temuan** (fakta dari berkas klien, bukan tebakan),
> **Pertanyaan**, **Kenapa ini menentukan kode**, dan **Default kalau tidak dijawab**. Default itu
> bukan ancaman — itu yang benar-benar akan kami bangun, supaya jadwal tidak berhenti.
>
> Sudah **terjawab** dan tidak ditanyakan lagi: struktur tiga tingkat berformat Affari · satu akun
> penjualan · akun penyusutan disediakan tapi dormant · **tetap non-PKP (K-1)** · **rumah dan
> pinjaman BSI tetap di neraca toko, di blok Non-Usaha (K-2)**.

---

## 0. Kalau waktunya cuma 10 menit — enam ini dulu

| # | Pertanyaan | Blok |
|---|---|---|
| 1 | Angka **persediaan Rp 1,84 miliar** dari hitung fisik atau dari catatan? | K-14 |
| 2 | **Gaji "Edy" Rp 18 juta/bulan** — karyawan bernama Edy, atau pengambilan pemilik? | K-10 |
| 3 | **Kartu kredit Permata & Mega** dipakai belanja toko atau belanja pribadi? | K-3 |
| 4 | Rekening **BCA / BSI / Mandiri** — mana yang dipakai untuk uang toko? | K-8 |
| 5 | **Dadam, Lichin, Atek** — pelanggan/supplier biasa atau pinjam-meminjam? | K-6 |
| 6 | **Versi A atau Versi B** untuk pengeluaran pribadi berulang? | §Versi |

Sisanya boleh menyusul lewat WhatsApp dalam 2–3 hari.

> **Berkas pendamping:** `docs/COA_Usulan_OmegaSinarTerang.xlsx` — bagan lengkap beserta saldo
> 31 Juli, dua versi berdampingan, dan lembar `Pertanyaan` berisi kolom jawaban. Berkas itu yang
> diserahkan ke klien; file ini memuat alasan di balik tiap pertanyaan.

---

## Versi A atau Versi B — pertanyaan yang menggantikan K-2 lama

**Temuan.** Keputusan 13 Agustus: **rumah tinggal dan pinjaman BSI tetap berada di neraca toko**,
karena omzet toko memang yang membiayainya. Keduanya ditempatkan di blok tersendiri
(`01.310 Aset Non-Usaha`, `02.310 Liabilitas Non-Usaha`) supaya nilai aset operasional dan
kemampuan bayar toko tetap terbaca.

Yang belum diputuskan adalah **lima pos konsumsi pribadi berulang** senilai Rp 28.550.204 pada
Juli: kartu kredit Permata + Mega (21.261.078) · perpuluhan (4.100.000) · IPL apartemen
(2.129.126) · asuransi jiwa (1.000.000) · biaya pergaulan (60.000).

**Versi A — konsumsi pribadi jadi Prive.** Garis pemisahnya: uang toko yang berubah jadi barang
yang **masih ada** dicatat sebagai harta; uang yang **habis dikonsumsi** dicatat sebagai
pengambilan pemilik. Laba toko Juli terbaca **Rp 36.401.537**.

**Versi B — konsumsi pribadi jadi beban toko**, dikumpulkan di kategori
`06.130 Beban Pribadi Pemilik` supaya tetap bisa dilihat terpisah. Laba toko Juli terbaca
**Rp 7.851.333** — sama persis dengan laporan yang sekarang.

**Yang perlu disampaikan ke klien:** kekayaan bersih **identik** di kedua versi —
Rp 2.040.358.869 per 31 Juli, dan tambahan kekayaan dari Juli Rp 7.851.333 di keduanya. Pilihan
ini tidak mengubah kekayaan sepeser pun, hanya mengubah apa yang disebut "laba toko".

**Kenapa ini menentukan kode.** Lima akun di `06.130` hanya dibuat pada Versi B. Menambahkannya
belakangan murah; **memindahkan transaksi** yang sudah terlanjur dicatat ke akun yang salah tidak
— karena koreksi wajib lewat VOID + jurnal pembalik bertanggal hari ini (`CLAUDE.md` §2.1), jadi
angka bulan lalu tidak akan pernah berubah lagi.

**Default kalau tidak dijawab:** **Versi A**, karena garisnya bisa dijelaskan ke siapa pun dan
menghasilkan angka laba usaha yang bermakna. Versi B tetap disiapkan penuh di berkas Excel, jadi
berpindah sebelum 1 September tidak berbiaya.

---

## K-1. Status PKP — ✅ TERJAWAB 13 Agustus 2026

**Keputusan klien: tetap non-PKP untuk sekarang.** `company_is_pkp = false`. Akun `01.150.00001`
PPN Masukan dan `02.110.00022` PPN Keluaran tetap dibuat tapi **tidak dipakai**; PPN yang dibayar
ke supplier PKP masuk ke `stock_cost_lots.unit_cost` (harga pokok barang), sesuai `CLAUDE.md` §2.11.

**Yang tetap perlu diketahui klien.** Penjualan Juli Rp 4.905.504.000 → disetahunkan sekitar
**Rp 58,9 miliar**, sedangkan ambang wajib dikukuhkan PKP adalah peredaran bruto **Rp 4,8 miliar
setahun**. Kami bukan konsultan pajak dan tidak menilai kepatuhan; kami hanya mencatat bahwa
setelan ini adalah **keputusan klien yang diambil sadar**, dengan tanggalnya.

**Kenapa tanggalnya dicatat.** Kalau setelan ini berubah setelah beberapa bulan berjalan, lot yang
sudah terbentuk memakai aturan lama (PPN masuk harga pokok) sedangkan lot baru memakai aturan baru
(PPN dikreditkan) — dan **FIFO akan mencampur keduanya tanpa satu pun error muncul**. Dengan
tanggal keputusan tercatat, kita tahu persis lot mana memakai aturan mana.

**Tindak lanjut yang disarankan:** tanyakan sekali ke konsultan pajak yang sudah dibayar
Rp 2 juta/bulan (baris "Biaya Konsultan Pajak + Pembukuan"). Apa pun jawabannya, sistem tinggal
mengikuti — cabang PKP sudah dibangun penuh.

---

## K-2. Rumah dan pinjaman BSI — ✅ TERJAWAB 13 Agustus 2026

**Keputusan klien: keduanya TETAP berada di neraca toko**, karena omzet toko memang yang
membiayai pembangunan rumah.

**Cara menempatkannya** (usulan kami, sudah dipakai di berkas Excel):

| Pos | Rp | Akun |
|---|---|---|
| Rumah tinggal (pembangunan + bahan + perbaikan + design) | 1.356.977.238 | `01.310.00001` — **Aset Non-Usaha** |
| Pinjaman BSI 25 Sept 2025 – 2035 | 1.425.979.498 | `02.310.00001` — **Liabilitas Non-Usaha** |

Keduanya tetap menyeimbangkan neraca persis seperti sekarang. Yang berubah hanya penempatannya:
mereka **tidak dicampur** ke `01.210 Aset Tetap Usaha` (kendaraan, komputer, palet) dan
`02.210 Hutang Bank Jangka Panjang`. Tanpa pemisahan itu, angka Aset Tetap menjadi campuran
kendaraan operasional dan rumah tinggal, dan tidak ada cara membaca kemampuan bayar toko.

**Yang masih perlu dipastikan** — tidak menghambat, tapi memengaruhi penyajian:

1. Cicilan bulanan (pokok + bunga Rp 12.544.657) dibayar dari uang toko — betul?
   Kalau ya, bunganya tetap muncul di `07.210.00001 B. Bunga Pinjaman`, dan itu sudah kami pakai.
2. Pinjaman lain — **Lichin Mandiri Rp 307 jt · Leo Rp 100 jt · Afang Rp 100 jt · Mama Rp 100 jt**
   — untuk modal kerja toko atau keperluan pribadi? Untuk sementara semuanya di
   `02.210.00002 Hutang Pihak Berelasi`. Lihat **K-6**.

---

## K-3. Kartu kredit Permata & Mega — belanja apa?

**Temuan.** Laporan Juli memuat dua baris di kelompok "Biaya Administrasi dan Umum":

| | Rp |
|---|---|
| Kartu Kredit Permata | 5.074.000 |
| Kartu Kredit Mega | 16.187.078 |
| **Jumlah** | **21.261.078** |

Nilainya besar — lebih dari dua kali lipat gaji tiga karyawan bulanan digabung — tapi tidak ada
keterangan apa yang dibeli. Yang tercatat adalah **pembayaran tagihannya**, bukan belanjanya.

**Pertanyaan:**

1. Kartu itu dipakai untuk **belanja toko** (barang dagangan, BBM, perlengkapan) atau **belanja
   pribadi/rumah tangga**?
2. Kalau campur: kira-kira berapa bagian yang untuk toko?
3. Kartunya atas nama pribadi pemilik atau atas nama usaha?

**Kenapa ini menentukan kode.** Kalau untuk toko, yang benar adalah dua peristiwa terpisah: saat
belanja → akun beban yang sesuai bertambah dan `02.110.00012 Hutang Kartu Kredit` bertambah; saat
tagihan dibayar → hutang berkurang dan kas berkurang. Dicatat sebagai satu baris "biaya kartu
kredit", pemilik tidak akan pernah bisa menjawab "bulan ini saya belanja apa saja" — dan
Rp 21 juta per bulan terlalu besar untuk tidak diketahui isinya.

Kalau untuk pribadi, ia masuk **Prive** dan akun `02.110.00012` tidak dipakai sama sekali.

**Default kalau tidak dijawab:** **Prive**. Akun `02.110.00012 Hutang Kartu Kredit` tetap dibuat
tapi dormant — mengaktifkannya nanti cukup satu centang, sedangkan menyisipkan akun ke tengah
bagan setelah nomor beredar tidak semurah itu.

---

## K-4. Perpuluhan — persembahan pribadi atau sumbangan usaha?

**Temuan.** Laporan Juli memuat "Perpuluhan Juni dan Juli Rp 4.100.000", dan di bawah baris Laba
Netto ada rumus `Laba × 10%` yang menghasilkan Rp 785.133 — jadi perpuluhannya memang **dihitung
dari laba**, bukan dari kegiatan toko.

**Pertanyaan:**

1. Perpuluhan itu **persembahan pribadi pemilik** dari bagian labanya, atau **sumbangan atas nama
   usaha**?
2. Kalau atas nama usaha: dibayarkan ke lembaga tertentu, dan ada bukti/kwitansinya?

**Kenapa ini menentukan kode.** Kalau ia dihitung dari laba dan dibayarkan pemilik, secara
akuntansi ia adalah **pembagian laba**, bukan beban — mencatatnya sebagai beban akan mengurangi
laba, yang kemudian dipakai untuk menghitung perpuluhan berikutnya. Angkanya jadi berputar
mengejar dirinya sendiri.

**Default kalau tidak dijawab:** **Prive**, karena dasar hitungnya adalah laba. Akun
`06.120.00013 B. Sumbangan dan Kemasyarakatan` tetap ada untuk sumbangan yang memang atas nama
toko (sumbangan kampung, kegiatan RT, dan sejenisnya).

---

## K-5. "Pendapatan Usaha Lainnya — Global Digital NIA / Moka"

**Temuan.** Satu baris di laporan Juli: **Rp 1.959.493**, dijumlahkan langsung ke dalam Laba
Bruto. Namanya menyebut "Global Digital" dan "Moka" — terdengar seperti penjualan pulsa, token,
atau layanan pembayaran digital, tapi kami tidak mau menebak.

**Pertanyaan:**

1. Ini pendapatan dari apa?
2. Transaksinya akan **dicatat di sistem baru**, atau tetap di luar dan hanya dimasukkan sebulan
   sekali sebagai satu angka?
3. Kalau dicatat di sistem: ada barang/stok yang ikut berkurang, atau murni jasa?

**Kenapa ini menentukan kode.** Kalau murni jasa dan hanya masuk sebulan sekali, cukup akun
`07.110.00001 Pendapatan Jasa Lain` + satu jurnal manual bulanan — nol hari kerja. Kalau ada stok
yang ikut berkurang, itu **modul penjualan kedua** dengan harga pokoknya sendiri, dan itu bukan
sesuatu yang bisa diselipkan dengan margin +0,65 hari.

Yang jelas: ia **tidak boleh** ikut masuk Laba Bruto seperti sekarang. Laba bruto adalah selisih
penjualan barang dagang dengan harga pokoknya; mencampur pendapatan jasa ke dalamnya membuat
margin dagang terlihat lebih baik dari kenyataan.

**Default kalau tidak dijawab:** akun `07.110.00001` disediakan, diisi lewat **jurnal manual**
sebulan sekali oleh MASTER. Tidak ada modul baru.

---

## K-6. Dadam, Lichin, Atek, Ferry — pelanggan biasa atau pihak berelasi?

**Temuan.** Beberapa nama di neraca Juli tidak terbaca sebagai transaksi dagang biasa:

| Baris | Rp | Yang membuat kami ragu |
|---|---|---|
| Piutang Dadam 17/6 | 46.318.000 | Satu nama, nilai besar, bertanggal — bukan pola piutang dagang |
| Piutang Lichin tukar cash | 0 (bergerak) | "Tukar cash" bukan penjualan barang |
| Hutang Lichin Gaji | 8.170.000 | Hutang **gaji** kepada pihak yang sama yang juga meminjamkan uang |
| Hutang Lichin Mandiri 1 | 307.000.000 | |
| Biaya Komisi Pinjaman Atek (30/12) | 1.700.000 | "Komisi pinjaman" — biaya perantara pinjaman? |
| Pembelian Dibayar Dimuka Ferry | 216.030.000 | Lihat K-7 |

**Pertanyaan:**

1. **Dadam** — pelanggan toko yang membeli barang, atau orang yang meminjam uang?
2. **Lichin** — siapa? Ada tiga hubungan sekaligus dengan nama ini (piutang tukar cash, hutang
   gaji, hutang Mandiri Rp 307 juta). Karyawan, kerabat, atau rekan usaha?
3. **Atek** — perantara pinjaman? Komisi Rp 1,7 juta itu sekali bayar atau berulang?
4. Dari semua nama di neraca, mana yang **pelanggan/supplier biasa** (masuk sub-ledger) dan mana
   yang **pihak berelasi** (akun tersendiri)?

**Kenapa ini menentukan kode.** Piutang dagang hidup di sub-ledger pelanggan dan punya umur
piutang, jatuh tempo, serta panel riwayat harga. Piutang kepada pihak berelasi tidak punya satupun
dari itu — ia hanya saldo yang ditagih kapan-kapan. Kalau keduanya dicampur, laporan umur piutang
akan selamanya menampilkan satu baris raksasa berumur 300 hari yang membuat sisanya tidak terbaca.

**Default kalau tidak dijawab:** semua nama yang **pernah muncul di faktur penjualan/pembelian**
masuk sub-ledger; sisanya masuk `01.120.00003 Piutang Pihak Berelasi` /
`02.210.00002 Hutang Pihak Berelasi`, dengan nama ditulis di keterangan jurnal.

---

## K-7. Uang muka pembelian ke Ferry Rp 216 juta

**Temuan.** Baris "Pembelian Dibayar Dimuka Ferry" bernilai **Rp 216.030.000**, dan rumusnya
menunjukkan pengurangan bertahap (`195.750.000 + 32.480.000 − 5.000.000 − 2.000.000 − 1.000.000
− 1.200.000 − 3.000.000`) — jadi memang **dicicil pemakaiannya**, sedikit demi sedikit.

**Pertanyaan:**

1. Betul ini **uang yang sudah disetor ke supplier** sebelum barangnya datang?
2. Saat barang datang, potongannya dihitung bagaimana — otomatis sebesar nilai faktur, atau
   ditentukan manual per pengambilan?
3. Ada supplier lain yang diperlakukan begini, atau hanya Ferry?
4. Uang muka ini pernah **diminta kembali** (batal beli), atau selalu habis jadi barang?

**Kenapa ini menentukan kode.** Kalau uang muka harus bisa **dialokasikan ke faktur pembelian**
saat barang datang, itu pekerjaan di modul Pembayaran (Hari 26–27) — modul yang `KONTEKS_REVISI`
§4.1 tandai **belum pernah dibahas sama sekali** dan plan sebut sebagai bagian tersulit. Menambah
alokasi uang muka ke dalamnya perlu diketahui **sekarang**, bukan saat modulnya sedang ditulis.

Kalau cukup dicatat sebagai saldo dan dikurangi manual lewat jurnal, biayanya nol.

**Default kalau tidak dijawab:** akun `01.140.00001 Uang Muka Pembelian` sebagai **saldo saja**.
Pengurangannya lewat jurnal manual MASTER saat barang datang. Alokasi otomatis ke faktur menyusul
pasca-MVP.

---

## K-8. Rekening bank atas nama pribadi

**Temuan.** Tiga rekening di neraca Juli: **Bank BCA Edy Kasim**, **Bank BSI Edy Kasim**, dan
**Bank BSI Asmiati** — ketiganya atas nama perorangan. Jawaban §4 putaran 1 menyebut tiga bank:
BSI, Mandiri, BCA. Pertanyaan L14.3 di putaran 2 menanyakan hal ini dan **belum dijawab**.

**Pertanyaan:**

1. Dari ketiganya, mana yang benar-benar **rekening operasional toko** (uang masuk dari pelanggan,
   uang keluar ke supplier)?
2. **Bank BSI Asmiati Rp 2.116.391** — rekening siapa, dan dipakai untuk apa?
3. Rekening **Mandiri** yang disebut di jawaban §4 tidak muncul di neraca Juli. Masih aktif?
4. Kalau satu rekening dipakai **campur** (uang toko dan uang pribadi lewat rekening yang sama),
   apakah mutasi pribadinya bisa dikenali? Kalau tidak bisa, rekening itu sebaiknya **tidak**
   dijadikan akun kas toko — yang dicatat cukup setoran/penarikan yang jelas milik toko.

**Kenapa ini menentukan kode.** Akun bertanda `is_cash_account` muncul di setiap layar pembayaran
dan penerimaan; salah satu terlalu banyak berarti operator punya pilihan yang seharusnya tidak
ada. Dan `requires_outflow_approval` hanya bermakna kalau kita tahu rekening mana yang dipegang
master.

**Default kalau tidak dijawab:** tiga akun kas (Kas Kecil, Kas Toko, Kas Besar) **aktif**, dan
tiga akun bank (BCA, BSI, Mandiri) dibuat dengan nama generik untuk diperbaiki MASTER lewat menu
Bagan Akun. Bank BSI Asmiati **tidak** dibuatkan akun sampai jelas.

---

## K-9. Konfirmasi daftar akun beban (lanjutan L1)

**Temuan.** Pertanyaan L1 putaran 2 belum terjawab (jawaban tertulis `sd` dan `asd`), tapi berkas
`Chart_of_Accounts_Affari.xlsx` yang dikirim 11 Agustus **sudah menjawabnya sebagian** — grup 08
memuat 46 akun biaya. Dari situ ditambah rincian laporan Juli, kami susun **25 akun beban**
(10 penjualan & distribusi, 15 umum & administrasi) di `docs/COA_USULAN.md` §3 Grup 06.

**Pertanyaan:**

1. Dari 25 akun itu, mana yang **tidak akan pernah dipakai**? Akun mati lebih baik tidak dibuat
   daripada dibuat lalu jadi tempat sampah.
2. Ada biaya rutin yang **belum tercakup**? Yang kami tandai belum jelas: biaya sewa (ada
   akunnya, tapi tidak ada di laporan Juli), biaya solar/genset, biaya timbangan/tera.
3. Empat akun Affari ini kami **tidak adopsi** — betul tidak dipakai?
   `B. Benda Pos dan Materai` · `B. Penginapan` · `B. Uang Saku` · `B. Notaris`
4. `08.213 B. Kehilangan dan Pemusnahan Barang` kami pindahkan ke **Grup 05 (harga pokok)** sebagai
   `Kerugian Barang Rusak dan Pemusnahan`, karena yang hilang adalah barang dagangan. Setuju?

**Kenapa ini menentukan kode.** Ini yang paling **tidak** menentukan di daftar ini — akun beban
bisa ditambah, dinonaktifkan, dan diganti nama sendiri oleh MASTER lewat menu Bagan Akun (siap
Hari 18) tanpa menyentuh kode apa pun. Yang tidak bisa diubah belakangan adalah **strukturnya**,
dan itu sudah diputuskan.

**Default kalau tidak dijawab:** 25 akun sesuai usulan. Klien memperbaiki sendiri sebelum
cut-over.

---

## K-10. Gaji "Edy" Rp 18 juta/bulan

**Temuan.** Dua baris terpisah di laporan Juli:

| | Rp |
|---|---|
| Biaya Gaji Edy via Cash / Kas Besar | 3.686.500 |
| Biaya Gaji Edy via Bank BCA | 14.340.700 |
| **Jumlah** | **18.027.200** |

Sebagai pembanding, tiga karyawan bulanan lain (Zeby, Andin, Qory) digaji total Rp 7.250.000.
Rekening BCA dan BSI di neraca juga atas nama **Edy Kasim**.

**Pertanyaan:**

1. **Edy** adalah pemilik usaha, atau karyawan?
2. Kalau pemilik: Rp 18 juta itu **gaji yang memang dianggarkan** untuk dirinya sebagai pengelola,
   atau **pengambilan sesuai kebutuhan** bulan itu?
3. Nilainya tetap tiap bulan atau berubah-ubah?

**Kenapa ini menentukan kode.** Untuk usaha perorangan, pengambilan pemilik adalah **Prive**, bukan
beban gaji — pemilik tidak bisa menggaji dirinya sendiri, karena seluruh laba sudah menjadi
haknya. Mencatatnya sebagai beban akan mengurangi laba usaha sebesar Rp 18 juta/bulan
(±Rp 216 juta/tahun) untuk sesuatu yang bukan biaya menjalankan toko.

Perkecualiannya: kalau pemilik memang bekerja penuh waktu mengelola toko dan nilainya tetap
seperti karyawan lain, mencatatnya sebagai beban gaji bisa dibenarkan — asal konsisten dan
nilainya wajar. Nilai yang berubah-ubah mengikuti kebutuhan adalah tanda ia sebenarnya Prive.

**Default kalau tidak dijawab:** **beban gaji** (`06.120.00001`), karena bentuknya rutin dan
dibayar lewat dua jalur seperti gaji karyawan lain. Diberi tanda di dokumen saldo awal supaya
mudah direklasifikasi kalau ternyata Prive.

---

## K-11. Data aset tetap per unit

**Temuan.** Neraca Juli mencantumkan aset tetap beserta tanggal di dalam namanya —
`NINJA SUZUKI KAWASAKI 16/7/23`, `ENGKEL MITSUBISHI 14/7/23 F-8746SR`,
`KOMPUTER UNTUK ADMIN 26/9/23` — jadi tanggal perolehannya **sudah diketahui**, hanya belum
menjadi data. Semuanya masih tercatat sebesar harga perolehan penuh; belum pernah disusutkan.

Sudah diputuskan: akun penyusutan disediakan tapi **dormant**.

**Pertanyaan:**

1. Kalau nanti mulai menyusutkan, dihitung sejak **tanggal perolehan asli** (artinya ada
   penyusutan tertunggak 2–3 tahun yang harus diakui sekaligus) atau **mulai 1 September 2026**
   saja ke depan?
2. Ada aset yang **sudah tidak ada wujudnya** tapi masih tercatat? (`PICK UP MITSUBISHI 13/1/23`
   sudah bernilai nol di laporan — sudah dijual? kalau ya, ada laba/rugi penjualannya?)
3. Boleh kami minta daftar aset tetap beserta **harga perolehan dan tanggal perolehan per unit**?
   Neraca sudah memuat hampir semuanya; kami hanya perlu konfirmasi.

**Kenapa ditanya sekarang.** Bukan karena mendesak — penyusutan pasca-MVP. Tapi **saldo awal
1 September** akan mengunci harga perolehan setiap aset, dan kalau nanti penyusutan dihitung
sejak tanggal perolehan asli, tanggal itu harus sudah tersimpan. Menyusulkannya berarti mengetik
ulang data yang hari ini masih ada di kepala orang.

**Default kalau tidak dijawab:** aset tetap dicatat sebesar nilai di neraca Juli, dikelompokkan ke
empat akun (`Bangunan`, `Kendaraan`, `Peralatan dan Inventaris Kantor`, `Peralatan Gudang`), tanpa
akumulasi penyusutan. Tanggal perolehan disimpan di keterangan jurnal saldo awal.

---

## K-12. Cicilan pokok BSI 12 bulan ke depan

**Temuan.** Hutang BSI Rp 1.425.979.498 berjangka **2025–2035** dan seluruhnya dicatat sebagai
hutang jangka panjang. Cicilan ke-9 sudah dibayar per Juli.

**Pertanyaan:**

1. Berapa **pokok** yang akan jatuh tempo dalam 12 bulan ke depan (September 2026 – Agustus 2027)?
   Angka ini biasanya ada di jadwal angsuran dari bank.
2. Cicilan bulanan Rp 12.544.657 itu **pokok + bunga**, atau bunga saja?

**Kenapa ini menentukan kode.** Bagian pinjaman yang jatuh tempo dalam setahun disajikan sebagai
**liabilitas jangka pendek** (`02.110.00011`), sisanya jangka panjang (`02.210.00001`). Tanpa
pemisahan itu, neraca menyatakan tidak ada kewajiban besar yang jatuh tempo tahun depan — padahal
ada, dan itu justru angka yang paling menentukan kemampuan bayar.

Ini murni penyajian; tidak menghambat koding.

**Default kalau tidak dijawab:** seluruhnya di `02.210.00001` (jangka panjang), sama seperti
sekarang. Akun `02.110.00011` tetap dibuat, kosong, siap diisi begitu jadwal angsuran ada.

---

## K-13. Bentuk laporan Laba Rugi akan berubah — ini pemberitahuan, bukan pertanyaan

**Temuan.** Laporan Juli menghitung harga pokok dengan cara **periodik**:

```
Persediaan Awal + Pembelian − Retur Pembelian + Retur Penjualan − Persediaan Akhir
```

Sistem baru memakai **perpetual FIFO**: harga pokok dihitung dan dicatat **per baris faktur**,
saat penjualan terjadi, dari lot yang sebenarnya terpakai. Lima baris di atas **tidak akan pernah
muncul lagi** di laporan.

**Yang berubah bagi pemilik:**

| | Sekarang | Sistem baru |
|---|---|---|
| Harga pokok diketahui | akhir bulan, setelah stok dihitung | **saat faktur disimpan** |
| Margin per faktur | tidak bisa dihitung | terbaca langsung |
| Margin per produk / per pelanggan | tidak bisa dihitung | terbaca dari laporan |
| Kalau stok fisik tidak dihitung | harga pokok jadi tebakan | tetap benar |
| Bentuk L/R | Persediaan Awal + Pembelian − Persediaan Akhir | Penjualan − HPP |

Laba bruto Juli Rp 102.424.575 atas penjualan Rp 4,9 miliar berarti **margin kotor 2,09%**. Untuk
grosir FMCG angka itu di sisi tipis. Dengan perpetual, pemilik akhirnya bisa melihat **produk dan
pelanggan mana** yang menariknya ke bawah — dan kontrol "jual di bawah harga pokok"
(`CLAUDE.md` §2.17) baru punya arti setelah harga pokok diketahui per baris.

**Pertanyaan:**

1. Ada yang perlu kami jelaskan lebih dulu ke pemilik sebelum laporan pertama keluar?
2. Kalau boleh memilih **satu** laporan margin yang wajib ada di bulan pertama: per produk, per
   pelanggan, atau per salesman?

> Catatan: laporan penjualan, piutang, dan hutang **ditunda ke pasca-MVP** (keputusan 29 Juli,
> `CLAUDE.md` §0). Yang ada di bulan pertama hanya laporan stok, rekap kas harian, dan Laporan
> Kontinuitas Nomor Dokumen.

---

## K-14. 🔴 Persediaan Rp 1,84 miliar — dari hitung fisik atau dari catatan?

**Temuan.** Neraca Juli mencantumkan Persediaan Barang Dagang Akhir **Rp 1.843.312.754** — pos
terbesar di seluruh aset lancar, **57%** dari total aset lancar dan lebih besar dari kas dan bank
digabung. Nilainya diketik sebagai **satu angka tunggal**, tanpa rumus dan tanpa rincian per
produk.

**Pertanyaan:**

1. Angka itu berasal dari **hitung fisik gudang**, atau dari saldo catatan/Affari?
2. Kalau hitung fisik: kapan terakhir dilakukan, dan berapa lama sekali?
3. Kalau dari catatan: pernah dicocokkan dengan fisik? Selisihnya biasanya berapa besar?
4. Untuk saldo awal 1 September, **siapa yang menghitung**, kapan, dan disaksikan siapa?

**Kenapa ini yang paling menentukan dari semuanya.** Saldo awal persediaan membentuk **lot FIFO
pembuka** untuk setiap produk. Dari lot itulah harga pokok setiap penjualan bulan pertama diambil.
Kalau nilainya meleset 5%, harga pokok bulan pertama meleset ±Rp 92 juta — dan pada margin kotor
2,09%, kesalahan sebesar itu **lebih besar dari seluruh laba bulan itu**.

Dan kesalahannya tidak akan memunculkan error apa pun. Ia hanya akan terlihat sebagai laba yang
aneh, berbulan-bulan kemudian, saat sudah terlalu banyak transaksi untuk ditelusuri balik.

Ini juga bukan pekerjaan sehari. Dengan ±61 produk (`REC(s): 61` di Affari — masih perlu
dipastikan apakah itu total atau tampilan terfilter, `KONTEKS_REVISI` §4.2 no. 6), hitung fisik
plus penentuan harga pokok per produk perlu **orang, waktu, dan saksi yang ditetapkan namanya**.

**Default kalau tidak dijawab:** kami tetap membangun alur saldo awal apa adanya, dan angka yang
diketik Hari 36 (29 Agustus) adalah angka yang diberikan klien — dengan catatan tertulis di
dokumen serah terima bahwa nilainya **belum diverifikasi fisik**. Kami tidak bisa memverifikasinya
dari sini.

---

## K-15. Angka Rp 12.478.500 yang tidak ikut dijumlahkan

**Temuan.** Di neraca Juli, baris **Piutang Tiga Sekawan Cibeber** berisi dua angka bersebelahan:
Rp 6.745.000 (yang **ikut** dijumlahkan ke total piutang) dan Rp 12.478.500 di kolom sebelahnya
(yang **tidak** ikut). Rumusnya `4.328.000 + 3.082.500 + 5.068.000` — jadi ia disusun dari tiga
faktur, sama seperti angka di sebelahnya.

**Pertanyaan:**

1. Angka Rp 12.478.500 itu apa? Piutang yang belum ditagih, faktur yang belum diserahkan, atau
   catatan untuk keperluan lain?
2. Kalau itu memang piutang, apakah ia sengaja tidak dihitung — atau terlewat?

**Kenapa ditanya.** Kalau itu piutang yang sah, total piutang per 31 Juli seharusnya
Rp 76.609.500, bukan Rp 64.131.000 — dan neraca yang sekarang kurang mencatat aset Rp 12,5 juta.
Kalau bukan, tidak ada yang perlu diubah. Yang tidak boleh adalah kita menebak.

**Default kalau tidak dijawab:** mengikuti laporan klien apa adanya (Rp 64.131.000), dengan
catatan tertulis di dokumen saldo awal bahwa ada Rp 12.478.500 yang belum dijelaskan.

---

## K-16. Apartemen yang IPL-nya dibayar tapi asetnya tidak tercatat

**Temuan.** Laporan Juli memuat "Biaya IPL Apartemen Rp 2.129.126" setiap bulan — IPL adalah iuran
pengelolaan yang hanya dibayar oleh pemilik atau penyewa unit apartemen. Tapi **tidak ada
apartemen di neraca**, baik sebagai aset maupun sebagai sewa dibayar di muka.

**Pertanyaan:**

1. Apartemen itu milik pemilik, atau disewa?
2. Kalau milik: kenapa belum pernah masuk neraca? Berapa harga perolehannya dan kapan dibeli?
3. Kalau disewa: berapa sewanya dan kapan jatuh tempo perpanjangannya?

**Kenapa ini ditanya bersamaan dengan K-2.** Rumah tinggal sudah diputuskan **tetap** di neraca
toko sebagai Aset Non-Usaha. Kalau apartemen juga milik pemilik dan dibiayai uang toko, ia berada
dalam kedudukan yang sama persis — dan meninggalkannya di luar neraca berarti perlakuan yang tidak
konsisten untuk dua hal yang sejenis. Akun `01.310.00002 Properti Lain Milik Pemilik` sudah
disediakan kosong untuk ini.

**Default kalau tidak dijawab:** akun `01.310.00002` tetap kosong. IPL diperlakukan sesuai pilihan
Versi A/B seperti empat pos konsumsi pribadi lainnya.

---

## Yang kami minta dibawa pulang dari pertemuan ini

- [ ] **Berkas Excel yang sudah dicoret** — `COA_Usulan_OmegaSinarTerang.xlsx`
- [ ] Pilihan **Versi A atau Versi B** untuk lima pos konsumsi pribadi
- [ ] **Nama orang** yang akan menghitung fisik persediaan per 31 Agustus, plus saksinya (K-14)
- [ ] Status **Edy**: pemilik atau karyawan (K-10)
- [ ] Peruntukan **kartu kredit** Permata & Mega (K-3)
- [ ] Daftar **rekening bank** mana yang uang toko (K-8)
- [ ] Kedudukan **Dadam, Lichin, Atek** — pelanggan atau pinjam-meminjam (K-6)
- [ ] Coretan/koreksi atas **25 akun beban** di lembar `Bagan Akun` (K-9)

Setelah pertemuan: perbarui `docs/COA_USULAN.md` (hapus tanda 🔶 yang sudah terjawab),
`PROGRESS.md` §1, dan tandai item terjawab di `yang_perlu_ditanya_ke_klien.md`.
