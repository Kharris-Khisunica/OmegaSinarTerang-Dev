# Skenario Test — Hari 11 (FE susulan: Dashboard jujur + Nav Supervisor 3-item)

Dokumen ini untuk **kamu jalankan manual di browser**, bukan otomatis. Cakupannya cuma
perubahan FE hari ini (`PROGRESS.md` §2 Hari 11 bagian FE). Centang `[ ]` → `[x]` sambil
jalan, catat di kolom "Hasil" kalau ada yang meleset dari ekspektasi.

## Prasyarat

- [ ] Backend jalan: `cd backend && npm run start:dev` (cek `GET http://localhost:3000/health` → 200)
- [ ] Frontend jalan: `cd frontend && pnpm dev` (buka `http://localhost:3001`)
- [ ] 3 akun seed tersedia: `master/master`, `supervisor/supervisor`, `operator/operator`
      (kalau belum ada / 401, jalankan `npm run seed` di backend)

---

## 1. Role MASTER

| # | Langkah | Ekspektasi | Hasil |
|---|---|---|---|
| 1.1 | Login `master` / `master` | Masuk ke `/`, tidak error |
| 1.2 | Lihat sidebar | **Semua** item tampil: Dashboard, Produk, Merek, Satuan, Customer, Supplier, Salesman, Gudang, Bagan Akun, Jurnal, Pengecekan Invoice, Antrian Persetujuan, Laporan, Pengaturan |
| 1.3 | Lihat halaman Dashboard | 4 kartu: **Penjualan Hari Ini** = `—`, **Piutang Jatuh Tempo** = `—`, **Stok Minus** = `—`, **Persetujuan Menunggu** = angka (bukan `—`, bukan teks error) |
| 1.4 | Buka DevTools → tab Network, refresh `/` | Ada 1 request `GET /authorization-requests` berstatus **200** (bukan 403) |
| 1.5 | Klik kartu "Persetujuan Menunggu" | Pindah ke `/persetujuan` |
| 1.6 | Bandingkan angka di kartu dashboard dengan jumlah badge tab **"Menunggu"** di `/persetujuan` | **Harus sama persis** |
| 1.7 | Klik "Bagan Akun" di sidebar | Halaman COA terbuka normal (tidak 403) |
| 1.8 | Klik "Pengecekan Invoice" di sidebar | Halaman placeholder terbuka, tulisan "Belum tersedia" + penjelasan Hari 22A — **tidak ada data/angka** |
| 1.9 | Klik "Laporan" di sidebar | Placeholder "Belum tersedia" + penjelasan ditunda pasca-MVP |
| 1.10 | Klik "Pengaturan" di sidebar | Halaman Settings terbuka normal |

---

## 2. Role OPERATOR

| # | Langkah | Ekspektasi | Hasil |
|---|---|---|---|
| 2.1 | Logout, login `operator` / `operator` | Masuk ke `/`, tidak error |
| 2.2 | Lihat sidebar | **Tidak ada**: Bagan Akun, Pengecekan Invoice, Antrian Persetujuan, Pengaturan. **Ada**: Dashboard, Produk, Merek, Satuan, Customer, Supplier, Salesman, Gudang, Jurnal, Laporan |
| 2.3 | Lihat halaman Dashboard | 4 kartu tampil. 3 kartu pertama `—`. **"Persetujuan Menunggu" = `— (khusus Master/Supervisor)`** |
| 2.4 | Buka DevTools → tab Network, refresh `/` | **Tidak ada** request ke `/authorization-requests` sama sekali (bukan 403 — memang tidak pernah dipanggil) |
| 2.5 | Buka DevTools → tab Console | Tidak ada error merah terkait `authorization-requests` atau 403 |
| 2.6 | Ketik manual di address bar: `http://localhost:3001/pengaturan` | Ditolak — lempar balik ke `/` (halaman ini `roles: ['MASTER']`) |
| 2.7 | Ketik manual: `http://localhost:3001/pengecekan-invoice` | Ditolak — lempar balik ke `/` (halaman ini `roles: ['MASTER','SUPERVISOR']`) |
| 2.8 | Ketik manual: `http://localhost:3001/persetujuan` | Ditolak — lempar balik ke `/` |

---

## 3. Role SUPERVISOR (paling penting hari ini)

| # | Langkah | Ekspektasi | Hasil |
|---|---|---|---|
| 3.1 | Logout, login `supervisor` / `supervisor` | **Tidak** mendarat di `/` — otomatis lempar ke `/pengecekan-invoice` |
| 3.2 | Lihat sidebar | **Persis 3 item**: Pengecekan Invoice, Antrian Persetujuan, Laporan — tidak lebih, tidak kurang |
| 3.3 | Lihat halaman yang terbuka | Placeholder "Belum tersedia" (Pengecekan Invoice), bukan Dashboard |
| 3.4 | Ketik manual di address bar: `http://localhost:3001/` | Otomatis lempar balik ke `/pengecekan-invoice` (**bukan loop tak berhenti** — pastikan halaman stabil, tidak reload-reload) |
| 3.5 | Klik "Antrian Persetujuan" di sidebar | Halaman antrian terbuka normal, bisa lihat daftar + approve/reject (fitur lama, harus tetap jalan) |
| 3.6 | Klik "Laporan" di sidebar | Placeholder "Belum tersedia" tampil |
| 3.7 | Ketik manual: `http://localhost:3001/master-data/products` | **Bisa masuk** (perilaku disengaja — lihat catatan di bawah) |
| 3.8 | Ketik manual: `http://localhost:3001/akuntansi/bagan-akun` | **Bisa masuk** (halaman-nya `roles: ['MASTER','SUPERVISOR']`, cuma hilang dari nav) |
| 3.9 | Ketik manual: `http://localhost:3001/pengaturan` | Ditolak — lempar ke `/pengecekan-invoice` (bukan `/`) |

> **Catatan bukan bug**: 3.7 & 3.8 sengaja tidak dikunci per halaman — pembatasan hari ini
> murni level sidebar ("navigasinya hanya 3 item"), bukan mengunci akses URL langsung ke
> tiap modul satu-satu. Kalau kamu mau ini juga dikunci, bilang saja, itu tugas terpisah.

---

## 4. Skenario silang: akurasi kartu "Persetujuan Menunggu"

Untuk memastikan kartu MASTER benar-benar baca data sungguhan, bukan angka statis:

| # | Langkah | Ekspektasi | Hasil |
|---|---|---|---|
| 4.1 | Login `operator`, buka `/qa/step-up-demo`, trigger satu aksi step-up baru | Muncul request baru berstatus PENDING |
| 4.2 | Logout, login `master`, buka `/` | Angka "Persetujuan Menunggu" **naik 1** dibanding sebelum langkah 4.1 |
| 4.3 | Buka `/persetujuan`, approve/reject request tadi | Balik ke `/` | Angka "Persetujuan Menunggu" **turun 1** lagi |

---

## 5. Verifikasi build (opsional, kalau kamu ubah kode lagi setelah ini)

```bash
cd frontend
pnpm run lint       # harus 0 error
pnpm run typecheck  # harus 0 error
pnpm run build      # harus "Build complete" tanpa error
```

---

## Ringkasan DoD yang divalidasi dokumen ini

- [ ] Dashboard tidak menampilkan angka palsu/hardcode (§1.3, §2.3)
- [ ] Login SUPERVISOR: sidebar 3 item, `/` mengarah ke Pengecekan Invoice (§3.1–§3.4)
- [ ] Tidak ada 403 percuma untuk OPERATOR (§2.4–§2.5)
- [ ] Angka "Persetujuan Menunggu" sungguhan, bukan statis (§4)
