#!/usr/bin/env bash
# =============================================================================
# verify.sh — Gerbang harian sebelum commit
# Jalankan dari root repo:  ./scripts/verify.sh
#
# Exit code 0 = semua hijau, boleh commit
# Exit code 1 = ada yang merah, JANGAN tandai hari ini selesai
#
# Bisa dipasang sebagai pre-push hook:
#   ln -s ../../scripts/verify.sh .git/hooks/pre-push
# =============================================================================

set -uo pipefail

BE_DIR="${BE_DIR:-backend}"
FE_DIR="${FE_DIR:-frontend}"
API_URL="${API_URL:-http://localhost:3000}"
TEST_DB="${TEST_DB:-fmcg_verify_tmp}"

# Dev DB harian pakai Postgres native Windows (bukan Docker) — mesin dev RAM terbatas,
# Docker Desktop + build Nuxt/Vite bareng-bareng memicu OOM. Docker Compose tetap ada
# di repo untuk deploy ke mini PC nanti, bukan untuk dev sehari-hari.
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
export PGPASSWORD="$DB_PASSWORD"

PASS=0
FAIL=0
SKIP=0
RESULTS=()

green() { printf '\033[0;32m%s\033[0m' "$1"; }
red()   { printf '\033[0;31m%s\033[0m' "$1"; }
gray()  { printf '\033[0;90m%s\033[0m' "$1"; }

step() {
  local label="$1"; shift
  printf '\n\033[1m▶ %s\033[0m\n' "$label"
  if "$@" > /tmp/verify_out.log 2>&1; then
    green "  ✅ LULUS"; echo
    RESULTS+=("✅ $label")
    PASS=$((PASS+1))
    return 0
  else
    red "  ❌ GAGAL"; echo
    gray "  ── 30 baris terakhir ──"; echo
    tail -n 30 /tmp/verify_out.log | sed 's/^/  /'
    RESULTS+=("❌ $label")
    FAIL=$((FAIL+1))
    return 1
  fi
}

skip() {
  printf '\n\033[1m▶ %s\033[0m\n' "$1"
  gray "  ⏭️  DILEWATI — $2"; echo
  RESULTS+=("⏭️  $1 (dilewati)")
  SKIP=$((SKIP+1))
}

echo "═══════════════════════════════════════════════════════"
echo "  VERIFIKASI HARIAN — $(date '+%Y-%m-%d %H:%M')"
echo "═══════════════════════════════════════════════════════"

# ---------------------------------------------------------------------------
# 1. Database hidup
# ---------------------------------------------------------------------------
step "1/10 Postgres hidup & bisa diquery" \
  bash -c "pg_isready -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER'"

# ---------------------------------------------------------------------------
# 2-3. Backend build & lint
# ---------------------------------------------------------------------------
if [ -d "$BE_DIR" ]; then
  step "2/10 Build backend (0 error TypeScript)" \
    bash -c "cd $BE_DIR && npm run build"

  step "3/10 Lint backend" \
    bash -c "cd $BE_DIR && npm run lint"
else
  skip "2/10 Build backend" "folder $BE_DIR belum ada"
  skip "3/10 Lint backend" "folder $BE_DIR belum ada"
fi

# ---------------------------------------------------------------------------
# 4. Migration reversible — up → down → up di DB sementara
#    Migration yang tidak bisa di-rollback adalah bom waktu saat produksi.
# ---------------------------------------------------------------------------
if [ -d "$BE_DIR" ]; then
  step "4/10 Migration up → down → up (DB bersih)" bash -c "
    set -e
    export PGPASSWORD='$DB_PASSWORD'
    psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -c 'DROP DATABASE IF EXISTS $TEST_DB;' >/dev/null
    psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -c 'CREATE DATABASE $TEST_DB;' >/dev/null
    psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d '$TEST_DB' -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto;' >/dev/null
    cd $BE_DIR
    DB_HOST='$DB_HOST' DB_PORT='$DB_PORT' DB_USERNAME='$DB_USER' DB_PASSWORD='$DB_PASSWORD' DB_NAME='$TEST_DB' npm run migration:run
    DB_HOST='$DB_HOST' DB_PORT='$DB_PORT' DB_USERNAME='$DB_USER' DB_PASSWORD='$DB_PASSWORD' DB_NAME='$TEST_DB' npm run migration:revert
    DB_HOST='$DB_HOST' DB_PORT='$DB_PORT' DB_USERNAME='$DB_USER' DB_PASSWORD='$DB_PASSWORD' DB_NAME='$TEST_DB' npm run migration:run
    psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -c 'DROP DATABASE $TEST_DB;' >/dev/null
  "
else
  skip "4/10 Migration reversible" "folder $BE_DIR belum ada"
fi

# ---------------------------------------------------------------------------
# 5. Test backend — termasuk 4 invarian setelah Hari 8
# ---------------------------------------------------------------------------
if [ -d "$BE_DIR" ]; then
  step "5/10 Test backend" \
    bash -c "cd $BE_DIR && npm run test"
else
  skip "5/10 Test backend" "folder $BE_DIR belum ada"
fi

# ---------------------------------------------------------------------------
# 6. Aplikasi benar-benar bisa dijalankan — /health 200
#    Build hijau tidak sama dengan aplikasi jalan.
# ---------------------------------------------------------------------------
if [ -d "$BE_DIR" ]; then
  step "6/10 Server start & GET /health = 200" bash -c "
    cd $BE_DIR
    node dist/main > /tmp/verify_server.log 2>&1 &
    SRV_PID=\$!
    for i in \$(seq 1 30); do
      if curl -sf $API_URL/health > /tmp/verify_health.json 2>/dev/null; then
        kill \$SRV_PID 2>/dev/null || true
        cat /tmp/verify_health.json
        grep -q '\"status\"' /tmp/verify_health.json && exit 0 || exit 1
      fi
      sleep 1
    done
    kill \$SRV_PID 2>/dev/null || true
    echo 'Server tidak merespons dalam 30 detik'
    tail -n 40 /tmp/verify_server.log
    exit 1
  "
else
  skip "6/10 Health check" "folder $BE_DIR belum ada"
fi

# ---------------------------------------------------------------------------
# 7-8. Frontend build & lint
# ---------------------------------------------------------------------------
if [ -d "$FE_DIR" ]; then
  step "7/10 Build frontend" \
    bash -c "cd $FE_DIR && NODE_OPTIONS=--max-old-space-size=4096 npm run build"

  step "8/10 Lint frontend" \
    bash -c "cd $FE_DIR && npm run lint"
else
  skip "7/10 Build frontend" "folder $FE_DIR belum ada"
  skip "8/10 Lint frontend" "folder $FE_DIR belum ada"
fi

# ---------------------------------------------------------------------------
# 9. Tidak ada route DELETE — aturan no-hard-delete
#    Dicek dari kode, bukan dari niat baik.
# ---------------------------------------------------------------------------
if [ -d "$BE_DIR/src" ]; then
  step "9/10 Tidak ada @Delete() di controller" bash -c "
    HITS=\$(grep -rn '@Delete(' $BE_DIR/src --include='*.ts' | grep -v '\.spec\.ts' || true)
    if [ -n \"\$HITS\" ]; then
      echo 'Ditemukan route DELETE — melanggar aturan no-hard-delete:'
      echo \"\$HITS\"
      exit 1
    fi
    echo 'Bersih: tidak ada @Delete()'
  "
else
  skip "9/10 Cek route DELETE" "folder $BE_DIR/src belum ada"
fi

# ---------------------------------------------------------------------------
# 10. Kredensial tidak ikut ter-commit
# ---------------------------------------------------------------------------
step "10/10 .env tidak ter-stage di git" bash -c "
  STAGED=\$(git diff --cached --name-only 2>/dev/null | grep -E '(^|/)\.env(\..*)?$' | grep -v '\.env\.example' || true)
  if [ -n \"\$STAGED\" ]; then
    echo 'File .env ter-stage:'
    echo \"\$STAGED\"
    exit 1
  fi
  echo 'Bersih: tidak ada .env ter-stage'
"

# ---------------------------------------------------------------------------
# Ringkasan
# ---------------------------------------------------------------------------
echo
echo "═══════════════════════════════════════════════════════"
echo "  RINGKASAN"
echo "═══════════════════════════════════════════════════════"
for r in "${RESULTS[@]}"; do echo "  $r"; done
echo "───────────────────────────────────────────────────────"
printf "  Lulus: %s   Gagal: %s   Dilewati: %s\n" "$PASS" "$FAIL" "$SKIP"
echo "═══════════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  echo
  red "  Ada $FAIL pemeriksaan gagal."; echo
  echo "  JANGAN tandai hari ini [x] di PROGRESS.md."
  echo "  Perbaiki dulu, atau catat sebagai blocker di PROGRESS.md §3."
  echo
  exit 1
fi

echo
green "  Semua hijau. Silakan update PROGRESS.md dan commit."; echo
echo
echo "  Sisa langkah manual yang tidak bisa dicek skrip ini:"
echo "    □ Uji manual 1 happy path + 1 error path untuk fitur hari ini"
echo "    □ Update PROGRESS.md (checkbox, Tgl Aktual, §0, §4)"
echo "    □ Commit: 'Hari NN: <ringkasan>'"
echo
exit 0
