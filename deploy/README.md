# Deployment Omega Sinar Terang v1.0.0 (Docker Compose)

Arsitektur: PC klien (Windows + Docker Desktop/WSL2) menjalankan 4 container — `postgres`, `backend` (NestJS), `frontend` (static Nuxt di Caddy), `proxy` (Caddy). Hanya `proxy` yang membuka port (80) ke LAN. Browser memanggil API lewat `/api/...` (di-proxy ke backend), jadi tidak ada IP yang tertulis di kode.

> Catatan: CLAUDE.md §1 masih menyebut deploy "tanpa Docker (Postgres native + Windows service)". Paket ini menggantikannya atas permintaan eksplisit; perbarui CLAUDE.md bila sudah final.

## A. Di laptop developer — membuat paket

```powershell
.\deploy\build-release.ps1 -Version 1.0.0
```
Hasil di `deploy\dist\`: `omega-1.0.0.tar` (image backend, frontend, postgres, caddy), `.sha256`, dan `omega-deploy-1.0.0.zip` (tar + compose + script + `.env.production.example`). Kirim zip itu ke PC klien (flashdisk). Tidak ada rahasia di dalam paket.

## B. Persiapan PC klien (sekali saja)

1. **BIOS**: aktifkan *Intel Virtualization Technology (VT-x)* (i5-4690 mendukung). Boot Windows → Task Manager → Performance → CPU: "Virtualization: Enabled".
2. **Windows**: aktifkan fitur *Virtual Machine Platform* dan *WSL* (`wsl --install --no-distribution` di PowerShell Admin), restart.
3. **Docker Desktop**: pasang (backend WSL2). Settings → General: centang *Start Docker Desktop when you sign in*. Matikan *Send usage statistics*. Windows harus **auto-login** ke akun operator supaya Docker (dan stack) hidup lagi setelah mati listrik — atur lewat `netplwiz`, dan BIOS: *Restore on AC Power Loss = Power On*.
4. **Batas memori WSL** — buat `C:\Users\<user>\.wslconfig`:
   ```
   [wsl2]
   memory=4GB
   processors=3
   swap=2GB
   ```
   lalu `wsl --shutdown` dan nyalakan ulang Docker Desktop. (Stack butuh ±2 GB; 4 GB menyisakan 4 GB untuk Windows.)
5. **IP statis**: Settings → Network → Ethernet → IP assignment Manual (mis. `192.168.1.50`, gateway router, DNS 8.8.8.8), atau reservasi DHCP di router (lebih aman). Catat IP ini untuk `FRONTEND_ORIGIN`.
6. **Firewall** (PowerShell Admin), izinkan port web hanya dari LAN:
   ```powershell
   New-NetFirewallRule -DisplayName "Omega Web" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -Profile Private -RemoteAddress LocalSubnet
   ```
   Pastikan jaringan toko bertipe *Private*. Port PostgreSQL (5432) dan backend (3000) memang tidak dipublish.
7. **Tailscale**: pasang, login dengan akun developer, aktifkan *Run unattended* (service) supaya tetap terhubung tanpa login. Akses maintenance: `ssh`/RDP via IP Tailscale. Jangan buka port 80 di Tailscale ke publik.
8. **Matikan Sleep/Hibernate** (Power Options → Never) dan matikan Windows Update restart otomatis di jam toko.

## C. Instalasi pertama

1. Ekstrak `omega-deploy-1.0.0.zip` ke `C:\omega` (folder ini berisi `docker-compose.prod.yml`, `omega-1.0.0.tar`, `deploy\`).
2. Buat `.env`:
   ```powershell
   cd C:\omega
   Copy-Item .env.production.example .env
   notepad .env
   ```
   Isi semua `GANTI`. Contoh generate secret acak:
   ```powershell
   -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 64 | % {[char]$_})
   ```
   Jalankan dua kali untuk `JWT_ACCESS_SECRET` dan `JWT_REFRESH_SECRET`, sekali untuk `DB_PASSWORD` (hindari karakter khusus). `SEED_MASTER_PASSWORD` min. 10 karakter.
3. Jalankan:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\deploy\install.ps1
   ```
   Script: cek Docker → cek `.env` → verifikasi checksum → `docker load` → `docker compose up -d` → migrasi → seed MASTER + identitas toko → tampilkan status. Migrasi **tidak** jalan otomatis saat backend start; selalu lewat script ini / `update.ps1`.
4. Buka `http://localhost` di PC itu, dan `http://<IP-statis>` dari PC lain. Login dengan akun MASTER dari `.env`.
5. **Hapus `SEED_MASTER_PASSWORD`** dari `.env` setelah login berhasil.
6. **Backup terjadwal** (harian 18:00):
   ```powershell
   schtasks /Create /SC DAILY /ST 18:00 /TN "Omega Backup" /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\omega\deploy\backup.ps1"
   ```
   Backup disimpan di `C:\omega\backups\` (14 generasi terakhir). **Salin folder itu ke media lain** (flashdisk/cloud) secara berkala — satu HDD yang rusak membawa semuanya.

## D. Tentang kunci/rahasia

- Aplikasi **tidak memakai kunci enkripsi pgcrypto** (hanya `gen_random_uuid()`), jadi tidak ada kunci semacam itu untuk dibackup.
- Yang **wajib dibackup terpisah dari PC klien**: file `.env` (password DB + JWT secret) dan dump database. Simpan `.env` di password manager developer.
- Mengganti JWT secret hanya membuat semua pengguna logout, tidak merusak data.

## E. Operasional sehari-hari

```powershell
cd C:\omega
docker compose --env-file .env -f docker-compose.prod.yml ps         # status
docker compose --env-file .env -f docker-compose.prod.yml logs -f backend
docker compose --env-file .env -f docker-compose.prod.yml restart backend
```
Tanpa UPS: PostgreSQL tetap `fsync=on` sehingga data aman terhadap mati listrik mendadak (pemulihan WAL otomatis saat nyala). Tetap anjurkan **shutdown Windows dengan benar** dan pertimbangkan membeli UPS kecil.

## F. Update ke versi baru

Di laptop: `.\deploy\build-release.ps1 -Version 1.1.0`, kirim `omega-1.1.0.tar` (+ `.sha256`) ke `C:\omega`. Di PC klien:
```powershell
cd C:\omega
powershell -ExecutionPolicy Bypass -File .\deploy\update.ps1 -TarFile .\omega-1.1.0.tar -Version 1.1.0
```
Urutan: backup (`sebelum-update-1.1.0-*.dump`) → cek checksum → `docker load` → ganti `APP_VERSION` → `up -d` → migrasi → health check. Lakukan di luar jam toko (±5 menit downtime).

## G. Rollback

- **Update gagal sebelum migrasi jalan** (image bermasalah): ubah `APP_VERSION` di `.env` kembali ke versi lama (mis. `1.0.0`; image lama masih ada di Docker), lalu `docker compose --env-file .env -f docker-compose.prod.yml up -d`.
- **Migrasi sudah jalan atau data berubah**: kembalikan versi seperti di atas **dan** restore backup `sebelum-update-*`:
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\deploy\restore.ps1 -File .\backups\sebelum-update-1.1.0-YYYYMMDD-HHmmss.dump
  ```
  Restore meminta ketik `RESTORE`, membuat backup pengaman `sebelum-restore-*` dulu, menghentikan backend, memulihkan, lalu menyalakan backend. Transaksi yang diinput setelah backup itu hilang — beri tahu operator.
- Uji restore berkala ke database terpisah: `restore.ps1 -File <dump> -DbName omega_uji -Force`.

## H. Checklist serah terima

- [ ] BIOS virtualization aktif, `.wslconfig` terpasang, Windows auto-login, sleep dimatikan
- [ ] IP statis/reservasi DHCP tercatat; firewall port 80 (Private/LocalSubnet) aktif
- [ ] Docker Desktop auto-start; reboot PC → stack hidup sendiri (`docker compose ps` semua `healthy/running`)
- [ ] `install.ps1` sukses; login MASTER berhasil dari PC operator **dan** supervisor lewat IP LAN
- [ ] `SEED_MASTER_PASSWORD` sudah dihapus dari `.env`; akun SUPERVISOR & OPERATOR dibuat lewat aplikasi
- [ ] Identitas toko (nama/kota/telepon) tampil di kepala nota
- [ ] Backup terjadwal terdaftar, 1 backup manual sukses, uji restore ke `omega_uji` sukses
- [ ] Salinan `.env` dan backup pertama diserahkan/disimpan di luar PC klien
- [ ] Tailscale aktif (unattended), developer bisa akses remote
- [ ] Operator diberi tahu: shutdown Windows dengan benar; siapa dihubungi saat masalah
