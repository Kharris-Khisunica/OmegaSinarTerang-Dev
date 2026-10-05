<script setup lang="ts">
import type { Column } from '~/types/data-table'

// Laporan Biaya Operasional (Hari 32A FE, CLAUDE.md §3 "Biaya Operasional") —
// BE GET /reports/operational-expenses?month=YYYY-MM (paket R10/Hari 32A
// tugas 10). Pola generik PANDUAN_UI.md §14: panel parameter (di sini cukup
// satu field bulan) + "Tampilkan" otomatis saat bulan berganti (pola sama
// laporan/kontinuitas-dokumen.vue) + tabel + export. TIDAK ada tombol PDF
// (:formats="['xlsx']") — keputusan klien, beda dari laporan lain yang sudah
// di-un-cut (CLAUDE.md §8), Kasbon TIDAK ikut rekap (bukan biaya).
// Tanpa `roles`: semua role login boleh lihat (matriks §5, laporan bukan COA).
definePageMeta({ title: 'Laporan Biaya Operasional' })

interface ExpenseReportRow extends Record<string, unknown> {
  accountId: string | null
  accountCode: string | null
  accountName: string
  amount: number
  isGrandTotal?: boolean
}
interface ExpenseReportResponse {
  rows: ExpenseReportRow[]
  meta?: { title?: string, subtitle?: string }
}

const api = useApi()
const { format: rupiah } = useRupiah()

// input type="month" -> "YYYY-MM", sama persis bentuk query BE.
const month = ref(new Date().toISOString().slice(0, 7))

const rows = ref<ExpenseReportRow[]>([])
const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function load() {
  if (!month.value) return
  status.value = 'pending'
  errorMessage.value = ''
  try {
    const res = await api.get<ExpenseReportResponse>('/reports/operational-expenses', { month: month.value })
    rows.value = res.rows
    status.value = 'success'
  } catch (err) {
    rows.value = []
    status.value = 'error'
    errorMessage.value = getErrorMessage(err, 'Gagal memuat laporan.')
  }
}

watch(month, load, { immediate: true })

const columns: Column<ExpenseReportRow>[] = [
  { key: 'accountName', label: 'Nama Biaya' },
  { key: 'amount', label: 'Jumlah', align: 'right', format: v => rupiah(v as number, { bare: true }) }
]

function rowClass(row: ExpenseReportRow): string {
  return row.isGrandTotal ? 'font-semibold border-t-2 border-default' : ''
}

const fileNamePrefix = computed(() => `laporan-biaya-operasional-${month.value}`)
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader description="Rekap biaya operasional per akun untuk satu bulan — Kasbon/Piutang Karyawan tidak ikut, itu bukan biaya.">
      <ExportButton
        v-if="rows.length > 0"
        endpoint="/reports/operational-expenses"
        :file-name-prefix="fileNamePrefix"
        :filters="() => ({ month })"
        :formats="['xlsx']"
      />
    </PageHeader>

    <UFormField label="Bulan">
      <UInput
        v-model="month"
        type="month"
        class="w-40"
      />
    </UFormField>

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
      :searchable="false"
      empty-text="Belum ada biaya operasional pada bulan ini."
      :row-class="rowClass"
    />
  </div>
</template>
