# Fungsi bersama script deploy. Dipanggil dengan dot-sourcing: . "$PSScriptRoot\_common.ps1"
$ErrorActionPreference = 'Stop'
$script:Root = Split-Path -Parent $PSScriptRoot
$script:ComposeFile = Join-Path $script:Root 'docker-compose.prod.yml'
$script:EnvFile = Join-Path $script:Root '.env'

function Invoke-Native {
    # Jalankan perintah native dan hentikan script bila exit code != 0.
    param([Parameter(Mandatory)][string]$Exe, [string[]]$Arguments)
    & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Gagal ($LASTEXITCODE): $Exe $($Arguments -join ' ')" }
}

function Compose {
    param([Parameter(ValueFromRemainingArguments)][string[]]$Rest)
    Invoke-Native docker (@('compose', '--env-file', $script:EnvFile, '-f', $script:ComposeFile) + $Rest)
}

function Get-EnvValue {
    param([Parameter(Mandatory)][string]$Name, [string]$Default = '')
    if (-not (Test-Path $script:EnvFile)) { return $Default }
    $line = Get-Content $script:EnvFile | Where-Object { $_ -match "^\s*$Name\s*=" } | Select-Object -Last 1
    if (-not $line) { return $Default }
    $value = ($line -replace "^\s*$Name\s*=\s*", '').Trim()
    if ($value -eq '') { return $Default }
    return $value
}

function Set-EnvValue {
    param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][string]$Value)
    $lines = @(Get-Content $script:EnvFile)
    $found = $false
    $lines = $lines | ForEach-Object { if ($_ -match "^\s*$Name\s*=") { $found = $true; "$Name=$Value" } else { $_ } }
    if (-not $found) { $lines += "$Name=$Value" }
    Set-Content -Path $script:EnvFile -Value $lines -Encoding ascii
}

function Assert-Docker {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker belum terpasang.' }
    # PS 5.1 + ErrorActionPreference=Stop: stderr yang diredirect (peringatan WSL Docker Desktop)
    # dianggap error fatal. Turunkan sementara; yang menentukan hanya exit code.
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & docker info 2>&1 | Out-Null
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -ne 0) { throw 'Docker Desktop belum berjalan. Nyalakan dulu, tunggu sampai ikon hijau, lalu ulangi.' }
}

function Get-ServiceContainerId {
    param([Parameter(Mandatory)][string]$Service)
    $id = (& docker compose --env-file $script:EnvFile -f $script:ComposeFile ps -q $Service)
    if (-not $id) { throw "Container $Service tidak berjalan." }
    return $id
}

function Wait-Healthy {
    param([string]$Service = 'backend', [int]$TimeoutSec = 180)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    do {
        $id = (& docker compose --env-file $script:EnvFile -f $script:ComposeFile ps -q $Service)
        if ($id) {
            $status = (& docker inspect -f '{{.State.Health.Status}}' $id)
            if ($status -eq 'healthy') { return }
        }
        Start-Sleep -Seconds 3
    } while ((Get-Date) -lt $deadline)
    throw "Service $Service tidak sehat dalam $TimeoutSec detik. Lihat: docker compose logs $Service"
}

function Invoke-Migrations {
    Compose exec -T backend node dist/database/run-migrations.js run
}
