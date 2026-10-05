<script setup lang="ts">
import type { Column } from '~/types/data-table'

// Laporan Piutang / Umur Piutang (Hari 30, CLAUDE.md §0). BE
// GET /reports/receivables-aging -- snapshot saat ini (tanpa filter periode,
// pola sama /reports/stock). Total per pelanggan direkonsiliasi ke buku besar
// (journal_entry_lines.customer_id), BUKAN dihitung ulang dari sales_invoices
// -- pelanggan ber-akun piutang custom tetap muncul karena BE menyaring lewat
// flag is_receivable_account, bukan satu account_id default.
//
// Header kolom bucket ("1-30", "31-60", dst) dibentuk BE dari
// settings.aging_bucket_days dan dikirim apa adanya di `columns` -- TIDAK ada
// teks "30 hari" ditulis manual di sini.
definePageMeta({ title: 'Laporan Piutang' })

interface AgingRow extends Record<string, unknown> {
  partyId: string | null
  partyCode: string | null
  partyName: string
  arAccountCode: string | null
  bucket1: number
  bucket2: number
  bucket3: number
  bucket4: number
  total: number
  isGrandTotal?: boolean
}

interface AgingDetailRow extends Record<string, unknown> {
  partyId: string
  invoiceId: string | null
  invoiceNumber: string | null
  refDate: string
  bucketIndex: number
  amount: number
  sourceLabel: string
}

interface RawColumn { key: string, label: string }

interface AgingResponse {
  rows: AgingRow[]
  columns: RawColumn[]
  meta?: { title?: string, subtitle?: string }
  detail: AgingDetailRow[]
  bucketDays: number
}

const NUMERIC_KEYS = new Set(['bucket1', 'bucket2', 'bucket3', 'bucket4', 'total'])

const api = useApi()
const { format: rupiah } = useRupiah()

const response = ref<AgingResponse | null>(null)
const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function load() {
  status.value = 'pending'
  errorMessage.value = ''
  try {
    response.value = await api.get<AgingResponse>('/reports/receivables-aging')
    status.value = 'success'
  } catch (err) {
    response.value = null
    status.value = 'error'
    errorMessage.value = getErrorMessage(err, 'Gagal memuat laporan.')
  }
}
onMounted(load)

const columns = computed<Column<AgingRow>[]>(() =>
  (response.value?.columns ?? []).map(c => ({
    key: c.key,
    label: c.label,
    align: NUMERIC_KEYS.has(c.key) ? 'right' : 'left',
    format: NUMERIC_KEYS.has(c.key) ? (v: unknown) => rupiah(v as number, { bare: true }) : undefined
  }))
)

function rowClass(row: AgingRow): string {
  return row.isGrandTotal ? 'font-bold border-t-2 border-default' : ''
}

// Klik baris pelanggan -> tampilkan rincian faktur pembentuknya di bawah
// (DoD "angka bisa diklik sampai ke dokumen sumbernya"). GRAND TOTAL tidak
// menunjuk satu pelanggan -- tidak dipilih.
const selectedPartyId = ref<string | null>(null)
const selectedPartyName = ref<string>('')
function onRowClick(row: AgingRow) {
  if (row.isGrandTotal || !row.partyId) return
  selectedPartyId.value = row.partyId
  selectedPartyName.value = row.partyName
}
const detailRows = computed(() =>
  (response.value?.detail ?? []).filter(d => d.partyId === selectedPartyId.value)
)
function ddmmyyyy(value: string): string {
  return formatDate(value)
}
function onDetailRowClick(row: AgingDetailRow) {
  if (row.invoiceId) navigateTo(`/penjualan/faktur/${row.invoiceId}`)
}
const detailColumns: Column<AgingDetailRow>[] = [
  { key: 'refDate', label: 'Tanggal', format: v => ddmmyyyy(v as string) },
  { key: 'sourceLabel', label: 'Sumber' },
  { key: 'invoiceNumber', label: 'No. Faktur', mono: true, format: v => (v as string | null) ?? '-' },
  { key: 'amount', label: 'Jumlah', align: 'right', format: v => rupiah(v as number, { bare: true }) }
]

const fileNamePrefix = computed(() => `laporan-piutang-${new Date().toISOString().slice(0, 10)}`)
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader description="Umur piutang per pelanggan, direkonsiliasi ke buku besar. Klik baris pelanggan untuk melihat faktur pembentuknya.">
      <ExportButton
        v-if="response && response.rows.length > 0"
        endpoint="/reports/receivables-aging"
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
    <template v-else-if="response">
      <DataTable
        :rows="response.rows"
        :columns="columns"
        dense
        zebra
        search-placeholder="Cari pelanggan..."
        empty-text="< Tidak Ada Data Untuk Ditampilkan >"
        :row-class="rowClass"
        :on-row-click="onRowClick"
      />

      <div
        v-if="selectedPartyId"
        class="flex flex-col gap-2 border-t border-default pt-4"
      >
        <h3 class="text-sm font-semibold">
          Rincian Piutang — {{ selectedPartyName }}
        </h3>
        <DataTable
          :rows="detailRows"
          :columns="detailColumns"
          dense
          zebra
          :searchable="false"
          empty-text="Tidak ada rincian."
          :on-row-click="onDetailRowClick"
        />
      </div>
    </template>
  </div>
</template>
