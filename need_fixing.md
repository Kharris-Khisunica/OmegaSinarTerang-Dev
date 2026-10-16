# Perlu Diperbaiki — temuan saat membuat tutorial PDF (6 Okt 2026)

Ditemukan saat membaca kode `frontend/app/**` + backend terkait dan menjalankan aplikasi
(DB terpisah `omega_tutorial`, data demo) untuk screenshot `docs/tutorial/`.
Kondisi repo: commit `7115b60` (Hari 41).

**Status 6 Okt 2026:** ✅ = sudah diperbaiki (belum di-commit, belum diuji manual di browser).

## A. Bug

1. ✅ **Ringkasan permintaan Cash Outflow menampilkan UUID akun, bukan nama akun.**
   `backend/src/modules/payments/payments.service.ts:504` dan `:520` —
   `contextSummary: \`Pengeluaran Kas ... dari akun ${method.cashAccountId}\``.
   Di Antrian Persetujuan tampil "Pengeluaran Kas 1.500.000 dari akun 9013d2eb-…".
   Supervisor tidak bisa menilai permintaan. Ganti dengan kode + nama akun.

2. ✅ **Tanggal faktur tampil mundur 1 hari di dua pemilih faktur (timezone).**
   - Penerimaan/Pengeluaran Kas → Entri → daftar faktur terbuka (`GET /payments/open-invoices`):
     faktur bertanggal 05/10/2026 tampil 04/10/2026.
   - Mutasi Gudang → Titipan → dropdown Faktur Penjualan (`GET /warehouse-mutations/titipan-faktur`):
     API mengembalikan `"invoiceDate":"2026-10-04T17:00:00.000Z"` untuk faktur 2026-10-05.
   Kolom `date` ter-serialize sebagai timestamp. Kembalikan sebagai string `YYYY-MM-DD` seperti endpoint lain.

3. ✅ **Draf lama muncul lagi setelah memilih "buang perubahan".**
   Perbaikan `closeEntri()` → `documentModalRef.clearDraft()` hanya ada di
   `pages/penjualan/faktur/index.vue`. Belum diterapkan di `penjualan/order`, `penjualan/retur`,
   `pembelian/faktur`, `pembelian/retur`, `gudang/mutasi` (dan `kas-bank/biaya-operasional`, yang
   menutup modal lewat `entriOpen = v` tanpa clearDraft). Saat Entri dibuka lagi, isian yang
   sudah dibuang ikut terpulihkan.

4. ✅ **Faktur Pembelian: tombol Cetak tidak mencetak apa pun.**
   `pages/pembelian/faktur/[id]/index.vue` `handlePrint()` langsung `POST .../print`
   (status jadi PRINTED + kunci cetak) tanpa halaman nota. Tidak ada
   `pages/pembelian/faktur/[id]/cetak.vue`, padahal CLAUDE.md §6 mewajibkan nota pembelian A5
   dengan tiga tanda tangan. Akibatnya operator bisa mengunci faktur tanpa sengaja.

5. ✅ **Retur Penjualan & Retur Pembelian: Cetak di halaman detail juga hanya mendaftarkan cetak.**
   `pages/penjualan/retur/[id]/index.vue` dan `pages/pembelian/retur/[id]/index.vue` memanggil
   `POST .../print` tanpa menavigasi ke `/cetak`. Halaman `[id]/cetak.vue` sudah ada, tapi hanya
   bisa dicapai dari dialog "Retur Tersimpan" sesaat setelah simpan. Arahkan Cetak ke halaman cetak
   seperti Faktur Penjualan / Surat Jalan.

6. ✅ **Pesan error revisi hardcode "2 hari".**
   `backend/src/core/document-revise/document-revise.service.ts:127` —
   "Faktur berumur lebih dari 2 hari…" padahal batasnya dari `settings.backdate_max_days`.

7. ✅ **Pesan backdate memakai istilah teknis "Tanggal jurnal".**
   `core/period-lock/period-lock-validator.service.ts` — operator melihat
   "Tanggal jurnal maksimal mundur 2 hari dari hari ini." saat input faktur. Sebaiknya
   "Tanggal transaksi …".

8. ✅ *(Enter/Insert/F2/Delete/"/" terpasang di LineModal/DocumentModal/DataTable + hint terlihat; hotkey lapis bawah diam saat ada lapis di atasnya.)* **Hotkey yang didokumentasikan tidak terpasang.**
   `useDocumentHotkeys` mendukung Insert / F2 / Delete / "/" tapi tidak ada satu pun pemanggil
   yang mengisi `onNewLine`, `onEditSelected`, `onDeleteSelected`, `onFocusSearch`.
   `LineModal` meng-emit `enter-next` tapi tidak ada halaman yang mendengarkannya → Enter di
   jendela baris tidak melakukan apa-apa. (PANDUAN_UI.md §12 / CLAUDE.md §8.)

9. ✅ *(GET /reports/dashboard-summary: penjualan hari ini, piutang jatuh tempo, stok minus.)* **Dashboard masih placeholder.** `pages/index.vue` — Penjualan Hari Ini, Piutang Jatuh Tempo,
   Stok Minus selalu "—".

10. ✅ *(Slot #actions ternyata dirender; akar masalah yang ditemukan: prop `close-button` tidak dikenal Nuxt UI v4 -> diganti `close` di 21 tempat, tombol X kini tampil.)* **Tombol Cetak Pindah Buku Kas di notifikasi simpan kemungkinan tidak tampil.**
    `pages/kas-bank/pindah-buku/index.vue` memakai slot `#actions` pada `UAlert` yang juga punya
    `close-button` — pola yang sama sudah tercatat (komentar di `penjualan/faktur/index.vue`) tidak
    me-render slot tersebut. Perlu dicek manual.

11. ✅ **Detail Antrian Persetujuan menampilkan field teknis.** Contoh VOID: "Source Id: <uuid>",
    "Source Type: SALES_INVOICE" (`usePayloadFormatter`). Label jenis aksi juga hasil humanize
    enum ("Bs To Store", "Void Document") — sebaiknya label Bahasa Indonesia.

12. ✅ **Logo sidebar masih placeholder "Nuxt UI"** (`components/AppLogo.vue`).

## B. Tidak konsisten dengan aturan CLAUDE.md (perlu keputusan)

13. ✅ **VOID Faktur Pembelian oleh OPERATOR tidak butuh persetujuan.** *(Diperbaiki: gerbang VOID_DOCUMENT + header `x-void-authorization-request-id`, alur FE dua ronde sama Faktur Penjualan.)*
    `purchase-invoices.service.ts voidInvoice()` hanya memanggil `printLockService.preflight`;
    tidak ada gerbang `VOID_DOCUMENT` untuk OPERATOR seperti di Sales Invoice / Payment /
    Cash Transfer. Bertentangan dengan §2.13.

14. ✅ *(Keputusan 6 Okt: perlu persetujuan — VOID_DOCUMENT untuk OPERATOR, satu gerbang, pola Pindah Buku Kas.)* **VOID baris Biaya Operasional tanpa step-up** (komentar di halaman menyebut sengaja,
    "§2.13 belum berlaku modul ini") — konfirmasi apakah memang dikecualikan.

15. ✅ **Deskripsi setting PKP salah.** `pages/pengaturan/index.vue` `company_is_pkp`:
    "PPN dihitung … untuk customer yang juga PKP" — bertentangan dengan CLAUDE.md §4
    (syarat PPN keluaran hanya `company_is_pkp`).

16. ✅ **Dropdown Sales Order di Faktur Penjualan berlabel "(opsional)"** padahal wajib untuk
    PENGIRIMAN (`placeholder="Pilih Sales Order (opsional)..."`).

17. ✅ *(Keputusan 6 Okt: ditutup untuk OPERATOR — nav MASTER, halaman & GET /journal-entries MASTER+SUPERVISOR.)* **Menu Jurnal tampil untuk OPERATOR** (`config/navigation.ts` roles `['MASTER','OPERATOR']`);
    `pages/akuntansi/jurnal` tanpa `roles` sama sekali. Konfirmasi apakah disengaja.

## C. Fitur belum ada / celah alur (dicatat di tutorial sebagai "hubungi developer")

18. ✅ *(Keputusan 6 Okt: VOID SJ ditambahkan — UNLOCK_PRINT + VOID_DOCUMENT OPERATOR; status kirim dikecualikan dari kunci cetak, dicatat di CLAUDE.md §2.16.)* Surat Jalan: VOID belum didukung. Status kirim setelah SJ dicetak selalu butuh Batal Cetak +
    persetujuan — padahal SJ selalu dicetak sebelum sopir berangkat, jadi praktis setiap update
    status butuh approval. Perlu keputusan apakah `deliveryStatus` dikecualikan dari kunci cetak.
19. ✅ *(VOID + revisi-di-tempat RJ & RB, pola Faktur; layar detail & mode Ubah.)* Retur Penjualan & Retur Pembelian: Ubah/VOID belum didukung.
20. ✅ *(Status CANCELLED + alasan, tombol "Batalkan SO".)* Sales Order: tidak ada cara membatalkan/menutup SO yang tidak jadi.
21. ✅ *(Repeater piutang & hutang + impor Excel — template usulan developer, pratinjau lalu posting lewat alur yang sama. Lihat catatan: saldo awal piutang/hutang belum bisa ditagih lewat Pembayaran.)* Saldo Awal: layar hanya stok; piutang/hutang awal belum ada (backend sudah menerima
    `receivableLines`/`payableLines`). Impor Excel belum ada.
22. ✅ *(Field "Ambang Persetujuan Pengeluaran Kas" di Pengaturan.)* `cash_outflow_approval_threshold` tidak bisa diubah dari Pengaturan (key tidak dirender —
    `extraKeys` dimuat tapi tidak ditampilkan).
23. ✅ *(Layar Master Data > Pekerja.)* Master Pekerja: API `/workers` ada, layar belum.
24. ✅ *(Pengaturan > Pengguna: buat/ubah/nonaktifkan user + reset password, MASTER saja.)* Manajemen user / reset password: belum ada layar.
25. ✅ *(Dokumen OP: Draft -> Posting MASTER = koreksi stok + jurnal Selisih Persediaan; ekspor worksheet Excel/PDF.)* Stok Opname: tidak ada tombol Excel/PDF dan angka fisik tidak disimpan.
26. ✅ *(Kas & Bank > Pelunasan Kasbon, dokumen PK ke Kas Kecil; Kasbon wajib pilih pekerja.)* Pelunasan kasbon belum punya jalur (sementara lewat Jurnal Manual yang juga belum ada layarnya).

## D. Pertanyaan terbuka

27. ✅ *(Backend sudah benar; FE diperbaiki — di mode Satuan Besar, Tersedia/Harga Pokok (Ref.)/estimasi/peringatan stok dikonversi ke satuan besar.)* Retur Pembelian mode **Satuan Besar**: `Tersedia` dan `Harga Pokok (Ref.)` tampil per satuan
    dasar, tapi qty diinterpretasi sebagai satuan besar — apakah `Nilai Retur / Satuan` juga per
    satuan besar? Estimasi selisih di FE tampaknya tetap memakai harga pokok per satuan dasar.
28. ✅ *(Keputusan 6 Okt: angka + pilihan satuan, default satuan terbesar; FE mengonversi ke satuan dasar. Saldo Awal: harga pokok per satuan pilihan ÷ isi.)* Mutasi Gudang & Saldo Awal meminta qty dalam satuan dasar, sedangkan layar lain memakai
    angka + pilihan satuan (default DUS). Perlu diseragamkan?
29. ✅ *(Peringatan di jendela baris + notifikasi stockWarnings setelah simpan; jalur revisi belum — backend revise tidak mengembalikan stockWarnings.)* Faktur Penjualan tidak menampilkan peringatan stok minus di jendela baris (hanya Order
    Penjualan yang menampilkan "Qty melebihi sisa stok…"); `stockWarning` dari backend tidak
    ditampilkan setelah simpan.
