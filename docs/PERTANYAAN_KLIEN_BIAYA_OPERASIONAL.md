# Pertanyaan Klien — Modul Biaya Operasional (Pengeluaran Kas)

> Disusun 10 Agustus 2026 (Hari 17) untuk sesi tatap muka dengan klien.
> Menggantikan daftar ringkas di `yang_perlu_ditanya_ke_klien.md` §"Modul Biaya Operasional".
>
> **Sumber temuan:** screenshot sistem lama `docs/referensi/pengeluaran-kas/` (Affari
> v7.57.27, layar **[OPK] Kas Kecil — Operational Keluar**), `CLAUDE.md` v3,
> `KONTEKS_REVISI_2026-07-28.md` §4.1, `docs/PROMPTS_HARIAN.md` Hari 17.
>
> **Cara pakai:** setiap blok punya **Temuan** (fakta dari sistem lama — bukan tebakan),
> **Pertanyaan**, **Kenapa ini menentukan kode**, dan **Default kalau tidak dijawab hari ini**.
> Default itu bukan ancaman; itu yang benar-benar akan kami bangun besok pagi supaya jadwal
> tidak berhenti. Klien perlu tahu konsekuensinya.

---

## 0. Kalau waktunya cuma 10 menit — enam ini dulu

Enam pertanyaan di bawah menentukan **skema database dan kode dokumen**. Salah tebak berarti
migration dibongkar, dan margin jadwal tinggal +0,65 hari.

| # | Pertanyaan | Blok |
|---|---|---|
| 1 | Satu bukti pengeluaran **per hari berisi banyak baris**, atau satu bukti per pengeluaran? | §1 |
| 2 | Boleh minta **daftar akun biaya** yang benar-benar dipakai (kode 08.xxx di Affari)? | §2 |
| 3 | Kolom **"Pending"** di panel Pelunasan itu apa — biaya yang belum dibayar? | §5 |
| 4 | Layar Pengeluaran Kas juga dipakai **membayar faktur supplier**, atau khusus biaya? | §6 |
| 5 | Bukti kas keluar itu **dicetak dan ditandatangani penerima**, atau cukup tercatat? | §8 |
| 6 | Berapa **ambang nominal** yang wajib disetujui supervisor, dan dari kas yang mana? | §4 |

Sisanya (§3, §7, §9–§14) boleh menyusul lewat WhatsApp dalam 2–3 hari.

---

## 1. Bentuk dokumen — ini yang paling menentukan

**Temuan.** Di Affari, satu hari = **satu bukti** bernomor `OPK-26070024`, keterangannya
`BIAYA OPERATIONAL TANGGAL 28-07-2026`, isinya **7 baris** akun berbeda dengan total
Rp 721.000. Bulan Juli 2026 terbit **26 bukti** (`OPK-26070001` … `OPK-26070026`), nilainya
Rp 375.000 – Rp 1.310.000 per hari. Artinya: hampir tiap hari kerja ada satu bukti,
rata-rata 6–8 baris → **±180 baris biaya per bulan**.

Rencana kami untuk Hari 17 berbentuk **satu transaksi = satu biaya** (tanggal, akun biaya,
akun kas, nominal, keterangan). Itu **bentuk yang berbeda** dari kebiasaan mereka.

**Pertanyaan:**

1. Apakah kebiasaan "satu bukti per hari, banyak baris" itu memang **cara kerja kasir**
   (dia mengumpulkan nota kecil sepanjang hari, lalu membukukan sekali di sore hari),
   atau hanya keterbatasan Affari?
2. Kalau bukti hari ini sudah dibuat sore jam 17:00 lalu jam 19:00 ada pengeluaran lagi —
   sekarang bagaimana? Ditambahkan ke bukti yang sama, atau bikin bukti baru?
3. Kalau kami buat **satu pengeluaran = satu baris** (lebih sederhana, dan rekap per hari
   tetap bisa ditampilkan di layar), apakah kasir keberatan? Konsekuensinya: nomor bukti
   yang terbit jadi ±180/bulan, bukan ±26/bulan.


**Jawaban:**
1. Betul itu kebiasaan ooperator karena memang setiap pengeluaran di compile di akhir hari
2. Ditambahkan ke bukti yang sama
3. Buat tetap satu bukti per hari, banyak baris. Tetapi gunakan konsep yang sama seperti modul lain, yakni 2 modal: Modal pertama untuk input satu bukti, modal kedua untuk input per baris.

**Kenapa ini menentukan kode.** Bentuk header+baris (`operational_expenses` +
`operational_expense_lines`) versus tabel datar adalah keputusan migration. Menambah tabel
baris setelah data masuk berarti migrasi data, bukan sekadar `ALTER TABLE`. Ini juga
menentukan apakah VOID membatalkan **satu baris** atau **satu hari penuh** — dan kalau
satu hari penuh, mengoreksi satu baris salah ketik berarti membalik 7 baris lalu
mengetik ulang semuanya.

**Default kalau tidak dijawab hari ini:** kami bangun **header + baris** (mengikuti
kebiasaan mereka), karena bentuk itu bisa dipakai untuk mencatat satu baris saja, sedangkan
tabel datar tidak bisa dinaikkan jadi multi-baris tanpa migrasi.

---

## 2. Daftar akun biaya — kami tidak punya satupun

**Temuan.** Sistem baru saat ini hanya punya **satu** akun biaya: `5102 Biaya Operasional`.
Affari memakai bagan akun berjenjang dengan nama-nama nyata yang terbaca di screenshot:

| Kode Affari | Nama Perkiraan |
|---|---|
| `08.017.00001` | B. Gaji |
| `08.001.00001` | B. Parkir |
| `08.001.00002` | B. Angkat Staff Customer |
| `08.003.00001` | B. BBM D-8327 TD |

**Pertanyaan:**

1. Boleh kami minta **cetakan/foto daftar perkiraan grup 08** dari Affari? Ini yang paling
   cepat — daripada kami tanya satu per satu.
2. Dari daftar itu, mana yang **benar-benar dipakai 12 bulan terakhir**? Akun yang sudah
   mati tidak perlu ikut pindah.
3. `B. BBM D-8327 TD` memuat **nomor polisi di dalam nama akun**. Kalau kendaraan bertambah,
   apakah mereka membuat akun baru lagi (`B. BBM <plat baru>`)? Atau lebih baik satu akun
   `Biaya BBM` + **kolom kendaraan** yang dipilih dari master?
   → Kami sudah menjadwalkan **master Kendaraan** di Hari 24 untuk surat jalan. Kalau
   dipakai bersama, laporan "BBM per kendaraan" tetap bisa, tanpa bagan akun yang membengkak.
4. Apakah ada biaya yang **bukan kas** — misalnya penyusutan, atau biaya yang dibayar
   pemilik dari kantong pribadi? (Menentukan apakah lawan jurnalnya selalu akun kas.)

**Jawaban:**
1. sd
2. asd
3. Lebih baik buat satu akun saja, tetapi bisa memilih kolom kendaraan
4. Penyusutan tidak ada. Dan jika ada yang dibayar pemilik, itu keluar dari kas kecil (kas kasir)

**Kenapa ini menentukan kode.** Akun-akun ini masuk COA dan dipakai di jurnal setiap hari.
Kalau kami menebak dan ternyata salah, seluruh transaksi biaya sejak cut-over menunjuk akun
yang salah, dan memindahkannya berarti menulis ulang jurnal — bukan sekadar mengganti nama.

**Default kalau tidak dijawab hari ini:** kami seed 8–10 akun biaya generik (Gaji, BBM,
Parkir & Retribusi, Angkut/Bongkar, Listrik & Air, Telepon & Internet, Sewa, Perlengkapan
Kantor, Perbaikan, Lain-lain) di seri `52xx`, dan klien memperbaikinya sendiri lewat CRUD COA
(Hari 18) sebelum cut-over.

---

## 3. Gaji harian — ini bukan sekadar satu baris biaya

**Temuan.** Di bukti tanggal 28-07-2026 ada **empat baris `B. Gaji` terpisah**
(Rp 130.000 · 100.000 · 80.000 · 80.000), dan setiap baris punya keterangan bebas berisi
**nama orang** — contoh yang terbaca: `MANG ICUNG`. Jadi upah harian sudah dicatat per orang,
tapi namanya hanya teks bebas, bukan data.

**Pertanyaan:**

1. Siapa saja yang dibayar harian — **buruh angkat, sopir, salesman, atau semuanya**?
   Berapa orang biasanya per hari?
2. Nominalnya berbeda-beda (130/100/80 rb). Itu **tarif per orang** yang tetap, atau
   tergantung beban kerja hari itu?
3. Apakah pemilik pernah bertanya *"bulan ini saya bayar berapa ke Mang Icung?"* —
   kalau ya, nama harus jadi **data (master orang)**, bukan teks bebas. Kalau tidak pernah,
   teks bebas cukup dan kita hemat satu master + satu layar.
4. Kalau perlu master: apakah cukup memakai ulang **master Salesman** yang sudah ada
   (tambah kolom "jenis: salesman / buruh / sopir"), atau orang-orang ini memang di luar
   salesman?
5. Ada uang makan / bonus / kasbon yang dipotong dari upah? (Kasbon = piutang karyawan,
   itu konsep lain lagi — bukan biaya.)

**Jawaban:**
1. Hanya tukang angkut. Salesman dibayar per bulan.
2. Nominalnya input manual
3. Iya
4. Ada 2 jenis: Tukang angkut dibayar setiap hari tetapi salesman dibayar per bulan. Tukang angkut diinput oleh operator, sementara salesman hanya diinput oleh master.
5. Piutang karyawan ada. 

**Kenapa ini menentukan kode.** Teks bebas = 0 hari kerja. Master orang + laporan per orang
= ±0,5 hari, dan kami hanya punya **+0,65 hari margin** yang sudah dialokasikan untuk modul
Pembayaran (Hari 26–27). Jadi kalau ini diminta, ada yang harus ditukar.

**Default kalau tidak dijawab hari ini:** teks bebas per baris (`keterangan_baris`), sama
seperti Affari. Bisa dinaikkan jadi master pasca-MVP tanpa membongkar jurnal.

---

## 4. Sumber kas: Kas Kecil vs Kas Besar, dan ambang persetujuan

**Temuan.** Judul layar Affari berbunyi **`[OPK] Kas Kecil`** — jadi pemisahan kas kecil
memang sudah ada di kepala mereka. Di sistem baru, akun kas **tidak di-seed** sama sekali
(`CLAUDE.md` §3); Master yang membuatnya lewat CRUD COA. Dan
`settings.cash_outflow_approval_threshold` saat ini masih **0**, artinya kalau tidak diisi,
**setiap** pengeluaran dari akun bertanda akan minta persetujuan supervisor — mengganggu.

**Pertanyaan:**

1. Ada berapa "dompet" sebenarnya? (Kas Kecil di laci kasir · Kas Besar/brankas pemilik ·
   rekening bank — sebutkan bank dan atas nama siapa.)
2. Siapa yang **memegang** masing-masing, dan siapa yang boleh mengeluarkan?
3. Kas Kecil diisi ulang dari mana? Kalau dari Kas Besar, itu **pindah buku, bukan biaya** —
   apakah mereka mencatatnya sekarang? Berapa sering, dan berapa nominal isi ulangnya?
4. **Berapa nominal** pengeluaran yang menurut pemilik "harus saya tahu dulu sebelum keluar"?
   (Angka ini yang masuk `cash_outflow_approval_threshold`.)
5. Persetujuan itu **untuk semua kas, atau hanya Kas Besar**? Pengeluaran Rp 2 juta dari
   Kas Kecil dan dari Kas Besar — sama-sama perlu izin?
6. Kalau supervisor/pemilik **sedang tidak di tempat** dan uangnya harus keluar sekarang
   (mis. bayar buruh sore hari) — sekarang bagaimana? Sistem baru akan **menahan** transaksi
   sampai disetujui (bukan sekadar menandai).

**Jawaban**
1. Untuk kas, ada 3 macam: Kas kecil untuk operasional (Biasanya 1 juta), Kas toko yang berasal dari hasil penjualan toko/sales yang sudah kembali, dan Kas besar/brankas untuk pembelian jika nominal > kas toko dan menjadi destinasi akhir saat tutup hari. Di akhir hari, kas kecil dipakai untuk membayar biaya operasional dan operator menarik 1 juta untuk mengisi kembali kas kecil dari kas toko.

Rekening Bank: BSI, Mandiri, BCA
2. Kas kecil dipegang operator. Kas toko dipegang operator. Kas besar dipegang master. Rekening bank dipegang master
3. Kas kecil diambil dari kas toko. Nominal 1 juta. Perlu pencatatan
4. Tidak ada
5. Setiap keluar kas besar harus ada persetujuan. Kas kecil selama ada nota aman (Tidak perlu upload. Di cek fisik)
6. Tetap ada. Tidak perlu di handle. Tetapi tahan transaksi dulu saja sampai disetujui.

**Kenapa ini menentukan kode.** Menentukan akun mana yang dicentang
`requires_outflow_approval`, nilai ambangnya, dan apakah `StepUpService` melihat
**akun kas sumber** atau **akun biaya tujuan**. Pertanyaan 6 juga risiko operasional nyata:
kontrol yang menghentikan pembayaran buruh akan dimatikan dalam seminggu.

**Default kalau tidak dijawab hari ini:** ambang **Rp 1.000.000**, hanya berlaku untuk akun
kas yang dicentang Master (default: tidak ada yang dicentang → kontrol tidur sampai klien
menyalakannya). Kontrol yang tidur lebih baik daripada kontrol yang dimatikan paksa.

---

## 5. 🔴 "Pending" di panel Pelunasan — jangan lewatkan yang ini

**Temuan.** Layar Affari punya panel **PELUNASAN** dengan lima angka:
`Total 721.000` · `Tunai 721.000` · `Giro 0` · `Transfer 0` · **`Pending 0`**.

**Pertanyaan:**

1. Apa arti **Pending**? Apakah ini "biaya sudah tercatat tapi uangnya belum keluar"?
2. Kalau ya — **kapan itu terjadi** dalam praktik? Berapa sering? (Contoh: tagihan listrik
   masuk tanggal 20, dibayar tanggal 25.)
3. **Giro** dan **Transfer** untuk biaya operasional — pernah dipakai? Untuk pengeluaran apa?
   Kalau giro: giro keluar itu dicatat saat **diserahkan** atau saat **cair**?

**Jawaban**
1. Ini tidak perlu di takeover. Setiap biaya dapat dibayar saat itu juga
2. Tidak
3. Tidak pernah dipakai

**Kenapa ini pertanyaan paling berbahaya di daftar ini.** Kalau jawaban (1) adalah "ya",
maka biaya operasional bukan lagi "kas keluar" sederhana — dia butuh akun **Hutang Biaya**,
dua peristiwa terpisah (pengakuan biaya lalu pembayaran), dan sisa tagihan yang harus
dilacak. Itu **modul kecil tersendiri**, bukan satu layar. Kalau jawabannya "tidak pernah,
selalu tunai saat itu juga", modul ini tetap sekecil rencana.

**Default kalau tidak dijawab hari ini:** biaya operasional **selalu tunai saat dicatat**.
Tidak ada Hutang Biaya, tidak ada giro. Kalau ternyata dipakai, ini penambahan scope
pasca-MVP — dan sementara itu tagihan tertunda dicatat manual di kertas.

---

## 6. 🔴 Batas dengan modul Pembayaran — apakah layar ini juga membayar supplier?

**Temuan.** Dialog "Entri Item Data Pengeluaran Kas" punya field **`Status: Nota`**,
**`No. Bukti`** dengan tombol pencarian, dan **`Jth. Tempo`**. Field-field itu tidak masuk
akal untuk biaya parkir Rp 21.000 — itu bentuk **pembayaran atas sebuah dokumen**. Nama
layar sebelahnya juga menguatkan: `Penerimaan Kas – Entri baris – Daftar Nota`, yang jelas
memilih faktur.

**Pertanyaan:**

1. Apakah layar Pengeluaran Kas ini juga dipakai untuk **membayar faktur pembelian ke
   supplier**? Atau ada layar lain untuk itu?
2. Kalau ya: dalam satu bukti yang sama pernah bercampur "bayar supplier" + "biaya parkir"?
3. Field `Jth. Tempo` di baris pengeluaran itu untuk apa?

**Jawaban**
1. Itu di menu pelunasan.
2. Untuk di menu pengeluaran kas operasional, hanya terbatas untuk biaya operasional, baik untuk biaya keluar barang maupun biaya masuk barang.
3. Itu di menu pelunasan.

**Kenapa ini menentukan kode.** Di sistem baru, pembayaran supplier adalah **modul terpisah**
(Hari 26–27) yang menyentuh **Hutang Usaha** dan sisa tagihan per faktur. Kalau layar Biaya
Operasional dibiarkan menulis ke Hutang Usaha, saldo hutang per supplier akan **bocor tanpa
satu pun error muncul** — persis jenis kesalahan yang baru ketahuan saat rekonsiliasi
bulanan. Sistem baru akan **melarang** akun Hutang Usaha, Piutang, dan Persediaan dipilih
di layar Biaya Operasional. Klien perlu tahu kebiasaannya berubah.

**Default kalau tidak dijawab hari ini:** Biaya Operasional **hanya** boleh memilih akun
bertipe biaya (`EXPENSE`); Hutang/Piutang/Persediaan diblokir. Pembayaran supplier menunggu
Hari 26–27.

---

## 7. Kolom Kredit di baris — kapan uang justru masuk?

**Temuan.** Grid baris punya kolom **Debet dan Kredit**, dan dialog entri menyediakan
keduanya (`Saldo Normal` ditampilkan sebagai penuntun). Di data nyata kolom Kredit selalu
kosong (`-`), tapi field-nya ada.

**Pertanyaan:**

1. Pernah mengisi kolom **Kredit**? Untuk kejadian apa? (Contoh yang masuk akal: uang jalan
   sopir Rp 300.000, terpakai Rp 220.000, sisa Rp 80.000 dikembalikan.)
2. Kalau kasir salah ketik nominal dan baru sadar besoknya — sekarang **diperbaiki langsung
   (Ubah), atau dihapus (Hapus)**? Kedua tombol itu ada di layar Affari.

**Jawaban**

1. pop up menu ini dipakai juga untuk di menu pelunasan penjualan juga sehingga mengapa ada kolom kredit
2. Ubah tapi pertahankan history perubahan.

**Kenapa ini menentukan kode.** Sistem baru **tidak punya hard-delete** (`CLAUDE.md` §2.1):
koreksi = VOID + jurnal pembalik **bertanggal hari ini**. Artinya total biaya bulan lalu
tidak berubah surut, dan koreksinya kelihatan di bulan ini. Kalau pemilik terbiasa melihat
angka bulan lalu "diperbaiki", dia perlu tahu ini tidak akan terjadi lagi — dan kenapa itu
justru yang benar.

**Default kalau tidak dijawab hari ini:** hanya baris **debit** (pengeluaran). Pengembalian
uang jalan dicatat sebagai penerimaan kas terpisah. Koreksi lewat VOID.

---

## 8. Bukti cetak, nomor dokumen, dan tanda tangan penerima

**Temuan.** Layar daftar Affari punya tombol **Cetak**, kolom **`P`** (tercetak?), dan kolom
**`Checked`** — sama seperti faktur penjualan. Nomornya `OPK-26070026` = kode + YYMM + 4
digit reset bulanan, **pola yang sama** dengan penomoran sistem baru.

Rencana sistem baru: biaya operasional **tidak masuk** daftar 7 dokumen berkunci cetak
(`CLAUDE.md` §2.16) dan **tidak masuk** Laporan Kontinuitas Nomor Dokumen.

**Pertanyaan:**

1. Bukti pengeluaran kas itu **dicetak**? Untuk siapa — arsip kasir, atau **ditandatangani
   penerima uang** (mis. buruh yang menerima upah)?
2. Kalau ditandatangani: satu lembar per hari (semua penerima tanda tangan di lembar yang
   sama), atau satu lembar per orang?
3. Pemilik pernah memeriksa **"nomor bukti kas keluar bulan ini lengkap tidak, ada yang
   hilang?"** — atau itu hanya berlaku untuk faktur penjualan?
4. Kolom **`Checked`** di layar ini dipakai? Siapa yang mencentang, kapan?

**Jawaban**
1. Dicetak untuk arsip
2. -
3. Harus berurut
4. Supervisor di akhir hari.

**Kenapa ini menentukan kode.** Kalau jawabannya "ya, dicetak dan ditandatangani", biaya
operasional butuh: **kode dokumen baru** (usul: `KK` — Kas Keluar), ikut **kunci cetak**
(batal cetak wajib izin sebelum edit/VOID), dan ikut **Laporan Kontinuitas Nomor**.
Itu ±0,3 hari tambahan — murah **sekarang**, mahal setelah nomor mulai terbit, karena
mekanisme kunci cetak menempel di alur simpan.

Kalau jawabannya "cukup tercatat, kami tidak pernah mencetaknya", kita hemat 0,3 hari.

**Default kalau tidak dijawab hari ini:** dibuatkan **kode dokumen `KK`** dan nomor resmi
(murah, dan nomor tidak bisa disusulkan belakangan), **tanpa** kunci cetak dan **tanpa** masuk
Laporan Kontinuitas — dua hal itu bisa ditambahkan pasca-MVP tanpa membongkar data.

---

## 9. Ongkos kirim & ongkos angkut pembelian — perlu nyambung ke fakturnya?

**Temuan.** Sudah diputuskan 29 Juli: **ongkir pembelian tidak dikapitalisasi** ke harga
pokok, masuk biaya operasional (`CLAUDE.md` §3 Pembelian). Di Affari ada akun
`B. Angkat Staff Customer` Rp 30.000 — biaya bongkar/angkut yang muncul harian.

**Pertanyaan:**

1. Ongkir/ongkos bongkar itu dibayar **ke siapa** — supplier (masuk fakturnya), kuli lepas
   di tempat, atau ekspedisi terpisah?
2. Pemilik pernah bertanya *"barang dari supplier X bulan ini ongkosnya berapa?"* Kalau ya,
   baris biaya perlu **kolom opsional: supplier / nomor faktur pembelian** — supaya bisa
   direkap. Kolom opsional itu **murah sekarang, mahal nanti** (data lama tidak bisa
   disusulkan).
3. `B. Angkat Staff Customer` — itu ongkos **bongkar barang masuk** atau **muat barang untuk
   pelanggan**? Namanya ambigu dan kami tidak mau menebak.


**Jawaban:**
1. Jawabn nomor 2
2. Tidak pernah. Karena banyak kasus beberapa toko terletak di tempat yang berdekatan sehingga hanya perlu satu kali bayar parkir. Oleh itu, biaya tidak perlu dipisah per customer tetapi langsung dikompilasi di akhir hari.
3. Biaya angkat staff customer adalah biaya yang keluar saat di toko pelanggan, salesman klien memberi uang tambahan/tip agar tukang angkat di toko pelanggan membantu untuk unloading barang dari truk ke toko pelanggan tersebut. 


**Default kalau tidak dijawab hari ini:** kami tambahkan **kolom opsional `supplier_id` dan
`purchase_invoice_id`** di baris biaya (boleh kosong, tidak memengaruhi jurnal maupun nilai
lot). Menambah kolom kosong hari ini gratis; menyusulkannya setelah 3 bulan data berarti
data lama tidak punya jawaban.

---

## 10. Field "Kepada" — penerima uang

**Temuan.** Header Affari punya field **`Kepada`** dengan tombol pencarian (`...`) dan kotak
nama panjang di sebelahnya — jadi ada master di baliknya. Di semua bukti yang terlihat,
field ini **kosong**.

**Pertanyaan:**

1. Kalau selama ini dikosongkan, apakah memang tidak dipakai — atau dipakai untuk
   pengeluaran jenis tertentu saja?
2. Penerima uang lebih sering dicatat di **keterangan baris** (seperti `MANG ICUNG`)?
   Berarti field "Kepada" tingkat header tidak diperlukan?

**Jawaban**
1. tidak pernah dipakai.

**Default kalau tidak dijawab hari ini:** tidak dibuat. Penerima ditulis di keterangan baris.

---

## 11. Bukti fisik & lampiran

**Pertanyaan:**

1. Nota fisik / kwitansi dari tiap pengeluaran disimpan? Di mana — map bulanan?
2. Perlu **nomor kwitansi/referensi** ikut diketik ke sistem, atau cukup nominal +
   keterangan?
3. Perlu **foto nota di-upload** ke sistem? Kalau ya, siapa yang memotret, dan pakai apa?

**Jawaban**
1. Di map bulanan
2. Nominal saja + keterangan: Misal jika biaya parkir hari ini 21.000, operator akan merincikan x rp ke toko A, x rp ke toko B, ...
3. Tidak perlu

**Kenapa ditanya.** Server sistem baru adalah **PC operator itu sendiri** (HDD 1 TB, tanpa
Docker). Menyimpan foto berarti menambah beban backup harian `pg_dump` dan risiko kalau
HDD-nya mati. Sementara itu kasir tidak punya scanner, dan memotret pakai HP lalu
memindahkannya ke PC adalah langkah manual yang biasanya berhenti dikerjakan dalam 2 minggu.

**Default kalau tidak dijawab hari ini:** **tanpa lampiran file**. Cukup field
`nomor_referensi` (teks bebas, opsional) untuk mencatat nomor kwitansi fisik.

---

## 12. Kapan dicatat — dan peringatan soal aturan 2 hari

**Temuan (ini temuan yang perlu disampaikan, bukan sekadar ditanya).** Kolom `Waktu` di
Affari merekam kapan bukti **diketik**, dan tanggal buktinya sering lebih lama:

| Tgl. Bukti | Diketik | Selisih |
|---|---|---|
| 30-07 (Kamis) | 30-07 17:04 | 0 hari |
| 27-07 (Senin) | 29-07 08:10 | 2 hari |
| 25-07 (Sabtu) | 27-07 17:24 | 2 hari |
| **18-07 (Sabtu)** | **21-07 10:42** | **3 hari** ⚠️ |
| 04-07 (Sabtu) | 06-07 17:41 | 2 hari |

Polanya jelas: **bukti hari Sabtu baru diketik Senin atau Selasa**. Sementara sistem baru
menolak backdate lebih dari **2 hari** (`CLAUDE.md` §2.9) — jadi bukti Sabtu yang baru
sempat diketik Selasa akan **ditolak dengan error**, dan kasir akan buntu.

**Pertanyaan:**

1. Betul bahwa bukti akhir pekan sering baru diketik awal pekan berikutnya?
2. Berapa hari mundur yang **realistis** mereka butuhkan — 3 hari? 7 hari?
3. Kalau lewat batas: mau **diblokir** (kasir memanggil supervisor untuk izin), atau
   **boleh, tapi ditandai** di layar pengecekan supervisor?

**Jawaban**
Buatkan default menjadi mundur 7 hari.

**Kenapa penting.** Batas 2 hari itu kami tetapkan sebelum melihat data ini. Kalau tidak
disesuaikan, hari Senin pertama setelah cut-over kasir akan menemui pesan error untuk
pekerjaan yang selama ini normal — dan kesan pertama terhadap sistem baru rusak karena
aturan yang kita pilih sendiri.

**Usul kami:** naikkan `backdate_max_days` jadi **3** khusus untuk biaya operasional (atau
untuk semua modul, kalau klien setuju), tetap satu titik masuk di `PeriodLockValidator`.
**Ini butuh persetujuan klien — jangan diubah diam-diam.**

---

## 13. Pengeluaran berulang & anggaran

**Pertanyaan:**

1. Ada pengeluaran yang **jumlah dan tanggalnya tetap** tiap bulan (sewa, internet,
   asuransi)? Berapa item?
2. Perlu diingatkan sistem, atau kasir sudah hafal?
3. Ada **anggaran/plafon** per jenis biaya yang ingin dipantau?



**Default kalau tidak dijawab hari ini:** tidak ada template berulang, tidak ada anggaran
(sudah tertulis eksplisit di prompt Hari 17 sebagai hal yang **tidak boleh** dibangun).
Dengan ±26 kali input per bulan, template menghemat sangat sedikit waktu.

---

## 14. Yang harus disampaikan (bukan ditanya) — konsekuensi yang klien belum tahu

Tiga hal ini sudah diputuskan, tapi klien belum pernah mendengar konsekuensinya. Lebih baik
didengar hari ini daripada minggu pertama operasi.

1. **Laporan Biaya Operasional ditunda ke pasca-MVP** (keputusan 29 Juli). Sampai serah
   terima 30 Agustus, yang ada hanyalah **Rekap Kas Harian per akun** (saldo awal · masuk ·
   keluar · saldo akhir) dan ekspor Excel. Kalau pemilik biasa melihat rekap biaya bulanan
   di Affari, dia perlu tahu itu **belum ada di bulan pertama**.
   → **Pertanyaan susulan:** kalau boleh memilih **satu** tampilan biaya yang wajib ada di
   hari pertama, apa? (Mis. "total per akun biaya bulan berjalan".) Satu tampilan sederhana
   masih mungkin diselipkan; laporan lengkap tidak.
2. **Tidak ada tombol Hapus.** Koreksi = VOID + jurnal pembalik bertanggal **hari ini**.
   Angka bulan lalu tidak akan pernah berubah setelah lewat. Ini disengaja.
3. **Saldo awal kas 1 September.** Selain stok, piutang, dan hutang, klien juga harus
   **menghitung fisik uang di Kas Kecil dan Kas Besar** per 31 Agustus malam, plus saldo
   rekening bank. Siapa yang menghitung, dan disaksikan siapa? Ini belum masuk daftar tugas
   klien di `KONTEKS_REVISI` §4.3 — **tambahkan hari ini**.

---

## 15. Yang kami minta dibawa pulang dari meeting ini

> **Status per Hari 17 (implementasi BE selesai):** ditandai `[x]` kalau jawaban di §1-14
> sudah cukup untuk membangun kode (bukan berarti topiknya 100% tuntas — lihat catatan per
> baris). Detail lengkap keputusan & konsekuensinya ada di `PROGRESS.md` §2 "Hari 17" dan §1
> (item baru: piutang karyawan, master tukang angkut bernama).

- [ ] Foto/cetakan **daftar perkiraan grup 08** dari Affari (§2) — jawaban belum berarti
      ("sd"/"asd"). 11 akun `52xx` generik di-seed sebagai placeholder, MASTER perbaiki
      lewat CRUD COA Hari 18.
- [ ] Angka **ambang persetujuan** pengeluaran kas (§4) — dijawab "Tidak ada". Default
      Rp 1.000.000 dipakai (`settings.cash_outflow_approval_threshold`), belum ada akun
      yang dicentang `requires_outflow_approval` (kontrol tidur sampai MASTER menyalakan
      lewat CRUD COA Hari 18).
- [x] Daftar **akun kas & bank** yang benar-benar ada, beserta pemegangnya (§4) — 3 dompet
      (Kas Kecil/Kas Toko/Kas Besar) + bank BSI/Mandiri/BCA, pemegang masing-masing dijawab.
      Belum di-seed sebagai akun sungguhan (akun kas tidak di-seed sistem, CLAUDE.md §3) —
      MASTER buat lewat CRUD COA Hari 18 sesuai daftar ini.
- [x] Jawaban ya/tidak untuk **"Pending"** (§5) dan **"bayar supplier di layar ini"** (§6) —
      keduanya "tidak"/terpisah (menu Pelunasan). Biaya Operasional selalu tunai saat
      dicatat, akun Piutang/Hutang/Persediaan diblokir eksplisit di baris.
- [x] Keputusan **cetak bukti kas keluar** ya/tidak (§8) — ya, untuk arsip. Kode dokumen
      `KK` resmi (`DocumentCounterService`) sudah jalan; layout cetak A5 belum (FE, di luar
      lingkup BE-only hari ini).
- [x] Persetujuan **mengubah batas backdate** (§12) — dijawab "mundur 7 hari" (bukan 3 hari
      seperti usulan awal). Diterapkan KHUSUS modul Biaya Operasional lewat
      `PeriodLockValidatorService` override, modul lain tetap 2 hari.
- [ ] Nama orang yang akan **menghitung saldo kas awal** per 31 Agustus (§14.3) — belum
      dijawab, tetap terbuka untuk sesi berikutnya.

Setelah meeting: perbarui `PROGRESS.md` §1 (baris "Modul Biaya Operasional") dan tandai
item terjawab di `yang_perlu_ditanya_ke_klien.md`.

---

## 16. Selipkan kalau sempat — dua modul yang lebih mendesak

Meeting ini soal biaya operasional, tapi dua item ini **lebih berisiko** dan tenggatnya
sudah dekat. Kalau klien masih punya waktu 10 menit, ini yang paling menguntungkan:

1. **Modul Pembayaran / Kas & Bank (Hari 26–27)** — belum pernah dibahas sama sekali,
   dan plan menandainya sebagai bagian tersulit. §5 dan §6 di atas sudah menyentuh
   pinggirannya (Giro, Transfer, Pending, "Daftar Nota"); teruskan saja percakapannya
   selagi topiknya masih uang tunai.
2. **Bentuk Closing (Hari 23A)** — baris Saldo Awal/Saldo Akhir itu **jurnal sungguhan atau
   tampilan laporan**? Ini menentukan skema database, bukan tampilan. `CLAUDE.md` §2.15
   secara eksplisit melarang kami menebak.
