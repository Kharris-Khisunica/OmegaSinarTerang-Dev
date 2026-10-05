# Pertanyaan Lanjutan — Biaya Operasional (Putaran 2)

> Disusun 10 Agustus 2026 (Hari 17), setelah membaca jawaban klien di
> `PERTANYAAN_KLIEN_BIAYA_OPERASIONAL.md`.
>
> **Jawaban putaran 1 sudah menutup banyak hal** — bentuk dokumen, tidak ada giro/transfer,
> tidak ada hutang biaya, batas dengan menu pelunasan, tidak perlu upload nota, field
> "Kepada" tidak dipakai. Itu semua final dan tidak ditanyakan lagi.
>
> Yang tersisa di bawah adalah: **jawaban yang belum terisi**, **jawaban yang saling
> bertabrakan**, dan **hal baru yang muncul justru karena jawaban klien** — tiga di antaranya
> adalah pekerjaan yang belum pernah ada di rencana sama sekali.
>
> **Cara menjawab:** cukup centang salah satu opsi, atau tulis bebas di bawah tiap nomor.
> Setiap blok menyebutkan apa yang berhenti kalau pertanyaannya belum terjawab.

---

## 0. Enam hal yang bertabrakan — ringkasnya dulu

| # | Yang bertabrakan | Ada di |
|---|---|---|
| 1 | Daftar akun biaya belum terisi (jawaban tertulis `sd` dan `asd`) | §2 |
| 2 | "Tidak ada ambang nominal" vs "setiap keluar kas besar harus persetujuan" | §4 no. 4 vs 5 |
| 3 | "Ubah tapi pertahankan history" vs aturan sistem baru: koreksi wajib VOID | §7 no. 2 |
| 4 | "Baris hanya untuk biaya" vs kasbon karyawan & pindah buku kas yang bukan biaya | §6 vs §3 no. 5 & §4 no. 3 |
| 5 | Pertanyaan ongkos angkut **barang masuk** belum terjawab — jawabannya menjelaskan biaya di sisi pelanggan | §9 no. 1 & 3 |
| 6 | Backdate "7 hari" — untuk semua modul, atau biaya operasional saja? | §12 |

Dan **tiga pekerjaan baru** yang belum pernah ada di rencana, muncul dari jawaban klien
sendiri: **pindah buku kas** (L3), **kasbon/piutang karyawan** (L4), dan **master tukang
angkut** (L5).

---

# BAGIAN A — Menghentikan koding kalau belum dijawab

## L1. Daftar akun biaya (lanjutan §2 no. 1–2)

Jawaban yang tertulis di file adalah `sd` dan `asd` — sepertinya belum sempat diisi.
Ini masih **penghalang nomor satu**: sistem baru hanya punya satu akun biaya (`5102 Biaya
Operasional`), dan tanpa daftar yang benar, setiap jurnal biaya sejak 1 September menunjuk
akun yang salah.

**L1.1** Boleh difoto **daftar perkiraan grup 08** di Affari (menu General Ledger → Master
Perkiraan)? Satu foto layar sudah cukup — kami yang mengetik ulang.

**L1.2** Kalau daftar itu sulit didapat, sebutkan saja lisan: **biaya apa saja yang keluar
dalam sebulan terakhir**? Dari screenshot kami baru tahu empat: Gaji, Parkir, Angkat Staff
Customer, BBM.

**L1.3** Karena gaji tukang angkut diinput **operator** sedangkan gaji salesman hanya boleh
diinput **master** (jawaban §3 no. 4), keduanya **harus jadi dua akun terpisah** — kalau satu
akun, sistem tidak punya cara membedakan siapa yang boleh memakainya. Setuju dipisah jadi:

- [ ] `B. Gaji Tukang Angkut` (operator) dan `B. Gaji Salesman` (master saja)
- [ ] Nama lain: ______________________________

**L1.4 — Tenggat.** Kalau daftar akun belum ada sampai **12 Agustus**, kami seed 10 akun
generik dan klien memperbaikinya sendiri lewat menu Bagan Akun (siap Hari 18). Boleh?

- [ ] Boleh, kami perbaiki sendiri nanti
- [ ] Tunggu daftar kami — akan dikirim tanggal ____________

---

## L2. Biaya operasional dibayar dari kas yang mana?

Jawaban §4 memberi gambaran yang jelas soal tiga kas, tapi belum menjawab satu hal yang
menentukan bentuk tabelnya: **apakah bukti harian ini selalu dari Kas Kecil saja?**

Judul layar Affari berbunyi `[OPK] Kas Kecil`, dan jawaban §4 no. 1 bilang "di akhir hari,
kas kecil dipakai untuk membayar biaya operasional". Terdengar seperti **selalu kas kecil** —
tapi kami tidak mau menebak.

**L2.1** Biaya operasional pernah dibayar dari **Kas Toko** atau **Kas Besar**, atau selalu
dari Kas Kecil?

- [ ] **Selalu Kas Kecil.** Kalau kas kecil habis, isi ulang dulu, baru bayar
- [ ] Bisa dari kas mana saja — pilih per bukti
- [ ] Bisa dari kas mana saja — pilih **per baris** (satu bukti bisa campur)

**Kenapa ini menentukan kode.** Kalau jawabannya "selalu Kas Kecil", akun kas cukup jadi
satu field di kepala bukti dan **persetujuan kas besar tidak pernah muncul di layar ini** —
modul jadi jauh lebih sederhana. Kalau bisa campur per baris, persetujuan harus diperiksa
per baris, dan satu bukti bisa setengah tertahan.

**L2.2** Kalau ada lebih dari satu kas: dalam satu hari boleh terbit **beberapa bukti**
(satu per kas), atau tetap **satu bukti per hari** yang mencampur beberapa kas?

- [ ] Satu bukti per hari **per kas** (bisa 2–3 bukti/hari, nomor tetap berurut)
- [ ] Satu bukti per hari, boleh campur kas

**L2.3** Sistem akan **menolak** kalau operator mencoba membuat bukti kedua untuk tanggal &
kas yang sama (mencegah pengeluaran hari itu terpecah dua tanpa sengaja). Setuju?

- [ ] Setuju, tolak saja
- [ ] Jangan ditolak — kadang perlu bikin bukti kedua

---

## L3. 🆕 Pindah buku kas — pekerjaan yang belum ada di rencana

Jawaban §4 no. 3 menyebut: **kas kecil diisi ulang Rp 1 juta dari kas toko, dan perlu
dicatat.** Jawaban §4 no. 1 juga menyebut **akhir hari kas toko masuk ke kas besar.**

Dua-duanya adalah **pemindahan uang antar kas, bukan biaya** — jurnalnya Kas A (K) / Kas B (D),
tidak menyentuh akun biaya sama sekali. Ini **tidak ada** di rencana Hari 17 maupun di seluruh
plan, dan terjadi **setiap hari**. Harus dibangun sebelum cut-over.

**L3.1** Bentuknya:

- [ ] **Menu tersendiri "Pindah Buku Kas"** (dari kas → ke kas → nominal → keterangan).
      Paling bersih, ±0,25 hari
- [ ] **Baris di dalam bukti kas keluar harian** (kas kecil sebagai tujuan). Lebih ringkas
      tapi mencampur dua konsep di satu layar
- [ ] Tidak usah dicatat di sistem, cukup di kertas

**L3.2** Isi ulang kas kecil: **selalu tepat Rp 1 juta**, atau sebesar yang terpakai hari itu?

- [ ] Selalu Rp 1 juta
- [ ] Sebesar yang terpakai (dikembalikan ke posisi Rp 1 juta)
- [ ] Bebas, tergantung kebutuhan

**L3.3** Setoran akhir hari Kas Toko → Kas Besar: **seluruh isinya**, atau disisakan sebagian
untuk kembalian besok?

- [ ] Seluruhnya
- [ ] Disisakan Rp ____________ untuk modal kembalian

**L3.4** Uang berpindah dari tangan **operator** ke tangan **master**. Siapa yang mengetik?

- [ ] Operator yang mengetik, master hanya melihat
- [ ] Operator mengetik, **master menyetujui** (uang baru dianggap pindah setelah disetujui)
- [ ] Master yang mengetik sendiri saat menerima

**L3.5** Pindah buku perlu **nomor dokumen dan dicetak**, atau cukup tercatat di layar?

- [ ] Bernomor + dicetak
- [ ] Bernomor, tidak dicetak
- [ ] Tidak perlu nomor

---

## L4. 🆕 Kasbon / piutang karyawan (lanjutan §3 no. 5)

Jawaban §3 no. 5 hanya berbunyi **"Piutang karyawan ada."** — kami berhenti di situ, karena
kasbon **bukan biaya**. Uang keluar dari kas, tapi yang bertambah adalah **piutang**, dan
piutang itu punya sisa yang harus dilacak per orang sampai lunas.

**L4.1** Kasbon perlu masuk sistem **sekarang** (sebelum 1 September), atau boleh dicatat di
kertas dulu dan menyusul pasca-MVP?

- [ ] Harus ada sejak 1 September
- [ ] Boleh menyusul, sementara di kertas

**L4.2** Kalau harus ada: berapa sering terjadi dan berapa orang yang biasanya punya kasbon
berjalan? ____________

**L4.3** Kasbon dibayar dari kas mana, dan siapa yang boleh memberi?

- [ ] Kas Kecil, operator boleh langsung
- [ ] Kas Besar, harus master
- [ ] Lainnya: ____________

**L4.4** Cara melunasinya:

- [ ] **Dipotong dari gaji.** → berarti saat bayar gaji, sistem harus mencatat gaji penuh
      lalu potongan kasbon, bukan hanya uang bersih yang diserahkan
- [ ] Disetor tunai terpisah, gaji tetap dibayar penuh
- [ ] Dua-duanya terjadi

**L4.5** Pemilik perlu layar/laporan **"sisa kasbon per orang"**?

- [ ] Perlu
- [ ] Tidak perlu, cukup dicatat

**Kenapa ini ditanya sekarang.** Jawaban L4.4 menentukan apakah baris bukti kas keluar butuh
kolom **potongan** (dan dengan begitu, kolom kredit yang di §7 sudah kami putuskan tidak
dipakai ternyata dipakai). Menambahkannya sekarang murah; menambahkannya setelah data gaji
tiga bulan berjalan berarti data lama tidak punya rincian potongan.

---

## L5. 🆕 Master tukang angkut (lanjutan §3 no. 3–4)

Jawaban §3 no. 3 adalah **"Iya"** — pemilik memang pernah bertanya "bulan ini saya bayar
berapa ke orang ini". Artinya nama penerima **harus jadi data**, bukan teks bebas seperti
`MANG ICUNG` di Affari. Ini pekerjaan tambahan yang perlu diukur.

**L5.1** Ada berapa tukang angkut, dan orangnya **tetap** atau berganti-ganti?

- [ ] Tetap, ____ orang
- [ ] Berganti-ganti — siapa saja yang datang hari itu

> Kalau berganti-ganti, master orang justru **memperlambat** operator (harus daftar orang baru
> dulu sebelum bisa membayar). Kalau begitu keadaannya, lebih baik teks bebas + daftar saran
> dari nama yang pernah diketik.

**L5.2** Bentuk datanya:

- [ ] **Master baru "Pekerja"** (kode, nama, jenis: tukang angkut / sopir, aktif)
- [ ] **Menumpang master Salesman** yang sudah ada, ditambah kolom jenis
- [ ] Teks bebas saja + saran dari riwayat

**L5.3** Gaji **salesman bulanan** — hanya master yang boleh input. Bentuknya:

- [ ] Tetap di layar yang sama, tapi **akun `B. Gaji Salesman` hanya bisa dipilih oleh master**
      (operator tidak melihat akun itu di daftar)
- [ ] **Menu terpisah** khusus penggajian bulanan
- [ ] Master input lewat Jurnal Manual saja

**L5.4** Gaji salesman bulanan perlu dikaitkan ke **salesman tertentu** (supaya bisa direkap
per orang), atau cukup satu baris total?

- [ ] Per salesman
- [ ] Satu baris total

**L5.5** Selain tukang angkut & salesman, ada karyawan lain yang digaji lewat kas ini
(kasir sendiri, sopir, keamanan, ART)? ____________

---

# BAGIAN B — Aturan yang bertabrakan dengan arsitektur yang sudah berjalan

## L6. 🔴 "Ubah" vs "VOID" (lanjutan §7 no. 2)

Jawaban §7 no. 2: **"Ubah tapi pertahankan history perubahan."**

Ini bertabrakan langsung dengan aturan yang sudah dipakai seluruh sistem sejak Hari 11
(`CLAUDE.md` §2.1): **tidak ada hard-delete, koreksi lewat VOID + jurnal pembalik bertanggal
hari ini.** Kami tidak akan melonggarkan aturan itu diam-diam — tapi kami juga tidak mau
memaksakan cara kerja yang menyusahkan kalau tidak perlu.

Ada jalan tengah yang jujur: **boleh Ubah selama dokumennya belum "mengeras"** — belum
dicetak, belum dicek supervisor, dan masih hari yang sama. Setelah salah satu dari tiga itu
terjadi, angka sudah beredar (kertas di map, centang supervisor, jurnal masuk buku besar),
dan mengubahnya diam-diam berarti arsip kertas dan sistem berbeda isi.

**L6.1** Sampai kapan boleh Ubah?

- [ ] **(disarankan)** Selama **belum dicetak dan belum dicek supervisor**. Setelah itu wajib
      VOID lalu input ulang
- [ ] Selama masih **hari yang sama**
- [ ] Bebas selama bulannya belum ditutup
- [ ] Tidak boleh Ubah sama sekali — VOID saja

**L6.2** "History perubahan" itu perlu **terlihat di layar** (tombol "Lihat riwayat" di tiap
bukti), atau cukup tersimpan dan bisa dibuka master kalau ada masalah?

- [ ] Terlihat di layar untuk supervisor & master
- [ ] Cukup tersimpan di log

**L6.3** Kalau yang salah hanya **satu baris** dari tujuh, koreksinya:

- [ ] Ubah baris itu saja
- [ ] VOID seluruh bukti hari itu, lalu ketik ulang tujuh barisnya

**L6.4** Kalau kesalahan baru ketahuan **bulan berikutnya** (mis. bukti 28 Agustus baru
ketahuan salah 3 September): koreksinya akan tercatat **bertanggal 3 September**, jadi total
biaya bulan Agustus tidak berubah lagi. Klien paham dan setuju?

- [ ] Paham dan setuju
- [ ] Tidak — bahas lagi

---

## L7. Akun apa saja yang boleh dipilih di baris (lanjutan §6)

Jawaban §6 sudah tegas: menu ini **hanya untuk biaya operasional**, pelunasan supplier di
menu lain. Bagus — itu menutup risiko terbesar.

Tapi jawaban lain memunculkan dua hal yang **bukan biaya** namun uangnya keluar dari kas yang
sama: **kasbon** (L4) dan **pindah buku kas** (L3).

**L7.1** Baris bukti kas keluar boleh menunjuk akun apa saja?

- [ ] **Hanya akun biaya.** Kasbon dan pindah buku punya menu sendiri
- [ ] Akun biaya **+ Piutang Karyawan** (kasbon ikut di sini)
- [ ] Akun biaya **+ Piutang Karyawan + akun kas lain** (kasbon dan pindah buku ikut di sini)

**L7.2** Yang **selalu dilarang** — Hutang Usaha, Piutang Usaha (pelanggan), dan Persediaan —
tidak akan pernah bisa dipilih di layar ini. Kalau operator butuh salah satunya, itu tanda dia
salah menu. Setuju?

- [ ] Setuju

---

## L8. Cetak, nomor dokumen, dan pengecekan supervisor (lanjutan §8)

Jawaban §8 sudah memastikan tiga hal: **dicetak untuk arsip**, **nomor harus berurut**,
**dicek supervisor di akhir hari**. Tiga hal itu masing-masing punya konsekuensi teknis yang
belum ditanyakan.

**L8.1 Kode dokumen.** Di Affari nomornya `OPK-26070026`. Format sistem baru:
`KODE/RM01-YYMMXXXX`. Mau kode yang mana?

- [ ] Tetap `OPK` → `OPK/RM01-26090001` (operator sudah terbiasa)
- [ ] `KK` (Kas Keluar) → `KK/RM01-26090001`
- [ ] Lainnya: ________

**L8.2 Kunci cetak.** Untuk faktur, sistem baru mewajibkan **batal cetak (dengan izin
supervisor)** sebelum boleh diedit atau dibatalkan — supaya kertas yang sudah beredar tidak
diam-diam berbeda dengan sistem. Bukti kas keluar ini ikut aturan itu?

- [ ] Ya, ikut. Sudah dicetak → mau ubah harus izin dulu
- [ ] Tidak. Cetak bebas, ubah bebas (selama masih boleh menurut L6.1)

> Kalau memilih "Ya", tolong perhatikan tabrakannya dengan L6: bukti ini dicetak **setiap
> hari**, jadi hampir semua koreksi akan butuh izin supervisor. Kalau memilih "Tidak", arsip
> kertas bisa berbeda dengan sistem tanpa jejak. Kami condong ke **"Ya"** karena jawaban §8
> no. 3 ("harus berurut") menunjukkan dokumen ini memang diperlakukan sebagai bukti resmi.

**L8.3 Laporan Kontinuitas Nomor.** Jawaban "harus berurut" berarti bukti kas keluar masuk ke
laporan yang menampilkan setiap nomor dari 0001 sampai terakhir beserta status dan alasan
pembatalannya. Betul?

- [ ] Betul, ikut laporan itu
- [ ] Tidak perlu, cukup berurut saja di layar daftar

**L8.4 Tanda tangan.** Jawaban §8 no. 2 dikosongkan (`-`), dan no. 1 bilang "untuk arsip".
Berarti **tidak ada baris tanda tangan** di cetakannya — tukang angkut tidak tanda tangan saat
menerima upah?

- [ ] Betul, tidak perlu tanda tangan
- [ ] Perlu: ____ baris tanda tangan (siapa saja: ____________)

**L8.5 Ukuran cetak.** Semua dokumen sistem baru dicetak **A5 landscape, dua per lembar A4**.
Satu bukti muat 14 baris. Bukti harian klien rata-rata 6–8 baris, jadi cukup. Ada bukti yang
pernah lebih dari 14 baris dalam sehari?

- [ ] Tidak pernah
- [ ] Pernah, sampai ± ____ baris

**L8.6 Pengecekan supervisor.** Supervisor sudah punya halaman "Pengecekan Invoice Harian"
untuk faktur penjualan & pembelian. Bukti kas keluar muncul di mana?

- [ ] **Tab tambahan di halaman yang sama** (supervisor mengerjakan semuanya sekali duduk)
- [ ] Halaman terpisah

**L8.7** Supervisor mencentang **per bukti** (satu hari sekali centang) atau **per baris**?

- [ ] Per bukti
- [ ] Per baris

**L8.8** Kalau supervisor menemukan kesalahan, dia **menandai BERMASALAH lalu operator yang
memperbaiki** — supervisor tidak pernah mengubah angka sendiri. Sama seperti faktur. Setuju?

- [ ] Setuju

---

## L9. Backdate 7 hari — untuk semua modul atau biaya operasional saja? (lanjutan §12)

Jawaban §12: **"Buatkan default menjadi mundur 7 hari."** Kami perlu memastikan cakupannya,
karena batas ini dipakai bersama oleh **semua** modul transaksi lewat satu validator.

**L9.1** Berlaku untuk:

- [ ] **Semua dokumen** — biaya operasional, faktur penjualan, faktur pembelian, mutasi
      gudang, retur, pelunasan
- [ ] **Hanya biaya operasional & pelunasan.** Dokumen yang menyentuh stok tetap 2–3 hari

**Kenapa ini tidak sepele.** Biaya operasional hanya menyentuh uang, jadi mundur 7 hari aman.
Tapi **faktur pembelian mundur 7 hari akan menyisipkan lot ke tengah antrean FIFO** yang
sebagian sudah terpakai — harga pokok penjualan yang sudah tercatat minggu lalu jadi tidak
cocok lagi dengan urutan barang yang sebenarnya. Begitu juga faktur penjualan mundur 7 hari
akan mengurangi stok di tanggal yang laporannya sudah dicetak.

Kalau klien tetap ingin 7 hari untuk semua, kami ikut — tapi harus dengan sadar, dan itu perlu
dituliskan sebagai keputusan, bukan diam-diam.

**L9.2** Boleh **tanggal di depan** (mencatat pengeluaran untuk besok)?

- [ ] Tidak boleh sama sekali
- [ ] Boleh sampai ____ hari ke depan

---

# BAGIAN C — Yang belum terjawab dari putaran 1

## L10. Kolom kendaraan (lanjutan §2 no. 3)

Klien memilih **satu akun `Biaya BBM` + kolom kendaraan**. Bagus — bagan akun jadi tidak
membengkak. Tapi master Kendaraan baru dijadwalkan **Hari 24** (untuk surat jalan), sedangkan
biaya BBM keluar sejak hari pertama.

**L10.1** Kolom kendaraan dipakai di akun mana saja?

- [ ] Hanya BBM
- [ ] BBM + servis/perbaikan
- [ ] BBM + servis + tol/parkir + lainnya: ____________

**L10.2** Wajib diisi atau boleh kosong?

- [ ] Wajib untuk akun yang ditandai
- [ ] Boleh kosong

**L10.3** Ada berapa kendaraan sekarang, dan datanya apa saja? (Dari screenshot terbaca satu
plat: `D-8327 TD`.)

Daftar: ______________________________________________

**L10.4** Kalau kolom ini wajib sejak 1 September, master Kendaraan harus dimajukan dari
Hari 24 ke Hari 17. Boleh sederhana saja (plat + jenis + aktif), tanpa data servis?

- [ ] Boleh, sederhana saja
- [ ] Perlu data lain: ____________

---

## L11. Ongkos angkut **barang masuk** — pertanyaan §9 no. 1 belum terjawab

Jawaban §9 no. 3 menjelaskan bahwa `B. Angkat Staff Customer` adalah **tip untuk tukang angkut
di toko pelanggan** saat menurunkan barang dari truk. Itu jelas dan sangat membantu — tapi itu
biaya di **sisi penjualan**, bukan sisi pembelian. Pertanyaan aslinya belum terjawab.

**L11.1** Saat barang **datang dari supplier** ke gudang klien, ada biaya yang keluar?
(kuli bongkar, ongkir ekspedisi, uang rokok sopir supplier)

- [ ] Tidak ada — supplier mengantar dan membongkar sendiri, gratis
- [ ] Ada: ____________________________, dibayar ke ____________

**L11.2** Kalau ada: pemilik pernah bertanya **"barang dari supplier X bulan ini ongkosnya
berapa?"**

- [ ] Tidak pernah → cukup dikompilasi harian seperti biaya lain
- [ ] Pernah → baris biaya perlu kolom **supplier** (opsional)

> Kolom opsional itu gratis kalau dibuat sekarang. Kalau disusulkan tiga bulan lagi, data
> yang sudah terlanjur masuk tidak bisa dijawab surut.

---

## L12. Rincian di keterangan baris (lanjutan §11 no. 2)

Jawaban §11 no. 2: *"jika biaya parkir hari ini 21.000, operator akan merincikan x rp ke toko
A, x rp ke toko B, ..."* — sedangkan jawaban §9 no. 2 bilang biaya **tidak perlu dipisah per
customer**. Dua jawaban ini terdengar berlawanan, jadi kami minta dipastikan.

**L12.1** Bentuk yang benar:

- [ ] **Satu baris** `B. Parkir 21.000`, rinciannya diketik di kolom keterangan sebagai teks
      bebas (`Toko A 5rb, Toko B 8rb, Toko C 8rb`)
- [ ] **Beberapa baris** — satu baris per toko, masing-masing dengan nama tokonya
- [ ] Satu baris, nama toko dipilih dari **master pelanggan** supaya bisa direkap

**L12.2** Kalau teks bebas: dalam sehari paling banyak berapa toko yang dirinci? (Menentukan
panjang kolom keterangan dan lebarnya di cetakan A5.)

- [ ] ± ____ toko

---

## L13. Pengeluaran berulang & anggaran (§13 — belum dijawab sama sekali)

**L13.1** Ada pengeluaran yang **jumlah dan tanggalnya tetap** tiap bulan (sewa, listrik,
internet, asuransi)? Berapa item?

- [ ] Tidak ada
- [ ] Ada: ____________________________

**L13.2** Perlu diingatkan sistem, atau kasir sudah hafal?

- [ ] Tidak perlu diingatkan
- [ ] Perlu

**L13.3** Ada **anggaran/plafon** per jenis biaya yang ingin dipantau?

- [ ] Tidak ada
- [ ] Ada: ____________

---

## L14. Tiga hal dari §14 yang belum ditanggapi

**L14.1 Laporan biaya ditunda ke pasca-MVP.** Sampai serah terima, yang ada hanya Rekap Kas
Harian per akun + ekspor Excel. Kalau boleh memilih **satu** tampilan biaya yang wajib ada di
hari pertama, apa?

- [ ] Total per akun biaya, bulan berjalan
- [ ] Rincian semua baris biaya dalam rentang tanggal (bisa diekspor ke Excel)
- [ ] Rekap per orang (upah tukang angkut)
- [ ] Tidak perlu apa-apa dulu

**L14.2 Saldo awal kas per 31 Agustus malam.** Sekarang jelas ada **enam** saldo yang harus
dihitung: Kas Kecil, Kas Toko, Kas Besar, BSI, Mandiri, BCA.

- Siapa yang menghitung fisik uangnya? ____________
- Disaksikan siapa? ____________
- Saldo rekening bank diambil dari mana (rekening koran / mobile banking)? ____________

**L14.3** Ketiga rekening bank (BSI, Mandiri, BCA) — atas nama **perusahaan atau pribadi
pemilik**? Kalau campur pribadi, mutasi pribadi tidak boleh masuk buku toko, dan itu perlu
aturan sendiri.

- [ ] Semua atas nama usaha
- [ ] Campur — jelaskan: ____________

---

# BAGIAN D — Menentukan sekarang supaya Hari 26–27 tidak dibongkar

> Klien sendiri menyebut di §7 no. 1 bahwa **pop-up baris ini juga dipakai untuk pelunasan
> penjualan**. Kalau bentuk dasarnya kami putuskan sekarang, modul Pelunasan (Hari 26–27)
> tinggal menambah isi. Kalau baru dipikirkan nanti, layar ini dibongkar dua kali.
>
> Tidak perlu membahas pelunasan secara mendalam hari ini — cukup **lima jawaban pendek**
> di bawah.

**L15.1** Di sistem baru, ketiganya tetap **menu terpisah** (Biaya Operasional · Pelunasan
Pembelian · Penerimaan Kas Penjualan) yang kebetulan berbentuk mirip — seperti di Affari?

- [ ] Ya, tetap tiga menu terpisah
- [ ] Digabung jadi satu menu dengan pilihan jenis

**L15.2** Pelunasan juga berbentuk **satu bukti per hari berisi banyak baris**, atau **satu
bukti per pelanggan/supplier**?

- [ ] Satu bukti per hari, banyak baris (sama seperti biaya operasional)
- [ ] Satu bukti per pelanggan/supplier
- [ ] Belum tahu — bahas nanti

**L15.3** Panel `Tunai / Giro / Transfer` di Affari — untuk biaya operasional sudah pasti
**tidak dipakai**. Untuk pelunasan **dipakai**?

- [ ] Dipakai — pelanggan/supplier bayar pakai transfer dan giro
- [ ] Tidak dipakai juga, semua tunai
- [ ] Transfer dipakai, giro tidak

**L15.4** Kalau giro dipakai: giro dicatat saat **diterima/diserahkan**, atau saat **cair di
bank**?

- [ ] Saat diterima (perlu akun "Giro Belum Cair" tersendiri)
- [ ] Saat cair saja
- [ ] Giro tidak dipakai

**L15.5** Uang tunai dari penjualan masuk ke **Kas Toko**, betul? Dan sales yang pulang
membawa uang menyetorkannya ke Kas Toko juga?

- [ ] Betul, dua-duanya ke Kas Toko
- [ ] Berbeda: ____________

---

## Ringkas — yang paling menentukan, urut

| Prioritas | Nomor | Kalau belum dijawab |
|---|---|---|
| 🔴 1 | **L1** daftar akun biaya | Tidak bisa seed COA, semua jurnal biaya menggantung |
| 🔴 2 | **L2** kas sumber di kepala atau di baris | Bentuk tabel & letak persetujuan belum bisa ditentukan |
| 🔴 3 | **L6** batas boleh Ubah | Bertabrakan dengan aturan VOID yang sudah dipakai seluruh sistem |
| 🔴 4 | **L3** pindah buku kas | Terjadi tiap hari, belum ada di rencana sama sekali |
| 🟡 5 | **L4** kasbon | Menentukan apakah baris butuh kolom potongan |
| 🟡 6 | **L5** master tukang angkut | Menentukan ada/tidaknya master baru |
| 🟡 7 | **L9** cakupan backdate 7 hari | Menyentuh semua modul, bukan hanya biaya |
| 🟡 8 | **L8** kunci cetak & pengecekan | Menempel di alur simpan, mahal disusulkan |
| 🟢 9 | L10–L14 | Bisa menyusul 2–3 hari |
| 🟢 10 | L15 | Boleh menyusul, tapi jawabannya menghemat Hari 26–27 |

**L1, L2, L6, dan L3 sebaiknya dijawab hari ini juga** — empat itu yang menentukan bentuk
tabel dan aturan simpan. Sisanya masih bisa dikerjakan paralel.
