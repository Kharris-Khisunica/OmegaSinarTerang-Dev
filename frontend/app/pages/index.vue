<script setup lang="ts">
import type { AuthorizationRequest } from '~/types/authorization-request'

// Dashboard hanya MASTER & OPERATOR (Supervisor tidak punya dashboard,
// CLAUDE.md §5 — dia mendarat di /pengecekan-invoice lewat ROLE_HOME,
// lihat app/config/navigation.ts + 01.roles.global.ts).
definePageMeta({ title: 'Dashboard', roles: ['MASTER', 'OPERATOR'] })

const { user } = useAuth()
const { listAll } = useAuthorizationRequests()

// GET /authorization-requests di backend cuma @Roles(MASTER, SUPERVISOR) —
// OPERATOR akan 403 kalau ini dipanggil untuknya. Jangan fetch sama sekali
// untuk OPERATOR; tampilkan "—" jujur, bukan angka yang diam-diam gagal.
const canSeeApprovals = computed(() => user.value?.role === 'MASTER')

const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const rows = ref<AuthorizationRequest[]>([])

const pendingCount = computed(() =>
  rows.value.filter(row => row.status === 'PENDING' && new Date(row.expiresAt).getTime() > Date.now()).length
)

onMounted(async () => {
  if (!canSeeApprovals.value) return
  status.value = 'pending'
  try {
    rows.value = await listAll()
    status.value = 'success'
  } catch {
    status.value = 'error'
  }
})
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader />

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <UPageCard
        title="Penjualan Hari Ini"
        description="—"
        icon="i-lucide-receipt"
        to="/laporan"
      />
      <UPageCard
        title="Piutang Jatuh Tempo"
        description="—"
        icon="i-lucide-calendar-clock"
        to="/laporan"
      />
      <UPageCard
        title="Stok Minus"
        description="—"
        icon="i-lucide-package-x"
        to="/laporan"
      />

      <UPageCard
        v-if="canSeeApprovals"
        title="Persetujuan Menunggu"
        :description="status === 'success' ? String(pendingCount) : status === 'error' ? 'Gagal memuat' : '—'"
        icon="i-lucide-shield-check"
        to="/persetujuan"
      />
      <UPageCard
        v-else
        title="Persetujuan Menunggu"
        description="— (khusus Master/Supervisor)"
        icon="i-lucide-shield-check"
      />
    </div>
  </div>
</template>
