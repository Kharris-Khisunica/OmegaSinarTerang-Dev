# Konfirmasi Perubahan Hasil Testing — Untuk Dibacakan ke Klien

> Dokumen ini merangkum 12 perubahan yang sedang dikerjakan berdasarkan hasil testing
> bersama Bapak/Ibu. Semuanya **sudah mulai dikerjakan** supaya jadwal tidak molor,
> tapi tetap butuh persetujuan Bapak/Ibu — kalau ada yang tidak sesuai, sampaikan
> sekarang selagi masih mudah diubah.
>
> Cara bacanya: tiap poin ada **apa yang berubah**, **apa akibatnya buat operator
> sehari-hari**, dan **satu pertanyaan** yang tinggal dijawab Ya/Tidak.

---

## ⭐ Dua poin yang paling penting — mohon dibaca lebih dulu

### ⭐ Poin A — Batas waktu revisi faktur: 2 hari

**Apa yang berubah:** Operator sekarang bisa membetulkan faktur yang salah harga atau
salah pelanggan langsung dari faktur yang sama, **tapi hanya kalau faktur itu dibuat
maksimal 2 hari yang lalu**. Nomor faktur tidak berubah, cuma tercatat "sudah direvisi".

**Akibat buat operator:** Kalau kesalahan baru ketahuan lebih dari 2 hari kemudian,
faktur itu **tidak bisa dibetulkan langsung**. Jalan keluarnya: faktur lama dibatalkan
(VOID) dan dibuatkan faktur baru dengan **nomor baru**. Uangnya tetap benar, tapi nomor
fakturnya berubah dan tercatat sebagai transaksi hari pembatalan, bukan hari asli.

**Kenapa dibatasi 2 hari:** batas yang sama sudah dipakai untuk hal lain di sistem
(tanggal mundur maksimal 2 hari), supaya angka bulan yang sudah ditutup tidak pernah
ikut berubah.

**Pertanyaan:** Apakah batas **2 hari** ini cukup untuk kebiasaan kerja di lapangan?
Kalau menurut Bapak/Ibu kesalahan sering baru ketahuan lebih dari 2 hari kemudian, angka
ini bisa diperlebar — tapi mohon disebutkan sekarang perkiraan berapa hari yang realistis.

☐ Ya, 2 hari cukup  ☐ Tidak, perlu lebih lama — sebutkan: _______ hari

---

### ⭐ Poin B — Arti kata "Isi" pada nama barang

**Apa yang berubah:** Nama barang di sistem baru akan disusun dengan urutan:
**Merek · Kemasan · Keterangan · Isi · Satuan** — misalnya "Bendera Sachet Putih 37 gr".

**Yang perlu dipastikan:** kata **"Isi"** di sini kami artikan sebagai **angka ukuran**
yang tertulis di kemasan (misalnya "37" pada "37 gr"), **BUKAN** jumlah barang di dalam
satu dus (misalnya "1 dus isi 40 sachet").

**Akibat kalau salah paham:** kalau ternyata yang Bapak/Ibu maksud adalah jumlah isi per
dus, ini bukan sekadar ganti urutan tulisan — perlu perubahan yang lebih besar di data
barang. Karena itu poin ini perlu dipastikan **paling awal**, sebelum pekerjaan penamaan
barang dilanjutkan.

**Pertanyaan:** Apakah "Isi" yang dimaksud adalah **angka ukuran di kemasan** (37, 250,
dst), bukan jumlah barang per dus?

☐ Ya, benar angka ukuran kemasan  ☐ Tidak, yang dimaksud jumlah isi per dus

---

## Perubahan lain (10 poin)

### 1. Membetulkan faktur salah — caranya berubah
**Berubah:** Dulu rencananya faktur yang sudah dicatat tidak bisa diubah sama sekali
tanpa dibatalkan. Sekarang, operator bisa langsung membuka faktur, memperbaiki harga
atau nama pelanggan yang salah, dan menyimpannya kembali — nomor faktur tetap sama.
**Akibat:** Tidak perlu lagi membatalkan faktur cuma karena salah ketik. Sistem otomatis
mencatat berapa kali faktur itu sudah direvisi.
**Pertanyaan:** Setuju operator boleh langsung membetulkan faktur seperti ini (dengan
batas 2 hari di Poin A)?
☐ Ya ☐ Tidak

### 2. Tanggal pencatatan hasil perbaikan
**Berubah:** Kalau faktur kemarin dibetulkan hari ini, catatan keuangannya tetap
tersimpan di **tanggal faktur asli** (kemarin), bukan hari ini.
**Akibat:** Laporan penjualan harian tidak berubah-ubah gara-gara ada pembetulan
belakangan — angka hari kemarin tetap cocok dengan nota fisik yang sudah dipegang
pelanggan/sopir.
**Pertanyaan:** Setuju hasil pembetulan dicatat di tanggal faktur asli, bukan tanggal
saat dibetulkan?
☐ Ya ☐ Tidak

### 3. Faktur yang belum dicetak vs yang sudah dicetak
**Berubah:** Kalau nota belum pernah dicetak, operator bebas membetulkan tanpa izin
siapa pun. Kalau nota **sudah dicetak** dan dipegang pelanggan/sopir, pembetulan perlu
persetujuan supervisor dulu (proses ini sudah ada di sistem, tinggal dipakai).
**Akibat:** Tidak ada perubahan cara kerja untuk fitur ini — hanya menegaskan aturan
yang memang sudah berjalan.
**Pertanyaan:** Tidak perlu dijawab — ini konfirmasi bahwa aturan lama tetap dipakai.

### 4. Diskon di faktur pembelian (dari supplier) — disederhanakan
**Berubah:** Diskon per baris barang di faktur pembelian **dihilangkan**. Yang tersisa
hanya **satu angka diskon** di akhir faktur, dan angka itu **tidak lagi mempengaruhi**
harga pokok barang — dicatat terpisah sebagai semacam "untung tambahan" dari negosiasi
dengan supplier.
**Akibat:** Harga pokok barang jadi angka bulat, tidak ada lagi pecahan aneh akibat
pembagian diskon ke banyak baris. Nilai stok yang tercatat jadi sedikit lebih tinggi
dari uang yang benar-benar dibayar ke supplier (karena diskonnya dipisah, bukan
dikurangkan dari harga barang) — ini disengaja, bukan salah hitung.
**Pertanyaan:** Setuju diskon pembelian disederhanakan seperti ini (satu angka di akhir
faktur, tidak menyentuh harga pokok barang)?
☐ Ya ☐ Tidak

### 5. Nomor faktur dari supplier — jadi opsional
**Berubah:** Kolom "Nomor Faktur Supplier" yang sekarang **wajib diisi**, akan dijadikan
**boleh dikosongkan**.
**Akibat:** Operator tidak akan lagi tertahan menyimpan faktur pembelian hanya karena
belum tahu nomor faktur dari supplier. Kalau nomornya ada, tetap bisa dicatat untuk
keperluan cocok-mencocokkan tagihan nanti.
**Pertanyaan:** Setuju kolom ini boleh dikosongkan?
☐ Ya ☐ Tidak

### 6. Titipan barang pelanggan — dikaitkan ke satu faktur
**Berubah:** Saat mencatat barang yang dititipkan pelanggan (sudah dibeli, belum
diambil), operator sekarang harus memilih **faktur penjualan mana** barang itu berasal,
baru pilih barangnya dari faktur itu.
**Akibat:** Tidak bisa lagi salah menitipkan barang yang sebetulnya tidak pernah dibeli
pelanggan tersebut — datanya lebih rapi dan tidak bisa "tercampur" antar faktur.
**Pertanyaan:** Setuju titipan barang harus selalu memilih faktur asalnya dulu?
☐ Ya ☐ Tidak

### 7. Diskon di faktur penjualan — dihilangkan dari tampilan
**Berubah:** Kolom diskon (baik per barang maupun di akhir faktur) tidak lagi muncul di
layar penjualan dan di nota.
**Akibat:** Operator tidak akan lagi melihat kolom diskon saat membuat faktur penjualan.
Kalau nanti ternyata masih dibutuhkan, fiturnya bisa dihidupkan kembali karena datanya
tidak dihapus, hanya disembunyikan.
**Pertanyaan:** Setuju diskon penjualan dihilangkan dari layar dan nota?
☐ Ya ☐ Tidak

### 8. Kunci harga & diskon (tombol rahasia Ctrl+H / Ctrl+D) — dihapus
**Berubah:** Kombinasi tombol rahasia untuk mengunci kolom harga dan diskon (peninggalan
sistem lama) akan **dihapus sepenuhnya**.
**Akibat:** Semua operator bisa mengisi kolom harga dan diskon tanpa perlu tahu kombinasi
tombol tertentu.
**Pertanyaan:** Setuju kunci ini dihapus?
☐ Ya ☐ Tidak

### 9. Nota tidak lagi mencetak PPN kalau nilainya nol
**Berubah:** Baris "PPN" di nota tidak akan dicetak sama sekali kalau nilainya memang
nol.
**Akibat:** Nota jadi sedikit lebih ringkas, tidak ada baris "PPN: Rp 0" yang membingungkan.
**Pertanyaan:** Setuju baris PPN disembunyikan kalau nilainya nol?
☐ Ya ☐ Tidak

### 10. Huruf besar otomatis untuk nama & alamat
**Berubah:** Nama pelanggan, nama supplier, nama barang, dan alamat yang diketik operator
akan otomatis diubah jadi **HURUF BESAR SEMUA** saat disimpan, mengikuti kebiasaan sistem
lama. Data yang sudah ada sebelumnya juga akan dirapikan ke bentuk yang sama.
**Akibat:** Tampilan data jadi seragam (tidak ada campuran huruf besar-kecil), sesuai
kebiasaan yang sudah dikenal operator lama.
**Pertanyaan:** Setuju semua nama & alamat otomatis huruf besar?
☐ Ya ☐ Tidak

---

## Ringkasan jawaban (isi lalu kembalikan)

| # | Poin | Ya | Tidak | Catatan |
|---|---|---|---|---|
| A⭐ | Batas revisi 2 hari | ☐ | ☐ | |
| B⭐ | Arti "Isi" = ukuran kemasan | ☐ | ☐ | |
| 1 | Revisi langsung di faktur | ☐ | ☐ | |
| 2 | Tanggal pencatatan ikut tanggal asli | ☐ | ☐ | |
| 3 | Faktur tercetak butuh izin supervisor | (info, tidak perlu dijawab) | | |
| 4 | Diskon pembelian disederhanakan | ☐ | ☐ | |
| 5 | Nomor faktur supplier opsional | ☐ | ☐ | |
| 6 | Titipan barang per faktur | ☐ | ☐ | |
| 7 | Diskon penjualan dihilangkan | ☐ | ☐ | |
| 8 | Kunci Ctrl+H/Ctrl+D dihapus | ☐ | ☐ | |
| 9 | PPN nol tidak dicetak | ☐ | ☐ | |
| 10 | Huruf besar otomatis | ☐ | ☐ | |

*Ditulis 08 September 2026, dibawa ke sesi konfirmasi klien berikutnya.*
