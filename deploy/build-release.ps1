<#
 Jalankan di LAPTOP developer (bukan di PC klien).
 Hasil: deploy\dist\omega-<versi>.tar (+ .sha256) dan paket serah terima omega-deploy-<versi>.zip
#>
param([string]$Version = '1.0.0')
. "$PSScriptRoot\_common.ps1"
Assert-Docker

$platform = 'linux/amd64'
$out = Join-Path $PSScriptRoot 'dist'
New-Item -ItemType Directory -Force $out | Out-Null

Write-Host "== Build backend $Version ($platform)"
Invoke-Native docker @('build', '--platform', $platform, '-t', "omega-backend:$Version", (Join-Path $Root 'backend'))
Write-Host "== Build frontend $Version ($platform)"
Invoke-Native docker @('build', '--platform', $platform, '-t', "omega-frontend:$Version", (Join-Path $Root 'frontend'))
Write-Host '== Pull postgres & caddy'
Invoke-Native docker @('pull', '--platform', $platform, 'postgres:17-alpine')
Invoke-Native docker @('pull', '--platform', $platform, 'caddy:2-alpine')

$tar = Join-Path $out "omega-$Version.tar"
Write-Host "== docker save -> $tar"
Invoke-Native docker @('save', '-o', $tar, "omega-backend:$Version", "omega-frontend:$Version", 'postgres:17-alpine', 'caddy:2-alpine')
$hash = (Get-FileHash $tar -Algorithm SHA256).Hash
"$hash  omega-$Version.tar" | Set-Content (Join-Path $out "omega-$Version.tar.sha256") -Encoding ascii

# Paket serah terima: konfigurasi + script (tanpa rahasia, tanpa source code).
$stage = Join-Path $out "omega-deploy-$Version"
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force (Join-Path $stage 'deploy') | Out-Null
Copy-Item (Join-Path $Root 'docker-compose.prod.yml') $stage
Copy-Item (Join-Path $Root '.env.production.example') $stage
Get-ChildItem $PSScriptRoot -File |
    Where-Object { $_.Extension -in '.ps1', '.md' -or $_.Name -in 'Caddyfile', 'init-db.sql' } |
    Copy-Item -Destination (Join-Path $stage 'deploy')
Copy-Item $tar $stage
Copy-Item "$tar.sha256" $stage
Compress-Archive -Path "$stage\*" -DestinationPath (Join-Path $out "omega-deploy-$Version.zip") -Force

$size = [math]::Round((Get-Item $tar).Length / 1MB)
Write-Host "Selesai. $tar ($size MB), SHA256 $hash"
Write-Host "Paket serah terima: $out\omega-deploy-$Version.zip"
