<#
 Update ke versi baru di PC klien:
   .\deploy\update.ps1 -TarFile .\omega-1.1.0.tar -Version 1.1.0
 Rollback bila gagal: lihat deploy\README.md bagian "Rollback".
#>
param([Parameter(Mandatory)][string]$TarFile, [Parameter(Mandatory)][string]$Version)
. "$PSScriptRoot\_common.ps1"
Assert-Docker
if (-not (Test-Path $EnvFile)) { throw '.env tidak ditemukan.' }
if (-not (Test-Path $TarFile)) { throw "Tar tidak ada: $TarFile" }
$old = Get-EnvValue 'APP_VERSION' '1.0.0'

Write-Host '== 1/6 Backup dulu'
& "$PSScriptRoot\backup.ps1" -Prefix "sebelum-update-$Version"

Write-Host '== 2/6 Cek checksum & load image baru'
$shaFile = "$TarFile.sha256"
if (Test-Path $shaFile) {
    if ((Get-FileHash $TarFile -Algorithm SHA256).Hash -ne ((Get-Content $shaFile) -split '\s+')[0]) { throw 'Checksum tar tidak cocok.' }
}
Invoke-Native docker @('load', '-i', $TarFile)

Write-Host "== 3/6 Ganti tag $old -> $Version"
Set-EnvValue 'APP_VERSION' $Version

try {
    Write-Host '== 4/6 Naikkan stack'
    Compose up -d
    Write-Host '== 5/6 Migrasi'
    Wait-Healthy 'backend'
    Invoke-Migrations
    Write-Host '== 6/6 Health check'
    Wait-Healthy 'backend'
    Compose ps
    Write-Host "Update ke $Version selesai."
} catch {
    Write-Host "GAGAL: $_" -ForegroundColor Red
    Write-Host "Rollback: set APP_VERSION=$old di .env, lalu jalankan 'docker compose --env-file .env -f docker-compose.prod.yml up -d'." -ForegroundColor Yellow
    Write-Host "Bila migrasi sempat jalan, restore backup 'sebelum-update-$Version-*.dump' dengan restore.ps1." -ForegroundColor Yellow
    exit 1
}
