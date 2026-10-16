<script setup lang="ts">
import type { AuthorizationRequest } from '~/types/authorization-request'

// Dashboard hanya MASTER & OPERATOR (Supervisor tidak punya dashboard,
// CLAUDE.md §5 — dia mendarat di /pengecekan-invoice lewat ROLE_HOME,
// lihat app/config/navigation.ts + 01.roles.global.ts).
definePageMeta({ title: 'Dashboard', roles: ['MASTER', 'OPERATOR'] })

interface DashboardSummary {
  date: string
  salesToday: { count: number, total: number }
  receivables: { outstandingTotal: number, overdueTotal: number, overdueInvoiceCount: number }
  negativeStockCount: number
}

const api = useApi()
const { user } = useAuth()
const { listAll } = useAuthorizationRequests()
const { format: rupiah } = useRupiah()

// need_fixing.md #9 — angka sungguhan dari GET /reports/dashboard-summary
// (memakai ulang logika Laporan Piutang & saldo stok, lihat DashboardService).
const summary = ref<DashboardSummary | null>(null)
const summaryStatus = ref<'pending' | 'success' | 'error'>('pending')

async function loadSummary() {
  summaryStatus.value = 'pending'
  try {
    summary.value = await api.get<DashboardSummary>('/reports/dashboard-summary')
    summaryStatus.value = 'success'
  } catch {
    summaryStatus.value = 'error'
  }
}

function cardText(build: (s: DashboardSummary) => string): string {
  if (summaryStatus.value === 'error') return 'Gagal memuat'
  if (!summary.value) return 'Memuat…'
  return build(summary.value)
}

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
  loadSummary()
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
    <PageHeader>
      <UButton
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="ghost"
        :loading="summaryStatus === 'pending'"
        @click="loadSummary"
      >
        Refresh
      </UButton>
    </PageHeader>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <UPageCard
        title="Penjualan Hari Ini"
        :description="cardText(s => `${rupiah(s.salesToday.total)} · ${s.salesToday.count} faktur`)"
        icon="i-lucide-receipt"
        to="/laporan/penjualan"
      />
      <UPageCard
        title="Piutang Jatuh Tempo"
        :description="cardText(s => `${rupiah(s.receivables.overdueTotal)} · ${s.receivables.overdueInvoiceCount} faktur (total piutang ${rupiah(s.receivables.outstandingTotal)})`)"
        icon="i-lucide-calendar-clock"
        to="/laporan/piutang"
      />
      <UPageCard
        title="Stok Minus"
        :description="cardText(s => s.negativeStockCount === 0 ? 'Tidak ada' : `${s.negativeStockCount} produk di gudang Toko`)"
        icon="i-lucide-package-x"
        to="/laporan/stok"
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
