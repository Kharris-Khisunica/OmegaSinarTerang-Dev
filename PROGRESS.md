# Progress Tracker v3 — Website Operasional FMCG

Pendamping `Development_Plan_v2`, `CLAUDE.md` v2, dan `KONTEKS_REVISI_2026-07-28.md`.

> **Versi 3 — 29 Juli 2026.** Menggantikan v2. Perubahan: spine hari digeser +3 untuk
> menampung rework Hari 7–9 (buah revisi klien 28–29 Juli), scope BARU masuk lewat hari
> sisipan berhuruf (22A, 23A), drift `-5` dicabut jadi `0`, dan seluruh DoD yang memuat
> aturan lama (pembulatan, `INV/`, `CONSIGNMENT`, `tax_status`, Docker) ditulis ulang.
> **Cut-over 1 September tidak bergerak.**

**Cara pakai:**
1. Simpan file ini **di dalam repo** dan commit setiap hari. Ini audit trail proyek.
2. Isi **Tgl Aktual** saat sub-item selesai & lolos DoD. Kalau kosong padahal tanggalnya lewat, itu drift.
3. Update **§0 Papan Status** setiap pagi sebelum mulai kerja.
4. Salin bagian "Modul Selesai" (§4) ke context prompt AI berikutnya.
5. Nomor hari **berubah** dari v2. Pakai §0.1 untuk menerjemahkan referensi lama.

---

## 0. Papan Status (update tiap pagi)

| | |
|---|---|
| Hari ke- | `32` dari 37, **Hari 32A ditambahkan hari ini (05 Sep, belum dikerjakan)** — sisipan huruf ketiga setelah 17A/22A/23A, dan sisipan kedua dari jatah "+2 hari sisipan" di §1 CLAUDE.md (17A = sisipan pertama). Isinya: putaran lanjutan Biaya Operasional (5 sesi tanya-jawab klien 05 Sep — lihat §3 hari ini) — akun real, Pindah Buku Kas (`PB`), Kasbon (Piutang Karyawan), master Tukang Angkut, kolom kendaraan BBM, Laporan Biaya Operasional. **Temuan penting sebelum menulis prompt**: akun Biaya Operasional REAL (`06.110.xxx`/`06.120.xxx`, dari `docs/COA_USULAN.md`) **sudah di-seed sejak Hari 17A (13 Agu)** — 11 placeholder `52xx` dari Hari 17 pagi sudah DIHAPUS migration yang sama hari itu juga (lihat `RestructureChartOfAccountsV2` baris ~164-179). Jadi tidak ada CoA yang perlu diseed ulang; pekerjaan sebenarnya Hari 32A adalah FITUR (Pindah Buku Kas, Kasbon, master Pekerja, kolom kendaraan, edit-sebelum-approve, laporan), bukan migration akun. (+2 hari sisipan — 16A & 16B selesai 10 Agu; 17A selesai 13 Agu) — Hari 21 & 22 selesai 23 Agu (lihat catatan lama di bawah), Hari 22A **BELUM dikerjakan** (dilompati — Hari 23 BE dikerjakan lebih dulu atas instruksi prompt), Hari 23 **BE selesai 26 Agu 2026** (`sales_returns`/`RJ`, lihat §2/§4) — **FE Hari 23 menyusul**, belum dikerjakan. Hari 24 **selesai penuh 26 Agu 2026** (BE `agents`/`vehicles`/`delivery_orders`-`SJ` + FE halaman Agen/Kendaraan + tombol "Buat Surat Jalan" di faktur `PENGIRIMAN`, lihat §2/§4). Hari 25 **selesai penuh 26 Agu 2026** (BE status pengiriman + FE halaman Surat Jalan/cetak A5/kunci cetak, lihat §2/§4). **Belum tuntas dari Hari 22**: verifikasi visual StepUpDialog di Mutasi Gudang, cetak fisik ke kertas, nota 16-baris, watermark VOID — lihat §4 Hari 22. Hari 26 **selesai penuh 29 Agu 2026** (BE `payment_batches`/`payment_batch_methods`/`payments` + `POST /payments/preview-allocation`; FE step 1, lihat §2/§4). Hari 27 **selesai penuh 30 Agu 2026** (BE `POST /payments/confirm` + selisih pembayaran + VOID batch; FE step 2 — alokasi manual, dialog selisih, riwayat, kwitansi A5 — dibuktikan lewat `./scripts/verify.sh` 10/10 + manual browser E2E, lihat §2/§4). Hari 28 **selesai penuh 30 Agu 2026** (Laporan Kontinuitas Nomor Dokumen + export Excel, lihat §2/§4 — sudah tercatat sebelum sesi ini). Hari 29 **selesai penuh 03 Sep 2026** (BE `GET /reports/{stock,titipan,stock-opname}` + FE 3 halaman laporan baru — isi laporan & pull-forward worksheet opname dari Hari 32 diputuskan langsung oleh user, belum dikonfirmasi klien, lihat §1/§3/§4). **Hari 30 un-postponed & selesai 03 Sep 2026** atas instruksi user (Laporan Penjualan/Piutang/Hutang, keputusan kerja belum dikonfirmasi klien — lihat `day30_summary.md` + §2/§4). **Hari 31 selesai 04 Sep 2026** (Rekap Kas Harian BE+FE + pelunasan utang teknis titipan — lihat §2/§4; sisa katalog utang teknis dan 2 kejadian flaky test ditemukan sesi ini dicatat di §4 Hari 31, BUKAN diselesaikan sepihak). **Hari 32 selesai 04 Sep 2026** (BE `GET /reports/stock-reconciliation` pemanggil pertama `reconcile()` Hari 10 + FE halaman Rekonsiliasi Stok + `docs/queries.md` pengganti Laporan Retur/Stok Minus yang dipotong — lihat §2/§4; catatan desain penting: kolom Titipan di laporan ini konteks tambahan, BUKAN penjelas selisih ledger, lihat §4 Hari 32) |
| Tanggal hari ini | `05 September 2026` — 🛑 **kalender riil masih lewat cut-over 1 September** (progres kode masih di Hari 32 + Hari 32A belum dikerjakan; deploy Hari 33/audit RBAC Hari 35/saldo awal Hari 36/serah terima Hari 37 semuanya masih belum terjadi). **Masih terbuka dari kemarin, belum berubah** (lihat §4 Hari 31): **216 file** belum pernah di-commit sejak `ed8dacb` (naik dari 214 — sesi hari ini menambah perubahan tanpa commit, lihat baris di bawah), dan `scripts/verify.sh` baris 149 (`cd $FE_DIR && npm run build`) masih tanpa `NODE_OPTIONS` — OOM kalau dijalankan apa adanya, harus `NODE_OPTIONS=--max-old-space-size=4096` manual. **Pekerjaan ad-hoc hari ini (bukan Hari 32A, di luar spine)**: export PDF laporan di-un-cut atas permintaan+keputusan langsung user (CLAUDE.md §8, ditanya dulu karena bertabrakan dgn keputusan tertutup 28 Juli) — 8 halaman `laporan/*.vue` sekarang menawarkan Excel+PDF (A4), lihat §3 05 Sep. Lihat §3 04–05 Sep — bawa ke klien, bukan diserap diam-diam |
| Rencana hari terakhir | **30 Agustus 2026** — serah terima (31 Agu = cadangan) |
| Cadangan eksplisit | **27–28 Agustus** (2 hari kosong, hasil penundaan pelaporan) |
| Cut-over | **1 September 2026** |
| **Drift kumulatif** | `0` hari *(⚠️ masih belum direkonsiliasi sejak catatan Hari 18 — Hari 19 selesai 18 Agu (sama hari dgn Hari 18), Hari 20 dikerjakan 20 Agu (rencana 11 Agu), Hari 21 (rencana 12 Agu) BE-nya baru 23 Agu dan FE-nya masih menyusul. Baris ini & §"Margin"/"Buffer tersisa" di bawah masih angka 10 Agu, belum dihitung ulang — butuh keputusan user/klien, bukan sesuatu yang saya putuskan sepihak. Lihat catatan di checklist Hari 18 §2. Juga: tenggat internal "input master data ±20 Agu" (§1) sudah lewat per tanggal riil ini.)* |
| **Margin** | **+0,65 hari** — semula +2,65 (dipulihkan sore 29 Juli dengan menunda pelaporan ke pasca-MVP, §7), **−2 hari** untuk sisipan Hari 16A & 16B (retrofit UI, 10 Agu) |
| Buffer tersisa | Hari 34 + cadangan 27–28 Agu → `3` hari — **tidak berubah**, sisipan 16A/16B memakan margin, bukan buffer (Hari 18 terpakai CRUD COA; Hari 36 terpakai input saldo awal) |

**Neraca kapasitas (dari `KONTEKS_REVISI` §1, dibukukan di sini):**

| | Hari |
|---|---|
| Keunggulan jadwal per 27 Juli | +5,00 |
| Buffer plan (15, 31, 33 lama) | +3,00 |
| Potongan darurat item 1–4 | +2,25 |
| **Tersedia** | **+10,25** |
| Rework Hari 7–9 | −3,00 |
| Hari sisipan 22A (Pengecekan Invoice) + 23A (Tutup Bulan) | −2,00 |
| Delta yang menumpang di hari existing (§3 KONTEKS) | ≈ −5,35 |
| Sub-total | ≈ −0,10 → praktis nol |
| **Penundaan pelaporan ke pasca-MVP (§7)** | **+2,65** |
| **Sisa** | **≈ +2,55** |

**Aturan drift** (tetap diperketat meski margin pulih — margin ini punya pemilik: modul
Pembayaran Hari 26–27 yang belum pernah dibahas klien)**:**
- Drift ≥ 0,5 hari → catat di §3 hari itu juga, jangan tunggu genap sehari
- Drift ≥ 1 hari → pakai buffer terdekat (Hari 34 atau 36)
- Drift ≥ 2 hari → **tidak ada lagi daftar potong.** Yang tersisa hanya dua tuas:
  tukar scope dengan klien, atau geser cut-over. Bawa ke klien hari itu juga
- Penundaan ke pasca-MVP **bukan** tuas yang bisa dipakai lagi. Yang tersisa untuk ditunda
  hanya hal yang direkam saat transaksi terjadi — dan itu justru yang tidak boleh ditunda

---

## 0.1 Peta Penomoran Hari (v2 → v3)

Rework menempati Hari 7–9, sisanya bergeser +3. Referensi lama di `CLAUDE.md`,
`Development_Plan_v2`, dan catatan §3/§4 di bawah dibaca lewat tabel ini.

| v2 | v3 | Isi |
|---|---|---|
| — | **7** | 🆕 Rework: format nomor dokumen + `settings.store_code` + alasan VOID |
| — | **8** | 🆕 Rework: master data v2 (produk, merek, UoM, salesman, gudang) |
| — | **9** | 🆕 Rework: `authorization_requests` berpayload + `StepUpService` dinamis |
| 7 | 10 | Stock Recorder + FIFO |
| **8** | **11** | Integration test 4 invarian + VOID Engine ← `CLAUDE.md` §7 & §8 menyebutnya "Hari 8" |
| 9 | 12 | Jurnal Manual + Saldo Awal |
| 10 | 13 | Mutasi Gudang bercabang |
| 11 | 14 | Faktur Pembelian |
| 12 | 15 | Edit/VOID Pembelian + **kunci cetak generik** |
| 13 | 16 | Retur Pembelian (dari BAD_STOCK) |
| 14 | 17 | Biaya Operasional + approval kas besar |
| — | **17A** | 🆕 Restrukturisasi Bagan Akun — 108 akun (COA_USULAN), migrasi 13 akun lama |
| 15 | 18 | BUFFER + CRUD COA penuh |
| 16 | 19 | Sales Order + saluran penjualan |
| 17 | 20 | Price Suggestion + skema Faktur Penjualan |
| 18 | 21 | `POST /sales-invoices` + batas jual di bawah harga pokok |
| 19 | 22 | Edit/VOID Penjualan + cetak nota A5 |
| — | **22A** | 🆕 Halaman Pengecekan Invoice Harian (supervisor) |
| 20 | 23 | Retur Penjualan |
| — | **23A** | 🆕 Tutup Bulan + buka kembali |
| 21 | 24 | Agen, Kendaraan, skema Surat Jalan |
| 22 | 25 | Endpoint + cetak Surat Jalan |
| 23 | 26 | Payment: skema + preview alokasi |
| 24 | 27 | Payment: confirm + selisih pembayaran |
| 25 | 28 | ~~Rekap setoran agen~~ **dipotong** → Laporan Kontinuitas Nomor Dokumen |
| 26 | 29 | Laporan Stok & Barang Titipan |
| 27 | 30 | Laporan Penjualan, Piutang, Hutang |
| 28 | 31 | Laporan Biaya + Rekap Kas Harian (~~cash opname~~ dipotong) |
| 29 | 32 | Rekonsiliasi stok (~~laporan retur & stok minus~~ dipotong) |
| — | **32A** | 🆕 Biaya Operasional lanjutan — Pindah Buku Kas (`PB`), Kasbon (Piutang Karyawan), master Pekerja/Tukang Angkut, kolom kendaraan BBM, edit-sebelum-approve, Laporan Biaya Operasional (un-postponed dari §7) |
| 30 | 33 | **Deploy Windows-native** + export Excel (~~PDF~~ dipotong) |
| 31 | 34 | BUFFER |
| 32 | 35 | Audit Permission Matrix |
| 33 | 36 | BUFFER |
| 34 | 37 | Smoke test, dokumentasi, serah terima |

> ⚠️ **Patch yang perlu kamu terapkan ke `CLAUDE.md`:** §7 ("termasuk 4 invarian setelah
> Hari 8") dan §8 ("integration test Hari 8") sekarang menunjuk **Hari 11**.

---

## 1. Menunggu Klien (cek tiap hari)

| Item | Dibutuhkan sebelum | Diminta tgl | Diterima tgl | Status |
|---|---|---|---|---|
| **Konfirmasi 7 keputusan revisi hasil testing (K1-K7)** + 5 asumsi kerja (A1-A5) — lihat `docs/RENCANA_REVISI_TESTING_KLIEN.md` §2A/§2B dan `docs/KONFIRMASI_KLIEN_REVISI.md` (versi bahasa awam untuk dibacakan ke klien) | **R12** | 08 Sep | | ⏳ **prioritas tinggi** — K1-K7 sudah diputuskan user dan pekerjaannya jalan terus (pola sama Payment §2.12), tapi belum dikonfirmasi ke klien. Dua poin paling mungkin ditolak: **K3** (batas revisi faktur 2 hari) dan **A5** (arti "Isi" pada nama produk — kalau salah, R2 berubah dari reorder jadi perubahan skema) |
| **L1 — Stok Opname dibatasi MASTER+SUPERVISOR** (paket R11, `docs/RENCANA_REVISI_TESTING_KLIEN.md` §1 "Laporan") **bertabrakan langsung dengan CLAUDE.md §5** ("Laporan ✅ semua role kecuali COA", keputusan tertulis sengaja) | **R12** | 20 Sep | | ⏳ **prioritas tinggi** — diimplementasikan sebagai keputusan kerja atas instruksi eksplisit user setelah konflik diangkat (§3 20 Sep 2026), TAPI beda dari K1-K7 (yang murni belum sempat ditanya): ini **menimpa aturan §5 yang sudah ada**, jadi risiko ditolak klien lebih tinggi — kalau ditolak, tinggal hapus satu `@Roles()` dan satu baris FE, bukan migration |
| **Format nota A5** (penjualan, pembelian, surat jalan, retur, kwitansi, mutasi) | Hari 22 & 25 | 27 Jul | | ⏳ **Faktur Penjualan (`JL`) TIDAK lewat tenggat** — foto asli `docs/referensi/penjualan/Faktur Penjualan.jpg` sudah ada & didokumentasikan penuh di PANDUAN_UI §13.1, dipakai Hari 22 (§4). Sisanya (`B1`/`SJ`/`RJ`/`RB`/`PAY`) masih belum ada foto — tetap pakai aturan cadangan (turunkan dari §13.1, §13.3) |
| PR #2 — lot retur pelanggan `supplier_id` NULL: boleh diretur ke supplier mana pun atau diblokir? | **Hari 16** | 29 Jul | | ⏳ **prioritas tinggi** |
| ~~PR #3 — panel harga kosong untuk satuan yang belum pernah dipakai: fallback ke harga master atau kosongkan?~~ | Hari 20 | 29 Jul | 20 Agu | ✅ **kosongkan** — operator tanya Master langsung, kapan saja |
| ~~Modul **Pembayaran / Kas & Bank** — belum dibahas sama sekali~~ | **Hari 26** | 29 Jul | 29 Agu | ✅ **Desain skema tertutup 29 Agu 2026** — lihat `KONTEKS_REVISI_2026-07-28.md` §2.12 (`payment_batches`/`payment_batch_methods`/`payments`, dari screenshot `penerimaan-kas`/`pengeluaran-kas`). Keputusan kerja, **belum dikonfirmasi ke klien** |
| Modul **Biaya Operasional** — putaran lanjutan (Putaran 2 & 3, lihat `docs/PERTANYAAN_KLIEN_BIAYA_OPERASIONAL_PUTARAN2.md`) | Hari 32A | 29 Jul | 05 Sep | ✅ **Tuntas 05 Sep 2026** lewat 5 sesi tanya-jawab sesi ini (bukan dari sesi tatap muka klien — perlu dikonfirmasi ulang ke klien, pola sama Payment §2.12). Keputusan: bentuk header+baris tetap; kas sumber selalu Kas Kecil; edit langsung boleh sebelum `review_status` disetujui supervisor, VOID sesudahnya; backdate 7 hari khusus modul ini; akun CoA real (`06.110.xxx`/`06.120.xxx`) ternyata **sudah ada sejak Hari 17A** — lihat catatan §0 hari ini. Detail penuh di §3 tanggal 05 Sep |
| **Piutang karyawan** (kasbon) — ada dalam praktik (§3.5 dokumen Biaya Operasional) | Hari 32A | 10 Agu | 05 Sep | ✅ **Akun `01.120.00002 Piutang Karyawan` sudah ada sejak Hari 17A** (dari `docs/COA_USULAN.md`, saldo Juli: Icung 2.500.000 + Firman 1.700.000 — dua nama ini jadi kandidat seed master Pekerja). Alur baru disepakati 05 Sep: dari Kas Kecil, dilunasi **setor tunai** (bukan potong gaji). **Belum diputuskan**: lewat menu apa uang setoran pelunasan (masuk) dicatat — modul Payment/Penerimaan Kas belum ada; default sementara Jurnal Manual, lihat prompt Hari 32A |
| **Master "tukang angkut" bernama** — klien konfirmasi perlu rekap per orang ("berapa saya bayar ke Mang Icung bulan ini") | Hari 32A | 10 Agu | 05 Sep | ✅ **Orangnya karyawan tetap** (jawaban 05 Sep) — master baru kecil (pola sama `salesmen`/`vehicles`: kode, nama, aktif), BUKAN menumpang master Salesman (peran beda: Salesman dipilih per faktur, Pekerja dipakai di baris Biaya Operasional + Kasbon). Seed awal minimal: Icung, Firman (dari `COA_USULAN.md`) |
| **Nama orang yang menghitung saldo kas awal** (Kas Kecil/Besar) per 31 Agustus, disaksikan siapa | Hari 36 | 10 Agu | | 🆕 ⏳ ditemukan Hari 17 (`PERTANYAAN_KLIEN_BIAYA_OPERASIONAL.md` §14.3) |
| **Bentuk closing**: baris Saldo Awal/Saldo Akhir = jurnal sungguhan atau konstruksi tampilan? | **Hari 23A** | 29 Jul | | ⏳ **prioritas tinggi** — menentukan skema, bukan tampilan |
| Bentuk input **Saldo Awal** (file, ketik manual, atau impor) | Hari 12 | 29 Jul | | ⏳ tanggalnya sudah pasti: **1 Sep 2026** |
| **Angka saldo awal** stok + piutang + hutang dari klien | **Hari 36** (29 Agu) | | | ⏳ |
| Cara menyesuaikan selisih 29–31 Agustus (ulang input, atau masuk sebagai transaksi biasa) | Hari 36 | 29 Jul | | ⏳ |
| Isi **Laporan** yang benar-benar dipakai (Stok/Titipan, Hari 29) | Hari 29 | 29 Jul | 03 Sep | ✅ **Keputusan kerja user 03 Sep 2026** — Laporan Stok: Toko/BS/Total saja. Laporan Titipan: pivot Nama Barang × Customer. **Belum dikonfirmasi ke klien**, pola sama Payment (§2.12) |
| Bentuk **Laporan Piutang/Hutang** (bucket umur, layar) — Hari 30 | Hari 30 | 03 Sep | 03 Sep | ✅ **Keputusan kerja user 03 Sep 2026** — bucket umur 30 hari, dari `settings.aging_bucket_days` (bukan hardcode). Layar pakai pola generik §14 PANDUAN_UI apa adanya (tidak ada foto acuan khusus, beda dari Laporan Penjualan). Hutang per-supplier dari `purchase_invoices`+`payments` (bukan breakdown GL — `journal_entry_lines` tidak punya `supplier_id`). **Belum dikonfirmasi ke klien** |
| ~~Keputusan hosting final~~ | Hari 4 | | **28 Jul** | ✅ PC operator merangkap server, tanpa Docker, tanpa mini PC |
| **Pengadaan UPS** (satu-satunya belanja wajib) | Hari 33 | 28 Jul | | ⏳ ingatkan tiap minggu |
| Ekspor data Affari — dorong sekali lagi (menu Laporan / tanya vendor / baca file DB) | Cut-over | 28 Jul | | ⏳ sementara dianggap **tidak ada** |
| `REC(s): 61` dan `260` — total atau tampilan terfilter? | Hari 13 | 28 Jul | | ⏳ menentukan migrasi setengah hari atau berminggu |
| Input master data oleh klien (produk, pelanggan, merek, UoM, salesman, supplier) | **±20 Agu** (tenggat internal) | 28 Jul | | ⏳ bisa mulai setelah Hari 8, paralel |
| Saldo awal stok + harga pokok per produk | Hari 12 | | | ⏳ |
| Saldo awal piutang per pelanggan, hutang per supplier | Hari 12 | | | ⏳ |
| Konfirmasi tarif PPN (konsultan pajak) | Hari 14 | | | ⏳ masuk tabel `tax_rates`, bukan config |
| ~~Nama & waktu **kontrol pengganti rekap setoran agen** (siapa mencocokkan uang sopir, kapan)~~ | Hari 28 | 28 Jul | 30 Agu | ✅ **cukup di kertas** — agen bertanggung jawab atas total uang invoice yang ia bawa, dicocokkan tiap sore bersamaan pelunasan, selisih jadi tanggungan agen. Tidak ada perubahan skema/kode. Lihat `KONTEKS_REVISI` §4.4 |
| Repo dipindah ke akun klien | Hari 37 | | | ⏳ **sarankan hari ini** |

> Item ⏳ yang melewati tanggal "dibutuhkan sebelum" otomatis jadi risiko jadwal. Catat di §3.
> Empat item bertanda **prioritas tinggi** menghambat hari yang sudah dekat — kejar duluan.

---
## 2. Checklist Harian

Legenda: `[ ]` belum · `[~]` jalan · `[x]` selesai & lolos DoD · ⚠️ risiko tinggi · 🔒 blocker
· 🆕 hari baru dari revisi 28–29 Juli · ♻️ isinya diubah revisi · 🛑 ada gerbang "berhenti & tanya"

### Fase 1 — Fondasi (Hari 1–4) · 26–27 Juli · **SELESAI**

> ⚠️ Output Hari 3, 4, dan 5 **sebagian digantikan** oleh rework Hari 7–9. Checkbox di bawah
> tetap `[x]` karena memang selesai sesuai DoD yang berlaku saat itu — bukan dihapus, tapi
> dilanjutkan. Jangan membaca §4 Modul Selesai tanpa membaca Hari 7–9 dulu.

**Hari 1** — Rencana: 27 Jul · Aktual: `26 Jul 2026`
- [x] BE: scaffold NestJS modular + TypeORM + `pgcrypto` + git + env
- [x] FE: scaffold Nuxt + Nuxt UI + layout (sidebar/topbar) + struktur `pages/`
- **DoD:** `npm run dev` jalan di BE & FE, koneksi DB sukses, commit pertama masuk repo

**Hari 2** — Rencana: 28 Jul · Aktual: `26 Jul 2026`
- [x] BE: `users` + JWT/refresh + bcrypt + RBAC Guard + login/refresh/logout
- [x] BE: seed 3 user + **rate-limit login**
- [x] FE: login page + auth composable + route middleware + logout
- **DoD:** 3 role bisa login, token tersimpan, halaman terproteksi menolak akses tanpa token
  *(BE terverifikasi lewat curl; FE terverifikasi manual di browser — login 3 role,
  token tersimpan di cookie, halaman terproteksi redirect ke `/login` tanpa token,
  halaman ber-`roles` menolak role yang salah, logout menghapus sesi.)*

**Hari 3** 🔒 — Rencana: 29 Jul · Aktual: `27 Jul 2026`
- [x] BE: migration `products`(+conversions), `customers`, `suppliers`, `warehouses`, `tax_rates`
- [x] BE: migration `chart_of_accounts` + seed 11 akun
- [x] BE: migration `settings` + `document_counters` + **generator nomor** (`FOR UPDATE`)
- [x] FE: ⚠️ `<DataTable>` (list+search+pagination server-side)
- [x] FE: ⚠️ `<CrudFormPage>` (layout create/edit generik)
- **DoD:** generator nomor menghasilkan `INV/2609/0001` dan reset benar saat ganti bulan; kedua komponen dipakai 1 halaman percontohan tanpa copy-paste
  *(FE terverifikasi manual di browser — search/sort/filter/pagination/state-di-URL,
  create dengan validasi client+server per-field, edit memuat data lama, Ctrl+S, Esc,
  "Simpan & Tambah Lagi". BE terverifikasi: build 0 error, lint bersih, 13 test hijau
  (termasuk 4 test `DocumentCounterService`, salah satunya 20 pemanggilan paralel
  menghasilkan 20 nomor unik berurutan tanpa duplikat), migration up→down→up sukses
  di DB sementara, `GET /health` 200.)*

**Hari 4** — Rencana: 30 Jul · Aktual: `27 Jul 2026`
- [x] BE: CRUD Products (+konversi satuan 1 layar)
- [x] BE: CRUD Customers (+`is_pkp`, `ar_account_id`)
- [x] BE: CRUD Suppliers (auto-code + masking Operator) + Warehouses + Settings
- [x] FE: halaman Products, Customers, Settings
- [x] **Beri tahu klien: input master data boleh dimulai** (FE terverifikasi visual di
  browser sore ini — lihat DoD di bawah — aman untuk dikabari)
- **DoD:** Operator melihat supplier ter-mask, Master melihat penuh (✅ BE, dibuktikan lewat
  test otomatis + curl manual); klien sudah bisa masuk & input produk (✅ **diuji visual
  langsung di browser** — ekstensi Chrome konek sore ini: login Master, create Produk 2
  baris konversi via keyboard murni — Enter pindah kolom, Enter di kolom terakhir menambah
  baris + auto-fokus — simpan sukses & tampil di list; edit produk 3-tingkat lama
  (dus/renceng) merekonstruksi rasio dengan benar (dus=12, renceng=10, cocok data DB);
  create Customer dengan "Aktif" default ON, submit nomor telepon format salah → error
  400 ter-mapping ke field yang benar, submit format benar + 4 field alamat terpisah →
  tersimpan sukses.)
- **Revisi (27 Jul, sore):** guardrail nomor telepon Customer, alamat Customer dipecah 4
  field, default "Aktif"=aktif, urutan input konversi satuan Produk dibalik besar→kecil.
  Detail lengkap di §4.


### Fase 2 — Engine Inti (Hari 5–6) · 27 Juli · **SELESAI**

**Hari 5** — Rencana: 31 Jul · Aktual: `27 Jul 2026`
- [x] BE: export generik ExcelJS + PDFKit
- [x] BE: `authorization_requests` + guard step-up + `expires_at` (TTL 15 menit)
- [x] FE: halaman Suppliers, Warehouses (pilih `warehouse_type`)
- **DoD:** request step-up kedaluwarsa setelah 15 menit dan ditolak saat dieksekusi
  *(dibuktikan lewat test otomatis yang memundurkan `expires_at` 16 menit lalu
  eksekusi ulang — bukan menunggu 15 menit sungguhan; `./scripts/verify.sh` 10/10
  lulus: build+lint+test BE, migration up→down→up, `GET /health` 200, build+lint FE,
  tidak ada `@Delete()`, `.env` tidak ter-stage. FE diuji manual di browser — lihat
  detail di §4.)*

**Hari 6** 🔒 — Rencana: 1 Agu · Aktual: `27 Jul 2026`
- [x] BE: `journal_entries` + `journal_entry_lines`
- [x] BE: **Journal Poster** + 5 validasi (min 2 baris, satu sisi > 0, balance, akun aktif, nomor)
- [x] FE: halaman COA (tree, view only)
- **DoD:** posting tidak balance → error & rollback; `entry_number` format `JE/YYMM/NNNN`
  *(dibuktikan lewat 7 unit test `journal-poster.service.spec.ts` — integration test
  terhadap Postgres asli, pola sama dengan `DocumentCounterService` — termasuk bukti
  eksplisit `document_counters` tidak naik (`last_number` sama sebelum/sesudah)
  setelah percobaan posting yang sengaja tidak balance selisih Rp0,01. `./scripts/
  verify.sh` 10/10 lulus. Endpoint `GET /journal-entries` + `GET /journal-entries/:id`
  diuji manual lewat curl: MASTER/SUPERVISOR/OPERATOR semua 200 (RBAC direvisi susulan,
  lihat §4), id tidak ada → 404. Detail lengkap FE COA/Jurnal susulan di §4.)*


### Fase 2B — Rework Pasca-Revisi Klien (Hari 7–9) 🆕 · 29–31 Juli

> Tiga hari ini membayar utang yang dibuat revisi klien 28–29 Juli terhadap pekerjaan yang
> sudah selesai. Urutannya sengaja: **nomor dokumen dulu** (Hari 7) karena setelah Hari 14
> dokumen mulai terbit dengan nomor sungguhan dan format tidak bisa diubah lagi tanpa
> migrasi data; **step-up terakhir** (Hari 9) karena ia fondasi kunci cetak, kas besar,
> dan batas jual-rugi yang semuanya datang setelah ini.

**Hari 7** 🆕🔒 — Rencana: 29 Jul · Aktual: `____` (BE selesai; FE menyusul)
- [x] BE: format nomor `KODE/{settings.store_code}-YYMMXXXX` menggantikan `PREFIX/YYMM/NNNN`
- [x] BE: `settings.store_code` (`RM01`) + identitas toko (nama, kota, telepon) — **tidak di-hardcode**
- [x] BE: tabel kode dokumen disesuaikan — `JL`, `B1`, `GD`, `SO`, `SJ`, `RJ`, `RB`, `PAY`, `JE`
- [~] BE: `void_reason_code` (**teks bebas, BUKAN enum** — keputusan user 29/30 Jul, lihat §3) +
  `void_reason_note` (teks, wajib) — belum ada kolom sungguhan karena belum ada satu pun
  tabel dokumen (faktur dll mulai Hari 14+); baru ditempelkan saat tabel itu dibuat
- [x] BE: **bersih-bersih aturan yang dicabut** — akun Pendapatan Pembulatan **dihapus**
  (dicek 0 pemakaian di jurnal dev) + `settings.rounding_multiple` dihapus; akun Diskon
  Penjualan/Selisih Pembayaran/Selisih Retur Pembelian ditambah; `settings.default_ar_account_id`
  (auto-diisi id akun Piutang Usaha 1102) & `cash_outflow_approval_threshold` (default 0) ditambah
- [x] BE: migrasi ulang data dev — `document_counters` di-**truncate** (bukan dipetakan ulang),
  aman karena belum ada dokumen sungguhan bernomor lama
- [ ] FE: halaman Settings menampilkan identitas toko + `store_code` (read-only setelah dokumen
  pertama terbit) — **belum dikerjakan, di luar lingkup prompt BE hari ini**
- **DoD:** generator menghasilkan `JL/RM01-26070001`; ganti bulan mereset ke `0001`;
  20 pemanggilan paralel tetap menghasilkan 20 nomor unik berurutan; rollback transaksi
  **mengembalikan** nomor (dibuktikan: `last_number` sama sebelum/sesudah percobaan gagal) —
  **kelima poin ini sudah terbukti lewat test otomatis**, lihat §3 & §4

**Hari 8** 🆕♻️ — Rencana: 30 Jul · Aktual: `30 Jul 2026` (BE + FE selesai)
- [x] BE: master **Merek** + master **UoM** + master **Salesman** (kode, nama, aktif)
- [x] BE: `products` — kode = barcode `YYMMDDXXXX` (**dikunci setelah transaksi pertama**),
  `is_bkp`, nama tersusun 4 bagian + `display_name` **terindeks**, kolom `Isi`
- [x] BE: `customers.ar_account_id` (nullable, sudah ada sejak Hari 3) + **satu fungsi
  bersama** pembaca akun piutang (`ArAccountResolverService`)
- [x] BE: `suppliers.is_pkp`
- [x] BE: rename `warehouse_type` `CUSTOMER_CONSIGNMENT` → **`TITIPAN_PELANGGAN`**
  (migration + backend + FE Warehouses ikut disesuaikan supaya tidak ada value mati)
- [x] FE: halaman Merek, UoM, Salesman (`useSimpleMasterSchema` bersama, bukan copy-paste
  3x — lihat §4); form Produk dirombak total (Merek dropdown/Keterangan/Kemasan/
  Ukuran+Satuan Ukuran) dengan **pratinjau `display_name` besar live**, kode manual +
  tombol "Bangkitkan" + terkunci read-only kalau `isCodeLocked`, `is_bkp` berlabel awam
- [x] FE: `arAccountId` di form Customer digerbangi ke **schema level** (bukan `showIf`)
  supaya benar-benar tidak ada di DOM untuk Operator — sekaligus **memperbaiki bug laten**
  Hari 4 yang membaca `/chart-of-accounts` seolah `{data,meta}` padahal endpoint itu flat
  array (baru ketahuan karena endpoint aslinya baru sungguh dipakai hari ini)
- [ ] **Beri tahu klien: pengisian master data boleh dimulai** (tenggat internal ±20 Agu)
  — **masih belum dilakukan**, sekarang layarnya sudah ada (item FE di atas selesai),
  tinggal dikabari
- **DoD BE:** membuat produk "Bendera Putih Sachet 37 gr" dari 4 bagian terpisah menghasilkan
  `display_name` yang benar dan bisa dicari ✅ (test otomatis + curl manual); kode produk
  yang sudah dipakai transaksi ditolak saat diubah ✅ (test otomatis + curl manual,
  `lockCode()` disimulasikan manual — belum ada pemanggil produksi, StockRecorder/Faktur
  Hari 10+ yang akan memanggilnya); `ar_account_id` NULL jatuh ke
  `settings.default_ar_account_id` lewat fungsi bersama, bukan literal di modul ✅
  (3 test integrasi `ArAccountResolverService`). `./scripts/verify.sh` 10/10 lulus.
- **DoD FE:** mengetik 4 field Produk di browser (Master, login sungguhan) → pratinjau live
  persis **"Bendera Putih Sachet 37 gr"** (contoh baku CLAUDE.md §3), disimpan → kode
  auto-generate, konversi dus=12 pcs benar ✅; login Operator, `GET /master-data/
  customers/create` → teks "Akun Piutang" **tidak ada sama sekali** di `get_page_text`
  (bukan cuma tersembunyi CSS) ✅; login Master → dropdown Akun Piutang hanya berisi
  **"1102 - Piutang Usaha"** (satu-satunya akun `isReceivableAccount && isActive`) ✅.
  `pnpm run build`/`lint` FE 0 error, `npm run build` BE 0 error. Data uji dihapus lagi
  dari DB dev setelah verifikasi (skrip sekali-jalan, konsisten pola Hari 4/5/8).
  **Catatan sesi**: login browser sempat 401 sampai `npm run seed` dijalankan ulang
  (idempotent) — kemungkinan hash password di DB dev sempat basi dari sesi sebelumnya.

**Hari 9** 🆕🔒 — Rencana: 31 Jul · Aktual: `30 Jul 2026` (BE + FE selesai — FE menyusul sore ini)
- [x] BE: `authorization_requests` + `payload` (JSONB, sudah ada sejak Hari 5) + `context_summary` (teks, baru)
- [x] BE: `consumeApproval` **memvalidasi ulang body request terhadap payload yang disetujui**
- [x] BE: `StepUpService.requireApproval()` — dipanggil **dari dalam service**, melempar 412
  dengan kontrak yang sama seperti guard
- [x] BE: `expires_at` dicek **saat eksekusi**, bukan hanya saat approve (sudah ada sejak Hari 5, dipertahankan)
- [x] BE: seragamkan kode status step-up ke **412** (Hari 5 memakai 428)
- [x] BE (susulan sore): `reject()` wajib `reason` + `GET /authorization-requests/:id`
  ownership-gated (dibutuhkan FE untuk polling status milik sendiri) — lihat §3 & §4
- [x] FE (susulan sore): antrian persetujuan menampilkan `context_summary`; polling 5 detik
  (bukan WebSocket) + `<StepUpDialog>` global menangani 412 dari guard maupun service lewat
  satu jalur — lihat §3 & §4 untuk detail dan 2 bug yang ditemukan+diperbaiki saat verifikasi manual
- **DoD:** approval untuk payload Rp 1 juta **ditolak** saat dipakai mengeksekusi Rp 100 juta ✅
  (`authorization-requests.service.spec.ts`, actionType `CASH_OUTFLOW`); request kedaluwarsa
  16 menit ditolak saat eksekusi ✅ (sudah ada dari Hari 5, `authorization-requests.spec.ts`);
  frontend menangani 412 dari guard dan dari dalam service lewat **satu jalur** yang sama ✅
  (dibuktikan `step-up.service.spec.ts` — 412 dari `StepUpGuard` lewat HTTP sungguhan dan dari
  `StepUpService.requireApproval()` dipanggil langsung dibandingkan berdampingan, key set +
  tipe field identik, keduanya lewat helper `stepUpRequiredException()` yang sama persis);
  **FE ✅ diverifikasi manual dua sisi** (operator via browser sungguhan, supervisor via token
  JWT langsung — lihat §3): trigger → modal + countdown → approve → modal lanjut otomatis
  <5 detik tanpa refresh; reject dengan alasan wajib → modal tampilkan alasannya; Batalkan →
  request tetap `PENDING` (tidak menggantung)

### Fase 3 — Engine Inti, lanjutan (Hari 10–13) · 1–4 Agustus

**Hari 10** 🔒 — Rencana: 1 Agu · Aktual: `30 Jul 2026`  *(v2: Hari 7)*
- [x] BE: `stock_movements`, `product_stock_balance`, `stock_cost_lots`, `stock_cost_consumptions`
- [x] BE: **Stock Recorder + FIFO + row-lock `SELECT ... FOR UPDATE`** urut `lot_date` tertua
- [x] BE: `stock_cost_lots.supplier_id` (nullable) — melacak supplier asal untuk retur pembelian
- [x] BE: stok minus diizinkan (`stockWarning`), fallback cost = lot terakhir **yang `unit_cost > 0`**
- [x] FE: halaman Authorization Requests — **sudah selesai lebih awal** sore 30 Jul sebagai
  susulan Hari 9 (lihat Hari 9 §3/§4), bukan menunggu hari ini betulan tiba
- **DoD:** konsumsi FIFO mengambil lot tertua; stok minus jalan dengan warning, tidak ditolak;
  **lot berharga nol dilewati** saat mencari lot terakhir sebagai dasar biaya
  *(Semua dibuktikan lewat 6 integration test `stock-recorder.service.spec.ts` terhadap
  Postgres asli — lihat §4 untuk detail lengkap & isi tabel setelah skenario FIFO.)*

**Hari 11** ⚠️🔒 — Rencana: 2 Agu · Aktual: `31 Jul 2026` (BE + FE dashboard/nav susulan)  *(v2: Hari 8 — ini yang dirujuk `CLAUDE.md` §7 & §8)*
- [x] BE: **integration test 4 invarian** (jurnal balance · FIFO urut · VOID simetris · stok rekonsiliasi)
- [x] BE: invarian ke-5: **Σ nilai `stock_cost_lots` = saldo akun Persediaan** — inilah yang
  merah duluan kalau diskon pembelian salah masuk jurnal
- [x] BE: VOID Engine generik + reversing journal **bertanggal hari ini**, bukan tanggal dokumen
- [x] BE: wiring step-up end-to-end (dummy action) lewat `StepUpService` — **ternyata sudah
  selesai sejak susulan Hari 9 sore** (`POST /authorization-requests/test-step-up-action` +
  `authorization-requests.spec.ts`), bukan pekerjaan baru hari ini — cukup diverifikasi masih
  hijau setelah perubahan A/B (memang hijau)
- [x] FE (susulan, sama hari): dashboard jujur **Master & Operator saja** + nav Supervisor
  **3 item** (Pengecekan Invoice · Antrian Persetujuan · Laporan), ditagih maju dari Hari 22A
  atas permintaan eksplisit — lihat §4 untuk detail lengkap
- [ ] **Minta review kode eksternal 2 jam** (engine lengkap — ROI tertinggi) — **diminta ke
  user di akhir sesi ini**, penjadwalannya di luar kendali Claude Code
- **DoD:** 5 test hijau dan jalan otomatis ✅ (68/68 suite, ~14–30 detik total, jauh di bawah
  60 detik); VOID dokumen bulan lalu **tidak mengubah** angka bulan itu ✅ (TEST 3 — entry_date
  reversal = hari ini, beda dari entry asli yang bertanggal 2 hari lalu, dibuktikan lewat
  perbandingan langsung, bukan cuma dijelaskan); dashboard tidak ada angka palsu/hardcode ✅;
  login Supervisor → sidebar persis 3 item, `/` auto-redirect ke `/pengecekan-invoice` ✅
  (dibuktikan manual di browser sungguhan, lihat §4); `pnpm run build`/`lint`/`typecheck` FE
  0 error

**Hari 12** — Rencana: 3 Agu · Aktual: `6 Agu 2026`  *(v2: Hari 9)* 🛑
- [x] BE: **Jurnal Manual** endpoint (`POST /journal-entries/manual`, Master only; tolak akun
  Persediaan/Piutang/Hutang dengan **403** + pesan yang menjelaskan alasannya) —
  **layarnya ⏸ pasca-MVP**
- [x] BE: **`PeriodLockValidatorService`** baru (`src/core/period-lock/`) — satu titik masuk
  (§2.9), diekstrak dari method privat yang sebelumnya hidup di `JournalPosterService`. Dua
  method: `validate()` (backdate, dipakai semua jurnal biasa) dan
  `assertOpeningBalanceDate()` (**satu-satunya pengecualian bernama**, hanya dipanggil
  `OpeningBalanceService`, tidak pernah lewat `JournalPosterService.post()`)
- [x] BE: **alur Saldo Awal terpadu** (`POST /opening-balance`) — satu transaction: N baris
  stok → `StockRecorderService.recordIn()` (lot + movement `opening`), lalu SATU jurnal
  pembuka lewat `JournalPosterService.post()` yang sama (Persediaan/Piutang/Hutang + plug
  otomatis ke akun **Modal** untuk menyeimbangkan — dikonfirmasi user). Bertanggal
  `settings.opening_balance_date` (default **1 September 2026**, dapat dikonfigurasi lewat
  `PATCH /settings/:key` yang sudah ada)
- [x] BE: `GET /opening-balance/verify` — bandingkan Σ nilai lot pembuka vs saldo akun
  Persediaan hasil jurnal pembuka (di-scope ke `source_type='OPENING_BALANCE'`, cek sanity
  sekali saat input — bukan invarian hidup selamanya, itu tugas invarian ke-5 Hari 11 yang
  terpisah)
- [ ] FE: halaman Saldo Awal (halaman Jurnal Manual ⏸ pasca-MVP) — **belum dikerjakan**,
  di luar lingkup prompt BE hari ini
- 🛑 **Berhenti & tanya:** bentuk Saldo Awal belum dibahas klien (§1) — **tetap belum
  dijawab**. Hanya skema + endpoint yang dikerjakan (menerima array baris lewat JSON body
  biasa); layar impor/format file menunggu jawaban, tidak ditebak
- **DoD:** jurnal manual ke Persediaan → 403 ✅ (diverifikasi test otomatis + curl manual,
  pesan menyebut nama akun & alasan sub-ledger); saldo awal 3 produk menghasilkan 3 lot DAN
  1 jurnal pembuka bernilai **persis sama**, dibuktikan lewat query SQL langsung (bukan
  hitung manual) di `opening-balance.service.spec.ts` ✅; `GET /opening-balance/verify` →
  `difference: 0` ✅ (test otomatis + curl manual sungguhan: submit stok+piutang+hutang
  sekaligus → 4 baris jurnal balance, `verify()` → `{lotValue:500000, ledgerValue:500000,
  difference:0}`). `./scripts/verify.sh` 10/10 lulus (87 test, 18 suite). RBAC dibuktikan
  manual: OPERATOR → 403 di ketiga endpoint baru.
  **Celah yang diketahui, dicatat bukan diselesaikan diam-diam** (lihat §3): tidak ada jalur
  VOID untuk `OPENING_BALANCE` (hook belum didaftarkan, fail-closed by design) — kalau ada
  input salah sebelum cut-over, belum ada cara resmi membatalkannya hari ini.
- **Hotfix susulan (7 Agu 2026, di luar lingkup Hari 12 asli):** dua perbaikan kecil masuk
  di master data yang sebelumnya digarap Hari 4/8 — dicatat di sini karena tanggal
  pengerjaannya jatuh di antara Hari 12 dan Hari 13, bukan karena berkaitan dengan Jurnal
  Manual/Saldo Awal. (1) **Kode customer sekarang dibangkitkan backend** kalau kosong —
  `customer_code_seq` (migration `1785080602937`) + `CustomersService.create()` lewat
  `generateSequenceCode()` yang sama dipakai Brand/Unit/Salesman, prefix `CUST`; FE
  `useCustomerSchema.ts` diberi tombol "Bangkitkan" + `customerTransformOut` (pola sama
  `productTransformOut`). (2) **`products.keterangan` tidak lagi wajib** — migration
  `1785080602938` `DROP NOT NULL`, entity jadi `string | null`, `CreateProductDto` lepas
  `@IsNotEmpty()`, FE lepas `required: true`. Rincian lengkap di §3 baris 7 Agu 2026.

**Hari 13** ♻️ — Rencana: 4 Agu · Aktual: `7 Agu 2026`  *(v2: Hari 10)*
- [x] BE: Mutasi Gudang bercabang + nomor **`GD`** (`src/modules/warehouse-mutations/`,
  migration `1785080602939`) — ditemukan sudah lengkap & lolos test (4/4) di awal sesi ini,
  dibuat pada sesi sebelumnya tapi belum di-commit dan belum tercatat di sini
- [x] BE: `TITIPAN_PELANGGAN` → **hanya** insert `warehouse_mutations`, tanpa movement/lot/jurnal
  ✅ (dibuktikan lewat 4 integration test `warehouse-mutations.service.spec.ts` + manual browser).
  **Celah diketahui**: validasi qty kumulatif ≤ qty yang sudah dibeli pelanggan **belum**
  diimplementasikan — `TODO` eksplisit di `processTitipan()`, ditunda ke Hari 20-22 karena
  `sales_invoice_lines` (sumber angka pembelian pelanggan) belum ada tabelnya
- [x] BE: `STORE` ↔ `BAD_STOCK` → 2 baris `transfer`, lot ikut pindah dengan `unit_cost` sama, tanpa jurnal
- [x] BE: **`BAD_STOCK` → `STORE` wajib otorisasi supervisor** (`ActionType.BS_TO_STORE`); arah
  sebaliknya bebas — diverifikasi manual end-to-end (Operator trigger → `StepUpDialog` →
  approve via Supervisor → auto-retry sukses)
- [x] FE: halaman Mutasi Gudang (`frontend/app/pages/gudang/mutasi/`) — form bercabang
  (Titipan/Transfer, bukan `<CrudFormPage>`), peringatan approval BS→STORE muncul begitu
  gudang dipilih (sebelum baris produk diisi), **`unit_cost` read-only** (blok info, bukan
  input) di ringkasan hasil submit maupun slide-over detail riwayat, nota cetak A5×2 tanpa
  rupiah (`[id]/cetak.vue`, layout `print.vue` baru)
- [x] Uji manual end-to-end di browser (Operator + Supervisor, lihat catatan sesi di §3)
- **DoD:** mutasi ke titipan tidak membuat satu pun `stock_movements` ✅; mutasi BS→STORE tanpa
  approval → 412 ✅; `unit_cost` tidak bisa diketik dari layar mana pun ✅ (DTO tidak punya
  field ini sama sekali, FE tidak pernah bind input ke sana); nota mutasi 0 angka rupiah ✅

### Fase 4 — Pembelian (Hari 14–18) · 5–9 Agustus

**Hari 14** ⚠️♻️ — Rencana: 5 Agu · Aktual: `7 Agu 2026`  *(v2: Hari 11)* (BE + FE selesai)
- [x] BE: `purchase_invoices`(+lines), `goods_receipts`(+lines) — **tiga tanggal terpisah**
  (`receipt_date` → `lot_date`, `supplier_invoice_date`, `due_date`) + `supplier_invoice_no`
- [x] BE: urutan hitung baku 9 langkah (`CLAUDE.md` §4) — diskon baris → **diskon faktur
  pro-rata nilai baris**, sisa pembulatan ke baris terakhir (dibebankan ke baris **non-bonus**
  terakhir — baris bonus selalu alokasi nol, aturan itu menang kalau baris terakhir kebetulan bonus)
- [x] BE: **PPN masukan** digerbangi `supplier.is_pkp` × `product.is_bkp`, tarif dari `tax_rates`;
  `company_is_pkp = false` → PPN **masuk `unit_cost` lot**. Cabang `company_is_pkp = true`
  (Persediaan D terpisah dari PPN Masukan D) ditulis dan **diuji sungguhan** (bukan cuma
  disiapkan) lewat toggle sementara `settings.company_is_pkp` di test — lihat §4
- [x] BE: baris **bonus** `is_bonus` — `unit_price = 0`, alokasi diskon 0, PPN 0, `lot.unit_cost = 0`
- [x] BE: faktur pembelian **selalu ke gudang `STORE`**; ongkir **tidak** dikapitalisasi (tidak ada
  kolom ongkir di faktur ini sama sekali)
- [x] FE: form Purchase Invoice multi-baris (`frontend/app/pages/pembelian/faktur/create.vue`) +
  kolom `Isi` + subtotal/diskon faktur/PPN/total **live** + preview alokasi diskon faktur per
  baris + checkbox Bonus (harga terkunci 0, penanda visual) — **susulan sore, di luar lingkup
  prompt BE pagi**
- [x] FE: list + detail (`frontend/app/pages/pembelian/faktur/index.vue`), nav "Faktur Pembelian"
- [x] BE (susulan kecil, FE-driven): `GET /tax-rates/effective?date=` — endpoint baca-saja baru
  (`src/modules/tax-rates/`), tanpa itu FE tidak bisa menghitung preview PPN masukan sebelum
  submit karena `tax_rates` tidak pernah punya controller. Server tetap satu-satunya sumber
  kebenaran; endpoint ini murni cermin baca lewat `TaxRateResolverService` yang sama dipakai
  `PurchaseInvoicesService`.
- **Celah diketahui, bukan pekerjaan hari ini**: form Supplier (`useSupplierSchema.ts`, Hari 5)
  tidak pernah punya field `isPkp` — kolom itu ada di DB dan dibaca backend, tapi MASTER tidak
  bisa menyetelnya lewat UI sama sekali. Ketahuan hari ini saat butuh supplier PKP untuk uji
  manual PPN masukan, disetel lewat SQL langsung (bukan lewat app) karena tidak ada jalur lain.
  Perlu ditambahkan ke `useSupplierSchema.ts` kapan pun Supplier disentuh lagi.
- **DoD BE (pagi):** 1 faktur 3 baris + 1 bonus → jurnal balance ✅, 4 lot terbentuk (satu ber-`unit_cost` 0) ✅,
  `total_amount` **persis** sama dengan nota supplier tanpa pembulatan ✅, invarian ke-5 tetap hijau
  ✅ (dibuktikan lewat test otomatis `purchase-invoices.service.spec.ts` — 4 test integrasi
  terhadap Postgres asli, lihat §4 untuk rincian lengkap dan angka nyata dari skenario uji) DAN
  **manual curl end-to-end** terhadap server sungguhan: faktur `B1/RM01-26080021` diterbitkan,
  `dueDate` benar dari `supplier_invoice_date+term_days` (bukan `receipt_date+term_days`), jurnal
  balance Rp1.495.000, lot `unit_cost` 1150 = 1.495.000/1300 pcs. Error path: supplier tak
  ditemukan → 400 pesan jelas; diskon persen+rupiah sekaligus → 400 pesan jelas; SUPERVISOR POST →
  403 sebelum menyentuh DB.
- **DoD FE (sore):** menambah baris bonus tidak mengubah total faktur ✅ (dibuktikan manual di
  browser: total tetap Rp 561.000 sebelum/sesudah baris bonus ditambah); mengubah diskon faktur
  memperbarui alokasi semua baris seketika ✅ (10% → alokasi -Rp45.000/-Rp10.000/Rp0 pro-rata
  nilai baris, PPN baris ikut dihitung ulang dari `lineFinal` pasca-alokasi, bukan dari net
  sebelum alokasi); mengisi termin mengisi jatuh tempo dari **Tgl Faktur Supplier** (bukan Tgl
  Terima) ✅ — dibuktikan lewat kode (`dueDate` computed murni dari `supplierInvoiceDate`,
  read-only, tidak ada jalur lain yang bisa menulisinya). Faktur sungguhan tersimpan
  `B1/RM01-26080022`, total Rp504.900, persis sama dengan angka preview sebelum submit. `npm run
  build`/`lint` 0 error BE & FE, 95/95 test BE hijau (20 suite).

**Hari 15** ♻️ — Rencana: 6 Agu · Aktual: `7 Agu 2026`  *(v2: Hari 12)* (BE saja — FE menyusul)
- [x] BE: **mekanisme kunci cetak generik** di `src/core/print-lock/` — `print_status`
  (`NOT_PRINTED` → `PRINTED` → `PRINT_CANCELLED`), `print_count`, `revision_number` (kolom
  baru, migration `1785080602942`); kerja lewat raw SQL terhadap kontrak kolom bersama
  (`print-lock-tables.ts`), bukan entity spesifik — jadi begitu `JL`/`SJ`/`RJ`/`RB`/`PAY`
  dapat tabelnya (Hari 16-27) tinggal dipakai, tanpa menyentuh core lagi. Diterapkan penuh ke
  `purchase_invoices` (`B1`); `warehouse_mutations` (`GD`) baru dapat kolom `revision_number`
  saja, belum ada wiring edit/VOID.
- [x] BE: batal cetak = `authorization_requests` `actionType: UNLOCK_PRINT` dengan
  **`intent: EDIT | VOID` dideklarasikan di depan**; payload matcher baru
  `exactFields(['sourceType','sourceId','intent'])` di `payload-matchers.ts` — satu-satunya
  mekanisme yang menjamin token dokumen A tidak bisa dipakai dokumen B (`sourceId` beda) DAN
  token `intent: EDIT` tidak bisa dipakai untuk VOID (`intent` beda), lewat
  `matchesApprovedPayload()`/`consumeApproval()` yang sudah ada (Hari 9) — tidak ada kode baru
  di jalur pencocokan itu sendiri.
- [x] BE: **edit bersyarat** (`PATCH /purchase-invoices/:id`) — scope **sengaja sempit**
  (dikonfirmasi user sebelum dikerjakan): hanya `supplierInvoiceNo`/`supplierInvoiceDate`/
  `termDays`→`dueDate`. Baris/qty/harga/diskon TETAP tidak bisa diedit — koreksi lewat VOID +
  faktur `B1` baru. Alasan: mengizinkan edit baris berarti me-reverse+repost jurnal & lot yang
  sudah ada, yang bertabrakan dengan asumsi `VoidEngineService` (satu `journal_entries`
  original per `sourceType+sourceId` — dua original akan membuat VOID sungguhan di kemudian
  hari salah mengenali dokumen mana yang "asli"). Digerbangi print-lock (butuh alasan +
  approval kalau sudah dicetak) DAN `StockRecorderService.assertLotsUnconsumed()` (fungsi
  bersama baru, dipakai juga oleh VOID hook) — lot yang sudah bergerak (terjual/dipindah)
  memblokir edit dengan pesan Indonesia, bukan pesan teknis.
- [x] BE: **VOID Purchase Invoice** (`POST /purchase-invoices/:id/void`) lewat
  `VoidEngineService` (Hari 11) + `PurchaseInvoiceVoidHook` baru (`OnModuleInit` self-register
  — pola pertama di codebase ini, GD Hari 13 sengaja belum implementasi VOID). Digerbangi
  print-lock juga. **Scope disengaja tidak termasuk** rule umum §2.13 ("VOID Operator wajib
  step-up") — `ActionType.VOID_DOCUMENT` tetap menunggu Hari 21 sesuai catatan yang sudah ada
  di `payload-matchers.ts` sejak Hari 9; VOID hari ini HANYA digerbangi `UNLOCK_PRINT` kalau
  dokumen sudah dicetak, sesuai literal task Hari 15.
- [ ] FE: detail Purchase Invoice + tombol Cetak / Batal Cetak / Edit / VOID — **belum
  dikerjakan**, di luar lingkup prompt BE hari ini (menyusul)
- **DoD:** cetak ulang identik jalan tanpa izin (`print_count++`, `audit_logs` lewat
  `@Audit('PRINT', ...)` — interceptor global, bukan panggilan manual) ✅; edit setelah
  dicetak tanpa batal cetak → 412 ✅; token ber-`intent: EDIT` dipakai untuk VOID → tetap 412
  (payload mismatch, approval TIDAK terkonsumsi — masih `APPROVED`, bisa dipakai ulang untuk
  intent yang benar) ✅; token dokumen A dipakai dokumen B → 412 mismatch ✅; dokumen `VOIDED`
  boleh dicetak ulang (`postingStatus` dikembalikan ke pemanggil untuk watermark VOID di FE) ✅;
  edit/VOID setelah lot terkonsumsi → `BadRequestException` pesan Indonesia (bukan pesan
  reverseIn yang teknis) ✅ — semua dibuktikan **20 test integrasi baru** terhadap Postgres asli
  (8 di `print-lock.service.spec.ts` generik tanpa modul apa pun, 12 tambahan di
  `purchase-invoices.service.spec.ts`) DAN **manual curl end-to-end** terhadap server sungguhan:
  faktur `B1/RM01-26080112` dicetak 2x bebas (`printCount` 1→2) → PATCH tanpa header → 412 →
  approve via SUPERVISOR → retry dengan header → 200 (`printStatus=PRINT_CANCELLED`,
  `revisionNumber=1`, `supplierInvoiceNo` berubah) → faktur `B1/RM01-26080113` (belum dicetak)
  → `POST .../void` langsung 200 tanpa 412 sama sekali. `./scripts/verify.sh` **10/10 lulus**
  (`npm run test` 115/115, 21 suite — naik dari 95, migration `1785080602942` up→down→up sukses,
  `/health` 200, build+lint BE&FE 0 error). Data uji manual dihapus lagi dari DB dev setelah
  verifikasi (skrip sekali-jalan, konsisten pola sesi-sesi sebelumnya yang membersihkan diri).

**Hari 16** ♻️🛑 — Rencana: 7 Agu · Aktual: `7 Agu 2026`  *(v2: Hari 13)*
- [x] BE: `purchase_returns`(+lines) + nomor `RB` — **selalu dari gudang `BAD_STOCK`** —
  **ditemukan sudah lengkap & lolos test di awal sesi ini** (dibuat sesi sebelumnya, uncommitted,
  belum tercatat di sini): service/controller/entities/DTO/migration `1785080602944`, wired
  di `app.module.ts`. Sama seperti Hari 13 GD, **VOID/Edit sengaja belum dibangun**
- [x] BE: alur pilih **supplier dulu** → daftar BS **disaring ke produk yang pernah dibeli
  dari supplier itu** (tidak menunjuk faktur pembelian asal) — `findBadStockLots()`
- [x] BE: nilai retur **dinegosiasikan**; Persediaan selalu dikredit sebesar harga pokok lot
  (FIFO dari BS); selisih ke akun **`Selisih Retur Pembelian`** (dua arah, dibuktikan test
  otomatis kedua arah + jurnal tetap balance)
- [x] BE: `settlement_type` (`REDUCE_INVOICE` / `CASH`)
- [x] BE (susulan hari ini): `findBadStockLots()` ditambah **`fifoNextUnitCost`** (unit_cost
  lot TERTUA per produk, bukan rata-rata) — dibutuhkan FE untuk menampilkan harga pokok
  referensi di sebelah nilai retur (§3 CLAUDE.md "SATU-SATUNYA tempat harga pokok boleh
  dilihat operator"). Diputuskan lewat AskUserQuestion ke user sebelum dikerjakan.
- [x] BE (susulan hari ini): `GET /chart-of-accounts/cash-accounts` baru (method-level
  `@Roles(MASTER,SUPERVISOR,OPERATOR)` menimpa class-level `@Roles(MASTER,SUPERVISOR)`) —
  OPERATOR butuh ini untuk memilih akun kas saat `settlementType=CASH`; endpoint COA lain
  tetap MASTER+SUPERVISOR saja. Diputuskan lewat AskUserQuestion ke user sebelum dikerjakan.
- [x] FE: halaman Retur Pembelian (`frontend/app/pages/pembelian/retur/`) — `create.vue`
  (supplier → daftar BS **kosong sampai supplier dipilih**, watch bukan filter client-side →
  checkbox per baris me-reveal input qty/nilai retur → selisih live per baris berlabel
  "(Estimasi)" → satuan retur & cara penyelesaian header-level → submit), `index.vue`
  (`<DataTable>`), `[id]/index.vue` (detail + `<DocumentActions>` — hanya `@print` diwire;
  `@edit`/`@void` menampilkan alert "belum didukung" alih-alih dead click senyap, karena
  `postingStatus` selalu `POSTED` jadi tombol Edit/VOID generiknya tetap muncul meski tidak
  ada endpoint di baliknya), `[id]/cetak.vue` (A5×2, **beda dari nota Mutasi Gudang**: pakai
  rupiah + 3 baris tanda tangan Dibuat/Diterima/Diketahui + pagination "Hal. X/Y" >14 baris,
  CLAUDE.md §6)
- [x] FE: `usePurchaseReturnLookups.ts`, `utils/purchaseReturnCalc.ts` (port murni kalkulasi,
  pola sama `purchaseInvoiceCalc.ts`), `navigation.ts` (+item, `roles: ['MASTER','OPERATOR']`
  eksplisit)
- 🛑 **PR #2 tetap terbuka, tidak disentuh:** lot dari retur pelanggan punya `supplier_id`
  NULL — kode yang ditemukan sudah fail-closed (filter `supplier_id = :supplierId`, NULL
  tidak pernah match) dengan komentar TODO eksplisit menunggu jawaban klien. Tidak ditebak.
- **DoD:** retur senilai di atas harga pokok → `Selisih Retur Pembelian` **kredit**; di bawah
  harga pokok → **debit**, dan keduanya tetap balance; stok BS berkurang dari lot yang benar ✅
  (`purchase-returns.service.spec.ts`, 12/12 test — 1 baru: `fifoNextUnitCost` = lot tertua,
  bukan rata-rata, walau ada lot lain lebih murah/mahal); daftar BS kosong sampai supplier
  dipilih ✅ (diverifikasi manual: tidak ada request `GET /purchase-returns/bad-stock` sebelum
  supplier dipilih); selisih live per baris ✅. **Manual end-to-end di browser sungguhan**
  (login MASTER): faktur pembelian uji → mutasi STORE→BAD_STOCK → retur `RB/RM01-26080044`
  10 pcs @ Rp7.000 vs harga pokok Rp8.047,5 → selisih **-Rp10.475** tampil merah live di form
  DAN di hasil submit DAN di halaman detail, jurnal `Hutang Usaha(D) 70.000 + Selisih Retur
  Pembelian(D) 10.475 = Persediaan(K) 80.475` balance (dicek langsung ke DB); cetak nota A5×2
  dengan tanda tangan & footer audit tampil benar; Cetak di halaman detail mengubah status ke
  "Sudah Dicetak" dan `<DocumentActions>` otomatis berpindah ke tombol "Batal Cetak" (perilaku
  generik komponen, tidak disentuh); Edit/VOID di halaman detail menampilkan alert "belum
  didukung", tidak dead click. SUPERVISOR: nav tidak menampilkan Retur Pembelian, navigasi
  langsung ke `/pembelian/retur/create` diblok middleware, `POST /purchase-returns` 403 ✅.
  OPERATOR: `GET /chart-of-accounts/cash-accounts` 200, `GET /chart-of-accounts` tetap 403 ✅.
  `./scripts/verify.sh`-setara dijalankan manual: `npm run build`+`lint` BE&FE 0 error, `npm
  run test` BE 128/128 (23 suite). Data uji (faktur, mutasi, retur, lot, movement, saldo BS)
  dihapus lagi dari DB dev setelah verifikasi — saldo STORE produk uji kembali ke 70 (baseline
  semula), tidak ada baris `purchase_returns` tersisa.

**Hari 16A** 🆕🎨 — Rencana: 10 Agu · Aktual: `10 Agu 2026` — **HARI SISIPAN, FRONTEND SAJA**
- Pemicu: klien menyerahkan **25 screenshot sistem lama** (Affari Retail System v7.57.27)
  pada 10 Agu 2026 — setelah Hari 1–16 selesai. Seluruh bentuk layar yang sudah dibangun
  adalah **tebakan** yang dibuat sebelum referensi itu ada.
- Sudah dikerjakan 10 Agu (dokumen, belum kode):
  - [x] `docs/PANDUAN_UI.md` — panduan bentuk layar & nota, 16 seksi, diturunkan dari
        25 screenshot. Dirujuk wajib dari `CLAUDE.md` §6 dan `PROMPTS_HARIAN.md` §A.
  - [x] `docs/referensi/` — 25 screenshot **versi 1600px** (8,9 MB, teks terbaca penuh
        sampai hint & angka grid). Foto asli 4624×3472 (200 MB) dipindah ke
        `docs/referensi-asli/` dan di-`.gitignore` — terlalu berat untuk git.
- [x] Bagian A: komponen dasar `PANDUAN_UI` §8 (`<DocumentModal>`, `<LineModal>`,
      `<LookupField>`, `<LookupModal>`, `<TotalsBar>`, `<InfoStrip>`, `<HotkeyHint>`,
      `useDocumentHotkeys()`) — semuanya ada di `frontend/app/components/` &
      `composables/`, sesuai props §8.1–§8.6
- [x] Bagian B: `<DataTable>` +prop §8.7 (`dense`/`zebra`/`selectable`/`toolbar`/
      `footerTotals`/`emptyText`), `<CrudFormPage>` mode `modal`, `useRupiah({ bare })`,
      `navigation.ts` dikelompokkan ulang (`MASTER DATA`/`TRANSAKSI`/`AKUNTANSI`/
      `PENGECEKAN`/`LAPORAN`/`PENGATURAN`), status bar
- [x] Bagian C: **7 modul master data** (Produk/Merek/Satuan/Pelanggan/Supplier/
      Salesman/Gudang) — semuanya lewat `<MasterDataCrudPage>` generik baru, bukan
      copy-paste; rute lama `/master-data/*/create` tetap hidup sebagai pembungkus tipis
- **Keputusan klien 10 Agu:** master data **ikut** disesuaikan, tidak di-*grandfather*.
  Sistem lama memakai modal juga untuk master data, jadi mempertahankan halaman ber-rute
  di sana berarti operator menghadapi dua pola untuk pekerjaan yang sama.
- ⚠️ **Biaya jadwal: +1 hari pada margin yang sudah nol** (`CLAUDE.md` §1, §9.7).
  Hari 17 & 18 bergeser ke 11–12 Agu, Fase 5 mulai 13 Agu. Alasan tetap dikerjakan
  sekarang: Hari 17/18/19 semuanya membangun layar baru — tanpa komponen dasar, ketiganya
  menulis pola lama lalu dibongkar lagi. Satu hari sekarang atau tiga hari nanti.
- ➡️ 3 modul transaksi yang sudah ada dipindahkan ke **Hari 16B** (keputusan klien 10 Agu,
  menyusul beberapa jam setelah keputusan master data).
- **DoD:** keempat pengaman §1.1 (`:dismissible="false"`, Esc bertingkat, `beforeunload`,
  draf `sessionStorage`) dipasang **di dalam** `<DocumentModal>` sendiri (bukan per
  halaman) ✅ — dibuktikan ulang tidak langsung tapi transitif lewat Hari 16B: ketiga
  modul transaksi memakai `<DocumentModal>`/`<LineModal>` yang sama dan pengamannya
  terbukti hidup saat diuji manual sungguhan (lihat Hari 16B — percobaan navigasi keluar
  saat form dirty memicu prompt `beforeunload` asli browser). Modal terbuka tanpa
  mengubah URL, rute lama tetap hidup, permission tidak berubah, tidak ada perubahan di
  `backend/` ✅. **Catatan kejujuran:** Bagian A–C dikerjakan di sesi sebelum sesi
  Hari 16B ini — dicatat `[x]` di sini berdasarkan verifikasi keberadaan &
  kesesuaian struktur (bukan saya yang membangunnya), diperkuat karena Hari 16B
  berhasil memakai `<DocumentModal>`, `<LineModal>`, `<TotalsBar>`, `<InfoStrip>`,
  `<StockBadge>`, `useDocumentHotkeys()`, dan prop baru `<DataTable>` secara langsung
  di browser sungguhan tanpa masalah. `<LookupField>`/`<LookupModal>` **belum**
  pernah dipakai modul mana pun sampai hari ini (baik master data maupun Hari 16B) —
  ada dan sesuai spek, tapi masih menunggu pemakai pertamanya di Hari 17+.

**Hari 16B** 🆕🎨 — Rencana: 11 Agu · Aktual: `10 Agu 2026` — **HARI SISIPAN, FRONTEND SAJA**
- Lanjutan 16A: menyesuaikan **3 modul transaksi** yang dibangun Hari 13–16, sebelum
  referensi sistem lama ada. **10 berkas + `DocumentActions.vue`, ±4.030 baris.**
- [x] 3 halaman daftar → toolbar `PANDUAN_UI` §5.1 (`Entri` paling kiri, tanpa `Hapus`),
      grid §5.2, kolom `P` sebagai checkbox. **Pengecekan hanya di Faktur Pembelian**
      (satu-satunya dengan `reviewStatus` — dikonfirmasi langsung dari kode backend:
      Mutasi Gudang & Retur Pembelian tidak punya kolom itu sama sekali)
  - [ ]/[x] lihat catatan "Toolbar diperkecil" di bawah — tidak semua tombol §5.1 berlaku
- [x] 3 halaman entri → dua lapis modal §6/§7 (`index.vue` diserap jadi "pintar",
      `create.vue` jadi pembungkus tipis 12–14 baris yang me-render komponen sama
      dengan `initial-open="entri"` — pola baru, tanpa berkas tambahan)
- [x] **7 `<table>` manual dihapus, bukan 5** — hitungan asli prompt cuma menghitung
      ketiga `create.vue`; grep langsung menemukan 2 lagi di `gudang/mutasi/index.vue`
      (slideover detail) dan di kedua `[id]/index.vue` (grid baris detail). Semua
      diganti `<DataTable>` mode lokal. 2 `<table>` di kedua `cetak.vue` **sengaja
      dipertahankan** (nota cetak A5, bukan grid aplikasi)
- [x] `gudang/mutasi/[id]/cetak.vue` → bentuk §13.2 (koreksi yang ditunda dari 16A) —
      dicocokkan visual ke `docs/referensi/mutasi-gudang/Mutasi Gudang - Nota.jpg`
- [x] `pembelian/retur/[id]/cetak.vue` → selaras §13.1/§13.3 (footer "CETAK : user -
      timestamp", pemisah ribuan titik, 3 tanda tangan dipertahankan)
- [x] `DocumentActions.vue` → label saja (`Edit`→`Ubah`, `Batal`→`Keluar`); logika utuh —
      dibuktikan lewat `diff`, bukan diklaim: hanya 2 baris berubah, keduanya teks
- **Utang yang ikut lunas:** ketiga `create.vue` memuat total **5 `<table>` manual** —
  melanggar `CLAUDE.md` §6 ("dilarang menulis `<table>` manual") sejak Hari 13. Bukan
  temuan baru hari ini, tapi baru sekarang ada penggantinya. **(Realisasi: total 7, lihat
  di atas — 2 tambahan yang tidak disebut prompt awal ikut diperbaiki juga.)**
- ⚠️ **Toolbar diperkecil untuk 2 dari 3 modul — temuan dari baca kode backend langsung,
  bukan tebakan.** `warehouse-mutations.controller.ts` **tidak punya** endpoint print/
  edit/void/unlock-print sama sekali (cuma `findAll`/`findOne`/`create`), jadi toolbar
  Mutasi Gudang final: `Entri · Refresh │ Cetak │ Cari · View Detail` — **tanpa** Batal
  Cetak/Pengecekan (backend-nya tidak ada, bukan disembunyikan sembarangan).
  `purchase-returns.controller.ts` punya `print` tapi tidak `edit`/`void`, dan tidak
  punya `reviewStatus` — toolbar Retur Pembelian: `Entri · Refresh │ Cetak · Batal
  Cetak │ Cari · View Detail` — **tanpa** Pengecekan. Keputusan dikonfirmasi user
  sebelum dikerjakan (ikuti §5.1 sendiri: "tombol tak berlaku dihilangkan").
- ⚠️ **8 perilaku halus yang wajib selamat** dan rusaknya tidak memunculkan error apa pun —
  didaftar sebagai N1–N8 di prompt: gerbang supplier retur (bukan filter client-side),
  `fifoNextUnitCost` = lot tertua bukan rata-rata, label "(Estimasi)", step-up BS→STORE,
  Harga Pokok mutasi read-only, nota mutasi nihil rupiah, aturan tombol `DocumentActions`,
  dan tiga util kalkulasi yang tidak boleh disentuh. **Semua 8 dibuktikan lewat
  browser sungguhan + query DB langsung**, bukan cuma grep — lihat DoD di bawah.
- ⚠️ **Biaya jadwal kumulatif 16A+16B: +2 hari, dimakan dari MARGIN bukan buffer.**
  Margin **+2,65 → +0,65 hari**; buffer tetap 3 hari (Hari 34 + cadangan 27–28 Agu).
  Hari 17 & 18 → 12–13 Agu, Fase 5 mulai 14 Agu. Cut-over 1 Sep tidak bergerak, tapi
  keterlambatan **≥ 0,7 hari** berikutnya sudah tidak punya tempat lagi — laporkan hari itu
  juga (`CLAUDE.md` §9.7).
- **DoD:** nol `<table>` manual di 8 berkas app (2 di `cetak.vue` dipertahankan, dicatat
  sebagai pengecualian bukan kelolosan) ✅. **N1–N8 dibuktikan satu per satu**, bukan
  diklaim — ringkasan:
  - **N1** (gerbang supplier): 0 request ke `/purchase-returns/bad-stock` sebelum
    supplier dipilih, tepat 1 request sesudahnya — diuji Network tab sungguhan ✅
  - **N2** (`fifoNextUnitCost` = lot tertua): dibuat **2 faktur pembelian nyata**
    produk sama, harga beda (Rp1.000 vs Rp2.000/pcs), dipindah ke Bad Stock lewat
    Mutasi Gudang — Retur Pembelian menampilkan Rp1.150 (lot **tertua** yang sudah ada
    duluan, bukan rata-rata dari 2 lot baru), dan angka itu identik dengan yang
    diposting ke jurnal backend ✅
  - **N3** (label "(Estimasi)"): menempel pada nilai per baris & footer, live ✅
  - **N4** (step-up BS→STORE): `POST /warehouse-mutations` menghasilkan **status 412
    sungguhan** (Network tab), `<StepUpDialog>` muncul dengan countdown & context
    summary benar; arah sebaliknya (STORE→BS) tanpa dialog sama sekali ✅
  - **N5** (Harga Pokok mutasi read-only): field itu **tidak ada sama sekali** di form
    baris (lebih ketat dari read-only) — muncul sebagai teks setelah tersimpan ✅
  - **N6** (nota mutasi nihil rupiah): grep + visual, nol angka Rp di seluruh nota,
    bentuk persis §13.2 ✅
  - **N7** (`DocumentActions.vue` label-only): `diff` 2 baris, murni teks ✅
  - **N8** (3 util kalkulasi tak tersentuh): `md5sum -c` — ketiganya `OK` ✅
  - Manual end-to-end tambahan: Faktur Pembelian baru (jurnal balance, PPN masuk
    `unit_cost` sesuai `company_is_pkp=false`), toggle Bonus (Harga @ terkunci 0, diuji
    dengan mencoba mengetik "9999" — tetap 0), Retur Pembelian penuh (jurnal balance,
    nota pemisah ribuan titik + 3 tanda tangan) — semua lewat browser sungguhan ✅
  - `npm run typecheck`/`lint` bersih (10 error tersisa semuanya pra-eksisting di
    `purchaseInvoiceCalc.ts`, N8, tidak disentuh); `npm run build` ✔ **Build complete!**
  - Tidak ada perubahan di `backend/` ✅ (`git status` dicek eksplisit)
  - Data uji (3 faktur, 1 retur, 1 mutasi + lot/movement/jurnal terkait) dibuat lewat
    UI sungguhan lalu **dihapus dari DB dev** lewat transaksi SQL bertarget; saldo
    stok dikembalikan tepat ke angka sebelum pengujian (delta eksak, bukan reset ke 0)
  - **Belum di-commit** — draft pesan commit Hari 10-16 ada di `git_commit_msg.md`
    (root repo), menunggu user commit sendiri
- **Catatan di luar lingkup (ditemukan, tidak dikerjakan):** `UButtonGroup` tidak ada
  di Nuxt UI v4.10.0 (sudah berganti nama jadi `FieldGroup`) — bug pra-eksisting sejak
  Hari 13-15, juga ada di `DocumentActions.vue`. Diperbaiki di 3 berkas baru milik
  sendiri, **sengaja tidak disentuh** di `DocumentActions.vue` supaya bukti N7 tetap
  murni label-only. Endpoint saldo stok live masih belum ada (`StockBadge` sudah
  dirancang menangani ini sejak Hari 10, tampil "-" jujur). Format tanggal di halaman
  detail non-grid/non-nota masih `dd/MM/yyyy` (util `formatDate()` bersama dipakai
  puluhan halaman lain, mengubahnya di luar lingkup 10 berkas).

**Hari 17** 🛑 — Rencana: 8 Agu → **12 Agu** (tergeser Hari 16A+16B) · Aktual: `13 Agu 2026` (BE + FE selesai)  *(v2: Hari 14)*
- [x] BE: `operational_expenses` (header `operational_expense_documents` + baris
  `operational_expense_lines`, migration `1785080602946`) + CRUD + journal + VOID (per baris,
  lewat `VoidEngineService`)
- [x] BE: **approval pengeluaran kas besar** — `chart_of_accounts.requires_outflow_approval`
  (migration `1785080602945`) + `settings.cash_outflow_approval_threshold` (sudah ada sejak
  Hari 7, pemakai produksi pertama hari ini), lewat `StepUpService.requireApproval()`
  (`ActionType.CASH_OUTFLOW`, sudah terdaftar sejak Hari 9)
- [x] BE (susulan FE): `GET /operational-expenses/expense-accounts` — endpoint baca-saja baru,
  dibutuhkan karena `GET /chart-of-accounts` penuh MASTER+SUPERVISOR saja (`CLAUDE.md` §5) dan
  OPERATOR (yang menulis modul ini) tidak punya jalan lain membaca akun `EXPENSE` untuk dropdown
  Entri. Pola identik `ChartOfAccountsController.findCashAccounts()` yang sudah ada sejak Hari 5
  — irisan sempit COA, bukan pelonggaran guard COA umum.
- [x] FE: halaman Biaya Operasional (`frontend/app/pages/kas-bank/biaya-operasional/index.vue`)
  + nav baru "KAS & BANK" (`navigation.ts`, baru berisi 1 item — Penerimaan/Pengeluaran Kas
  generik menyusul modul Payment Hari 26-27). **Satu form datar** (`<LineModal>` langsung,
  BUKAN `<DocumentModal>`+`<LineModal>` seperti Mutasi/Pembelian) karena backend
  `createLine()` sudah menggabungkan "header hari ini + satu baris" dalam SATU panggilan
  POST — cocok dengan instruksi prompt harian "bentuk paling sederhana". Field: Tanggal,
  Akun Kas Sumber, Akun Biaya, Nominal, Keterangan, No. Referensi/Kwitansi. **Tidak ada field
  lampiran file** — `docs/PERTANYAAN_KLIEN_BIAYA_OPERASIONAL.md` §11 mencatat jawaban klien
  eksplisit "tanpa lampiran file", backend memang tidak punya kolom untuk itu; diganti field
  `referenceNumber` yang backend punya. Detail (slideover) menampilkan baris + VOID per baris
  lewat modal alasan (kode+catatan wajib, tanpa step-up — sesuai catatan kode
  `operational-expenses.controller.ts`, step-up VOID generik menyusul Hari 21).
- 🛑 **Berhenti & tanya — terjawab lewat AskUserQuestion sebelum dikerjakan** (ditemukan
  `docs/PERTANYAAN_KLIEN_BIAYA_OPERASIONAL.md` sudah terisi jawaban klien nyata, mengoreksi
  premis prompt awal — lihat §3 hari ini untuk 4 keputusan): skema **header+baris** (bukan
  satu-transaksi-satu-biaya), gaji harian untuk **tukang angkut** (bukan salesman — salesman
  bulanan, MASTER saja), **piutang karyawan** di luar lingkup (item baru §1), backdate **7
  hari KHUSUS modul ini** (bukan global)
- **DoD:** pengeluaran di atas ambang dari akun bertanda → 412 dengan `context_summary`
  memuat nama akun+nominal ✅; approve + retry → sukses, jurnal balance ✅; pengeluaran di
  atas ambang dari akun TIDAK bertanda → sukses langsung (kontrol tidur) ✅; VOID menghasilkan
  jurnal pembalik bertanggal **hari ini** (bukan `expenseDate` asli), baris asli tetap ada,
  hanya baris yang di-VOID yang berubah status ✅; ongkir pembelian tercatat lewat
  `POST /operational-expenses` biasa **tanpa** menyentuh `unit_cost`/lot mana pun (dikonfirmasi
  tidak ada field freight di `purchase-invoices` sama sekali) ✅. Semua dibuktikan lewat 10
  integration test baru `operational-expenses.service.spec.ts` terhadap Postgres asli +
  1 test regresi (override backdate 7 hari tidak bocor ke modul lain). `npm run build`/`lint`
  BE 0 error, `npm run test` **138/138 lolos, 25 suite**, migration `1785080602945-947`
  `up→down→up` sukses, `./scripts/verify.sh` **10/10 lulus**.
- **DoD FE (manual, browser sungguhan, login Operator):** dua akun kas sementara dibuat lewat
  SQL langsung untuk uji (`is_cash_account`, satu ditandai `requires_outflow_approval`), dihapus
  lagi setelah verifikasi — pola sama data uji Hari 4/5/8. Pengeluaran dari akun bertanda
  (Kas Besar, Rp 150.000) → `<StepUpDialog>` muncul, `context_summary` **"Pengeluaran Kas Besar
  Rp 150.000 — Angkut/Bongkar Muat (Mang Icung - angkut barang gudang)"** ✅ (nama akun+nominal
  ada, angka ambang **tidak** ada di mana pun pada layar) ✅; approve via akun Supervisor (lewat
  API langsung, token terpisah) → modal lanjut otomatis <10 detik, banner sukses
  `KK/RM01-26080076 tersimpan` ✅, nomor dokumen format benar; grid daftar sesuai
  `PANDUAN_UI.md` §5 (angka rata kanan tanpa `Rp`, tanggal `dd-MM-yyyy`) ✅. View Detail →
  slideover baris + badge status; VOID baris tanpa alasan → ditolak "Kode alasan dan catatan
  alasan wajib diisi" ✅ (error path); VOID dengan alasan → status baris jadi **Dibatalkan**,
  total dokumen jadi Rp 0 (SUM hanya baris `POSTED`) ✅, dibuktikan jurnal pembalik
  `VOID_REVERSAL` bertanggal hari ini dengan debit/kredit terbalik dan balance lewat query SQL
  langsung ✅. `pnpm run build`/`lint`/`typecheck` FE bersih (kecuali error TS pre-existing di
  `purchaseInvoiceCalc.ts`, file lain yang belum disentuh hari ini — dicatat, bukan diperbaiki
  di luar lingkup).
- **Gap diketahui, dicatat bukan disembunyikan**: `chart_of_accounts.requires_outflow_approval`
  belum punya endpoint tulis (`PATCH /chart-of-accounts/:id` baru Hari 18) — hanya bisa
  dicentang lewat SQL langsung sampai besok, sama seperti gap `suppliers.isPkp` Hari 14. 11
  akun `EXPENSE` seri `52xx` di-seed sebagai placeholder (daftar akun 08.xxx Affari asli
  belum didapat, §2 dokumen klien tidak terjawab berarti).

**Hari 17A** 🆕🔒 — Rencana: 13 Agu · Aktual: `13 Agu 2026` (BE + FE selesai) — **HARI SISIPAN, Restrukturisasi Bagan Akun**
- Pemicu: `docs/COA_USULAN.md` + `docs/COA_Usulan_OmegaSinarTerang.xlsx` (114 baris, direkonsiliasi
  ke laporan Juli klien — 18 titik cocok) diserahkan sore Hari 17. Wajib mendarat sebelum
  Hari 18 (CRUD COA) supaya MASTER tidak mengedit di atas fondasi 11-akun lama.
- [x] BE: migration `1785080602948` — 5 kolom baru (`normal_balance`, `account_subtype`,
  `is_postable`, `is_opening_balance_equity_account`; `requires_outflow_approval` sudah ada
  sejak Hari 17). 13 akun lama **di-UPDATE** (id bertahan) ke kode `GG.KKK.JJJJJ` baru + 95
  baris baru (7 Grup + 19 Kategori + 69 Jenis) → **108 akun Versi A**, 26 header
  (`is_postable=false`), 82 dapat dijurnal. Kas Kecil/Toko/Besar + 4 bank **di-seed**
  (menyimpang dari CLAUDE.md §3 lama — diperbarui di commit yang sama), Kas Besar + seluruh
  bank → `requires_outflow_approval`.
- [x] BE: **bug ditemukan+diperbaiki saat implementasi** — 11 akun placeholder `52xx`
  (seed pagi Hari 17, sebelum bagan final ada) jadi yatim (`parent_id NULL`) di luar pohon
  baru; dicek dulu 0 baris `journal_entry_lines` memakainya, aman DIHAPUS di migration yang
  sama (`down()` mengembalikannya). **Bug kedua, lebih halus**: 13 akun lama sendiri juga
  sempat jadi yatim — `UPDATE` awal menulis `code`/`name`/atribut sebelum baris Kategori-nya
  lahir, jadi `parent_id`-nya tidak pernah diisi. Ketahuan lewat verifikasi manual di browser
  (pohon FE patah tepat di titik itu), bukan lewat test otomatis — ditambah langkah `UPDATE
  parent_id` terpisah setelah `INSERT` Kategori, dan `down()` melepas `parent_id` itu dulu
  sebelum menghapus baris Kategori/Grup (FK `parent_id` tanpa `ON DELETE CASCADE`).
- [x] BE: Versi B (5 akun `06.130.*` Beban Pribadi Pemilik) ditulis di
  `src/database/migrations-versi-b-pending/` — **di luar** glob `migrations/*.ts` di
  `data-source.ts`, sengaja tidak auto-run sampai klien memilih Versi A/B.
- [x] BE: bug `opening-balance.service.ts` §7.2 diperbaiki — plug jurnal pembuka diresolve
  lewat `is_opening_balance_equity_account = true`, bukan `account_type = 'EQUITY'` (bagan
  baru punya 5 akun EQUITY aktif, resolver lama akan melempar error Hari 36).
- [x] BE: `JournalPosterService` validasi **keenam** — tolak baris ke akun `is_postable=false`.
- [x] FE: halaman `/akuntansi/bagan-akun` — kolom **Kelompok Laporan** (bahasa manusia, peta
  `ACCOUNT_SUBTYPE_LABEL`) dan **Saldo Normal** (`Debet`/`Kredit`) ditambahkan ke
  `useChartOfAccountsTree.ts` + `ChartOfAccountsTreeNode.vue` — **tidak fork komponen**,
  murni tambah field/kolom sesuai instruksi prompt. Baris header (Grup/Kategori) dibedakan
  visual (bold + tint + ikon gembok) dan diekspor `isSelectableAccount()` untuk dipakai ulang
  picker akun CRUD COA Hari 18.
- **DoD BE:** migration `up→down→up` bersih ✅; `chart_of_accounts` = 108, `is_postable=false`
  = 26 ✅; 5 flag resolver tunggal masing-masing tepat 1 baris ✅; 0 pelanggar arah saldo
  (query manual §7.1) ✅; `settings.default_ar_account_id` tetap menunjuk baris yang benar
  (kini berkode `01.120.00001`) ✅ — semua dibuktikan lewat query manual terhadap Postgres
  sungguhan (bukan cuma test). `npm run build`/`lint` BE 0 error, `npm run test` **139/139
  lolos, 24 suite** (termasuk 1 test baru: jurnal ke akun header → 400 "Akun header tidak
  bisa dijurnal").
- **DoD FE (manual, browser sungguhan, login MASTER):** pohon 3 tingkat benar (depth 0/1/2 =
  7/19/82 baris, dicek lewat query terhadap `GET /chart-of-accounts` asli) ✅; baris header
  tebal + ikon gembok, baris Jenis polos ✅; kolom Kelompok Laporan & Saldo Normal 100% bahasa
  manusia, tidak ada nama enum bocor (dicek visual tiap grup) ✅; akun kontra (`Retur
  Penjualan`) tampil `Kontra Pendapatan` / `Debet` — arah terbalik dari induknya `Pendapatan
  Penjualan` (`Kredit`) — benar ✅; `Selisih Retur Pembelian` pindah ke `Pendapatan Lain-lain`
  ✅; pencarian + auto-expand leluhur tetap jalan ✅. `pnpm run build`/`lint` FE 0 error (error
  TS pre-existing `purchaseInvoiceCalc.ts` tidak disentuh, sama seperti dicatat Hari 17).
- **Belum dikerjakan (sesuai instruksi prompt — bukan celah):** form tambah/ubah akun COA
  (Hari 18); validasi arah saldo di CRUD COA (Hari 18, aturannya sudah didokumentasikan
  `COA_USULAN.md` §7.1).
- **CLAUDE.md diperbarui commit yang sama:** §2.6 (validasi jurnal jadi 6) · §3 "Akun (COA)"
  (kas/bank sekarang di-seed, bukan lagi "tidak di-seed").
- ⚠️ **Belum di-commit** — menunggu instruksi commit dari user, sama seperti Hari 10–17
  (lihat catatan working-tree di §3 hari ini).

**Hari 18** — Rencana: 9 Agu → **13 Agu** (tergeser Hari 16A+16B) · Aktual: `18 Agu 2026` — **BUFFER TERPAKAI, BE saja**  *(v2: Hari 15)*

> ⚠️ **Drift kalender belum dicatat** (CLAUDE.md §9.7): Hari 17A selesai 13 Agustus, tapi
> Hari 18 baru dikerjakan 18 Agustus — 5 hari kalender tanpa entri di antaranya di file ini.
> §0 Papan Status di atas juga belum diperbarui sejak 10 Agustus (masih tertulis "Hari 17").
> Dicatat di sini supaya tidak diam-diam terserap — user perlu merekonsiliasi §0 dan
> menjelaskan apa yang terjadi di jeda itu (bukan diasumsikan Claude Code).

- [x] BE: CRUD COA penuh untuk MASTER (`POST`/`PATCH /chart-of-accounts/:id`, `is_cash_account`,
  `requires_outflow_approval` — gap Hari 17 tertutup, akun piutang custom untuk
  `customers.ar_account_id`)
- [x] FE (susulan, sesi terpisah — lihat §3 & §4): form tambah/ubah akun COA + dropdown
  `ar_account_id` tersaring hanya akun piutang aktif
- [x] Limpahan sisa pekerjaan Fase 4 — dicek eksplisit, tidak ada sisa **BE**. Dua gap **FE**
  tetap terbuka untuk sesi FE: `useSupplierSchema.ts` belum punya field `isPkp` (Hari 14),
  detail Purchase Invoice (tombol Cetak/Batal Cetak/Edit/VOID, Hari 15)
- [x] BE (susulan, tidak diminta eksplisit tapi disyaratkan langsung oleh tugas Hari 18):
  `ChartOfAccount` entity kehilangan 2 kolom yang sudah ada di DB sejak Hari 14/16
  (`is_input_vat_account`, `is_purchase_return_diff_account`) — dibaca modul lain lewat raw
  SQL, tidak pernah dideklarasikan di entity. Ditambahkan supaya CRUD COA benar-benar
  "penuh", bukan CRUD dengan dua flag tersembunyi
- [x] BE: **kunci `ar_account_id`** (CLAUDE.md §3) ternyata membentur masalah data nyata —
  **tidak ada satu pun tabel yang menyimpan saldo per pelanggan** hari ini
  (`sales_invoices`/`payments`/`sales_returns` belum dibangun, Hari 21-27; baris piutang
  Saldo Awal melebur jadi satu baris jurnal per akun, jejak per-pelanggan hilang setelah
  posting). Diputuskan lewat AskUserQuestion ke user sebelum dikerjakan (3 opsi ditawarkan):
  tambah kolom `customer_id` (nullable) ke `journal_entry_lines`, migration
  `1785080602950-AddCustomerIdToJournalEntryLines`. **Invarian baru berdampingan
  `resolveArAccount()`** (Hari 8): setiap baris jurnal yang menyentuh akun piutang seorang
  pelanggan WAJIB mengisinya. Hari ini hanya `OpeningBalanceService` (piutang) yang mengisi,
  dan `VoidEngineService` yang meneruskannya saat reversal (titik paling gampang lupa — lihat
  komentar `reversalLines` di `void.service.ts`). **WAJIB diisi juga oleh Faktur Penjualan
  (Hari 21), Retur Penjualan (Hari 23), alokasi Pembayaran (Hari 26-27)** begitu modul itu
  dibangun — kalau lupa satu tempat, `ArAccountResolverService.getCustomerBalance()` salah
  hitung tanpa error apa pun. `ArAccountResolverService.getCustomerBalance(customerId)`
  (pasangan `resolve()`) menjumlah `debit_amount - credit_amount` dari semua baris ber-tag
  itu, **sengaja tidak difilter per akun** — supaya pemindahan `ar_account_id` di tengah
  jalan tidak membelah histori pelanggan itu jadi dua "akun" berbeda.
- **Gap yang sengaja TIDAK ditutup hari ini** (dicatat, bukan didiamkan): mengubah
  `accountType`/`isPostable` pada akun yang sudah dipakai di `journal_entry_lines` tidak
  divalidasi CRUD COA — bisa mengubah makna histori tanpa error. Di luar lingkup DoD hari
  ini.
- **Audit grep (poin 3 tugas)** — `grep -rn "ArAccountResolverService\|arAccountId\|ar_account_id\|default_ar_account_id" backend/src`
  → 23 file cocok (naik dari 17 sebelum hari ini — semua kenaikan berasal dari file yang
  memang disentuh hari ini: migration baru, 3 test baru/diperluas, `void.service.ts`,
  `post-journal.dto.ts`, `journal-entry-line.entity.ts`, `chart-of-account.entity.ts`,
  `customers.service.ts`). **Kesimpulan**: dari 5 tempat yang disebut CLAUDE.md §3, baru
  **1 dari 5** (Saldo Awal) yang benar-benar ada kodenya — Faktur Penjualan, Retur
  Penjualan, alokasi Pembayaran, dan VOID untuk dokumen ber-piutang lain belum eksis sebagai
  modul. **Bukan kebocoran** — modulnya belum dibangun. Audit ini wajib diulang begitu salah
  satu dari keempat modul itu selesai.
- **DoD BE (semua dibuktikan test otomatis terhadap Postgres asli + manual curl end-to-end
  server sungguhan, bukan cuma diklaim):**
  - Master membuat akun kas baru (`POST /chart-of-accounts`, `isCashAccount: true`) →
    **langsung** muncul di `GET /chart-of-accounts/cash-accounts` ✅ (test otomatis +
    manual curl: akun `01.110.00099` dibuat di bawah header `01.110.00000`, langsung
    ditemukan di daftar cash-accounts)
  - `PATCH /chart-of-accounts/:id` `requiresOutflowApproval: true` → gap Hari 17 (kolom cuma
    bisa diisi lewat SQL langsung) tertutup ✅ (manual curl)
  - `ar_account_id` pelanggan bersaldo (dari Saldo Awal Rp75.000, dibuktikan lewat submit
    `POST /opening-balance` sungguhan) → `PATCH /customers/:id` ganti `arAccountId` → **400**
    pesan `"Akun piutang pelanggan \"...\" tidak bisa diubah — masih ada saldo piutang
    Rp75000.00. Lunasi dulu sebelum memindahkan akun piutang."` ✅ (manual curl end-to-end)
  - `ar_account_id` pelanggan saldo nol → berhasil diubah ✅; field lain (`name`) tetap bisa
    diubah untuk pelanggan bersaldo selama `ar_account_id` tidak disentuh ✅; mengirim
    `arAccountId` yang **sama** dengan nilai sekarang tidak dianggap perubahan (tidak query
    saldo, tidak menghalangi field lain ikut ter-update) ✅ (semua 3× `customers.service.spec.ts`)
  - COA_USULAN §7.1 (kombinasi `account_subtype`×`normal_balance` mustahil) → 400 ✅; §7.2
    (flag singular `is_inventory_account`/`is_payable_account`/`is_input_vat_account`/
    `is_purchase_return_diff_account`/`is_opening_balance_equity_account` harus tepat satu
    akun aktif) → 400 kalau sudah dipegang akun lain ✅ (dibuktikan langsung terhadap akun
    Persediaan real hasil seed Hari 17A, bukan data buatan test) ✅; `parentId` wajib
    menunjuk akun header (`is_postable=false`), akun Jenis ditolak jadi induk ✅; `code`
    duplikat ditolak ✅ — semua di `chart-of-accounts.service.spec.ts` (7 test baru)
  - VOID dokumen ber-`customer_id` → baris pembalik ikut membawa `customer_id` yang sama
    (regresi titik-gampang-lupa di atas) ✅ — `void.service.spec.ts` (1 test baru)
  - SUPERVISOR & OPERATOR `POST /chart-of-accounts` → 403 sebelum menyentuh DB ✅ (manual curl)
  - `npm run build`/`lint` BE 0 error, `npm run test` **151/151 lolos, 25 suite** (naik dari
    139/24), migration `1785080602950` `up→down→up` bersih, `./scripts/verify.sh` **10/10
    lulus** (termasuk build+lint FE — tidak disentuh hari ini, tetap hijau). Data uji manual
    (akun kas, pelanggan, jurnal saldo awal) dihapus lagi dari DB dev setelah verifikasi.
- **FE (susulan, 18 Agu 2026 sore — lanjutan Hari 18):**
  - `frontend/app/composables/useChartOfAccountsSchema.ts` (baru) — form COA penuh, MASTER-only,
    16 field (identitas · klasifikasi · `parentId` disaring header aktif · `isPostable` ·
    8 flag boolean berlabel manusiawi termasuk **`isCashAccount`/`requiresOutflowApproval`**
    eksplisit diminta prompt hari ini — semua reuse enum/label dari `useChartOfAccountsTree.ts`,
    tidak ada re-declare)
  - `frontend/app/pages/akuntansi/bagan-akun/index.vue` + `ChartOfAccountsTreeNode.vue` — tombol
    Entri/Ubah **disembunyikan total untuk non-MASTER** (push-only-if-MASTER, bukan `showIf` —
    pola sama `useCustomerSchema.ts` Hari 8), row-select via klik baris, dua `<CrudFormPage
    modal>` ditulis manual di halaman ini (tree custom dipertahankan, TIDAK dikonversi ke
    `<DataTable>` — hierarki akun hilang kalau dipaksa flat)
  - `useCustomerSchema.ts` — field `arAccountId` (sudah ada sejak Hari 8, filter
    `isActive && isReceivableAccount` sudah benar) ditambah kunci **proaktif**: carrier field
    tersembunyi `arAccountBalance` (pola `isCodeLocked`) + `disabled`/`hint` dinamis
  - `useSupplierSchema.ts` — field `isPkp` ditambah (gap asli Hari 14, backend DTO sudah siap)
  - **BE kecil, di luar kata "FRONTEND" literal tapi disyaratkan DoD hari ini** — dikonfirmasi
    ke user dulu via pertanyaan eksplisit (lihat §3): `CustomersService.findOneWithBalance()`
    baru (dipakai `GET /customers/:id`) — computed **read-only** `arAccountBalance` lewat
    `ArAccountResolverService.getCustomerBalance()` yang sudah ada, tidak menyentuh
    entity/kolom/migration. `customerTransformOut()` membuang field ini sebelum dikirim balik.
  - **Koreksi catatan lama**: "Purchase Invoice detail hilang tombol Cetak/Batal Cetak/Edit/
    VOID" (dicatat berulang sejak Hari 15) ternyata **sudah basi** — `pembelian/faktur/[id]/
    index.vue` sudah lengkap (488 baris, ditemukan lewat riset kode + dibuktikan manual di
    browser: `B1/RM01-26080022` menampilkan tombol Cetak/Batal Cetak dengan status badge benar).
    Kemungkinan selesai di sesi lalu yang tidak tercatat di sini. Bukan pekerjaan hari ini.
  - **DoD dibuktikan manual di browser (MASTER, SUPERVISOR) + curl:**
    dropdown `ar_account_id` cuma berisi akun piutang aktif ✅; pelanggan baru (saldo 0) →
    field aktif, ganti akun berhasil ✅; pelanggan dengan saldo piutang Rp250.000 (dibuat lewat
    `POST /opening-balance` sungguhan) → field **disabled** + hint
    `"Terkunci — masih ada saldo piutang Rp 250.000. Lunasi dulu sebelum memindahkan akun
    piutang."` ✅; form COA: buat akun header→anak dengan `isCashAccount`+
    `requiresOutflowApproval` dicentang → tersimpan & tampil benar di tree ✅; kombinasi
    subtype×normal_balance salah → banner Bahasa Indonesia dari backend tampil apa adanya ✅;
    login SUPERVISOR → halaman Bagan Akun read-only total, **tombol Entri/Ubah tidak ada sama
    sekali di DOM** ✅. `npm run build`/`lint` BE 0 error; `npm run test` BE — suite
    `customers`/`chart-of-accounts` 12/12 hijau; 3 suite lain (`step-up`, `authorization-
    requests`) gagal karena **flakiness pra-ada** (timeout `beforeAll`, `Empty criteria(s)`
    di `afterAll`) — dikonfirmasi tidak tersentuh sesi ini (`git diff` bersih di folder itu
    sebelum sesi mulai), bukan regresi dari perubahan hari ini. `pnpm run build`/`lint` FE
    0 error. Data uji (akun `01.120.00099`, pelanggan `CUST-026`) **dinonaktifkan** (bukan
    dihapus — jurnal `OPENING_BALANCE` belum punya jalur VOID, §Hari 12) lewat toggle Aktif
    di form, konsisten pola "tidak ada hard-delete".

### Fase 5 — Penjualan (Hari 19–23A) · 10–16 Agustus

**Hari 19** ♻️ — Rencana: 10 Agu · Aktual: `18 Agu 2026` (BE + FE selesai, sama hari)  *(v2: Hari 16)*
- [x] BE: `sales_orders`(+lines) + nomor `SO` + CRUD (create/findAll/findOne/update — **tanpa**
  delete, §2.1) — `src/modules/sales-orders/`, migration `1785080602951`
- [x] BE: **saluran penjualan** sebagai field eksplisit (`SalesChannel` di
  `src/common/enums/sales-channel.enum.ts`, dipakai bersama modul faktur nanti) —
  `SalesOrdersService.assertChannelSalesOrderRequirement(channel, salesOrderId, customerId,
  manager)` sudah dibangun & diuji **hari ini**, meski `sales_invoices` belum ada tabelnya
  (baru Hari 20/21) — pola sama `ProductsService.lockCode()` (primitif sebelum pemanggil
  produksinya ada). Hari 21 tinggal memanggil method ini dari transaction-nya sendiri.
- [x] BE: **SO tidak menahan stok** — dibuktikan struktural: `SalesOrdersService` tidak
  meng-inject `StockRecorderService` sama sekali, dan tidak ada satu pun baris
  `stock_movements`/`product_stock_balance` tersentuh oleh SO (test otomatis + manual curl).
  `GET /products/:id/committed-qty` (raw SQL, live, tidak di-cache) menyediakan angka
  informatif qty terikat SO `OPEN`.
- [x] BE: **`convert-to-invoice`** = primitif internal `SalesOrdersService.markConverted(id,
  manager)` (bukan endpoint HTTP publik hari ini — belum ada `sales_invoices` untuk
  dihasilkan; endpoint nyata akan dipanggil dari dalam transaction `POST /sales-invoices`
  Hari 21). `UPDATE ... WHERE status='OPEN'` mencegah dua transaction nyaris bersamaan
  sama-sama berhasil mengonversi SO yang sama.
- [x] BE: SO **dikecualikan** dari kunci cetak generik (tidak terdaftar di
  `PRINT_LOCK_TABLES`, dibuktikan test regresi) dan dari VOID engine (SO tidak posting
  jurnal — `VoidEngineService` mensyaratkan `JournalEntry` yang cocok, jadi VOID generik
  tidak pernah bisa dipakai untuk SO). Tidak ada `CANCELLED`/`void_reason_*` hari ini —
  **celah diketahui, dicatat bukan diselesaikan diam-diam**: SO `OPEN` yang salah input
  belum punya jalur pembatalan resmi. Perlu keputusan klien sebelum SO dipakai operasional,
  bukan blocker Hari 19.
- [x] FE: halaman Sales Order (`frontend/app/pages/penjualan/order/{index,create}.vue` +
  `composables/useSalesOrderLookups.ts`, entri navigasi TRANSAKSI di `navigation.ts`) —
  pola `index.vue` "pintar" (list + `DocumentModal`/`LineModal`) + `create.vue` pembungkus
  tipis, mirror `pembelian/faktur` (product/unit picker, default satuan "dus") dan
  `gudang/mutasi` (detail `USlideover`, bukan route `[id]` — SO nihil print/VOID/`/cetak`).
  **Satu `DocumentModal` dipakai dua mode** (Entri/Ubah, `editingId` sebagai toggle, pola
  `CrudFormPage.vue`) — ditemukan saat riset kode bahwa `UpdateSalesOrderDto` **tidak
  punya field `customerId` sama sekali** (dikunci backend, bukan pilihan FE), jadi field
  Pelanggan di-disable + hint saat mode Ubah, dan `customerId` tidak pernah dikirim di
  payload PATCH.
- [x] FE: **"terikat SO"** — `#context` LineModal menampilkan dua baris terpisah yang
  **tidak pernah dikombinasi/dikurangi**: "SISA STOK" (`<StockBadge :qty-base-unit="null">`,
  sama seperti Faktur Pembelian hari ini — belum ada endpoint stock-balance, tampil "-"
  jujur) dan "TERIKAT SO" (live dari `GET /products/:id/committed-qty`, fetch saat produk
  dipilih/baris dibuka-ubah).
- 🛑→✅ **Keputusan user (AskUserQuestion) sebelum FE dikerjakan** untuk dua benturan yang
  ditemukan riset: (1) item 3 tugas (pilihan saluran PENGIRIMAN/TOKO "di form faktur") —
  **ditunda ke Hari 21**, karena `sales_invoices` belum ada tabelnya jadi tidak ada form
  faktur sungguhan hari ini untuk ditempeli kontrol itu; (2) tombol **"Jadikan Faktur"** —
  **tampil di slideover detail, selalu disabled + tooltip** ("Menyusul Hari 21 — modul
  Faktur Penjualan belum tersedia"), karena tidak ada endpoint convert-to-invoice publik
  hari ini (sengaja, per komentar controller). PANDUAN_UI §7.1 (panel riwayat harga wajib
  di SO) **sengaja dilewati** dengan alasan sama — tidak ada `sales_invoice_lines` untuk
  disumberi sampai Hari 21 — dicatat sebagai celah, bukan kelupaan.
- **DoD:** faktur `PENGIRIMAN` tanpa SO → ditolak ✅ (`assertChannelSalesOrderRequirement`,
  diuji langsung tanpa tabel `sales_invoices` — 7 skenario: not-found, sudah `CONVERTED`,
  milik pelanggan lain, dst); faktur `TOKO` tanpa SO → sukses ✅; SO terbuka **tidak**
  mengurangi stok tersedia di layar mana pun ✅ (0 baris `stock_movements`/
  `product_stock_balance` tersentuh, `committedQty` murni informatif & live — bertambah saat
  SO dibuat, berkurang saat dikonversi, dibuktikan test otomatis); SO yang sudah `CONVERTED`
  tidak bisa diubah ✅ (`update()` ditolak dengan pesan "sudah dikonversi ke faktur
  sebelumnya"); **nomor SO tidak pernah lompat, bahkan saat pembuatan gagal di tengah
  transaction** ✅ — dibuktikan literal: baris kedua gagal disimpan (`jest.spyOn` pada
  `EntityManager.save`) → `document_counters.last_number` tidak berubah, tidak ada baris
  `sales_orders`/`sales_order_lines` tersisa, percobaan berikutnya tetap dapat nomor
  lanjutan tanpa lubang. Semua dibuktikan lewat 18 integration test baru
  (`sales-orders.service.spec.ts`, real Postgres) **dan** manual curl end-to-end server
  sungguhan: `SO/RM01-26080071` diterbitkan (MASTER), OPERATOR juga bisa create (`SO/RM01-
  26080072`), SUPERVISOR POST → **403** sebelum menyentuh DB, `orderDate` 30 hari lalu → 400
  "Tanggal jurnal maksimal mundur 2 hari dari hari ini", `PATCH` notes pada SO `OPEN` →
  sukses, `GET /products/:id/committed-qty` → `390` (3 DUS × 130 pcs) tepat setelah SO
  dibuat. Data uji dihapus lagi dari DB dev setelah verifikasi. `./scripts/verify.sh`
  **10/10 lulus** (169/169 test BE, 26 suite; build+lint BE & FE 0 error; migration
  `1785080602951` up→down→up bersih; tidak ada `@Delete()` baru).
- **DoD FE (dibuktikan manual di browser sungguhan, MASTER, plus curl langsung ke API):**
  Entri SO `C-001-Pak 1` + 1 baris (Bendera Putih Sachet, 5 DUS, @150.000) → tersimpan
  `SO/RM01-26080073`, `TotalsBar` Item:1/Qty:5/Total:750.000 ✅; saat baris diisi, "TERIKAT
  SO" menunjukkan angka live (`0 pcs` sebelum ada SO lain, lalu `650 pcs` saat membuka-ubah
  baris di SO yang baru dibuat sendiri — sesuai qty×konversi, dikonfirmasi murni live query
  bukan angka statis) sementara "SISA STOK" tetap `-` terpisah, tidak pernah tergabung ✅;
  slideover detail menampilkan data persis sama dengan DB (`GET /sales-orders/:id` dicek
  langsung) ✅; klik **Ubah** → field Pelanggan disabled + hint, ubah Catatan, submit →
  `PATCH` sukses, dikonfirmasi `curl` langsung: `notes` berubah, `updatedAt` maju,
  `customerId` **tidak berubah** (tidak pernah dikirim, sesuai `UpdateSalesOrderDto`) ✅;
  tombol **Jadikan Faktur** — dikonfirmasi `button.disabled === true` lewat evaluasi JS
  langsung di halaman, bukan cuma dilihat ✅; error path — Entri tanpa pilih pelanggan →
  banner "Pilih pelanggan." tampil, **tidak ada request terkirim** (validasi client-side
  duluan) ✅. `pnpm run build`/`lint`/`typecheck` FE 0 error (10 error `purchaseInvoiceCalc.ts`
  tersisa semuanya pra-eksisting, N8, tidak disentuh). Data uji (`SO/RM01-26080073` + 1 baris)
  dihapus dari DB dev lewat SQL langsung setelah verifikasi (SO tidak punya VOID/delete resmi
  — celah diketahui sejak BE hari ini, bukan baru).
  **Catatan tooling sesi ini (bukan bug kode):** dua kali tab browser sempat freeze
  sesaat setelah klik tombol tutup modal baris (khas timing CDP saat elemen sedang
  transisi) — pulih total dengan tab baru, data di server tidak pernah korup di kedua
  kejadian (dicek lewat `GET /sales-orders` langsung setelah pulih). Tidak berulang pada
  percobaan ulang dengan jeda antar-klik.

**Hari 20** ⚠️🛑 — Rencana: 11 Agu · Aktual: `20 Agu 2026` (BE pagi + FE sore, lanjutan sore — lihat blok kedua di bawah §2 & §4)  *(v2: Hari 17)*
- [x] BE: `price-suggestion` — **10 transaksi terakhir** untuk pelanggan + produk +
  **satuan yang sedang diketik**, dari faktur yang **tidak VOID**
- [x] BE: `customer_id` **didenormalisasi** ke `sales_invoice_lines` + indeks
  `(customer_id, product_id, unit_id, id DESC)` — **ditulis di migration ini** (tabel belum
  ada data sebelumnya, jadi ini kolom asli sejak `CREATE TABLE`, bukan `ALTER` susulan)
- [x] BE: fallback tingkat 1 (pelanggan+produk+satuan) & tingkat 2 (produk+satuan) penuh.
  **Tingkat 3 (harga master) TIDAK diimplementasikan — keputusan final, bukan sementara**
  (lihat 🛑 di bawah, dijawab klien sore ini juga)
- [x] BE: `sales_invoices`(+lines) migration (`1785080602952-CreateSalesInvoices.ts`) — kolom
  kunci-cetak/`review_status`/`void_reason_*` disiapkan penuh (pola identik
  `purchase_invoices`) untuk Hari 21/22, belum di-*wire* ke `PRINT_LOCK_TABLES`/`VoidEngineService`
  hari ini
- [x] FE: **mulai** form Sales Invoice (sore, susulan) — header (pelanggan, salesman,
  saluran PENGIRIMAN/TOKO + SO opsional, tanggal, termin, diskon faktur), grid baris,
  `DocumentModal`+`LineModal` dua lapis penuh §7.1 — lihat detail lengkap §4 di bawah.
  **`POST /sales-invoices` sendiri belum ada** (Hari 21) — tombol Simpan dokumen
  memanggil endpoint itu dan gagal dengan pesan error yang sama seperti error lain
  (`Cannot POST /sales-invoices`), **diverifikasi manual sebagai hasil yang diharapkan**,
  bukan bug. Daftar (`GET /sales-invoices`) juga belum ada — `<DataTable>` menampilkan
  "Gagal memuat data" tanpa merusak halaman (perilaku bawaan komponen, sudah teruji).
- [x] FE: modal tambah pelanggan dari dalam form — **selesai** (`<CrudFormPage modal>`
  bertumpuk di atas `DocumentModal`, `useCustomerSchema()` dipakai apa adanya —
  `arAccountId` otomatis tidak ada di DOM untuk OPERATOR, dibuktikan manual di browser)
- [x] BE (susulan sore, di luar lingkup prompt BE pagi): `GET /products/:id/stock-balance`
  — endpoint baca baru (gudang STORE saja), pola persis `GET /products/:id/committed-qty`
  yang sudah ada. Dibutuhkan karena panel "SISA STOK" tidak punya sumber data sama sekali
  sebelumnya (`<StockBadge>` di SO/PI masih selalu `qty=null` menunggu endpoint ini,
  dicatat sejak Hari 10). 1 test integrasi baru `products.service.spec.ts` (jumlah
  STORE, abaikan BAD_STOCK).
- [x] FE: `<StockPanel>` baru (tabel Gudang/Satuan/Qty, `PANDUAN_UI.md` §7.1/§8.6) —
  dipakai Faktur Penjualan, **tidak** menggantikan `<StockBadge>` yang sudah dipakai
  SO/PI (keputusan eksplisit, lihat percakapan sesi ini)
- [x] FE: `<PriceHistoryPanel>` baru (`PANDUAN_UI.md` §8.6, belum pernah dibangun) —
  konsumsi `GET /price-suggestion` (Hari 20 pagi), 10 baris terakhir, kolom
  Tanggal/Qty/Satuan/@Harga, **baris tidak bisa diklik** (murni referensi, sesuai
  instruksi eksplisit klien)
- [x] FE: Harga & Diskon baris **terkunci default**, ikon gembok + Ctrl+H/Ctrl+D
  (`useDocumentHotkeys` sudah punya `onUnlockHarga`/`onUnlockDiskon` sejak Hari 16A,
  **belum pernah dipakai** sampai hari ini) — `<LineModal>` diberi 3 emit opsional baru
  (`unlock-harga`/`unlock-diskon`/`enter-next`), tidak mengubah perilaku SO/PI yang tidak
  listen ke emit itu
- [x] FE: `frontend/app/utils/salesInvoiceCalc.ts` baru — port murni CLAUDE.md §4,
  **PPN keluaran digerbangi `company_is_pkp` SAJA** (beda dari PPN masukan pembelian
  yang per-baris `productIsBkp && supplierIsPkp`) — dibuktikan manual: H.Netto & Jumlah
  per baris live saat mengetik, sama seperti `purchaseInvoiceCalc.ts` untuk Pembelian
- 🛑→✅ **PR #3 DIJAWAB klien 20 Agustus 2026 (sore, sama hari dengan implementasi):
  kosongkan.** Tingkat 1 & 2 dibangun penuh; tingkat 3 (harga master) **tidak akan pernah
  dibangun** — panel tampil kosong ("Belum ada riwayat harga"), operator tanya Master langsung
  kapan saja. Keputusan final, bukan sementara. Kode disederhanakan sesudahnya: stub
  `MASTER_FALLBACK_ENABLED` yang tadinya menahan keputusan **dihapus** dari
  `price-suggestion.service.ts` (CLAUDE.md §6: jangan pakai feature flag kalau bisa langsung
  ubah kodenya) — `getSuggestions()` sekarang berhenti di `source: 'NONE'` tanpa cabang tingkat
  3 sama sekali, dengan komentar merujuk `KONTEKS_REVISI_2026-07-28.md` §4.2 (tertutup).
  Temuan yang tetap relevan sebagai arsip: `products` **tidak punya kolom harga jual sama
  sekali** (dihapus `ReworkProducts` Hari 8) — bukan lagi masalah karena tingkat 3 tidak jadi
  dibangun, tapi dicatat kalau suatu saat ada kebutuhan lain yang butuh harga master.
- **DoD:** pilih pelanggan + produk → 10 harga terakhir muncul < 300 ms **dengan kolom satuan
  terlihat**; ganti satuan dari DUS ke RENCENG → isi panel ikut berganti ✅ (dibuktikan
  `price-suggestion.service.spec.ts`, 4 test integrasi terhadap Postgres asli: 11 baris histori
  → hanya 10 terbaru muncul urut `created_at DESC`, baris `VOIDED` tidak pernah muncul; ganti
  `unitId` DUS→RENCENG mengubah isi panel; fallback tingkat 2 saat kombinasi
  pelanggan+produk+satuan kosong; `source: 'NONE'` bukan error saat semua kosong).
  **EXPLAIN ANALYZE** dijalankan manual terhadap `omega_dev` dengan volume realistis (600 baris
  kebisingan tersebar 10 produk × 60 pelanggan + 15 baris kombinasi target, meniru pola dunia
  nyata di mana satu produk dibeli banyak pelanggan berulang — desain kebisingan pertama yang
  membuat tiap produk eksklusif 1 pelanggan ternyata **tidak** membuktikan apa-apa karena index
  tunggal `product_id` sudah sama selektifnya):
  ```
  Limit  (cost=25.66..25.67 rows=1 width=53) (actual time=0.123..0.124 rows=10 loops=1)
    ->  Sort  (cost=25.66..25.67 rows=1 width=53) (actual time=0.122..0.123 rows=10 loops=1)
          Sort Key: sil.created_at DESC
          ->  Nested Loop  (actual time=0.030..0.089 rows=15 loops=1)
                ->  Nested Loop  (actual time=0.017..0.040 rows=15 loops=1)
                      ->  Index Scan using idx_sales_invoice_lines_price_lookup on sales_invoice_lines sil
                            Index Cond: ((customer_id = '...') AND (product_id = '...') AND (unit_id = '...'))
                      ->  Index Scan using sales_invoices_pkey on sales_invoices si
                            Index Cond: (id = sil.sales_invoice_id)
                            Filter: (posting_status = 'POSTED'::sales_invoice_posting_status)
                ->  Seq Scan on units u (kecil, 4 baris — wajar tanpa index)
  Planning Time: 1.420 ms
  Execution Time: 0.159 ms
  ```
  Index komposit dipakai persis lewat `Index Cond` pada ketiga kolom, 0,159 ms — jauh di bawah
  300 ms. Data uji dihapus lagi setelah verifikasi (skrip sekali-jalan, tidak masuk repo).
  **Temuan penting selama implementasi**: rencana awal `ORDER BY sil.id DESC` (supaya index
  juga melayani sort) **keliru** — `id` dibangkitkan `gen_random_uuid()` (UUID v4 ACAK, tidak
  berkorelasi dengan waktu sama sekali), jadi "10 terbaru" versi `id DESC` sebenarnya
  mengembalikan baris ACAK tanpa error apa pun (ketahuan dari test korektnes yang gagal, bukan
  dari intuisi). Diperbaiki jadi `ORDER BY sil.created_at DESC`; index tetap dipertahankan
  persis sesuai spesifikasi tugas (`customer_id, product_id, unit_id, id DESC`) karena tetap
  sepenuhnya melayani predikat `WHERE` (dibuktikan di atas), hanya tidak lagi menghilangkan node
  `Sort` — aman karena hasil sudah tersaring ke segelintir baris per kombinasi sebelum di-sort.
  Test EXPLAIN otomatis di jest **sengaja tidak dipertahankan** — di tabel test sekecil puluhan
  baris, planner kadang memilih index lain meski `enable_seqscan=off` (biaya antar-index nyaris
  identik di N sekecil itu, terbukti flaky saat dijalankan sendirian vs. satu file penuh);
  Postgres tidak punya index hint seperti MySQL untuk memaksanya. `npm run build`/`lint`/`test`
  BE 0 error (173/173 test, 27 suite), migration `up→down→up` bersih di `omega_dev`,
  `./scripts/verify.sh` 10/10 lulus (FE build sempat OOM di percobaan pertama — masalah RAM
  mesin dev yang sudah tercatat sejak Hari 1 di §3, bukan disebabkan perubahan hari ini karena
  tidak ada file `frontend/` yang disentuh; lulus saat diulang dengan heap lebih besar).
- **DoD (lanjutan sore, form Sales Invoice):** panel riwayat harga muncul < 300 ms dengan
  kolom satuan terlihat ✅; ganti satuan → isi panel (riwayat harga MAUPUN sisa stok) ikut
  berganti ✅; baris panel riwayat harga tidak bisa diklik ✅ (tidak ada `selectable`/
  `on-row-click` sama sekali di `<PriceHistoryPanel>`); modal tambah pelanggan jalan,
  langsung terpilih di dropdown header, field Akun Piutang tidak ada di DOM (login
  OPERATOR) ✅; sisa stok tampil begitu produk dipilih, sebelum qty diketik ✅. Faktur
  VOID tidak muncul di panel — dijamin backend (`posting_status='POSTED'` filter,
  dibuktikan Hari 20 pagi), tidak digulang FE. **Semua dibuktikan manual end-to-end di
  browser sungguhan** (login OPERATOR, Chrome, bukan cuma baca kode): pilih pelanggan
  "C-001-Pak 1" + salesman "AN-Andin" → Entri baris → pilih produk "Bendera Putih
  Sachet" → satuan default DUS, Isi=130, SISA STOK "Toko/DUS/27,5769" (dari
  `GET /products/:id/stock-balance` sungguhan) → Ctrl+H membuka+fokus Harga, ketik
  120.000 → Ctrl+D membuka+fokus Diskon, ketik 10% → H.Netto=108.000, Qty=3 →
  Jumlah=324.000 (live, lewat `salesInvoiceCalc.ts`) → Simpan baris → masuk grid +
  totals (Item:1, Qty:3, Total:324.000) → "+ Pelanggan Baru" → isi nama → tersimpan
  (`CUST-051`) → langsung terpilih di header, tanpa field Akun Piutang → ganti satuan
  ke PCS pada baris baru → SISA STOK berubah "Toko/PCS/3.585", RIWAYAT HARGA berubah ke
  "Belum ada riwayat harga." (kombinasi PCS belum pernah ada) — dibuktikan lewat 1 baris
  histori sungguhan yang diseed manual ke `sales_invoice_lines` (dihapus lagi setelah
  verifikasi, pola sama data uji hari-hari sebelumnya): panel tarik lewat fallback
  tingkat 2 (produk+satuan, lintas pelanggan) dan tampil persis Tanggal/Qty/Satuan/
  @Harga. Simpan dokumen (`POST /sales-invoices`) → `Cannot POST /sales-invoices` —
  **hasil yang diharapkan**, endpoint itu Hari 21. Daftar (`GET /sales-invoices`) → kartu
  "Gagal memuat data" di `<DataTable>`, halaman tidak rusak — juga diharapkan.
  Data uji (customer `CUST-051`, baris histori seed manual) dihapus lagi dari `omega_dev`
  setelah verifikasi.
  `npm run build`/`lint` BE 0 error, `npm run test` BE 174/174 (**1 kegagalan pra-ada**
  di `journal-poster.service.spec.ts` muncul hanya saat suite penuh dijalankan bersamaan —
  lulus 10/10 saat file itu dijalankan sendirian, dikonfirmasi dua kali; file tidak
  disentuh sesi ini, lihat `git diff --stat` menunjuk perubahan itu sudah ada di working
  tree sebelum sesi dimulai — kemungkinan race `document_counters` antar-suite paralel,
  pola sama seperti flakiness `step-up`/`authorization-requests` yang sudah dicatat Hari
  18). `pnpm run build`/`lint` FE 0 error (build sukses murni dengan
  `NODE_OPTIONS=--max-old-space-size=4096` — mesin dev 7.7GB RAM tidak cukup untuk build
  Nitro tanpa itu, masalah tercatat sejak Hari 1, bukan regresi hari ini).
  `./scripts/verify.sh`: **8/10** — 2 gagal murni karena dua hal pra-ada di atas (test
  flaky lintas-suite + OOM build tanpa heap tambahan), keduanya dikonfirmasi tidak
  disebabkan perubahan sesi ini.

**Hari 21** ♻️ — Rencana: 12 Agu · Aktual: `23 Agu 2026` (BE + FE selesai penuh, dua sesi
sama hari — BE pagi, FE sore)  *(v2: Hari 18)*
- [x] BE: `POST /sales-invoices` alur penuh (Stock Recorder + Journal Poster, satu transaction)
- [x] BE: **tidak ada pembulatan** — `total_amount` eksak sampai rupiah
- [x] BE: diskon **baris + faktur**, keduanya persen ATAU rupiah (alternatif, bukan bertingkat);
  metode **bruto** dengan akun kontra Diskon Penjualan
- [x] BE: PPN keluaran digerbangi **`company_is_pkp` saja** (status PKP pelanggan tidak menentukan)
- [x] BE: **batas jual di bawah harga pokok** — `unit_cost` lot terbaru **yang > 0** × konversi,
  dibanding **harga bersih setelah diskon**; `SELL_BELOW_COST`, **satu permintaan per faktur**
  yang memuat semua baris pelanggar; nilai batas **tidak ditampilkan**
- [x] FE: preview total live lengkap (Subtotal/Diskon Baris/Diskon Faktur/PPN Keluaran/Total),
  Ctrl+H/Ctrl+D dengan hint terlihat, `<StepUpDialog>` untuk `SELL_BELOW_COST` — lihat catatan
  sesi sore di bawah untuk rincian (sebagian besar sudah dibangun Hari 20, sesi ini menyambungkan
  ke BE + memperbaiki kebocoran angka di `contextSummary`).
- **Sesi sore (FE) — apa yang ternyata sudah ada vs baru dikerjakan:**
  Diskon baris+faktur persen/rupiah dan Ctrl+H/Ctrl+D+hint **sudah dibangun Hari 20** (form
  `penjualan/faktur/index.vue` sudah punya `discountMode` toggle di kedua level, dan `LineModal`
  sudah memanggil `useDocumentHotkeys()` — composable bersama yang sama dipakai `purchase-invoices`
  kalau butuh lock field serupa). Sesi ini murni **verifikasi manual** untuk keduanya, tidak ada
  kode baru. Yang benar-benar baru: (1) `<TotalsBar>` ditambah 3 baris (Subtotal/Diskon Baris/PPN
  Keluaran) di samping Diskon Faktur/Total yang sudah ada — semua dari `calc.*` yang sudah dihitung
  `calculateSalesInvoice()`, tidak ada computed baru; (2) `submit()` dibungkus `useStepUp().withStepUp()`
  — infrastruktur step-up generik yang **sudah ada** (`<StepUpDialog>` global di `layouts/default.vue`
  + `useStepUp.ts`, presedennya `WarehouseMutationsService`/`gudang/mutasi/index.vue` untuk
  `BS_TO_STORE`) — pola disalin persis, tidak ada komponen/composable baru.
- **Bug ditemukan & diperbaiki, di luar lingkup FE murni (disetujui user):**
  `buildContextSummary()` di `sales-invoices.service.ts` (dibangun sesi BE pagi hari ini) menulis
  `"... (jual Rp{netUnitPrice} < pokok Rp{costBasisPerInputUnit})"` per baris pelanggar — bocor
  langsung ke layar operator karena `<StepUpDialog>` menampilkan `contextSummary` **apa adanya**
  (didesain begitu, tanpa props lain). Melanggar CLAUDE.md §17 ("nilai batas tidak ditampilkan")
  dan DoD sesi ini sendiri. Diperbaiki jadi hanya nama produk, pola sama
  `WarehouseMutationsService.buildContextSummary()` (BS_TO_STORE) yang juga tidak menyertakan
  angka bermakna. Tidak ada test existing yang menguji string persis lama, jadi tidak ada test
  yang perlu diperbaiki. Backend test **182/182 di `sales-invoices.service.spec.ts` bareng suite
  penuh** tetap hijau (suite itu sendiri 9/9, tidak menguji isi string `contextSummary`).
- **DoD sesi sore:** total di layar identik dengan `calc.totalAmount`/`calc.subtotal`/dst yang
  sama-sama porting sen-akurat dari `calculateSalesInvoice()` (util yang sama dipakai backend,
  tidak disentuh) ✅; satu `<StepUpDialog>` untuk seluruh faktur bukan per baris — dijamin backend
  (satu baris `authorization_requests`, `payload.lines` memuat semua baris pelanggar, dibuktikan
  test BE pagi `payload.lines.length===3`), FE tidak menambah logika apa pun untuk ini karena
  `withStepUp()` menangani satu response 412 apa pun isinya ✅; tidak ada angka harga
  pokok/batas bocor — dipenuhi lewat perbaikan `contextSummary` di atas ✅.
  `npm run build`/`lint` FE 0 error (build perlu `NODE_OPTIONS=--max-old-space-size=4096`, masalah
  RAM mesin dev tercatat sejak Hari 1, bukan regresi). `npm run build`/`lint`/`test` BE tetap
  183/183 sendirian; **BE `test` bareng suite penuh 182/183** — 1 gagal race `document_counters`
  lintas-suite (kali ini kena `sales-orders.service.spec.ts`, bukan `journal-poster` seperti sesi
  pagi — root cause SAMA, sudah tercatat sejak Hari 20, dikonfirmasi ulang lulus 18/18 sendirian).
  `./scripts/verify.sh`: **8/10** — 2 gagal, KEDUANYA pra-ada & bukan regresi sesi ini: (a) test BE
  race `document_counters` di atas; (b) FE build OOM tanpa `NODE_OPTIONS` (verify.sh tidak
  menyetelnya) — dikonfirmasi build FE sukses murni saat diulang manual dengan heap tambahan.
- **Uji manual browser (server sungguhan, login `operator`/`supervisor` asli) sudah dijalankan**
  setelah DoD di atas — DoD sore terbukti dengan bukti nyata (DOM + query DB), bukan cuma
  asumsi dari kode. **Ditemukan 1 bug (belum diperbaiki, ⚠️ terbuka)**: `<StepUpDialog>` global
  tidak terlihat & tidak bisa diklik operator selagi `DocumentModal` faktur masih terbuka di
  baliknya (bentrok stacking dua modal Teleport `z-index:auto`) — kemungkinan besar juga menimpa
  `gudang/mutasi/index.vue` (BS_TO_STORE) karena pola identik. Alur bisnisnya sendiri (persetujuan
  → auto-retry → faktur `POSTED`) terbukti benar lewat pendekatan API langsung (approve via
  `POST /authorization-requests/:id/approve`), tapi **operator sungguhan akan macet tanpa
  penjelasan** kalau mengalami ini di layar. Rincian lengkap + data uji yang sudah dibersihkan
  ada di §4 entri "Hari 21 (sore, lanjutan)". **Belum diputuskan siapa yang memperbaiki & kapan** —
  bawa ke sesi berikutnya, di luar lingkup prompt FE Sales Invoice murni.
- **Prasyarat baru yang ditemukan, di luar 5 poin tugas tapi wajib sebelum POST bisa jalan**:
  (1) 4 flag COA baru (`is_revenue_account`/`is_sales_discount_account`/`is_cogs_account`/
  `is_output_vat_account`, migration `1785080602953`) — Pendapatan/HPP/Diskon Penjualan/PPN
  Keluaran belum punya flag singular seperti sisi pembelian, `account_subtype` tidak unik untuk
  keempatnya. **Kode akun aktual (hasil `RestructureChartOfAccountsV2` `up()`) tetap format
  panjang** (`04.110.00001`, `04.110.00003`, `05.110.00001`, `02.110.00022`) — draft awal migration
  keliru memakai kode pendek `4101` dst. karena salah membaca blok `down()` migration itu sebagai
  kode final; ketahuan & diperbaiki lewat migration-run sungguhan sebelum dipakai test/curl, bukan
  cuma dibaca dari kode. (2) **Bug di `payload-matchers.ts`** (`sameValue()`) — Postgres **jsonb
  MENORMALISASI ULANG urutan key objek** (urut panjang-lalu-leksikografis, bukan urutan insersi),
  jadi `JSON.stringify` naif salah bilang "payload beda" untuk objek ber-3+-key yang urutan
  insersinya bukan urutan normalisasi jsonb — `BS_TO_STORE` (Hari 13) lolos selama ini murni
  kebetulan (`productId`/`qtyBaseUnit`, 2 key, sudah sesuai urutan). `SELL_BELOW_COST` (6 key per
  baris `lines[]`) membongkarnya. Diperbaiki jadi deep-equal rekursif order-independent — **berlaku
  untuk SEMUA actionType**, bukan cuma punya hari ini; kalau dipakai untuk melacak PR terbuka lain,
  ini bukan regresi Hari 21 tapi bug lama yang baru ketahuan.
- **DoD:** faktur bertotal Rp 33.253.125 tersimpan **apa adanya** ✅ (test otomatis + dibuktikan
  manual: angka non-bulat `invoiceDiscountAmount=96.875` dipakai justru supaya ketahuan kalau ada
  pembulatan diam-diam); produk yang lot terbarunya bonus (`unit_cost = 0`) tetap memakai lot
  berbayar terakhir sebagai batas ✅ (lot bonus lebih baru dari lot berbayar, `getLatestCostBasis()`
  tetap pakai lot berbayar — dibangun & diuji Hari 10, tidak diduplikasi); produk yang belum pernah
  dibeli → tidak ada batas, tidak error ✅. Ditambah kontrak "satu approval per faktur" ✅ (3 baris
  melanggar sekaligus → 1 baris `authorization_requests`, bukan 3, dibuktikan lewat delta count +
  `payload.lines.length===3`); jurnal balance dengan `customerId` wajib di baris Piutang ✅ (invarian
  Hari 18); rollback penuh saat gagal di tengah (nomor `JL` tidak lompat, tidak ada baris
  `sales_invoices`/`lines` tersisa) ✅ pola `jest.spyOn(EntityManager.prototype,'save')` sama Hari 19.
  **19 test baru** (`sales-invoices.service.spec.ts`, real Postgres, pola persis
  `purchase-invoices.service.spec.ts`): total eksak, `unit_cost_fifo` terisi, lot-bonus-dilewati,
  produk-tanpa-lot, satu-approval-per-faktur, PPN gerbang `company_is_pkp` saja (2 arah), channel
  PENGIRIMAN wajib SO + SO jadi `CONVERTED`, rollback nomor+baris, stok minus diizinkan +
  `stockWarnings`. `npm run build`/`lint` BE 0 error; `npm run test` BE **183/183 lolos, 28 suite**
  (naik dari 174/27); migration `1785080602953` `up→down→up` bersih (diverifikasi 2x, termasuk
  setelah draft kode diperbaiki). `./scripts/verify.sh`: **8/10** — 2 gagal keduanya pra-ada &
  dikonfirmasi bukan regresi hari ini: (a) `journal-poster.service.spec.ts` 1 test flaky HANYA saat
  suite penuh jalan bareng (race `document_counters` lintas-suite, sudah tercatat sejak Hari 20 —
  lulus 10/10 sendirian, dikonfirmasi ulang); (b) FE build OOM tanpa
  `NODE_OPTIONS=--max-old-space-size=4096` (masalah RAM mesin dev tercatat sejak Hari 1, bukan
  disebabkan perubahan hari ini karena **tidak ada file `frontend/` disentuh sesi ini** — dikonfirmasi
  build FE sukses murni saat diulang dengan heap tambahan).
  **Manual curl end-to-end** (server sungguhan `omega_dev`, login `master`/`supervisor` asli):
  faktur produk "Bendera Putih Sachet" @Rp100.000/DUS (batas dari lot terbaru Rp1.500/pcs ×130 =
  Rp195.000/DUS) → `412` `{requiresAuthorization:true, authorizationRequestId}` → approve via
  SUPERVISOR → retry dengan header `x-authorization-request-id` → `201`, `unit_cost_fifo=1150`
  (FIFO lot TERTUA yang sungguh dikonsumsi — beda dari Rp1.500 yang cuma basis batas jual-rugi,
  dibuktikan angka beda persis sesuai desain) dan jurnal 4 baris balance (Piutang 100.000 =
  Pendapatan 100.000; HPP 149.500 = Persediaan 149.500); token yang sama dipakai dua kali → `412`
  "sudah pernah dipakai (sekali pakai)"; SUPERVISOR coba `POST /sales-invoices` → `403` sebelum
  menyentuh DB; faktur normal (harga di atas pokok, diskon baris 10% + diskon faktur Rp5.000) →
  `201` langsung tanpa 412, jurnal 5 baris (+ Diskon Penjualan) balance. Data uji dihapus lagi dari
  `omega_dev` setelah verifikasi — termasuk mengembalikan `stock_cost_lots.qty_remaining` dan
  `product_stock_balance` yang sempat berkurang, bukan cuma menghapus baris dokumen (pola lebih
  hati-hati dari hari-hari sebelumnya karena test ini benar-benar memindahkan stok sungguhan).

**Hari 22** ♻️ — Rencana: 13 Agu · Aktual: `23 Agu 2026` (sesi ketiga hari yang sama — BE
Hari 21 pagi/sore, ini sesi malam)  *(v2: Hari 19)*
- [x] BE: edit bersyarat + VOID Sales Invoice (lewat mekanisme kunci cetak Hari 15) — **⚠️
  ditemukan SUDAH LENGKAP & lolos test (24/24 `sales-invoices.service.spec.ts`) di working
  tree sebelum sesi ini dimulai**, tidak tercatat di PROGRESS.md dan belum pernah di-commit
  (`git status` 187 file berubah, commit terakhir masih `ed8dacb` "Hari 7-9"). Kemungkinan besar
  sisa sesi sebelumnya yang berhenti sebelum sempat update dokumentasi/commit. Diverifikasi
  ulang (bukan ditulis ulang): `SalesInvoicesController`/`.service.ts` sudah punya `findAll()`,
  `findOne()`, `update()`, `voidInvoice()`, `registerPrint()`; `sales-invoices.module.ts` sudah
  import `PrintLockModule`+`VoidModule`; `SalesInvoiceVoidHook` sudah self-register. Sesi ini
  murni **memakainya lewat FE + uji end-to-end**, tidak menulis ulang BE.
- [x] BE: **`GET /sales-invoices` (daftar) + `GET /sales-invoices/:id` (detail)** — sama, sudah
  ada (lihat poin di atas). `Cannot GET /sales-invoices` yang dilaporkan Hari 21 sore hilang
  sendirinya setelah backend dev server yang BENAR dijalankan — **root cause bug itu ternyata BUKAN
  endpoint hilang, tapi proses `nest start --watch` STALE (dari sesi lama, sebelum route ini ada)
  masih memegang port 3000** di lingkungan dev dan tidak pernah di-restart. `netstat`/`taskkill`
  proses lama → restart bersih → `GET /sales-invoices` langsung 401 (perlu auth, bukan 404). Dicatat
  supaya tidak salah diagnosis lagi: kalau endpoint "hilang" padahal kodenya ada, cek proses stale
  duluan sebelum menulis ulang apa pun.
- [x] FE: **detail Sales Invoice** — `frontend/app/pages/penjualan/faktur/[id]/index.vue` (baru),
  pola disalin persis `pembelian/faktur/[id]/index.vue` (Hari 18): header+badge status,
  `<DocumentActions>`/`<DocumentStatusBadges>` generik (tidak ada perubahan ke komponen itu),
  tabel baris, ringkasan total, modal Edit (hanya `salesmanId`+`termDays`, sesuai
  `UpdateSalesInvoiceDto` yang scope-nya sengaja sempit), modal VOID. Tombol toolbar
  (Cetak/Batal Cetak/Pengecekan/View Detail) ditambah ke `penjualan/faktur/index.vue`, pola
  sama `pembelian/faktur/index.vue`.
- [x] FE: **perbaiki `<StepUpDialog>` tertutup/tidak bisa diklik** — **satu baris** di
  `frontend/app/components/StepUpDialog.vue`: `:ui="{ overlay: 'z-[100]', content: 'z-[100]' }"`
  pada `<UModal>`. Root cause dikonfirmasi baca kode Nuxt UI v4 (`node_modules/@nuxt/ui/dist/
  shared/ui.*.mjs`): tema `modal` default TIDAK punya z-index sama sekali (`overlay: "fixed
  inset-0"` polos) — dua `UModal` yang di-Teleport ke `<body>` murni bertumpuk mengikuti urutan
  DOM/mount, dan `StepUpDialog` (mount di `layouts/default.vue`, lebih awal) selalu kalah dari
  modal halaman (mount belakangan). Memberi salah satu z-index eksplisit membalik urutan tumpuk
  terlepas dari urutan DOM (aturan CSS painting order). **Perbaikan satu tempat**, berlaku untuk
  SEMUA pemakai `withStepUp()` sekarang & nanti (kas besar, dst) — bukan ditempel per halaman.
- [x] FE: **cetak nota A5 landscape, 2-up di A4 portrait**, 14 baris/halaman —
  `frontend/app/pages/penjualan/faktur/[id]/cetak.vue` (baru), pola sama
  `gudang/mutasi/[id]/cetak.vue` (2 salinan identik ditumpuk per lembar, `layouts/print.vue`
  tidak diubah). Bentuk **§13.1 PANDUAN_UI.md** (sumber foto `docs/referensi/penjualan/
  "Faktur Penjualan.jpg"` — dibaca ulang langsung dari file foto sesi ini, bukan cuma teks
  turunannya) — kolom `NO·BARCODE·NAMA PRODUK·QTY·HARGA @·DISC %·DISC RP·JUMLAH`, `JTH. TEMPO`
  (`- Hari` kalau 0), `MEMO` (selalu kosong — `sales_invoices` tidak punya kolom memo, dicatat
  sebagai keterbatasan yang diketahui, bukan bug), kaki `GRAND TOTAL` (garis bawah ganda) ·
  `SALES : <kode>` · `Hal. n/m` (hanya kalau >1 halaman, pola sama Mutasi Gudang) ·
  `CETAK : <nama operator> - <timestamp>`. **Angka pakai `useRupiah()`/`useQty()` (format
  id-ID baku, pemisah ribuan titik)**, BUKAN format koma-ribuan yang terlihat di foto Affari —
  sesuai catatan eksplisit PANDUAN_UI §13.1 bahwa itu memang salah di sistem lama, jangan ditiru.
- [x] FE: kepala nota dari `settings` (`store_name`/`store_city`/`store_phone`, yang kosong tidak
  dicetak — ketiganya memang kosong di seed dev sekarang, sesuai foto asli yang juga tidak
  menyebut nama toko) + nama/alamat/telepon pelanggan (`CustomerLookup` diperluas dengan
  `phone`/`address`/`city`/`isPkp` di `useSalesInvoiceLookups.ts` — field ini sudah dikirim
  backend selama ini, TS interface-nya saja yang belum lengkap; `isPkp` yang hilang juga
  memperbaiki 1 typecheck error pra-ada di `penjualan/faktur/index.vue`, tidak disengaja tapi
  benar). Kaki nota baris audit cetak (nama operator + timestamp). Nomor revisi dicetak
  `( Revisi ke-N )` di samping `NO. NOTA` kalau `revisionNumber > 0`.
- [x] FE: dokumen `VOIDED` dicetak dengan watermark `VOID` diagonal merah besar (kode ada &
  dites lolos type/lint, **belum sempat dilihat dengan mata sendiri di browser** — lihat catatan
  keterbatasan verifikasi di bawah).
- **VOID Sales Invoice: gerbang step-up GANDA, ditangani manual (bukan `withStepUp()` polos)** —
  temuan arsitektur baru sesi ini. `SalesInvoicesController.voidInvoice()` menggabungkan DUA
  gerbang independen: `UNLOCK_PRINT` (header `x-authorization-request-id`, hanya kalau faktur
  `PRINTED`) dan `VOID_DOCUMENT` (header `x-void-authorization-request-id`, hanya role OPERATOR).
  `useStepUp().withStepUp()` generik cuma menangani SATU gerbang aktif per panggilan (satu id,
  satu header hardcoded) — dipakai polos untuk kasus faktur PRINTED + OPERATOR, retry otomatisnya
  akan memicu 412 KEDUA yang salah ditafsirkan `pollOnce()` sebagai "isi permintaan berubah sejak
  disetujui" (CLAUDE.md §19), padahal itu gerbang lain yang sah. `performVoid()` baru di
  `[id]/index.vue` memanggil `withStepUp()` DUA KALI berurutan, masing-masing ronde murni
  "probe" (tidak memanggil endpoint sungguhan kalau masih mungkin ada gerbang lain menyusul),
  memetakan header generik ke slot yang benar berdasarkan `invoice.printStatus` yang sudah
  diketahui client-side (jadi tidak perlu menebak dari isi 412). **Tidak menyentuh
  `useStepUp.ts`** (composable generik dibiarkan generik) — kompleksitas dua-gerbang ini murni
  lokal ke VOID Sales Invoice, satu-satunya aksi di codebase yang menggabungkan dua ActionType
  sekaligus.
- **Verifikasi**: `npm run build`/`lint` BE 0 error; `npm run test` BE
  `sales-invoices.service.spec.ts` 24/24 lolos sendirian. `npm run build`/`lint` FE 0 error
  (heap `NODE_OPTIONS=--max-old-space-size=4096`, masalah RAM mesin dev tercatat sejak Hari 1).
  `npm run typecheck` FE: sisa error semuanya pra-ada di `purchaseInvoiceCalc.ts`/
  `salesInvoiceCalc.ts`/`lineDraftCalc` (N8, tidak disentuh — dikonfirmasi `typecheck` BUKAN
  bagian gerbang harian, `verify.sh` cuma memanggil `npm run build` untuk FE yang esbuild/vite,
  tidak type-check penuh) — **1 error `isPkp` yang tadinya juga muncul di sana justru hilang**
  setelah `CustomerLookup` diperluas sesi ini (perbaikan insidental, bukan disengaja tapi valid).
  **`./scripts/verify.sh` TIDAK selesai dijalankan** — macet tanpa output sama sekali (>10 menit,
  dihentikan paksa), kemungkinan menunggu prompt interaktif `psql`/`dropdb` yang tidak bisa
  dijawab lingkungan non-interaktif sesi ini; bukan dikonfirmasi sebagai regresi dari perubahan
  hari ini (script itu sendiri tidak disentuh). **Belum diselidiki lebih lanjut — perlu dicoba
  ulang manual di terminal interaktif sungguhan**, dicatat sebagai gap verifikasi, bukan
  disembunyikan.
- **Manual end-to-end di browser sungguhan** (login `operator`/`supervisor` asli, server
  `localhost:3001`/`:3000`, DB `omega_dev`) — bukti utama hari ini, bukan cuma baca kode:
  1. **`<StepUpDialog>` stacking, kasus SELL_BELOW_COST saat `DocumentModal` Faktur Penjualan
     masih terbuka** (persis reproduksi bug Hari 21 sore): faktur "Bendera Putih Sachet" 2 DUS
     @Rp100.000 (di bawah pokok) → `Simpan` → `<StepUpDialog>` muncul **DI ATAS** `DocumentModal`
     yang masih terbuka (bukan tersembunyi di baliknya) → dikonfirmasi
     `document.elementFromPoint()` pada koordinat tombol "Batalkan" mendarat TEPAT di elemen
     `<button>Batalkan</button>` milik `StepUpDialog` (bukan overlay `DocumentModal` seperti
     temuan Hari 21) ✅ — metode pembuktian sama persis yang dipakai menemukan bug aslinya.
     Approve via API sebagai `supervisor` → polling FE 5 detik mendeteksi otomatis → faktur
     `JL/RM01-26080241` tersimpan `POSTED` tanpa aksi tambahan operator ✅.
  2. **Detail + Cetak**: buka `/penjualan/faktur/:id` → header/badge/tabel/total identik data DB
     (dicek `GET` langsung) ✅. Klik Cetak → navigasi ke `/:id/cetak` → nota tampil sesuai §13.1
     (kolom, `JTH. TEMPO - Hari`, footer `GRAND TOTAL`/`SALES : AN`/`CETAK : Operator - ...`) ✅.
     Klik tombol Cetak di halaman itu → `POST /:id/print` terpanggil (dikonfirmasi `GET` invoice
     sesudahnya: `printStatus=PRINTED`, `printCount=1`, `printedAt` terisi) lalu `window.print()`
     terpicu (dialog cetak native browser terbuka — tidak bisa di-screenshot/diklik lewat CDP,
     tapi registrasi server SUDAH terbukti terjadi SEBELUM `window.print()` dipanggil, sesuai
     urutan kode) ✅.
  3. **VOID dua-gerbang (faktur PRINTED, role OPERATOR)** — kasus paling rumit hari ini: klik
     "Batal Cetak" → pilih "Dibatalkan/VOID" + alasan → dialog VOID → submit → `<StepUpDialog>`
     ronde 1 muncul (`UNLOCK_PRINT`, context "Batal cetak JL/RM01-26080241 untuk VOID: ...") →
     approve via API supervisor → **ronde 2 OTOMATIS menyusul TANPA aksi operator**,
     `<StepUpDialog>` berganti isi jadi `VOID_DOCUMENT` (context "VOID faktur JL/RM01-26080241:
     ...") — **membuktikan `performVoid()` menangani rantai dua-gerbang dengan benar**, bukan
     salah ditafsirkan "isi berubah" ✅ → approve ronde 2 → `GET` invoice: `postingStatus=VOIDED`,
     `printStatus=PRINT_CANCELLED`, `voidReasonCode`/`voidReasonNote` terisi ✅.
  4. **Lot & stok kembali ke asal (bukan lot baru)**: `GET /products/:id/stock-balance` SEBELUM
     transaksi manapun = 3455 base unit. Setelah faktur (2 DUS = 260 base unit terjual) = 3195.
     Setelah VOID = **3455 lagi, persis sama** ✅ — dikonfirmasi lewat `stock_movements`
     (`movement_type=adjustment`, `source_type=VOID_REVERSAL`, `+260`, `source_id` menunjuk
     movement asalnya) bukan lot baru, sesuai `StockRecorderService.reverseOut()` yang sudah ada.
  Data uji dihapus lagi dari `omega_dev` setelah verifikasi (`sales_invoices`+lines,
  `journal_entries`+lines original & reversal, `stock_movements`+`stock_cost_consumptions`) —
  `stock-balance` dikonfirmasi ulang tetap 3455 setelah pembersihan. `document_counters`/nomor
  `JL` TIDAK dikembalikan (pola sama Hari 21, nomor tidak pernah di-reset manual).
- **Keterbatasan verifikasi hari ini — dicatat jujur, bukan diklaim selesai:**
  - **Uji cetak SUNGGUHAN ke kertas TIDAK dilakukan** — lingkungan sesi ini tidak punya printer
    fisik. `@page { size: A4 portrait }` di `layouts/print.vue` (tidak diubah) dan dua blok
    `height: 148.5mm` per salinan (persis setengah 297mm) diverifikasi SECARA MATEMATIS, bukan
    dicetak. **Perlu diuji manual ke kertas sungguhan sebelum dianggap final.**
  - **Nota 16-baris (pecah 2 halaman) TIDAK diuji dengan data sungguhan** — tidak sempat membuat
    faktur 16 baris hari ini. Logic `PAGE_SIZE=14` + `pages` computed adalah SALINAN PERSIS pola
    `gudang/mutasi/[id]/cetak.vue` yang sudah terbukti benar Hari 16B, tapi belum dibuktikan ulang
    untuk faktur penjualan secara spesifik.
  - **Watermark VOID TIDAK dilihat langsung** — dicetak dari kode (lolos lint/typecheck) tapi
    invoice test yang sempat di-VOID sudah keburu dihapus (pembersihan data uji) sebelum sempat
    membuka ulang halaman cetaknya dalam status VOID.
  - **`<StepUpDialog>` di `gudang/mutasi/index.vue` (BS_TO_STORE) TIDAK berhasil diverifikasi
    ulang secara visual sesi ini** — tooling browser (Claude in Chrome) mengalami degradasi
    berulang (CDP screenshot/click timeout, beberapa tab macet total) di paruh kedua sesi,
    kemungkinan tekanan resource mesin dev (RAM terbatas, tercatat sejak Hari 1). **Bukan
    dilewati sengaja** — perbaikannya sendiri (poin `<StepUpDialog>` di atas) ada di SATU
    komponen global (`StepUpDialog.vue`) yang dipasang SEKALI di `layouts/default.vue` dan
    dipakai identik oleh SEMUA pemakai `withStepUp()` termasuk `gudang/mutasi/index.vue` — tidak
    ada override per-halaman yang bisa membuatnya berperilaku beda di sana. Risiko sisa rendah
    secara struktural, tapi **belum dibuktikan dengan mata sendiri seperti yang diminta** — coba
    lagi di sesi berikutnya sebelum menandai ini 100% tuntas.
  - `./scripts/verify.sh` tidak selesai (lihat catatan di atas).
- **DoD** (dari 8 item yang diminta): nota 16 baris pecah 2 halaman — **kode ada, belum dibuktikan
  data sungguhan** ⚠️; dua nota A5 presisi di A4 — **matematis benar, belum dicetak fisik** ⚠️;
  VOID mengembalikan stok & lot — **terbukti** ✅; cetak ulang tanpa izin — **terbukti** ✅;
  `GET /sales-invoices` daftar sungguhan — **terbukti** ✅; `<StepUpDialog>` terlihat & bisa
  diklik dari Sales Invoice — **terbukti rigorous** ✅, dari Mutasi Gudang — **tidak sempat
  dibuktikan ulang, lihat keterbatasan di atas** ⚠️; format nota — **klien TIDAK PERNAH benar-benar
  "belum kirim"**, foto asli `docs/referensi/penjualan/Faktur Penjualan.jpg` sudah ada sejak
  sebelum Hari 22 dan sudah didokumentasikan penuh di PANDUAN_UI §13.1 — instruksi prompt hari ini
  yang menyebut "klien belum kirim" keliru, tidak perlu dicatat sebagai revisi pasca-MVP.

**Hari 22A** 🆕 — Rencana: 14 Agu · Aktual: `____`
- [ ] BE: `review_status` (`BELUM_DICEK` → `DISETUJUI` / `BERMASALAH`) + catatan supervisor
- [ ] BE: **pakai ulang** `GET /sales-invoices` & `GET /purchase-invoices` dengan filter
  `reviewStatus` — **dilarang** membuat keluarga endpoint `/supervisor/*`
- [ ] FE: **Halaman Pengecekan Invoice Harian** — nomor, toko/pelanggan, nominal, status, detail
- [ ] FE: navigasi supervisor **3 item saja**: Pengecekan Invoice · Antrian Persetujuan · Laporan.
  **Tidak ada dashboard**
- [ ] FE: polling 5 detik untuk antrian persetujuan
- **DoD:** supervisor menandai `BERMASALAH` → **tidak** bisa mengedit faktur (403), hanya
  menandai; operator melihat penandaan itu dan memperbaikinya; pengecekan **tidak memblokir**
  operator mencetak nota kapan pun

**Hari 23** ♻️ — Rencana: 15 Agu · Aktual: `26 Agu 2026` (BE saja, sesuai lingkup prompt — FE
menyusul)  *(v2: Hari 20)*
- [x] BE: `sales_returns`(+`sales_return_lines`) + nomor `RJ` — **wajib menunjuk faktur asal**
  (`sales_invoice_id` header + `sales_invoice_line_id` per baris, migration `1785080602955`).
  Retur tanpa faktur asal → 400 (`salesInvoiceId` wajib UUID + service menolak kalau tidak
  ditemukan/sudah VOID). `src/modules/sales-returns/`
- [x] BE: harga pokok **wajib** dari `sales_invoice_lines.unit_cost_fifo`, **disalin apa
  adanya** ke `sales_return_lines.unit_cost_fifo` dan ke `StockRecorderService.recordIn()`
  — tidak pernah dihitung ulang. Dibuktikan test: lot `stock_cost_lots` yang terbentuk
  ber-`unit_cost` PERSIS sama dengan `unit_cost_fifo` faktur asal (termasuk presisi 4 desimal)
- [x] BE: barang retur **selalu masuk `BAD_STOCK`** lewat `StockRecorderService.recordIn()`
  (lot BARU, bukan `transfer()` — beda dari mutasi gudang), tidak pernah kembali ke stok jual
- [x] BE: jurnal (`Retur Penjualan` D DPP / `PPN Keluaran` D bila ada / `Piutang atau Kas` K
  total / `Persediaan` D + `HPP` K harga pokok asli) + `settlement_type`
  (`REDUCE_INVOICE`/`CASH`, `cashAccountId` divalidasi `is_cash_account`). **Tidak ada akun
  "Selisih"** (beda dari Retur Pembelian) — angka DPP/PPN/HPP semuanya turunan, bukan
  negosiasi. Akun "Retur Penjualan" (`04.110.00002`) diberi flag singular baru
  `is_sales_return_account` (migration `1785080602956`, pola sama `is_purchase_return_diff_account`)
- [x] BE: **retur parsial per qty** didukung (bukan cuma seluruh baris) — PPN Keluaran &
  diskon faktur diprorata lewat **tarif efektif faktur asli sendiri**
  (`invoiceDiscountRatio`/`effectiveVatRate` dari `subtotal`/`invoiceDiscountAmount`/
  `outputVatAmount` yang SUDAH tersimpan di faktur, bukan `tax_rates` hari ini) — keputusan
  eksplisit user (AskUserQuestion) sebelum implementasi, dipilih di atas alternatif "hitung
  ulang pakai tarif hari ini" dan "batasi ke retur baris utuh". Properti yang diuji: retur
  SELURUH baris pada qty penuh mereproduksi `total_amount` faktur asal PERSIS
- [x] BE: kunci-cetak penuh disiapkan (`sales_returns` ditambah ke `PRINT_LOCK_TABLES`),
  hanya `registerPrint()` (cetak ulang bebas) di-wire — **EDIT/VOID sengaja ditunda**,
  pola sama Retur Pembelian Hari 16 (tidak ada `VoidModule`/`ActionType` baru)
- [ ] FE: halaman Retur Penjualan + cetak A5 + kunci cetak — **di luar lingkup prompt ini**
  (BE-only), menyusul prompt berikutnya
- 🛑→✅ **Keputusan user sebelum implementasi (AskUserQuestion), dua celah spesifikasi
  yang ditemukan saat riset:**
  1. Proration PPN/diskon faktur untuk retur parsial (tidak ada di CLAUDE.md secara
     eksplisit) → **tarif efektif faktur asli** (lihat di atas), bukan tarif hari ini,
     bukan pembatasan ke baris utuh saja.
  2. DoD asli menyebut `paid_amount tidak pernah melebihi total_amount` — **tidak ada
     kolom/tabel `paid_amount` sama sekali hari ini** (modul Pembayaran Hari 26-27 belum
     dibangun, `sales_invoices` tidak punya kolom itu). Ditafsirkan sebagai **validasi
     kumulatif**: `SUM(sales_returns.total_amount)` non-VOID atas satu faktur tidak boleh
     melebihi `sales_invoices.total_amount` faktur itu — dibuktikan test dengan baris
     `sales_returns` sintetis yang sengaja disuntik lewat SQL langsung (mengisolasi guard
     ini dari pengecekan sisa-qty per baris). **Bukan tebakan** — pengganti sementara
     sampai Payment module ada, dicatat eksplisit supaya tidak disangka selesai penuh.
- **DoD:** retur tanpa faktur asal → ditolak ✅; lot BS ber-`unit_cost` sama persis dengan
  `unit_cost_fifo` faktur asal ✅ (diuji sampai presisi 4 desimal, `12345.6789`); "faktur
  lunas dengan `CASH` → jurnal kas benar dan retur tidak pernah melebihi total faktur asal"
  ✅ **sesuai tafsir kumulatif di atas** (validasi `paid_amount` literal belum bisa diuji,
  menunggu Payment module) — jurnal CASH dibuktikan mengkredit akun kas yang dipilih, TANPA
  tag `customerId` (beda dari REDUCE_INVOICE yang WAJIB tag `customerId` di baris Piutang,
  invarian Hari 18). **13 test baru** (`sales-returns.service.spec.ts`, real Postgres, faktur
  asal di-seed langsung lewat repository — bukan lewat `SalesInvoicesService.create()` — supaya
  angka `subtotal`/`invoiceDiscountAmount`/`outputVatAmount`/`unitCostFifo` bisa dikontrol
  presisi untuk menguji rumus prorata secara terisolasi): retur tanpa faktur ✅, retur atas
  faktur VOID ✅, lot unit_cost persis ✅, qty melebihi sisa (sekaligus & berturut-turut) ✅,
  retur penuh mereproduksi total exact ✅, retur parsial dengan prorata PPN+diskon (dihitung
  manual: DPP 45.000, PPN 4.950, total 49.950) ✅, validasi kumulatif ✅, `settlementType`
  CASH wajib/terlarang `cashAccountId` + validasi `is_cash_account` ✅, jurnal CASH vs
  REDUCE_INVOICE (tag `customerId`) ✅, baris bonus (`unit_price=0`/`unit_cost_fifo=0`) →
  sukses tanpa jurnal sama sekali (stok tetap berpindah) ✅, `registerPrint()` bebas ✅,
  OPERATOR bisa membuat retur (bukan cuma MASTER) ✅. `npm run build`/`lint` BE 0 error;
  `npm run test` BE **221/221 sendirian per-suite** (233 kalau dihitung 13 baru + 220 lama;
  1 kegagalan pra-ada saat suite PENUH dijalankan bareng —
  `journal-poster.service.spec.ts` race `document_counters` lintas-suite, dikonfirmasi
  ulang lulus 10/10 sendirian, tidak disebabkan perubahan hari ini karena file itu tidak
  disentuh — pola sama yang sudah tercatat sejak Hari 20/21/22); migration `1785080602955`
  dan `1785080602956` `up→down→up` bersih (diverifikasi 2x berturut-turut di `omega_dev`).
  `five-invariants.spec.ts` (Hari 11) tetap **5/5 hijau** setelah modul ini ada. `GET /health`
  200. Flag `is_sales_return_account` dikonfirmasi tepat SATU akun aktif (`04.110.00002`
  "Retur Penjualan") lewat query langsung. Data uji dibersihkan sendiri oleh `afterAll`
  (dikonfirmasi `SELECT COUNT(*) FROM sales_returns` = 0 setelah test run).
  **Verifikasi manual HTTP tidak dilakukan lewat curl+login** (tidak ingin mereset password
  user dev `master`/`operator`/`supervisor` yang sudah ada) — sebagai gantinya, wiring
  guard/controller dikonfirmasi lewat: (a) `GET /sales-returns` tanpa token → `401` (rute
  ada, guard aktif, dikonfirmasi di server dev yang sedang jalan), (b) `@Roles(MASTER,
  OPERATOR)` di controller adalah pola identik `PurchaseReturnsController` yang sudah
  terbukti benar di produksi. Dicatat sebagai keterbatasan verifikasi, bukan disembunyikan.

**Hari 23A** ⏸ — **DITUNDA KE PASCA-MVP** (§7) · bekas rencana 16 Agu
- [ ] BE: `accounting_periods` + **tutup bulan oleh MASTER**
- [ ] BE: **closing** — akun laba-rugi ditutup (tidak terbawa), akun neraca saldo akhir →
  saldo awal bulan berikutnya
- [ ] BE: **pembayaran & retur atas faktur bulan tertutup tetap jalan** (yang diblokir hanya
  edit & VOID) — ada test khususnya
- [ ] BE: **satu validator bersama** yang menggabungkan backdate maks 2 hari **dan** periode
  tertutup — dipanggil semua modul transaksi
- [ ] BE: setelah ditutup: edit **dan** VOID dokumen bulan itu sama-sama ditolak; tidak ada
  transaksi baru bertanggal di dalamnya
- [ ] BE: **buka kembali** oleh MASTER — alasan wajib, masuk `audit_logs`, periode diberi
  **penanda permanen** di daftar
- [ ] FE: halaman Periode + peringatan eksplisit bahwa laporan yang sudah diserahkan bisa berubah
- **DoD:** VOID dokumen bulan tertutup → ditolak; VOID dokumen bulan **berjalan** atas dokumen
  lama tetap jalan dan jurnal pembaliknya **bertanggal hari ini** sehingga angka bulan tertutup
  tidak bergerak sepeser pun

### Fase 6 — Pengiriman & Pembayaran (Hari 24–28) · 17–21 Agustus

**Hari 24** ♻️ — Rencana: 16 Agu · Aktual: `26 Agu 2026` (BE pagi, FE sore, keduanya
selesai hari yang sama)  *(v2: Hari 21)*
- [x] BE: `agents`, `vehicles` + CRUD (tetap dibangun — surat jalan membawa keduanya
  meski rekap setoran dipotong)
- [x] BE: `delivery_orders`(+lines) + nomor `SJ`
- [x] FE: halaman Agen, Kendaraan
- [x] FE: tombol "Buat Surat Jalan" di detail Faktur Penjualan (hanya faktur `PENGIRIMAN`)
- **DoD:** surat jalan terbentuk dari faktur bersaluran `PENGIRIMAN`, membawa agen & kendaraan

**Hari 25** ♻️ — Rencana: 17 Agu · Aktual: `26 Agu 2026`  *(v2: Hari 22)*
- [x] BE: endpoint surat jalan + status (`PENDING`/`DELIVERED`/`POSTPONED`/`RETURNED`)
- [x] FE: halaman Surat Jalan + **cetak A5** + ikut kunci cetak
- **DoD:** status `POSTPONED` muncul sebagai daftar "belum terkirim" ✅ (filter
  `?deliveryStatus=POSTPONED`, dipakai ulang dari `GET /delivery-orders`, bukan endpoint
  terpisah); surat jalan yang sudah dicetak tidak bisa diedit tanpa batal cetak ✅ (412
  sungguhan dibuktikan di browser, lihat §4)

**Hari 26** ⚠️ — Rencana: 18 Agu · Aktual: `29 Agu 2026` (BE+FE step 1, penuh)  *(v2: Hari 23)*
- [x] BE: `payment_batches` + `payment_batch_methods` + `payments` — **TANPA**
  `customer_id`/`supplier_id`/`agent_id`/`vehicle_id` di header (lihat catatan ✅ di bawah,
  keputusan §2.12 ditutup 29 Agu 2026 menggantikan baris lama di atas)
- [x] BE: `POST /payments/preview-allocation` (FIFO per party, tolak overpayment, akun kas
  divalidasi `is_cash_account` lewat `AccountResolverService`, TIDAK menulis apa pun ke DB)
- [x] FE: Payment step 1 — pilih pihak + input **multi-metode**, preview alokasi murni dari
  endpoint (nol perhitungan alokasi di FE) — lihat §4 untuk detail komponen/halaman
- ✅ **🛑 lama sudah tertutup**: tiga pertanyaan (setoran sopir, pembayaran sebagian,
  pembayaran lintas faktur) dijawab `KONTEKS_REVISI_2026-07-28.md` §2.12 (29 Agu 2026,
  dari screenshot `penerimaan-kas`/`pengeluaran-kas`) — **BUKAN** lewat `agent_id`/
  `vehicle_id` di header seperti tercantum di baris lama, tapi lewat: (1) `payment_batches`
  TANPA party wajib di header — satu batch boleh lintas banyak pelanggan/supplier, party
  di-resolve per baris dari faktur; (2) `agent_id`/`vehicle_id` DIBUANG total — rekap sopir
  adalah laporan penjualan (Hari 30, ⏸ pasca-MVP), bukan urusan skema Payment. Baris [ ]
  lama di atas (sebelum edit ini) masih menyebut `agent_id`/`vehicle_id` — itu draft
  sebelum keputusan ini, sudah diganti implementasinya sesuai §2.12, BUKAN sesuai teks lama.
  **Keputusan kerja, belum dikonfirmasi ke klien sungguhan** — lihat draft pertanyaan di §3.
- **DoD:** 30 jt kas + 50 jt transfer atas tagihan 100 jt → preview benar, sisa 20 jt
  outstanding ✅ (dibuktikan test `payments.service.spec.ts` + manual curl end-to-end,
  lihat §4); overpayment (200 jt atas tagihan 100 jt) → 400 ✅; preview tidak menulis ke
  `payment_batches`/`payment_batch_methods`/`payments` ✅

**Hari 27** ⚠️♻️ — Rencana: 19 Agu · Aktual: `30 Agu 2026`  *(v2: Hari 24)*
- [x] BE: `POST /payments/confirm` (multi-metode, AR + AP simetris, satu transaction)
- [x] BE: **selisih pembayaran** — hanya muncul saat `settleInFull:true` eksplisit dari
  operator; pembayaran sebagian bukan selisih. **Satu akun `Selisih Pembayaran`
  (`07.210.00004`), dipakai dua arah** lewat flag baru `is_payment_diff_account`
- [x] BE: selisih di atas **Rp 10.000** otomatis **ditandai** (`payment_discrepancy_flagged`)
  di faktur (ditandai, **bukan** diblokir, **bukan** minta step-up) — layar pengecekan
  supervisor sendiri (Hari 22A) masih belum dibangun, tapi kolomnya sudah terisi benar
- [x] BE: VOID payment batch lewat `VoidEngineService` + `PaymentBatchVoidHook` baru
- [x] FE: Payment step 2 — alokasi **dapat diedit manual** (`GET /payments/open-invoices`
  baru, daftar penuh tidak dibatasi FIFO seperti preview Hari 26), dialog konfirmasi
  selisih dengan arah eksplisit sebelum submit, riwayat batch (`GET /payments` list +
  detail), kwitansi cetak A5 (turunan `PANDUAN_UI.md` §13.1, tidak ada foto §13.3)
- [x] BE tambahan (diminta FE, di luar teks tugas literal — lihat keputusan di §3):
  `GET /payments` (list, raw SQL derivasi `invoice_type`/`party_names`), `GET
  /payments/:id` (detail + baris + metode), `POST /payments/:id/print` (`PrintLockService`
  wired ke `payment_batches`), `voidBatch()` diperluas dengan gerbang UNLOCK_PRINT
- ✅ **🛑 lama sudah tertutup**: baris ini merujuk balik ke Hari 26, yang sendiri sudah
  ditutup §2.12 (lihat catatan Hari 26 di atas) — tidak ada pertanyaan baru untuk klien hari ini
- **Ditambahkan di luar teks tugas literal, keduanya invarian CLAUDE.md yang wajib
  (dikonfirmasi ke user sebelum dikerjakan, lihat §3)**: (1) **CASH_OUTFLOW step-up**
  (§5) untuk Pengeluaran Kas dari akun `requires_outflow_approval` di atas ambang —
  token per baris metode (`methods[].authorizationRequestId`), bukan header tunggal,
  karena satu batch bisa punya >1 akun kas/bank; (2) **VOID_DOCUMENT step-up** (§2.13)
  untuk VOID oleh OPERATOR, pola persis `SalesInvoicesService.voidInvoice()` minus
  gerbang UNLOCK_PRINT (Payment belum ikut kunci cetak).
- **DoD:** tagihan 33.253.125 dibayar 33.253.000 → lunas, selisih 125 masuk akun Selisih
  Pembayaran sisi debit; dibayar 33.254.000 → lunas, 875 masuk sisi kredit; keduanya balance ✅
  (dibuktikan test + manual curl end-to-end, lihat §4); pembayaran sebagian → tidak ada baris
  selisih ✅; selisih Rp 15.000 → ditandai, tidak diblokir ✅; VOID membalik seluruh alokasi
  dan jurnalnya ✅
- **DoD FE:** alokasi hasil edit manual tersimpan sesuai editan, bukan hasil FIFO ✅
  (dibuktikan manual browser E2E — lihat §4: alokasi diarahkan ke faktur **lebih baru**
  `JL/BROWSER27-0002`, faktur lebih lama `JL/BROWSER27-0001` sengaja dilewati, dan baris
  itulah yang tersimpan); selisih tampil dengan arah yang benar sebelum konfirmasi ✅
  (dialog "Konfirmasi Selisih Pembayaran" menunjukkan "Selisih 5.000 (kurang bayar)" sebelum
  submit); kwitansi A5 ✅ (halaman cetak dikonfirmasi render benar; registrasi cetak sungguhan
  tidak dieksekusi via browser otomatis karena memicu `window.print()` — dialog native yang
  bisa mengunci sesi otomasi, lihat §3 — path `POST /payments/:id/print` dan gerbang kunci
  cetak pada `voidBatch()` sudah dibuktikan lewat unit test)

**Hari 28** ♻️🆕 — Rencana: 20 Agu · Aktual: `30 Agu 2026`  *(v2: Hari 25 — rekap setoran agen **dipotong**)*
- [x] BE: **Laporan Kontinuitas Nomor Dokumen** — per jenis per periode, menampilkan **setiap**
  nomor dari `0001` sampai terakhir terbit, statusnya, dan justifikasi VOID-nya
- [x] FE: halaman Laporan Kontinuitas + export Excel
- [x] ~~Rekap setoran agen~~ **dipotong** — penggantinya sudah dipastikan di kertas ✅
  30 Agu 2026: agen bertanggung jawab atas total uang invoice yang ia bawa, dicocokkan
  tiap sore bersamaan pelunasan, selisih jadi tanggungan agen. Tidak ada perubahan
  skema/kode (`KONTEKS` §4.4)
- **DoD:** VOID satu faktur di tengah lalu buka laporan → nomor itu **tetap muncul** dengan
  status VOID dan alasannya terbaca; tidak ada satu pun lubang nomor di antara `0001` dan terakhir

### Fase 7 — Laporan & Serah Terima (Hari 29–37) · 21–30 Agustus
> Hari 27–28 Agustus sengaja dikosongkan sebagai cadangan. Hari 36 & 37 dipatok di
> 29 & 30 Agustus karena saldo awal butuh angka sedekat mungkin dengan cut-over.

**Hari 29** — Rencana: 21 Agu · Aktual: `03 Sep 2026`  *(v2: Hari 26)*
- [x] BE: laporan stok per gudang (**satuan dipecah**: "12 dus 15 renceng", bukan desimal) —
  `GET /reports/stock`, hanya STORE/BAD_STOCK/Total (`StockReportsService`)
- [x] BE: **laporan barang titipan per pelanggan** (sumber `warehouse_mutations`) —
  `GET /reports/titipan`, pivot Nama Barang × Pelanggan (kolom dinamis)
- [x] BE: daftar titipan **muncul di proses stok opname** sebagai penjelasan selisih fisik —
  `GET /reports/stock-opname`, worksheet baca-saja **ditarik maju dari Hari 32** (keputusan
  user 03 Sep, lihat §3): qty sistem gudang STORE + rincian titipan per pelanggan; input
  fisik & selisih dihitung di FE, **tidak disimpan**. Versi tersimpan/beraudit dengan
  penyesuaian jurnal tetap milik Hari 32, belum dikerjakan.
- [x] FE: halaman Laporan Stok, Barang Titipan, + Stok Opname (`/laporan/stok`,
  `/laporan/titipan`, `/laporan/stok-opname`), kartu baru di `/laporan`
- ✅ **Isi laporan diputuskan langsung oleh user 03 Sep 2026** (bukan konfirmasi klien —
  lihat §1 & §3): Laporan Stok hanya 3 angka (Toko/BS/Total); Laporan Titipan format
  pivot Nama Barang × Customer. **Belum dikonfirmasi ke klien sungguhan**, pola sama
  seperti keputusan skema Payment Hari 26.
- **DoD:** stok 315 renceng dengan konversi 1 dus = 25 tampil sebagai "12 dus 15 renceng" ✅
  (dibuktikan `stock-reports.service.spec.ts`: 255 RENCENG dengan DUS=20 → "12 DUS 15
  RENCENG", dan manual browser dengan data dev asli); laporan titipan cocok dengan
  `warehouse_mutation_lines` ✅ (customer "Pak 1" / Royco 3 pcs, sesuai fixture Hari 22);
  titipan tampil sebagai penjelas di layar opname ✅ (diverifikasi manual: Fisik 67 vs
  Stok Sistem 70 dengan Titipan 3 pcs → Selisih -3 pcs, merah); `./scripts/verify.sh`
  tidak dijalankan langsung, tapi build BE+FE, lint, dan `npm run test` (264/264, backend)
  dijalankan terpisah dan hijau — lihat §3

**Hari 30** ♻️ — **Un-postponed & selesai 03 Sep 2026** atas instruksi user, keputusan kerja
**belum dikonfirmasi klien** (pola sama Payment §2.12) · bekas rencana 23 Agu  *(v2: Hari 27)*
- [x] BE: laporan penjualan (termasuk **per salesman**), piutang, hutang
- [x] FE: halaman laporan tsb
- **DoD:** laporan piutang memakai `customer.ar_account_id ?? default` lewat fungsi bersama
  yang sama dengan faktur — bukan query akun default langsung ✅ (lewat filter
  `is_receivable_account`, bukan `ar_account_id` literal — lihat §4)
- Ringkasan lengkap: `day30_summary.md` (root repo, dibuat sesi itu juga)

**Hari 31** ♻️ — **Selesai 04 Sep 2026** (setengah hari fitur + setengah hari utang teknis,
sesuai instruksi prompt)  *(v2: Hari 28)*
- [x] BE: **rekap kas harian per akun** (laporan biaya operasional tetap ⏸ pasca-MVP)
- [x] ~~Cash opname~~ **dipotong** — tidak dibangun
- [x] FE: halaman Kas (`/laporan/kas-harian`)
- **DoD:** rekap kas harian cocok dengan mutasi akun kas di buku besar untuk tanggal yang sama ✅
- **Utang teknis dilunasi**: validasi qty kumulatif titipan ≤ qty dibeli pelanggan
  (`WarehouseMutationsService.processTitipan()`, TODO sejak Hari 11/13, prasyarat
  `sales_invoice_lines` sudah ada sejak Hari 20) — lihat §3

**Hari 32** ♻️ — Rencana: 23 Agu · Aktual: `04 Sep 2026`  *(v2: Hari 29)*
- [x] BE: endpoint rekonsiliasi stok — `GET /reports/stock-reconciliation`
  (`StockReportsService.getStockReconciliationReport()`), memakai
  `StockRecorderService.reconcile()` (Hari 10, belum pernah punya endpoint
  pemanggil sampai hari ini): `SUM(stock_movements)` vs `product_stock_balance`
  per produk+gudang. Kolom Titipan (baris gudang STORE saja) memakai ulang
  `getTitipanRawRows()` yang sama dipakai Laporan Titipan/Stok Opname Hari 29
  — **catatan desain**: kolom ini konteks tambahan untuk pembaca laporan
  (sebagian "Saldo Sistem" gudang Toko sudah terjual & dititip), BUKAN
  penjelas kolom Selisih ledger itu sendiri — mutasi titipan sengaja tidak
  pernah menyentuh `stock_movements`/`product_stock_balance` (CLAUDE.md §3
  "Gudang"), jadi ia matematis tidak bisa menyebabkan ledger != cache. Selisih
  ledger yang sebenarnya (bug integritas) tidak pernah "dijelaskan" apa pun —
  wajib 0 di DB sehat. Worksheet fisik-vs-sistem yang DoD lama maksud sudah
  dibangun Hari 29 (`GET /reports/stock-opname`, ditarik maju) — tidak
  diduplikasi di sini.
- [x] ~~Laporan retur & stok minus~~ **dipotong** — `docs/queries.md` (baru):
  2 query SQL teruji (stok minus dari `product_stock_balance`; retur `RJ`+`RB`
  gabungan `sales_returns`/`purchase_returns` via `UNION ALL`, enum di-cast
  `::text`). Diuji langsung lewat `psql` terhadap `omega_dev` sebelum ditulis
  ke file — lihat §3.
- [x] FE: halaman Rekonsiliasi Stok (`/laporan/rekonsiliasi-stok`) + kartu
  baru di `/laporan`. Baris berselisih (`hasDifference`) ditandai merah
  (`rowClass` DataTable) + badge ringkasan jumlah baris berselisih di header;
  kolom Titipan (penjelas) dirender sama seperti Stok Opname Hari 29 (total +
  detail per pelanggan di baris kedua). Export Excel lewat `<ExportButton>`
  (pola sama `/laporan/stok`).
- **DoD:** endpoint mengembalikan `difference: 0` untuk semua baris pada
  `omega_dev` saat ini (dikonfirmasi manual: `psql` query ledger-vs-balance
  0 baris tidak cocok, DAN `curl` langsung ke endpoint sungguhan setelah
  login `master`/`master` — semua `differenceText` tampil `-`) ✅; integration
  test baru (`stock-reports.service.spec.ts`, Postgres asli) membuktikan
  kasus TIDAK sehat juga terdeteksi (`product_stock_balance`=90 vs
  `SUM(stock_movements)`=100 → `difference: -10`, `hasDifference: true`) dan
  kolom Titipan HANYA terisi untuk baris gudang STORE, kosong (`'-'`, `[]`)
  untuk BAD_STOCK/produk yang tidak pernah dititip — 3 test baru, 6/6 lulus
  di file ini, suite penuh backend **284/284 lulus** ✅; `docs/queries.md`
  kedua query dijalankan sungguhan via `psql -d omega_dev` sebelum ditulis ke
  file (bukan dikarang) ✅.

**Hari 32A** 🆕 — Rencana: 05 Sep · Aktual (BE+FE): `20 Sep 2026` (via paket R10)  *(sisipan baru, lihat §0/§0.1/§1/§3 05 Sep)*
- [x] BE: `chart_of_accounts` — flag `restricted_to_master` (baru) = true pada
  `06.110.00001 B. Gaji Salesman`; flag `is_employee_receivable_account` (baru)
  = true pada `01.120.00002 Piutang Karyawan`. **Bukan migration akun baru** —
  akunnya sudah ada sejak Hari 17A, ini cuma dua kolom+dua UPDATE
  (migration `1785080602972`)
- [x] BE: 2 akun baru di `06.110.xxx` (kode lanjutan `06.110.00010`/`00011`):
  `B. Ongkos Kirim Pembelian`, `B. Bongkar Barang Masuk` — dua ini TIDAK ada
  di 108 akun Hari 17A, genuinely baru (migration `1785080602973`, dicek dulu
  lewat `SELECT` sebelum menulis — tidak ada duplikat akun)
- [x] BE: `workers` (master baru, pola sama `salesmen`/`vehicles`) — seed
  `Icung`, `Firman` dari saldo Piutang Karyawan Juli (`COA_USULAN.md`)
  (migration `1785080602974`, CRUD `src/modules/workers/`)
- [x] BE: `operational_expense_lines` — kolom `worker_id` (FK `workers`,
  nullable) dan `vehicle_id` (FK `vehicles`, nullable) (migration `1785080602975`)
- [x] BE: `operational_expense_documents` — kolom `review_status` (enum,
  pola sama `SalesInvoiceReviewStatus`) + `PATCH /operational-expenses/:id/review`
  (migration `1785080602976`, `OperationalExpensesService.review()`)
- [x] BE: `PATCH /operational-expenses/lines/:lineId` baru (edit sebelum
  `review_status = DISETUJUI`; sesudah itu wajib VOID) —
  `OperationalExpensesService.updateLine()`: jurnal lama dibalik bertanggal
  **hari ini** (§2.2, BUKAN pengecualian K2 milik paket R6) lalu posting ulang
  bertanggal `expenseDate` dokumen (sourceType/sourceId tetap sama, jadi
  "entry aktif" berikutnya) — audit before/after otomatis lewat `@Audit`
- [x] BE: `findExpenseAccounts()` — tambah `isPostable: true` (bug ditemukan
  05 Sep: header/kategori EXPENSE ikut nongol di dropdown) + izinkan akun
  `is_employee_receivable_account = true` selain `EXPENSE` murni; OPERATOR
  tidak melihat `restricted_to_master` di dropdown maupun submit (400 defense
  in depth)
- [x] BE: entitas + migration `cash_transfers` (Pindah Buku Kas) + `DocumentType`
  baru `CASH_TRANSFER` kode `PB` di `DocumentCounterService` — **selesai
  duluan lewat paket R9** (20 Sep 2026, lihat log Hari 32A/R9 di §3), bukan
  dikerjakan ulang di sini
- [x] BE: `review_status` "setelah-fakta" untuk `cash_transfers` — BUKAN StepUp
  412 (beda dari `CASH_OUTFLOW`), transaksi jalan dulu baru ditandai
  (selesai lewat R9, sama seperti poin di atas)
- [x] BE: `GET /reports/operational-expenses?month=YYYY-MM` — rekap per akun
  EXPENSE (Nama Biaya | Jumlah + Grand Total), Kasbon/Piutang Karyawan TIDAK
  ikut (bukan biaya), baris VOIDED tidak ikut, akun tanpa transaksi bulan itu
  tidak ditampilkan (`OperationalExpenseReportService`)
- [x] BE (tambahan revisi klien, paket R10): `POST /operational-expenses/batch`
  — entri multi-baris, `expenseDate`+`cashAccountId` GLOBAL, seluruh baris
  SATU DB transaction (gagal di baris manapun → rollback penuh, dibuktikan
  `SELECT COUNT` = 0). Endpoint satu-baris lama (`POST /operational-expenses`)
  tetap ada, tidak dihapus.
- [x] FE (paket R10, 20 Sep 2026): modal entri `kas-bank/biaya-operasional/
  index.vue` diubah dari SATU baris per simpan jadi **repeater** —
  `DocumentModal` (header tanggal+akun kas global, default Kas Kecil) +
  toolbar Entri/Ubah/Hapus + `DataTable` lokal + `LineModal` per baris,
  satu kali Simpan → `POST /operational-expenses/batch`. **Pola dipilih**
  (bukan `CrudFormPage.repeaterColumns`): `RepeaterColumnDef` tidak punya
  visibilitas PER BARIS, sedangkan kebutuhan hari ini (Kendaraan/Pekerja
  muncul tergantung akun BARIS itu sendiri) persis kebutuhan yang sudah
  dipecahkan `LineModal` untuk toggle "Bonus" Faktur Pembelian — pola yang
  sudah ada, bukan pola ketiga. Diverifikasi manual di browser: 4-baris
  masuk satu bukti, batal di satu baris → 0 baris tersimpan (pesan
  "Baris ke-N: ...").
- [x] FE: kolom Kendaraan (dropdown `vehicles`, hanya kendaraan aktif dari
  `GET /vehicles`, TIDAK di-hardcode) muncul di `LineModal` saat akun
  BBM/Servis/Suku Cadang/Pajak Kendaraan dipilih — diverifikasi manual
  (D-8327 TD & F 8746 SR ditambahkan lewat CRUD Kendaraan, tampil di dropdown)
- [x] FE: dropdown Pekerja (`workers`) untuk baris Gaji Tukang Angkut &
  toggle Kasbon; `B. Gaji Salesman` disembunyikan dari dropdown akun untuk
  OPERATOR (`findExpenseAccounts(role)` BE sudah menyaring, FE tinggal pakai)
- [x] FE: halaman/menu **Pindah Buku Kas** — **selesai duluan lewat paket R9**
  (`kas-bank/pindah-buku/index.vue`), tidak dikerjakan ulang di sini
- [x] FE: toggle **Kasbon** di `LineModal` Biaya Operasional (BUKAN tab
  halaman terpisah — toggle per-baris, karena satu bukti/hari bisa campur
  baris biasa & Kasbon) — akun terkunci ke `01.120.00002 Piutang Karyawan`,
  Pekerja WAJIB. Endpoint baru `GET /operational-expenses/employee-
  receivable-account` (BE) ditambahkan supaya OPERATOR bisa membaca akun ini
  (tidak ikut `/expense-accounts`, itu cuma EXPENSE)
- [x] FE: tombol **Ubah** per baris di slideover detail, aktif hanya kalau
  `document.reviewStatus !== 'DISETUJUI'` (`canEditLine()`) — PATCH
  `/operational-expenses/lines/:lineId`, diverifikasi lewat test BE
  (`operational-expenses.service.spec.ts`, edit sebelum/sesudah DISETUJUI)
- [x] FE: tab tambahan **"Biaya Operasional"** di halaman Pengecekan Invoice
  Harian (`pengecekan-invoice/index.vue`) — pola generik yang sama dipakai
  ulang (`DocType` ditambah `'OPERATIONAL_EXPENSE'`), TIDAK fork halaman
  baru. "Pindah Buku Kas" sudah ada dari R9. Diverifikasi manual: Setujui
  bekerja, badge & baris hilang dari filter Belum Dicek setelah disetujui.
  **Bug ditemukan & diperbaiki saat verifikasi**: baris Kasbon tampil UUID
  mentah di kolom Akun Biaya (map akun tidak menyertakan akun Kasbon) — fix:
  muat `/operational-expenses/employee-receivable-account` juga di halaman ini.
- [x] FE: halaman **Laporan Biaya Operasional** (`/laporan/biaya-operasional`),
  pola generik §14 PANDUAN_UI (`<UInput type="month">` + tabel + `<ExportButton
  :formats="['xlsx']">` tanpa PDF) + kartu baru di `/laporan/index.vue`.
  Diverifikasi manual: Kasbon tidak ikut rekap, GRAND TOTAL benar.
- **DoD:** lihat `docs/PROMPTS_HARIAN.md` Hari 32A — seluruhnya terpenuhi
  kecuali tab Pengecekan untuk transaksi non-Biaya-Operasional (di luar
  lingkup, sudah ada sejak R9/Hari 22A)

**Hari 33** ⚠️♻️ — Rencana: 24 Agu · Aktual: `____`  *(v2: Hari 30)*
- [ ] Deploy: **Postgres native + NestJS sebagai Windows service (`nssm`) + nginx** untuk FE
  statis (`ssr: false`). **Tanpa Docker** — `docker-compose.yml` tetap di repo untuk pindah mesin
- [ ] Tuning Postgres: `shared_buffers 1GB`, `effective_cache_size 3GB`, `checkpoint_timeout 15min`,
  `checkpoint_completion_target 0.9`, `max_wal_size 2GB`, `random_page_cost 4.0`,
  **`synchronous_commit` tetap `on`**
- [ ] Matikan restart otomatis Windows Update; `pg_dump` terjadwal **di luar jam kerja**;
  Postgres & NestJS auto-start
- [ ] **UPS terpasang dan diuji** (cabut listrik → mesin tetap hidup → shutdown rapi)
- [ ] BE: export **Excel** seluruh laporan (~~PDF~~ **dipotong**)
- **DoD:** cabut listrik saat 3 faktur sedang diinput → setelah listrik kembali, DB konsisten
  dan tidak ada dokumen setengah jadi; reboot mesin → aplikasi hidup sendiri tanpa disentuh

**Hari 34** — Rencana: 25 Agu · Aktual: `____` — **BUFFER**
- [ ] Perbaikan temuan UAT minggu 1–4

**Hari 35** — Rencana: 26 Agu · Aktual: `____`  *(v2: Hari 32)*
- [ ] BE: audit RBAC/Permission Matrix lintas endpoint (`CLAUDE.md` §5)
- [ ] FE: audit Permission Matrix lintas halaman
- **DoD:** login sebagai SUPERVISOR → hanya 3 menu terlihat, tidak ada dashboard, semua
  endpoint tulis faktur → 403; login sebagai OPERATOR → COA 403, supplier ter-mask

**Hari 36** — Rencana: 29 Agu · Aktual: `____` — **BUFFER TERPAKAI: INPUT SALDO AWAL**
- [ ] Input saldo awal stok, piutang, hutang — bertanggal **1 September 2026**
- [ ] `GET /opening-balance/verify` selisih 0; invarian 1–5 hijau **setelah** saldo awal masuk
- [ ] Rencana penyesuaian selisih 29–31 Agustus disepakati klien dan dicatat di §3

**Hari 37** — Rencana: 30 Agu · Aktual: `____`  *(v2: Hari 34)*
- [ ] Smoke test end-to-end (login → semua modul → logout)
- [ ] **Dokumentasi setup & deploy** + prosedur restore backup
- [ ] Serah terima + Checklist Go-Live + repo dipindah ke akun klien
- **DoD:** klien menjalankan restore dari `pg_dump` **sendiri** dengan panduan tertulis, tanpa
  dibantu — kalau tidak bisa, backup itu tidak nyata

---
## 3. Catatan Harian & Hambatan

Isi hanya kalau ada yang meleset atau ada keputusan baru. Kosong = lancar.

| Tgl | Hari ke- | Kejadian | Dampak jadwal | Tindakan |
|---|---|---|---|---|
| 26 Jul 2026 | 1 | Mesin dev hanya 7.7GB RAM (sering <1GB free). Docker Desktop jalan bareng build Nuxt/Vite memicu crash `memory allocation failed` (esbuild/Vite OOM) — sudah dibuktikan gagal saat Docker jalan, sukses setelah Docker dimatikan. | Tidak ada drift, tapi menetapkan konvensi dev harian. | Postgres native Windows (port 5432) jadi DB dev harian, bukan Docker. `docker-compose.yml` tetap di repo untuk deploy ke mini PC nanti (dipetakan ke port 5433 agar tidak bentrok kalau harus jalan bareng Postgres native). `scripts/verify.sh` diubah untuk cek Postgres native langsung, bukan lewat `docker compose exec`. |
| 27 Jul 2026 | 4 | §1 "Keputusan hosting final" dibutuhkan **sebelum Hari 4** — sampai akhir Hari 4 masih ⏳ (sementara asumsi mini PC lokal, sesuai default plan). | Belum ada drift jadwal (deploy Docker baru dipakai Hari 30+), tapi risiko menumpuk kalau dibiarkan sampai mendekati Hari 30 (pengadaan mini PC+UPS). | Tanyakan ulang ke klien besok; kalau masih belum ada jawaban di Hari 10 (buffer Fase 2), eskalasi jadi blocker eksplisit. |
| 27 Jul 2026 | 6 | Migration `CreateJournalEntries` sempat lupa dijalankan (`npm run migration:run`) di DB dev `omega_dev` setelah dibuat — ketahuan lewat integration test yang gagal `relation "journal_entries" does not exist"`, bukan lewat `verify.sh` (skrip itu cuma menguji up→down→up di DB sementara, tidak menerapkan ke DB dev harian). | Tidak ada drift, tapi berpotensi berulang tiap migration baru kalau tidak diingat manual. | Jalankan `npm run migration:run` manual segera setelah bikin migration baru, sebelum lanjut coding fitur yang bergantung padanya. Pertimbangkan tambah langkah ini ke `verify.sh` atau checklist DoD kalau kejadian lagi di Hari 7+. |
| 27 Jul 2026 | 5 & 6 | Verifikasi FE untuk kedua hari ini (Suppliers/Warehouses/ExportButton Hari 5; COA tree + Jurnal Hari 6) baru lewat pembacaan kode + kontrak API asli — ekstensi Chrome browser automation tidak konek di sesi ini. | Tidak ada drift jadwal, tapi risiko kualitas: bug visual (styling, expand/collapse tree, drawer, download filename) baru ketahuan belakangan. | Servers BE (`:3000`)/FE (`:3001`) ditinggal jalan; **wajib** uji manual di browser sebelum halaman-halaman ini dianggap benar-benar final — jadwalkan sesegera ekstensi Chrome konek lagi. |
| 28 Jul 2026 | — | **Sesi revisi klien sepanjang hari.** Sebelas putaran tanya-jawab menghasilkan perubahan yang menyentuh aturan terkunci: pembulatan dicabut, PPN masukan dikapitalisasi, penomoran dokumen ganti format, kunci cetak, tutup bulan, pengawasan supervisor, bad stock naik jadi simpul, dan volume transaksi terkoreksi dari 50–100/hari jadi 11–12/hari. Tidak ada baris kode ditulis. | **−1 hari kalender**, dan keunggulan 5 hari habis dipakai membiayai beban revisi ≈10,35 hari. | `CLAUDE.md` naik ke v2, `KONTEKS_REVISI_2026-07-28.md` dibuat, `PROGRESS.md` & `PROMPTS_HARIAN.md` naik ke v3 dengan spine digeser +3 untuk rework Hari 7–9. |
| 29 Jul 2026 | 7 | Penomoran hari berubah: rework menempati Hari 7–9, seluruh hari setelahnya bergeser +3, dan scope BARU masuk lewat hari sisipan berhuruf (22A, 23A) supaya tidak ada pergeseran kedua. Total jadi 37 hari + 2 sisipan. | Cut-over **tidak** bergerak — pergeseran diserap keunggulan 5 hari. Hari terakhir 30 Agu, menyisakan 31 Agu sebagai cadangan. | Peta penomoran ditaruh di §0.1. `CLAUDE.md` §7 & §8 masih menyebut "Hari 8" untuk integration test — **patch jadi Hari 11**. |
| 29 Jul 2026 | 7 | **Keputusan scope: posting jalan, pelaporan menyusul.** Klien setuju tutup bulan dan laporan dikerjakan setelah 30 Agustus. Yang ditunda: tutup bulan + closing (Hari 23A), laporan penjualan/piutang/hutang (Hari 30), laporan biaya operasional (bagian Hari 31), layar Jurnal Manual (bagian Hari 12). Jurnal tetap ditulis saat transaksi — itu tidak ditunda. | **+2,65 hari.** Margin pulih dari nol. Deploy (Hari 33) maju 2 hari ke 24 Agustus, dan 27–28 Agustus jadi cadangan kosong. | Prompt hari yang ditunda **disimpan utuh** bertanda ⏸, tidak dihapus. Backlog pasca-MVP dibukukan di §7. `PeriodLockValidator` tetap dibuat sebagai satu titik masuk meski baru memeriksa backdate. |
| 29 Jul 2026 | 7 | Klien menjelaskan mekanisme **closing**: akun laba-rugi ditutup dan tidak terbawa; akun neraca saldo akhirnya jadi saldo awal bulan berikutnya, dan buku besar dibuka dengan baris Saldo Awal. Contoh baku: piutang 5 jt tgl 29 → saldo akhir 5 jt kredit tgl 31 → saldo awal 5 jt debit tgl 1 → 5 jt kredit saat dibayar. | Menutup risiko terbesar yang sempat terbuka: pembayaran atas faktur bulan tertutup ternyata memang harus tetap jalan, dan itu sekarang tertulis sebagai aturan, bukan asumsi. | Masuk `CLAUDE.md` v3 §2.15 + §4. **Satu sub-keputusan masih terbuka**: baris Saldo Awal/Akhir itu jurnal sungguhan atau konstruksi tampilan — harus turun sebelum Hari 23A. |
| 29 Jul 2026 | 7 | Keputusan klien: saldo awal bertanggal **1 September 2026**, diinput di **Hari 36**; Sales Order **tidak** ikut kunci cetak. | Buffer Hari 36 habis terpakai — buffer tersisa tinggal Hari 34. | Hari 36 tidak lagi kosong. Saldo awal butuh pengecualian tanggal karena diinput 29 Agu untuk tanggal 1 Sep. |
| 29 Jul 2026 | 7 | Sisa aturan yang sudah dicabut ternyata masih hidup di hasil Hari 3: akun **Pendapatan Pembulatan** ikut ter-seed di COA dan `settings.rounding_multiple = 100` masih ada, padahal pembulatan sudah dicabut. Sebaliknya tiga akun yang dibutuhkan v2 belum ada: Diskon Penjualan (metode bruto), Selisih Pembayaran, Selisih Retur Pembelian. | Kalau ketahuan setelah Hari 21, jurnal penjualan pertama gagal karena akun kontra tidak ada. | Dimasukkan ke lingkup rework Hari 7. Akun yang sudah terlanjur dipakai di jurnal dev dinonaktifkan, bukan dihapus. |
| 29 Jul 2026 | 7 | Kode status step-up tidak konsisten: implementasi Hari 5 memakai **428**, `CLAUDE.md` §5 menetapkan **412**. | Dua kode untuk satu makna membuat frontend diam-diam punya dua jalur penanganan. | Diseragamkan ke **412** di rework Hari 9, termasuk guard lama, `<StepUpDialog>`, dan test. |
| 29 Jul 2026 | 7 | Dicek ulang saat eksekusi rework Hari 7: akun **Pendapatan Pembulatan** ternyata **0 pemakaian** di `journal_entry_lines` dev (bukan "terlanjur dipakai" seperti dugaan baris di atas). | Tidak ada risiko kehilangan histori jurnal. | Akun **dihapus beneran** (bukan dinonaktifkan) — koreksi atas rencana baris sebelumnya, yang tetap berlaku sebagai fallback andai suatu saat akun serupa sudah terlanjur dipakai. |
| 29 Jul 2026 | 7 | **Keputusan: `void_reason_code` bukan enum, cukup teks bebas ketikan** (sama seperti `void_reason_note`) — berbeda dari `KONTEKS_REVISI` §2.3 yang menulis "(enum)". | Tidak ada tabel dokumen yang perlu dimigrasi ulang kalau daftar alasan berubah nanti — cukup ubah label di FE. | Tidak ada kolom dibuat hari ini (belum ada tabel dokumen sungguhan, semua mulai Hari 14+); keputusan ini yang dipakai saat kolom itu ditambahkan ke tiap tabel dokumen nanti. `KONTEKS_REVISI` §2.3 dibiarkan sebagai arsip historis, tidak diedit ulang. |
| 29 Jul 2026 | 7 | `chart_of_accounts.account_type` untuk 3 akun baru (Diskon Penjualan, Selisih Pembayaran, Selisih Retur Pembelian) tidak ditentukan di manapun — CLAUDE.md/KONTEKS cuma mewajibkan akunnya ada. | Klasifikasi P&L keliru bisa membuat laporan laba-rugi salah kelompok. | Diputuskan: Diskon Penjualan → `INCOME` (kode 4104, ikut pola Retur Penjualan 4103 sesama kontra-pendapatan); Selisih Pembayaran → `EXPENSE` (5103); Selisih Retur Pembelian → `EXPENSE` (5104), karena keduanya dua-arah dan tidak pas di ASSET/LIABILITY/EQUITY. Tinjau ulang saat audit RBAC/laporan Hari 32 kalau ternyata keliru. |
| 29 Jul 2026 | 7 | Ditemukan tiga ketidakcocokan di dokumen sumber: (1) `CLAUDE.md` §2.4 memutuskan kode faktur pembelian `B1` tapi §3 masih menulis `PI`; (2) `KONTEKS` §2.1 menyebut kunci cetak 6 dokumen sementara §2.9 menaikkannya jadi 7 dengan `GD`; (3) `CLAUDE.md` §2.10 merujuk selisih pembayaran ke "§2.17" padahal itu aturan ke-18. | Tidak ada dampak jadwal kalau diputuskan sekarang; berpotensi jadi migrasi data kalau ketahuan setelah Hari 14. | Diputuskan: **`B1`**, **7 dokumen**, rujukan **§2.18**. Diterapkan di v3 kedua file. Perbaiki juga di `CLAUDE.md` saat sempat. |
| 30 Jul 2026 | 8 | Master **`units`** (satuan jual/beli) baru berdiri sebagai CRUD kecil berdiri sendiri — **belum di-FK** ke `products.base_unit`/`product_unit_conversions.unit_name`, keduanya masih free text seperti sejak Hari 3/4. Tidak diminta eksplisit di prompt Hari 8, dan konversi satu-tingkat-ke-base yang sudah ada sudah sesuai CLAUDE.md §3. | Kalau operator mengetik satuan bebas di form Produk (bukan pilih dari master `units`), typo satuan tidak akan tertangkap sampai FIFO/laporan stok. | Belum jadi masalah karena FE form Produk juga belum dikerjakan (susulan). **Putuskan sebelum FE Produk dibuat**: apakah `unitName`/`baseUnit` tetap free text atau diganti `unitId` FK ke `units`. |
| 30 Jul 2026 | 8 | Kode produk (barcode `YYMMDDXXXX`) yang dibangkitkan otomatis pakai **`product_code_seq` global** (tidak reset harian/bulanan) — beda pola dari `document_counters` (reset bulanan). Data contoh klien (`2401200034` = "produk ke-34") dibaca sebagai sequence global, bukan sequence per-hari. | Kalau ternyata `XXXX` seharusnya reset per hari (bukan global), kode yang sudah terbit hari ini perlu dipetakan ulang sebelum dipakai transaksi sungguhan (setelah itu terkunci, §2 CLAUDE.md). | Belum ada produk sungguhan bertransaksi — aman diubah sampai sebelum Hari 10 (Stock Recorder mulai mengunci kode). Konfirmasi ke klien kalau ragu. |
| 30 Jul 2026 | 8 | **`ProductsService.lockCode()`** dibuat sebagai titik masuk tunggal untuk mengunci kode produk, tapi **belum ada pemanggil produksi** — DoD hari ini dibuktikan dengan memanggilnya manual (test + `UPDATE` langsung di DB untuk smoke test manual), bukan lewat alur transaksi sungguhan (belum ada, mulai Hari 10). | Kalau lupa disambungkan nanti, kode produk tidak akan pernah terkunci meski sudah dipakai transaksi — kontrol §2 CLAUDE.md diam-diam tidak jalan tanpa error apa pun. | **Wajib disambungkan** begitu StockRecorder (Hari 10) atau Faktur Pembelian/Penjualan (Hari 14/21) menyentuh produk pertama kalinya. Catat sebagai syarat DoD hari-hari itu. |
| 30 Jul 2026 | 8 | Verifikasi browser FE Hari 8 sempat gagal login (`master`/`master` → 401) walau seed sudah pernah dijalankan Hari 2. | Tidak ada dampak jadwal — hanya blocker sesaat saat QA manual. | `npm run seed` dijalankan ulang (idempotent, "Diperbarui: master/supervisor/operator") sebelum login dicoba lagi, berhasil. Penyebab pasti tidak ditelusuri (kemungkinan hash password DB dev basi dari sesi lain) — kalau terulang, cek dulu apakah DB dev sudah pernah di-reset/restore tanpa re-seed. |
| 30 Jul 2026 | 9 | Prompt Hari 9 eksplisit **backend-only** — checklist asli `PROGRESS.md` juga mencantumkan "FE: antrian persetujuan menampilkan `context_summary`". | FE antrian persetujuan (dan halaman Authorization Requests yang lebih lengkap: antrian+modal approve) masih belum ada sama sekali — Hari 10 checklist sudah mencantumkan ini juga ("FE: halaman Authorization Requests, memakai `context_summary` Hari 9"), jadi tidak hilang, cuma menyatu ke Hari 10. | Item FE Hari 9 ditandai `[ ]` dengan catatan, bukan dihapus. Jangan kaget kalau Hari 10 FE-nya terasa "dobel" dengan baris ini — itu memang scope yang sama, cuma pindah hari. |
| 30 Jul 2026 | 9 | Payload matcher per actionType (CLAUDE.md §19) baru dibuat KONKRET untuk `CASH_OUTFLOW` (`{accountId, amount}`) dan `TEST_STEP_UP_ACTION` (selalu cocok). `VOID_DOCUMENT`/`UNLOCK_PRINT`/`SELL_BELOW_COST`/`BS_TO_STORE` sengaja **belum** didaftarkan — bukan lupa. | Kalau Hari 13/15/17/21 memanggil `StepUpService.requireApproval()`/guard dengan actionType itu sebelum menambah entry di `payload-matchers.ts`, `matchesApprovedPayload()` melempar Error murni (500, fail closed) — bukan diam-diam meloloskan payload apa pun. | **Wajib**: hari yang pertama kali memakai salah satu dari 4 actionType itu menambah entry `exactFields([...])` di `payload-matchers.ts` sesuai kontrak payload sungguhan hari itu, sebelum endpoint/aksinya dianggap selesai. |
| 30 Jul 2026 | 9 | `StepUpService` dibuat di `src/core/step-up/` (CLAUDE.md §6: engine service, terima `EntityManager` opsional dari pemanggil) — `AuthorizationRequestsService.create()`/`consumeApproval()`/`findOneOrFail()`/`applyLazyExpiry()` semuanya direvisi menerima `manager?: EntityManager` (pola sama `ArAccountResolverService.resolve()` Hari 8), supaya konsumsi approval ikut transaction bisnis pemanggilnya (rollback aksi VOID/kas besar nanti ikut membatalkan status EXECUTED). | Belum ada pemanggil produksi hari ini — dibuktikan lewat test yang sengaja membungkus `consumeApproval(..., manager)` dalam `dataSource.transaction()` yang di-rollback paksa, dan status tetap `APPROVED` (bukan `EXECUTED`) setelahnya (`authorization-requests.service.spec.ts`). | Pemanggil pertama menyusul Hari 13 (BS→STORE)/15 (UNLOCK_PRINT)/17 (CASH_OUTFLOW)/21 (SELL_BELOW_COST/VOID_DOCUMENT) — WAJIB memanggil `StepUpService.requireApproval()` dengan `manager` dari transaction yang sama dengan tulisan bisnisnya, bukan membiarkan default (tanpa manager) kalau aksinya menulis DB lain dalam transaction yang sama. |
| 30 Jul 2026 | 8 | **Bug laten ditemukan**: `useCustomerSchema.ts` (Hari 4) membaca `GET /chart-of-accounts` dengan asumsi bentuk `{data, meta}` (pola paginated seperti modul lain), padahal `ChartOfAccountsController.findAll()` (dibuat Hari 6) mengembalikan **flat array**. Tidak pernah ketahuan sebelumnya karena endpoint itu 404 sampai Hari 6, dan `CrudFormPage.loadOptions()` menelan error loader dengan aman (fail-silent, form tetap jalan tanpa field terisi) — begitu endpoint benar-benar ada dan dipanggil hari ini (FE form Produk/Customer pertama kali menyentuhnya sungguhan), field `arAccountId` akan selalu kosong tanpa error. | Kalau tidak ditemukan, MASTER tidak akan pernah bisa memilih akun piutang custom pelanggan — dropdown selalu kosong tanpa satu pun error terlihat, persis pola "silent failure" yang CLAUDE.md ingatkan berulang kali soal akun piutang (§3). | Diperbaiki hari ini sekaligus dengan gerbang MASTER-only: `res` dibaca langsung sebagai array, difilter `isActive && isReceivableAccount` di FE. Dibuktikan manual di browser — dropdown Master menampilkan tepat "1102 - Piutang Usaha". |
| 30 Jul 2026 | 9 | **Koreksi baris di atas**: prompt susulan sore ini mengklaim `<StepUpDialog>` "dari Hari 7 lama SUDAH ADA — jangan bikin komponen baru". Digrep dulu sebelum percaya — **0 hasil** di seluruh `frontend/app` untuk `StepUpDialog`/`428`/`requiresAuthorization`. FE step-up (dialog, antrian persetujuan) memang belum pernah dibangun sama sekali; baris tabel 30 Jul di atas (Hari 9, "menyatu ke Hari 10") sudah benar. | Kalau langsung dipercaya tanpa cek, akan mencoba "memperluas" komponen yang tidak ada. | Dibangun baru: `useStepUp.ts`, `<StepUpDialog>`, `usePayloadFormatter.ts`, `useClockTick.ts`, `pages/persetujuan/index.vue`. Detail lengkap di §4. |
| 30 Jul 2026 | 9 | DoD FE ("alasan wajib saat menolak", "operator melihat alasannya") ternyata **tidak bisa dipenuhi murni dari FE** — `reject()` backend tidak punya cara menyimpan alasan sama sekali, dan tidak ada endpoint bagi requester (OPERATOR) untuk mengecek status permintaannya sendiri (`GET /authorization-requests` di-`@Roles(MASTER, SUPERVISOR)`). | Kalau dipaksa FE-only, `<StepUpDialog>` operator tidak akan pernah tahu kenapa ditolak atau kapan disetujui — DoD gagal diam-diam. | Backend diperluas secukupnya: `reject()` sekarang wajib `reason` (menimpa kolom `reason` yang sama, bukan kolom baru); `GET /authorization-requests/:id` baru, digerbangi kepemilikan (requester sendiri ATAU MASTER/SUPERVISOR) di controller — ini yang dipoll dialog tiap 5 detik. 2 test lama disesuaikan + 2 test baru ditambah, 12 suite/51 test tetap hijau. |
| 30 Jul 2026 | 9 | **2 bug ditemukan lewat verifikasi manual browser** (bukan cuma baca kode): (1) `useClockTick`'s `setInterval` sempat jalan di SSR juga — Nuxt dev belum `ssr:false` (itu rencana Hari 33), sehingga muncul 500 "`setInterval` should not be used on the server"; (2) `closeDialog()` sempat me-reset SELURUH state modal (`contextSummary`/`phase`/`message`) serentak dengan menurunkan `open`, membuat modal "berkedip" balik ke tampilan "Menunggu Persetujuan" selama transisi keluar UModal (terlihat jelas di alur Batalkan). | Bug #1 mem-block seluruh halaman yang memakai countdown TTL (500 error, bukan cuma glitch visual). Bug #2 murni kosmetik tapi bisa membingungkan operator soal status sebenarnya saat modal menutup. | (1) Guard `import.meta.client` sebelum `setInterval`. (2) `closeDialog()` sekarang cuma menurunkan `open`; field lain dibiarkan sampai `withStepUp()` berikutnya menimpa `state.value` penuh saat modal baru dibuka. Keduanya cuma ketahuan lewat uji manual di browser sungguhan (dua tab + curl sebagai "supervisor kedua", karena cookie sesi dibagi satu profil browser per origin, bukan per tab) — tidak akan ketahuan dari `npm run build`/`lint`/`test` saja. |
| 31 Jul 2026 | 11 | **Riset sebelum coding menemukan bagian C prompt (wiring step-up dummy 412→approve→retry) sudah selesai dibangun & diuji Hari 9 susulan sore** (`POST /authorization-requests/test-step-up-action` + `authorization-requests.spec.ts`) — bukan pekerjaan baru. Juga: `journal_entries` sudah punya `source_type`/`source_id`/`is_reversal`/`reversed_entry_id` sejak Hari 6, dan `stock_cost_consumptions` sudah merekam lot mana+qty berapa yang dikonsumsi tiap movement sejak Hari 10 — keduanya persis yang dibutuhkan VOID Engine, tidak perlu dibangun ulang. | Kalau tidak dicek dulu, bagian C akan dikerjakan dobel dan VOID Engine akan menebak-nebak linkage yang sebenarnya sudah ada. | Bagian C hari ini hanya menjalankan ulang suite lama untuk memastikan masih hijau (memang hijau). VOID Engine dibangun murni di atas linkage yang sudah ada, tanpa migration untuk itu. |
| 31 Jul 2026 | 11 | **Keputusan desain: `void_reason_code`/`void_reason_note` disimpan di `journal_entries`** (2 kolom nullable baru, migration `1785080602933`, hanya terisi saat `is_reversal=true`) — bukan di tabel dokumen (belum ada satu pun tabel dokumen sungguhan hari ini, semua mulai Hari 14+). `voided_by`/`voided_at` **tidak** jadi kolom terpisah — dipetakan ke `created_by`/`created_at` baris reversal itu sendiri. | Melengkapi (bukan menggantikan) rencana CLAUDE.md §2.16 yang menaruh kolom sama di tiap tabel dokumen begitu tabel itu dibuat — kalau tidak dicatat di sini, bisa disangka dua rencana yang bertabrakan. | Modul dokumen Hari 14+ tetap menambah `void_reason_code`/`void_reason_note` di tabel masing-masing sesuai rencana asli §2.16 — dua tempat ini melengkapi, bukan saling menghapus. |
| 31 Jul 2026 | 11 | **Keputusan desain: `VoidEngineService` FAIL-CLOSED per `sourceType`** — hook (`checkVoidable`/`markVoided`) WAJIB didaftarkan lewat `registerHook()` sebelum `sourceType` itu dipakai untuk VOID, meniru pola `payload-matchers.ts` (`StepUpService`) yang sudah lebih dulu menganut fail-closed untuk `actionType` belum terdaftar. | Konsisten dengan pola yang sudah ada di codebase ini (bukan pola baru) — dan mencegah modul baru "lupa" mendaftarkan prasyarat VOID-nya sendiri tanpa satu pun error muncul. | Modul dokumen Hari 13+ (Mutasi Gudang) dan Hari 14+ (Pembelian, dst.) WAJIB memanggil `voidEngineService.registerHook(sourceType, this)` begitu tabel dokumennya ada, sebelum VOID atas dokumen itu bisa dipakai — kalau lupa, `voidDocument()` melempar Error jelas ("Belum ada VoidHook terdaftar"), bukan diam-diam meloloskan VOID tanpa cek prasyarat modul. |
| 31 Jul 2026 | 11 | Lingkup `VoidEngineService`/`reverseIn`/`reverseOut` **sengaja tidak mencakup** VOID untuk `transfer()` (mutasi gudang, dua movement sekaligus tanpa jurnal) atau dokumen tanpa jurnal sama sekali. **Sekarang dijaga eksplisit**: `reverseIn`/`reverseOut` menolak `movementType === TRANSFER` dengan pesan jelas ("belum didukung — akan dikerjakan Hari 13"), bukan cuma "belum ditest" — tanpa guard ini, movement transfer yang kebetulan berbagi `sourceType`/`sourceId` dengan dokumen lain bisa salah dibalik tanpa error. | `GD` (Mutasi Gudang) ikut 7 dokumen kunci cetak (§2.16) dan bisa saja perlu di-VOID — tapi tabelnya baru ada Hari 13. | **Wajib ditinjau saat Hari 13**: apakah `reverseTransfer()` perlu ditambah ke `StockRecorderService`, atau mutasi gudang punya jalur VOID sendiri di luar `VoidEngineService`. Jangan menebak sekarang — guard yang ada sekarang cuma mencegah salah baca, bukan implementasi. |
| 31 Jul 2026 | 11 | **Review-diri setelah DoD hijau menemukan 3 celah nyata sebelum diminta user**: (1) idempotensi VOID cuma `SELECT` biasa (bukan `FOR UPDATE`) — dua `voidDocument()` bersamaan atas dokumen yang sama bisa lolos keduanya; (2) VOID multi-movement (1 `sourceId`, beberapa `stock_movements` — kasus nyata faktur pembelian multi-baris Hari 14) belum pernah dites eksplisit; (3) guard `transfer()` di atas belum ada sama sekali saat pertama ditulis. | Race condition khususnya tidak akan pernah ketahuan dari test sekuensial biasa — butuh `Promise.allSettled` dua `voidDocument()` bersamaan untuk memaksanya muncul. | **(1)** Migration `1785080602934`: index unik parsial `journal_entries(reversed_entry_id) WHERE reversed_entry_id IS NOT NULL` sebagai penjaga terakhir level-DB, `void.service.ts` menangkap `QueryFailedError` dari constraint itu dan menerjemahkan ke pesan yang sama seperti pengecekan app-level. Juga: urutan `voidDocument()` dibalik supaya sesuai spesifikasi tugas asli (idempotensi/eksistensi DULU, baru hook prasyarat — sebelumnya kebalik). **(2)** Test baru: 1 `sourceId`, 2 produk/2 movement/2 lot, VOID sekali membalik keduanya. **(3)** Guard eksplisit ditambah (baris di atas) + test yang membuktikannya. Total test VOID Engine naik dari 6 jadi 9 (68→71 total). |
| 6 Agu 2026 | 12 | **Keputusan arsitektur: larangan Jurnal Manual ke Persediaan/Piutang/Hutang TIDAK ditaruh di `JournalPosterService.post()`** (satu-satunya jalur posting, dipakai bareng Saldo Awal yang justru wajib menulis ke akun-akun itu) — larangan hidup satu lapis di atas, di `JournalManualService` (modul baru `src/modules/journal-manual/`), lewat query flag baru `is_inventory_account`/`is_payable_account` (migration `1785080602935`, pola persis `is_receivable_account` Hari 4). Pelanggaran → **403** (`ForbiddenException`, bukan 400) sesuai DoD eksplisit prompt. | Kalau larangan ditaruh di `post()`, Saldo Awal ikut ditolak menulis ke Persediaan/Piutang/Hutang — padahal itu justru fungsi utamanya. | Endpoint baru: `POST /journal-entries/manual`. Controller class terpisah (`JournalManualController`) tapi **`@Controller('journal-entries')` prefix sama** dengan `JournalEntriesController` (read-only) yang sudah ada — Nest tidak konflik karena tidak ada tabrakan method+path (`GET /`, `GET /:id` di satu sisi; `POST /manual` di sisi lain). |
| 6 Agu 2026 | 12 | **`PeriodLockValidatorService` baru (`src/core/period-lock/`)** — diekstrak dari method privat `JournalPosterService.validateBackdate()` yang sebelumnya satu-satunya tempat validasi tanggal di seluruh kodebase (dikonfirmasi lewat grep penuh `src/` sebelum mulai — tidak ada duplikasi di modul lain). Pengecualian tanggal Saldo Awal (CLAUDE.md §3) dibuat **bernama eksplisit** (`assertOpeningBalanceDate()`, dipanggil HANYA `OpeningBalanceService`) — bukan flag boolean generik di `JournalPosterService.post()`. Di dalam `post()`, cabang `dto.sourceType === 'OPENING_BALANCE'` melewati `PeriodLockValidatorService.validate()` sepenuhnya (tanggal sudah divalidasi lewat `assertOpeningBalanceDate()` di lapis pemanggil sebelum `post()` dipanggil). | Menghindari "melonggarkan validator untuk semua modul" (larangan eksplisit CLAUDE.md §2.9/§0) — satu pengecualian bernama, bukan satu lubang generik yang bisa disalahgunakan pemanggil lain. | 3 file spec yang meng-`new JournalPosterService(...)` manual (`journal-poster.service.spec.ts`, `void.service.spec.ts`, `five-invariants.spec.ts`) diupdate menambah `PeriodLockValidatorService` (stateless, tanpa constructor dependency, persis `DocumentCounterService` — supaya perubahan ini murah). |
| 6 Agu 2026 | 12 | **Keputusan bisnis dikonfirmasi user sebelum coding**: selisih Debit(Persediaan+Piutang) vs Kredit(Hutang) pada jurnal pembuka Saldo Awal **di-plug otomatis ke akun Modal (3101)** — satu-satunya akun EQUITY yang sudah ter-seed. Alternatif yang ditolak: mewajibkan baris equity eksplisit dari pemanggil (lebih rumit, tidak dibutuhkan untuk MVP). | Pola akuntansi standar untuk jurnal pembuka — aset tidak akan pernah persis sama dengan kewajiban tanpa modal, endpoint akan selalu gagal `validateBalance()` tanpa plug ini. | `OpeningBalanceService.submit()`: hitung `diffCents` dari Σ Debit − Σ Kredit; kalau ≠0, tambah satu baris ke akun `account_type='EQUITY'` (WAJIB tepat satu akun aktif, error jelas kalau 0/>1 — MASTER harus bereskan COA dulu). Diverifikasi manual: submit stok 500rb + piutang 200rb + hutang 150rb → baris ke-4 otomatis "Modal (K) 550rb", total D=K=700rb. |
| 6 Agu 2026 | 12 | **`GET /opening-balance/verify` SENGAJA di-scope ke `source_type='OPENING_BALANCE'`** di kedua sisi (Σ lot pembuka vs saldo akun Persediaan hasil jurnal pembuka) — bukan invarian global seperti invarian ke-5 Hari 11 (yang membandingkan SELURUH `stock_cost_lots` vs SELURUH saldo akun Persediaan, sumber kebenaran terpisah, tidak diduplikasi di sini). Konsekuensi yang **disengaja, bukan bug**: begitu stok pembuka mulai laku terjual pasca cut-over, `qty_remaining` lot pembuka turun sementara baris jurnal pembuka OPENING_BALANCE tidak pernah berubah — endpoint ini akan mulai menunjukkan selisih ≠0 setelah go-live. Endpoint ini adalah cek sanity SEKALI SAAT INPUT (Hari 36), bukan dashboard rekonsiliasi hidup. | Kalau dipakai/dibaca sebagai invarian hidup selamanya tanpa tahu konteks ini, seseorang bisa panik melihat `difference` bergeser dari 0 pasca cut-over padahal itu memang seharusnya terjadi. | Dicatat eksplisit di komentar kode (`opening-balance.service.ts`) dan di sini supaya tidak disalahpahami nanti — kalau butuh rekonsiliasi hidup pasca cut-over, itu sudah ada terpisah (invarian ke-5, `five-invariants.spec.ts`), bukan endpoint ini. |
| 6 Agu 2026 | 12 | **Celah yang diketahui dan sengaja tidak diselesaikan hari ini**: (1) tidak ada VOID untuk `sourceType='OPENING_BALANCE'` — `VoidEngineService` fail-closed (hook belum didaftarkan), jadi input Saldo Awal yang salah **tidak punya jalur resmi dibatalkan** hari ini (Jurnal Manual pun tidak bisa dipakai untuk itu, karena justru menolak akun Persediaan/Piutang/Hutang yang sama). (2) Submit Saldo Awal berulang **tidak diblokir** (tidak ada guard "sekali saja") — konsisten arsitektur append-only, tapi submit dua kali untuk produk yang sama akan membuat 2 lot + 2 baris jurnal, bukan menimpa. | Di luar lingkup prompt hari ini (backend murni: skema+endpoint+mesin) — sengaja dicatat di sini, bukan diselesaikan diam-diam, supaya tidak dianggap "lupa" saat ditemukan nanti. | **Tinjau saat Hari 36** (input Saldo Awal sungguhan) — kalau operator butuh koreksi, untuk sekarang jalurnya manual lewat SQL langsung oleh developer, bukan lewat aplikasi. Pertimbangkan mendaftarkan `VoidHook` untuk `OPENING_BALANCE` kalau kebutuhan koreksi ternyata sering terjadi. |
| 7 Agu 2026 | 12 (susulan) | **Dua hotfix diminta user, di luar lingkup prompt Hari 12 asli**: (1) kode customer selama ini wajib diketik manual (`CreateCustomerDto.code` required, tidak ada sequence) — beda dari Brand/Unit/Salesman/Supplier yang sudah bisa dibangkitkan sejak Hari 8. (2) `products.keterangan` wajib diisi (`NOT NULL` + `@IsNotEmpty()`) padahal ada produk yang cukup diwakili Merek+Kemasan+Ukuran saja. | Operator harian akan sering ketemu keduanya (setiap input pelanggan baru, setiap produk tanpa keterangan spesifik) — bukan sekadar kosmetik. | **(1)** Migration `1785080602937` (`customer_code_seq`) + `CustomersService.create()` pakai `generateSequenceCode()` (helper sama Brand/Unit/Salesman), prefix `CUST`, `dto.code` jadi opsional. FE: tombol "Bangkitkan" + `customerTransformOut` (pola sama `productTransformOut`, kosong → key tidak dikirim). **(2)** Migration `1785080602938` `ALTER COLUMN keterangan DROP NOT NULL`; entity + DTO + FE ikut jadi opsional; `buildDisplayName()` (BE & FE) sudah menyaring bagian kosong sejak awal jadi tidak perlu diubah. Migration `up→down→down→up` diverifikasi di `omega_dev` sungguhan (bukan cuma DB test sementara), `npm run build`/`lint`/`test` (87 test) hijau di BE dan FE. |
| 7 Agu 2026 | 13 | **Sebelum mulai Hari 13, ditemukan seluruh BE-nya sudah lengkap & lolos test (4/4)** — `src/modules/warehouse-mutations/` + migration `1785080602939`, ditulis di sesi sebelumnya tapi **belum pernah di-commit** dan `PROGRESS.md` belum diperbarui. Bukan cuma Hari 13 — seluruh working tree (Hari 10-13 BE: stock-recorder, void, period-lock, journal-poster, opening-balance, journal-manual) masih uncommitted sejak commit terakhir `ed8dacb` ("Hari 7-9"). | Kalau tidak dicek dulu, Hari 13 akan membangun ulang BE yang sudah ada. | Dilaporkan ke user sebelum menulis kode apa pun (lihat transcript). Kerja hari ini jadi murni FE + 1 bugfix BE kecil (baris di bawah) — commit dari Hari 10-13 tetap jadi keputusan user, bukan dilakukan otomatis. |
| 7 Agu 2026 | 13 | **Bug ditemukan lewat verifikasi manual browser** (bukan kelihatan dari build/lint/typecheck): halaman cetak nota (`[id]/cetak.vue`) awalnya memanggil `GET /settings` tanpa pengaman untuk identitas toko di kepala nota — endpoint itu **MASTER-only** (`@Roles(Role.MASTER)` di level controller), sehingga Operator (justru yang paling sering mencetak nota) mendapat 403 yang mematikan **seluruh** halaman cetak, bukan cuma kepala notanya. | Kalau tidak ketahuan, Operator tidak akan pernah bisa mencetak nota mutasi sama sekali — regresi total pada fitur inti hari ini, dan tidak muncul di `npm run build`/`lint`/`typecheck` sama sekali. | Fetch `/settings` dipisah dari `Promise.all` utama, dibungkus try/catch sendiri (gagal senyap → header toko kosong, sesuai konvensi "yang kosong tidak dicetak") — pola sama `akuntansi/jurnal/index.vue`'s `loadAccountOptions()` untuk endpoint yang digerbangi role serupa. Diverifikasi ulang manual: Operator berhasil membuka & mencetak nota setelah perbaikan. |
| 7 Agu 2026 | 13 | **Data uji transaksional (2 mutasi gudang + saldo awal 2 produk + 1 gudang BAD_STOCK) sengaja TIDAK dihapus dari `omega_dev`** setelah verifikasi — beda dari konvensi hari-hari sebelumnya ("data uji dihapus lagi"). Semuanya dibuat lewat alur aplikasi asli (bukan SQL manual), jadi jurnal/lot/stok tetap konsisten; menghapusnya butuh menyentuh `product_stock_balance` secara langsung yang justru dilarang CLAUDE.md §2.5 ("Dilarang UPDATE langsung ke `product_stock_balance` dari modul lain") — risiko merusak invarian lebih besar daripada manfaat kosmetik. | Sesi berikutnya (mis. Hari 14) akan melihat 2 baris "GD/RM01-26080017/18" dan gudang "Gudang Barang Rusak" di `omega_dev` yang bukan data klien sungguhan. | Kalau dev DB perlu bersih-bersih menyeluruh, lakukan lewat reset DB dev (bukan DELETE manual bertarget) — belum ada skrip reset sekali-jalan di repo ini, pertimbangkan menambahkannya kalau kejadian ini mulai mengganggu. |
| 7 Agu 2026 | 14 | **Drift: Hari 14 direncanakan 5 Agu, aktual 7 Agu — molor +2 hari kalender** (pola sama Hari 12/13, sudah dilaporkan hari itu juga masing-masing). Ini **bukan** drift baru yang terjadi hari ini — jarak antara "hari ke-N rencana" dan tanggal kalender sungguhan sudah menumpuk sejak Hari 12, §0 Papan Status di atas belum pernah diperbarui sejak Hari 11 (masih menunjukkan "Hari ke-11 / 31 Juli"). Diperbaiki hari ini (Hari ke-/Tanggal), tapi **ledger drift kumulatif & margin (baris di bawahnya) belum dihitung ulang** — itu keputusan yang menyentuh negosiasi jadwal dengan klien, bukan sesuatu yang saya putuskan sepihak. | Kalau dibiarkan terus tanpa dihitung ulang, "Drift kumulatif: 0 hari" di §0 makin menyesatkan — sudah 3 hari berturut-turut (Hari 12/13/14) masing-masing +2-3 hari dari rencana. | **Perlu keputusan user**: hitung ulang drift kumulatif & margin §0 secara eksplisit, atau putuskan pola ini "praktis mengikuti tanggal kalender sungguhan" dan berhenti melacak selisih thd rencana per-hari. |
| 7 Agu 2026 | 14 | **Dua gap lama (bukan celah baru hari ini) ditutup sebagai bagian lingkup**: `tax_rates` (tabel ada sejak Hari 3, 0 kode aplikasi sampai hari ini) dan duplikasi `resolveSingleAccount` yang tadinya cuma hidup privat di `OpeningBalanceService`. Keduanya diputuskan diekstrak jadi service `src/core/` bersama (bukan disalin lagi) karena Faktur Pembelian butuh pola query yang SAMA PERSIS dan Faktur Penjualan (Hari 21) akan butuh `tax_rates` lagi — bukan scope creep, keduanya konsumen nyata hari ini/berikutnya, bukan pembangunan untuk kemungkinan masa depan. | Kalau tidak diekstrak sekarang, Hari 21 akan menyalin query efektif-tanggal `tax_rates` untuk kedua kalinya. | `src/core/account-resolver/` + `src/core/tax-rates/` — detail lengkap di §4. `OpeningBalanceService` ikut direfactor menunjuk service bersama ini (perilaku tidak berubah, dibuktikan test lama tetap hijau). |
| 10 Agu 2026 | 16A | **Klien menyerahkan 25 screenshot sistem lama** (Affari Retail System v7.57.27) — referensi UI/UX pertama sejak proyek dimulai. Seluruh bentuk layar Hari 1–16 dibangun sebagai tebakan tanpa referensi apa pun. | Tidak ada drift hari ini (dokumen saja), tapi menyalakan dua hari sisipan retrofit. | `docs/PANDUAN_UI.md` dibuat (16 seksi: anatomi daftar/modal dokumen/modal baris, glosarium, peta keyboard, template cetak A5, checklist per halaman). Dirujuk **wajib** dari `CLAUDE.md` §6 dan `PROMPTS_HARIAN.md` §A + Cara Pakai butir 2. Screenshot disimpan **versi 1600px** (8,9 MB) di `docs/referensi/`; asli 4624×3472 (200 MB) ke `docs/referensi-asli/` yang di-`.gitignore` — terlalu berat untuk git, dan 1600px sudah terbaca sampai teks hint & angka grid. |
| 10 Agu 2026 | 16A/16B | **Keputusan klien: seluruh layar lama ikut disesuaikan, tidak ada yang di-*grandfather*.** Awalnya 14 halaman master data diusulkan dibiarkan (sudah dipakai klien untuk input sejak Hari 4); klien memutuskan ikut, lalu beberapa jam kemudian menambahkan 3 modul transaksi juga. | **−2 hari dari margin** (+2,65 → **+0,65**). Buffer **tidak** tersentuh, tetap 3 hari. Hari 17 & 18 → 12–13 Agu, Fase 5 mulai 14 Agu. Cut-over 1 Sep tidak bergerak. | Dua hari sisipan: **16A** (komponen dasar §8 + `<DataTable>`/`<CrudFormPage>`/`useRupiah`/navigasi + 7 modul master data) dan **16B** (3 modul transaksi + 2 nota cetak + label `DocumentActions`). Urutannya mengikat: 16B memakai komponen yang lahir di 16A. Setelah keduanya, tidak ada lagi layar yang dibangun sebelum panduan — §15 berlaku penuh mulai Hari 17. |
| 10 Agu 2026 | 16B | Ditemukan saat menyiapkan prompt: ketiga `create.vue` modul transaksi memuat total **5 `<table>` manual**, melanggar `CLAUDE.md` §6 ("dilarang menulis `<table>` manual — tambah prop di `<DataTable>`") sejak Hari 13. Bukan celah baru hari ini. | Tidak ada dampak fungsional, tapi tiap varian tabel yang di-copy-paste adalah satu tempat lagi yang harus diingat saat format angka/kepadatan berubah. | Ikut lunas di Hari 16B lewat `<DataTable>` mode data lokal — baru sekarang penggantinya ada. DoD Hari 16B memuat `grep '<table'` harus nol hasil. |
| 10 Agu 2026 | 16B | Tiga modul transaksi punya **8 perilaku halus yang rusaknya tidak memunculkan error apa pun** (gerbang supplier retur lewat `watch(supplierId)` bukan filter client-side, `fifoNextUnitCost` = lot tertua bukan rata-rata, label "(Estimasi)", step-up BS→STORE, Harga Pokok mutasi read-only, nota mutasi nihil rupiah, aturan tombol `DocumentActions`, 3 util kalkulasi). | Retrofit UI yang mengubahnya menghasilkan layar yang **tetap tampak benar** — mis. operator melihat stok Bad Stock supplier lain. | Didaftar eksplisit sebagai **N1–N8** di kepala prompt Hari 16B, dan DoD mewajibkan **dibuktikan satu per satu, bukan diklaim**, plus manual end-to-end ketiga modul di browser sungguhan. |
| 23 Agu 2026 | 21 | **§0 Papan Status ketahuan basi 3 hari** — masih menunjukkan "Hari 20 / 20 Agustus" saat tanggal kalender sungguhan sudah 23 Agustus. Tidak diperbaiki sejak Hari 20 selesai. | Drift kumulatif & margin §0 makin menyesatkan (sudah dicatat sejak baris Hari 14 di atas, belum pernah dihitung ulang oleh user/klien). Tenggat internal "input master data ±20 Agu" (§1) sekarang **sudah lewat** per tanggal riil. | "Hari ke-"/"Tanggal hari ini" diluruskan hari ini. Drift kumulatif/Margin/Buffer **masih belum dihitung ulang** — tetap butuh keputusan user, bukan diputuskan sepihak di sesi ini. |
| 23 Agu 2026 | 21 | **Prompt Hari 21 eksplisit "TUGAS (BACKEND)" saja** — checklist asli §2 hari ini menggabungkan BE+FE (pola sama Hari 20). FE (preview total live, Ctrl+H/Ctrl+D dengan petunjuk terlihat) **tidak dikerjakan** sesi ini. | Form Hari 20 tetap gagal `Cannot POST /sales-invoices` di FE sampai FE ini disambungkan — Hari 21 belum bisa ditandai `[x]` penuh. | Item BE dicentang, item FE dibiarkan `[ ]` dengan catatan lingkup di §2. Perlu prompt FE Hari 21 susulan sebelum lanjut Hari 22. |
| 23 Agu 2026 | 21 | **Bug lama ditemukan lewat test baru, bukan regresi hari ini**: `payload-matchers.ts`'s `sameValue()` pakai `JSON.stringify` naif untuk deep-equal payload approval — Postgres **jsonb menormalisasi ulang urutan key objek** (panjang-lalu-leksikografis), jadi payload yang dibaca balik dari DB (`approved`) vs payload segar di JS (`current`) bisa dianggap "beda" padahal isinya identik, untuk objek ber-3+-key yang urutan insersinya bukan urutan normalisasi jsonb. `BS_TO_STORE` (Hari 13) lolos selama ini murni kebetulan urutan 2 key-nya. `SELL_BELOW_COST` (6 key per baris) membongkarnya lewat test integration sungguhan (retry token yang baru saja disetujui sendiri ditolak "payload tidak sama"). | Kalau tidak ketahuan, **setiap** actionType step-up dengan payload objek ber-3+-key berisiko gagal retry secara acak (tergantung urutan key kebetulan cocok/tidak dengan normalisasi jsonb) — bukan cuma `SELL_BELOW_COST`. | `sameValue()` diganti deep-equal rekursif order-independent (array + objek nested, key dibandingkan lewat `Object.keys().sort()`). Berlaku untuk SEMUA actionType terdaftar, bukan cuma yang ditambah hari ini — kalau ada laporan "approval kadang gagal dipakai ulang" dari hari-hari sebelum ini, ini kemungkinan besar akar masalahnya. |
| 23 Agu 2026 | 22 | **Pola sama Hari 13 terulang**: sebelum mulai Hari 22, ditemukan BE-nya (edit/VOID/print/GET Sales Invoice) sudah lengkap & lolos test (24/24) di working tree, **belum tercatat di PROGRESS.md dan belum di-commit**. `git status` menunjukkan **187 file berubah**, commit terakhir masih `ed8dacb` ("Hari 7-9") — artinya seluruh Hari 10-22 BE (bukan cuma hari ini) masih uncommitted. Berbeda dari Hari 13 (yang langsung dilaporkan sebelum menulis kode apa pun): kali ini ditemukan di TENGAH sesi lewat pembacaan file, bukan di awal — dicatat di sini supaya tidak lupa, dan supaya pola "cek working tree dulu sebelum coding" makin ditekankan untuk sesi berikutnya. | Kalau mesin ini rusak/hilang sebelum sempat commit, ~15 hari kerja (Hari 10-22) hilang total — bukan cuma risiko dokumentasi. | **Belum di-commit hari ini juga** (keputusan commit tetap milik user, bukan diambil sepihak) — tapi risiko ini sekarang eksplisit tercatat, bukan diam-diam menumpuk lagi. **Rekomendasi kuat: commit sebelum sesi berikutnya dimulai.** |
| 23 Agu 2026 | 22 | **Root cause salah didiagnosis Hari 21 sore ketahuan hari ini**: `GET /sales-invoices` yang dilaporkan "belum ada sama sekali" ternyata SUDAH ada di kode sejak sesi BE Hari 21 (route ter-daftar di log NestJS) — yang sebenarnya terjadi, proses `nest start --watch` LAMA (dari sesi sebelum Hari 21 BE ditulis) masih memegang port 3000 dan tidak pernah di-restart, jadi FE selalu bicara ke server basi tanpa route itu. `netstat`→`taskkill` proses lama→restart bersih langsung menyelesaikannya. | Kalau tidak ketahuan, item "BE: GET /sales-invoices" di checklist Hari 22 akan ditandai "dibangun ulang" padahal cuma proses dev yang perlu di-restart — potensi kerja dobel di sesi mana pun berikutnya yang mengalami gejala serupa. | **Pelajaran untuk sesi berikutnya**: kalau endpoint "hilang" padahal grep kodenya ADA, cek `netstat -ano \| grep :3000` + proses `nest start --watch` yang masih hidup DULU, sebelum menyimpulkan endpoint belum dibangun. |
| 23 Agu 2026 | 22 | **`<StepUpDialog>` root cause dikonfirmasi baca sumber Nuxt UI v4 langsung** (`node_modules/@nuxt/ui/dist/shared/ui.*.mjs`): tema `modal` bawaan TIDAK punya z-index apa pun (`overlay: "fixed inset-0"` polos, tanpa kelas `z-*`) — bukan sekadar dugaan dari perilaku yang terlihat. Dua `UModal` yang di-Teleport ke `<body>` tanpa z-index eksplisit bertumpuk MURNI mengikuti urutan DOM/mount (aturan CSS painting order: elemen `z-index:auto` diperlakukan setara level "0" dan diurutkan sesuai posisi dokumen). | Memahami root cause di level spesifikasi CSS (bukan cuma "kelihatannya begini") memastikan perbaikan satu baris (`:ui="{overlay:'z-[100]',content:'z-[100]'}"`) benar-benar menyelesaikan akar masalah untuk SEMUA pemakai `withStepUp()` sekarang & nanti, bukan cuma menutupi gejala di satu halaman. | Perbaikan hidup di SATU tempat (`StepUpDialog.vue`), tidak ditempel per halaman pemanggil. Kalau modal halaman lain nanti butuh z-index lebih tinggi dari `100` (jarang, tidak ada preseden di codebase ini per hari ini), naikkan angka di titik yang sama. |
| 23 Agu 2026 | 22 | **VOID Faktur Penjualan menggabungkan DUA gerbang step-up independen** (`UNLOCK_PRINT` + `VOID_DOCUMENT`) dalam satu endpoint — satu-satunya aksi di codebase ini yang melakukan itu sampai hari ini. `useStepUp().withStepUp()` generik (dipakai polos di semua pemakai lain: BS_TO_STORE, SELL_BELOW_COST, CASH_OUTFLOW, UNLOCK_PRINT tunggal) HANYA dirancang untuk satu gerbang aktif per panggilan. | Kalau ditangani naif (satu `withStepUp()` polos), gerbang kedua yang muncul di tengah retry otomatis gerbang pertama akan salah ditafsirkan sebagai "isi permintaan berubah sejak disetujui" (CLAUDE.md §19) — VOID faktur PRINTED oleh Operator akan SELALU gagal dengan pesan membingungkan, tanpa developer manapun langsung tahu kenapa. | `performVoid()` khusus di `penjualan/faktur/[id]/index.vue` menangani rantai dua-gerbang secara eksplisit (detail di §4 Hari 22) — **`useStepUp.ts` generik SENGAJA tidak diubah/digeneralisasi** untuk kasus multi-gerbang; kalau ada aksi lain yang butuh pola serupa nanti (belum ada rencana konkret per hari ini), pertimbangkan mengekstrak pola ini jadi helper bersama saat pemakai kedua muncul, bukan sekarang (satu pemakai belum cukup alasan abstraksi generik). |
| 23 Agu 2026 | 22 | **Instruksi prompt hari ini keliru**: prompt menyatakan "klien menjanjikan contoh [nota] 27 Juli dan belum mengirimkannya", padahal foto asli `docs/referensi/penjualan/Faktur Penjualan.jpg` sudah ada di repo dan sudah didokumentasikan penuh di `PANDUAN_UI.md` §13.1 sejak Hari 16A (10 Agustus) — jauh sebelum prompt ini ditulis. | Kalau instruksi "pakai layout standar" diikuti mentah-mentah, nota `JL` akan dibangun dengan bentuk tebakan padahal foto asli sudah tersedia dan sudah dianalisis detail (kolom, format tanggal, posisi tanda tangan, dll). | Dibangun mengikuti §13.1 apa adanya (bukan layout standar tebakan). §1 tabel "Menunggu Klien" diperbaiki: baris format nota sekarang membedakan `JL` (sudah ada, dipakai) dari `B1`/`SJ`/`RJ`/`RB`/`PAY` (masih belum ada foto, aturan cadangan §13.3 tetap berlaku untuk itu). |
| 23 Agu 2026 | 22 | **Tooling browser (Claude in Chrome) mengalami degradasi berulang di paruh kedua sesi** — CDP `Page.captureScreenshot`/klik timeout berulang, beberapa tab macet total tidak merespons perintah tutup, satu tab bahkan kehilangan izin akses sama sekali ("Cannot access contents of the page"). Kemungkinan besar terkait RAM mesin dev yang terbatas (tercatat berulang sejak Hari 1) ditambah banyak tab menumpuk dari percobaan berulang. **Kerja-sekitar yang berhasil**: `javascript_tool` (Runtime.evaluate) tetap responsif saat `computer`(CDP Input/Page) macet — dipakai untuk memicu klik lewat `dispatchEvent` manual dan membaca DOM (`elementFromPoint`, `innerText`) sebagai pengganti screenshot visual. | Verifikasi visual StepUpDialog di `gudang/mutasi/index.vue` (BS_TO_STORE) tidak sempat dituntaskan hari ini meski dicoba berulang (lihat keterbatasan di §4 Hari 22) — bukan dilewati sengaja. | **Untuk sesi browser-testing berikutnya**: kalau `computer` (screenshot/klik) mulai timeout berulang, coba `javascript_tool` dengan `dispatchEvent` manual dulu sebelum menyerah atau membuka tab baru lagi (tab baru tidak selalu membantu, terbukti hari ini) — dan pertimbangkan menutup tab-tab lama secara berkala, bukan menumpuknya. |
| 23 Agu 2026 | 21 | **Draft migration COA sempat salah kode akun** — `1785080602953` awalnya memakai kode pendek (`4101`/`4104`/`5101`/`2102`) yang disalin dari blok **`down()`** `RestructureChartOfAccountsV2` (rollback ke skema lama), dibaca keliru sebagai kode "final". Migration tetap SUKSES jalan (0 baris ter-`UPDATE`, tidak ada error) — silent failure murni, hanya ketahuan karena diverifikasi lewat `migration:run` sungguhan + query balik sebelum dipakai test/curl, bukan cuma dibaca dari kode. | Kalau lolos ke `POST /sales-invoices` sungguhan tanpa ketahuan, `AccountResolverService.resolveSingleActive()` akan melempar "harus tepat satu akun aktif (ditemukan 0)" — setiap faktur penjualan pertama akan gagal 400 sampai ada yang menyadari flag COA tidak pernah ter-set kemana pun. | Diperbaiki ke kode panjang aktual hasil `up()` (`04.110.00001`/`04.110.00003`/`05.110.00001`/`02.110.00022`), dikonfirmasi query `is_postable` (header vs leaf) sebelum dipakai. **Pelajaran untuk migration COA berikutnya**: selalu verifikasi kode akun lewat `migration:run` + `SELECT` langsung di DB, jangan percaya kode yang terlihat di teks migration lain tanpa mengecek `up()`/`down()` mana yang sedang dibaca. |
| 26 Agu 2026 | 24 | **`./scripts/verify.sh` 9/10 — langkah 7/10 (build frontend) OOM**, `JavaScript heap out of memory` di tengah `nitro build`. Pola persis sudah tercatat Hari 20/21 (§4): skrip memanggil `npm run build` FE tanpa `NODE_OPTIONS` bertambah, dan backend build+test+server (langkah 2-6) sudah memakai RAM duluan di proses shell yang sama sebelum giliran FE — mesin dev cuma 7,7 GB (Hari 1 §3). **Bukan regresi kode hari ini**: `cd frontend && NODE_OPTIONS="--max-old-space-size=4096" npm run build` dijalankan terpisah lolos 0 error (dibuktikan dua kali, sebelum & sesudah menjalankan verify.sh). | Tidak ada drift jadwal — DoD tetap terpenuhi lewat build manual, cuma otomatisasi `verify.sh` yang perlu heap tambahan di mesin ini. | Tidak diubah `verify.sh` sepihak (keputusan skrip bersama, bukan milik satu sesi). **Untuk sesi berikutnya**: kalau langkah 7/10 OOM lagi, jalankan build FE manual dengan `NODE_OPTIONS` sebagai bukti pengganti, catat di sini seperti hari ini — jangan diam-diam dianggap gagal permanen. |
| 29 Agu 2026 | 26 | **Prompt tugas Hari 26 bertentangan langsung dengan keputusan tertutup `KONTEKS_REVISI` §2.12** (ditutup di sesi jam yang sama, hari yang sama): prompt meminta `payment_batches` dengan `party_type`/`party_id` wajib di header + `agent_id`/`vehicle_id` — persis dua hal yang §2.12 sudah putuskan **sebaliknya** (party di-resolve per baris, `agent_id`/`vehicle_id` dibuang total) berdasarkan bukti nyata screenshot Affari (`PJK-26070025`, satu batch lintas 6 pelanggan, header kosong). Dikonfirmasi ke user via pertanyaan eksplisit sebelum menulis migration apa pun — **user memilih mengikuti §2.12**, bukan teks prompt harian. | Kalau diagram/skema hari ini mengikuti teks prompt literal, migration akan langsung bertentangan dengan keputusan yang baru saja ditutup jam yang sama — kemungkinan besar harus ditulis ulang begitu ketahuan, dekat sekali dengan cut-over. | Skema dibangun sesuai §2.12 (lihat §4 Hari 26). **Untuk sesi berikutnya (Hari 27, `POST /payments/confirm`)**: kalau teks prompt lagi-lagi menyebut `agent_id`/`vehicle_id`/party wajib di header, itu kemungkinan besar draft basi dari sebelum §2.12 — cross-check dulu, jangan diikuti mentah-mentah. |
| 29 Agu 2026 | 26 | **Kalender riil (29 Agustus) sudah menyentuh tanggal rencana Hari 36** (input Saldo Awal, buffer terakhir sebelum cut-over 1 September) padahal progres substantif baru sampai Hari 26 — jarak ini jauh lebih besar dari drift-drift sebelumnya yang sudah dicatat berkali-kali sejak Hari 14/18/21 tanpa pernah dihitung ulang oleh user/klien. | Kalau tidak diangkat eksplisit, ada risiko besar cut-over 1 September dianggap tetap aman padahal ±10 hari kerja rencana (Hari 27-36: confirm Payment, laporan kontinuitas nomor, laporan stok/titipan, deploy Windows-native, audit RBAC, DAN input saldo awal) belum tersentuh sama sekali di kalender yang tersisa. | **Bukan diputuskan sepihak di sesi ini** — diangkat eksplisit di §0 Papan Status dan di sini supaya user membawanya ke klien: hitung ulang drift kumulatif, atau putuskan geser cut-over/tukar scope (CLAUDE.md §7 poin 7: "kalau meleset ≥0,5 hari, katakan hari itu juga — jangan diserap diam-diam"). |
| 29 Agu 2026 | 27 | **Pola kesalahan migration COA dari Hari 21 (baris di atas) TERULANG PERSIS hari ini**, bukan hipotetis: draft pertama `1785080602962-AddPaymentDiffFlagToChartOfAccounts.ts` memakai `WHERE code = '5103'` — disalin dari teks yang terlihat di blok `down()` migration `1785080602948` (RestructureChartOfAccountsV2), bukan dari `up()`-nya. Migration tetap SUKSES jalan (0 baris ter-`UPDATE`, tidak ada error) — silent failure murni, sama seperti Hari 21. Ketahuan lewat 6 test integration gagal serempak "Akun Selisih Pembayaran ditemukan 0" pada percobaan test pertama, BUKAN dari review kode. | Kalau lolos tanpa test integration sungguhan yang benar-benar memanggil `resolveSingleActive('is_payment_diff_account = true', ...)`, `POST /payments/confirm` dengan `settleInFull` akan gagal 400 "harus tepat satu akun aktif (ditemukan 0)" di produksi — persis skenario yang diperingatkan Hari 21. | Diperbaiki ke kode LIVE `07.210.00004` (dikonfirmasi `SELECT` langsung di `omega_dev`) sebelum dipakai di mana pun; migration di-revert+re-run di `omega_dev` untuk memastikan versi yang jalan adalah versi yang benar, bukan cuma file yang benar. **Pelajaran yang makin menguat**: kalau sebuah migration COA butuh nilai `code` "saat ini", JANGAN PERNAH membaca teks migration lain secara visual — selalu `migration:run` + `SELECT` sungguhan dulu, bahkan kalau sudah "yakin" dari konteks (draft pertama migration ini pun ditulis dengan penuh keyakinan, lengkap dengan komentar yang menjelaskan riwayat kode — dan tetap salah). |
| 30 Agu 2026 | 27 | **Fixture uji manual curl Hari 27 BE (`AR-CUST-758-ryx6` "Piutang Kustom Uji Payment", `KB-PAY-27877050` "Kas Besar Uji Payment") tertinggal `is_active=true` di `omega_dev`** sampai kena giliran `./scripts/verify.sh` Hari 27 FE keesokan harinya: `resolveSingleActive('is_receivable_account = true', 'Piutang Usaha', ...)` menemukan **2** akun aktif (bukan 1), menggagalkan `operational-expenses.service.spec.ts` yang sama sekali tidak menyentuh modul Payment. | Integration test di kodebase ini sengaja memakai `omega_dev` asli, bukan DB terisolasi — fixture akun bertanda `is_receivable_account`/`is_payable_account` yang tidak dibersihkan **memutus modul lain yang tidak terkait sama sekali**. Beda dari data customer/invoice biasa (aman menumpuk, lihat `CUST-SMOKE-*`) — akun COA dengan flag "harus tepat satu" itu singleton-sensitive. | Dihapus manual via `psql` (dicek dulu 0 referensi di `journal_entry_lines`/`customers.ar_account_id`/`payment_batch_methods`) sebelum `verify.sh` diulang — hijau 10/10 sesudahnya. **Aturan baru**: fixture COA untuk uji flag singleton (`is_receivable_account`, `is_payable_account`, `is_payment_diff_account`, dst.) WAJIB dihapus di akhir sesi uji hari itu juga — jangan disamakan dengan data customer/invoice/produk yang memang boleh menumpuk. |
| 03 Sep 2026 | 29 | **Kalender riil (3 September) sudah melewati cut-over 1 September** yang dipatok di §1 rencana, padahal progres substantif baru menyentuh Hari 29 (Laporan Stok/Titipan) — Hari 30-37 (laporan pasca-MVP tidak berlaku, tapi deploy Windows-native Hari 33, audit RBAC Hari 35, saldo awal Hari 36, serah terima Hari 37) belum tersentuh sama sekali di kalender yang sudah lewat. Ini kelanjutan langsung dari catatan drift 29 Agu (baris di atas) yang belum pernah direkonsiliasi user/klien. | Cut-over yang sudah lewat tanpa deploy/saldo-awal/serah-terima berarti sistem ini **belum bisa dipakai produksi** meski progres kode terus maju — risiko terbesar bukan lagi "jadwal meleset", tapi "klien mengira sudah live padahal belum". | **Bukan diputuskan sepihak di sesi ini** — diangkat eksplisit di sini (CLAUDE.md §7 poin 7) supaya user membawanya ke klien: cut-over baru butuh tanggal pasti, dan Hari 33/36/37 (deploy, saldo awal, serah terima) perlu dijadwalkan ulang sebelum diklaim selesai. |
| 03 Sep 2026 | 29 | **Isi Laporan Stok & Barang Titipan (§1, ditandai 🛑 sejak 29 Juli) diputuskan langsung oleh user, bukan klien**: Laporan Stok disederhanakan jadi 3 angka per produk (Toko/BAD_STOCK/Total, TANPA baris TITIPAN_PELANGGAN karena gudang jenis itu tidak pernah punya baris `product_stock_balance`); Laporan Titipan jadi pivot Nama Barang × Customer (kolom dinamis, diasumsikan jumlah pelanggan penitip sedikit). Poin 3 tugas asli Hari 29 ("titipan wajib muncul di proses stok opname") **ditarik maju dari Hari 32** sebagai worksheet baca-saja (`GET /reports/stock-opname`) — angka fisik & selisih dihitung di FE, TIDAK disimpan ke DB, TIDAK ada migration baru. Keputusan diambil lewat `EnterPlanMode`/`AskUserQuestion`, bukan ditebak sepihak. | Kalau isi laporan ditebak tanpa konfirmasi, ada risiko klien minta bentuk berbeda setelah dibangun — sama seperti pola desain skema Payment Hari 26 (§2.12: "keputusan kerja, belum dikonfirmasi klien"). | Diimplementasikan di `backend/src/modules/reports/stock-reports.service.ts` (+ 3 endpoint di `reports.controller.ts`) dan `frontend/app/pages/laporan/{stok,titipan,stok-opname}.vue`. **§1 baris ini ditandai ✅ sebagai keputusan kerja** — kalau klien memberi jawaban berbeda nanti, ini yang perlu direvisi, bukan dianggap final permanen. |
| 03 Sep 2026 | 30 | **Hari 30 (Laporan Penjualan/Piutang/Hutang) resmi ditandai ⏸ ditunda ke pasca-MVP di `CLAUDE.md` §0 dan checklist §2** — TAPI dikerjakan hari yang sama atas instruksi eksplisit user, setelah saya berhenti dan menanyakan kontradiksi ini duluan (§1 sudah punya baris "keputusan kerja 03 Sep" untuk bentuk laporannya, padahal checklist §2 masih `[ ]`/"ditunda"). User memilih melanjutkan, bukan menunda. | Kalau saya lanjut tanpa bertanya, bisa dibaca sebagai melonggarkan keputusan scope §0 sepihak. Kalau saya menolak tanpa bertanya, bisa jadi user memang sudah memutuskan mencabut penundaan untuk 3 laporan ini saja (bukan seluruh §0). | Dikerjakan penuh (lihat §4). **§0/§2 di file ini BELUM diperbarui saat itu juga** — baru diperbaiki 04 Sep (baris di bawah) saat sesi Hari 31 menemukan file ini masih menyebut Hari 30 "ditunda" padahal sudah selesai sehari sebelumnya. Pelajaran: perbarui `PROGRESS.md` di HARI YANG SAMA saat scope berubah, jangan menunda ke sesi berikutnya — sempat membuat agen riset Hari 31 salah menganggap Hari 30 "0% diimplementasi, cuma didesain". |
| 04 Sep 2026 | 31 | **`PROGRESS.md` §0/§2 baru diperbaiki hari ini untuk mencerminkan Hari 30 yang sebenarnya sudah selesai kemarin** (lihat baris di atas) — sebelum diperbaiki, agen riset katalog utang-teknis yang dijalankan pagi ini sempat salah menyimpulkan Hari 30 "checklist masih `[ ]`, half-built limbo" karena percaya file ini apa adanya. | Dokumen yang tidak diperbarui di hari yang sama bisa menyesatkan sesi/agen berikutnya, termasuk yang dijalankan SENDIRI oleh sesi yang sama beberapa jam kemudian — bukan cuma risiko teoretis. | §0 (baris "Hari ke-"/"Tanggal hari ini") dan §2 (checklist Hari 30/31) diperbarui sekarang. `day30_summary.md` (root repo) tetap jadi sumber detail penuh Hari 30, tidak diduplikasi di sini. |
| 05 Sep 2026 | 32A | **Lima putaran tanya-jawab Biaya Operasional dituntaskan sesi ini** (bukan sesi tatap muka klien — lanjutan tertulis dari `PERTANYAAN_KLIEN_BIAYA_OPERASIONAL.md`/`_PUTARAN2.md`), mencakup: bentuk edit vs VOID (boleh edit sebelum `review_status` disetujui supervisor), Kasbon (Piutang Karyawan, dari Kas Kecil, dilunasi setor tunai), master Pekerja/Tukang Angkut baru (karyawan tetap), cakupan backdate 7 hari (khusus modul ini saja), ongkos bongkar barang masuk (perlu akun baru, tanpa rujukan supplier), rincian per-toko (satu baris teks bebas, bisa >10 toko → perlu textarea), Pindah Buku Kas (menu generik baru kode `PB`, isi ulang Kas Kecil selalu Rp1jt, setoran Kas Toko→Kas Besar seluruhnya, approval supervisor setelah-fakta bukan StepUp), dan bentuk Laporan Biaya Operasional (rekap per akun `Nama Biaya \| Jumlah`, export Excel saja). Detail penuh ada di riwayat percakapan sesi ini, diringkas ke §0/§1/§2/§7 dan `CLAUDE.md`. | Menyelesaikan item terbuka `PROGRESS.md` §1 sejak Hari 17 (10 Agu) yang sempat mandek berbulan — tapi keputusan ini **belum dikonfirmasi ke klien asli**, pola sama Payment §2.12 dan Laporan Stok/Piutang-Hutang Hari 29/30. | Ditulis sebagai keputusan kerja eksplisit (bukan ditebak diam-diam), dijadwalkan sebagai **Hari 32A** (`docs/PROMPTS_HARIAN.md`), bukan menumpang Hari 32/33. **Wajib dikonfirmasi ke klien sebelum atau segera sesudah dikerjakan** — kalau jawaban asli klien beda, ini yang direvisi. |
| 05 Sep 2026 | 32A | **Temuan sebelum menulis prompt Hari 32A**: asumsi kerja di 4 giliran tanya-jawab sebelumnya ("akun Biaya Operasional real belum pernah di-seed, masih placeholder generik `52xx`") **keliru** — dicek langsung ke `docs/COA_Usulan_OmegaSinarTerang.xlsx` sheet "Bagan Akun" dan `RestructureChartOfAccountsV2` (Hari 17A, 13 Agu): 11 placeholder `52xx` dari migration Hari 17 pagi sudah **DIHAPUS** migration Hari 17A siang/sore hari yang sama, digantikan akun real hasil rekonsiliasi laporan Juli klien (`06.110.xxx` Beban Penjualan & Distribusi, `06.120.xxx` Beban Umum & Administrasi) — termasuk `06.110.00001 B. Gaji Salesman` (sudah dipisah dari tukang angkut sejak awal) dan `06.110.00006 B. BBM Kendaraan` (sudah ada catatan desain "satu akun + kolom kendaraan di layar" sejak saat itu). Akun `01.120.00002 Piutang Karyawan` untuk Kasbon juga **sudah ada** sejak hari yang sama, lengkap saldo Juli per nama (Icung 2.500.000, Firman 1.700.000). | Kalau tidak dicek dan langsung menulis migration akun baru di Hari 32A sesuai asumsi 4 giliran tanya-jawab, hasilnya akan bentrok/duplikat dengan akun yang sudah benar sejak 13 Agustus — persis kelas kesalahan yang sudah dicatat berulang di baris-baris migration COA sebelumnya (23 Agu Hari 22, 29 Agu Hari 27). | `findExpenseAccounts()` (`operational-expenses.service.ts`) dan validasi tipe akun di `createLine()` dicek langsung terhadap kode ini SEBELUM menulis prompt — dua bug nyata ditemukan (dropdown tidak filter `is_postable`; validasi menolak `Piutang Karyawan` untuk Kasbon) dan dimasukkan ke checklist Hari 32A sebagai perbaikan, bukan migration baru. **Pelajaran untuk sesi berikutnya**: sebelum menyimpulkan "akun X belum ada", `grep` migration yang sudah jalan dulu — jangan percaya komentar migration lama begitu saja (komentar Hari 17 tertulis "MASTER perbaiki sendiri Hari 18", tapi migration Hari 17A yang sebenarnya menggantikannya). |
| 04 Sep 2026 | 31 | **Dua kejadian flaky test independen ditemukan hari ini** saat `npm run test` penuh dijalankan berulang: pertama `operational-expenses.service.spec.ts` gagal "Akun Piutang Usaha ditemukan 2", lalu (di run berikutnya) `purchase-invoices.service.spec.ts` gagal jumlah baris jurnal PPN (dapat 3, harap 2 — mengindikasikan `company_is_pkp` terbaca `true` padahal seharusnya `false`). Keduanya lulus 100% saat file yang sama dijalankan sendirian (`npx jest <file>`), dan suite penuh lulus bersih di percobaan berikutnya. Dicek langsung lewat `psql`: 0 baris `chart_of_accounts` orphan ber-`is_receivable_account=true` di luar akun asli — bukan fixture yang lupa dibersihkan. | Integration test di kodebase ini sengaja memakai `omega_dev` asli (bukan DB terisolasi per test, lihat baris 30 Agu Hari 27 di atas), dan Jest menjalankan file-file spec secara **paralel** (banyak worker) — dua spec yang kebetulan menyentuh flag singleton COA (`is_receivable_account`) atau setting global (`company_is_pkp`) di jendela waktu yang sama bisa saling membaca nilai transisi punya spec lain. Ini pola race condition arsitektural, bukan bug di kode fitur mana pun (dikonfirmasi: tidak ada file yang disentuh Hari 30/31 yang menulis `company_is_pkp` atau menambah akun `is_receivable_account` baru tanpa cleanup). | **Tidak diperbaiki hari ini** (di luar lingkup "setengah hari", perbaikan sungguhan butuh DB terisolasi per test atau serialisasi test yang menyentuh flag singleton — perubahan arsitektur test, bukan tambal cepat). Dicatat di sini supaya sesi berikutnya yang menemukan kegagalan sekilas dengan pesan "ditemukan N akun" pada query singleton COA tahu ini kemungkinan besar flaky, bukan regresi — ulangi `npm run test` dulu sebelum mencari penyebab di kode fitur. |
| 05 Sep 2026 | — | **User meminta export PDF laporan** — ini bertabrakan langsung dengan keputusan tertutup 28 Juli (CLAUDE.md §8: "Sudah dipotong ... Export PDF laporan"). Ditanya eksplisit dulu (CLAUDE.md §9.2) sebelum menyentuh kode. | Kalau dikerjakan diam-diam, melonggarkan keputusan scope yang sudah disepakati klien tanpa jejak. | **User memutuskan langsung**: un-cut sekarang (bukan dikonfirmasi klien dulu — kalender riil sudah lewat cut-over, lihat baris 03 Sep di atas), format **A4** untuk laporan (bukan A5 — A5 tetap khusus dokumen transaksi §6, dikonfirmasi eksplisit ke user). Mesin `ExportService.exportToPdf`/`ExportInterceptor` **sudah generik sejak Hari 28**, cuma belum di-expose — perbaikan murni menghapus prop `:formats="['xlsx']"` di 8 halaman `frontend/app/pages/laporan/*.vue` (stok, titipan, hutang, piutang, penjualan, kas-harian, kontinuitas-dokumen, rekonsiliasi-stok), sehingga jatuh ke default `ExportButton` (`['xlsx','pdf']`). CLAUDE.md §1/§8 dan `docs/PANDUAN_UI.md` §14 diperbarui. Dibuktikan manual: backend dev dijalankan, `GET /reports/stock?format=pdf` dan `GET /reports/document-continuity?...&format=pdf` mengembalikan `200`/`application/pdf`/`%PDF-1.3` valid; `?format=xlsx` tetap `200` (tidak regresi); tanpa token → `401` (error path). |
| 26 Sep 2026 | — | **Koreksi desain modul Payment (rework Hari 26-27, sudah shipped & tested sejak 30 Agu).** User: saat entri baris faktur di grid Kas & Bank, metode pembayaran (akun kas/bank + nominal) harus per BARIS FAKTUR, bukan satu pool di header batch seperti sekarang — tiap baris tetap menampilkan Pelanggan/No.Faktur/Tanggal/Sisa Faktur, lalu di bawahnya sub-tabel `\|metode\|nominal\|` (awal 1 baris, bisa ditambah). Diklarifikasi lewat 5 pertanyaan eksplisit sebelum menyentuh kode (bukan ditebak): split hanya per faktur (bukan dua level), metode tetap bebas akun `is_cash_account` apa saja, header batch tidak butuh akun tunggal, total metode boleh < Sisa Faktur (partial payment, sama seperti aturan lama), dan `POST /payments/preview-allocation` (FIFO Step 1) DIHAPUS karena kehilangan input "total amount"-nya. | Reopen modul yang sudah selesai & di-test (Hari 26-27, `npm run test` hijau + manual E2E per catatan 29-30 Agu) — bukan modul baru, tapi scope hari ini murni koreksi desain ini, tidak melebar ke modul lain. | Migration `MovePaymentMethodsToLineLevel1785080602978` (tabel baru `payment_methods` FK ke `payments.id`, `payment_batch_methods` dihapus — guard menolak kalau tabel lama masih berisi baris yang tak bisa dipetakan; 10 baris `payment_batches` dev/uji manual lama, 30 Agu-20 Sep, dibersihkan manual via psql atas persetujuan eksplisit user sebelum migrasi dijalankan). `PaymentsService.confirm()` ditulis ulang (metode per baris, diagregasi per akun kas lintas baris untuk baris jurnal), `findOne()` mengembalikan `methodsSummary` (agregat) + `lines[].methods` (per faktur). `PaymentAllocationForm.vue` (FE): section "Metode Pembayaran" header dihapus, dipindah ke dalam tiap baris `LineModal`. `payments.service.spec.ts` ditulis ulang (test previewAllocation dihapus/direute ke `findOpenInvoicesList()`, `methods` dipindah ke tiap `lines[]`) — **23/23 lulus**, baik standalone maupun dalam `npm run test` penuh. Dua suite lain (`opening-balance`, `cash-daily-report`) gagal di `npm run test` penuh — dikonfirmasi BUKAN regresi perubahan ini (query masing-masing di-scope ke `source_type` yang tidak pernah disentuh Payment; pola persis flakiness DB-dev-bersama yang sudah didokumentasikan 04/09/11 Sep di atas, gagal juga saat dijalankan berdua tanpa modul lain). Detail penuh di memory `hari26-payment-module-design` (addendum 26 Sep) — belum dikonfirmasi ulang ke klien, pola sama §2.12 asli. |
| 09 Sep 2026 | R0 | **Paket R0 (Rapikan Baseline) diverifikasi selesai**: `scripts/verify.sh` baris build FE sudah memakai `NODE_OPTIONS=--max-old-space-size=4096` (dibuktikan lagi hari ini — langkah 7/10 lulus tanpa OOM), `docs/KONFIRMASI_KLIEN_REVISI.md` ada (172 baris, bahasa awam, K1-K7+A1-A5, K3 & A5 ditandai prioritas), dan baris K1-K7 di §1 sudah tercatat (tanggal aslinya 08 Sep, sesi sebelum ini — bukan dibuat ulang hari ini). Tidak ada kode fitur disentuh, sesuai batasan paket ini. | Tidak ada — paket ini murni perapian, tidak mengubah perilaku aplikasi. | Tidak ada commit dibuat (sesuai aturan paket R0 poin 1: commit baseline menunggu perintah terpisah). |
| 09 Sep 2026 | R1 | **Paket R1 (Fondasi UI Bersama) diverifikasi selesai** — BE: `src/common/normalize-text.ts` (`toUpperTrim`) dipanggil dari `create()`/`update()` di 9 modul master data (brands, units, salesmen, agents, vehicles, warehouses, customers, suppliers, products; `workers` belum ada jadi dilewati sesuai instruksi), migration `1785080602965-BackfillUppercaseNameFields.ts` sudah ada. FE: `MoneyInput.vue`/`QtyInput.vue` ada dan `grep -r "UInputNumber" frontend/app` nol hasil (32 pemakaian lama sudah diganti); auto-capitalize `uppercase: true` terpasang di 9 skema (`useSimpleMasterSchema` dkk); sidebar bersarang **ternyata diimplementasikan di `layouts/default.vue`** (transform `NavSection[]` → `UNavigationMenu` `children` + localStorage per-role), **bukan** di `config/navigation.ts` yang tetap memakai struktur datar `title/items` lama — sempat terlihat seperti tugas ini belum dikerjakan sampai file layout dibaca langsung; dicatat di sini supaya sesi berikutnya tidak salah simpul yang sama. | Tidak ada drift — item R1 lengkap. | Tidak ada commit dibuat. |
| 09 Sep 2026 | R0/R1 | **`npm run test` backend GAGAL saat dijalankan lewat `./scripts/verify.sh`** (40-41 dari 284 tes merah, berubah-ubah tiap run) — **root cause dikonfirmasi BUKAN regresi dari R0/R1**: `document-counter.service.spec.ts` (baris 27) menghapus paksa `document_counters` untuk `period IN ('2609','2610')` sebagai "periode masa depan yang aman", ditulis saat kalender belum sampai September. Kalender riil sekarang **09 September 2026** — `2609` sekarang adalah periode **hari ini sungguhan**, jadi spec ini menghapus counter yang sedang dipakai spec lain (`sales-invoices.service.spec.ts`, `journal-poster.service.spec.ts`, dll yang memakai `daysAgoIso(0)`) yang berjalan paralel di worker Jest lain, menyebabkan `document_counters` dan `sales_invoices`/`journal_entries` yang sudah ter-INSERT jadi tidak sinkron → `duplicate key value violates unique constraint`. Dikonfirmasi lewat isolasi: `journal-poster.service.spec.ts` LULUS 10/10 sendirian; `sales-invoices.service.spec.ts` gagal 28/28 bahkan sendirian (tercemar oleh baris pesanan lama yang tertinggal di `omega_dev` dari sesi-sesi sebelumnya yang tidak dibersihkan, karena `document_counters` untuk periode itu sempat ter-reset ke 0 oleh spec di atas). Ini kelanjutan langsung dari pola race-condition arsitektural yang sudah dicatat 04 Sep (Hari 31, baris di atas) — bentuk baru dari akar masalah yang sama: **DB dev asli dipakai bersama tanpa isolasi per test, dan sekarang juga tanpa isolasi terhadap kalender riil.** | **`./scripts/verify.sh` TIDAK hijau hari ini** — DoD §7 poin 5 (test hijau) tidak terpenuhi murni karena infra test, bukan kode fitur R0/R1. Sesuai CLAUDE.md §9.5, R0/R1 tidak ditandai "selesai" lewat checklist §2 sesi ini; laporan verifikasi tetap disampaikan ke user sebagai blocker eksplisit. | **Tidak diperbaiki sesi ini** (di luar lingkup permintaan hari ini, dan perbaikan sungguhan butuh keputusan arsitektur: DB test terisolasi per suite, atau ganti `period IN ('2609','2610')` di `document-counter.service.spec.ts` jadi periode yang dijamin tidak akan pernah jadi "hari ini" mis. tahun jauh ke depan). **Untuk sesi berikutnya**: kalau `sales_invoices`/`journal_entries`/dokumen lain gagal "duplicate key" atau "document_counters tidak sesuai" pada bulan berjalan, cek dulu apakah ada spec yang men-DELETE `document_counters` untuk periode bulan ini sebelum menyalahkan kode fitur. |
| 09 Sep 2026 | R2 | **Paket R2 (Penamaan Produk) diverifikasi selesai** — `buildDisplayName()` BE (`products.service.ts`) dan FE (`useProductSchema.ts`) diubah urutan argumen dari Merek·Keterangan·Kemasan·UkuranUom jadi **Merek·Kemasan·Keterangan·UkuranUom** (asumsi A5: "Isi" = kolom Ukuran yang sudah ada, bukan angka konversi satuan — jadi murni reorder, bukan perubahan skema). Migration `1785080602965-BackfillUppercaseNameFields.ts` (punya R1, belum di-commit) **digabung** — bagian `products` diganti dari `UPPER(TRIM(display_name))` jadi digabung ulang dari kolom sumber (`CONCAT_WS` + `NULLIF(TRIM(x),'')` untuk skip bagian kosong) dengan urutan baru, supaya produk lama & baru seragam tanpa dua migration terpisah menyentuh kolom yang sama. Field form + kolom grid ikut ditukar (Kemasan sebelum Keterangan). `products.code` **tidak disentuh** sesuai batasan paket. Diverifikasi: `npx jest products.service.spec.ts` (5/5, ditambah 1 kasus baru "tanpa keterangan, tanpa spasi ganda"), migration up→down→up di `omega_dev`, dan **manual di browser** (login Master → Entri Produk → urutan field & pratinjau live persis Merek→Kemasan→Keterangan→Ukuran→Satuan, disimpan → grid menampilkan `LARUTAN CAP KAKI TIGA BOTOL BESAR 500 LITER`, cocok). | Tidak ada drift — item R2 lengkap sesuai `docs/RENCANA_REVISI_TESTING_KLIEN.md` §3. | **`CLAUDE.md` §3 BELUM diperbarui** (masih menyebut urutan lama "Merek + Keterangan + Kemasan + Ukuran+UoM") — sengaja ditunda ke **R12** sesuai rencana (§3 R12: "Perbarui CLAUDE.md ... penamaan produk"), bukan lupa. Tidak ada commit dibuat. |
| 09 Sep 2026 | R2 | **Root cause baru ditemukan saat verifikasi R2, BEDA dari race condition `document_counters` yang sudah dicatat di baris R0/R1 di atas**: `product_code_seq` (sequence Postgres di belakang `ProductsService.generateCode()`, format kode wajib `YYMMDDXXXX` 10 digit dengan bagian sequence di-`padStart(4,'0')`) sudah bernilai **>9999** di `omega_dev` (dicek `SELECT last_value FROM product_code_seq` → 10042, naik terus tiap `npm run test` diulang) — akibatnya sequence menghasilkan 5 digit, kode jadi 11 digit, dan INSERT gagal `chk_products_code_format` (kode `23514`). Dibuktikan dua kali independen: (1) `npm run test` — 15 dari 37 suite merah, mayoritas besar dengan pesan persis ini (termasuk `products.service.spec.ts` sendiri, yang LULUS kalau dijalankan sendirian karena belum sempat mendorong sequence lewat 9999); (2) **manual di browser** — simpan produk baru dengan kode otomatis gagal `Internal server error` (log BE: kode terbangkit `26090910172`, 11 digit), baru berhasil setelah pakai sakelar "Isi kode manual". `operational-expenses.service.spec.ts` dan `cash-daily-report.service.spec.ts` gagal dengan pesan **berbeda** (bukan `chk_products_code_format`) — kemungkinan pencemaran data lintas-test lain, tidak ditelusuri lebih jauh (di luar lingkup R2). | Sequence ini **cumulative selamanya** (bukan reset harian meski format kodenya `YYMMDDXXXX` berbasis tanggal) — begitu lewat 9999 dalam satu hari kalender manapun (dev **atau produksi**, kalau total produk yang pernah dibuat sejak awal sudah >9999), semua `POST /products` tanpa kode manual akan gagal permanen sampai diperbaiki. Ini bug laten produksi, bukan cuma masalah DB test. | **Sengaja TIDAK diperbaiki hari ini** — instruksi paket R2 eksplisit melarang menyentuh `products.code`. Perbaikan sungguhan (ganti `padStart(4,'0')` jadi lebih lebar, atau reset sequence per hari lewat `DocumentCounterService` alih-alih `SELECT nextval()` mentah) butuh keputusan terpisah karena mengubah kontrak format kode CLAUDE.md §3. **Untuk sesi berikutnya**: unblock cepat untuk DB dev/test cukup `ALTER SEQUENCE product_code_seq RESTART WITH 1` (operasi data, bukan kode) — tapi itu tidak memperbaiki akar masalah untuk produksi. |
| 11 Sep 2026 | R7 | **Paket R7 backend (Faktur Pembelian: diskon & nomor supplier, K5+K6) diverifikasi selesai.** Rumus baru diterapkan persis sesuai `docs/RENCANA_REVISI_TESTING_KLIEN.md` §2A di `purchase-invoices.service.ts` **dan** `frontend/app/utils/purchaseInvoiceCalc.ts` (utilitas kalkulasi murni — bukan halaman `.vue`, itu tetap pekerjaan FE terpisah): diskon baris DI-HAPUS (kolom `discount_percent`/`discount_amount` dipertahankan untuk faktur lama, DTO menolak != 0 lewat `@Equals(0)`, pola sama diskon penjualan R5), diskon faktur RUPIAH SAJA tanpa alokasi pro-rata ke baris (langkah 5-6 rumus lama v3 DIHAPUS total, bukan dinolkan) — `lot.unit_cost` sekarang EKSAK tanpa residu pembulatan untuk dibebankan ke baris mana pun. Akun baru `07.110.00005 Diskon Pembelian` (migration `1785080602967-AddPurchaseDiscountAccount`, flag singleton `is_purchase_discount_account` — pola disalin persis `is_purchase_return_diff_account`, dan `SINGULAR_FLAGS`/entity/DTO CRUD COA ikut diperbarui) — baris jurnal ke-3 HANYA muncul kalau `diskon_faktur > 0` (pola sama "Selisih Retur Pembelian"). `supplier_invoice_no` jadi opsional (migration `1785080602968-MakeSupplierInvoiceNoOptional`, `DROP NOT NULL`, asumsi A3) — pencarian `findAll()` (`ILIKE`) sudah NULL-safe tanpa perlu perubahan query (dibuktikan test baru: baris ber-nomor NULL tidak hilang dari hasil cari nomor internal). **Rumus baru berlaku maju sejak hari ini (11 September 2026)** — lot yang sudah terbentuk dengan rumus lama v3 TIDAK dihitung ulang; tidak ada migration yang menyentuh `stock_cost_lots.unit_cost`. `CLAUDE.md` §3 ("Pembelian", "Bonus dari supplier") dan §4 ("Faktur Pembelian") ditulis ulang di sesi yang sama (bukan ditunda ke R12 seperti R2). | Tidak ada drift — item backend R7 lengkap. FE (form entri `pembelian/faktur/index.vue`, hapus field diskon baris, `InfoStrip` varian `stacked` untuk FB4) **belum disentuh**, menunggu paket FE terpisah. | `purchase-invoices.service.spec.ts`: 1 test lama ditulis ulang total (diskon baris dihapus dari fixture, ekspektasi jurnal 2→3 baris) + 7 test baru (diskon faktur 100rb → unit_cost tak berubah + baris Diskon Pembelian; diskon faktur 0 → tanpa baris Diskon Pembelian; diskon baris rupiah/persen → 400; diskon faktur persen → 400; `supplierInvoiceNo` kosong → sukses + `NULL` tersimpan; pencarian tahan NULL; bonus tetap `unit_cost=0` walau ada diskon faktur) — **28/28 lulus** (`--runInBand`). Satu invariant lot-value dilonggarkan presisi 2→1 desimal (residu pembulatan wajar dari `unit_cost` `NUMERIC(16,4)`, dijelaskan di komentar test, bukan bug). Migration `up→down→up` dibuktikan 2x manual di `omega_dev` (di luar `verify.sh`) + sekali lagi lewat `verify.sh` langkah 4/10. `npm run build`/`lint` BE+FE hijau, `npx vue-tsc --noEmit` FE hijau (`purchaseInvoiceCalc.ts` tidak mengubah kontrak yang dipakai `.vue` yang belum disentuh). `./scripts/verify.sh` 9/10 — satu-satunya merah adalah `npm run test` BE penuh, dan **ini BUKAN regresi R7**: dijalankan dua kali berturut-turut, suite yang gagal **berbeda tiap kali** (kali 1: `operational-expenses`+`opening-balance`+1 lagi, 12/295 gagal; kali 2: `cash-daily-report`+`operational-expenses`+`opening-balance`+`sales-invoices`, 41/295 gagal — `purchase-invoices.service.spec.ts` tidak pernah gagal di kedua run), dan pesan errornya (`AccountResolverService.resolveSingleActive('is_receivable_account'/'is_inventory_account')` menemukan akun bukan tepat satu) menunjuk flag yang **tidak disentuh** paket ini — persis pola race condition DB-dev-bersama-tanpa-isolasi-per-test yang sudah dicatat 04 Sep (Hari 31) dan 09 Sep (R0/R1) di atas. Dibuktikan bersih: `purchase-invoices`, `chart-of-accounts`, `purchase-returns`, `sales-invoices`, `payments` semuanya 100% lulus saat dijalankan sendiri/berurutan. Tidak ada commit dibuat (menunggu instruksi commit terpisah). |
| 20 Sep 2026 | R11 | **L1 (Stok Opname dibatasi MASTER+SUPERVISOR) bertabrakan dengan CLAUDE.md §5** ("Laporan ✅ ✅ ✅ kecuali COA", ditulis sengaja di komentar kode). Diangkat ke user via `AskUserQuestion` SEBELUM menulis kode (CLAUDE.md §9.2) — dijawab "tolak dulu, tanya klien", tapi user kemudian mengirim prompt tugas eksplisit meminta implementasi jalan sekarang juga. | Kalau saya menolak mengerjakan meski sudah diberi instruksi eksplisit setelah pertanyaan dijawab, itu mengabaikan otoritas user untuk mengambil keputusan kerja (pola sama Payment §2.12) — kalau saya diam-diam mengerjakan tanpa mencatat kontradiksi jawaban awal, jejak keputusannya hilang. | Dikerjakan sesuai instruksi terakhir user, dicatat sebagai keputusan kerja **belum dikonfirmasi klien** (§4 R11 untuk detail implementasi L1+L2). `CLAUDE.md` §5 diperbarui di commit yang sama dengan kode. |

---

## 4. Modul Selesai

Isi ulang tiap update. Salin bagian ini ke context prompt AI berikutnya.

> ⚠️ **Baca bersama Hari 7–9.** Bagian ini merekam keadaan per 27 Juli, sebelum revisi klien.
> Yang tercatat di sini soal **format nomor dokumen** (`INV/2609/0001`), **skema produk**,
> **`warehouse_type`**, dan **`authorization_requests`** sudah **digantikan** oleh rework
> Hari 7–9. Jangan menyalin bagian ini ke prompt AI tanpa menyertakan Hari 7–9, atau Claude
> Code akan membangun di atas skema yang sudah mati.

```
Hari 1 — Scaffold (belum masuk urutan modul, prasyarat semua modul berikutnya):
- Backend: NestJS modular (src/app.module.ts) + TypeORM (@nestjs/typeorm) + ConfigModule
  + GET /health (cek koneksi DB) + ValidationPipe global + CORS. DataSource CLI terpisah
  di src/database/data-source.ts untuk migration (belum ada migration, mulai Hari 3).
- Frontend: Nuxt 3 + Nuxt UI (template `ui`) + layout sidebar/topbar
  (app/layouts/default.vue pakai UDashboardGroup/Sidebar/Panel/Navbar) + app/pages/.
  Package manager FE = pnpm (bukan npm) karena template Nuxt UI resmi pakai pnpm lockfile.
- DB dev: Postgres native Windows, port 5432, db `omega_dev`, extension pgcrypto aktif.
  docker-compose.yml (postgres, port 5433) ada di repo untuk deploy nanti, TIDAK dipakai
  harian (RAM mesin dev cuma 7.7GB, Docker bareng build FE bikin OOM).
- Env var DB: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME (bukan DB_DATABASE) —
  penting disamakan persis kalau bikin service/config baru yang baca DB_*.
- scripts/verify.sh sudah disesuaikan ke Postgres native (bukan docker compose exec).

Hari 2 — Auth (BE + FE):
- Migration: fungsi generik `set_updated_at()` (file terpisah, dipakai ulang tabel
  berikutnya), tabel `users` (id, username unique, password_hash, full_name,
  role enum `user_role`, is_active, refresh_token_hash, created_at, updated_at
  + trigger), tabel `audit_logs` (user_id, action, entity, entity_id,
  before_data/after_data JSONB, ip, created_at + index entity+entity_id).
- AuthModule: POST /auth/login, /auth/refresh, /auth/logout, GET /auth/me.
  Access token 15 menit, refresh token 1 hari, refresh disimpan ter-hash
  (bcrypt cost 10) di `users.refresh_token_hash`, logout menghapusnya (rotasi
  refresh token juga terjadi tiap kali /auth/refresh dipanggil).
  Secret access vs refresh terpisah: env `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`.
- JwtAuthGuard dipasang global (APP_GUARD) + `@Public()` (dipakai di /health,
  /auth/login, /auth/refresh, GET / bawaan Nest). RolesGuard juga global +
  `@Roles(...)` decorator. Endpoint contoh `GET /auth/master-only` di
  AuthController HANYA untuk membuktikan RolesGuard hari ini — **hapus/ganti**
  begitu ada endpoint MASTER-only sungguhan (Settings/COA, Hari 4/6).
- Rate-limit login: `LoginThrottlerGuard` (extends ThrottlerGuard dari
  @nestjs/throttler), key = IP+username, 5 percobaan/60 detik, pesan 429
  Bahasa Indonesia. Hanya dipasang di endpoint login (bukan guard global),
  supaya endpoint lain tidak ikut kena limit ini.
- Seed: `npm run seed` (src/database/seed.ts, ts-node, BUKAN migration) →
  master/master, supervisor/supervisor, operator/operator. Idempotent
  (update kalau username sudah ada).
- Audit: `@Audit(action, entity)` decorator + `AuditInterceptor` generik
  terpasang GLOBAL (APP_INTERCEPTOR) — modul berikutnya tinggal tempel
  `@Audit('AKSI', 'entity')` di handler controller untuk otomatis tercatat,
  tidak perlu wiring interceptor lagi per modul. `stripSecrets()` di
  `src/modules/audit/strip-secrets.ts` membuang password, password_hash,
  token, access_token, refresh_token, refresh_token_hash (termasuk varian
  camelCase, rekursif ke nested object/array) — unit test di
  `strip-secrets.spec.ts`.
- Struktur modul baru: `src/modules/users/`, `src/modules/auth/`,
  `src/modules/audit/` (masing-masing entities/dto/guards/decorators sendiri).
  `src/common/enums/role.enum.ts` dipakai bareng oleh entity, decorator, guard.
- Endpoint bawaan scaffold Hari 1 (`GET /`, `GET /health`) ditandai `@Public()`
  supaya tidak ikut ke-block JwtAuthGuard global.
- FE — `app/composables/useAuth.ts`: satu composable auth (state `user` +
  `accessToken`/`refreshToken` lewat `useCookie` `sameSite: 'strict'`),
  `login/logout/refresh/fetchMe/ensureSession`. Sengaja pakai `$fetch` langsung
  (bukan `useApi()`) supaya tidak ada dependency melingkar dengan interceptor
  401→refresh di `useApi()`. `ensureSession()` dipanggil middleware sebelum
  render halaman terproteksi — coba `refresh()` dulu sebelum dianggap logout,
  supaya operator tidak ke-lempar ke `/login` tiap kali access token (15 menit)
  kedaluwarsa padahal refresh token (1 hari) masih hidup.
- FE — `app/middleware/00.auth.global.ts` (prefix `00.` supaya jalan sebelum
  `01.roles.global.ts` — urutan alfabetis file middleware global Nuxt): redirect
  ke `/login?returnUrl=...` kalau `ensureSession()` gagal; kalau sudah login dan
  buka `/login`, redirect ke `/`.
- FE — `app/middleware/01.roles.global.ts`: baca `to.meta.roles` (diisi lewat
  `definePageMeta({ roles: [...] })` per halaman) dan redirect ke `/` kalau role
  user tidak termasuk. Kosongkan/hilangkan `roles` di halaman yang boleh diakses
  semua role login.
- FE — `app/pages/login.vue` (`layout: false`), `app/types/auth.ts` (`Role`,
  `AuthUser`, `AuthTokens`, `LoginResponse`), `app/config/navigation.ts`
  (`navigationGroups`: menu difilter per item berdasar `roles`, dipakai
  `layouts/default.vue` bareng `useAuthUser().activeRole`), `app/pages/pengaturan/
  index.vue` (placeholder `roles: ['MASTER']` HANYA untuk membuktikan
  `01.roles.global.ts` jalan di halaman nyata — **ganti** dengan modul Settings
  sungguhan begitu dikerjakan). `layouts/default.vue` ditambah dropdown user
  (nama+role) dan tombol Keluar yang panggil `useAuth().logout()`.

Hari 3 — Master data migrations + generator nomor dokumen (BE):
- Migration (urutan dependency FK, bukan urutan penomoran file): `chart_of_accounts`
  (enum `account_type`: ASSET/LIABILITY/EQUITY/INCOME/EXPENSE, self-FK `parent_id`,
  `is_cash_account`, seed 11 akun kode `1101`–`5102` — TIDAK ada Kas, Bank, atau Retur
  Pembelian, sesuai §3 CLAUDE.md) → `products` + `product_unit_conversions`
  (unique per `product_id`+`unit_name`, TIDAK ada kolom `tax_status`) → `customers`
  (`ar_account_id` FK nullable ke `chart_of_accounts`, `is_pkp` default false) →
  `suppliers` (+ `CREATE SEQUENCE supplier_code_seq`, tidak reset bulanan, dipakai
  nanti oleh CRUD Hari 4 untuk generate `display_code`) → `warehouses` (enum
  `warehouse_type`: STORE/CUSTOMER_CONSIGNMENT/BAD_STOCK, `customer_id` FK nullable +
  CHECK constraint DB-level: wajib diisi hanya kalau CUSTOMER_CONSIGNMENT) →
  `tax_rates` (`effective_from`/`effective_to`) → `settings` (key-value bertipe:
  kolom `value` TEXT + `value_type` CHECK IN BOOLEAN/NUMBER/STRING, seed
  `company_is_pkp=false`, `rounding_multiple=100`, `tax_calculation_mode=EXCLUDE`,
  `backdate_max_days=2`) → `document_counters` (unique `doc_type`+`period`).
  Semua tabel pakai trigger `set_updated_at` (fungsi dari Hari 2) dan `down()` yang
  membalik penuh (termasuk DROP TYPE enum & DROP SEQUENCE).
- `src/core/document-counter/document-counter.service.ts` (`DocumentCounterService`,
  stateless, tanpa dependency Nest lain — bisa `new` langsung di test) +
  `document-counter.module.ts` (belum diimport ke `AppModule`, menunggu modul
  pemanggil pertama di Hari 6+/11+ sesuai urutan di bawah).
  `getNextNumber(docType, date, manager: EntityManager)` WAJIB dipanggil dengan
  `EntityManager` dari transaction pemanggil. Pola race-condition-safe: `INSERT ...
  ON CONFLICT (doc_type, period) DO NOTHING` dulu (memastikan baris period baru
  sudah ada) baru `SELECT last_number ... FOR UPDATE` lalu `UPDATE`. **Penting**:
  urutan ini wajib — `SELECT FOR UPDATE` terhadap baris yang belum ada tidak
  mengunci apa pun, jadi kalau langsung SELECT dulu (tanpa upsert), dua transaction
  pertama di period baru sama-sama mencoba INSERT dan bentrok unique constraint.
  Period diformat dari `date.getUTCFullYear()`/`getUTCMonth()` (bukan local time)
  supaya tidak bergantung timezone mesin. Prefix map: SALES_INVOICE→INV,
  SALES_ORDER→SO, PURCHASE_INVOICE→PI, DELIVERY_ORDER→SJ, SALES_RETURN→RJ,
  PURCHASE_RETURN→RB, PAYMENT→PAY, JOURNAL_ENTRY→JE.
- Test: `document-counter.service.spec.ts` — integration test terhadap Postgres asli
  (bukan mock), pakai `DataSource` terpisah baca env `DB_*` yang sama dengan
  `data-source.ts`. **Test ini butuh DB hidup untuk lolos** — konsisten dengan
  rencana integration test 4 invarian di Hari 8. Test konkurensi: 20 pemanggilan
  `getNextNumber` paralel, masing-masing dalam `dataSource.transaction()` terpisah
  → 20 nomor unik `INV/2609/0001`..`INV/2609/0020` tanpa duplikat (dibuktikan juga
  manual lewat script sekali-jalan, bukan cuma assertion pass/fail).
- Migration dijalankan di DB dev (`omega_dev`) dan diuji up→down→up penuh di DB
  sementara terpisah — berhasil tanpa error.

Hari 3 — FE Engine:
- `app/components/DataTable.vue`: list server-side (page/limit/search/sortBy/sortDir/filter
  jadi query param, response `{data, meta}`), search debounce 300ms, state di URL query
  (`router.replace`), skeleton/empty/error state, `rowActions` terfilter oleh `roles`
  (dibanding ke `useAuthUser().activeRole`) dan `show(row)`. Filter `select` TIDAK boleh
  punya opsi `value: ''` untuk "semua" — Reka UI `<SelectItem>` melempar error 500 SSR
  kalau ada value string kosong di `items`; pakai tombol "×" clear yang sudah dibangun di
  komponen. Expose `reload()` lewat `defineExpose` untuk dipanggil dari halaman pemanggil
  setelah row action (mis. toggle aktif).
- `app/components/CrudFormPage.vue`: schema-driven (`FieldDef[]`), Ctrl+S simpan/Esc kembali
  (confirm kalau dirty), auto-focus field pertama (juga setelah "Simpan & Tambah Lagi"
  reset form — hanya muncul di mode create), validasi client (required) + error server 400
  dipetakan per-field (pakai `fieldErrors` kalau ada, atau cocokkan `message[]` gaya
  class-validator NestJS ke key field). Field `select`/`autocomplete` pakai
  `USelect`/`UInputMenu` — `UInputMenu` WAJIB `value-key="value"` eksplisit (default-nya
  beda dari `USelect`, tanpa itu `modelValue` jadi objek utuh bukan value-nya).
  `number`/`currency` pakai `UInputNumber` (bukan `useRupiah()` manual) supaya kursor tidak
  lompat saat mengetik.
- `app/composables/useApi.ts`: satu jalur panggilan API. Path `/api/...` → Nuxt server route
  lokal (dev mock, same-origin); path lain → backend NestJS lewat
  `runtimeConfig.public.apiBase`, dengan header `Authorization` disisipkan dari
  `useAuth().accessToken` dan retry sekali lewat `useAuth().refresh()` kalau backend
  membalas 401 (satu in-flight refresh dibagi semua request 401 yang datang bersamaan,
  lihat komentar di file — bukan `useState` supaya tidak ikut ter-serialize SSR).
  Helper `getErrorData/getErrorStatus/getErrorMessage` baca body `FetchError` tanpa `any`.
- `app/composables/useAuthUser.ts`: role aktif (`useState`, default MASTER) — dipakai
  `DataTable`/layout untuk filter `rowActions`/menu. Catatan: masih terpisah dari
  `useAuth()` (yang menyimpan `user` sungguhan dari login) — pertimbangkan disatukan
  kalau ada kebutuhan ganti-role tanpa re-login.
- `app/composables/useRupiah.ts`: format/parse Rupiah read-only (kolom tabel, ringkasan).
- Percontohan: `app/pages/master-data/warehouses/{index,create,[id]/edit}.vue` +
  `app/composables/useWarehouseSchema.ts` (schema dibagi, tidak duplikasi). Endpoint mock
  di `frontend/server/api/warehouses/` (in-memory, hilang tiap restart dev — **ganti** ke
  CRUD NestJS asli begitu Hari 4 BE selesai, jangan biarkan mock ini jadi permanen).
- Dokumentasi props & konvensi lengkap di `docs/frontend-engine.md` — baca ini dulu
  sebelum bikin halaman list/form baru.
- Catatan lingkungan dev: kalau `npm run dev` FE menolak jalan karena "Another Nuxt dev
  server is already running" padahal tidak ada proses nyata (lock file basi), pakai
  `NUXT_IGNORE_LOCK=1 npm run dev` — jangan hapus lock file manual.

Hari 4 — CRUD master data (BE saja; FE menyusul):
- `src/common/dto/pagination-query.dto.ts` + `src/common/pagination.ts`: satu kontrak
  pagination dipakai ulang oleh Products/Customers/Suppliers/Warehouses — `{page, limit,
  search, sortBy, sortDir}` → `{data, meta:{page,limit,total,totalPages}}` (sesuai kontrak
  `<DataTable>`). `resolveSortColumn()` whitelist kolom per modul supaya `sortBy` dari query
  string tidak dipakai mentah di `ORDER BY`.
- Migration baru `AddIsReceivableAccountToChartOfAccounts` (1785080602917): kolom
  `chart_of_accounts.is_receivable_account` (BOOLEAN, simetris `is_cash_account`), seed
  `true` untuk kode `1102` (Piutang Usaha). **Keputusan disepakati dengan user**: karena
  `account_type` (ASSET/LIABILITY/EQUITY/INCOME/EXPENSE) tidak cukup spesifik untuk
  membedakan akun piutang dari Persediaan/PPN Masukan yang sama-sama ASSET, validasi
  `ar_account_id` butuh flag sendiri — bukan match nama akun (rapuh) atau longgar ke semua
  ASSET (salah). `src/modules/chart-of-accounts/entities/chart-of-account.entity.ts` dibuat
  **hanya sebagai entity** untuk validasi FK modul lain — CRUD/controller COA penuh tetap
  Hari 15, jangan bikin controller COA duluan.
- **Products** (`src/modules/products/`): `unitConversions` dikirim nested dalam SATU
  payload `POST/PATCH`, disimpan dalam satu `dataSource.transaction()` bareng row
  `products`-nya (product create/update + delete-lama-insert-baru conversions, bukan
  patch parsial per baris). Validasi di `validators/validate-unit-conversions.ts`
  (dipanggil dari service, bukan di DTO — butuh cross-field): unit tidak boleh sama dengan
  `baseUnit`, tidak boleh duplikat sesama konversi, `level` wajib berurutan `1..N` tanpa
  lompat/duplikat (base unit sendiri TIDAK ikut ditulis ke `unitConversions`, qty implisit
  1). `qtyInBaseUnit` di entity bertipe `string` (bukan `number`) — konvensi TypeORM untuk
  kolom `numeric` supaya tidak ada presisi float hilang (CLAUDE.md §2.14); DTO tetap terima
  `number` dari JSON, dikonversi `String()` sebelum insert.
- **Customers** (`src/modules/customers/`): `arAccountId` divalidasi ke
  `ChartOfAccount` — harus `isActive=true` **dan** `isReceivableAccount=true`, kalau tidak
  400 `BadRequestException` bahasa Indonesia. `UpdateCustomerDto.arAccountId` terima
  `null` eksplisit (pakai `@ValidateIf` bukan `@IsOptional` saja) supaya bisa di-unset.
- **Suppliers** (`src/modules/suppliers/`): `display_code` auto dari
  `nextval('supplier_code_seq')` diformat `SUP-001` (bukan dari DTO — field ini tidak
  diterima dari client sama sekali). **Masking Operator** ada di `supplier-masking.ts`
  (fungsi murni `maskName`/`maskPhone`/`maskAddress`) + `supplier-masking.interceptor.ts`
  (`@UseInterceptors` di level Controller, cek `request.user.role === OPERATOR`, transform
  response — baik bentuk single object maupun `{data,meta}` list) — **bukan** di query,
  supaya tidak ada jalur bocor lain (CLAUDE.md §3). Pola masking: nama "PT Abadi Jaya" →
  "PT A***" (kata pertama utuh + huruf pertama kata kedua), telepon
  "081234567789" → "0812****789" (4 depan + **** + 3 belakang), alamat pakai pola sama
  dengan nama. `display_code` tidak pernah di-mask. **Test wajib**
  `suppliers-masking.spec.ts`: bukan mock — bikin app Nest penuh + user MASTER/OPERATOR
  sungguhan di DB (dibuat & dihapus dalam test, bukan bergantung seed), token JWT
  ditandatangani langsung lewat `JwtService` (skip endpoint `/auth/login` supaya tidak
  bentrok rate-limiter), lalu request asli lewat `supertest` ke guard+interceptor+service
  sungguhan. **Catatan cleanup**: hapus `audit_logs` milik user test dulu sebelum hapus
  user-nya sendiri (FK `audit_logs.user_id` → `users.id`), kalau tidak `afterAll` gagal.
- **Warehouses** (`src/modules/warehouses/`): validasi aplikasi (400 pesan jelas) untuk
  aturan yang sudah ada sebagai CHECK constraint DB (`CUSTOMER_CONSIGNMENT` wajib
  `customerId`, tipe lain wajib `customerId` kosong) — supaya user dapat pesan Indonesia,
  bukan raw Postgres constraint error. **`is_default` unik per `warehouseType`** (bukan
  global): begitu row baru/di-update jadi `isDefault=true`, service otomatis
  `UPDATE ... SET is_default=false` untuk row lain dengan `warehouseType` yang sama dalam
  transaction yang sama.
- **Settings** (`src/modules/settings/`, MASTER-only lewat `@Roles(Role.MASTER)` di level
  Controller): `GET /settings` mengembalikan value ter-parse sesuai `value_type`
  (`boolean`/`number`/`string`), bukan string mentah dari DB. `PATCH /settings/:key`
  menerima `value` apa adanya lalu divalidasi & di-stringify sesuai `value_type` row
  tsb sebelum disimpan (mis. kirim `123abc` ke setting `NUMBER` → 400).
- **RBAC yang dipakai** (belum eksplisit di CLAUDE.md §5 untuk 4 modul ini, jadi ini
  asumsi kerja — **cek ulang saat audit RBAC Hari 32** kalau ternyata salah): GET
  Products/Customers/Suppliers/Warehouses terbuka untuk semua role login; POST/PATCH
  dibatasi `@Roles(MASTER, OPERATOR)` (SUPERVISOR 403, konsisten pola Sales
  Order/Invoice/dsb). Settings MASTER-only (eksplisit sesuai matrix).
- Semua endpoint write (`POST`/`PATCH` di 5 modul ini) sudah dipasangi `@Audit(...)` —
  otomatis tercatat lewat `AuditInterceptor` global yang sudah ada dari Hari 2, tidak ada
  wiring baru.
- **Tidak ada route `DELETE`** di modul manapun (dibuktikan dari log startup Nest
  `Mapped {...}` dan `grep -rn "@Delete(" src` kosong) — nonaktifkan lewat
  `PATCH .../:id` dengan `isActive: false`.
- FE untuk 3 halaman (Products/Customers/Settings) **belum dikerjakan** — task ini
  eksplisit backend-only. Endpoint mock `frontend/server/api/warehouses/` (Hari 3) juga
  **belum diganti** ke backend asli — masih pekerjaan FE yang menyusul.

Hari 4 — FE Products/Customers/Settings (susulan, sama hari):
- `CrudFormPage.vue` dapat field type baru `repeater` (+ `RepeaterColumnDef` di
  `types/crud-form.ts`) — sub-tabel di dalam form, dipakai untuk `unitConversions` Produk.
  Enter di kolom terakhir baris terakhir menambah baris baru & fokus ke baris baru; Enter di
  kolom terakhir baris non-terakhir pindah ke baris berikutnya; Enter di kolom lain pindah ke
  kolom berikutnya (fokus dicari lewat `[data-repeater-cell="key:row:col"] input` di dalam
  `ref="formEl"` yang sekarang dipasang di `<form>`). Tombol hapus per baris + "Tambah baris".
  `field.required` diabaikan untuk type `repeater` (tidak masuk akal untuk array).
  **Loader `options` field select/autocomplete sekarang dibungkus try/catch** — endpoint
  sumber opsi yang belum ada/gagal (mis. `/chart-of-accounts`, lihat Customers di bawah)
  tidak lagi menggagalkan seluruh mount form, tinggal kosong.
- **Products** (`composables/useProductSchema.ts` + `pages/master-data/products/`): urutan
  field sengaja **nama duluan, baru kode** — `CrudFormPage` selalu fokus ke field index 0
  (juga setelah "Simpan & Tambah Lagi"), jadi urutan ini yang bikin fokus balik ke nama
  produk tanpa perlu prop baru di komponen. Level konversi satuan **disembunyikan dari UI**
  dan di-generate ulang otomatis dari urutan baris (`index+1`) di `productTransformOut` —
  operator tidak perlu mikir soal urutan level manual, tinggal susun baris dari satuan kecil
  ke besar. Baris repeater kosong (nama satuan blank) otomatis dibuang saat submit, form
  create mulai dengan 1 baris kosong siap ketik. `productTransformIn` urutkan
  `unitConversions` dari response naik berdasar `level` sebelum ditaruh ke form.
- **Customers** (`composables/useCustomerSchema.ts` + `pages/master-data/customers/`):
  `arAccountId` adalah `select` yang coba `GET /chart-of-accounts` — endpoint ini **belum
  ada** (dikonfirmasi 404 manual, CRUD COA penuh baru Hari 15 sesuai komentar di entity),
  jadi field ini kosong sampai saat itu; berkat perbaikan loader di atas, form tetap jalan
  normal tanpa field ini. Field lain (`isPkp` switch, `code`/`name`/`phone`/`address`) 1:1
  ke `CreateCustomerDto`/`UpdateCustomerDto`.
- **Settings** (`pages/pengaturan/index.vue`, menggantikan placeholder Hari 3): **BUKAN**
  `<CrudFormPage>` — bentuk data `GET /settings` adalah `TypedSetting[]` key-value, bukan
  satu entity ber-id, jadi form custom yang PATCH `/settings/:key` satu-satu per key yang
  berubah. 4 setting dikenal (`company_is_pkp`, `rounding_multiple`,
  `tax_calculation_mode`, `backdate_max_days`) dipetakan ke label + penjelasan bahasa awam
  lewat `SETTING_META`; key lain yang muncul di masa depan tetap ke-load (`extraKeys`) tapi
  belum ada UI untuk itu — tambahkan ke `SETTING_META`/`SETTING_ORDER` saat setting baru
  ditambah.
- **RBAC FE**: row action "Edit"/"Nonaktifkan"/"Aktifkan" di Products & Customers dibatasi
  `roles: ['MASTER','OPERATOR']` (SUPERVISOR tidak lihat, konsisten RBAC BE dari catatan di
  atas). **Celah yang belum diperbaiki** (bawaan Hari 3, bukan baru): tombol "Tambah" dari
  prop `createTo` di `<DataTable>` tidak punya role gate sendiri — SUPERVISOR tetap lihat
  tombolnya walau submit-nya akan 403. Belum disentuh di luar lingkup hari ini; masuk radar
  audit RBAC Hari 32 atau tambah prop `createRoles` di `<DataTable>` kalau mau dirapikan
  lebih awal.
- **Verifikasi**: `pnpm run lint`, `pnpm run typecheck`, `pnpm run build` di FE — semua
  hijau, 0 error. Kontrak API diverifikasi manual lewat curl terhadap backend asli (bukan
  mock): create Product 3 baris konversi (shape response sama persis dengan yang diharapkan
  `productTransformIn`), create Customer, `GET/PATCH /settings`, `GET /chart-of-accounts`
  (404, sesuai dugaan), OPERATOR 403 di `GET /settings` tapi 201 di `POST /products`.
  **Belum diuji visual di browser** — ekstensi Chrome tidak konek di sesi ini (tidak ada
  cara lain untuk browser automation tersedia), jadi alur keyboard murni (Tab/Enter/Ctrl+S)
  dan waktu input per produk **belum diukur langsung**, hanya diverifikasi lewat pembacaan
  kode. **Wajib dicoba manual di browser sebelum dianggap benar-benar selesai** — servers
  dev BE (`:3000`) & FE (`:3001`) ditinggal jalan di sesi ini untuk itu.

Hari 4 — Revisi Customer & Produk (susulan, sama hari, atas permintaan user):
- **Migration baru** `AddAddressDetailsToCustomers` (1785080602918): kolom `district`,
  `city`, `province` (VARCHAR(120), nullable) di `customers` — `address` lama tetap ada,
  sekarang dipakai khusus untuk "Alamat Lengkap" (jalan/nomor/RT-RW), bukan alamat penuh
  satu blok teks lagi. Diuji up→down→up di DB dev, sukses.
- **Customer — guardrail nomor telepon**: `@Matches` di `Create`/`UpdateCustomerDto`,
  format Indonesia `/^(\+?62|0)8[0-9]{7,11}$/` (mis. `081234567890` atau
  `+6281234567890`, tanpa spasi/strip). Pesan error sengaja diawali kata `phone` (bukan
  cuma teks Indonesia polos) supaya tetap ke-mapping ke field yang benar oleh
  `CrudFormPage.mapServerErrors` (dia mencocokkan `message[]` yang diawali nama field).
- **Customer — Aktif default true di form create**: `CrudFormPage` dapat prop baru
  `FieldDef.defaultValue` — `blankForm()` pakai ini kalau ada, sebelum fallback ke
  `switch→false`/`repeater→1 baris kosong`/lainnya→`null`. Sebelumnya SEMUA switch di
  form create selalu mulai `false` walau default DB `true`, karena FE selalu kirim nilai
  eksplisit. `useCustomerSchema` set `isActive: { defaultValue: true }`.
- **Produk — urutan input konversi satuan dibalik jadi besar→kecil**: repeater sekarang
  minta satuan TERBESAR dulu (mis. dus), lalu ke bawah makin kecil (renceng, lalu
  implisit satuan dasar). Kolom kedua repeater berubah makna dari "qty total dalam satuan
  dasar" jadi **rasio ke baris di bawahnya** (1 dus = berapa renceng, 1 renceng = berapa
  satuan dasar) — jauh lebih natural buat operator daripada harus mengalikan sendiri ke
  satuan dasar. `productTransformOut` mengalikan rasio bertingkat dari bawah (satuan
  terkecil) ke atas jadi `qtyInBaseUnit` absolut sebelum dikirim; `productTransformIn`
  membalik matematikanya pas edit. **Kontrak backend/`level` TIDAK berubah** (level 1 =
  satuan terkecil, tetap seperti semula) — murni transformasi di FE, dibuktikan lewat
  curl: kirim payload absolut yang dihitung tangan (dus qty=120 level=2, renceng qty=10
  level=1), GET balik, jalankan ulang matematika `productTransformIn` manual → hasil rasio
  dus=12, renceng=10, urutan [dus, renceng] — cocok.
- **`CrudFormPage` repeater — placeholder dinamis per baris**: `RepeaterColumnDef.placeholder`
  sekarang boleh fungsi `(ctx: {row, rowIndex, rows, form}) => string`, dipakai Produk untuk
  menampilkan hint "berapa renceng?" / "berapa pcs?" sesuai baris di bawahnya atau
  `baseUnit` kalau baris terakhir. Header kolom sendiri tetap statis (tidak ikut dinamis).
- **Verifikasi ulang**: BE `npm run lint`/`build`/`test` (15 test, 4 suite) hijau, migration
  up→down→up sukses; FE `pnpm run lint`/`typecheck`/`build` hijau. Kontrak API diverifikasi
  lagi lewat curl: phone invalid → 400 pesan field-matchable, phone valid + alamat terpecah
  → 201 tersimpan benar, customer tanpa `isActive` di body → DB default `true` (FE sendiri
  yang tadinya perlu diperbaiki, sudah lewat `defaultValue`), matematika kaskade konversi
  satuan produk terverifikasi round-trip. **Diuji visual di browser sore ini** (ekstensi
  Chrome akhirnya konek): login Master → Tambah Produk, toggle "Aktif" default ON tanpa
  disentuh, isi baris "DUS" lalu Enter (pindah ke kolom Isi, placeholder otomatis "berapa
  PCS?" karena belum ada baris di bawahnya) lalu Enter lagi (baris baru muncul, fokus
  otomatis pindah ke situ) → simpan → toast "Tersimpan" → tampil di list. Buka Edit produk
  3-tingkat lama (`dus`/`renceng`, tersimpan `qtyInBaseUnit` absolut 120/10) → form
  menampilkan rasio `dus=12`, `renceng=10` — cocok persis dengan perhitungan manual yang
  didokumentasikan di atas. Tambah Customer: toggle "Aktif" ON default, submit telepon
  `0812-3456-7890` (ada strip) → 400 muncul tepat di bawah field telepon; ganti ke
  `081234567890` + isi Kecamatan/Kota/Provinsi → simpan sukses. Data uji dihapus lagi dari
  DB dev setelah verifikasi.

Hari 5 — Export generik + Authorization Requests (BE) + Suppliers/Warehouses (FE):
- **`src/core/export/`** (`ExportService`, `ExportInterceptor`, dipakai lewat
  `@UseInterceptors(ExportInterceptor)` di endpoint laporan mana pun — belum dipasang di
  endpoint sungguhan, itu tugas Hari 26+): handler controller tetap mengembalikan JSON biasa
  `{ rows, columns, meta? }` (kontrak `ExportableResponse`); interceptor cuma mengubahnya jadi
  Buffer xlsx (ExcelJS)/pdf (PDFKit) + set `Content-Type`/`Content-Disposition` kalau request
  punya `?format=xlsx|pdf` — request tanpa query itu tetap dapat JSON apa adanya. PDF otomatis
  landscape kalau kolom > 6, ada header/footer (nama perusahaan, judul, filter, dicetak
  oleh+waktu, nomor halaman).
- **`src/modules/authorization-requests/`**: `AuthorizationRequest` entity (status
  PENDING/APPROVED/REJECTED/EXPIRED/EXECUTED), `POST /authorization-requests` (create),
  `GET /authorization-requests` (antrian pending, MASTER/SUPERVISOR — lazy-expire dicek tiap
  read), `POST /:id/approve` `/:id/reject` (MASTER/SUPERVISOR, tidak boleh approve/reject
  punya sendiri). **`StepUpGuard`** global (no-op tanpa `@RequiresStepUp(actionType)`, pola
  sama seperti `RolesGuard`+`@Roles()`) — hanya mengenai role OPERATOR (CLAUDE.md §13);
  request pertama tanpa header `X-Authorization-Request-Id` otomatis membuat authorization
  request lalu balas 412 `requiresAuthorization`; request ulang dengan header itu memanggil
  `consumeApproval` yang men-transisi APPROVED→EXECUTED lewat
  `UPDATE ... WHERE status='APPROVED' AND expires_at > now()` (atomic, sekali pakai, expiry
  dicek ULANG di level DB saat eksekusi — bukan cuma dipercaya dari status yang mungkin sudah
  basi). TTL 15 menit dipakai dua kali dengan makna beda: saat PENDING (batas waktu
  disetujui) dan saat APPROVED (di-reset dari waktu approve, jadi batas waktu dieksekusi).
  Endpoint `POST /authorization-requests/test-step-up-action` **sementara**, hanya untuk
  membuktikan `StepUpGuard` end-to-end hari ini (lihat `authorization-requests.spec.ts`) —
  **ganti dengan aksi step-up sungguhan** (VOID Sales Invoice dll, Hari 12/19+) lalu hapus ini.
  FE halaman Authorization Requests (antrian + modal approve) **belum dikerjakan** — itu
  scope Hari 7, bukan Hari 5.
- **Suppliers** (`frontend/app/composables/useSupplierSchema.ts` + `pages/master-data/
  suppliers/`): `displayCode` ditampilkan read-only (`disabled: true`) di form, TIDAK PERNAH
  dikirim ke server (di-drop lewat `transformOut`, backend juga sudah buang lewat
  `whitelist: true` seandainya terkirim). Masking Operator (dari Hari 4,
  `SupplierMaskingInterceptor`) transparan ke FE — tidak ada masking tambahan di client,
  cukup render apa adanya dari response.
- **Warehouses — DITULIS ULANG TOTAL** (`useWarehouseSchema.ts` + 3 halaman): skema
  percontohan Hari 3 (`code`, `type`, `address`, `is_active`, endpoint mock
  `frontend/server/api/warehouses/`) **dibuang semua** — bentuknya tidak cocok dengan entity
  backend sungguhan dari Hari 4 (`name`, `warehouseType`, `customerId`, `isDefault`,
  `isActive`; tidak ada `code`/`address` sama sekali). Endpoint mock + store in-memory
  dihapus, diarahkan ke `/warehouses` backend asli.
- **`FieldDef.showIf?: (form) => boolean`** (baru, `types/crud-form.ts` + `CrudFormPage.vue`):
  field `customerId` di form Warehouse cuma tampil kalau `warehouseType ===
  'CUSTOMER_CONSIGNMENT'`, pakai `v-show` (bukan `v-if`, supaya tidak remount/reset state)
  dan otomatis dilewati dari validasi `required` client-side saat tersembunyi. `transformOut`
  tetap memaksa `customerId: null` kalau tipe bukan konsinyasi, jaga-jaga kalau operator
  sempat pilih customer lalu ganti tipe sebelum submit.
- **`useApi().getBlob()`** (baru): GET dengan `responseType: 'blob'`, lewat jalur auth+retry
  401→refresh yang sama dengan `get/post/patch` — dipakai `useExport()`, BUKAN `$fetch`
  terpisah, supaya tidak ada jalur HTTP kedua yang lolos dari penanganan token.
- **`useExport()` + `<ExportButton>`** (baru, `composables/useExport.ts` +
  `components/ExportButton.vue`): panggil endpoint yang sama dengan `?format=xlsx|pdf` +
  filter tambahan, trigger download via blob + `<a download>`. **Nama file ditentukan di
  FE** (`fileNamePrefix` + tanggal dari `filters().date`/`.tanggal` atau hari ini + ekstensi)
  — **BUKAN** dibaca dari header `Content-Disposition` server. ⚠️ **Catatan rekonsiliasi
  untuk siapa pun yang menyambungkan `<ExportButton>` ke laporan sungguhan pertama kali
  (Hari 26+)**: `ExportInterceptor` backend (dibangun paralel hari ini, lihat di atas) SUDAH
  mengirim `Content-Disposition: attachment; filename="<slug-title>-<tanggal>.<format>"`
  sendiri dari `meta.title` — FE saat ini mengabaikan itu dan memakai nama hasil hitungnya
  sendiri. Kedua nama kemungkinan besar beda persis. Putuskan salah satu (FE baca header,
  atau BE berhenti kirim nama) sebelum halaman laporan pertama dianggap selesai, supaya
  tidak ada dua sumber kebenaran untuk nama file.
- Endpoint dummy `frontend/server/api/export-demo.get.ts` + halaman QA
  `frontend/app/pages/qa/export-demo.vue` (MASTER-only, tidak di nav) dipakai untuk uji
  `<ExportButton>` sebelum endpoint laporan backend ada. **Hapus keduanya** begitu ada
  halaman laporan sungguhan yang memakainya untuk verifikasi.
- **Verifikasi FE manual di browser** (Master & Operator): Supplier create + masking Operator
  benar (`PT A***`, `0812****890`, `displayCode` tetap tampil penuh); Warehouse create — field
  "Customer Penitip" terbukti muncul/hilang reaktif saat ganti Tipe Gudang (STORE ↔
  CUSTOMER_CONSIGNMENT), validasi required client-side untuk field wajib; `<ExportButton>`
  — network `200` ke `/api/export-demo?format=xlsx|pdf`, isi file di disk dicek benar
  (`"Dummy export (xlsx)..."`), error path (endpoint 404) menampilkan toast. **Catatan**: nama
  file unduhan tidak bisa dikonfirmasi visual di sesi ini — sandbox Chrome automation yang
  dipakai menyimpan file dengan nama GUID acak (`.tmp`), bukan dari atribut `download`
  anchor; ini perilaku sandbox-nya, bukan bug `buildFileName()` (sudah diisolasi lewat test
  anchor-download polos di luar composable, hasilnya sama). Perlu dicoba sekali di Chrome
  normal untuk kepastian visual penuh.

Hari 6 — Journal Poster + journal_entries/journal_entry_lines (BE saja; FE menyusul):
- **Migration** `1785080602920-CreateJournalEntries`: `journal_entries` (entry_number
  unique, entry_date, source_type/source_id generik untuk dipakai modul manapun,
  is_reversal + reversed_entry_id nullable untuk VoidEngine Hari 8, created_by FK
  users) → `journal_entry_lines` (account_id FK chart_of_accounts, debit_amount/
  credit_amount `NUMERIC(16,2)` default 0, `CHECK ((debit_amount > 0) <> (credit_amount
  > 0))`, `ON DELETE CASCADE` ke parent, line_order). **Sengaja tidak ada
  UpdateDateColumn/trigger `set_updated_at`** di kedua tabel — jurnal tidak pernah
  di-UPDATE (CLAUDE.md §2.1/§2.6), pembatalan lewat baris pembalik baru (Hari 8), bukan
  mengubah baris lama. Diuji up→down→up di DB dev asli (bukan cuma DB sementara
  `verify.sh`) — migration ini sekarang **sudah applied** di `omega_dev` (sebelumnya
  sempat lupa dijalankan di luar siklus `verify.sh`, ketahuan lewat test integration
  yang gagal `relation "journal_entries" does not exist`; jangan lupa `npm run
  migration:run` manual tiap kali migration baru dibuat, `verify.sh` cuma menguji
  reversibilitas di DB sementara, bukan menerapkannya ke DB dev harian).
- **`src/core/journal-poster/journal-poster.service.ts`** (`JournalPosterService`):
  menerima `EntityManager` dari pemanggil, **tidak pernah membuka transaction sendiri**
  (pola sama `DocumentCounterService`/`StockRecorder` nanti). Urutan validasi sengaja:
  struktur baris dulu (murah, tanpa query — min 2 baris, tepat satu sisi > 0 per baris,
  balance dibanding sebagai **integer sen** `Math.round(x*100)` supaya tidak kena
  float `0.1+0.2!==0.3`) → validasi yang butuh DB (backdate terhadap
  `settings.backdate_max_days`, semua `account_id` ada & `is_active=true`) →
  **BARU setelah semua lolos** panggil `DocumentCounterService.getNextNumber('JOURNAL_ENTRY',
  ...)`. Urutan ini penting: `entry_number`/`document_counters` tidak pernah tersentuh
  sama sekali kalau validasi gagal di titik manapun — bukan cuma "di-rollback transaction",
  tapi memang belum pernah dipanggil. `PostJournalDto`/`PostJournalLineDto` di
  `dto/post-journal.dto.ts` (interface polos, bukan class-validator — tidak ada
  controller HTTP yang mem-bind DTO ini langsung, dipakai murni sebagai kontrak
  internal antar-service). `JournalPosterModule` **belum diimport ke `AppModule`**
  (sama seperti `DocumentCounterModule`) — menunggu modul pemanggil pertama (Manual
  Journal Hari 9, Purchase/Sales Invoice Hari 11+).
- **Test** `journal-poster.service.spec.ts`: integration test terhadap Postgres asli
  (pola sama `document-counter.service.spec.ts`, `new JournalPosterService(new
  DocumentCounterService())` langsung tanpa Nest app), 7 test — kelima validasi wajib
  + backdate + format nomor. **Bukti rollback eksplisit**: test balance-mismatch
  meng-`console.log` isi `document_counters` sebelum & sesudah percobaan gagal,
  keduanya `last_number: 1` (tidak naik). Test CHECK constraint DB (`debit=0 AND
  credit=0`) sengaja bypass service — raw SQL `INSERT` langsung ke `journal_entry_lines`
  untuk membuktikan constraint level-DB independen dari validasi aplikasi (defense in
  depth). User/akun uji dibuat & dihapus sendiri dalam test (bukan bergantung seed),
  konsisten pola `authorization-requests.spec.ts`.
- **`src/modules/journal-entries/`** (read-only, GET saja — **tidak akan pernah ada**
  POST/PATCH/DELETE di controller ini; posting HANYA lewat `JournalPosterService`
  dipanggil modul transaksi lain): `GET /journal-entries` (filter `dateFrom`/`dateTo`/
  `sourceType`/`sourceId`/`accountId`, search nomor+deskripsi) mengembalikan list
  **tanpa** `lines` (sengaja — `leftJoinAndSelect` relasi one-to-many dibarengi
  `skip`/`take` bikin paginasi salah begitu satu entry punya >1 baris, LIMIT Postgres
  jalan di level baris JOIN bukan per-entry; lihat catatan yang sama berlaku di
  `ProductsService.findAll` — konvensi list=ringkas/detail=lengkap dipilih di sini
  supaya tidak mewarisi bug itu). Filter `accountId` pakai `EXISTS` subquery (bukan
  join ke tabel lines) supaya tidak ikut menduplikasi baris hasil. `GET
  /journal-entries/:id` baru eager-load `lines` (+ `account` masing-masing baris,
  urut `lineOrder`).
  **RBAC — asumsi kerja** (belum eksplisit di CLAUDE.md §5 untuk endpoint ini, sama
  seperti asumsi RBAC Products/Customers/dll Hari 4): disamakan dengan `GET
  /chart-of-accounts` (`MASTER`+`SUPERVISOR`, `OPERATOR` 403) karena ini buku besar
  mentah per-akun, bukan ringkasan seperti "Laporan" biasa — **cek ulang saat audit
  RBAC Hari 32**.
Hari 6 — FE COA (tree) + Jurnal (list+detail), susulan sama hari:
- **`GET /chart-of-accounts` baru ditambahkan** (`src/modules/chart-of-accounts/
  chart-of-accounts.{controller,service,module}.ts`, entity-nya sendiri sudah ada
  sejak Hari 4): read-only, flat list terurut `code`, `@Roles(MASTER, SUPERVISOR)`
  — **CRUD penuh (create/update akun, kas/bank custom) tetap Hari 15**, endpoint ini
  cuma dibuat lebih awal karena FE COA & filter akun Jurnal butuh data akun nyata
  hari ini. Ini penyimpangan dari catatan "Dicatat, TIDAK dikerjakan" versi BE-only
  di atas — diputuskan lanjut membuatnya (bukan menunda) begitu FE task hari ini
  eksplisit butuh endpoint ini untuk lolos DoD.
- **RBAC `GET /journal-entries` direvisi**: `@Roles(MASTER, SUPERVISOR)` yang
  ditulis pas endpoint ini dibuat (asumsi kerja, lihat catatan BE di atas) **dihapus**
  — dibuka untuk SEMUA role login (tidak ada `@Roles()` di controller = lolos
  `RolesGuard`). Sesuai instruksi tugas FE hari ini ("Jurnal boleh dilihat semua
  role"), beda dari `GET /chart-of-accounts` yang tetap Operator 403. **Cek ulang
  bareng permission matrix lengkap saat audit RBAC Hari 32** — keputusan ini
  menggantikan asumsi sebelumnya, belum eksplisit tertulis di CLAUDE.md §5.
- **`<DataTable>` dapat prop baru `onRowClick?: (row: T) => void`**
  (`components/DataTable.vue`): seluruh `<tr>` jadi klikable kalau prop ini diisi
  (cursor-pointer + `@click`), sel kolom aksi (dropdown "...") tetap `@click.stop`
  supaya klik menu tidak ikut memicu `onRowClick`. Dipakai halaman Jurnal untuk
  buka drawer detail — pola generik ini (nambah prop, bukan fork komponen)
  konsisten aturan CLAUDE.md §6.
- **Bagan Akun** (`composables/useChartOfAccountsTree.ts` + `components/
  ChartOfAccountsTreeNode.vue` + `pages/akuntansi/bagan-akun/index.vue`): tree
  disusun di FE dari flat list `GET /chart-of-accounts` lewat `parentId`
  (`buildAccountTree`, urut `code` per level) — **bukan** `<DataTable>` (tabel
  server-paginated tidak cocok untuk struktur pohon). Expand/collapse per-node
  (`reactive<Record<string,boolean>>`, bukan `Set` — supaya reaktivitas Vue
  granular per key) + tombol "Expand semua"/"Collapse semua". Search
  (`v-model="search"`, tanpa debounce — dataset kecil, murni client-side) meng-hasilkan
  `visibleIds` (hasil cocok + semua leluhurnya) dan otomatis anggap semua node itu
  ter-expand selama pencarian aktif, node di luar `visibleIds` disembunyikan penuh
  (bukan cuma di-dim). Kolom "Saldo" sengaja kosong (`—`) — disiapkan, belum ada
  sumber datanya (baru dari laporan/rekonsiliasi stok Hari 26+). Dengan 11 akun
  seed (semua `parentId` NULL, benar-benar flat — belum ada sub-akun sungguhan di
  DB manapun), tree hari ini secara visual cuma menampilkan 11 node level-atas
  tanpa expand icon; struktur rekursifnya sendiri sudah diuji lewat kode &
  komponen self-referencing Nuxt (auto-registered), tinggal dipakai begitu Hari 15
  menambah akun dengan `parentId` terisi.
- **Jurnal** (`pages/akuntansi/jurnal/index.vue`): `<DataTable endpoint="/journal-entries">`
  dengan filter `{ key: 'date', type: 'date-range' }` (sengaja `date` bukan
  `entryDate` — `<DataTable>` mengirim `${key}From`/`${key}To`, harus persis cocok
  `JournalEntryQueryDto.dateFrom/dateTo`) dan filter akun (`select`, opsi dari
  `GET /chart-of-accounts` — dibungkus try/catch, gagal senyap/kosong untuk
  Operator yang 403 di endpoint itu, TIDAK mematikan halaman Jurnal). Klik baris
  (`onRowClick`) buka `USlideover` (Nuxt UI) yang fetch `GET /journal-entries/:id`
  on-demand: tabel baris debit/kredit per akun + baris footer total (dijumlah
  `Number(debitAmount)`/`Number(creditAmount)` di FE, BUKAN dipercaya sama dari
  backend — murni tampilan, bukan validasi ulang balance). Badge "Pembalik" di
  kolom list + banner "Jurnal Pembalik" di drawer kalau `isReversal`, dengan
  lookup tambahan `GET /journal-entries/:reversedEntryId` untuk menampilkan
  **nomor** jurnal asli yang dibalik (bukan cuma UUID mentah) — dibungkus
  try/catch, fallback tampil UUID kalau lookup gagal.
- **`utils/formatDate.ts`** (baru, auto-import Nuxt dari folder `utils/`): format
  `'YYYY-MM-DD'` → `'DD/MM/YYYY'` lewat pemotongan string, SENGAJA tidak lewat
  `new Date(value)` — konsisten dengan alasan `JournalEntry` entity BE menyimpan
  `entryDate` sebagai string mentah (hindari pergeseran tanggal akibat timezone
  browser).
- **Verifikasi**: `pnpm run lint`/`typecheck`/`build` FE hijau, `npm run build`/
  `lint`/`test` (30 test) BE hijau, `./scripts/verify.sh` 10/10. Kontrak API
  diverifikasi lewat curl asli (bukan mock): `GET /chart-of-accounts` — MASTER
  200 (11 akun), SUPERVISOR 200, OPERATOR 403; `GET /journal-entries` — ketiga
  role 200 (termasuk Operator, sesuai revisi RBAC di atas); detail jurnal 3-baris
  contoh (dibuat sementara lewat `JournalPosterService` langsung dari script
  ts-node sekali-jalan untuk QA — **dihapus lagi dari DB dev + reset
  `document_counters` JOURNAL_ENTRY setelah verifikasi**, konsisten konvensi
  Hari 4/5) membuktikan total debit = total kredit di footer, dan satu entry yang
  ditandai `isReversal=true` tampil dengan badge + "Membalik jurnal JE/2607/0005"
  yang benar; filter `accountId` ke akun Persediaan mengembalikan persis 2 entry
  yang menyentuh akun itu. **Belum diuji visual di browser** — ekstensi Chrome
  tidak konek di sesi ini (`tabs_context_mcp` gagal, "Browser extension is not
  connected"), jadi expand/collapse tree, auto-expand search, drawer
  buka/tutup, dan styling `USlideover` **belum dikonfirmasi visual langsung**,
  hanya lewat pembacaan kode + kontrak data API asli. **Wajib dicoba manual di
  browser** sebelum dianggap benar-benar selesai — servers BE (`:3000`) & FE
  (`:3001`) ditinggal jalan di sesi ini untuk itu.

Hari 8 — Master baru (Merek/UoM/Salesman) + rework Produk + resolveArAccount +
rename warehouse_type (BE saja; FE menyusul):
- **Migration** `1785080602924`–`1785080602926` (`CreateBrands`/`CreateUnits`/
  `CreateSalesmen`): tiga tabel kecil identik (`code` unique, `name`, `is_active`,
  trigger `set_updated_at`) — tidak ada FK ke tabel lain hari ini. **`units` (satuan
  jual/beli) berdiri sendiri, BELUM di-FK** ke `products.base_unit`/
  `product_unit_conversions.unit_name` (keduanya masih free text seperti sejak
  Hari 3/4) — bukan lupa, tidak diminta eksplisit di prompt hari ini; lihat catatan
  §3 tanggal 30 Jul soal kapan ini harus diputuskan.
- **Migration** `1785080602927-ReworkProducts`: `TRUNCATE product_unit_conversions,
  products` dulu (isinya cuma sisa smoke test `TEST-SMOKE-*`/`P--02` Hari 3/4, dicek
  manual via psql sebelum ditulis — bukan data klien, input master data klien baru
  mulai hari ini) supaya kolom baru bisa langsung `NOT NULL` tanpa backfill. Kolom
  `name` **dihapus**, diganti `brand_id` (FK `brands`, NOT NULL) + `keterangan` (NOT
  NULL) + `kemasan` (nullable) + `ukuran_uom` (nullable, gabungan Ukuran+UoM kemasan
  jadi satu field teks — CLAUDE.md §3 sebut ini bagian dari "empat bagian" nama meski
  narasinya menyebut 5 komponen) + `display_name` (NOT NULL, dihitung ulang di
  aplikasi tiap create/update karena butuh join `brands.name`, **bukan** generated
  column DB) + index B-tree biasa `idx_products_display_name` (bukan trigram/GIN —
  konsisten pola pencarian `ILIKE` yang sudah dipakai Customers/Suppliers, belum ada
  `pg_trgm` di project). `is_bkp` (default false), `ean_barcode` (nullable, tidak
  dipakai MVP), `is_code_locked` (default false, lihat `ProductsService.lockCode()`
  di bawah), `CHECK (code ~ '^[0-9]{10}$')`, sequence `product_code_seq` **global**
  (tidak reset harian/bulanan, beda pola dari `document_counters`) untuk pembangkit
  kode otomatis kalau operator kosongkan `code` saat create.
- **`ProductsService`** (`products.service.ts`): `create()`/`update()` sekarang
  resolve `Brand` aktif dulu (400 kalau tidak aktif/tidak ada), hitung
  `displayName = [brand.name, keterangan, kemasan, ukuranUom].filter(Boolean).join(' ')`,
  dan kalau `code` dikosongkan bangkitkan `${YYMMDD}${seq4digit}` dari
  `product_code_seq`. **`lockCode(id, manager?)`**: titik masuk tunggal untuk
  mengunci kode produk begitu dipakai transaksi pertama — idempotent
  (`WHERE id=... AND is_code_locked=false`), **belum ada pemanggil produksi hari
  ini** (StockRecorder Hari 10 / Faktur Hari 14+21 yang akan memanggilnya). `update()`
  menolak 400 kalau `code` diubah pada produk yang `isCodeLocked=true` — pesan
  Bahasa Indonesia, field lain tetap bisa diubah. `findAll()` search sekarang lewat
  `code`/`displayName` (bukan `name` yang sudah tidak ada).
- **`src/core/receivables/`** (`ArAccountResolverService` + `ReceivablesModule`):
  `resolve(customer, manager?)` → `customer.arAccountId ?? settings.default_ar_account_id`
  (baca langsung dari tabel `settings` lewat `manager` pemanggil kalau ada, supaya
  ikut transaction yang sama — pola sama `DocumentCounterService`). **Satu-satunya
  pemanggil hari ini adalah test integrasi** (`ar-account-resolver.service.spec.ts`,
  3 test: pakai `arAccountId` langsung, jatuh ke default, 400 kalau default kosong)
  — pemanggil produksi menyusul di Hari 12 (Saldo Awal), 21 (Faktur Penjualan), 23
  (Retur Penjualan), 26-27 (Payment), dan pembalikan VOID, sesuai instruksi "buat
  sekarang meski baru satu pemanggil".
- **`suppliers.is_pkp`** (migration `1785080602928`): boolean default false,
  simetris `customers.is_pkp` (sudah ada sejak Hari 3) — menggerbangi PPN masukan
  bersama `products.is_bkp` (CLAUDE.md §2.11). Tidak disentuh masking interceptor
  (`maskSupplier` cuma menyamarkan name/phone/address, field lain lewat apa adanya).
- **Rename `warehouse_type` `CUSTOMER_CONSIGNMENT` → `TITIPAN_PELANGGAN`**
  (migration `1785080602929`): `ALTER TYPE ... RENAME VALUE` — OID enum tidak
  berubah jadi CHECK constraint `chk_warehouse_consignment_customer` & baris
  existing tetap valid tanpa disentuh. Migration lama (`1785080602913-
  CreateWarehouses`) **sengaja tidak diedit** (fakta historis, migration yang sudah
  applied tidak boleh diubah) — nama lama masih muncul di situ dan di migration
  rename ini sendiri (perlu merujuk nilai lama untuk `RENAME VALUE ... TO ...`);
  `grep -rn CUSTOMER_CONSIGNMENT` di kode aktif (bukan migration) sudah bersih,
  termasuk **FE** `useWarehouseSchema.ts` + `pages/master-data/warehouses/index.vue`
  yang ikut disesuaikan meski prompt hari ini backend-only (dibiarkan rusak akan
  bikin FE mengirim value enum yang sudah mati).
- **Verifikasi**: `./scripts/verify.sh` 10/10 (build+lint BE 0 error, migration
  up→down→up di DB bersih, test BE 37/37 lolos termasuk 4 test baru hari ini,
  `/health` 200, build+lint FE). Kontrak API diverifikasi manual lewat curl
  terhadap backend asli setelah membersihkan proses `node` basi yang masih nyangkut
  di port 3000 dari sesi sebelumnya (`EADDRINUSE`, ketahuan dari log start yang
  gagal — proses lama di-kill dulu sebelum lanjut): create Brand/Unit/Salesman,
  create Produk 4-bagian → `displayName` persis "Bendera Putih Sachet 37 gr" +
  ketemu lewat `?search=bendera`, `code` format salah → 400, lock lalu ubah `code`
  → 400 tapi ubah field lain tetap 200, Supplier `isPkp=true` tersimpan, Warehouse
  `TITIPAN_PELANGGAN` tersimpan sementara `CUSTOMER_CONSIGNMENT` lama → 400 (enum
  sudah tidak dikenal). Semua data uji dihapus lagi dari DB dev setelah verifikasi
  (tidak ada endpoint DELETE — dibersihkan lewat psql langsung, konsisten konvensi
  Hari 4/5).
- **Belum dikerjakan** (di luar lingkup prompt BE hari ini, FE menyusul): halaman
  Merek/UoM/Salesman, form Produk dengan nama tersusun + preview `display_name`,
  dan pemberitahuan ke klien bahwa pengisian master data boleh dimulai (masuk akal
  ditunda sampai ada layar sungguhan untuk diisi, bukan cuma API).

Hari 8 — FE Merek/Satuan/Salesman + rombak form Produk + gerbang Akun Piutang
(susulan, sama hari):
- **`useSimpleMasterSchema(nameLabel, namePlaceholder)`** (baru,
  `composables/useSimpleMasterSchema.ts`): satu schema `{code, name, isActive}` dipakai
  ulang oleh Merek/Satuan/Salesman — ketiganya identik persis di backend (lihat
  brands/units/salesmen controller+entity Hari 8). **Bukan** fork 3x — CLAUDE.md §6
  ("dilarang copy-paste layout, tambah prop untuk varian"); varian di sini cukup label.
  9 halaman baru (`pages/master-data/{brands,units,salesmen}/{index,create,[id]/edit}.vue`)
  mengikuti pola `<DataTable>`+`<CrudFormPage>` yang sama persis dengan Suppliers/Warehouses.
- **`CrudFormPage`/`crud-form.ts` — 3 kemampuan generik baru**, dipakai form Produk tapi
  tersedia untuk form manapun berikutnya (pola sama seperti `showIf`/`defaultValue` Hari 4/5):
  - `FieldType 'display'` + `FieldDef.compute(form)`: banner teks besar read-only,
    dihitung ulang tiap render — dipakai pratinjau `display_name` Produk.
  - `FieldDef.hint` sekarang boleh **fungsi** `(form) => string`, bukan cuma string statis
    — dipakai hint Kode Produk yang berubah tergantung `isCodeLocked`.
  - `FieldDef.action` (`{icon, label, onClick, hidden?}`): tombol di samping input teks
    (flex row) — dipakai tombol "Bangkitkan" kode produk, `onClick` cukup
    `setField('code', '')` supaya backend yang membangkitkan otomatis saat `POST /products`
    tanpa `code` (kontrak sudah ada sejak Hari 8 BE, bukan endpoint baru).
- **`useProductSchema.ts` — rombak total** (baseline Hari 4 lama sudah mati sejak
  entity direwrite Hari 8 BE): Merek (`select`, opsi dari `GET /brands`, filter `isActive`,
  cache nama merek di closure untuk `compute()` tanpa fetch ulang) → Keterangan → Kemasan →
  Ukuran (`text`) + Satuan Ukuran (`select`, **daftar statis** gr/kg/ml/liter/pcs di FE —
  ini "UoM kemasan" CLAUDE.md §3, BEDA dari master `units` Hari 8 yang untuk satuan
  jual/beli, jadi sengaja tidak fetch dari `/units`) → **Pratinjau Nama Produk** (banner
  besar) → Kode Produk (manual + Bangkitkan + terkunci `disabled`/hint dinamis kalau
  `isCodeLocked`) → `is_bkp` (label awam "Barang Kena Pajak (PPN dari supplier dihitung)")
  → Aktif → Satuan Dasar → field tersembunyi `isCodeLocked` (`showIf: () => false`, murni
  metadata dari server supaya `disabled`/`hint`/`action.hidden` Kode Produk bisa membacanya
  — form tidak menyimpan field yang tidak dideklarasikan di schema) → repeater Konversi
  Satuan Jual/Beli (dipertahankan dari Hari 4, cuma label diperjelas "1 [besar] = [Isi]
  [di bawahnya]"). `productTransformIn`/`Out` memecah/menggabung `ukuranUom` server
  (satu string mis. "37 gr") ↔ `ukuran`+`ukuranUomPart` form (pecah dari token terakhir
  kalau cocok salah satu opsi dikenal, else seluruh string masuk "Ukuran" apa adanya —
  tidak pernah gagal parse). `code` di payload **cuma dikirim kalau terisi** — kosong
  (baru atau setelah klik Bangkitkan) berarti "biarkan backend generate" saat create,
  "jangan ubah" saat update (backend tidak regenerate kode saat edit, di luar lingkup
  hari ini untuk diubah).
- **`useCustomerSchema.ts` — `arAccountId` digerbangi ke MASTER di level schema**
  (field literal tidak dimasukkan ke array untuk role lain), **bukan** `showIf` yang
  cuma `v-show` (elemen tetap ada di DOM tersembunyi) — DoD hari ini eksplisit
  mensyaratkan field ini **tidak ada di DOM sama sekali** untuk Operator, dibuktikan
  lewat `get_page_text`, bukan cuma screenshot visual. **Bug laten ditemukan &
  diperbaiki**: kode Hari 4 memanggil `GET /chart-of-accounts` dengan asumsi bentuk
  `{data, meta}` (pola paginated seperti modul lain) padahal
  `ChartOfAccountsController.findAll()` mengembalikan **flat array** — sebelumnya tidak
  pernah ketahuan karena endpoint itu 404 sampai Hari 6, dan `CrudFormPage` menelan
  error loader dengan aman (fail-silent). Opsinya sekarang disaring
  `isActive && isReceivableAccount` di FE (CLAUDE.md §3: "tersaring hanya akun bertipe
  piutang yang aktif").
- **`pages/master-data/products/index.vue`**: kolom `name` (sudah tidak ada di entity)
  diganti `displayName`, tambah kolom `BKP`.
- **`config/navigation.ts`**: tambah menu Merek, Satuan, Salesman (grup master data).
- **Verifikasi**: `pnpm run lint`/`build` FE 0 error, `npm run build` BE 0 error (BE
  tidak disentuh hari ini, dicek ulang supaya tidak regresi). **Diuji visual penuh di
  browser** (ekstensi Chrome konek): login Master → buat Merek "Bendera" → buat Produk
  4 bagian, pratinjau live berubah tiap ketik, berhenti persis di **"Bendera Putih
  Sachet 37 gr"** (dibandingkan ke contoh baku CLAUDE.md §3, cocok karakter-per-karakter)
  → simpan → kode `2607300011` ter-generate otomatis, list menampilkan `displayName`+
  konversi `dus`+BKP `-`. Login Operator → `/master-data/customers/create` →
  `get_page_text` dipastikan tidak memuat teks "Akun Piutang" di mana pun. Login Master
  ulang → field itu muncul, dropdown dibuka → hanya "1102 - Piutang Usaha" (satu-satunya
  akun piutang aktif di seed). **Data uji dihapus lagi dari DB dev** lewat skrip
  sekali-jalan (`AppDataSource` langsung, pola sama `seed.ts`, dihapus setelah dipakai)
  — konsisten konvensi Hari 4/5/8, bukan lewat endpoint DELETE (tidak ada).
- **Belum dikerjakan / di luar lingkup sengaja**: pemberitahuan ke klien bahwa pengisian
  master data boleh dimulai (layar sudah ada, tinggal dikabari — tindakan nyata di luar
  kode); FK `unitName`/`baseUnit` Produk ke master `units` (masih free text, keputusan
  yang sama seperti dicatat §3 30 Jul belum diambil); commit git untuk Hari 7+8 (BE dan
  FE keduanya masih uncommitted di working tree per akhir hari ini).

Hari 9 — AuthorizationRequests berpayload utuh + StepUpService dinamis (BE saja;
FE antrian belum, lihat §3):
- **Migration** `1785080602930-AddContextSummaryToAuthorizationRequests`: kolom
  `context_summary` TEXT NOT NULL (dua langkah ADD nullable → backfill `''` →
  SET NOT NULL, aman dijalankan di atas baris lama). `payload` JSONB sudah ada
  sejak migration Hari 5 (`1785080602919`), tidak disentuh.
- **`action-type.enum.ts`** (baru): `ActionType` — `VOID_DOCUMENT`, `UNLOCK_PRINT`,
  `SELL_BELOW_COST`, `CASH_OUTFLOW`, `BS_TO_STORE`. Murni kontrak nama, entity
  `actionType` tetap `varchar` (bukan DB enum) supaya actionType baru tidak
  butuh migration `ALTER TYPE`.
- **`payload-matchers.ts`** (baru): `matchesApprovedPayload(actionType, approved,
  current)` — comparator per actionType (CLAUDE.md §19, "jangan deep-equal
  buta"), bukan satu fungsi generik untuk semua. Terdaftar hari ini: `CASH_OUTFLOW`
  (`exactFields(['accountId','amount'])`) dan `TEST_STEP_UP_ACTION` (selalu
  cocok, payload-nya tidak sensitif). **`VOID_DOCUMENT`/`UNLOCK_PRINT`/
  `SELL_BELOW_COST`/`BS_TO_STORE` SENGAJA belum didaftarkan** — actionType yang
  belum punya entry membuat `matchesApprovedPayload()` throw (fail closed),
  supaya lupa mendaftarkan comparator ketahuan langsung, bukan diam-diam
  meloloskan payload apa pun. Lihat catatan §3 — hari pemanggil pertama tiap
  actionType WAJIB menambah entry di sini.
- **`step-up-response.ts`** (baru): `stepUpRequiredException(authorizationRequestId,
  message)` — satu-satunya tempat yang membentuk body+status HTTP 412
  `{requiresAuthorization, authorizationRequestId, message}`. Dipakai `StepUpGuard`
  DAN `StepUpService` sehingga bentuk responsnya identik byte-per-byte (dibuktikan
  `step-up.service.spec.ts`, bandingkan 412 dari jalur HTTP guard vs pemanggilan
  langsung `StepUpService.requireApproval()` berdampingan).
- **`StepUpPayloadMismatchError extends StepUpNotReadyError`** (di
  `step-up-not-ready.error.ts`): sub-kasus baru — status APPROVED & belum
  kedaluwarsa, tapi body yang dieksekusi tidak cocok payload yang disetujui.
  Ditangkap lewat `instanceof StepUpNotReadyError` yang sama (satu jalur
  penanganan frontend), dibedakan subclass murni untuk kejelasan test.
- **`AuthorizationRequestsService`** direvisi: `create()`/`findOneOrFail()`/
  `consumeApproval()`/`applyLazyExpiry()` (private) semua menerima
  `manager?: EntityManager` opsional (pola sama `ArAccountResolverService.resolve()`
  Hari 8) — `repoFor(manager)` pakai `manager.getRepository(...)` kalau ada,
  supaya `StepUpService` dari service bisnis lain bisa ikut transaction
  pemanggilnya. `consumeApproval()` sekarang **wajib** parameter
  `currentPayload` — divalidasi lewat `matchesApprovedPayload()` **sebelum**
  UPDATE atomik APPROVED→EXECUTED; kalau tidak cocok, approval **TIDAK**
  ikut terkonsumsi (tetap APPROVED, siap dipakai kalau payload yang benar
  disusulkan) — hanya `StepUpPayloadMismatchError` yang dilempar.
- **`StepUpGuard`** direvisi: pakai `stepUpRequiredException()` (412, bukan lagi
  `HttpException` manual dengan `HttpStatus.PRECONDITION_REQUIRED`/428), payload
  `{params, body}` dibangun sekali dan dipakai ulang untuk `create()` (saat belum
  ada header) maupun `consumeApproval()` (saat retry dengan header) supaya
  payload yang dicocokkan konsisten. `contextSummary` untuk jalur guard
  otomatis generik (`"${actionType} — permintaan step-up otomatis (METHOD
  URL)"`) karena guard tidak tahu konteks bisnis — didokumentasikan sebagai
  fallback, modul bisnis nanti sebaiknya pakai `StepUpService.requireApproval()`
  langsung dengan kalimat context_summary yang sungguhan.
- **`src/core/step-up/`** (baru, `StepUpService` + `StepUpModule`, diimport ke
  `AppModule`): `requireApproval({user, actionType, payload, contextSummary,
  authorizationRequestId?, manager?})` — dipanggil DARI DALAM service bisnis
  (bukan guard/controller) untuk aksi yang syaratnya bergantung pada ISI
  transaksi. Tanpa `authorizationRequestId` → `create()` lalu throw 412;
  dengan `authorizationRequestId` → `consumeApproval()`, tangkap
  `StepUpNotReadyError` lalu throw 412 yang sama. **Belum ada pemanggil
  produksi hari ini** (pola sama `ArAccountResolverService`/`DocumentCounterService`
  — "buat sekarang meski baru satu pemanggil/test"); pemanggil pertama menyusul
  Hari 13/15/17/21, lihat catatan wajib di §3.
- **Kode status 428→412 diseragamkan** di seluruh kode aktif: `StepUpGuard`,
  `authorization-requests.spec.ts` (3 `.expect(428)` → `.expect(412)`, plus 3
  body `POST /authorization-requests` ditambah `contextSummary`). `grep -rn
  428` di `backend/src` sekarang nihil.
- **Test baru**: `payload-matchers.spec.ts` (unit, tanpa DB — matcher `CASH_OUTFLOW`
  match/mismatch/field-tidak-relevan, `TEST_STEP_UP_ACTION` selalu cocok,
  actionType belum terdaftar → throw); `authorization-requests.service.spec.ts`
  (integration, pola `ArAccountResolverService` — instansiasi langsung tanpa
  Nest DI: approval Rp 1.000.000 ditolak dipakai eksekusi Rp 100.000.000 tanpa
  mengonsumsi approval-nya, payload yang benar tetap bisa dipakai sesudahnya,
  dan rollback `dataSource.transaction()` membatalkan konsumsi approval —
  bukti `manager` benar-benar ikut transaction pemanggil); `step-up.service.spec.ts`
  (di `src/core/step-up/`, full `AppModule` — bandingkan bentuk 412 dari
  `StepUpGuard` (HTTP sungguhan) vs `StepUpService.requireApproval()`
  (dipanggil langsung) berdampingan: key set + tipe field identik; approval
  lolos lewat StepUpService lalu ditolak 412 "sekali pakai" saat dipakai kedua kali).
  Tambahan 1 test di `strip-secrets.spec.ts`: payload authorization_requests
  nested yang memuat field `password` tetap terstrip bersih.
- **Verifikasi**: `./scripts/verify.sh` 10/10. `npx jest --runInBand` 12 suite/49
  test hijau (satu suite `products.service.spec.ts` sempat timeout jalan paralel
  karena kontensi banyak suite integration-DB sekaligus — lolos bersih baik
  sendirian maupun `--runInBand`, bukan regresi dari perubahan hari ini).
  **Manual curl end-to-end** (server `dist/main`, login `operator`/`supervisor`
  sungguhan): trigger tanpa header → `412` + `authorizationRequestId` (happy
  path awal) → SUPERVISOR approve → eksekusi dengan header → `201` sukses →
  eksekusi ulang dengan header yang sama → `412` "sudah pernah dipakai" (error
  path). Data uji (baris `authorization_requests` + `audit_logs` terkait)
  dihapus lagi dari DB dev setelah verifikasi, konsisten konvensi Hari 4/5/8.
- **Belum dikerjakan (di luar lingkup sengaja)**: FE antrian persetujuan +
  `context_summary` + polling 5 detik — prompt hari ini eksplisit backend-only;
  menyatu dengan scope FE Hari 10 yang memang sudah mencantumkan hal yang sama.

Hari 9 — susulan FE (30 Jul, sore): Antrian Persetujuan + `<StepUpDialog>` global:
- **Koreksi premis prompt**: `<StepUpDialog>` "dari Hari 7 lama" **tidak pernah dibangun**
  (digrep dulu, 0 hasil di seluruh `frontend/app`) — dibuat baru hari ini, bukan diperluas.
- **Backend diperluas sedikit** meski prompt eksplisit "frontend-only", karena tanpa ini DoD
  ("alasan wajib saat menolak", "operator melihat alasannya") mustahil dipenuhi:
  - `reject()` sekarang **wajib** `reason` (`RejectAuthorizationRequestDto`, baru), ditimpakan
    ke kolom `reason` yang sama (sebelumnya cuma diisi alasan-permintaan-dibuat, boilerplate
    dari guard). Begitu status `REJECTED`, kolom ini satu-satunya tempat operator membaca
    kenapa ditolak.
  - **`GET /authorization-requests/:id` baru** — TIDAK di-`@Roles`, digerbangi kepemilikan
    (requester sendiri ATAU MASTER/SUPERVISOR) di controller. Ini yang dipoll `<StepUpDialog>`
    operator tiap 5 detik; `applyLazyExpiry()` yang sudah ada dari Hari 5/9 otomatis menandai
    EXPIRED begitu TTL lewat — tidak perlu logic tambahan untuk kasus itu.
  - Test lama disesuaikan (reject sekarang wajib kirim `reason` di body, kalau tidak 400
    sebelum sempat memeriksa self-reject) + 2 test baru (`GET /:id` kepemilikan; reject
    reason tersimpan & terbaca lewat `GET /:id`). 12 suite/51 test tetap hijau.
- **`useStepUp.ts`** (baru, `frontend/app/composables/`) — satu state singleton
  (`useState('step-up-dialog', ...)`) + `withStepUp(action)`: bungkus panggilan `useApi()`
  apa pun. Kalau backend membalas 412 (dari `StepUpGuard` ATAU `StepUpService.requireApproval()`
  — keduanya identik lewat `stepUpRequiredException()`), modal otomatis terbuka, polling
  `GET /authorization-requests/:id` tiap 5 detik, dan begitu `APPROVED` action yang sama
  diulang otomatis dengan header `x-authorization-request-id` (bukan endpoint approve baru —
  request asli itu sendiri yang diulang, sama seperti alur `StepUpGuard`/`StepUpService`
  yang sudah ada). `REJECTED`/`EXPIRED`/payload-mismatch masing-masing dilempar sebagai error
  class berbeda (`StepUpDeniedError`/`StepUpExpiredError`/`Error` biasa) tapi lewat **satu**
  fungsi `pollOnce()` — tidak ada percabangan kedua untuk sumber 412 yang berbeda.
- **`<StepUpDialog>`** (baru) — dipasang **sekali** di `layouts/default.vue`, bukan per halaman.
  Tidak pernah menampilkan angka batas apa pun (CLAUDE.md §2.17/§5) — hanya `context_summary`
  dan pesan status generik. Countdown TTL dari `useClockTick()` (satu jam dinding `setInterval`
  dibagi seluruh app, bukan per komponen — pola singleton sama seperti `refreshPromise` di
  `useApi.ts`).
- **`usePayloadFormatter.ts`** (baru) — payload dihumankan per `actionType` (label
  diterjemahkan, `amount` diformat rupiah lewat `useRupiah()`), plus **filter kata kunci**
  (regex `threshold|batas|limit|cost|hpp` pada nama field) yang membuang field manapun yang
  cocok — jaring pengaman kalau actionType Hari 13/15/17/21 nanti menaruh angka batas di
  payload-nya tanpa sengaja.
- **`pages/persetujuan/index.vue`** (baru) — halaman Antrian Persetujuan (MASTER/SUPERVISOR),
  polling 5 detik lewat `GET /authorization-requests` yang sudah ada sejak Hari 9 BE.
  `context_summary` jadi baris utama, "Detail" expand payload lewat `usePayloadFormatter()`,
  "Tolak" mewajibkan textarea alasan sebelum "Konfirmasi Tolak" aktif. Bukan `<DataTable>`
  (endpoint ini flat array, bukan paginated `{data,meta}` — daftar antrian realistis kecil).
- **`pages/qa/step-up-demo.vue`** (baru, sementara — pola sama `qa/export-demo.vue` Hari 5) —
  pemicu manual `POST /authorization-requests/test-step-up-action` lewat `withStepUp()`.
  **Hapus** begitu Hari 13/15/17/21 punya aksi step-up sungguhan untuk diuji end-to-end.
- **`useApi.ts` diperluas**: `get/post/patch/put/delete` sekarang menerima parameter `headers`
  opsional (dipakai `withStepUp()` untuk menyisipkan `x-authorization-request-id` saat
  mengulang request asli).
- **2 bug ditemukan & diperbaiki lewat verifikasi manual browser** (bukan cuma baca kode —
  lihat §3 untuk kronologi lengkap): (1) `useClockTick`'s `setInterval` sempat jalan di SSR
  (500 error) → digerbangi `import.meta.client`; (2) `closeDialog()` me-reset seluruh state
  modal serentak dengan menurunkan `open`, membuat modal "berkedip" balik ke tampilan awal
  selagi UModal masih beranimasi keluar → `closeDialog()` sekarang cuma menurunkan `open`.
- **Verifikasi manual dua sisi** — operator via browser sungguhan (login ulang, klik tombol
  trigger), supervisor via token JWT langsung lewat curl (login dua role berbeda di dua tab
  pada satu profil Chrome **tidak bisa hidup bersamaan** karena cookie sesi dibagi per origin,
  bukan per tab — dikonfirmasi empiris saat tab operator ikut berubah jadi Supervisor setelah
  tab lain login): trigger → modal "Menunggu Persetujuan" + countdown → approve (curl,
  token supervisor) → modal lanjut **otomatis tanpa refresh** dalam <5 detik, menampilkan
  hasil eksekusi asli (`executedBy` cocok user id operator) → trigger lagi → reject dengan
  alasan (curl) → modal tampilkan "Ditolak: `<alasan persis>`" dalam <5 detik → trigger lagi →
  klik Batalkan → dikonfirmasi lewat `GET /:id` request tetap `PENDING` (tidak menggantung,
  tidak terkonsumsi). Halaman Antrian Persetujuan diverifikasi terpisah dengan klik sungguhan
  (login supervisor): render item + `context_summary`, expand Detail, Tolak mewajibkan
  alasan, toast + list refresh setelah aksi. Data uji (`authorization_requests` bertipe
  `TEST_STEP_UP_ACTION`) dihapus dari DB dev setelah verifikasi, konsisten konvensi hari-hari
  sebelumnya.
- **Belum dikerjakan / di luar lingkup sengaja**: tidak ada — seluruh scope FE Hari 9 (dan
  item FE Hari 10 yang sebelumnya menunjuk balik ke sini) sudah selesai.

Hari 10 — Stock Recorder + FIFO (BE saja — jantung persediaan, blocker semua modul transaksi):
- **Migration** `1785080602931-CreateStockTables`: enum `stock_movement_type`
  (`purchase`/`sale`/`transfer`/`return_in`/`return_out`/`adjustment`/`opening`) +
  4 tabel. `stock_movements` (ledger append-only, `qty_base_unit` positif=masuk
  negatif=keluar, `CHECK (qty_base_unit <> 0)`) · `product_stock_balance` (PK gabungan
  `product_id`+`warehouse_id`, **cache** turunan — dibandingkan ke ledger lewat
  `reconcile()`, bukan sumber kebenaran) · `stock_cost_lots` (`supplier_id` nullable FK
  `suppliers`, `CHECK (qty_remaining >= 0)`, index `(product_id, warehouse_id, lot_date, id)`
  persis urutan FIFO) · `stock_cost_consumptions` (append-only, pola `journal_entry_lines` —
  tanpa `updated_at`/trigger, `ON DELETE CASCADE` dari lot & movement). Diuji up→down→up
  di DB scratch, sukses.
- **`src/modules/stock/entities/`** (4 entity, TIDAK ada controller/module CRUD sendiri —
  satu-satunya jalan menulisnya lewat `StockRecorderService`, sesuai CLAUDE.md §2.5).
- **`src/core/stock-recorder/stock-recorder.service.ts`** (`StockRecorderService`, pola sama
  `JournalPosterService`: semua method menerima `EntityManager` dari transaction pemanggil):
  - `recordIn(dto, manager)`: 1 movement (+) + 1 lot baru + upsert balance. `lotDate` DIISI
    PEMANGGIL (untuk pembelian nanti = `receipt_date`, bukan tanggal faktur supplier).
  - `recordOut(dto, manager)`: `consumeFifo()` privat — `SELECT ... FOR UPDATE` urut
    `lot_date ASC, id ASC` (row-lock **wajib**, bukan opsional — CLAUDE.md §2.7). Lot habis
    tapi qty kurang → **tidak ditolak**: sisa (`shortfallQty`) dikosting pakai
    `getLatestCostBasis()`, balance boleh negatif, `stockWarning` terisi
    `"Stok <produk> di <gudang> minus <n> <satuan>"`.
  - `transfer(dto, manager)`: 2 movement (out dari sumber, in ke tujuan) lewat `consumeFifo()`
    yang sama. **Lot ikut pindah per-porsi** dengan `unit_cost`+`lotDate` PERSIS sama dengan
    lot asalnya (bukan satu lot baru berharga rata-rata) — kalau sumbernya lebih dari satu lot
    FIFO, tiap porsi jadi lot tujuan sendiri supaya jejak biaya per-porsi tidak hilang. Tanpa
    jurnal.
  - `getLatestCostBasis(productId, manager?)`: `unit_cost` lot TERBARU yang `> 0` — lot bonus
    dilewati (`WHERE unit_cost > 0`). **Tidak dibatasi warehouse** (basis biaya ikut riwayat
    pembelian produk yang selalu masuk `STORE`, bukan gudang tempat stok diminta) — cek ulang
    asumsi ini saat dipakai Hari 21 (batas jual di bawah harga pokok). Satu fungsi bersama,
    dipakai juga sebagai fallback stok minus di atas — **tidak diduplikasi**.
  - `reconcile(filter?, manager?)`: `SUM(stock_movements.qty_base_unit)` vs
    `product_stock_balance` per produk+gudang, laporkan selisih. Belum ada endpoint pemanggil
    hari ini (kemungkinan dipakai invarian ke-5 Hari 11 atau Rekonsiliasi Stok Hari 32).
  - `formatQtyBreakdown(qtyBaseUnit, productId, manager?)`: baca `product.unitConversions`
    lalu delegasi ke `computeQtyBreakdown()` murni (`qty-breakdown.ts`, testable tanpa DB) —
    konversi satu tingkat, sisa nol tidak ditampilkan kecuali qty totalnya 0.
  - **`ProductsService.lockCode()` disambungkan** di `recordIn`/`recordOut`/`transfer` —
    bukan diminta eksplisit di prompt hari ini, tapi sudah didokumentasikan sejak Hari 8
    sebagai kewajiban pemanggil pertama begitu StockRecorder ada. Idempotent.
  - `upsertBalance()` privat: `INSERT ... ON CONFLICT (product_id, warehouse_id) DO UPDATE SET
    qty_base_unit = qty_base_unit + $delta` — atomic di level SQL, tidak butuh `SELECT FOR
    UPDATE` terpisah dulu (beda pola dari `document_counters` yang butuh upsert dua langkah
    karena baris period barunya belum tentu ada).
- **`StockRecorderModule`** (imports `ProductsModule` untuk `lockCode()`) didaftarkan ke
  `AppModule` — pola sama `ReceivablesModule`/`StepUpModule` (dibuat sekarang meski pemanggil
  produksi sungguhan baru menyusul Hari 13/14/16/21+, BUKAN pola `JournalPosterModule` yang
  belum didaftarkan karena belum ada konsumen di manapun).
- **Verifikasi**: `./scripts/verify.sh`-setara manual 10/10 (build+lint BE 0 error, migration
  up→down→up di DB scratch, `npm run test` 57/57 lolos termasuk 6 test baru, `/health` 200).
  6 integration test `stock-recorder.service.spec.ts` terhadap Postgres asli (bukan mock,
  `ProductsService` dikonstruksi manual lewat repository `DataSource` yang sama — bypass Nest
  DI tapi constructor produksi asli, pola sama `journal-poster.service.spec.ts`):
  FIFO dasar (10@1000 lalu 10@1200, keluar 15 → totalCost=16.000, lot pertama habis lot kedua
  sisa 5 — isi tabel `stock_cost_lots`/`stock_cost_consumptions` di-`console.log` sesuai
  permintaan) · keluar melebihi stok → balance −15, `stockWarning` berisi "minus" · transfer
  5 unit → 2 movement + 1 lot tujuan ber-`unit_cost` identik (500) · 2 `recordOut` paralel atas
  produk sama (`Promise.all` dua `dataSource.transaction()`) → balance akhir tepat 40 (100−60),
  tidak ada konsumsi tumpang tindih · `getLatestCostBasis` melewati lot bonus (`unit_cost=0`)
  lebih baru dan mengembalikan lot berbayar terakhir (2000) · `formatQtyBreakdown(255, produk
  1 DUS=20 PCS)` → `"12 DUS 15 PCS"`.
- **Belum dikerjakan / di luar lingkup sengaja**: endpoint HTTP/controller (StockRecorder
  murni service internal, dipanggil modul lain mulai Hari 13+) · FE (tidak ada layar stok
  berdiri sendiri hari ini) · `units` master masih belum di-FK ke
  `product_unit_conversions.unit_name` (dicatat sejak Hari 8, belum jadi masalah karena
  `formatQtyBreakdown` baca `unitName` sebagai teks langsung).

Hari 11 — 5 invarian + VOID Engine generik + verifikasi step-up (BE saja — gerbang kualitas
sebelum modul dokumen Hari 14+ mulai dibangun di atas engine ini):
- **Migration** `1785080602933-AddVoidReasonToJournalEntries`: `journal_entries` +2 kolom
  nullable `void_reason_code`/`void_reason_note`, hanya terisi saat `is_reversal=true`.
  `voided_by`/`voided_at` TIDAK jadi kolom terpisah — dipetakan ke `created_by`/`created_at`
  baris reversal itu sendiri (baris reversal ITU SENDIRI adalah peristiwa VOID-nya). Melengkapi
  (bukan menggantikan) rencana CLAUDE.md §2.16 yang menaruh kolom sama di tiap tabel dokumen
  begitu tabel itu dibuat Hari 14+.
- **`JournalPosterService.post()` diperluas** (bukan method baru): `PostJournalDto` dapat 4
  field opsional (`isReversal`, `reversedEntryId`, `voidReasonCode`, `voidReasonNote`, default
  `false`/`null`) — supaya baris pembalik lewat 5 validasi jurnal yang sama persis dengan
  posting biasa, satu jalur, tidak diduplikasi.
- **`StockRecorderService`** dapat 2 method publik baru: `reverseIn(movementId, userId,
  manager)` (balik pembelian — nolkan `qty_remaining` lot dari `source_type`/`source_id` yang
  sama; **menolak** kalau lot sudah terkonsumsi sebagian, pesan persis "Barang dari faktur ini
  sudah terjual. Buat retur pembelian, bukan pembatalan.") dan `reverseOut(movementId, userId,
  manager)` (balik penjualan — kembalikan `qty_remaining` PERSIS ke lot asal sesuai
  `stock_cost_consumptions`, bukan lot baru berharga rata-rata). Keduanya menulis movement
  pembalik baru (`ADJUSTMENT`, `sourceType: 'VOID_REVERSAL'`, `sourceId: <movement asal>.id`) —
  ledger tetap append-only, tidak ada UPDATE/DELETE baris asli.
- **`VoidEngineService` baru** (`src/core/void/`): `voidDocument({sourceType, sourceId,
  reasonCode, reasonNote, userId, manager})` generik murni di atas `journal_entries` +
  `stock_movements`/`stock_cost_lots` (sourceType/sourceId sebagai kunci gabung, tidak
  menyentuh kolom dokumen karena belum ada satu pun tabel dokumen sungguhan hari ini). Urutan:
  validasi reasonNote/reasonCode terisi → hook `checkVoidable()` → cari jurnal asli → cek belum
  pernah dibalik (`reversed_entry_id`) → balik jurnal lewat `JournalPosterService.post()` →
  balik tiap `stock_movements` bersangkutan lewat `reverseIn`/`reverseOut` sesuai tandanya →
  hook `markVoided()`. **Registry hook per `sourceType` FAIL-CLOSED** (`registerHook()`) — meniru
  `payload-matchers.ts` (`StepUpService`) yang sudah lebih dulu menganut pola ini di codebase
  ini; `sourceType` tanpa hook terdaftar → Error jelas, bukan diam-diam meloloskan VOID. Modul
  dokumen Hari 13+ WAJIB `registerHook()` begitu tabel dokumennya ada. `VoidModule` jadi
  **konsumen pertama** `JournalPosterModule` (belum pernah didaftarkan ke `AppModule` sejak
  Hari 6 karena belum ada pemanggil — sekarang didaftarkan, bareng `VoidModule`).
- **Lingkup sengaja tidak termasuk**: VOID untuk `transfer()` (mutasi gudang, baru relevan
  Hari 13) dan VOID untuk dokumen tanpa jurnal sama sekali — lihat §3 tanggal 31 Jul.
- **5 test invarian** (`src/core/invariants/five-invariants.spec.ts`) + **6 test VOID Engine**
  (`src/core/void/void.service.spec.ts`), pola sama journal-poster/stock-recorder spec (raw
  `DataSource`, service `new` manual, `dataSource.transaction()` per operasi, cleanup manual
  `afterAll` — self-FK `reversed_entry_id` di `journal_entries` dihapus anak dulu baru induk,
  supaya tidak melanggar FK NOT DEFERRABLE). TEST 1 (jurnal balance) sengaja **scan global**
  seluruh tabel `journal_entries`, bukan cuma baris test ini — pengaman regresi murah. TEST 5
  (persediaan cocok lot) menghitung dari id yang di-track PER TEST (bukan saldo global tabel),
  supaya tidak keganggu data test lain di `omega_dev` yang dipakai bersama. VOID Engine test
  membuktikan: VOID dasar sukses, VOID dua kali ditolak, VOID tanpa alasan ditolak SEBELUM
  menyentuh DB (dibuktikan lot/balance tidak berubah), VOID atas lot yang sudah sebagian
  terjual ditolak DAN seluruh transaction (termasuk jurnal pembalik yang sempat "ditulis")
  rollback bersih, `sourceType` tanpa hook fail-closed, hook prasyarat custom menolak dengan
  pesannya sendiri.
- **Bagian C prompt (wiring step-up dummy 412→approve→retry) TERNYATA sudah selesai sejak
  susulan Hari 9 sore** — `POST /authorization-requests/test-step-up-action` +
  `authorization-requests.spec.ts` sudah membuktikan alur ini lewat HTTP sungguhan. Tidak ada
  kode baru untuk bagian ini hari ini, hanya diverifikasi masih hijau setelah perubahan A/B.
- **Verifikasi**: `npm run build`/`lint` BE 0 error, `npm run test` 68/68 lolos (15 suite,
  ~14–30 detik total, jauh di bawah 60 detik), migration `1785080602933` up→down→up di DB
  scratch (`fmcg_verify_tmp`) sukses, `GET /health` 200.
- **Belum dikerjakan / di luar lingkup sengaja**: endpoint HTTP untuk VOID (dipanggil modul
  dokumen Hari 13+, sama seperti StockRecorder) · `reverseTransfer()` untuk mutasi gudang
  (lihat §3).

Hari 11 — FE susulan (sama hari, prompt terpisah): dashboard jujur + nav Supervisor 3-item:
- **`frontend/app/config/navigation.ts`**: setiap item nav yang sebelumnya tanpa `roles`
  (otomatis kelihatan semua role termasuk SUPERVISOR) sekarang diberi `roles` eksplisit
  `['MASTER','OPERATOR']` — Dashboard, Produk, Merek, Satuan, Customer, Supplier, Salesman,
  Gudang, Jurnal. **Bagan Akun** turun dari `['MASTER','SUPERVISOR']` jadi `['MASTER']`
  **di nav saja** (halaman itu sendiri, `definePageMeta`, TETAP `['MASTER','SUPERVISOR']`
  sesuai matriks CLAUDE.md §5 — Supervisor masih bisa buka lewat URL langsung, cuma hilang
  dari sidebar). 2 grup baru: **Pengawasan** (Pengecekan Invoice + Antrian Persetujuan,
  keduanya `['MASTER','SUPERVISOR']`) dan **Laporan** (tanpa `roles` = semua role). Hasil
  filter Supervisor persis 3 item. Export baru `ROLE_HOME: Record<Role,string>`
  (`{MASTER:'/', OPERATOR:'/', SUPERVISOR:'/pengecekan-invoice'}`).
- **`frontend/app/middleware/01.roles.global.ts`**: redirect unauthorized diganti dari
  hardcode `navigateTo('/')` jadi `navigateTo(ROLE_HOME[user.role])` + guard
  `to.path !== home` — perlu supaya Supervisor yang membuka `/` (sekarang direstriksi
  `['MASTER','OPERATOR']`) tidak bolak-balik ke `/` yang juga ditolak untuknya. Mekanisme
  generik yang sudah ada dipakai ulang, tidak ada redirect khusus terpisah untuk `/`.
- **`frontend/app/pages/index.vue`** (Dashboard, `roles: ['MASTER','OPERATOR']`): 4 kartu
  `UPageCard` — Penjualan Hari Ini/Piutang Jatuh Tempo/Stok Minus selalu `"—"` + tautan ke
  `/laporan` (tidak ada angka palsu). Persetujuan Menunggu **role-aware**: MASTER fetch
  `useAuthorizationRequests().listAll()` sekali saat mount, hitung baris `status==='PENDING'`
  yang `expiresAt` belum lewat, tampilkan angka sungguhan + tautan `/persetujuan`. **OPERATOR
  tidak fetch sama sekali** (dibuktikan lewat `read_network_requests` browser — nol request ke
  `/authorization-requests`) — endpoint itu backend-nya `@Roles(MASTER, SUPERVISOR)` saja
  (`authorization-requests.controller.ts:43`), OPERATOR akan 403; kartunya tampil `"—
  (khusus Master/Supervisor)"` jujur, bukan angka yang diam-diam gagal fetch.
- **2 halaman placeholder baru**, landasan supaya nav 3-item Supervisor tidak jadi dead-link
  (bukan implementasi Hari 22A/26-30 sungguhan): `frontend/app/pages/pengecekan-invoice/
  index.vue` (`roles:['MASTER','SUPERVISOR']`) dan `frontend/app/pages/laporan/index.vue`
  (tanpa `roles`) — keduanya `<UEmpty>` jujur bilang "Belum tersedia" + kapan dijadwalkan,
  pola sama `persetujuan/index.vue`. Flat page, tidak perlu entri baru di `SECTION_LABELS`
  breadcrumb (`useBreadcrumbs.ts`).
- **Verifikasi**: `pnpm run lint`/`typecheck`/`build` FE 0 error. **Diuji manual di browser
  sungguhan** (bukan cuma dibaca kode) untuk ketiga role: MASTER login → sidebar penuh,
  dashboard 4 kartu, "Persetujuan Menunggu" = 0 (cocok kondisi DB dev saat itu, tidak ada
  request pending); logout → login SUPERVISOR → sidebar **persis 3 item** (Pengecekan
  Invoice/Antrian Persetujuan/Laporan), `/` otomatis lempar ke `/pengecekan-invoice`,
  placeholder tampil; logout → login OPERATOR → sidebar tanpa Bagan Akun/Pengecekan
  Invoice/Antrian Persetujuan/Pengaturan, dashboard tampil dengan kartu Persetujuan
  Menunggu `"—"`, dikonfirmasi **nol** network request ke `/authorization-requests`
  (`read_network_requests` setelah reload halaman).
- **Keputusan yang disengaja, dicatat supaya tidak dianggap bug nanti**: Supervisor yang
  mengetik URL master-data secara langsung (mis. `/master-data/products`) **masih bisa
  masuk** — halaman-halaman itu tidak diberi `definePageMeta({ roles })`, cuma hilang dari
  nav. Pembatasan hari ini murni level sidebar sesuai instruksi "navigasinya hanya 3 item";
  mengunci akses langsung tiap halaman satu-satu di luar lingkup prompt ini.

Hari 12 — Jurnal Manual + Saldo Awal terpadu + PeriodLockValidator (BE saja — FE Saldo
Awal ⏸ nunggu jawaban klien §1, layar Jurnal Manual ⏸ pasca-MVP):
- **`src/core/period-lock/`** (`PeriodLockValidatorService`, baru, stateless persis
  `DocumentCounterService`): `validate(date, manager)` — logika backdate diekstrak PERSIS
  dari method privat yang sebelumnya hidup di `JournalPosterService` (pesan error tidak
  berubah, test lama tetap hijau tanpa modifikasi assertion). `assertOpeningBalanceDate(date,
  manager)` — **satu-satunya pengecualian tanggal bernama** di seluruh sistem (CLAUDE.md
  §2.9/§3), baca `settings.opening_balance_date` dan tolak kalau tidak persis sama; dipanggil
  HANYA oleh `OpeningBalanceService`, tidak pernah lewat `JournalPosterService.post()`.
- **`JournalPosterService`** (modifikasi minimal): constructor terima `PeriodLockValidatorService`
  tambahan. Di `post()`, cabang `dto.sourceType === 'OPENING_BALANCE'` melewati
  `periodLockValidatorService.validate()` sepenuhnya (tanggal sudah divalidasi terpisah oleh
  pemanggil) — sourceType lain tetap lewat jalur `validate()` biasa, tidak melonggar. 3 spec
  yang meng-`new JournalPosterService(...)` manual (`journal-poster.service.spec.ts`,
  `void.service.spec.ts`, `five-invariants.spec.ts`) diupdate menambah argumen konstruktor.
- **Migration `1785080602935`**: `chart_of_accounts.is_inventory_account`/`is_payable_account`
  (BOOLEAN, default false), seed `true` untuk kode `1101`/`2101` — pola persis
  `is_receivable_account` Hari 4. **Migration `1785080602936`**: setting
  `opening_balance_date` (STRING, default `2026-09-01`) — otomatis bisa dibaca/diubah lewat
  `GET/PATCH /settings` yang sudah ada, tidak ada endpoint baru untuk ini.
- **`src/modules/journal-manual/`** (baru): `POST /journal-entries/manual` (MASTER only).
  Controller class terpisah (`JournalManualController`) tapi **prefix `@Controller
  ('journal-entries')` SAMA** dengan `JournalEntriesController` (read-only, sudah ada sejak
  Hari 6) — Nest tidak konflik karena tidak ada tabrakan method+path. `JournalManualService`
  query `is_inventory_account`/`is_receivable_account`/`is_payable_account` atas semua
  `accountId` di baris yang dikirim; kalau ada satu saja yang match → **`ForbiddenException`
  (403)** dengan pesan menyebut kode+nama akun dan alasan sub-ledger, baru kalau lolos
  delegasi penuh ke `JournalPosterService.post()` dengan `sourceType:'MANUAL'`.
- **`src/modules/opening-balance/`** (baru): `POST /opening-balance` (submit, MASTER only) —
  satu `dataSource.transaction()`: baca `openingDate` dari `settings.opening_balance_date` →
  `assertOpeningBalanceDate()` → N baris `stockLines[]` lewat `StockRecorderService.recordIn()`
  (movementType `opening`, sourceType `OPENING_BALANCE`) → susun SATU jurnal pembuka (baris
  Persediaan agregat dari Σ stockLines, baris Piutang per `receivableLines[]` lewat
  `ArAccountResolverService.resolve()` yang SAMA dipakai 4 tempat lain, baris Hutang per
  `payableLines[]` ke akun `is_payable_account=true` tunggal) → **plug otomatis ke akun Modal
  (`account_type='EQUITY'`)** untuk menyeimbangkan Debit≠Kredit (dikonfirmasi user sebelum
  coding — pola akuntansi standar jurnal pembuka) → `JournalPosterService.post()` yang SAMA
  dipakai transaksi biasa. `GET /opening-balance/verify` — bandingkan Σ nilai lot pembuka vs
  saldo akun Persediaan hasil jurnal pembuka, **di-scope ke `source_type='OPENING_BALANCE'`**
  (cek sanity sekali saat input, BUKAN invarian hidup selamanya — itu tugas invarian ke-5
  Hari 11 yang terpisah dan tidak diduplikasi; akan mulai menyimpang begitu stok pembuka laku
  terjual pasca cut-over, dan itu memang diharapkan, dicatat eksplisit di kode+komentar).
- **DTO SENGAJA tidak menerima field tanggal apa pun** (`SubmitOpeningBalanceDto`,
  `PostManualJournalDto`) — tanggal Saldo Awal selalu dari `settings.opening_balance_date`
  sisi server, `createdBy`/`sourceType` selalu dari `req.user`/konstanta, tidak pernah dari
  client — supaya pengecualian tanggal tetap "satu, bernama", bukan celah bebas.
- **Celah yang diketahui, dicatat bukan diselesaikan diam-diam** (detail alasan di §3): (1)
  tidak ada jalur VOID untuk `sourceType='OPENING_BALANCE'` (`VoidEngineService` fail-closed,
  hook belum didaftarkan) — input salah sebelum cut-over belum punya cara resmi dibatalkan
  lewat aplikasi hari ini. (2) Submit Saldo Awal berulang tidak diblokir — konsisten
  arsitektur append-only, tapi operator harus hati-hati tidak mengulang baris yang sama.
- **Verifikasi**: `npm run build`/`lint` BE 0 error; `npm run test` 87/87 (18 suite, naik dari
  71); migration `up→down→up` di DB sementara sukses; `./scripts/verify.sh` 10/10 lulus
  (termasuk build+lint FE, karena skrip ini menguji keduanya sekaligus). **Manual curl
  terhadap server sungguhan** (bukan cuma test otomatis): MASTER → baris ke `1101` (Persediaan)
  → 403 pesan menyebut sub-ledger; baris ke `5102`/`3101` (bebas) → 201; submit
  `stockLines`+`receivableLines`+`payableLines` sekaligus → 4 baris jurnal (Persediaan D
  500rb, Piutang D 200rb, Hutang K 150rb, **Modal K 550rb plug otomatis**), total D=K=700rb;
  `GET /opening-balance/verify` → `{lotValue:500000, ledgerValue:500000, difference:0}`;
  OPERATOR → 403 di ketiga endpoint baru (RBAC). Data uji dihapus lagi dari DB dev setelah
  verifikasi (pola sama Hari 4/5/8).

Hari 13 — Mutasi Gudang bercabang (BE ditemukan sudah selesai di awal sesi dari pekerjaan
sesi sebelumnya yang belum di-commit/tercatat — lihat §3 tanggal 7 Agu; hari ini murni FE +
1 bugfix BE kecil):
- **BE** (`src/modules/warehouse-mutations/`, migration `1785080602939`) — sudah ada, tidak
  disentuh hari ini selain diverifikasi: 3 cabang (Titipan/Transfer/BS→STORE+step-up) di atas
  primitif yang sudah ada (`StockRecorderService.transfer()`, `StepUpService`,
  `DocumentCounterService` kode `GD`). **Celah diketahui**: validasi qty kumulatif titipan ≤
  qty yang sudah dibeli pelanggan **belum diimplementasikan** (`TODO` di `processTitipan()`,
  ditunda ke Hari 20-22 — `sales_invoice_lines` belum ada). VOID untuk mutasi gudang juga
  belum ada jalurnya (dicatat sejak Hari 11 §3, masih berlaku).
- **BE bugfix kecil hari ini**: tidak ada — satu-satunya perbaikan BE terkait adalah di sisi FE
  (lihat bawah), backend `warehouse-mutations` tidak diubah sama sekali.
- **FE** (`frontend/app/pages/gudang/mutasi/`, `frontend/app/layouts/print.vue` baru,
  `frontend/app/composables/useWarehouseMutationLookups.ts` baru):
  - `index.vue`: `<DataTable>` riwayat mutasi + filter tipe + slide-over detail (pola sama
    `akuntansi/jurnal/index.vue`). Kolom "Dari → Ke" resolve nama gudang lewat map id→nama
    yang di-load sekali saat mount (`loadWarehouseMap()`) — otomatis menampilkan nama
    pelanggan untuk mutasi titipan karena gudang sintetisnya sendiri sudah bernama
    `"Titipan Pelanggan - {nama}"`, tidak perlu resolve customer terpisah untuk list ini.
  - `create.vue`: **bukan** `<CrudFormPage>` — repeater generiknya tidak punya kolom
    read-only, dan skenario "peringatan sebelum baris diisi" butuh reaktivitas custom dari 2
    field independen. Toggle mode (Titipan/Transfer, tanpa default — pilihan eksplisit),
    picker gudang Transfer difilter hanya `STORE`/`BAD_STOCK` aktif (`TITIPAN_PELANGGAN` yang
    sintetis-per-pelanggan sengaja tidak pernah muncul di picker). `direction` computed murni
    dari 2 pilihan gudang → `UAlert` peringatan Supervisor untuk `BS_TO_STORE` dirender
    langsung dari computed itu, di atas editor baris — **tidak bergantung pengisian baris atau
    percobaan submit sama sekali** (dibuktikan manual: alert muncul begitu 2 dropdown dipilih,
    baris produk masih kosong). Submit selalu lewat `useStepUp().withStepUp(...)` tanpa
    pengkondisian (aksi yang tidak butuh approval langsung sukses tanpa modal muncul).
    Ringkasan sukses menampilkan `unit_cost` (hanya ada untuk baris Transfer) sebagai blok
    teks bordered/`bg-elevated` — visual kembaran `CrudFormPage`'s `type: 'display'`, BUKAN
    `<input>` di mana pun.
  - `[id]/cetak.vue`: `definePageMeta({ layout: 'print' })`, layout baru tanpa
    sidebar/topbar/StepUpDialog. A4 portrait = 2 blok A5-landscape ditumpuk (`v-for="i in 2"`,
    garis putus-putus pemisah) — bukan markup terduplikasi. **Aturan keras berkomentar di
    file**: tidak pernah memanggil `useRupiah()` atau membaca `line.unitCost` — nota mutasi
    tidak boleh memuat rupiah sama sekali (CLAUDE.md §3), beda dari layar lain yang boleh
    menampilkannya sebagai info.
  - `qa/step-up-demo.vue` **dihapus** — komentarnya sendiri menyebut untuk dihapus begitu ada
    aksi step-up sungguhan untuk diuji (BS_TO_STORE, sekarang ada), dikonfirmasi tidak
    direferensikan di mana pun sebelum dihapus.
  - `config/navigation.ts` (grup baru "transaksi gudang", bukan digabung ke grup master-data
    yang sudah ada — grup ini yang akan ditempati Retur/Payment/Surat Jalan/Biaya Operasional
    nanti, permission-matrix row yang sama), `composables/useBreadcrumbs.ts` (`SECTION_LABELS`
    tambah `'gudang': 'Gudang'`).
- **Bug ditemukan lewat verifikasi manual browser, diperbaiki hari ini** (detail di §3):
  `[id]/cetak.vue` awalnya memanggil `GET /settings` (MASTER-only di backend) tanpa try/catch
  terpisah — Operator kena 403 yang mematikan seluruh halaman cetak, bukan cuma header toko.
  Diperbaiki: fetch `/settings` dipisah dari `Promise.all` utama, gagal senyap → header toko
  kosong (pola sama `loadAccountOptions()` di halaman Jurnal).
- **Verifikasi**: `npm run build`/`lint`/`typecheck` FE 0 error. **Manual end-to-end di browser
  sungguhan** (Operator login asli, Supervisor approve lewat API dengan token asli — bukan
  simulasi): mutasi Titipan (customer "Pak 1", produk Royco 3 pcs) → sukses instan tanpa
  step-up, 0 `stock_movements` (dikonfirmasi lewat isi `stockWarnings` kosong + tidak ada
  gerakan), ringkasan menampilkan "Barang sudah bukan milik toko, tidak ada nilai" untuk
  `unit_cost`; mutasi Transfer BAD_STOCK→STORE (produk Bendera Putih 5 pcs) → alert peringatan
  muncul tepat saat 2 gudang dipilih (sebelum baris produk ada) → submit → `<StepUpDialog>`
  terbuka dengan `context_summary` benar → disetujui Supervisor → auto-retry sukses,
  `stockWarnings` menunjukkan "minus 5 pcs" (stok BAD_STOCK awalnya 0, stok minus diizinkan
  sesuai CLAUDE.md §2.8) dan `unit_cost` tampil "Rp 1.500" read-only; nota cetak untuk mutasi
  ini dicek langsung sebagai Operator — 0 angka rupiah, 2 salinan bertumpuk, toolbar hilang di
  print preview; login Supervisor dikonfirmasi TIDAK melihat "Mutasi Gudang" di sidebar dan
  di-redirect ke `/pengecekan-invoice` saat membuka `/gudang/mutasi` lewat URL langsung.

Hari 14 — Faktur Pembelian (BE saja — dokumen pertama yang menerbitkan nomor `B1` sungguhan;
FE menyusul):
- **Dua gap lama ditutup sebagai bagian lingkup hari ini** (dipakai langsung oleh modul ini,
  bukan drive-by cleanup): (1) **`src/core/account-resolver/`** (`AccountResolverService.
  resolveSingleActive(whereSql, label, manager)`) diekstrak PERSIS dari
  `OpeningBalanceService.resolveSingleAccount()` (Hari 12) — perilaku tidak berubah,
  `opening-balance.service.spec.ts` jadi regression check-nya (diupdate hanya di titik
  konstruksi, tetap hijau). (2) **`src/core/tax-rates/`** (`TaxRateResolverService.
  getEffectiveRate(date, manager)`) + **`src/modules/tax-rates/entities/tax-rate.entity.ts`** —
  tabel `tax_rates` sudah ada sejak migration Hari 3 tapi 0 kode aplikasi menyentuhnya sampai
  hari ini; belum ada CRUD/admin screen (di luar lingkup), test mengisi baris lewat repository
  langsung. Kedua service ini akan dipakai lagi oleh Faktur Penjualan (Hari 21).
- **Migration `1785080602940`**: `chart_of_accounts.is_input_vat_account` (pola persis
  `is_inventory_account`/`is_payable_account` Hari 12), seed `true` untuk kode `1103` (PPN
  Masukan, sudah ada sejak seed COA awal). **Migration `1785080602941`**: `purchase_invoices`,
  `purchase_invoice_lines`, `goods_receipts`, `goods_receipt_lines` + 3 enum
  (`purchase_invoice_posting_status`/`print_status`/`review_status`) — `review_status` disiapkan
  untuk Pengecekan Invoice Harian Hari 22A yang memakai ulang `GET /purchase-invoices?
  reviewStatus=...` (KONTEKS_REVISI §2.2, "jangan bikin keluarga endpoint `/supervisor/*`"),
  `print_status`/`posting_status`/`void_reason_*` disiapkan kolom saja untuk Hari 15/16 (pola
  sama `warehouse_mutations` Hari 13). `goods_receipts`/`goods_receipt_lines` dibuat OTOMATIS
  dari faktur (tidak ada input terpisah), 1:1 lewat `purchase_invoice_id UNIQUE`.
- **`src/modules/purchase-invoices/purchase-invoices.service.ts`** — satu
  `dataSource.transaction()`, pola sama `OpeningBalanceService`: resolve supplier + baris
  (produk+satuan→`qtyBaseUnit` lewat `product_unit_conversions`, base unit produk sendiri
  faktor implisit 1 — **celah lama yang sudah diketahui sejak Hari 8** dipertahankan apa
  adanya, dicocokkan by-name ternormalisasi bukan FK, error jelas kalau tidak ketemu, TIDAK
  pernah diam-diam jatuh ke faktor 1) → 9 langkah hitung CLAUDE.md §4 dalam **sen integer**
  (meniru validasi balance `JournalPosterService`) → `DocumentCounterService` (`B1`) →
  insert header+lines → insert `goods_receipts`+lines → `StockRecorderService.recordIn()` per
  baris (SELALU `STORE`, `lotDate = receiptDate`) → `AccountResolverService` (Persediaan/Hutang/
  [PPN Masukan]) → `JournalPosterService.post()` (`entryDate = receiptDate`).
- **Sisa pembulatan langkah 5 (alokasi diskon faktur pro-rata) dibebankan ke baris NON-BONUS
  terakhir**, bukan literal baris terakhir — keputusan desain eksplisit: aturan §3 "baris bonus
  selalu alokasi nol" menang atas kata "baris terakhir" kalau baris terakhir kebetulan bonus.
  Dibuktikan test: 3 baris real (net 500rb/360rb/235rb) + diskon faktur 10rb → alokasi
  4566.21/3287.67/2146.12 (sisa pembulatan 0.01 jatuh ke baris ke-3, bukan baris bonus ke-4),
  Σ alokasi persis 10000.
- **Cabang `company_is_pkp = true` DITULIS DAN DIUJI SUNGGUHAN**, bukan cuma disiapkan mati —
  test men-toggle `settings.company_is_pkp` jadi `'true'` sementara (try/finally kembali ke
  `'false'`), membuktikan jurnal 3 baris (Persediaan D `line_final` / PPN Masukan D terpisah /
  Hutang K jumlah keduanya) dan `unit_cost_result` TIDAK termasuk PPN — beda dari cabang
  default (`company_is_pkp = false`) yang mengkapitalisasi PPN ke `unit_cost` dan jurnal cuma
  2 baris.
- **Tidak ada AP-account-resolver per-supplier** (beda dari `ArAccountResolverService` yang
  baca `customer.ar_account_id` per pelanggan) — `suppliers` tidak punya kolom override akun
  hutang di CLAUDE.md, jadi selalu satu akun `is_payable_account = true` global lewat
  `AccountResolverService` yang sama dipakai Persediaan/PPN Masukan.
- **Verifikasi**: `npm run build`/`lint` BE 0 error; `npm run test` **95/95 lolos, 20 suite**
  (naik dari 87, termasuk 4 test integrasi baru `purchase-invoices.service.spec.ts` terhadap
  Postgres asli — dump `purchase_invoice_lines`/`stock_cost_lots`/`journal_entries` berdampingan
  di `console.log` sesuai diminta); migration `1785080602940`+`1785080602941` `up→down→up` di
  DB scratch sukses; `./scripts/verify.sh` **10/10 lulus** (build+lint BE&FE, migration
  up→down→up, test, `/health` 200, tidak ada `@Delete()`, `.env` bersih). **Manual curl
  end-to-end** terhadap server sungguhan (bukan cuma test otomatis): login MASTER → buat
  supplier baru → `POST /purchase-invoices` 1 baris (Bendera Putih Sachet, 10 DUS @150rb,
  konversi 130 pcs/dus, diskon faktur 5rb) → `B1/RM01-26080021` terbit, `dueDate` **2026-08-31**
  benar dari `supplierInvoiceDate`(2026-08-01)+30 hari (BUKAN `receiptDate`(2026-08-06)+30 hari
  yang akan jadi 2026-09-05), lot `unit_cost` 1150 = 1.495.000/1300 pcs, jurnal balance
  Rp1.495.000. Error path: `supplierId` tidak ada → 400 pesan Indonesia jelas; `discountPercent`
  + `discountAmount` sekaligus → 400 menyebut "alternatif, bukan bertingkat"; login SUPERVISOR →
  403 sebelum transaction dibuka (dibuktikan tidak ada baris baru tertulis). Data uji manual
  (1 supplier + 1 faktur + lot/jurnal turunannya) **sengaja TIDAK dihapus** — sama seperti
  precedent Hari 13, semuanya lewat alur aplikasi asli dan menghapusnya butuh menyentuh
  `stock_cost_lots`/`product_stock_balance` langsung yang dilarang CLAUDE.md §2.5.
- **Belum dikerjakan / di luar lingkup sengaja**: FE form Purchase Invoice · CRUD/admin
  `tax_rates` (baris diisi manual lewat repository sampai ada layar) · `VoidHook` untuk
  `PURCHASE_INVOICE` (menyusul Hari 15/16, kolom `void_reason_*`/`posting_status` sudah
  disiapkan) · mekanisme kunci-cetak generik (kolom `print_status`/`print_count` sudah
  disiapkan, logic-nya Hari 15).

Hari 15 — Kunci cetak generik + Edit/VOID Purchase Invoice (BE saja — FE menyusul):
- **`src/core/print-lock/`** (baru) — `PrintLockService` generik lewat raw SQL terhadap
  kontrak kolom bersama (`print-lock-tables.ts`: `posting_status`/`print_status`/
  `print_count`/`printed_at`/`revision_number`/`void_reason_*`), pola sama
  `StockRecorderService.getLatestCostBasis`/`reverseIn` yang juga raw-SQL untuk operasi
  lintas-tabel generik. Tiga method: `registerPrint()` (cetak ulang bebas), `preflight()`
  (WAJIB sebelum transaction dibuka — bikin `authorization_requests` PENDING + lempar 412
  TANPA `manager` kalau dokumen `PRINTED` dan belum ada `authorizationRequestId`, pola identik
  `WarehouseMutationsService.create()` untuk `BS_TO_STORE`), `consume()` (WAJIB di dalam
  transaction, `manager` wajib — `SELECT ... FOR UPDATE` lalu konsumsi approval + pindah
  `print_status` → `PRINT_CANCELLED` + `revision_number++` hanya untuk intent `EDIT`).
- **Migration `1785080602942`**: `revision_number INTEGER NOT NULL DEFAULT 0` ditambah ke
  `purchase_invoices` (dipakai penuh) dan `warehouse_mutations` (kolom saja, pola sama seri
  kolom print-lock yang sudah ditanam Hari 13/14 sebelum logic-nya ada).
  **UNLOCK_PRINT payload matcher** ditambah ke `payload-matchers.ts`:
  `exactFields(['sourceType','sourceId','intent'])`.
- **`StockRecorderService.assertLotsUnconsumed(sourceType, sourceId, manager, message)`**
  (baru) — cek level-DOKUMEN (semua lot sekaligus) apakah ada yang `qty_remaining !==
  qty_in`, predikat identik dengan pengecekan per-movement yang sudah ada di `reverseIn`
  (Hari 11) tapi dipanggil lebih awal (sebelum jurnal disentuh) dan dengan pesan Indonesia
  yang bisa dikustomisasi per pemanggil (edit vs VOID beda pesan).
- **`PurchaseInvoiceVoidHook`** (baru) — `OnModuleInit` self-register ke `VoidEngineService`
  (`voidEngineService.registerHook('PURCHASE_INVOICE', this)`) — **pola pertama di codebase
  ini**, GD Hari 13 sengaja belum implementasi VOID jadi belum ada contoh sebelumnya. Modul
  dokumen berikutnya (Hari 16+) mengikuti pola yang sama begitu tabelnya ada.
- **`PurchaseInvoicesService`** +3 method: `registerPrint()`, `update()` (scope sempit
  header-only, dikonfirmasi user — lihat §2 Hari 15 di atas untuk alasan arsitekturalnya),
  `voidInvoice()`. Keduanya (`update`/`voidInvoice`) mengikuti struktur dua-tahap yang sama:
  `printLockService.preflight()` di luar `dataSource.transaction()`, lalu di dalamnya
  `printLockService.consume()` → cek bisnis (`assertLotsUnconsumed`/`VoidEngineService.
  voidDocument()`) → tulis perubahan.
- **Scope VOID disengaja tidak termasuk** rule umum §2.13 ("VOID Operator wajib step-up") —
  `ActionType.VOID_DOCUMENT` payload matcher-nya tetap menunggu Hari 21, sesuai catatan yang
  sudah ada di `payload-matchers.ts` sejak Hari 9 ("Hari 13/15/17/21", `VOID_DOCUMENT`/
  `SELL_BELOW_COST` eksplisit ditandai Hari 21). VOID Purchase Invoice hari ini HANYA
  digerbangi `UNLOCK_PRINT` kalau dokumen sudah dicetak.
- **Verifikasi**: `npm run build`/`lint` BE 0 error; `npm run test` **115/115 lolos, 21
  suite** (naik dari 95 — 8 test baru `print-lock.service.spec.ts` generik tanpa modul
  dokumen apa pun sama sekali, insert fixture langsung ke `purchase_invoices` via raw SQL
  untuk membuktikan mekanismenya benar-benar tidak terikat satu modul; 12 test baru di
  `purchase-invoices.service.spec.ts`); migration `1785080602942` `up→down→up` di DB scratch
  sukses; `./scripts/verify.sh` **10/10 lulus**. **Manual curl end-to-end**: faktur
  `B1/RM01-26080112` dicetak 2x bebas tanpa approval (`printCount` 1→2) → `PATCH` tanpa
  header → 412 → approve via SUPERVISOR (user berbeda dari requester, sesuai aturan
  `authorization_requests`) → retry `PATCH` dengan header → 200
  (`printStatus=PRINT_CANCELLED`, `revisionNumber=1`) → faktur `B1/RM01-26080113` (belum
  dicetak) → `POST .../void` langsung 200 tanpa 412 sama sekali. **Data uji manual dihapus
  lagi** dari DB dev setelah verifikasi — beda dari precedent Hari 13/14 (yang sengaja
  dibiarkan) karena kali ini penghapusan lewat query terarah by-id (journal reversal +
  goods_receipt + lines + lot + movement + invoice + authorization_requests), bukan
  menyentuh `stock_cost_lots`/`product_stock_balance` secara global.
- **Belum dikerjakan / di luar lingkup sengaja**: FE detail Purchase Invoice (tombol Cetak/
  Batal Cetak/Edit/VOID) · wiring edit/VOID untuk `WAREHOUSE_MUTATION` (kolom
  `revision_number` sudah ada, logic-nya menyusul kalau GD butuh edit/VOID) · rule umum
  §2.13 VOID-Operator-wajib-step-up (`ActionType.VOID_DOCUMENT`, tetap Hari 21 sesuai
  rencana lama).

Hari 17 — Biaya Operasional / Pengeluaran Kas + approval kas besar (BE saja — FE menyusul).
Ditemukan `docs/PERTANYAAN_KLIEN_BIAYA_OPERASIONAL.md` sudah terisi jawaban klien nyata
(dibuat sesi sebelumnya) yang mengoreksi premis prompt awal — dikonfirmasi ulang ke user
via AskUserQuestion sebelum dikerjakan (lihat §3 hari ini untuk 4 keputusan):
- **Skema header+baris**, BUKAN satu-transaksi-satu-biaya — `operational_expense_documents`
  (`expense_date UNIQUE`, satu bukti `KK/RM01-YYMMXXXX` per hari kalender, `cash_account_id`)
  + `operational_expense_lines` (`expense_account_id`, `amount`, `description` bebas teks —
  nama tukang angkut belum jadi master data, `posting_status`). Migration `1785080602946`.
  Baris ditambahkan ke bukti hari yang sama lewat panggilan `createLine()` TERPISAH
  sepanjang hari (find-or-create header `SELECT...FOR UPDATE` lalu `INSERT` kalau belum ada
  — race teoritis disengaja tidak ditangani, volume ±1-8 baris/hari satu PC).
- **VOID per BARIS** (`sourceId` = `operational_expense_lines.id`), bukan per header — kontrak
  `VoidEngineService` satu `sourceId` ↔ satu `JournalEntry`. `OperationalExpenseVoidHook`
  (pola sama `PurchaseInvoiceVoidHook`, `checkVoidable()` no-op karena tidak ada stok).
- **`chart_of_accounts.requires_outflow_approval`** (baru, migration `1785080602945`, default
  `false`) — dibaca `OperationalExpensesService` bareng `settings.cash_outflow_approval_threshold`
  (sudah ada sejak Hari 7, sebelumnya 0 pembaca — ini pemakai produksi pertama). Kalau akun kas
  bertanda DAN `amount > threshold` → `StepUpService.requireApproval()` dua kali (pola sama
  `WarehouseMutationsService` §BS_TO_STORE: sekali TANPA `manager` sebelum transaction, sekali
  lagi DENGAN `manager`+`authorizationRequestId` di dalamnya). `ActionType.CASH_OUTFLOW` +
  payload matcher `exactFields(['accountId','amount'])` **sudah ada sejak Hari 9**, hari ini
  pemakai produksi pertamanya. `contextSummary` memuat nama akun + nominal.
  **Gap diketahui, dicatat bukan disembunyikan**: belum ada `PATCH /chart-of-accounts/:id`
  (CRUD COA penuh baru Hari 18) — kolom ini hanya bisa dicentang lewat SQL langsung sampai
  besok, sama seperti gap `suppliers.isPkp` Hari 14.
- **Hanya akun bertipe `EXPENSE`** boleh dipilih di baris — Piutang/Hutang/Persediaan ditolak
  eksplisit (jawaban klien §6: pembayaran supplier modul terpisah, Hari 26-27).
- **Backdate 7 hari KHUSUS modul ini** (jawaban klien §12 — bukti akhir pekan baru diketik
  Senin/Selasa), BUKAN perubahan global. `PeriodLockValidatorService.validate()` dapat
  parameter opsional `maxDaysOverride`; `PostJournalDto.periodLockMaxDaysOverride` di-thread
  lewat `JournalPosterService.post()` — modul lain yang tidak mengisi field ini tetap default
  `settings.backdate_max_days` (2 hari). Diverifikasi test regresi eksplisit (modul lain tidak
  ikut longgar).
- **`DocumentCounterService`**: `DocumentType` + `'OPERATIONAL_EXPENSE'`, prefix `KK` (usul
  dokumen klien §8 — "Kas Keluar"). **Tidak** ikut kunci cetak, **tidak** masuk Laporan
  Kontinuitas (jawaban klien §8, layar cetak & kunci cetak di luar lingkup hari ini).
- **11 akun `EXPENSE` seri `52xx` di-seed** (migration `1785080602947`) sebagai placeholder —
  daftar akun 08.xxx Affari yang sesungguhnya belum didapat (§2 tidak terjawab berarti).
  `5201 Gaji Harian Tukang Angkut` dan `5202 Ongkos Kirim Pembelian` mewakili dua kebutuhan
  pasti hari ini. `5102 Biaya Operasional` (akun lama) tidak dihapus, tetap fallback.
- **Ongkir pembelian**: dikonfirmasi tidak ada field freight apa pun di
  `purchase-invoices.service.ts`/entity/DTO — dicatat murni lewat `POST /operational-expenses`
  biasa (akun `5202`), tidak menyentuh `unit_cost`/lot mana pun. Tidak ada perubahan di modul
  Faktur Pembelian.
- **Keputusan user (di luar lingkup hari ini, dicatat sebagai item terbuka baru)**: "gaji harian
  salesman" di prompt awal **salah** — jawaban klien §3 bilang salesman digaji bulanan (MASTER
  saja), yang harian itu **tukang angkut** (buruh angkat, OPERATOR). **Piutang karyawan**
  (kasbon, §3.5) TIDAK dibangun — item baru masuk §1, kemungkinan disatukan modul Pembayaran
  Hari 26-27 (sama-sama piutang, bukan biaya).
- **Verifikasi**: `npm run build`/`lint` BE 0 error; `npm run test` **138/138 lolos, 25 suite**
  (10 test baru `operational-expenses.service.spec.ts` — bawah/atas ambang akun bertanda,
  atas ambang akun tak bertanda, VOID per baris + jurnal pembalik hari ini, 2 baris 1 hari
  sama, cashAccountId beda ditolak, akun bukan EXPENSE ditolak dua kasus, backdate 5/8 hari,
  regresi override tidak bocor ke modul lain); migration `1785080602945-947` `up→down→up`
  sukses; `./scripts/verify.sh` **10/10 lulus**.
- **Manual curl end-to-end**: lihat §3 hari ini untuk detail lengkap (akun uji, threshold,
  412→approve→retry, VOID, backdate).
- **Belum dikerjakan / di luar lingkup sengaja**: FE halaman Biaya Operasional · cetak nota
  `KK` (klien konfirmasi dicetak untuk arsip, §8 — layout A5 menyusul) · kunci cetak & Laporan
  Kontinuitas untuk `KK` (eksplisit dikecualikan jawaban klien) · master "tukang angkut"
  bernama (klien jawab "Iya" perlu rekap per orang, §3.3 — tapi ±0,5 hari tanpa slot margin,
  tetap teks bebas hari ini) · daftar akun biaya 08.xxx Affari asli · anggaran/template
  berulang (dilarang eksplisit prompt hari ini).

Hari 18 — CRUD COA penuh untuk MASTER + kunci customers.ar_account_id (BE saja — FE menyusul):
- **`POST`/`PATCH /chart-of-accounts/:id`**, MASTER saja (`@Roles(Role.MASTER)` method-level
  menimpa class-level MASTER+SUPERVISOR). Tidak ada `DELETE` (CLAUDE.md §2.1) — nonaktifkan
  lewat `PATCH { isActive: false }`. Validasi: kode format `GG.KKK.JJJJJ` (DTO regex) + unik
  (service, pesan rapi bukan `QueryFailedError` mentah) · kombinasi `account_subtype`×
  `normal_balance` mustahil ditolak (COA_USULAN §7.1, tabel 17 subtype di-hardcode) · flag
  singular (`is_inventory_account`/`is_payable_account`/`is_input_vat_account`/
  `is_purchase_return_diff_account`/`is_opening_balance_equity_account`) harus tepat satu
  akun aktif (COA_USULAN §7.2) — `is_receivable_account`/`is_cash_account`/
  `requires_outflow_approval` sengaja TIDAK masuk daftar ini, boleh dimiliki banyak akun ·
  `parentId` wajib menunjuk akun header (`is_postable=false`), akun Jenis ditolak jadi induk
  (mencegah pohon patah seperti bug Hari 17A).
- Entity `ChartOfAccount` dapat 2 kolom yang sudah ada di DB sejak Hari 14/16
  (`isInputVatAccount`, `isPurchaseReturnDiffAccount`) tapi belum pernah dideklarasikan —
  tanpa ini CRUD "penuh" masih punya 2 flag yang tidak bisa diedit dari endpoint baru.
- **Kunci `ar_account_id`** (CLAUDE.md §3): `CustomersService.update()` menolak perubahan
  `arAccountId` selama saldo pelanggan ≠ 0 (dibandingkan `dto.arAccountId ?? null` vs
  `existing.arAccountId ?? null` — mengirim nilai yang sama TIDAK dianggap perubahan, tidak
  query saldo). Ternyata tidak ada satu pun tabel yang menyimpan saldo per pelanggan hari
  ini (Faktur/Pembayaran/Retur Penjualan belum ada; baris piutang Saldo Awal melebur jadi
  satu baris jurnal per akun). Diputuskan lewat AskUserQuestion: kolom baru
  `journal_entry_lines.customer_id` (nullable, migration `1785080602950`) — **invarian baru
  berdampingan `resolveArAccount()`** (Hari 8), WAJIB diisi tiap baris yang menyentuh akun
  piutang seorang pelanggan. `ArAccountResolverService.getCustomerBalance(customerId)`
  (pasangan `resolve()`, di `core/receivables/`) menjumlah `debit_amount - credit_amount`
  dari semua baris ber-tag itu, sengaja TIDAK difilter per akun. Hari ini hanya
  `OpeningBalanceService` (baris piutang Saldo Awal) mengisi tag ini; `VoidEngineService`
  meneruskannya apa adanya saat reversal (`reversalLines` di `void.service.ts` — titik
  paling gampang lupa, sebelumnya cuma mem-map `accountId`/`debit`/`credit`/`description`).
  **WAJIB diisi juga oleh Faktur Penjualan (Hari 21), Retur Penjualan (Hari 23), alokasi
  Pembayaran (Hari 26-27)** begitu modul itu dibangun — satu tempat lupa mengisi -> saldo
  pelanggan salah hitung tanpa error apa pun.
- Audit grep 5-tempat-`resolveArAccount()` diulang: 23 file cocok (naik dari 17), semua
  kenaikan dari file yang memang disentuh hari ini. **1 dari 5 tempat** (Saldo Awal) sudah
  ada kodenya — Faktur Penjualan/Retur Penjualan/Pembayaran belum eksis sebagai modul, bukan
  kebocoran.
- **Gap disengaja tidak ditutup**: mengubah `accountType`/`isPostable` akun yang sudah
  dipakai `journal_entry_lines` tidak divalidasi CRUD — bisa mengubah makna histori.
- **Verifikasi**: `chart-of-accounts.service.spec.ts` +7 test (akun kas baru → lolos
  `findCashAccounts()`, §7.1, §7.2 terhadap akun Persediaan REAL hasil seed Hari 17A, parent
  header vs bukan-header, code duplikat), `customers.service.spec.ts` **baru** 4 test (saldo
  nol/bersaldo/tanpa-perubahan/field-lain-tetap-jalan), `void.service.spec.ts` +1 test
  (regresi `customer_id` ikut reversal). `npm run test` **151/151, 25 suite** (naik dari
  139/24). Migration `1785080602950` `up→down→up` bersih. Manual curl end-to-end server
  sungguhan (login MASTER): akun kas `01.110.00099` dibuat di bawah header
  `01.110.00000` → langsung di `cash-accounts`; `requiresOutflowApproval` di-PATCH true;
  pelanggan uji + Saldo Awal piutang Rp75.000 sungguhan → `PATCH .../ar-account-id` → 400
  persis pesan yang diharapkan; SUPERVISOR & OPERATOR `POST /chart-of-accounts` → 403.
  `./scripts/verify.sh` 10/10. Data uji dihapus dari DB dev setelah verifikasi.
- **Belum dikerjakan (FE, eksplisit di luar lingkup prompt "TUGAS (BACKEND)")**: form
  tambah/ubah akun COA · dropdown `ar_account_id` tersaring akun piutang aktif.
- **Sisa Fase 4 dicek eksplisit**: tidak ada sisa BE. 2 gap FE lama tetap terbuka:
  `useSupplierSchema.ts` field `isPkp` (Hari 14), detail Purchase Invoice Cetak/Batal
  Cetak/Edit/VOID (Hari 15).

Urutan yang diharapkan:
`Auth → Products → Customers → Suppliers → Warehouses → Settings → DocumentCounters →
ChartOfAccounts → AuthorizationRequests → JournalPoster → StockRecorder(FIFO) →
VoidEngine → ManualJournal → OpeningBalance → WarehouseMutation → PurchaseInvoice →
PurchaseReturn → OperationalExpenses → SalesOrder → SalesInvoice → SalesReturn →
Agents → Vehicles → DeliveryOrder → Payments → Reports`

⚠️ Hari 19 (Sales Order, BE+FE, selesai 18 Agu) belum sempat dirangkum di §4 ini — lihat
detail lengkapnya di §2 checklist Hari 19 di atas, jangan salin bagian §4 ini ke prompt AI
berikutnya tanpa menyertakan itu juga.

Hari 20 — `price-suggestion` + skema Faktur Penjualan (BE saja — FE tetap Hari 21):
- Modul baru `src/modules/sales-invoices/`: migration `1785080602952-CreateSalesInvoices.ts`
  (`sales_invoices`+`sales_invoice_lines`, kolom kunci-cetak/`review_status`/`void_reason_*`
  disiapkan penuh pola identik `purchase_invoices` — belum di-*wire* ke `PRINT_LOCK_TABLES`/
  `VoidEngineService`, itu Hari 21/22), entities, `GET /price-suggestion` (fallback tingkat 1 &
  2 penuh; tingkat 3 (harga master) **tidak dibangun — keputusan final klien 20 Agu, PR #3
  tertutup**: panel kosong, operator tanya Master langsung. Lihat §2 checklist hari ini untuk
  detail).
- **`sales_invoice_lines.customer_id` didenormalisasi sejak `CREATE TABLE`** (bukan `ALTER`
  susulan) + index komposit `idx_sales_invoice_lines_price_lookup
  (customer_id, product_id, unit_id, id DESC)` — dibuktikan benar-benar dipakai lewat EXPLAIN
  ANALYZE manual (lihat §2), bukan cuma ada.
- **Temuan penting**: `id` di semua tabel dokumen di-generate `gen_random_uuid()` (UUID v4
  ACAK) — `ORDER BY id DESC` **TIDAK** berkorelasi dengan waktu sama sekali. Query
  price-suggestion memakai `ORDER BY sil.created_at DESC`, BUKAN `id DESC`, meski nama kolom
  terakhir index tetap `id DESC` sesuai spesifikasi tugas (index tetap sepenuhnya melayani
  predikat `WHERE`, cuma tidak menghilangkan node `Sort`). **Berlaku juga untuk index/query
  serupa di modul lain mana pun yang butuh "urutan terbaru" pada tabel ber-PK UUID acak** —
  jangan asumsikan `id DESC` ≈ kronologis di kodebase ini.
- `sales_invoices.salesman_id` dibuat **NOT NULL** (asumsi, dicatat eksplisit di plan —
  `CLAUDE.md` §3 tidak menyatakan wajib/opsional secara eksplisit; murah diubah sebelum Hari 21
  kalau keliru, belum ada data sungguhan).
- `DocumentType.SALES_INVOICE` → prefix `JL` sudah terdaftar sejak sebelumnya (tidak perlu
  perubahan `DocumentCounterService` hari ini) — dipakai mulai Hari 21.
- Verifikasi: `price-suggestion.service.spec.ts` 4 test integrasi (lihat DoD §2). `npm run
  build`/`lint`/`test` BE 0 error (173/173, 27 suite, naik dari 169/26). Migration
  `up→down→up` bersih. `./scripts/verify.sh` 10/10 (FE build sempat OOM di percobaan pertama —
  masalah RAM mesin dev tercatat sejak Hari 1 §3, bukan disebabkan perubahan hari ini karena
  tidak ada file `frontend/` disentuh).

Hari 20 (lanjutan sore) — Mulai form Faktur Penjualan (FE) + endpoint sisa stok (BE kecil):
- BE: `GET /products/:id/stock-balance` — `ProductsService.getStockBalance()` (baru,
  `products.service.ts`) + route baru `products.controller.ts`. Raw SQL `SUM(qty_base_unit)`
  dari `product_stock_balance` JOIN `warehouses` `WHERE warehouse_type='STORE'` — pola
  cermin-baca identik `getCommittedQty()`. Tanpa `@Roles` (OPERATOR & MASTER boleh baca,
  sama seperti `committed-qty`/`price-suggestion`). Tidak ada migration baru — tabel
  sudah ada sejak Hari 10, ini murni endpoint baca baru. 1 test integrasi baru di
  `products.service.spec.ts` (STORE dijumlah, BAD_STOCK diabaikan).
- FE: `frontend/app/components/StockPanel.vue` (baru) — tabel lokal (`<DataTable>` mode
  data lokal, kolom Gudang/Satuan/Qty) untuk konteks "SISA STOK" `LineModal`. **Bukan**
  `<StockBadge>` (yang sudah dipakai SO/PI sejak Hari 10/19, badge tunggal) — keputusan
  eksplisit user sesi ini: ikuti bentuk tabel di mockup `PANDUAN_UI.md` §7.1 persis, jangan
  reuse badge lama. `<StockBadge>` di SO/PI **tidak disentuh**.
- FE: `frontend/app/components/PriceHistoryPanel.vue` (baru, `PANDUAN_UI.md` §8.6 —
  didaftarkan sejak Hari 16A tapi belum pernah dibangun). Konsumsi `GET /price-suggestion`,
  watch `[customerId, productId, unitId]` dengan debounce 150ms, tabel lokal kolom
  Tanggal/Qty/Satuan/@Harga, judul menyebut nama pelanggan aktif. `source==='NONE'` atau id
  belum lengkap → teks "Belum ada riwayat harga."/"Pilih pelanggan, produk, dan satuan...".
  **Tidak ada `selectable`/`on-row-click`** — baris murni referensi, instruksi eksplisit
  klien (jangan bisa mengisi harga dari sini).
- FE: `frontend/app/components/LineModal.vue` diperluas — 3 emit opsional baru
  (`unlock-harga`, `unlock-diskon`, `enter-next`) disambungkan ke `onUnlockHarga`/
  `onUnlockDiskon`/`onEnterNext` yang sudah ada di `useDocumentHotkeys()` sejak Hari 16A
  tapi **belum pernah dipakai pemanggil mana pun** sampai hari ini. Backward-compatible —
  SO/PI yang tidak listen ke emit baru ini tidak berubah perilakunya sama sekali (`tambah
  prop, jangan fork`, `CLAUDE.md` §6).
- FE: `frontend/app/composables/useSalesInvoiceLookups.ts` (baru) — pola identik
  `useSalesOrderLookups.ts`, tambah `loadSalesmanMap()` (`GET /salesmen`).
- FE: `frontend/app/utils/salesInvoiceCalc.ts` (baru) — port murni `CLAUDE.md` §4 "Faktur
  Penjualan". **Sengaja lebih sederhana** dari `purchaseInvoiceCalc.ts`: tidak ada alokasi
  pro-rata diskon faktur per baris (penjualan tidak membentuk lot), PPN keluaran dihitung
  SEKALI di header atas `(subtotal - diskon_faktur)` digerbangi **`company_is_pkp` SAJA**
  (`CLAUDE.md` §2.11) — bukan per-baris `productIsBkp && supplierIsPkp` seperti PPN masukan
  pembelian. Tidak ada konsep bonus (khusus pembelian dari supplier).
- FE: `frontend/app/pages/penjualan/faktur/{index,create}.vue` (baru) — pola thin-wrapper
  identik `pembelian/faktur/`. Header: Pelanggan (+ tombol "+ Pelanggan Baru") · Salesman
  (wajib, `salesman_id` NOT NULL di skema) · Saluran TOKO/PENGIRIMAN (PENGIRIMAN
  menampilkan dropdown Sales Order opsional dari `GET /sales-orders?customerId&status=OPEN`,
  **belum divalidasi wajib** — itu `assertChannelSalesOrderRequirement()` BE, Hari 21) ·
  Tgl Faktur/Termin/Jatuh Tempo · Diskon Faktur persen/rupiah. Baris: Produk (cari lewat
  `display_name`, `<UInputMenu>` filter client-side atas 500 produk termuat, sama pola
  SO/PI) · Satuan default DUS (`allowedUnitsForProduct()`, disalin verbatim dari
  `pembelian/faktur/index.vue`, bukan ditulis ulang) · Isi read-only · **Harga & Diskon
  terkunci default**, ikon gembok + Ctrl+H/Ctrl+D · H.Netto & Jumlah dihitung live lewat
  `calculateSalesInvoice()` (satu baris draft sebagai satu-satunya baris, karena diskon
  faktur tidak dialokasikan per baris di Penjualan — beda dari `lineDraftPreview` PI yang
  perlu konteks seluruh faktur). Kanan: `<StockPanel>` (dari `stock-balance` baru) lalu
  `<PriceHistoryPanel>`.
- FE: **"+ Pelanggan Baru"** — `<CrudFormPage modal :open :schema="useCustomerSchema()"
  :transform-out="customerTransformOut">` ditumpuk langsung di halaman Faktur Penjualan
  (bukan lewat `MasterDataCrudPage`), stacking otomatis Nuxt UI `UModal` di atas
  `DocumentModal` faktur. **Susunan baru** — belum ada contoh serupa (nesting `CrudFormPage
  modal` di dalam form dokumen lain) sebelum ini di kodebase.
- **Sengaja tidak dibangun hari ini** (dicatat, bukan didiamkan): `POST`/`GET
  /sales-invoices` (Hari 21) — Simpan dokumen & daftar Faktur Penjualan keduanya gagal
  dengan pesan error yang wajar (bukan crash), **diverifikasi manual sebagai hasil yang
  diharapkan**. Validasi SO wajib untuk `PENGIRIMAN`, batas jual di bawah harga pokok
  (`SELL_BELOW_COST`), dan tombol "Jadikan Faktur" dari Sales Order — semua Hari 21.
- Verifikasi lengkap (manual end-to-end browser + build/lint/test) ada di DoD §2 di atas.

Hari 21 — `POST /sales-invoices` alur penuh (BE saja — FE tetap belum, prompt sesi ini
eksplisit "TUGAS (BACKEND)"):
- Modul baru lengkap: `src/modules/sales-invoices/sales-invoices.service.ts` (`create()`),
  `.controller.ts` (`POST /sales-invoices`, `@Roles(MASTER, OPERATOR)`, header
  `x-authorization-request-id` dibaca manual pola `WarehouseMutationsController`), `dto/
  create-sales-invoice.dto.ts` + `create-sales-invoice-line.dto.ts` (field PERSIS
  `buildPayload()` FE Hari 20, jangan diganti tanpa ubah FE). `sales-invoices.module.ts`
  diperluas: `DocumentCounterModule`, `StockRecorderModule`, `JournalPosterModule`,
  `AccountResolverModule`, `ReceivablesModule`, `TaxRatesModule`, `StepUpModule`,
  `SalesOrdersModule` (sudah `export SalesOrdersService` sejak Hari 19, tinggal pakai).
  **Tidak** `PrintLockModule`/`VoidModule` — itu Hari 22 (edit/VOID/kunci cetak faktur
  penjualan), sengaja tidak diinject dependency yang belum dipakai.
- **Kalkulasi**: port persis `frontend/app/utils/salesInvoiceCalc.ts` ke backend (sen integer,
  sama pola `PurchaseInvoicesService` tapi TANPA alokasi pro-rata diskon faktur ke baris —
  penjualan tidak membentuk lot — dan PPN keluaran digerbangi HANYA `company_is_pkp`, satu kali
  di header, bukan per-baris seperti PPN masukan pembelian).
- **Batas jual di bawah harga pokok**: pakai ulang `StockRecorderService.getLatestCostBasis()`
  (Hari 10, sudah skip lot bonus) murni sebagai READ pre-transaction (manager opsional, dipanggil
  tanpa manager). Dibandingkan terhadap `netAmount/qtyInput` (harga bersih SETELAH diskon baris),
  BUKAN dipotong diskon faktur juga (sales tidak alokasi pro-rata). Pola step-up dinamis dua-
  panggilan (pre-transaction tanpa `manager`/`authorizationRequestId` → 412 dengan baris
  `authorization_requests` yang SELAMAT dari rollback; in-transaction DENGAN keduanya → konsumsi
  atomic) disalin PERSIS dari `WarehouseMutationsService.create()` untuk `BS_TO_STORE` — satu-
  satunya precedent step-up dinamis multi-baris di codebase sebelum ini.
- **`ActionType.SELL_BELOW_COST`** — pemanggil pertama (sejak didaftarkan di enum Hari 9).
  Entry baru di `payload-matchers.ts`: `exactFields(['customerId','invoiceDate','lines'])`,
  `lines` = HANYA baris yang melanggar (bukan seluruh faktur) — **satu approval per FAKTUR**,
  dibuktikan test (3 baris melanggar → 1 baris `authorization_requests`, bukan 3).
- **Bug ditemukan & diperbaiki di `payload-matchers.ts` (`sameValue()`)**: Postgres **jsonb
  menormalisasi ulang urutan key objek** (panjang-lalu-leksikografis, BUKAN urutan insersi) —
  `JSON.stringify` naif membandingkan `approved` (hasil baca balik dari DB, ter-normalisasi) vs
  `current` (dibangun segar di JS, urutan insersi) salah bilang "beda" untuk objek ber-3+-key
  yang urutannya tidak kebetulan sama. `BS_TO_STORE` (Hari 13) lolos selama ini murni kebetulan
  (2 key, `productId`<`qtyBaseUnit` sudah sesuai urutan normalisasi). Diperbaiki jadi deep-equal
  rekursif order-independent (array + objek nested) — **berlaku untuk SEMUA actionType**, bukan
  cuma `SELL_BELOW_COST`.
- **4 flag COA baru** (migration `1785080602953-AddSalesAccountFlagsToChartOfAccounts`):
  `is_revenue_account`, `is_sales_discount_account`, `is_cogs_account`, `is_output_vat_account`
  — sisi pembelian sudah punya flag singular serupa sejak Hari 14/18, sisi penjualan belum.
  `account_subtype` TIDAK bisa dipakai untuk `resolveSingleActive()` di sini (tidak unik: mis.
  `CONTRA_REVENUE` dipegang baik Retur Penjualan maupun Diskon Penjualan). **Draft awal migration
  sempat salah** memakai kode akun pendek (`4101` dst., disalin dari blok `down()`
  `RestructureChartOfAccountsV2` yang keliru dibaca sebagai kode final) — ketahuan lewat
  `migration:run` sungguhan (0 baris ter-UPDATE) sebelum dipakai test/curl, diperbaiki ke kode
  panjang aktual hasil `up()` (`04.110.00001` "Penjualan Barang Dagang", `04.110.00003`,
  `05.110.00001`, `02.110.00022`) — dikonfirmasi query langsung + `is_postable` (header vs leaf).
  `chart-of-accounts.service.ts` `SINGULAR_FLAGS` + `create-chart-of-account.dto.ts`/
  `update-chart-of-account.dto.ts` ikut diperluas 4 entry supaya CRUD COA tetap menjaga invarian
  "tepat satu akun aktif per flag".
- **Jurnal metode BRUTO**: Piutang (D, `customerId` WAJIB terisi di baris — invarian Hari 18) /
  [Diskon Penjualan (D), hanya kalau `total_diskon>0`] / Pendapatan (K, dari Σ `baris_kotor`,
  BUKAN subtotal) / [PPN Keluaran (K), hanya kalau `>0`] / [HPP (D) + Persediaan (K), hanya kalau
  `totalCogsCents>0` — produk yang benar-benar belum pernah punya lot sama sekali menghasilkan
  COGS nol, baris jurnal nol ditolak `JournalPosterService`, jadi dilewati sama seperti baris
  kondisional lain]. Balance terjamin secara aljabar oleh konstruksi rumus (dibuktikan manual:
  `totalAmount + totalDiscount === grossTotal + outputVat`), bukan kebetulan.
- **Verifikasi**: `npm run build`/`lint` BE 0 error; `npm run test` BE **183/183 lolos, 28 suite**
  (naik dari 174/27, +9 test baru `sales-invoices.service.spec.ts`); migration `up→down→up`
  bersih (2x, termasuk setelah draft kode diperbaiki); `./scripts/verify.sh` 8/10 (2 gagal pra-ada,
  dikonfirmasi bukan regresi — lihat DoD §2 Hari 21). **Manual curl end-to-end** (server sungguhan,
  login asli `master`/`supervisor`): alur 412 → approve → retry sukses, token sekali-pakai
  ditolak dipakai ulang, SUPERVISOR 403 sebelum menyentuh DB, `unit_cost_fifo` FIFO sungguhan
  (beda dari basis batas jual-rugi, dibuktikan angka beda persis sesuai desain), jurnal balance.
  Data uji dihapus lagi — termasuk mengembalikan `stock_cost_lots.qty_remaining`/
  `product_stock_balance` yang sempat berkurang, bukan cuma baris dokumen (§2 Hari 21 untuk detail).
- **Sengaja tidak dibangun sesi BE ini**: `GET /sales-invoices` (daftar+detail) dan FE penyambung
  form (sesi sore, lihat entri di bawah). Edit/VOID/kunci-cetak/print faktur penjualan tetap Hari 22.
  ⚠️ **Koreksi catatan sebelumnya**: baris ini sempat salah menulis "`GET /sales-invoices` sudah
  ada dari Hari 20 lewat `DataTable` generik" — itu keliru, endpoint itu **benar-benar tidak ada**
  sama sekali (hanya `POST /sales-invoices` ter-mapping, dibuktikan uji manual browser sore ini:
  halaman daftar `/penjualan/faktur` selalu menampilkan "Gagal memuat data — Cannot GET
  /sales-invoices?..."). `DataTable` menangani error fetch dengan baik (tidak merusak halaman,
  tombol Entri tetap berfungsi), jadi ini tidak memblokir kerja form/StepUp hari ini, tapi
  **daftar Faktur Penjualan tetap rusak sampai `GET /sales-invoices` dibangun** (kandidat Hari 22
  bareng edit/VOID, atau lebih awal kalau perlu didemokan ke klien).

Hari 21 (sore) — FE Faktur Penjualan disambungkan ke BE pagi:
- `frontend/app/pages/penjualan/faktur/index.vue`: `<TotalsBar>` diperluas dari 4 jadi 7 item
  (tambah Subtotal/Diskon Baris/PPN Keluaran, semua dari `calc.*` yang sudah dihitung
  `calculateSalesInvoice()` — tidak ada computed baru). `submit()` dibungkus
  `useStepUp().withStepUp()` (composable + `<StepUpDialog>` global sudah ada sejak
  `WarehouseMutationsService`/Hari 13, ini pemakai kedua) menggantikan `api.post()` polos;
  catch `StepUpCancelledError` ditambah. Diskon baris+faktur persen/rupiah dan Ctrl+H/Ctrl+D+hint
  **sudah ada dari Hari 20** — hari ini cuma diverifikasi manual, tidak diubah.
- **Bug diperbaiki (out-of-scope FE, disetujui user)**:
  `backend/src/modules/sales-invoices/sales-invoices.service.ts` `buildContextSummary()` —
  string lama menyertakan `jual Rp{x} < pokok Rp{y}` yang bocor verbatim ke `<StepUpDialog>`
  (CLAUDE.md §17 dilanggar). Diperbaiki jadi hanya nama produk, pola sama
  `WarehouseMutationsService.buildContextSummary()`.
- **Verifikasi**: `npm run build`/`lint` FE 0 error; BE `build`/`lint`/`sales-invoices.service.spec.ts`
  tetap hijau (9/9) setelah perbaikan `contextSummary`, tidak ada test yang menguji string persis
  lama. `./scripts/verify.sh` 8/10 — 2 gagal pra-ada, dikonfirmasi bukan regresi (race
  `document_counters` lintas-suite kena `sales-orders.service.spec.ts` kali ini, lulus 18/18
  sendirian; FE build OOM di verify.sh karena tidak menyetel `NODE_OPTIONS`, build manual dengan
  heap tambahan sukses).

Hari 21 (sore, lanjutan) — **Uji manual browser end-to-end**, `npm run start:dev` (BE) +
`npm run dev` (FE) sungguhan, login `operator` asli, faktur produk "Bendera Putih Sachet"
2 DUS @Rp100.000 diskon baris Rp5.000 (H.Netto Rp97.500/DUS, di bawah batas Rp195.000/DUS):
- **DoD terbukti lewat DOM + query DB langsung, bukan cuma baca kode**: TotalsBar tampil
  Subtotal 195.000 / Diskon Baris 5.000 / Diskon Faktur - / PPN Keluaran - / **Total 195.000**
  identik dengan `sales_invoices.total_amount = 195000.00` di DB setelah tersimpan ✅. Ctrl+H/
  Ctrl+D membuka field Harga/Diskon (border hijau + fokus) persis sesuai desain ✅. `StepUpDialog`
  terbuka dengan `contextSummary` **"Faktur Pak 1: 1 baris di bawah harga pokok — Bendera Putih
  Sachet"** — dikonfirmasi lewat `GET /authorization-requests` langsung ke API — **tidak ada
  angka Rp sama sekali**, perbaikan `buildContextSummary()` sore ini terbukti bekerja ✅. Approve
  via API sebagai `supervisor` → polling FE (5 detik) otomatis mendeteksi `APPROVED` → retry
  `POST /sales-invoices` dengan header `x-authorization-request-id` → faktur `JL/RM01-26080081`
  tersimpan `POSTED` **tanpa aksi tambahan operator** ✅ (dibuktikan lewat query `sales_invoices`
  langsung, bukan cuma asumsi dari UI kembali ke daftar).
- 🐛 **Bug ditemukan, BELUM diperbaiki**: `<StepUpDialog>` (global) **tidak terlihat DAN tidak
  bisa diklik** operator selama `DocumentModal` faktur (`entriOpen`) masih terbuka di baliknya.
  Dibuktikan lewat `document.elementFromPoint()` pada koordinat tombol "Batalkan" —
  hasilnya elemen overlay `DocumentModal` (`fixed inset-0`, backdrop gelap), bukan dialog step-up,
  meski dialog itu sendiri ADA & interaktif di DOM (dibuktikan lewat `read_page`/`get_page_text`
  yang menangkap teksnya). Akar masalah: kedua modal Teleport ke `<body>` dengan `z-index: auto`,
  jadi urutan tumpuk murni ikut urutan DOM; `StepUpDialog` dipasang di `layouts/default.vue`
  (mount lebih dulu, di posisi DOM lebih awal) sehingga modal halaman mana pun yang masih terbuka
  (`DocumentModal`, dipasang belakangan) SELALU menutupinya. **Bukan regresi hari ini** — pola
  `withStepUp()` dengan `DocumentModal` tetap terbuka disalin persis dari
  `gudang/mutasi/index.vue` (BS_TO_STORE, Hari 13), yang berarti bug yang sama kemungkinan besar
  juga ada di sana; sepertinya belum pernah diuji visual di browser sungguhan sebelum ini (catatan
  Hari 13 hanya menyebut "manual curl end-to-end"). **Efek ke operator**: tombol Simpan tampak
  macet berputar tanpa penjelasan apa pun, tidak bisa Batalkan — kalau supervisor tidak kunjung
  approve, operator terkunci tanpa jalan keluar selain refresh halaman (draft tersimpan di
  sessionStorage lewat mekanisme `DocumentModal` yang sudah ada, jadi tidak hilang, tapi
  pengalamannya buruk). **Perlu diputuskan**: beri `StepUpDialog` z-index eksplisit lebih tinggi
  dari semua modal halaman (perbaikan satu tempat, dampak ke seluruh app), atau pendekatan lain.
  Di luar lingkup prompt sore ini (murni Sales Invoice FE) — dicatat sebagai temuan, tidak
  diperbaiki tanpa diminta.
- Data uji dihapus dari `omega_dev` setelah verifikasi: `sales_invoices`/`sales_invoice_lines`/
  `journal_entries`+`journal_entry_lines` (5 baris) dihapus, `stock_movements` (+
  `stock_cost_consumptions` ikut cascade) dihapus, `stock_cost_lots.qty_remaining` dan
  `product_stock_balance.qty_base_unit` dikembalikan ke nilai semula (produk "Bendera Putih
  Sachet" gudang Toko: 3455 base unit / 26,5769 DUS, sama seperti sebelum test). ⚠️ Sempat salah
  arah tanda pada `UPDATE product_stock_balance` pertama (`-260` alih-alih `+260`), ketahuan
  lewat perhitungan silang dengan angka "Sisa Stok" yang sempat dicatat di browser sebelum
  transaksi, dan segera dikoreksi dengan `UPDATE` kedua (+520) sebelum dilaporkan selesai — nilai
  akhir diverifikasi ulang cocok persis. `document_counters`/nomor `JL` **tidak** dikembalikan
  (sesuai aturan §2.4 — nomor tidak pernah di-reset manual, hanya lewat VOID sungguhan; nomor
  `JL/RM01-26080081` sengaja dibiarkan "terpakai" tanpa dokumen, konsekuensi dari cara kerja
  DB dev yang akan di-reset/reseed sebelum produksi, bukan pelanggaran §2.4 di data produksi).
  `authorization_requests` baris `2150090e-...` dibiarkan `APPROVED`/`EXECUTED` sebagai jejak
  historis, sama seperti baris uji lama lainnya di tabel itu (pola sudah ada sejak Hari 13).

**Hari 23 (BE saja) — Retur Penjualan (`sales-returns`, kode `RJ`):**
- `backend/src/modules/sales-returns/` (entities `SalesReturn`/`SalesReturnLine`, DTO, service,
  controller, module) — pola struktural disalin dari `purchase-returns` (Hari 16), TAPI **tanpa**
  akun "Selisih" (RJ tidak dinegosiasikan, semua angka turunan faktur asal) dan **tanpa** VOID
  (sama seperti RB, sengaja ditunda).
- **Wajib menunjuk faktur asal**: header `sales_invoice_id`, per baris
  `sales_invoice_line_id` (FK ke `sales_invoice_lines`) — retur tanpa faktur atau atas faktur
  VOID ditolak 400 di `SalesReturnsService.create()`.
- **`unit_cost_fifo` disalin apa adanya** dari baris faktur asal ke `sales_return_lines` DAN ke
  `StockRecorderService.recordIn()` (lot BARU di BAD_STOCK, BUKAN `transfer()` — beda dari mutasi
  gudang yang memindah lot yang sudah ada) — tidak pernah dihitung ulang.
- **Retur parsial per qty didukung.** PPN Keluaran & diskon faktur (cuma ada di HEADER faktur,
  bukan per baris) diprorata pakai **tarif efektif faktur asli sendiri**
  (`invoiceDiscountRatio = invoiceDiscountAmount/subtotal`,
  `effectiveVatRate = outputVatAmount/(subtotal-invoiceDiscountAmount)`, keduanya dari angka YANG
  SUDAH TERSIMPAN di faktur, bukan `tax_rates` hari ini) — keputusan eksplisit user sebelum
  implementasi (AskUserQuestion), dipilih di atas "hitung ulang pakai tarif hari ini" dan
  "batasi ke retur baris utuh saja". Properti yang diuji: retur SELURUH baris pada qty penuh
  mereproduksi `total_amount` faktur asal PERSIS (bukan kebetulan — identitas aljabar dari rumus).
- **Validasi sisa-qty per baris**: `SUM(sales_return_lines.qty_base_unit)` (join ke
  `sales_returns.posting_status='POSTED'`) untuk satu `sales_invoice_line_id` tidak boleh melebihi
  `qty_base_unit` baris faktur asal — dicek per baris DAN terhadap baris-baris lain dalam
  request yang sama (`seenQtyBaseUnitByLine` map, cegah double-dip dalam satu payload).
- **Validasi kumulatif nilai retur ≤ `total_amount` faktur** — pengganti sementara `paid_amount`
  yang belum ada (Payment module Hari 26-27 belum dibangun, `sales_invoices` tidak punya kolom
  itu sama sekali). Ini tafsir eksplisit atas DoD asli "faktur LUNAS + CASH → `paid_amount`
  tidak pernah melebihi `total_amount`" — keputusan user (AskUserQuestion), **bukan tebakan**,
  dicatat supaya tidak disangka DoD itu sudah teruji literal.
- **Jurnal** (CLAUDE.md §4 "Retur Penjualan"): `Retur Penjualan(D) DPP` / `[PPN Keluaran(D)]` /
  `Piutang-atau-Kas(K) total` / `[Persediaan(D)+HPP(K) harga pokok asli]` — baris kondisional
  dilewati kalau nol (pola sama sisi penjualan), dan **kalau semuanya nol** (retur baris bonus
  murni, `unit_price=0` & `unit_cost_fifo=0`) `JournalPosterService.post()` **tidak dipanggil
  sama sekali** (stok tetap berpindah lewat `recordIn()`, tapi tidak ada apa pun untuk dijurnal —
  sama prinsipnya dengan baris bonus di faktur tidak pernah menghasilkan COGS).
  Baris kredit ditag `customerId` HANYA untuk `REDUCE_INVOICE` (invarian Hari 18) — CASH
  mengkredit akun kas yang divalidasi `AccountResolverService.assertAccountHasFlag(...,
  'is_cash_account', ...)`, tanpa tag `customerId`.
- **COA**: flag singular baru `is_sales_return_account` (migration
  `1785080602956-AddSalesReturnAccountFlagToChartOfAccounts`) untuk akun "Retur Penjualan"
  (`04.110.00002`, sudah di-seed sejak `RestructureChartOfAccountsV2` Hari 17A) — `account_subtype
  CONTRA_REVENUE` tidak unik (dipegang juga Diskon Penjualan), pola persis
  `is_purchase_return_diff_account`. `chart-of-accounts.service.ts` `SINGULAR_FLAGS` +
  `create-chart-of-account.dto.ts`/`update-chart-of-account.dto.ts` ikut diperluas.
- **Kunci cetak**: `sales_returns` ditambah ke `PRINT_LOCK_TABLES`, hanya `registerPrint()`
  di-wire (cetak ulang bebas) — EDIT/VOID sengaja ditunda, sama seperti RB Hari 16.
- **Tidak ada `ActionType`/step-up baru** — CASH settlement retur (sama seperti RB) hanya
  divalidasi data (`is_cash_account`), bukan digerbangi otorisasi.
- **Verifikasi**: migration `1785080602955`/`1785080602956` `up→down→up` bersih (2x); `npm run
  build`/`lint` BE 0 error; **13 test baru** `sales-returns.service.spec.ts` (real Postgres,
  faktur asal di-seed langsung lewat repository, bukan `SalesInvoicesService.create()`, supaya
  angka `subtotal`/`invoiceDiscountAmount`/`outputVatAmount`/`unitCostFifo` terkontrol presisi
  untuk menguji rumus prorata) — semua lolos; `five-invariants.spec.ts` (Hari 11) tetap 5/5 hijau;
  `npm run test` BE 221/221 per-suite (1 kegagalan `journal-poster.service.spec.ts` HANYA saat
  suite penuh — race `document_counters` lintas-suite pra-ada, tercatat sejak Hari 20, lulus
  10/10 sendirian, file itu tidak disentuh sesi ini). Flag `is_sales_return_account` dikonfirmasi
  query langsung: tepat SATU akun aktif. Detail lengkap DoD di §2 Hari 23.

**Hari 24 (BE saja) — Master Agen/Kendaraan + Surat Jalan (`delivery_orders`, kode `SJ`):**
- `backend/src/modules/agents/` + `backend/src/modules/vehicles/` — master kecil, pola
  PERSIS Salesman Hari 8 (kode-sequence tak-reset/nama/aktif, `generateSequenceCode()`
  bersama, prefix baru `AGN`/`KND`). Migration `1785080602957`/`1785080602958` (tabel +
  `agent_code_seq`/`vehicle_code_seq` langsung di migration yang sama, beda dari Brand/Unit/
  Salesman yang sequence-nya nyusul di migration terpisah — tidak ada alasan pisah untuk
  entity baru). **Rekap setoran agen SENGAJA TIDAK dibangun** (dipotong 28 Juli,
  `KONTEKS_REVISI` §4.4) — tabel `agents` tidak membawa kolom apa pun untuk itu.
- `backend/src/modules/delivery-orders/` (migration `1785080602959`) — **terbentuk DARI
  satu faktur penjualan bersaluran `PENGIRIMAN`**, TIDAK ADA array `lines` di
  `CreateDeliveryOrderDto` (beda dari `CreateSalesReturnDto`): seluruh baris
  `sales_invoice_lines` faktur disalin otomatis apa adanya (product/unit/qty, TIDAK ADA
  kolom rupiah/harga/HPP sama sekali di header maupun baris — surat jalan bukan dokumen
  uang, CLAUDE.md §1 "nota dibawa sopir untuk menagih"). Operator hanya memilih faktur +
  agen + kendaraan.
- **Validasi channel — DoD literal**: `salesChannel !== PENGIRIMAN` → 400 ("Faktur
  bersaluran TOKO tidak bisa dibuatkan surat jalan"), faktur `VOIDED` → 400, **satu faktur
  paling banyak satu surat jalan `POSTED` aktif** (dijaga di service lewat query
  `SELECT ... WHERE sales_invoice_id=$1 AND posting_status='POSTED'`, bukan constraint DB —
  pola sama validasi kumulatif retur penjualan Hari 23 — supaya kalau VOID SJ dibangun
  nanti Hari 25 aturannya tinggal baca `posting_status` yang sudah ada).
- **TIDAK menyentuh stok maupun jurnal sama sekali** — stok sudah berkurang saat faktur
  diposting (channel apa pun, CLAUDE.md §3 "SO tidak menahan stok"). `delivery-orders.module.ts`
  sengaja TIDAK import `StockRecorderModule`/`JournalPosterModule`/`VoidModule`/`StepUpModule`.
- **Kunci cetak**: `delivery_orders` ditambah ke `PRINT_LOCK_TABLES`
  (`core/print-lock/print-lock-tables.ts`), hanya `registerPrint()` di-wire (cetak ulang
  bebas) — EDIT/VOID/status pengiriman (`PENDING`/`DELIVERED`/`POSTPONED`/`RETURNED`)
  sengaja ditunda ke Hari 25 (PROGRESS.md §0.1), pola sama RJ/RB menunda VOID.
- `DocumentType.DELIVERY_ORDER` → prefix `SJ` **sudah terdaftar sejak Hari 5/6**
  (`document-counter.service.ts`) — tidak ada perubahan `DocumentCounterService` hari ini,
  nomor otomatis ikut format baku `SJ/{store_code}-YYMMXXXX`.
- **Verifikasi**: migration `1785080602957`→`1785080602959` `up→down→up` bersih (revert
  3x berurutan lalu run ulang, dikonfirmasi tidak ada FK yang nyangkut). `npm run
  build`/`lint` BE 0 error. **7 test baru** `delivery-orders.service.spec.ts` (integration
  real Postgres, faktur diseed langsung lewat repository seperti pola sales-returns spec):
  faktur tidak ditemukan, faktur TOKO ditolak, faktur VOID ditolak, **happy path 2 baris
  produk membawa agent_id/vehicle_id + nomor cocok regex `SJ/[A-Z0-9]+-\d{4}\d{4}`**, faktur
  yang sudah punya SJ aktif ditolak dibuatkan SJ kedua, agent/vehicle tidak ditemukan
  ditolak terpisah, `registerPrint()` cetak ulang bebas menaikkan `print_count`. `npm run
  test` BE penuh 227/228 — 1 kegagalan `journal-poster.service.spec.ts` HANYA saat suite
  penuh (race `document_counters` lintas-suite **pra-ada**, tercatat sejak Hari 20/21/23,
  lulus 10/10 sendirian, file itu tidak disentuh sesi ini).
- **Manual curl end-to-end** (server sungguhan `npm run start:dev`, login asli
  `master`/`supervisor`): `POST /agents`/`POST /vehicles` tanpa `code` → `AGN-001`/`KND-001`
  ter-generate ✅; `POST /agents` nama kosong → 400 ✅; **SUPERVISOR → 403** di
  `POST /agents` **dan** `POST /delivery-orders` (permission matrix CLAUDE.md §5, "Retur,
  Payment, Surat Jalan, ... MASTER+OPERATOR, SUPERVISOR 403 write") ✅; `PATCH /agents/:id`
  nonaktifkan ✅; `POST /delivery-orders` faktur acak (UUID tidak ada) → 400 pesan
  `"Faktur penjualan tidak ditemukan."` lewat HTTP penuh (guard→pipe→controller→service,
  bukan cuma unit test yang bypass Nest DI) ✅; `GET /delivery-orders` list kosong 200 ✅.
  Data uji (`agents`/`vehicles` + baris `audit_logs` terkait) dihapus dari `omega_dev`
  setelah verifikasi.
- **Sengaja tidak dibangun sesi BE ini** (di luar lingkup prompt "TUGAS (BACKEND)"): FE halaman
  Agen/Kendaraan (sesi FE sore, lihat entri di bawah), endpoint status pengiriman + FE Surat
  Jalan + cetak A5 (Hari 25), VOID surat jalan, rekap setoran agen (**dipotong permanen**,
  penggantinya kontrol manual Hari 28).

**Hari 24 (sore) — FE Agen/Kendaraan + tombol "Buat Surat Jalan":**
- `frontend/app/pages/master-data/agents/{index,create,[id]/edit}.vue` +
  `frontend/app/pages/master-data/vehicles/{index,create,[id]/edit}.vue` — pola **disalin
  persis** dari `master-data/salesmen/*` (CLAUDE.md §6: "Dilarang copy-paste layout tabel/form.
  Kalau butuh varian, tambah prop, jangan fork komponen" — di sini bukan fork, tapi pemakaian
  ulang komponen yang sudah generik `<MasterDataCrudPage>` + `useSimpleMasterSchema()` yang
  sudah ada sejak Hari 8, sama seperti Merek/Satuan/Salesman). Kolom baru:
  `frontend/app/composables/useAgentColumns.ts`/`useVehicleColumns.ts` (pola persis
  `useSalesmanColumns.ts`). Nav: `config/navigation.ts` grup MASTER DATA, roles
  `['MASTER','OPERATOR']` (SUPERVISOR tidak lihat menu ini, konsisten §5).
- **Tidak ada foto referensi** untuk Agen/Kendaraan di `docs/referensi/` (bukan layar sistem
  lama) — diturunkan dari §5 PANDUAN_UI (Anatomi Halaman Daftar) via `<MasterDataCrudPage>`
  generik, bukan tebakan bebas.
- Tombol **"Buat Surat Jalan"** di `frontend/app/pages/penjualan/faktur/[id]/index.vue` —
  muncul HANYA kalau `invoice.salesChannel === 'PENGIRIMAN' && postingStatus !== 'VOIDED'`
  (computed `canCreateDeliveryOrder`). Guard FE murni supaya operator tidak disodori tombol
  yang pasti ditolak — penjaga sesungguhnya tetap `DeliveryOrdersService.create()` (BE, Hari
  24 pagi). Klik membuka modal (Tanggal Kirim default hari ini, Agen, Kendaraan, Catatan
  opsional) → `POST /delivery-orders`. **Tidak ada array `lines` di form** — seluruh baris
  faktur disalin otomatis server-side (`CreateDeliveryOrderDto`, BE pagi), sesuai desain
  "surat jalan terbentuk DARI faktur".
- `useSalesInvoiceLookups.ts` diperluas: `AgentLookup`/`VehicleLookup` + `loadAgentMap()`/
  `loadVehicleMap()` (pola persis `loadSalesmanMap()`), dimuat bareng lookup lain di
  `onMounted()` halaman detail faktur.
- Sukses → `useToast()` menampilkan nomor SJ yang terbentuk (belum ada halaman
  daftar/detail Surat Jalan untuk dinavigasi — itu Hari 25, jadi toast adalah satu-satunya
  konfirmasi visual hari ini).
- **Verifikasi**: `npm run build`/`lint` FE 0 error (build manual dengan
  `NODE_OPTIONS="--max-old-space-size=4096"` — lihat catatan §3 OOM `verify.sh`).
  **Manual browser end-to-end sungguhan** (`npm run start:dev` BE + `npm run dev` FE, login
  `master` asli, Claude in Chrome): (1) Entri Agen "Pak Ujang" → kode `AGN-002` ter-generate,
  tersimpan, tampil di daftar ✅; (2) Entri Kendaraan "B 1234 XY - Truk Engkel" → `KND-002` ✅;
  (3) Ubah Kendaraan → modal pre-fill benar ✅; (4) Faktur `TOKO` existing
  (`JL/RM01-26080360`) → tombol "Buat Surat Jalan" **TIDAK ADA** di toolbar ✅; (5) Sales
  Order baru → Faktur Penjualan baru saluran **Pengiriman** (`JL/RM01-26080421`, melewati
  gerbang `SELL_BELOW_COST` step-up — dikonfirmasi `StepUpDialog` z-index fix Hari 22 masih
  bekerja) → tombol "Buat Surat Jalan" **MUNCUL** ✅ → modal diisi Agen "Pak Ujang" + Kendaraan
  "Truk Engkel" → submit → toast "Surat jalan terbentuk" ✅ → **dikonfirmasi lewat query DB
  langsung**: `delivery_orders` (`SJ/RM01-26080019`, `agent_id`/`vehicle_id` cocok) +
  `delivery_order_lines` (1 baris, `qty_base_unit=390` = 3 DUS × isi 130) ✅.
  ⚠️ **Data uji dihapus dari `omega_dev` setelah verifikasi** (delivery order, faktur, sales
  order, agent, vehicle, baris `audit_logs` terkait) — **termasuk memulihkan
  `product_stock_balance`/`stock_cost_lots.qty_remaining`** produk "Bendera Putih Sachet"
  (+390 base unit, dikembalikan ke lot FIFO tertua `lot_date=2026-08-06`) ke nilai semula
  3455 base unit / 26,5769 DUS (baseline yang sama tercatat Hari 21). **Catatan kejujuran**:
  baris `stock_cost_consumptions` sempat terhapus SEBELUM nilai lot per-baris dicatat, jadi
  pemulihan 390 unit dilakukan sebagai satu blok ke lot FIFO-pertama (bukan rekonstruksi
  persis per-lot seperti konsumsi aslinya) — **total agregat balance/lot sudah benar** (diuji
  ulang lewat query), tapi distribusi mikro antar-lot mungkin sedikit berbeda dari yang
  "seharusnya". Tidak berdampak ke kebenaran FIFO ke depan (lot tertua tetap dikonsumsi
  duluan), murni catatan transparansi, pola sama semangat catatan `document_counters`/nomor
  `JL` "terpakai" di Hari 21.

**Hari 25 (BE) — Status Pengiriman Surat Jalan + kunci cetak penuh:**
- Migration `1785080602960` (baru) — `delivery_order_delivery_status` ENUM
  (`PENDING`/`DELIVERED`/`POSTPONED`/`RETURNED`) + kolom `delivery_status` (default
  `PENDING`) + index. Entity `DeliveryOrder` diperluas (`DeliveryOrderDeliveryStatus`).
- `DeliveryOrdersService.updateStatus()` (baru) — **satu-satunya "edit" SJ**, digerbangi
  `PrintLockService.preflight()`/`consume()` intent `EDIT` persis pola
  `PurchaseInvoicesService.update()` Hari 15: SJ belum dicetak → bebas tanpa approval; SJ
  sudah `PRINTED` → 412 (`UNLOCK_PRINT`) sampai disetujui, lalu `print_status` →
  `PRINT_CANCELLED` + `revision_number++`. `PATCH /delivery-orders/:id/status` (baru,
  header `x-authorization-request-id` dibaca manual, pola sama `PurchaseInvoicesController`).
- `DeliveryOrderQueryDto` + `findAll()` diperluas filter `?deliveryStatus=` — daftar "belum
  terkirim" (CLAUDE.md §0.1) **dipakai ulang** dari `GET /delivery-orders` yang sudah ada,
  **tidak ada endpoint terpisah** (pola sama Pengecekan Invoice Harian, KONTEKS_REVISI §2.2).
- **Verifikasi**: migration `up→down→up` bersih. `npm run build`/`lint` BE 0 error. **4 test
  baru** `delivery-orders.service.spec.ts` (`describe('updateStatus() — kunci cetak')`,
  integrasi Postgres asli, pola sama suite print-lock `purchase-invoices.service.spec.ts`):
  status berubah sebelum cetak → sukses langsung tanpa `authorization_requests` ✅; status
  berubah setelah cetak tanpa unlock → **412 sungguhan**, approve + retry → sukses,
  `printStatus=PRINT_CANCELLED`, `revisionNumber=1` ✅; tanpa alasan pada SJ tercetak →
  ditolak ✅; filter `?deliveryStatus=POSTPONED` mengembalikan SJ POSTPONED saja, bukan yang
  lain ✅. `npm run test` BE penuh **232/232** (naik dari 227/228 — race
  `journal-poster.service.spec.ts` pra-ada tidak muncul run ini). **Manual curl end-to-end**
  server sungguhan (data diseed manual, dibuat lewat `POST /delivery-orders` asli): PATCH
  status sebelum cetak → 200 langsung ✅; cetak → PATCH status tanpa header → **412** body
  `requiresAuthorization:true` ✅; approve via SUPERVISOR (`POST
  /authorization-requests/:id/approve`) → retry dengan header → 200
  (`printStatus=PRINT_CANCELLED`, `revisionNumber=1`, `deliveryStatus=DELIVERED`) ✅;
  SUPERVISOR langsung ke `PATCH .../status` → **403** (permission matrix §5) ✅. Data uji
  dihapus dari `omega_dev` setelah verifikasi.

**Hari 25 (FE) — Halaman Surat Jalan (daftar/detail/cetak):**
- `frontend/app/pages/penjualan/surat-jalan/index.vue` — daftar **tanpa tombol Entri** (SJ
  hanya terbentuk dari faktur `PENGIRIMAN`, Hari 24), filter `deliveryStatus` (4 opsi
  Indonesia: Menunggu Kirim/Terkirim/**Belum Terkirim**/Dibawa Balik) — memilih "Belum
  Terkirim" DIPAKAI sebagai daftar "belum terkirim" DoD, bukan halaman terpisah. Toolbar
  diperkecil (`Refresh · Cetak · Batal Cetak · View Detail`, tanpa Entri/Pengecekan — pola
  sama Retur Pembelian/Penjualan, tombol Cetak/Batal Cetak murni navigasi ke detail seperti
  modul lain, aksi sungguhan ada di `<DocumentActions>`).
- `frontend/app/pages/penjualan/surat-jalan/[id]/index.vue` — `<DocumentActions>` penuh:
  `@print` navigasi ke `/cetak` (pola JL Hari 22, BUKAN panggil `POST .../print` langsung —
  registrasi cetak+`window.print()` terjadi bersamaan di halaman cetak supaya operator selalu
  lihat nota sungguhan), `@edit`/`@unlock-print(intent:EDIT)` membuka modal "Ubah Status
  Pengiriman" (4 tombol status + alasan, `withStepUp()` menangani 412 otomatis), `@void`/
  `@unlock-print(intent:VOID)` → alert "belum didukung" (VOID SJ sengaja belum dibangun, pola
  sama Retur Penjualan/Pembelian). Badge `deliveryStatus` terpisah dari
  `<DocumentStatusBadges>` (tiga sumbu status tidak dicampur, CLAUDE.md §2.16).
- `frontend/app/pages/penjualan/surat-jalan/[id]/cetak.vue` — A5 landscape 2-up, diturunkan
  dari §13.1 (kepala kiri/kanan JL) + §13.3 ("SJ turunkan dari §13.1") — kolom kiri diganti
  `FAKTUR ASAL`/`AGEN (SOPIR)`/`KENDARAAN` (tidak ada di JL), tabel `NO/BARCODE/NAMA
  PRODUK/QTY/SATUAN` **tanpa kolom rupiah sama sekali** (CLAUDE.md §1 "nota dibawa sopir
  untuk menagih, bukan surat jalan" — larangan sama seperti §13.2 Mutasi Gudang, dilarang
  panggil `useRupiah()` di berkas ini), tanda tangan "Dikirim Oleh,"/"Diterima Oleh," dari
  §13.1 (pas dengan makna aslinya di sini). Watermark VOID + pagination 14 baris/halaman
  disiapkan (pola sama nota lain) meski VOID SJ belum dibangun.
- `useSalesInvoiceLookups()` dipakai ulang penuh (customer/product/unit/agent/vehicle map
  sudah ada sejak Hari 20/24) — **tidak ada composable baru**.
- `config/navigation.ts` — item "Surat Jalan" ditambah ke grup TRANSAKSI persis urutan
  PANDUAN_UI.md §4.1 ("... Retur Penjualan · Surat Jalan · Pembelian ..."), `roles:
  ['MASTER','OPERATOR']` (SUPERVISOR tidak lihat menu ini, konsisten §5).
- **Verifikasi**: `npm run build` FE ✅ (manual dengan `NODE_OPTIONS=--max-old-space-size=4096`
  — `verify.sh` step 7/10 tetap OOM tanpa flag itu, keterbatasan pra-ada sejak Hari 16B, bukan
  regresi sesi ini) 0 error; `npm run typecheck` — 12 error pra-ada di
  `purchaseInvoiceCalc.ts`/`salesInvoiceCalc.ts`/`penjualan/faktur/index.vue` tidak disentuh,
  nol error baru; `npm run lint` FE 0 error. **Manual browser end-to-end sungguhan**
  (`npm run dev` BE+FE, login `master`/`supervisor` asli, Claude in Chrome, data diseed
  manual lewat `POST /delivery-orders`): daftar menampilkan SJ ✅ → filter "Belum Terkirim"
  → 0 baris (SJ masih `PENDING`) ✅; buka detail → `<DocumentActions>` tampil Cetak/Ubah/
  VOID ✅ → "Ubah" → modal status → pilih "Belum Terkirim" → simpan → **langsung sukses**,
  tanpa dialog approval (belum dicetak) ✅ → badge berubah jadi "Belum Terkirim" ✅ → klik
  "Cetak" → nota A5 2-up tampil (qty+satuan, nol rupiah) → klik tombol Cetak di halaman nota
  → `print_count`/`printStatus` naik ke `PRINTED` (dikonfirmasi API) ✅ → kembali ke detail
  → badge "Sudah Dicetak", `<DocumentActions>` otomatis berpindah ke **satu tombol "Batal
  Cetak"** ✅ → klik → dialog niat (Diperbaiki/Dibatalkan) → pilih "Diperbaiki" + alasan →
  Lanjutkan → modal "Ubah Status Pengiriman" terbuka dengan alasan ter-prefill → pilih
  "Terkirim" → Simpan → **`<StepUpDialog>` global muncul sungguhan** ("Menunggu Persetujuan",
  countdown) ✅ → approve via `POST /authorization-requests/:id/approve` (SUPERVISOR) →
  dialog **auto-retry lewat polling 5 detik** tanpa aksi lanjutan operator → sukses,
  `printStatus=PRINT_CANCELLED`, "Revisi 1", `deliveryStatus="Terkirim"` ✅. Data uji (delivery
  order, faktur, produk, customer, salesman, agent, vehicle, brand, unit,
  authorization_request, audit_logs terkait) dihapus dari `omega_dev` setelah verifikasi.

**Hari 26 (BE) — Payment skema + `POST /payments/preview-allocation`:**
- Migration `1785080602961-CreatePayments.ts` — `payment_batches`/`payment_batch_methods`/
  `payments`. **`payment_batches` SENGAJA TIDAK punya `customer_id`/`supplier_id`/
  `agent_id`/`vehicle_id`** — keputusan `KONTEKS_REVISI_2026-07-28.md` §2.12 (ditutup 29 Agu
  2026 dari screenshot `penerimaan-kas`/`pengeluaran-kas`): satu batch boleh melunasi faktur
  lintas banyak pelanggan/supplier sekaligus (bukti nyata sistem lama: `PJK-26070025`, 7
  baris lintas ~6 pelanggan, header `Dari:` kosong), party di-resolve **per baris** dari
  faktur yang dibayar. `payments.invoice_type`/`invoice_id` polimorfik (pola sama
  `journal_entries.source_type`/`source_id`, tanpa FK lintas tabel). Kolom kunci-cetak
  disiapkan (PAY salah satu dari 7 dokumen §2.16), belum wiring — pola sama `purchase_returns`
  Hari 16.
- `backend/src/modules/payments/` (baru) — `entities/{payment-batch,payment-batch-method,
  payment}.entity.ts`, `dto/create-payment-preview.dto.ts` (+ method dto), `payments.service.ts`
  (`previewAllocation()` — **pure read, tanpa `dataSource.transaction()`, tidak menulis
  apa pun**), `payments.controller.ts` (`POST /payments/preview-allocation`,
  `@Roles(MASTER, OPERATOR)` per CLAUDE.md §5), `payments.module.ts` (tanpa
  `TypeOrmModule.forFeature()` — hanya `@InjectDataSource()`, pola sama
  `AccountResolverModule`). Terdaftar di `app.module.ts`.
- Alur `previewAllocation()`: resolve party (Customer/Supplier aktif) → validasi tiap
  `cashAccountId` lewat `AccountResolverService.assertAccountHasFlag(..., 'is_cash_account', ...)`
  (Hari 18, tidak hardcode) → ambil faktur terbuka pihak itu urut tanggal ASC (FIFO) → hitung
  `outstanding` per faktur = `total_amount` − Σ `payments.allocated_amount` (batch belum VOID)
  − (khusus SALES) Σ `sales_returns.total_amount` ber-`settlement_type=REDUCE_INVOICE` yang
  menunjuk faktur itu (retur pembelian TIDAK punya padanan — `purchase_returns` di-scope ke
  supplier, bukan faktur tertentu, CLAUDE.md §3 "Bad stock") → tolak kalau total diminta >
  total outstanding pihak itu → alokasi FIFO greedy.
- `payments.service.spec.ts` — integration test Postgres asli (pola sama
  `purchase-returns.service.spec.ts`), 9 test: DoD 30jt+50jt/100jt→sisa 20jt ✅, overpayment
  ditolak ✅, preview nol tulis ke 3 tabel baru ✅, FIFO lintas 2 faktur ✅, akun bukan
  `is_cash_account` ditolak ✅, faktur sudah sebagian dibayar ✅, retur `REDUCE_INVOICE`
  mengurangi sisa faktur ✅, jalur PURCHASE (supplier) ✅, party tidak ditemukan ✅.
- **Verifikasi**: `npm run build` BE 0 error ✅; `npm run lint` BE 0 error ✅; migration
  `up`→`revert`→`up` di DB sementara (`fmcg_verify_tmp`) ✅; `npm run test` BE **241/241
  lulus** (31 suite, tanpa regresi) ✅; `GET /health` 200 ✅; tidak ada `@Delete()` baru ✅.
  **Manual end-to-end sungguhan** (server asli, login JWT sungguhan, data diseed manual):
  happy path 30jt kas + 50jt transfer atas faktur 100jt → `outstandingAfter: 20000000` ✅;
  error path 200jt atas faktur 100jt → **400** pesan "melebihi total tagihan..." ✅; row count
  `payment_batches`/`payment_batch_methods`/`payments` tetap 0 setelah kedua panggilan ✅;
  SUPERVISOR → **403** ✅. Data uji dihapus dari `omega_dev` setelah verifikasi.
- **PR terbuka DITUTUP hari ini** (bukan oleh tugas hari ini — oleh sesi kerja terpisah jam
  sama, lihat `KONTEKS_REVISI` §2.12 dan memory `hari26-payment-module-design`):
  ✅ 🛑 lama Hari 26/27 (setoran sopir, pembayaran sebagian, pembayaran lintas faktur), ✅
  KONTEKS_REVISI §4.2 item #8. **Keputusan kerja, belum dikonfirmasi ke klien sungguhan** —
  daftar pertanyaan klien disiapkan terpisah (lihat catatan penutup sesi ini).
- **Sengaja TIDAK dikerjakan hari ini** (di luar scope tugas): `POST /payments/confirm`,
  jurnal, VOID batch, selisih pembayaran (semua Hari 27).

**Hari 26 (FE) — Payment step 1 (pilih pihak + multi-metode + preview alokasi):**
- `frontend/app/components/PaymentAllocationForm.vue` (baru) — SATU komponen dipakai
  Penerimaan **dan** Pengeluaran Kas (§2.12 poin 4: satu template, `invoiceType` prop
  menentukan label "Pelanggan"/"Supplier" dan "Diterima Dari"/"Dibayarkan Kepada", bukan dua
  komponen ter-fork). Party dropdown (`UInputMenu`, searchable) sumber
  `useSalesInvoiceLookups().loadCustomerMap()` (SALES) atau
  `usePurchaseInvoiceLookups().loadSupplierMap()` (PURCHASE) — supplier name/displayCode
  sudah ter-mask untuk OPERATOR oleh backend, ditampilkan apa adanya (pola sama
  `pembelian/faktur/index.vue`). Baris metode (`USelect` akun kas dari
  `GET /chart-of-accounts/cash-accounts` yang sudah OPERATOR-accessible sejak Hari 5/17 +
  `UInputNumber` nominal) inline dengan tombol tambah/hapus — SENGAJA bukan
  `<DataTable>`+`<LineModal>` seperti modul dokumen lain, karena hanya 2 field per baris dan
  operator perlu melihat semua baris metode sekaligus (bukan satu per satu lewat modal).
  **`fetchPreview()` memanggil `POST /payments/preview-allocation` dan menampilkan
  `previewResult` APA ADANYA — nol perhitungan alokasi/outstanding di sisi FE** (DoD
  eksplisit). `watch([partyId, methods])` mengosongkan `previewResult` begitu input berubah,
  supaya angka basi dari kombinasi sebelumnya tidak pernah tampil seolah masih berlaku.
  Result ditampilkan lewat `<InfoStrip>` (ringkasan) + `<DataTable>` lokal (rincian per
  faktur: No. Faktur/Tanggal/Total/Sisa Sebelum/Dialokasikan/Sisa Sesudah).
- `frontend/app/pages/kas-bank/penerimaan/index.vue` + `.../pengeluaran/index.vue` (baru) —
  halaman tipis, masing-masing cuma `<PaymentAllocationForm invoice-type="SALES|PURCHASE" />`.
  **Tidak ada tombol Simpan/Konfirmasi** — itu `POST /payments/confirm`, Hari 27. **Tidak ada
  layar setoran sopir** (bentuknya belum diputuskan, sesuai instruksi tugas eksplisit).
- `frontend/app/config/navigation.ts` — grup KAS & BANK: "Penerimaan Kas" dan "Pengeluaran
  Kas" ditambah sebelum "Biaya Operasional" (urutan §4.1), `roles: ['MASTER','OPERATOR']`.
- **Verifikasi**: `npm run build` FE (`NODE_OPTIONS=--max-old-space-size=4096`) 0 error ✅;
  `npm run lint` FE 0 error ✅; `npm run typecheck` — 12 error pra-ada (sama persis daftar
  Hari 25: `purchaseInvoiceCalc.ts`/`salesInvoiceCalc.ts`/`penjualan/faktur/index.vue`), **nol
  error baru dari file hari ini** ✅. **Manual browser end-to-end sungguhan** (`npm run dev`
  BE+FE, login MASTER asli, Claude in Chrome, data diseed manual — 1 pelanggan + 2 faktur
  4jt/6jt bertanggal beda): buka `/kas-bank/penerimaan` → pilih pelanggan (searchable, hasil
  benar) → pilih "Kas Kecil" + ketik 3.000.000, tambah baris "Bank BCA" + 6.000.000 →
  "Total Dibayar : 9.000.000" (jumlah reaktif FE, bukan alokasi) → klik "Lihat Alokasi
  Pembayaran" → tabel tampil PERSIS dari backend: faktur lebih tua (4jt) lunas penuh (Sisa
  Sesudah "-"), faktur lebih baru (6jt) dapat 5jt sisa (Sisa Sesudah 1.000.000), ringkasan
  "Total Tagihan Terbuka: 10.000.000 \| Sisa Setelah Dibayar: 1.000.000" ✅ — FIFO oldest-first
  terbukti dari server, bukan diurutkan/dihitung FE. Ubah nominal jadi 50.000.000 → preview
  lama otomatis hilang (watch bekerja), klik ulang → pesan error backend tampil verbatim
  "Pembayaran (Rp 56.000.000) melebihi total tagihan yang belum lunas (Rp 10.000.000)." ✅.
  `/kas-bank/pengeluaran` dicek terpisah: label berganti "Supplier"/"Dibayarkan Kepada" dari
  `invoiceType` yang sama, komponen sama persis ✅. Data uji dihapus dari `omega_dev` setelah
  verifikasi.

**Hari 27 (BE) — `POST /payments/confirm`, Selisih Pembayaran, VOID payment batch:**
- Migration `1785080602962-AddPaymentDiffFlagToChartOfAccounts.ts` — flag
  `is_payment_diff_account` pada akun "Selisih Pembayaran" (kode LIVE `07.210.00004`, sudah
  di-seed sejak `1785080602922` sebagai `5103`, direstrukturisasi `1785080602948`). ⚠️
  **Draft pertama migration ini salah pakai kode `5103`** (disalin dari blok `down()`
  `1785080602948`, bukan `up()`-nya) — persis pola kesalahan yang sudah dicatat Hari 21.
  Ketahuan lewat `SELECT` langsung di `omega_dev` sebelum test pertama dijalankan (test
  gagal "ditemukan 0" untuk `resolveSingleActive`), diperbaiki sebelum dipakai di mana pun.
  Juga: `1785080602963-AddSettlementFieldsToPayments.ts` — `payments.settled_in_full` +
  `payments.discrepancy_amount` (baru, memperluas skema Hari 26 — `allocated_amount`
  sekarang berarti "jumlah yang melunasi Piutang/Hutang", BUKAN selalu kas yang mengalir,
  hanya beda kalau `settled_in_full=true` dan nominalnya tidak persis).
- Flag `is_payment_diff_account` juga diwire penuh ke `ChartOfAccount` entity, DTO
  create/update, dan `SINGULAR_FLAGS` registry `chart-of-accounts.service.ts` — pola sama
  `isPurchaseReturnDiffAccount`, supaya MASTER bisa lihat/ubah lewat CRUD COA juga.
- `payments.service.ts`: helper Hari 26 (`findOpenInvoices`/`getAlreadyPaidCents`/
  `getAlreadyReducedBySalesReturnsCents`) direfactor menerima `runner?: EntityManager`
  (default `this.dataSource`) — `confirm()` memakai ulang PERSIS logika yang sama di dalam
  transaction-nya sendiri lewat `lockInvoiceAndGetOutstandingCents()` (`SELECT ... FOR
  UPDATE` per faktur) supaya dua pembayaran nyaris bersamaan atas faktur yang sama tidak
  bisa membaca "sisa faktur" yang sama sebelum salah satu menulis.
- `confirm()`: `Σ methods.amount` HARUS persis sama dengan `Σ lines.amount` (kas, bukan
  clearing amount) — selisih tidak pernah menyentuh sisi kas. Per baris: `settleInFull=false`
  (default) → `amount` wajib `<= outstandingBefore`, tidak ada baris selisih; `settleInFull=
  true` → clearing = `outstandingBefore` selalu, `discrepancy = outstandingBefore - amount`
  (signed, **tanpa pembulatan/batas**) jadi baris jurnal Selisih Pembayaran kalau ≠0. Arah
  debit/kredit **terbalik antara SALES dan PURCHASE** (diverifikasi cents-exact terhadap
  keempat contoh klien) — akun piutang per baris SELALU lewat
  `ArAccountResolverService.resolve()`, akun hutang SELALU lewat
  `AccountResolverService.resolveSingleActive('is_payable_account = true', ...)`, tidak
  pernah akun default langsung.
- **Dua invarian CLAUDE.md ditambahkan di luar teks tugas literal** (dikonfirmasi ke user
  dulu, bukan diam-diam): (1) **CASH_OUTFLOW** (§5) untuk Pengeluaran Kas dari akun
  `requires_outflow_approval` di atas `settings.cash_outflow_approval_threshold` — token
  approval **per baris metode** (`ConfirmPaymentMethodDto.authorizationRequestId`), BUKAN
  satu header HTTP, karena satu batch bisa punya >1 akun kas/bank yang masing-masing
  independen butuh approval (pola `x-authorization-request-id` tunggal tidak muat array).
  (2) **VOID_DOCUMENT** (§2.13) untuk VOID oleh OPERATOR lewat header
  `x-void-authorization-request-id` — struktur PERSIS `SalesInvoicesService.voidInvoice()`
  minus gerbang UNLOCK_PRINT (Payment belum ikut kunci cetak).
- `backend/src/modules/payments/payment-batch-void.hook.ts` (baru) — `VoidHook` +
  `OnModuleInit`, self-register `registerHook('PAYMENT', this)`. Pembalikan jurnal
  sungguhan generik lewat `VoidEngineService` (baca `journal_entries` asli, balik
  debit/kredit) — hook hanya menandai `payment_batches` VOIDED dan **reset
  `payment_discrepancy_flagged`** pada faktur yang tadinya ditandai oleh baris batch ini
  (efek samping spesifik Payment yang tidak diketahui `VoidEngineService`).
- `payments.module.ts` — tambah `DocumentCounterModule`/`JournalPosterModule`/
  `ReceivablesModule`/`StepUpModule`/`VoidModule`. `payments.controller.ts` — `POST
  /payments/confirm` dan `POST /payments/:id/void`, keduanya `@Roles(MASTER, OPERATOR)`.
- `payments.service.spec.ts` — 10 test baru (total jadi 19): DoD selisih debit/kredit ✅,
  partial tanpa selisih ✅, flag di atas/tepat Rp 10rb ✅, overpayment tanpa `settleInFull`
  ditolak ✅, VOID membalik jurnal + reset flag + preview membuktikan sisa pulih ✅, VOID
  OPERATOR 412→approve→sukses ✅, CASH_OUTFLOW 412→approve→sukses ✅, `ar_account_id`
  custom terpakai (bukan default) ✅.
- **Verifikasi**: `npm run build`/`lint` BE 0 error ✅; migration `up`→`revert`→`revert`→`up`
  (mundur sampai ke Hari 26 lalu maju lagi) di DB sementara ✅; `npm run test` BE **251/251
  lulus** (31 suite, tanpa regresi) ✅. **Manual end-to-end sungguhan** (server asli, login
  JWT MASTER/OPERATOR/SUPERVISOR sungguhan): DoD #1 (33.253.125 dibayar 33.253.000) →
  jurnal 3 baris balance PERSIS seperti dihitung tangan ✅; VOID batch itu → jurnal pembalik
  balance, `payment_discrepancy_flagged` reset ke false ✅; overpayment tanpa `settleInFull`
  → 400 pesan tepat ✅; SUPERVISOR confirm → 403 ✅; OPERATOR VOID tanpa approval → 412 →
  SUPERVISOR approve → retry sukses ✅. Data uji dihapus dari `omega_dev` setelah verifikasi.
- **Sengaja TIDAK dikerjakan hari ini**: FE Payment step 2 (alokasi manual + riwayat batch +
  kwitansi A5), Laporan Kontinuitas Nomor Dokumen (Hari 28).

**Hari 27 (FE) — Payment step 2 (alokasi manual + selisih + riwayat + kwitansi A5):**
- **BE minimal ditambah lebih dulu** (disetujui user — tugas berlabel FRONTEND tapi DoD-nya
  butuh potongan backend yang belum ada): `dto/payment-query.dto.ts` +
  `dto/open-invoices-query.dto.ts` (baru); `payments.service.ts` — `getOutstandingInvoices()`
  diekstrak jadi method privat bersama dari `previewAllocation()` Hari 26, dipakai ulang oleh
  `findOpenInvoicesForParty()` (baru, **daftar penuh TIDAK dibatasi FIFO** — beda sengaja dari
  `preview-allocation` yang hanya menyentuh faktur yang kena alokasi, supaya operator bisa
  mengarahkan pembayaran ke faktur non-FIFO); `findAll()`/`findOne()` (raw SQL, derivasi
  `invoice_type`/`party_names` via subquery `string_agg`); `registerPrint()` lewat
  `PrintLockService` (`payment_batches` ditambah ke `PRINT_LOCK_TABLES`); `voidBatch()`
  diperluas dengan gerbang **UNLOCK_PRINT** (preflight sebelum transaction, consume di
  dalamnya) mendahului gerbang VOID_DOCUMENT Hari 27 BE — dua gerbang independen, urutan
  sama seperti `SalesInvoicesService.voidInvoice()`.
  `payments.controller.ts`: `GET /payments/open-invoices` (harus **mendahului** `GET /:id`
  di urutan route), `GET /payments`, `GET /payments/:id`, `POST /payments/:id/print`.
- `frontend/app/components/DataTable.vue` — prop baru `staticQuery?: Record<string,
  string|number|boolean>`, digabung ke query `loadRemote()`. Perluasan minimal (nambah prop,
  bukan fork komponen) supaya Riwayat Penerimaan (`invoiceType=SALES`) dan Pengeluaran
  (`invoiceType=PURCHASE`) bisa berbagi satu endpoint `/payments` tanpa filter itu tersinkron
  ke URL (beda dari `filters` yang memang boleh diubah operator).
- `frontend/app/components/PaymentAllocationForm.vue` — **ditulis ulang total** untuk step 2:
  `invoiceRows` dari `GET /payments/open-invoices` (bereaksi ke `partyId`), `fillFifo()`
  (tombol "Isi Otomatis (FIFO)", opsional — mengisi saran dari `preview-allocation` tapi
  **tidak memaksa**, operator bebas menimpa manual sesudahnya), tabel edit langsung (bukan
  `<DataTable>` — kolom terlalu sedikit, butuh interaksi per-baris yang rapat), checkbox
  "Tandai Lunas" per baris, `rowDiscrepancy()` (murni tampilan, dihitung ulang oleh backend
  saat submit — FE tidak pernah jadi sumber kebenaran angka), dialog "Konfirmasi Selisih
  Pembayaran" muncul HANYA kalau ada baris `settleInFull` dengan selisih ≠ 0, submit lewat
  `withStepUp()` (menangani baik CASH_OUTFLOW Hari 27 BE maupun alur normal dalam satu jalur).
- Halaman baru: `kas-bank/penerimaan/index.vue` + `.../pengeluaran/index.vue` (ditulis ulang
  — Riwayat `<DataTable>` + modal "Entri" berisi `<PaymentAllocationForm>`),
  `.../[id]/index.vue` (detail — metode, baris faktur+selisih, `<DocumentActions>`, VOID
  dua-gerbang meniru PERSIS `penjualan/faktur/[id]/index.vue`, tidak ada "Ubah" — koreksi
  pembayaran selalu VOID + entri baru), `.../[id]/cetak.vue` (kwitansi A5, layout `print`,
  `PAGE_SIZE=14`, watermark VOID, diturunkan dari `PANDUAN_UI.md` §13.1 karena §13.3
  menyatakan PAY tidak punya foto referensi). Halaman Pengeluaran adalah hasil `sed` atas
  berkas Penerimaan (`penerimaan`→`pengeluaran`, label ganti) — diverifikasi manual bukan
  cuma disalin buta.
- `payments.service.spec.ts` — 4 test baru (total jadi 23): `findOpenInvoicesForParty`
  (daftar penuh, tidak dibatasi FIFO) ✅, alokasi manual non-FIFO tersimpan sesuai editan ✅,
  `findAll`/`findOne` bentuk data benar ✅, gerbang UNLOCK_PRINT pada `voidBatch()` (VOID
  ditolak 412 kalau `PRINTED` dan belum ada approval, sukses sesudahnya) ✅.
- **Verifikasi**: `npm run build`/`lint` BE+FE 0 error ✅; `npm run typecheck` FE — nol error
  baru dari file hari ini (pra-ada tetap sama seperti Hari 25/26) ✅; migration
  `up`→`revert`→`up` ✅; `npm run test` BE **255/255 lulus** (31 suite) — 1 gagal pada
  percobaan pertama (`purchase-invoices.service.spec.ts`, baris PPN Masukan tak terduga),
  dikonfirmasi **flaky pra-ada** dari state `settings.company_is_pkp` yang dibagi banyak
  worker Jest atas `omega_dev` yang sama, bukan regresi — re-run bersih ✅.
  **Manual browser end-to-end sungguhan** (Claude in Chrome, `npm run dev` BE+FE, login
  MASTER, 1 pelanggan + 2 faktur JL/BROWSER27-0001 1,5jt/25-08 dan -0002 985rb/29-08):
  buka `/kas-bank/penerimaan` → Entri → pilih pelanggan → **kedua faktur tampil sekaligus**
  (bukan cuma yang FIFO-relevan) ✅ → isi Kas Kecil 980.000 → alokasikan **980.000 ke
  faktur yang LEBIH BARU (-0002) sambil melewati yang lebih lama (-0001)**, centang "Tandai
  Lunas" → tampil langsung "Selisih 5.000 (kurang bayar)" warna amber di baris ✅ → klik
  "Konfirmasi Pembayaran" → dialog "Konfirmasi Selisih Pembayaran" muncul dengan arah yang
  sama sebelum apa pun tersimpan ✅ → "Ya, Lanjutkan" → sukses, `PAY/RM01-26080098` terbit,
  redirect ke detail: baris faktur hanya `JL/BROWSER27-0002` (bukti alokasi manual yang
  tersimpan, BUKAN FIFO yang harusnya menyentuh -0001 lebih dulu) ✅, Dialokasikan 985.000
  (clearing amount = outstanding, sesuai definisi Hari 27), Selisih 5.000 (kurang bayar)
  tampil identik di layar detail ✅ → Cetak → halaman kwitansi A5 render benar (header
  "KWITANSI PENERIMAAN KAS", "Diterima Dari" + nama pihak, baris faktur, footer metode +
  GRAND TOTAL 980.000/tanda tangan) — **tombol Cetak sungguhan tidak diklik** karena memicu
  `window.print()` (dialog native berisiko mengunci sesi Chrome otomasi, lihat §3) → kembali
  ke Riwayat: baris muncul dengan status "Belum Dicetak" ✅ → VOID (MASTER, tanpa step-up
  karena belum pernah dicetak) → modal alasan → sukses, status berubah "Dibatalkan", tombol
  aksi berkurang jadi hanya "Cetak Arsip" (§2.16: dokumen VOID boleh dicetak ulang bertanda
  VOID) ✅ → buka Entri lagi untuk pelanggan yang sama → `JL/BROWSER27-0002` kembali tampil
  **sisa 985.000 penuh** (bukan 0 atau 985.000-980.000) — membuktikan jurnal pembalik VOID
  benar-benar memulihkan outstanding, bukan cuma mengganti status ✅.
- **Sengaja TIDAK dieksekusi lewat browser otomasi** (bukan berarti tidak diverifikasi):
  klik tombol "Cetak" sungguhan (`window.print()`) dan alur "VOID setelah dicetak" (gerbang
  UNLOCK_PRINT) — keduanya sudah dibuktikan lewat unit test (`registerPrint`, gerbang
  UNLOCK_PRINT pada `voidBatch()`), risiko browser dialog blocking tidak sepadan untuk
  path yang sudah punya coverage test.

**Hari 28 (BE saja — FE menyusul) — Laporan Kontinuitas Nomor Dokumen:**
- `GET /reports/document-continuity?type=&year=&month=` (module baru `modules/reports/`,
  tidak ada `@Roles()` — laporan terbuka semua role login, CLAUDE.md §5) menampilkan
  **setiap** nomor dari `0001` sampai `document_counters.last_number` untuk satu jenis
  dokumen + periode: status POSTED/VOIDED (dari baris dokumen sungguhan) atau **MISSING**
  ("lubang", nomor tanpa baris sama sekali), tanggal, pihak, nominal, dan
  `void_reason_code`/`void_reason_note` untuk yang VOID.
- Registry generik `document-continuity-registry.ts` (pola sama `PRINT_LOCK_TABLES`) memetakan
  **8 dari 10** `DocumentType` ke {table, numberColumn, dateColumn, statusExpression,
  partyExpression, amountExpression} — mengecualikan `SALES_ORDER` (keputusan 29 Juli, tidak
  ikut kunci cetak §2.16) dan `OPERATIONAL_EXPENSE`/KK (usul dokumen klien, bukan dari sistem
  lama). `JOURNAL_ENTRY` diikutkan dengan status literal `'POSTED'` (jurnal tidak pernah
  ber-status VOIDED sendiri — pembatalan selalu baris pembalik baru dengan nomor sendiri).
- Pencocokan nomor → nomor urut lewat `RIGHT(number, 4)`/`RIGHT(number, 8)` (parse dari nomor
  dokumen tersimpan), BUKAN merekonstruksi ulang dari `store_code` saat ini — supaya laporan
  tetap benar meski `store_code` historis pernah beda. `store_code` saat ini hanya dipakai
  untuk menampilkan nomor ilustratif pada baris MISSING.
- **Export Excel** lewat mekanisme generik `ExportInterceptor`/`ExportService` yang sudah
  dibangun Hari 5 (`?format=xlsx`) — **ini pemakai HTTP pertamanya**, dan itu membongkar bug
  laten: interceptor mengembalikan `Buffer` mentah, yang oleh `ExpressAdapter.reply()`
  (Nest) dianggap object biasa dan lewat `res.json()` — `Buffer.prototype.toJSON()` mengubahnya
  jadi `{"type":"Buffer","data":[...]}` alih-alih file biner sungguhan. **Diperbaiki**:
  `ExportInterceptor` sekarang mengembalikan `new StreamableFile(buffer)` (`src/core/export/
  export.interceptor.ts`) — dibuktikan lewat `curl` sungguhan: magic byte `PK\x03\x04` (zip
  xlsx valid), dibuka ulang dengan ExcelJS, header/judul/kolom/footer terbaca benar. Perbaikan
  ini otomatis berlaku untuk export PDF juga (mekanisme sama), meski PDF laporan sendiri masih
  dipotong dari scope (§3/§8).
- **Test**: `document-continuity.service.spec.ts` (integration, Postgres asli, fixture lewat
  INSERT langsung + `DocumentCounterService.getNextNumber()` — bukan lewat
  `SalesInvoicesService` penuh) — 6 skenario: VOID di tengah bulan tetap muncul dengan
  alasannya tanpa lubang; nomor yang barisnya hilang ditandai MISSING; **skenario DoD literal**
  "5 faktur, gagal di tengah transaksi ke-3 (rollback), lalu 2 faktur berikutnya sukses" →
  hasil tetap `0001-0002-0003-0004` berurutan tanpa lubang (membuktikan jaminan
  `DocumentCounterService` — rollback ikut transaction §2.3 — dari sisi laporan, bukan cuma
  dari sisi counter); periode tanpa dokumen sama sekali → daftar kosong tanpa error; berlaku
  generik untuk jenis dokumen lain (`WAREHOUSE_MUTATION`, nominal NULL sengaja karena GD tidak
  menyentuh uang, pihak "asal -> tujuan"); `SALES_ORDER` ditolak (400, pesan tervalidasi
  `class-validator`). Diverifikasi juga manual lewat `curl` sungguhan (server `start:dev`
  nyata): happy path, 400 untuk `type=SALES_ORDER`, 401 tanpa token, dan export xlsx untuk
  periode dengan **871 baris nyata** (data dev DB sungguhan) — di bawah 300ms.
- **Catatan slip jadwal (CLAUDE.md §7):** rencana 20 Agustus, aktual 30 Agustus — 10 hari
  meleset, konsisten dengan margin jadwal yang sudah nol sejak Hari 7-9 (lihat §0.1 & entri
  hari-hari sebelumnya, sudah berjalan mundur beruntun; bukan slip baru yang berdiri sendiri).

**Hari 28 (FE, sama hari) — Halaman Laporan Kontinuitas + Export Excel:**
- `app/pages/laporan/kontinuitas-dokumen.vue` — filter Jenis Dokumen (8 pilihan, sama persis
  `DOCUMENT_CONTINUITY_TYPES` BE, SO tidak ada di daftar) + Periode (`<input type="month">`,
  default bulan berjalan) → `GET /reports/document-continuity`. **Bukan** mode `endpoint`
  `<DataTable>` (itu untuk `PagedResponse<T>` terpaginasi) — laporan ini SELALU satu periode
  penuh sekaligus, jadi dipakai mode data lokal (`:rows`, pola sama `PriceHistoryPanel.vue`),
  fetch manual lewat `useApi()` di `watch([documentType, period], load, {immediate:true})`.
- Baris VOIDED disorot amber (`bg-warning/10`) + badge "Dibatalkan", baris MISSING (lubang)
  disorot merah (`bg-error/10`) + badge "HILANG" — DUA sumbu visual (badge status kolom +
  warna baris) sekaligus, bukan cuma satu, supaya lubang/VOID menonjol tanpa perlu membaca
  kolom Status satu-satu. Kolom **Keterangan** menampilkan `void_reason_code`/`void_reason_note`
  BE apa adanya di sel tabel biasa (DoD "tanpa perlu diklik" — bukan tooltip/modal).
- Export Excel lewat `<ExportButton :formats="['xlsx']">` — komponen generik yang SUDAH ada
  sejak Hari 26 (`useExport.ts`/`ExportButton.vue`), **pemakai pertamanya yang benar-benar
  mengunduh** (lihat perbaikan `StreamableFile` sesi BE hari ini). PDF sengaja tidak
  ditawarkan (`formats=['xlsx']` saja) meski mekanismenya kini jalan juga untuk PDF — export
  PDF laporan tetap dipotong dari scope klien (§3/§8), cuma mesinnya yang generik.
- `app/pages/laporan/index.vue` diperbarui: kartu `UPageCard` sungguhan ke halaman baru
  (Kontinuitas Nomor Dokumen BUKAN bagian daftar pasca-MVP §0), placeholder "belum tersedia"
  tetap ada untuk laporan lain yang memang masih ditunda.
- **Verifikasi manual browser sungguhan** (Claude in Chrome, `npm run dev` BE+FE, login MASTER):
  `/laporan` → kartu baru tampil → klik → filter default (Faktur Penjualan, bulan berjalan)
  memuat 901 baris data dev DB sungguhan (900 lubang dari pencemaran data test lintas-sesi,
  1 POSTED asli) dengan skeleton loading lalu terisi benar; fixture khusus 4 baris
  (POSTED/VOIDED+alasan/MISSING/POSTED) dibuat langsung di DB untuk membuktikan ketiga status
  tampil bersamaan dalam satu layar — **screenshot mengonfirmasi** badge+warna+keterangan
  inline semuanya benar; ganti Jenis Dokumen ke Mutasi Gudang → dropdown 8 pilihan (SO tidak
  ada) → periode kosong → state kosong "Belum ada dokumen terbit pada periode ini." benar;
  klik tombol Excel → network tab mengonfirmasi `GET .../document-continuity?...&format=xlsx`
  balas 200 (isi file sudah diverifikasi valid lewat `curl`+ExcelJS di sesi BE hari ini) —
  **file hasil unduhan di disk TIDAK ditemukan** di folder Download saat dicek langsung
  (kemungkinan profil Chrome sesi otomasi ini diset "tanya lokasi simpan tiap unduhan", di
  luar jangkauan tool ini untuk mengonfirmasi/menutup dialog OS) — dicatat sebagai
  keterbatasan verifikasi, bukan bukti gagal, karena permintaan jaringan dan isi file sudah
  terbukti benar dari sisi BE.
- Fixture uji (`DEMO-H28` customer/salesman, 4 faktur periode 3107) dibersihkan lagi setelah
  screenshot diambil — tidak menambah pencemaran data dev DB permanen.
- **`./scripts/verify.sh`: 8/10 lulus.** 2 gagal, KEDUANYA dibuktikan **bukan regresi Hari 28**:
  - *Test backend* gagal 11/261 di jalur paralel (jest tanpa `--runInBand`) dengan error
    `TypeORMError: Empty criteria(s)` — pola identik flake yang sudah didokumentasikan Hari 27
    ("state `settings.company_is_pkp` dibagi banyak worker Jest atas `omega_dev` yang sama").
    **Re-run bersih: 261/261 lulus** (dua kali, termasuk `--runInBand`).
  - *Build frontend* OOM ("JavaScript heap out of memory") saat tahap Nitro/rollup. **Diuji
    terisolasi**: OOM identik terjadi bahkan TANPA kedua file Hari 28 ini (halaman baru
    disingkirkan sementara, build ulang, tetap OOM) — jadi ini keterbatasan RAM lingkungan
    build terhadap ukuran aplikasi yang sudah besar (27+ hari kerja, banyak belum di-commit),
    bukan disebabkan halaman baru. Build **sukses bersih** dengan
    `NODE_OPTIONS=--max-old-space-size=6144`.
  - ⚠️ **Belum diperbaiki, dicatat sebagai risiko lintas-hari** (di luar lingkup satu halaman
    laporan): `scripts/verify.sh` akan terus gagal di step build frontend untuk SEMUA hari
    berikutnya kecuali heap Node dinaikkan (mis. `NODE_OPTIONS` di `frontend/package.json`
    script `build`, atau di `verify.sh` sendiri) atau mesin build ditambah RAM. Ini bukan
    keputusan satu hari — butuh persetujuan eksplisit sebelum diubah (§9.3).

---

**Hari 29 (BE) — Laporan Stok, Laporan Barang Titipan, Stok Opname (worksheet):**

- `backend/src/modules/reports/stock-reports.service.ts` (baru) + 3 method di
  `reports.controller.ts`/`reports.module.ts` yang sudah ada (pola persis
  `document-continuity.service.ts` Hari 28 — `DataSource.query()` raw SQL, kontrak
  `{rows, columns, meta}`, `@UseInterceptors(ExportInterceptor)`, tanpa `@Roles()`).
  **Tidak ada migration baru** — ketiganya murni membaca tabel yang sudah ada.
  - `GET /reports/stock` — per produk aktif: qty gudang `STORE`, `BAD_STOCK`, dan Total
    (jumlah keduanya). **Tidak menjumlahkan semua warehouse per type secara naif** —
    dikonfirmasi lewat `warehouses.service.ts` tidak ada constraint unik per
    `warehouse_type`, jadi query `SUM(...) FILTER (WHERE warehouse_type = 'STORE')`
    menjumlahkan SEMUA baris gudang STORE, bukan asumsi satu baris.
  - `GET /reports/titipan` — pivot Nama Barang × Pelanggan, kolom dinamis dibangun dari
    daftar pelanggan yang benar-benar muncul di `warehouse_mutation_lines` (sumbernya
    **`warehouse_mutations`, BUKAN `stock_movements`** — mutasi titipan sengaja tidak
    membuat movement, CLAUDE.md §3 "Gudang"). `getTitipanRawRows()` dipakai bersama oleh
    endpoint ini dan endpoint opname di bawah (satu sumber angka titipan, tidak disalin).
  - `GET /reports/stock-opname` — worksheet: qty sistem `STORE` + `titipanDetail` per
    pelanggan sebagai penjelas selisih fisik. **Sengaja tidak menerima/menyimpan angka
    fisik** — itu murni dihitung di FE per sesi browser. Keputusan desain (bukan
    keterlambatan): opname tersimpan/beraudit dengan penyesuaian jurnal tetap milik
    Hari 32 yang skemanya belum dibahas; memaksanya sekarang berarti menebak status
    draft/final/siapa-tanda-tangan yang belum ada jawabannya.
  - **Pecahan satuan** ("12 DUS 15 RENCENG") dihitung server-side lewat
    `computeQtyBreakdown()` (`core/stock-recorder/qty-breakdown.ts`, dipakai ulang bukan
    ditulis lagi) — **bukan** `ExportColumn.format:'qty'` (itu cuma `Intl.NumberFormat`
    desimal, tidak tahu konversi satuan per produk). Semua `Product`+`unitConversions`
    yang terlibat di-load sekali per request (bulk), bukan per-baris, supaya tidak N+1.
    Qty basis 0 di-override manual jadi `'-'` (PANDUAN_UI §14.2) karena
    `computeQtyBreakdown(0, ...)` sendiri menghasilkan `"0 <unit>"` bukan string kosong.
  - Test baru `stock-reports.service.spec.ts` (integration, Postgres asli, pola sama
    `document-continuity.service.spec.ts`): 3 skenario (Laporan Stok pecahan+nol="-",
    pivot titipan dengan sel kosong="-", opname dengan `titipanDetail` per pelanggan) —
    3/3 lulus. Suite penuh backend **264/264 lulus** setelah penambahan ini.
  - Diverifikasi manual lewat curl terhadap data dev asli (BUKAN fixture buatan) —
    customer "Pak 1" / Royco Ayam 94 gr 3 pcs (sisa dari uji manual Hari 22) muncul benar
    di pivot titipan & worksheet opname; stok minus (`-10 DUS`, "stok minus diizinkan"
    §2.8) tampil dengan tanda minus di breakdown, bukan error.

**Hari 29 (FE) — 3 halaman laporan baru:**

- `frontend/app/pages/laporan/stok.vue`, `titipan.vue`, `stok-opname.vue` (baru) +
  `laporan/index.vue` diperbarui (4 `<UPageCard>`, menggantikan 3 dari placeholder
  "Laporan lain belum tersedia" — sisanya tetap placeholder untuk laporan pasca-MVP §0).
  Pola halaman & `<DataTable>` mode lokal (`:rows`, bukan `endpoint`) dicontoh dari
  `laporan/kontinuitas-dokumen.vue` Hari 28 — laporan ini SELALU mengembalikan seluruh
  baris sekaligus, bukan dipaginasi.
  - **Laporan Titipan**: kolom `<DataTable>` **dibangun runtime** dari `res.columns` yang
    dikirim backend (jumlah pelanggan penitip dinamis) — tidak ada komponen pivot siap
    pakai di codebase ini, jadi `Column<T>[]` dihitung on-the-fly, bukan di-hardcode.
  - **Stok Opname**: field "Fisik" (`<UInput>` per baris, `useQty().parse/format`) dan
    kolom "Selisih" (dihitung reaktif client-side, warna hijau/merah lewat kelas
    `text-success`/`text-error`) **tidak pernah dikirim ke backend** — badge kuning
    "Worksheet — tidak tersimpan" di header memberitahu ini eksplisit ke pengguna.
    Kolom "Titipan (penjelas)" menampilkan total + breakdown per pelanggan
    (`"Pak 1: 3 pcs"`) di baris kedua sel, bukan di balik tooltip/popover (lebih
    langsung terlihat, tidak butuh hover).
- **Verifikasi**: `npm run typecheck` bersih untuk keempat file ini (sisa error di
  `penjualan/faktur/index.vue`/`purchaseInvoiceCalc.ts`/`salesInvoiceCalc.ts` adalah
  pre-existing, tidak disentuh hari ini — dikonfirmasi lewat `git status` file-file itu
  tidak diubah sesi ini). `npm run build` FE **sukses 0 error** dengan
  `NODE_OPTIONS=--max-old-space-size=6144` (OOM Nitro tanpa opsi ini sudah
  terdokumentasikan sejak Hari 28 di atas, bukan regresi baru). **Diuji manual penuh di
  browser** (login `master`/`master`, data dev asli): ketiga halaman render dengan benar,
  Excel export Laporan Stok & Titipan berhasil diunduh (`.xlsx` valid, dicek `file`),
  input Fisik=67 pada baris Royco (sistem 70, titipan 3) menghasilkan Selisih **"-3 pcs"
  merah** — persis skenario yang dimaksud CLAUDE.md §3 ("titipan menjelaskan selisih
  fisik").
- **DoD Hari 29**: semua item ✅, lihat §2.

**Hari 30 — Laporan Penjualan/Piutang/Hutang (un-postponed 03 Sep 2026, keputusan kerja
belum dikonfirmasi klien):**

- BE baru: `sales-reports.service.ts` (per pelanggan/salesman/detail-faktur, tanpa komisi),
  `receivables-report.service.ts`, `payables-report.service.ts`, `aging-bucket.util.ts`
  (+ `.spec.ts`) — semua di `backend/src/modules/reports/`. Endpoint baru: `GET /reports/
  {sales,receivables-aging,payables-aging}`.
- **Piutang**: total per pelanggan **wajib** direkonsiliasi ke `journal_entry_lines.customer_id`
  (BUKAN dihitung ulang dari `sales_invoices` — VOID/retur yang tidak tersentuh bisa
  membuatnya menyimpang). Filter `chart_of_accounts.is_receivable_account = true` (bukan
  `account_id` literal) supaya pelanggan ber-`ar_account_id` custom tidak hilang. FIFO murni
  di level buku besar (bukan invoice-level) — invarian: total lot tersisa == SUM(debit-credit)
  persis, tanpa langkah rekonsiliasi tambahan.
- **Hutang**: `journal_entry_lines` TIDAK punya `supplier_id` — sumber kebenaran WAJIB dari
  `purchase_invoices`+`payments`, lewat `PaymentsService.getOutstandingInvoicesForReport()`
  (method publik baru, generalisasi `findOpenInvoices()`/`getOutstandingInvoices()` yang sudah
  ada Hari 26-27 — `partyId` sekarang opsional, kosong = semua supplier). Umur dari `due_date`.
- **Bucket umur**: `settings.aging_bucket_days` (baru, migration `1785080602964`, default `'30'`,
  bisa diubah MASTER lewat halaman Pengaturan tanpa redeploy) — 4 bucket tetap, label dibentuk
  dari angka ini, bukan teks manual.
- **Bug nyata ditemukan lewat test** (bukan review kode): `DataSource.query()` mentah pada
  kolom Postgres `date` mengembalikan objek JS `Date` (zona waktu LOKAL server, `pg-types`),
  BUKAN string `"YYYY-MM-DD"` seperti diasumsikan kontrak `formatDate()` FE. Mesin WIB (UTC+7)
  membuktikannya: `SELECT CURRENT_DATE` mundur satu hari kalau dibaca lewat getter UTC.
  Diperbaiki: `toIsoDate()`/`todayIso()` di `aging-bucket.util.ts` pakai getter LOKAL
  (`getFullYear`/`getMonth`/`getDate`), simetris dengan cara `pg-types` membentuknya. **Dicatat,
  SENGAJA belum diperbaiki**: `PaymentsService.findOpenInvoices()` (Hari 26-27) punya mistyping
  yang sama pada `invoiceDate`/`dueDate` (dideklarasikan `string`, runtime-nya `Date`) —
  berpotensi memengaruhi tanggal yang ditampilkan di layar Penerimaan/Pengeluaran Kas. Perlu
  ditinjau terpisah.
- FE baru: `laporan/{penjualan,piutang,hutang}.vue` — pola §14.1/§14.2 PANDUAN_UI, header
  kolom bucket dari `columns[].label` yang dikirim BE (bukan dihitung ulang di FE). Drill-down
  "klik nominal → buka faktur" diselesaikan lewat field `detail[]` terpisah di respons (bukan
  breakdown per sel pivot) — klik baris pelanggan/supplier membuka tabel rincian faktur di
  bawahnya, tiap baris rincian bisa diklik ke faktur sumbernya.
- **Verifikasi**: 12 test baru (8 unit murni bucket math + Date-fix, 2 integration piutang, 2
  integration hutang) — suite penuh **276/276**. `./scripts/verify.sh` 9/10 (1 gagal murni OOM
  Nitro FE build, bukan error TS — lihat catatan Hari 28 di atas; diverifikasi ulang hijau
  dengan `NODE_OPTIONS=--max-old-space-size=6144`).
- Ringkasan lengkap sesi (termasuk desain FIFO ledger dan alasan tiap keputusan): `day30_summary.md`
  di root repo.

**Hari 31 — Rekap Kas Harian + pelunasan utang teknis (04 Sep 2026):**

- BE baru: `cash-daily-report.service.ts` (+ `.spec.ts`, 4 test) di `backend/src/modules/reports/`.
  Endpoint `GET /reports/cash-daily?date=&accountId=`. Saldo awal/masuk/keluar/saldo akhir
  dibaca LANGSUNG dari `journal_entry_lines` untuk akun manapun ber-`is_cash_account = true`
  (BUKAN dari `payment_batches`/`payments` — kas juga bergerak lewat Biaya Operasional, retur
  tunai, dsb., semuanya lewat `JournalPosterService` yang sama, jadi buku besar tetap sumber
  kebenaran tunggal). `entry_date` di sini TIDAK PERNAH dibaca balik ke JS (hanya kriteria SQL
  `<`/`=`), jadi tidak kena isu Date-object Hari 30 — tidak perlu `toIsoDate()`.
  Saldo awal hari N = `SUM(debit-credit)` semua baris sebelum tanggal N (full-scan per akun,
  aman untuk volume 11-12 transaksi/hari) — DoD "saldo akhir hari N = saldo awal hari N+1"
  benar otomatis oleh konstruksi, dibuktikan eksplisit lewat test 3-hari berurutan.
  `accountId` filter divalidasi lewat `AccountResolverService.assertAccountHasFlag()` (pola
  sama Payment/Retur Pembelian), bukan pengecekan ad-hoc baru.
- FE baru: `laporan/kas-harian.vue`. Filter Akun **tidak** memanggil `GET /chart-of-accounts`
  (endpoint itu MASTER/SUPERVISOR-only, CLAUDE.md §5 — OPERATOR akan 403 padahal laporan ini
  wajib bisa dilihat semua role) — opsi dropdown dibangun dari baris hasil query TANPA filter
  akun (sudah mencakup semua akun kas aktif), bukan lookup terpisah.
- **Utang teknis dilunasi** (`WarehouseMutationsService.processTitipan()`): validasi qty
  kumulatif titipan ≤ qty yang sudah dibeli pelanggan untuk produk ini (`sales_invoice_lines`,
  faktur POSTED) — TODO sejak Hari 11/13 yang eksplisit menunggu tabel ini (baru ada Hari 20,
  tidak pernah ditinjau ulang setelahnya). Retur penjualan SENGAJA tidak mengurangi angka
  "sudah dibeli" — simplifikasi disengaja (retur pelanggan selalu ke BAD_STOCK terpisah, bukan
  memotong barang yang sudah dititipkan), bukan celah. Test lama disesuaikan (perlu fixture
  faktur pembelian dulu sebelum titipan) + 1 test baru (tolak titipan melebihi qty dibeli,
  qty persis sama tetap lolos).
- **Ditemukan, TIDAK diperbaiki hari ini** (di luar scope "setengah hari"): dua kejadian
  flaky test independen selama sesi ini (`operational-expenses.service.spec.ts` gagal
  "Akun Piutang Usaha ditemukan 2", lalu `purchase-invoices.service.spec.ts` gagal jumlah
  baris jurnal PPN) — keduanya lulus 100% saat file yang sama dijalankan sendirian, dan
  lulus lagi saat suite penuh diulang. Pola: race condition antar Jest worker paralel yang
  sama-sama menulis ke `omega_dev` (bukan DB terisolasi per test) saat kebetulan menyentuh
  flag singleton (`is_receivable_account`, `company_is_pkp`) di jendela waktu yang sama —
  bukan regresi dari perubahan hari ini (dikonfirmasi: tidak ada file yang saya sentuh hari
  ini menyentuh `company_is_pkp` atau menambah akun `is_receivable_account`). Risiko lama
  yang sudah pernah tercatat sekali (baris 30 Agu, Hari 27) untuk gejala serupa — kali ini
  terjadi tanpa fixture yang ditinggalkan (dicek langsung via `psql`, 0 baris orphan). Kalau
  `npm run test` gagal random di sesi berikutnya dengan pesan "ditemukan 2" pada query
  singleton COA, ini penyebabnya — ulangi saja, jangan panik cari regresi.
- **Belum dikerjakan / butuh keputusan Anda** (bukan diputuskan sepihak):
  1. **214 file BE+FE belum pernah commit** sejak `ed8dacb` "Hari 7-9" (~3 minggu kerja).
     Risiko kehilangan total kalau mesin ini rusak. Saya tidak commit tanpa diminta eksplisit.
  2. **`./scripts/verify.sh` build FE selalu OOM** tanpa `NODE_OPTIONS=--max-old-space-size`
     (didokumentasikan sejak Hari 24, terulang tiap hari sejak — workaround manual tiap kali).
     Perbaikan satu baris (naikkan heap di `frontend/package.json` atau `verify.sh`) butuh
     persetujuan eksplisit sesuai catatan Hari 28 sebelumnya.
  3. Item lain dari katalog utang teknis (belum disentuh, lihat riwayat sesi ini kalau perlu
     detail): FE Retur Penjualan (Hari 23) belum ada sama sekali, VOID pada Mutasi Gudang (`GD`)
     belum ada jalurnya, verifikasi visual StepUpDialog/watermark VOID/cetak fisik dari Hari 22,
     Hari 22A (Pengecekan Invoice Harian) belum dikerjakan, PR #2 (lot retur `supplier_id`
     NULL) masih prioritas tinggi sejak Hari 16.

---

**Hari 32 — Rekonsiliasi Stok + query manual retur/stok minus (04 Sep 2026):**

- BE: `backend/src/modules/reports/stock-reports.service.ts` — method baru
  `getStockReconciliationReport()` + interface `StockReconciliationRow` +
  `RECONCILIATION_COLUMNS` + helper privat baru `loadWarehousesByIds()`.
  Konstruktor kelas ini sekarang menerima `StockRecorderService` (injeksi
  baru) supaya bisa memanggil `reconcile()` yang sudah ada sejak Hari 10
  tapi belum pernah punya pemanggil. Endpoint baru `GET
  /reports/stock-reconciliation` di `reports.controller.ts`;
  `StockRecorderModule` ditambahkan ke `imports` `reports.module.ts`.
  **Tidak ada migration baru** — murni membaca tabel yang sudah ada
  (`stock_movements`, `product_stock_balance`, `warehouses`,
  `warehouse_mutation_lines`, sama seperti Hari 29).
- **Keputusan desain yang perlu dicatat** (tidak diminta eksplisit di prompt,
  diputuskan sendiri karena dua konsep "selisih" tercampur di teks tugas):
  task 1 ("SUM(stock_movements) vs product_stock_balance") adalah
  pengecekan **integritas ledger** (harus selalu 0, indikator bug kalau
  tidak) — beda dari task 2 ("titipan sebagai penjelas selisih FISIK") yang
  aslinya tentang hitung fisik manusia vs sistem, yaitu **worksheet Stok
  Opname yang SUDAH dibangun Hari 29** (`GET /reports/stock-opname`, ditarik
  maju dari hari ini). Titipan tidak pernah bisa "menjelaskan" selisih
  ledger secara matematis (mutasi titipan tidak menyentuh
  `stock_movements`/`product_stock_balance`, CLAUDE.md §3 "Gudang"). Bukan
  tidak dikerjakan — kolom Titipan tetap ditambahkan di laporan baru ini
  sebagai **konteks tambahan** untuk baris gudang STORE (memakai ulang
  `getTitipanRawRows()`, tidak disalin), tapi didokumentasikan eksplisit di
  komentar kode & di sini supaya sesi berikutnya tidak salah paham bahwa
  laporan ini "menjelaskan" bug ledger lewat titipan — kalau ternyata itu
  bukan yang dimaksud, ini titik yang perlu direvisi.
- Test baru `stock-reports.service.spec.ts` (3 skenario tambahan, integration
  Postgres asli): fixture `beforeAll` diperluas dengan `productMismatchId`
  (balance 90 vs `SUM(stock_movements)`=100, sengaja tidak cocok) + 4 baris
  `stock_movements` (`movement_type='opening'`, `source_type=
  'OPENING_BALANCE'`) yang cocok untuk fixture existing Hari 29 (`
  productBreakdownId`/`productSimpleId`). `StockRecorderService`
  diinstansiasi manual di test dengan `ProductsService` di-cast `null` (aman
  — `reconcile()` tidak menyentuhnya). 3 skenario: (1) selisih 0 pada baris
  ledger sehat, (2) selisih terdeteksi pada baris sengaja tidak cocok +
  kolom Titipan kosong untuk produk yang tidak pernah dititip, (3) kolom
  Titipan hanya terisi untuk baris STORE, kosong untuk BAD_STOCK produk yang
  sama. 6/6 lulus di file ini, suite penuh backend **284/284 lulus**.
- Diverifikasi manual: server dev dinyalakan, login `master`/`master`,
  `curl GET /reports/stock-reconciliation` sungguhan terhadap `omega_dev` —
  semua baris `differenceText: "-"` (0, DB sehat, termasuk baris stok minus
  yang tetap tampil tanda minus, §2.8) ✅; `?format=xlsx` menghasilkan file
  `.xlsx` valid (dicek `file`, 200 OK) ✅.
- `docs/queries.md` (baru): 2 query SQL — stok minus (`product_stock_balance
  < 0` join `products`+`warehouses`) dan retur gabungan `RJ`+`RB`
  (`sales_returns` UNION ALL `purchase_returns`, kolom enum di-cast `::text`
  karena Postgres menolak UNION antar dua tipe enum berbeda meski nilainya
  sama). **Keduanya dijalankan sungguhan lewat `psql -d omega_dev` sebelum
  ditulis ke file** — bukan dikarang dari ingatan skema. File ini
  didokumentasikan sebagai satu-satunya sumber "manual" untuk laporan yang
  dipotong — revisi kalau kebutuhan berubah, jangan buat versi baru di
  tempat lain.
- FE: `frontend/app/pages/laporan/rekonsiliasi-stok.vue` (baru, pola sama
  `stok-opname.vue` Hari 29 untuk slot Titipan + `stok.vue` untuk
  `<ExportButton>`) + kartu baru di `laporan/index.vue`. Baris berselisih
  ditandai lewat `rowClass` DataTable (`bg-error/10`) + teks selisih merah
  tebal, plus badge ringkasan "N baris berselisih" / "Tidak ada selisih" di
  header — supaya status DB langsung kelihatan tanpa scroll ke bawah tabel.
- **Verifikasi**: `npm run build` BE 0 error; `npm run lint` BE bersih (0
  error setelah `--fix`, hanya reformat array `RECONCILIATION_COLUMNS`);
  `npm run test` BE **284/284 lulus**; `npm run typecheck` FE (`nuxt
  typecheck`) — error yang muncul (`penjualan/faktur/index.vue`,
  `purchaseInvoiceCalc.ts`, `salesInvoiceCalc.ts`) adalah **pre-existing**
  dari Hari 29 (dikonfirmasi lagi: 2 file baru/diubah hari ini,
  `rekonsiliasi-stok.vue` dan `laporan/index.vue`, TIDAK muncul di daftar
  error); `npm run build` FE **sukses 0 error** dengan
  `NODE_OPTIONS=--max-old-space-size=6144` (OOM `verify.sh` tanpa opsi ini
  masih belum diperbaiki, lihat §4 Hari 31 poin 2 — tetap dijalankan
  terpisah seperti hari-hari sebelumnya, bukan diklaim gagal). `./scripts/
  verify.sh` **tidak dijalankan langsung** (pola sama Hari 29/30/31) —
  build+lint+test BE dan build+lint FE dijalankan terpisah, semuanya hijau.
- **DoD Hari 32**: semua item ✅, lihat §2.

R0 — Rapikan Baseline (putaran revisi hasil testing klien, `docs/PROMPTS_HARIAN_REVISI.md`):
- `scripts/verify.sh` langkah build FE: `NODE_OPTIONS=--max-old-space-size=4096`
  ditambahkan pada baris itu saja (bukan diubah strukturnya) — OOM yang tercatat
  berulang sejak Hari 20/21/24/31/32 (§4 baris-baris di atas) sekarang tertangani
  di dalam skrip sendiri, tidak perlu lagi dijalankan manual terpisah.
- `docs/KONFIRMASI_KLIEN_REVISI.md` (baru) — 12 poin K1-K7+A1-A5 dari
  `docs/RENCANA_REVISI_TESTING_KLIEN.md`, ditulis ulang bahasa awam untuk
  dibacakan ke klien, K3 (revisi faktur >2 hari = VOID+faktur baru) dan A5
  (arti "Isi" pada nama produk) ditandai prioritas.
- Tidak ada kode fitur diubah di paket ini (sesuai batasan §0 paket).

R1 — Fondasi UI Bersama:
- BE: `src/common/normalize-text.ts` (`toUpperTrim()`) — satu helper dipanggil
  eksplisit dari `create()`/`update()` di brands, units, salesmen, agents,
  vehicles, warehouses, customers, suppliers, products (bukan `@BeforeInsert`
  entity, sesuai instruksi paket — supaya tidak tersembunyi dari test/DTO).
  Field yang dinormalisasi: `name` + 4 field alamat customer/supplier +
  `products.display_name`. Email/kode/NPWP/telepon/keterangan TIDAK ikut.
  Migration `1785080602965-BackfillUppercaseNameFields.ts` — backfill data
  lama, `down()` didokumentasikan eksplisit sebagai no-op (huruf asli tidak
  bisa dipulihkan).
- FE: `<MoneyInput>`/`<QtyInput>` (baru, `app/components/`) menggantikan
  seluruh 32 pemakaian `<UInputNumber>` di 12 file (`grep -r "UInputNumber"
  frontend/app` → 0 hasil) — format ribuan id-ID langsung saat mengetik lewat
  `useRupiah()`/`useQty()`, caret dijaga, paste "Rp 1.350.000" dan "1350000"
  sama-sama jadi 1350000. `CrudFormPage.vue` field type `currency`/`number`
  ikut pindah.
- FE: auto-capitalize saat blur + `text-transform: uppercase` saat mengetik,
  ditandai `uppercase: true` di 9 skema master (`useSimpleMasterSchema`,
  `useCustomerSchema`, `useSupplierSchema`, `useProductSchema`,
  `useWarehouseSchema`, dst.) — pasangan langsung normalisasi BE di atas.
- FE: field Kode di form master — default read-only "(otomatis saat
  disimpan)" + sakelar "Isi kode manual"; saat mati, `code` tidak dikirim
  sama sekali (`transformOut` lama dipakai apa adanya). Kode produk tetap
  terkunci di mode edit kalau `isCodeLocked` (CLAUDE.md §3).
- FE: sidebar bisa dilipat per grup, default semua terbuka, status
  tersimpan di localStorage per role — **diimplementasikan di
  `app/layouts/default.vue`** (transform `NavSection[]` dari
  `config/navigation.ts` jadi `UNavigationMenu` `children` bersarang di
  level layout), **bukan** dengan mengubah `navigation.ts` itu sendiri
  (yang tetap datar `title/items`, sesuai desain aslinya) — catat ini kalau
  mencari implementasinya nanti, sempat terlihat seperti belum dikerjakan
  sampai file layout dibaca langsung. Penyaringan `roles` tetap jalan di
  level anak, Supervisor tetap hanya melihat 3 item nav.
- **Verifikasi 09 Sep**: `./scripts/verify.sh` 9/10 (test backend merah
  karena infra, lihat §3 baris 09 Sep — bukan regresi R0/R1, dikonfirmasi
  lewat isolasi per file). Build BE+FE, lint BE+FE, migration up→down→up,
  `GET /health`, cek `@Delete()`, cek `.env` — semuanya lulus.

R2 — Penamaan Produk:
- BE: `buildDisplayName()` (`products.service.ts`) urutan argumen diubah jadi
  `brandName, kemasan, keterangan, ukuranUom` (dipakai `create()` dan
  `update()`) — hasil: Merek·Kemasan·Keterangan·UkuranUom, bukan lagi
  Merek·Keterangan·Kemasan·UkuranUom. `products.code` tidak disentuh.
- Migration `1785080602965-BackfillUppercaseNameFields.ts` (punya R1) —
  bagian `products` diganti dari `UPPER(TRIM(display_name))` jadi
  digabung ulang dari `brands.name` + `kemasan`/`keterangan`/`ukuran_uom`
  dengan urutan baru (`CONCAT_WS` + `NULLIF(TRIM(x),'')` supaya bagian
  kosong dilewati, sama seperti filter di `buildDisplayName()`) — produk
  lama ikut terurut ulang dalam satu migration yang sama, bukan dua kali
  menyentuh kolom ini.
- FE: `useProductSchema.ts` — `buildDisplayName()` disamakan urutannya,
  field form ditukar jadi Kemasan sebelum Keterangan, `compute()`
  pratinjau live dan hint teks ikut diperbarui.
- **Verifikasi 09 Sep**: `npx jest products.service.spec.ts` 5/5 (kasus
  baru: tanpa keterangan → tanpa spasi ganda), `npm run build`/`lint` BE
  & FE hijau, migration up→down→up di `omega_dev`. **Manual di browser**
  (Master, `/master-data/products/create`): urutan field & pratinjau live
  cocok, produk tersimpan `LARUTAN CAP KAKI TIGA BOTOL BESAR 500 LITER`.
  `./scripts/verify.sh` 9/10 — satu-satunya merah adalah `npm run test`
  BE, root cause **baru** (`product_code_seq` > 9999, bukan race
  condition `document_counters` yang sudah dicatat di R0/R1), lihat §3
  baris 09 Sep "R2" untuk detail — dikonfirmasi bukan regresi R2.
- **CLAUDE.md §3 belum diperbarui** — sengaja ditunda ke R12 (rencana
  sudah menjadwalkan "penamaan produk" sebagai bagian pembaruan dokumen
  R12, bukan per-paket).

R9 — Kas & Bank multi-baris + Pindah Buku Kas (20 Sep 2026, tugas FRONTEND
menyusul backend R9/KB1 yang sudah ada sejak sebelumnya tapi belum
tercatat di sini — lihat catatan "belum pernah di-commit sejak `ed8dacb`"
R0):
- **KB1 — `PaymentAllocationForm.vue` ditulis ulang total**, dari "satu
  pihak → daftar fakturnya" (Hari 27) jadi GRID BARIS: pihak + faktur +
  nominal + tandai lunas PER BARIS, boleh lintas pihak dalam satu entri
  (`<LineModal>` sebagai picker dua-tahap: pilih faktur dari
  `GET /payments/open-invoices` mode data lokal `<DataTable>` — BUKAN
  `<LookupModal>`/mode remote, karena endpoint itu membalas `{invoices:[]}`
  polos, bukan amplop `{data,meta}` — lalu isi nominal/lunas). Header
  bertambah **Tanggal** (sebelumnya `todayIso()` hardcoded) dan **Catatan**
  (field `notes` di `ConfirmPaymentDto` sudah ada, belum ada isiannya di
  FE). "Isi Otomatis (FIFO)" Hari 27 **DIHAPUS** — dirancang untuk satu
  pihak per panggilan, tidak diminta dipertahankan di prompt R9, endpoint
  BE tidak disentuh. Backend (`PaymentsService`) TIDAK diubah — sudah
  mendukung `lines[]` lintas pihak sejak Hari 27, dan
  `GET /payments/open-invoices` sudah punya `partyId` opsional dari
  pekerjaan R9 BE sebelumnya. `kas-bank/{penerimaan,pengeluaran}/index.vue`
  — modal Entri dilebarkan `sm:max-w-2xl` → `sm:max-w-4xl` untuk grid.
- **Pindah Buku Kas** (halaman baru `kas-bank/pindah-buku/index.vue` +
  `[id]/cetak.vue`) — satu form datar (dari kas → ke kas → nominal →
  keterangan) lewat `<LineModal>` langsung (pola sama Biaya Operasional,
  bukan `<DocumentModal>`+`<LineModal>`), daftar + detail slideover + VOID
  (satu gerbang VOID_DOCUMENT, TIDAK ada UNLOCK_PRINT — `cash_transfers`
  tidak ikut kunci cetak §2.16). Backend (`CashTransfersModule`, dokumen
  `PB`) sudah lengkap dari pekerjaan sebelumnya (create/void/review/findAll)
  — **dua celah ditambal hari ini**: (1) `JournalSourceType` belum memuat
  `'CASH_TRANSFER'` (`post-journal.dto.ts`), bikin `npm run build` BE gagal
  — ditambahkan; (2) `CashTransferQueryDto`/`CashTransfersService.findAll()`
  belum punya filter `date`/`reviewStatus` (dibutuhkan tab Pengecekan di
  bawah) — ditambahkan, pola SAMA `SalesInvoiceQueryDto`. Cetak A5: TIDAK
  ada registrasi `POST /:id/print` (tidak ada `print_status` di entity),
  satu halaman saja (bukan `PAGE_SIZE=14` — dokumen ini selalu satu
  dari/satu ke/satu nominal), diturunkan dari §13.1/§13.3 PANDUAN_UI.md
  sama seperti kwitansi PAY (tidak ada foto referensi untuk PB).
  `navigation.ts` — entri baru grup KAS & BANK.
- **Tab "Pindah Buku Kas" di `pengecekan-invoice/index.vue`** — `DocType`
  diperluas `'SALES'|'PURCHASE'|'CASH_TRANSFER'`, tab ketiga pakai endpoint
  `GET /cash-transfers` + `filters` yang SUDAH ADA (key `date`/`reviewStatus`
  sama persis dengan dua tab lain, tidak ada filter baru). `openDetail()`/
  computed `detail*` diperluas method lintas-3-tipe (bukan fork jadi
  halaman/komponen baru — CLAUDE.md §6). Cabang khusus: `cash_transfers`
  tidak punya `printStatus` → `<DocumentStatusBadges>` diganti badge
  posting+review polos untuk tab ini; tidak ada baris produk → blok
  keterangan sederhana menggantikan `<DataTable>` baris. `submitReview()`
  dan `REVIEW_ENDPOINT` map generik ketiga tipe, PATCH endpoint tetap
  `/{sales-invoices|purchase-invoices|cash-transfers}/:id/review` yang
  sudah ada masing-masing (tidak ada endpoint `/supervisor/*` baru,
  KONTEKS_REVISI §2.2).
- **Verifikasi 20 Sep**: `npm run build` BE — awalnya **gagal** (`CASH_TRANSFER`
  bukan `JournalSourceType`), hijau setelah ditambal di atas. `npm run lint`
  BE hijau (eslint --fix, hanya rapikan format). `npm run build` FE hijau
  (exit 0, `NODE_OPTIONS=--max-old-space-size=4096`). `npx eslint` atas
  seluruh file yang disentuh hari ini hijau. `npm run typecheck` FE — ada
  error, **semuanya pra-ada** di file yang TIDAK disentuh hari ini
  (`penjualan/faktur/index.vue`, `utils/purchaseInvoiceCalc.ts`,
  `utils/salesInvoiceCalc.ts`) — nol error baru dari file hari ini, pola
  sama catatan Hari 27. **Belum dijalankan**: migration up→down→up
  (tidak ada migration baru hari ini — hanya DTO/service/FE), test
  integrasi backend (`cash-transfers.service.spec.ts` belum ada sama
  sekali, di luar scope tugas FRONTEND hari ini).

- **Manual browser end-to-end 20 Sep** (Claude in Chrome, `npm run dev`
  BE+FE, DB `omega_dev`, login `operator`/`operator` dan
  `supervisor`/`supervisor`) — **seluruh 6 poin DoD paket R9 lulus**:
  1. Penerimaan Kas: 3 baris dari 2 pelanggan (`Pelanggan Uji Mutasi
     Gudang` ×2 + `Pelanggan Lain Uji Mutasi Gudang` ×1, @10.000) dalam
     satu Entri → tersimpan SATU batch `PAY/RM01-26090437`, riwayat
     menampilkan `partyNames` gabungan ("Pelanggan Lain Uji Mutasi
     Gudang, Pelanggan Uji Mutasi Gudang") ✅.
  2. Total metode (5.000) ≠ total baris (10.000) → tombol Konfirmasi
     Pembayaran `disabled:true` (dicek lewat DOM, bukan cuma visual) +
     pesan "Total metode (5.000) harus persis sama dengan total
     dialokasikan (10.000)." ✅.
  3. Baris PAK 1 (JL/RM01-26080360, sisa 600.000) dibayar 590.000 +
     Tandai Lunas → preview "Selisih 10.000 (kurang bayar)" di baris DAN
     di dialog Konfirmasi Selisih Pembayaran (dengan label pihak) →
     `Ya, Lanjutkan` → `PAY/RM01-26090438` tersimpan, Dialokasikan
     600.000, Selisih 10.000 (kurang bayar) di layar detail ✅.
  4. Pengeluaran Kas: 2 baris dari 2 supplier berbeda (JOKO + SUPPLIER
     MANUAL TEST HARI 14, @100.000, Kas Toko — `requires_outflow_
     approval=false` jadi tanpa step-up) → `PAY/RM01-26090439`, label
     "Pihak"/"Dibayarkan Kepada"/"boleh lintas **supplier**" (bukan
     "pelanggan") terbukti dinamis sesuai `invoiceType` ✅.
  5. Pindah Buku Kas: Kas Toko → Bank BCA, 500.000 → `PB/RM01-26090001`
     tersimpan (format `PB/RM01-YYMMXXXX` persis), Cetak → A5 dua salinan
     render benar (BUKTI PINDAH BUKU KAS, Dari/Ke/Keterangan, JUMLAH
     digarisbawahi ganda, tanda tangan Diserahkan/Diterima, CETAK audit
     line) ✅.
  6. Tab "Pindah Buku Kas" muncul di Pengecekan Invoice Harian (login
     Supervisor) di samping Faktur Penjualan/Pembelian, endpoint+filter
     `date`/`reviewStatus` yang sama ✅; Detail slideover → Setujui →
     toast "Pindah Buku Kas disetujui", `review_status` di DB berubah
     `DISETUJUI` dengan `reviewed_by` = user Supervisor ✅.

  **Bug nyata ditemukan lewat verifikasi ini (bukan review kode) dan
  ditambal di sesi yang sama**: `CashTransfersService` (`findAll()`/
  `findOne()`, raw SQL `SELECT ct.transfer_date`) mengembalikan tanggal
  MUNDUR SATU HARI di layar (Detail, Riwayat, tab Pengecekan, cetak) —
  pola bug YANG SAMA dengan yang sudah dicatat "sengaja belum ditambal"
  untuk `PaymentsService.findOpenInvoices()` di §3 Hari 30 (`pg` mem-parse
  kolom `date` jadi objek JS `Date` di zona LOKAL server, lalu serialisasi
  JSON NestJS memanggil `.toISOString()` yang mundur satu hari di WIB).
  DB sendiri benar (`transfer_date = '2026-09-20'`, dibuktikan `psql`
  langsung) — murni bug di jalur serialisasi API. **Ditambal** dengan
  `ct.transfer_date::text AS transfer_date` di `SELECT_ROW_SQL` (Postgres
  membentuk string "YYYY-MM-DD" sendiri sebelum objek Date JS pernah ada),
  dikonfirmasi lewat `curl` langsung ke API sebelum/sesudah, lalu ulang di
  browser. **`PaymentsService.findOpenInvoices()` MASIH belum ditambal**
  (di luar scope tugas hari ini) — kalau ada sesi yang menyentuh modul
  Payment lagi, pola tambalan yang sama (`::text` di SQL, atau `toIsoDate()`
  dari `reports/aging-bucket.util.ts`) bisa dipakai ulang.

  **Paket R9 (KB1 + Pindah Buku Kas + tab Pengecekan) selesai diverifikasi
  end-to-end.** Belum dikerjakan: migration up→down→up (tidak relevan,
  tidak ada migration baru), test integrasi otomatis untuk cash-transfers.

R11 — Laporan (20 Sep 2026, L1 + L2, keputusan kerja BELUM dikonfirmasi
klien): sebelum menulis kode, konflik L1 vs CLAUDE.md §5 ("Laporan ✅ ✅ ✅
kecuali COA", ditulis eksplisit sebagai keputusan sengaja di komentar kepala
`ReportsController`) diangkat ke user lewat `AskUserQuestion` — dijawab
**"tolak dulu, tanya klien"**, tapi user lalu mengirim prompt tugas eksplisit
untuk tetap mengimplementasikan L1 sekarang (pola sama Payment §2.12: jalan
sekarang sebagai keputusan kerja, wajib dibawa ke klien, bukan ditolak).
- **L1 (Stok Opname MASTER+SUPERVISOR saja)**: `@Roles(Role.MASTER,
  Role.SUPERVISOR)` method-level di `GET /reports/stock-opname`
  (`reports.controller.ts`) — MENIMPA absennya `@Roles` class-level (pola
  sama `ChartOfAccountsController`, `RolesGuard` pakai `getAllAndOverride`).
  Komentar kepala controller diperbarui menyebut pengecualian ini eksplisit
  supaya tidak dikira keliru dan dicabut sesi berikutnya. FE:
  `laporan/stok-opname.vue` → `definePageMeta({ roles: ['MASTER',
  'SUPERVISOR'] })`; `laporan/index.vue` → kartu Stok Opname disembunyikan
  `v-if="canViewStockOpname"` (`activeRole !== 'OPERATOR'`, pola sama
  penyaringan `roles` di `layouts/default.vue`) — kartu tidak boleh tampil
  lalu menolak saat diklik.
- **L2 (Laporan Penjualan per salesman, rincian faktur)**: `groupBy=SALESMAN`
  TETAP rekap (tidak diubah) — ditambahkan filter opsional `salesmanId` di
  `SalesReportQueryDto` (`@IsUUID`), dipakai bersama `groupBy=INVOICE` saja
  (`sales-reports.service.ts getDetailReport()`, parameterized `WHERE
  si.salesman_id = $n`). Kolom `groupName` (dulu digabung "Pelanggan /
  Salesman" jadi satu string) dipecah jadi dua kolom: `groupName` (Pelanggan)
  + `salesmanName` (Salesman) baru, di `DETAIL_COLUMNS` (export) dan
  `columns` computed FE. Tidak menambah mode `groupBy` keempat, sesuai
  batasan tugas. FE `laporan/penjualan.vue`: dropdown Salesman (`USelect`
  dari `GET /salesmen`, endpoint tanpa `@Roles` — aman dipanggil semua role)
  di panel parameter, **disabled** (bukan disembunyikan) saat `groupBy !==
  'INVOICE'`, pola §14.1 PANDUAN_UI "filter pasangannya disabled".
- **CLAUDE.md §5** diperbarui: baris Laporan jadi "✅ (kecuali COA **dan
  Stok Opname**†)" + catatan kaki menjelaskan pengecualian dan status
  belum-dikonfirmasi-klien.
- **Verifikasi**: `npm run build` BE ✅, `npm run lint` BE ✅ (0 warning),
  `npm run build` FE (`NODE_OPTIONS=--max-old-space-size=4096`) ✅, `npm run
  lint` FE ✅. `npm run typecheck` FE (`nuxt typecheck`) **gagal (exit 2)**
  tapi errornya **BUKAN regresi R11** — 8 error di `penjualan/faktur/
  index.vue`, `purchaseInvoiceCalc.ts`, `salesInvoiceCalc.ts` (semua
  `number | undefined` tidak assignable, sisa pekerjaan FE R5/R7 yang belum
  disentuh, dicatat lengkap di baris R7 09/11 Sep di atas: "FE belum
  disentuh, menunggu paket FE terpisah"), **nol** error di file yang
  disentuh paket ini (`laporan/*.vue`, `reports.controller.ts`,
  `sales-reports.service.ts`, `sales-report-query.dto.ts`) — dicek eksplisit
  lewat isi pesan error, bukan diasumsikan. Tidak ada spec BE yang menyentuh
  `ReportsController`/
  `SalesReportsService` sebelumnya (tidak ada file `sales-reports.service.
  spec.ts`) — tidak ada tes lama yang perlu ditulis ulang, dan tidak ada tes
  baru ditambahkan sesi ini (di luar arahan tugas eksplisit). `npm run test`
  penuh **tidak dijalankan ulang** — pola race-condition DB-dev-bersama yang
  sudah dicatat berulang (R0/R1, R2, R7) membuatnya tidak informatif tanpa
  isolasi per-suite; endpoint yang disentuh (`/reports/*`, `/salesmen`)
  tidak overlap dengan akar masalah yang sudah terdokumentasi. Tidak ada
  migration baru → tidak ada siklus up/down. Manual browser E2E **belum
  dilakukan** sesi ini — DoD "403 OPERATOR / 200 SUPERVISOR+MASTER" dan
  "kartu tersembunyi" baru diverifikasi lewat baca kode (guard global
  `RolesGuard` + middleware `01.roles.global.ts` sudah dipakai identik di
  banyak halaman lain), bukan uji langsung. Tidak ada commit dibuat.

---

## 5. UAT Mingguan

Diikuti **Master dan operator**. Operator wajib ikut sejak minggu pertama — dialah yang menemukan hambatan input.
**Supervisor ikut mulai minggu 3**, saat halaman pengecekan sudah ada untuk diuji.

| Minggu | Tgl | Yang diuji | Temuan | Sudah diperbaiki |
|---|---|---|---|---|
| 1 | ~2 Agu | Login, master data v2 (nama produk tersusun, merek/UoM/salesman), RBAC | | |
| 2 | ~9 Agu | Engine, jurnal manual, mutasi gudang, faktur pembelian + bonus | | |
| 3 | ~16 Agu | Penjualan, panel harga, kunci cetak, pengecekan supervisor, tutup bulan | | |
| 4 | ~23 Agu | Pengiriman, pembayaran, selisih pembayaran, kontinuitas nomor | | |
| 5 | ~29 Agu | Laporan, deploy di mesin toko, end-to-end | | |

**Aturan:** temuan bug → diperbaiki dalam sisa hari. Permintaan fitur baru → **tukar scope**,
bukan tambahan. Daftar potong sudah habis, jadi tidak ada lagi yang bisa dikorbankan diam-diam.

---

## 6. Daftar Potong Darurat — **HABIS**

| | Item | Hemat | Status |
|---|---|---|---|
| 1 | Export PDF laporan (Excel saja dulu) | 0,50 | ✅ **diambil** 28 Jul |
| 2 | Laporan retur & stok minus (query manual dulu) | 0,50 | ✅ **diambil** 28 Jul |
| 3 | Rekap setoran agen (manual bulan pertama) | 0,75 | ✅ **diambil** 28 Jul — ⚠️ butuh kontrol pengganti di kertas |
| 4 | Cash opname | 0,50 | ✅ **diambil** 28 Jul |
| 5 | ~~Modul Sales Order~~ | — | ❌ **tidak boleh** — klien justru ingin memindahkannya dari kertas ke program |
| 6 | ~~Bad stock~~ | — | ❌ **tidak bisa lagi** — retur pembelian sepenuhnya bergantung padanya |

**Tidak boleh dipotong — mesin akuntansi:** Journal Poster · Stock Recorder + FIFO ·
VOID + reversing · integration test **Hari 11** · alur Saldo Awal · validator **backdate**
(pemeriksaan periode menyusul pasca-MVP).

**Tidak boleh dipotong — menyangkut kebenaran data, bukan kecepatan:** panel riwayat harga ·
sisa stok saat mengetik · modal tambah pelanggan · batas jual di bawah harga pokok ·
kunci cetak + jejak otorisasinya.

**Boleh diturunkan ke "cukup baik"** (disetujui klien 28 Juli): navigasi keyboard penuh
tanpa mouse · Enter menambah baris · fokus otomatis. Tetap dibangun, tidak dipoles.

> **Tidak ada lagi yang bisa dipotong.** Kalau drift muncul, hanya ada dua tuas: tukar scope
> dengan klien, atau geser cut-over. Keduanya keputusan klien, bukan keputusan developer —
> bawa ke mereka hari itu juga, jangan diserap diam-diam.

---

## 7. Backlog Pasca-MVP (setelah 30 Agustus)

Disepakati klien 29 Juli 2026. **Ini ditunda, bukan dipotong** — prompt lengkapnya masih ada
di `PROMPTS_HARIAN.md` bertanda ⏸ dan tinggal dijalankan.

| Prioritas | Item | Bekas hari | Hari | Tenggat sebenarnya |
|---|---|---|---|---|
| P1 | Tutup bulan + closing + buka kembali | 23A | 1,00 | **sebelum 1 Okt** — tutup bulan September |
| P2 | Laporan penjualan, umur piutang, umur hutang | 30 | 1,00 | bulan pertama operasi |
| ~~P3~~ | ~~Laporan biaya operasional~~ **un-postponed 05 Sep 2026** → Hari 32A | bagian 31 | 0,40 | bulan pertama operasi (sudah berjalan — cut-over lewat 1 Sep) |
| P4 | Layar Jurnal Manual (endpoint sudah ada) | bagian 12 | 0,25 | tidak mendesak |
| P5 | Sisa daftar potong 28 Juli: export PDF · laporan retur & stok minus · cash opname · rekap setoran agen | — | 2,25 | pasca-MVP |

**Yang menambal sementara di bulan pertama:**

| Yang belum ada | Penggantinya |
|---|---|
| Laporan piutang & hutang | Layar pembayaran (Hari 26) menampilkan faktur outstanding per pihak — **pastikan sisa tagihan per faktur terbaca jelas di sana** |
| Tutup bulan | Validator backdate 2 hari sudah menghadang koreksi ke belakang |
| ~~Laporan biaya operasional~~ dikerjakan Hari 32A | Rekap kas harian per akun (Hari 31) tetap jadi penambal sampai Hari 32A selesai |
| Layar Jurnal Manual | Endpoint-nya ada; Master belum tentu butuh di bulan pertama |

⚠️ **Risiko yang harus diucapkan ke klien, bukan diasumsikan:** tutup bulan September jatuh
sekitar 1 Oktober, dan fitur itu belum ada pada 30 Agustus. Sepakati sekarang kapan P1
dikerjakan — kalau tidak, tenggatnya baru terasa saat sudah lewat.
