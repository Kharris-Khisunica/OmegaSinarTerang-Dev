Saya melakukan testing dengan user dan product owner dari awal hingga akhir. Terdapat beberapa hal yang ingin direvisi oleh user:

### General:
1. Buat menu toolbar menjadi berbentuk drop down: Dimana sidebar memiliki default untuk menampilkan semua menu + sub menu tetapi terdapat opsi untuk meminimize sub menu

## Master Data
1. Setiap data yang diinput di master data auto-capitalize
2. Kode selalu dibangkitkan secara otomatis oleh sistem agar tidak ada kebingungan dari operator. Tetapi, keep fitur untuk input kode manual di master.
### Produk
1. Ubah urutan penamaan produk menjadi Merk -> Kemasan -> Keterangan -> Isi -> Satuan

## Transaksi
1. Input harga/qty langsung tampilkan koma untuk ribuan/jutaan. Saat testing, terjadi kesalahan cukup banyak dimana tester mengetik angkanya kelebihan 1 nol. (jadi daripada ketik 135000 dan baru muncul 135,000, buat agar saat user ketik 1350, koma di angka ribuan langsung muncul.)

### Order Penjualan
1. Saat entri, Secara default, tampilkan jumlah "DUS" / satuan terbesar dan bukan satuan terkecil. Satuan terkecil hanya dipakai di kasus khusus dan 99% transaksi selalu memakai satuan terbesar. 
2. Saat entri, sisa stok produk tidak muncul
3. Beri alert jika Qty yang diinput > Qty sisa stok
4. Implementasi "Jadikan Faktur" belum dikerjakan. 

### Faktur Penjualan
1. Qty stok jangan desimal. Penjualan selalu default nya menggunakan satuan terbesar. Oleh itu, tidak perlu menampilkan data untuk satuan kecil nya
2. Mengapa saat saluran = pengiriman, Sales order tidak bisa dipilih?
3. Dalam penjualan, tidak ada diskon penjualan. Drop. 
4. Hapus lock yang ada harga dan di diskon
5. Saat print out, jika belum ada PPN keluaran, tidak perlu dimasukkan ke dalam lembar faktur. 
6. Operator HARUS bisa mengubah seluruh faktur penjualan jika sudah diberi persetujuan oleh Supervisor/Master. Karena kesalahan di lapangan 80-90% karena salah input harga / salah input pelanggan. 

### Surat Jalan
1. Sepertinya belum terimplementasi?

### Mutasi Gudang
1. Untuk barang titipan pelanggan, buat per faktur bukan per produk. 

### Faktur Pembelian
1. Drop nomor faktur supplier karena banyak kasus terjadi dimana supplier tidak membuka nota --> tidak ada nomor nota yang bisa dicatat karena transaksi dilakukan secara informal. 
2. Diskon Faktur HANYA dalam rupiah. Lalu, diskon faktur TIDAK mempengaruhi harga final Stok. Diskon faktur dimasukkan ke pendapatan lain yang di tidak akan mempengaruhi harga stok. Saat testing, terjadi kasus dimana harga produk menjadi tidak bulat. 
3. Sisa stok di faktur pembelian tidak muncul. 
4. Preview Kalkulasi Baris dibuat dengan font yang lebih besar. Dibuat line break untuk setiap komponen. Sehingga kalkulasi baris bisa menjadi

Contoh:

Subtotal Baris: 125.000.000
Alokasi Diskon Faktur: 0
PPN Baris: 0

5. Operator juga perlu untuk bisa mengedit seluruh Faktur Pembelian jika sudah diberi persetujuan oleh supervisor/master.

## Kas dan Bank
1. Entri untuk penerimaan kas dan pengeluaran kas dilakukan PER FAKTUR. Oleh itu, input penerimaan kas dan pengeluaran kas PERLU multi baris (seperti input penjualan/pembelian), dimana sekali entri dapat melakukan entri beberapa faktur dalam sekali jalan. 

Untuk input per faktur nya, disini baru dilakukan pembagian pemasukan ke faktur efektif (Misal faktur penjualan ke toko A seharga 25jt rupiah. Disini operator bisa memilih metode seperti entri faktur yang sudah dilakukan sekarang). Hal ini juga paralel untuk entri pengeluaran kas. 
2. Entri biaya operasional juga berbentuk multibaris: Sekali entri dapat melakukan beberapa input biaya operasional. Untuk entri per biaya operasional sudah seperti dengan yang sudah ada sekarang, tetapi tanggal dapat diinput sebagai data global. 

Untuk referensi, bisa merujuk ke struktur dari penginputan penjualan/pembelian. 

## Laporan
1. Stok opname hanya bisa dilakukan oleh supervisor / master untuk mencegah kecurangan dari operator
2. Untuk laporan penjualan, perlu ditambahkan pembagian per salesman memegang faktur apa saja. /