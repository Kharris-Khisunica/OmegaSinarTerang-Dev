<script setup lang="ts">
import type { Column } from '~/types/data-table'

// Rekonsiliasi Stok (Hari 32, CLAUDE.md §2.5) — BE GET /reports/stock-reconciliation.
// Pengecekan integritas ledger: SUM(stock_movements) vs product_stock_balance
// (cache), memakai StockRecorderService.reconcile() Hari 10. Selisih WAJIB 0
// pada DB sehat -- baris berselisih ditandai merah (bukan disembunyikan, supaya
// kelihatan langsung kalau muncul). Kolom Titipan (penjelas) bersifat KONTEKS
// TAMBAHAN untuk baris gudang STORE saja -- mutasi titipan tidak pernah
// menyentuh ledger, jadi ia tidak bisa "menjelaskan" kolom Selisih itu sendiri;
// yang dijelaskannya adalah kenapa hitung fisik di rak bisa lebih kecil dari
// Saldo Sistem (sebagian sudah terjual & dititip). Ini snapshot saat ini,
// bukan laporan historis -- tidak ada filter periode, pola sama /reports/stock.
definePageMeta({ title: 'Rekonsiliasi Stok' })

interface TitipanDetailItem {
  customerName: string
  qtyText: string
}

interface ReconciliationRow extends Record<string, unknown> {
  productId: string
  warehouseId: string
  code: string
  displayName: string
  warehouseName: string
  warehouseType: string
  movementSumText: string
  balanceQtyText: string
  differenceText: string
  hasDifference: boolean
  titipanQtyText: string
  titipanDetail: TitipanDetailItem[]
}

interface ReconciliationResponse {
  rows: ReconciliationRow[]
  meta?: { title?: string }
}

const api = useApi()

const rows = ref<ReconciliationRow[]>([])
const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function load() {
  status.value = 'pending'
  errorMessage.value = ''
  try {
    const res = await api.get<ReconciliationResponse>('/reports/stock-reconciliation')
    rows.value = res.rows
    status.value = 'success'
  } catch (err) {
    rows.value = []
    status.value = 'error'
    errorMessage.value = getErrorMessage(err, 'Gagal memuat laporan.')
  }
}

onMounted(load)

const diffCount = computed(() => rows.value.filter(r => r.hasDifference).length)

function rowClass(row: ReconciliationRow): string {
  return row.hasDifference ? 'bg-error/10' : ''
}

const columns: Column<ReconciliationRow>[] = [
  { key: 'code', label: 'Kode', mono: true },
  { key: 'displayName', label: 'Nama Barang' },
  { key: 'warehouseName', label: 'Gudang' },
  { key: 'movementSumText', label: 'Σ Pergerakan', align: 'right' },
  { key: 'balanceQtyText', label: 'Saldo Sistem', align: 'right' },
  { key: 'differenceText', label: 'Selisih', align: 'right', slot: 'selisih' },
  { key: 'titipanQtyText', label: 'Titipan (penjelas)', align: 'right', slot: 'titipan' }
]

const fileNamePrefix = computed(() => `rekonsiliasi-stok-${new Date().toISOString().slice(0, 10)}`)
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader description="Bandingkan total pergerakan stok (ledger) dengan saldo sistem (cache) per produk+gudang -- selisih wajib 0 pada database sehat. Kolom Titipan adalah konteks tambahan untuk gudang Toko, bukan penjelas kolom Selisih (barang titipan tidak pernah menyentuh ledger).">
      <div class="flex items-center gap-2">
        <UBadge
          v-if="status === 'success' && diffCount === 0"
          color="success"
          variant="subtle"
          icon="i-lucide-check-circle"
        >
          Tidak ada selisih
        </UBadge>
        <UBadge
          v-else-if="status === 'success' && diffCount > 0"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
        >
          {{ diffCount }} baris berselisih
        </UBadge>
        <ExportButton
          v-if="rows.length > 0"
          endpoint="/reports/stock-reconciliation"
          :file-name-prefix="fileNamePrefix"
        />
      </div>
    </PageHeader>

    <div
      v-if="status === 'pending'"
      class="flex flex-col gap-2"
    >
      <USkeleton
        v-for="i in 6"
        :key="i"
        class="h-8 w-full"
      />
    </div>
    <UEmpty
      v-else-if="status === 'error'"
      icon="i-lucide-alert-triangle"
      title="Gagal memuat laporan"
      :description="errorMessage"
      :actions="[{ label: 'Coba lagi', onClick: load }]"
    />
    <DataTable
      v-else
      :rows="rows"
      :columns="columns"
      :row-class="rowClass"
      dense
      zebra
      search-placeholder="Cari kode, nama barang, atau gudang..."
      empty-text="< Tidak Ada Data Untuk Ditampilkan >"
    >
      <template #selisih="{ row }">
        <span :class="(row as ReconciliationRow).hasDifference ? 'text-error font-semibold' : ''">
          {{ (row as ReconciliationRow).differenceText }}
        </span>
      </template>
      <template #titipan="{ row }">
        <div class="flex flex-col items-end gap-0.5">
          <span>{{ (row as ReconciliationRow).titipanQtyText }}</span>
          <span
            v-if="(row as ReconciliationRow).titipanDetail.length > 0"
            class="text-xs text-muted"
          >
            {{ (row as ReconciliationRow).titipanDetail.map(d => `${d.customerName}: ${d.qtyText}`).join(' · ') }}
          </span>
        </div>
      </template>
    </DataTable>
  </div>
</template>
