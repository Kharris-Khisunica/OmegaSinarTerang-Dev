<#
 Jalankan di PC KLIEN, dari folder paket (yang berisi docker-compose.prod.yml):
   powershell -ExecutionPolicy Bypass -File .\deploy\install.ps1
#>
param([string]$TarFile)
. "$PSScriptRoot\_common.ps1"

Write-Host '== 1/6 Cek Docker'
Assert-Docker

Write-Host '== 2/6 Cek .env'
if (-not (Test-Path $EnvFile)) {
    throw 'File .env belum ada. Salin .env.production.example menjadi .env lalu isi semua nilai GANTI.'
}
if ((Get-Content $EnvFile -Raw) -match 'GANTI') { throw "Masih ada nilai 'GANTI' di .env. Isi semuanya dulu." }

Write-Host '== 3/6 Load image'
if (-not $TarFile) {
    $TarFile = (Get-ChildItem $Root -Filter 'omega-*.tar' | Sort-Object LastWriteTime | Select-Object -Last 1).FullName
}
if (-not $TarFile -or -not (Test-Path $TarFile)) { throw 'File omega-<versi>.tar tidak ditemukan. Pakai -TarFile <path>.' }
$shaFile = "$TarFile.sha256"
if (Test-Path $shaFile) {
    $expected = ((Get-Content $shaFile) -split '\s+')[0]
    if ((Get-FileHash $TarFile -Algorithm SHA256).Hash -ne $expected) { throw 'Checksum tar tidak cocok - file rusak saat disalin.' }
    Write-Host 'Checksum OK.'
}
Invoke-Native docker @('load', '-i', $TarFile)

Write-Host '== 4/6 Jalankan stack'
Compose up -d
Wait-Healthy 'backend'

Write-Host '== 5/6 Migrasi database'
Invoke-Migrations

Write-Host '== 6/6 Seed awal (MASTER + identitas toko)'
Compose exec -T backend node dist/database/seed-production.js

Write-Host ''
Compose ps
$port = Get-EnvValue 'HTTP_PORT' '80'
Write-Host "Instalasi selesai. Buka http://localhost:$port (dari PC lain: $(Get-EnvValue 'FRONTEND_ORIGIN'))"
Write-Host 'Langkah berikut: hapus SEED_MASTER_PASSWORD dari .env, daftarkan backup.ps1 ke Task Scheduler (lihat README).'
