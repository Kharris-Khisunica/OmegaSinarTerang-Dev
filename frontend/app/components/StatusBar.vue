<script setup lang="ts">
/**
 * Padanan status bar sistem lama (PANDUAN_UI.md §4.2):
 * "Affari Retail System Ver : 7.57.27 | WELCOME : KASIR | REC(s) : 958 | ..."
 * →  "Omega Sinar Terang v1.0 · KASIR (Operator) · 958 data · dd-MM-yyyy HH:mm"
 *
 * Format tanggal di-hand-roll (bukan utils/formatDate.ts — itu DD/MM/YYYY tanpa
 * jam, beda separator dari PANDUAN_UI.md §10 yang minta dd-MM-yyyy).
 */
const { user } = useAuth()
const { total } = useListPageStatus()
const { now } = useClockTick()

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

const nowLabel = computed(() => {
  const d = new Date(now.value)
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
})
</script>

<template>
  <div class="px-3 py-1 text-xs text-muted border-t border-default flex items-center gap-1.5">
    <span>Omega Sinar Terang v1.0</span>
    <template v-if="user">
      <span>·</span>
      <span>{{ user.fullName }} ({{ ROLE_LABEL[user.role] ?? user.role }})</span>
    </template>
    <template v-if="total !== null">
      <span>·</span>
      <span>{{ total }} data</span>
    </template>
    <!-- ClientOnly: jam berjalan (useClockTick) SELALU beda antara SSR (waktu
         respons server) dan hidrasi client (beberapa saat kemudian) -> hydration
         mismatch kalau dirender di server sama sekali. -->
    <ClientOnly>
      <span>·</span>
      <span>{{ nowLabel }}</span>
    </ClientOnly>
  </div>
</template>
