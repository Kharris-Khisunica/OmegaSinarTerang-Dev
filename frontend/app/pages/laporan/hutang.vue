<script setup lang="ts">
import type { Column } from '~/types/data-table'

// Laporan Hutang / Umur Hutang (Hari 30, CLAUDE.md §0). BE
// GET /reports/payables-aging -- snapshot saat ini. BEDA dari Piutang:
// journal_entry_lines TIDAK punya supplier_id, jadi totalnya bersumber dari
// purchase_invoices + payments lewat PaymentsService (logika sama layar
// Pembayaran), BUKAN breakdown buku besar. Umur dihitung dari due_date.
//
// Header kolom bucket dibentuk BE dari settings.aging_bucket_days dan
// dikirim apa adanya di `columns` -- TIDAK ada teks "30 hari" manual di sini.
definePageMeta({ title: 'Laporan Hutang' })

interface AgingRow extends Record<string, unknown> {
  partyId: string | null
  partyCode: string | null
  partyName: string
  bucket1: number
  bucket2: number
  bucket3: number
  bucket4: number
  total: number
  isGrandTotal?: boolean
}

interface AgingDetailRow extends Record<string, unknown> {
  partyId: string
  invoiceId: string
  invoiceNumber: string
  dueDate: string
  bucketIndex: number
  amount: number
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
    response.value = await api.get<AgingResponse>('/reports/payables-aging')
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
  navigateTo(`/pembelian/faktur/${row.invoiceId}`)
}
const detailColumns: Column<AgingDetailRow>[] = [
  { key: 'invoiceNumber', label: 'No. Faktur', mono: true },
  { key: 'dueDate', label: 'Jatuh Tempo', format: v => ddmmyyyy(v as string) },
  { key: 'amount', label: 'Sisa Hutang', align: 'right', format: v => rupiah(v as number, { bare: true }) }
]

const fileNamePrefix = computed(() => `laporan-hutang-${new Date().toISOString().slice(0, 10)}`)
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader description="Umur hutang per supplier dari faktur pembelian terbuka, dihitung dari jatuh tempo. Klik baris supplier untuk melihat faktur pembentuknya.">
      <ExportButton
        v-if="response && response.rows.length > 0"
        endpoint="/reports/payables-aging"
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
        search-placeholder="Cari supplier..."
        empty-text="< Tidak Ada Data Untuk Ditampilkan >"
        :row-class="rowClass"
        :on-row-click="onRowClick"
      />

      <div
        v-if="selectedPartyId"
        class="flex flex-col gap-2 border-t border-default pt-4"
      >
        <h3 class="text-sm font-semibold">
          Rincian Hutang — {{ selectedPartyName }}
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
