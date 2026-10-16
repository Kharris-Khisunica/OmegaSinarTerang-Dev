<#
 Restore dari file backup. MENIMPA seluruh isi database tujuan.
   .\deploy\restore.ps1 -File .\backups\omega-20261001-180000.dump
 -DbName: restore ke database lain (dibuat baru; dipakai untuk uji). -Force: lewati konfirmasi.
#>
param([Parameter(Mandatory)][string]$File, [string]$DbName, [switch]$Force)
. "$PSScriptRoot\_common.ps1"
Assert-Docker
if (-not (Test-Path $File)) { throw "File tidak ada: $File" }
$File = (Resolve-Path $File).Path

$user = Get-EnvValue 'DB_USERNAME'
$envDb = Get-EnvValue 'DB_NAME' 'omega'
$target = if ($DbName) { $DbName } else { $envDb }

Write-Host "Restore '$File' -> database '$target'. SEMUA DATA di database itu akan DITIMPA."
if (-not $Force) {
    if ((Read-Host 'Ketik RESTORE untuk melanjutkan') -ne 'RESTORE') { Write-Host 'Dibatalkan.'; exit 1 }
}

$isLive = ($target -eq $envDb)
if ($isLive) {
    Write-Host '== Backup pengaman kondisi sekarang'
    & "$PSScriptRoot\backup.ps1" -Prefix 'sebelum-restore'
    Write-Host '== Hentikan backend'
    Compose stop backend
}

$id = Get-ServiceContainerId 'postgres'
Invoke-Native docker @('cp', $File, "${id}:/tmp/restore.dump")
if (-not $isLive) {
    Compose exec -T postgres psql -U $user -d postgres -c "DROP DATABASE IF EXISTS `"$target`""
    Compose exec -T postgres psql -U $user -d postgres -c "CREATE DATABASE `"$target`""
}
# --clean --if-exists: tabel lama dibuang dulu. Peringatan "does not exist" pada DB kosong itu normal.
& docker compose --env-file $EnvFile -f $ComposeFile exec -T postgres pg_restore -U $user -d $target --clean --if-exists --no-owner /tmp/restore.dump
if ($LASTEXITCODE -ne 0) { Write-Host "pg_restore exit $LASTEXITCODE (periksa pesan di atas)" -ForegroundColor Yellow }
Compose exec -T postgres rm -f /tmp/restore.dump

if ($isLive) {
    Compose start backend
    Wait-Healthy 'backend'
}
Write-Host 'Restore selesai.'
