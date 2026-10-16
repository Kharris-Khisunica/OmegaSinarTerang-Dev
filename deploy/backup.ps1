<#
 Backup database -> backups\omega-YYYYMMDD-HHmmss.dump (format custom pg_dump), simpan 14 terakhir.
 Daftarkan ke Task Scheduler (harian, mis. 18:00 setelah toko tutup), dengan user yang menjalankan Docker Desktop:
   schtasks /Create /SC DAILY /ST 18:00 /TN "Omega Backup" /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\omega\deploy\backup.ps1"
#>
param([int]$Keep = 14, [string]$Prefix = 'omega')
. "$PSScriptRoot\_common.ps1"
Assert-Docker

$dir = Join-Path $Root 'backups'
New-Item -ItemType Directory -Force $dir | Out-Null
$file = Join-Path $dir ('{0}-{1}.dump' -f $Prefix, (Get-Date -Format 'yyyyMMdd-HHmmss'))
$tmp = '/tmp/backup.dump'

$user = Get-EnvValue 'DB_USERNAME'
$db = Get-EnvValue 'DB_NAME' 'omega'

# Dump ke file di dalam container lalu docker cp: aman dari konversi encoding PowerShell pada pipe biner.
Compose exec -T postgres pg_dump -U $user -d $db -Fc -f $tmp
$id = Get-ServiceContainerId 'postgres'
Invoke-Native docker @('cp', "${id}:$tmp", $file)
Compose exec -T postgres rm -f $tmp

if (-not (Test-Path $file) -or (Get-Item $file).Length -lt 1024) { throw "Backup gagal/terlalu kecil: $file" }
Write-Host ('Backup OK: {0} ({1} KB)' -f $file, [math]::Round((Get-Item $file).Length / 1KB))

Get-ChildItem $dir -Filter "$Prefix-*.dump" | Sort-Object Name -Descending | Select-Object -Skip $Keep |
    ForEach-Object { Remove-Item $_.FullName -Force; Write-Host "Dihapus (lebih dari $Keep generasi): $($_.Name)" }
Write-Host 'Ingat: salin folder backups\ ke media lain (flashdisk/cloud) secara berkala.'
