<script setup lang="ts">
import type { Column } from '~/types/data-table'

// Laporan Stok (Hari 29, CLAUDE.md §3 "Gudang") — BE GET /reports/stock.
// Snapshot saat ini, bukan laporan historis: tidak ada filter periode.
// Hanya STORE + BAD_STOCK + Total -- TITIPAN_PELANGGAN sengaja tidak ikut
// (warehouse jenis itu tidak pernah punya baris product_stock_balance,
// lihat StockReportsService). Satuan dipecah oleh backend ("12 DUS 15
// RENCENG"), FE tinggal render teksnya apa adanya.
definePageMeta({ title: 'Laporan Stok' })

interface StockReportRow extends Record<string, unknown> {
  productId: string
  code: string
  displayName: string
  storeQty: string
  badStockQty: string
  totalQty: string
}

interface StockReportResponse {
  rows: StockReportRow[]
  meta?: { title?: string }
}

const api = useApi()

const rows = ref<StockReportRow[]>([])
const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function load() {
  status.value = 'pending'
  errorMessage.value = ''
  try {
    const res = await api.get<StockReportResponse>('/reports/stock')
    rows.value = res.rows
    status.value = 'success'
  } catch (err) {
    rows.value = []
    status.value = 'error'
    errorMessage.value = getErrorMessage(err, 'Gagal memuat laporan.')
  }
}

onMounted(load)

const columns: Column<StockReportRow>[] = [
  { key: 'code', label: 'Kode', mono: true },
  { key: 'displayName', label: 'Nama Barang' },
  { key: 'storeQty', label: 'Stok Toko', align: 'right' },
  { key: 'badStockQty', label: 'Stok BS', align: 'right' },
  { key: 'totalQty', label: 'Total', align: 'right' }
]

const fileNamePrefix = computed(() => `laporan-stok-${new Date().toISOString().slice(0, 10)}`)
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader description="Stok per produk saat ini: gudang Toko (STORE), Barang Rusak/Retur (BAD_STOCK), dan Total. Satuan ditampilkan pecahan, bukan desimal.">
      <ExportButton
        v-if="rows.length > 0"
        endpoint="/reports/stock"
        :file-name-prefix="fileNamePrefix"
      />
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
      dense
      zebra
      search-placeholder="Cari kode atau nama barang..."
      empty-text="< Tidak Ada Data Untuk Ditampilkan >"
    />
  </div>
</template>
