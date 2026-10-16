# Yang Perlu Ditanya ke Klien

> Dicatat 7 Agustus 2026 (Hari 16). Sumber: `PROGRESS.md` §1 (Menunggu Klien),
> `KONTEKS_REVISI_2026-07-28.md` §4 (PR Terbuka), dan `CLAUDE.md` §2.15.
> Update tabel status di `PROGRESS.md` §1 saat sebuah item terjawab — file ini
> adalah daftar kerja untuk komunikasi ke klien, bukan pengganti §1.


### Faktur Pembelian
1. Nomor faktur supplier di drop saja. Ternyata terdapat kasus supplier tidak membuka nota karena transaksi dilakukan via whatsapp yang berada di luar sistem
2. Membesarkan font dari review kalkulas baris

### Faktur Penjualan


## 🔴 Sudah lewat tenggat atau jatuh tempo hari ini

1. **PR #2 — Retur pelanggan ke supplier mana saat `supplier_id` lot NULL?**
   Jatuh tempo Hari 16 (hari ini). Barang retur pelanggan masuk BAD_STOCK tanpa jejak
   supplier asal yang bersih. Kalau nanti mau diretur ke supplier: boleh pilih supplier
   mana pun, atau diblokir sampai ada cara lain melacaknya?

2. **Format nota A5** (penjualan, pembelian, surat jalan, retur, kwitansi, mutasi).
   Dijanjikan 27 Juli, sudah lewat aturan cadangan (Hari 15, ±6 Agustus). Kalau tidak
   dikonfirmasi sekarang, sistem jalan pakai layout standar generik dan revisi dilempar
   ke pasca-MVP — pastikan klien sadar dan setuju konsekuensinya.

3. **Modul Biaya Operasional** (gaji harian salesman + ongkos kirim pembelian).
   Ditunda klien, jatuh tempo Hari 17 (besok). Lihat rincian pertanyaan di bawah.

4. **Angka `REC(s): 61` dan `260` di sistem lama** — total keseluruhan atau tampilan
   terfilter? Jatuh tempo Hari 13 (lewat). Menentukan migrasi manual setengah hari atau
   berminggu-minggu.

5. **Konfirmasi tarif PPN dari konsultan pajak.** Jatuh tempo Hari 14 (lewat). Masuk ke
   tabel `tax_rates`, bukan hardcode — Faktur Pembelian sudah jalan sejak Hari 14/v3.

## 🟡 Prioritas tinggi, tenggat masih beberapa hari

6. **Modul Pembayaran / Kas & Bank** — belum dibahas sama sekali. Jatuh tempo Hari 26,
   tapi plan menandainya "bagian tersulit". Idealnya dibahas dari sekarang mengingat
   margin jadwal nol.

7. **Bentuk mekanisme Closing** — jurnal sungguhan atau konstruksi tampilan? Jatuh tempo
   Hari 23A. `CLAUDE.md` §2.15 menandai eksplisit: berhenti dan tanya sebelum mengerjakan
   Hari 23A, karena ini menentukan skema database, bukan tampilan laporan.

8. **Bentuk input Saldo Awal** (ketik manual, upload file, atau impor). Jatuh tempo
   Hari 12 (lewat), padahal tanggal efektifnya sudah pasti 1 September.

## 🟢 Masih ada waktu, tapi jangan terlupa

9. **PR #3** — Panel harga kosong untuk satuan yang belum pernah dipakai: fallback ke
   harga master atau dikosongkan? Jatuh tempo Hari 20.
10. **Isi Laporan** yang benar-benar dipakai (ditunda klien, sebelum Hari 29/30).
11. **Angka saldo awal aktual** (stok + piutang + hutang) — batas keras Hari 36
    (29 Agustus).
12. **Cara menyesuaikan selisih transaksi 29–31 Agustus** setelah cut-over — Hari 36.
13. **Nama & waktu kontrol pengganti rekap setoran agen** (siapa mencocokkan setoran
    sopir dengan faktur, kapan) — Hari 28.
14. **Pengadaan UPS** — satu-satunya belanja wajib klien, Hari 33. Ingatkan tiap minggu.
15. **Ekspor data Affari** — sudah didorong berkali-kali, sementara dianggap tidak ada.
16. **Repo dipindah ke akun klien** — sarankan sekarang juga (batas akhir Hari 37).

---

## Format Nota — Lokasi Penyimpanan

Contoh/referensi visual dari klien disimpan di:

```
docs/referensi-nota/
├── penjualan/
├── pembelian/
├── surat-jalan/
├── retur/
├── kwitansi/
├── mutasi-gudang/
└── CATATAN.md
```

- File mentah (foto nota fisik, PDF, screenshot Affari) disimpan apa adanya, semua
  contoh disimpan meski ada beberapa versi.
- Nama file: `contoh-<jenis>-01.jpg`, `contoh-<jenis>-02.jpg`, dst.
- `CATATAN.md` memetakan tiap contoh ke aturan `CLAUDE.md` §6 yang sudah pasti (A5
  landscape, 2/lembar A4, 14 baris/halaman, kop dari `settings`, 3 baris tanda tangan
  khusus nota pembelian) — supaya yang dicek tinggal bagian yang belum diatur (posisi
  logo, urutan kolom, teks footer, dll).

---

## Modul Biaya Operasional — Poin yang Perlu Dibahas

Belum ada spesifikasi utuh di `CLAUDE.md` (baru disinggung sepotong di §3 Pembelian,
§3 Salesman, §5 Permission Matrix). Poin yang harus dikunci sebelum Hari 17:

a. **Daftar kategori/akun biaya** — belum ada daftar akun biaya operasional yang
   di-seed. Perlu daftar nyata dari klien (listrik, sewa, gaji, ongkir, dll), bukan
   ditebak, karena akun-akun ini masuk COA dan dipakai di jurnal.

b. **Sumber pembayaran** — satu kas umum, atau ada pemisahan kas kecil vs kas besar?
   Menentukan akun mana yang dicentang `requires_outflow_approval` (§5) dan nilai
   `settings.cash_outflow_approval_threshold`.

c. **Gaji harian salesman** — dihitung per hari kerja tetap atau tergantung kehadiran?
   Diinput manual per periode atau ada absensi? Siapa yang input?

d. **Ongkos kirim pembelian** — dicatat sebagai transaksi biaya operasional berdiri
   sendiri, atau tetap terikat ke faktur pembelian tertentu untuk keperluan
   rekonsiliasi?

e. **Nomor dokumen & kunci cetak** — tabel nomor dokumen (§2.4) tidak mencantumkan
   kode untuk biaya operasional, dan §2.16 (kunci cetak) hanya menyebut 7 dokumen.
   Cukup jurnal tanpa nomor dokumen bercetak, atau klien tetap butuh bukti kas keluar
   yang tercetak dan bernomor (kalau ya, perlu kode dokumen baru)?

f. **Approval & koreksi** — selain threshold kas besar lewat `StepUpService`, tidak
   ada approval lain? Koreksi salah input: VOID+reversing seperti dokumen lain, atau
   cukup edit langsung (karena bukan dokumen yang beredar ke pihak luar)?

g. **Pengeluaran berulang** — item seperti sewa bulanan/listrik perlu
   template/recurring, atau cukup input manual tiap kali (volume transaksi kecil)?

h. **Bukti pendukung** — setiap pengeluaran butuh nomor kwitansi/referensi fisik yang
   dicatat, atau cukup nominal + keterangan bebas?

Poin **a, b, dan e** paling menentukan bentuk skema (tabel, akun, kode dokumen) —
tanyakan lebih dulu, sisanya bisa menyusul selama implementasi.
