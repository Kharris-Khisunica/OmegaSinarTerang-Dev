<script setup lang="ts">
import type { Column } from '~/types/data-table'

// Laporan Penjualan (Hari 30, CLAUDE.md §0 -- ditunda ke pasca-MVP, dikerjakan
// sekarang atas instruksi user 03 Sep 2026, belum dikonfirmasi klien). BE
// GET /reports/sales?dateFrom=&dateTo=&groupBy=. TANPA komisi -- murni rekap
// jumlah faktur + total nilai per pelanggan/salesman, atau detail per faktur.
// Pola panel parameter §14.1 PANDUAN_UI: radio DASAR pengelompokan + filter
// periode, kepala hasil §14.2 lewat PageHeader description + baris GRAND TOTAL
// dari backend (bukan dihitung ulang di FE).
definePageMeta({ title: 'Laporan Penjualan' })

type GroupBy = 'CUSTOMER' | 'SALESMAN' | 'INVOICE'

interface SalesReportRow extends Record<string, unknown> {
  groupCode: string | null
  groupName: string
  salesmanName?: string
  invoiceDate?: string
  invoiceCount: number
  totalAmount: number
  invoiceId?: string
  isGrandTotal?: boolean
}

interface SalesmanOption {
  id: string
  code: string
  name: string
}

interface SalesReportResponse {
  rows: SalesReportRow[]
  meta?: { title?: string, subtitle?: string }
}

const GROUP_OPTIONS: { label: string, value: GroupBy }[] = [
  { label: 'Per Pelanggan', value: 'CUSTOMER' },
  { label: 'Per Salesman', value: 'SALESMAN' },
  { label: 'Detail per Faktur', value: 'INVOICE' }
]

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
function firstOfMonthIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const api = useApi()
const { format: rupiah } = useRupiah()

const groupBy = ref<GroupBy>('CUSTOMER')
const dateFrom = ref(firstOfMonthIso())
const dateTo = ref(todayIso())
// R11/L2 (20 Sep 2026) -- hanya berarti bersama groupBy=INVOICE (BE
// mengabaikannya untuk mode Rekap). Filter tetap disabled, bukan
// disembunyikan, saat mode Rekap dipilih -- pola §14.1 PANDUAN_UI.
const salesmanId = ref<string | undefined>(undefined)
const salesmanOptions = ref<{ label: string, value: string }[]>([])

const rows = ref<SalesReportRow[]>([])
const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function loadSalesmanOptions() {
  const res = await api.get<{ data: SalesmanOption[] }>('/salesmen', { limit: 200 })
  salesmanOptions.value = res.data.map(s => ({ label: `${s.code} - ${s.name}`, value: s.id }))
}

async function load() {
  if (!dateFrom.value || !dateTo.value) return
  status.value = 'pending'
  errorMessage.value = ''
  try {
    const res = await api.get<SalesReportResponse>('/reports/sales', {
      dateFrom: dateFrom.value,
      dateTo: dateTo.value,
      groupBy: groupBy.value,
      ...(groupBy.value === 'INVOICE' && salesmanId.value ? { salesmanId: salesmanId.value } : {})
    })
    rows.value = res.rows
    status.value = 'success'
  } catch (err) {
    rows.value = []
    status.value = 'error'
    errorMessage.value = getErrorMessage(err, 'Gagal memuat laporan.')
  }
}

onMounted(loadSalesmanOptions)
watch([groupBy, dateFrom, dateTo, salesmanId], load, { immediate: true })

function ddmmyyyy(value: string | undefined): string {
  return value ? formatDate(value) : '-'
}

const columns = computed<Column<SalesReportRow>[]>(() => {
  if (groupBy.value === 'INVOICE') {
    return [
      { key: 'groupCode', label: 'No. Faktur', mono: true },
      { key: 'groupName', label: 'Pelanggan' },
      { key: 'salesmanName', label: 'Salesman' },
      { key: 'invoiceDate', label: 'Tanggal', format: v => ddmmyyyy(v as string | undefined) },
      { key: 'totalAmount', label: 'Total', align: 'right', format: v => rupiah(v as number, { bare: true }) }
    ]
  }
  return [
    { key: 'groupCode', label: 'Kode', mono: true },
    { key: 'groupName', label: groupBy.value === 'CUSTOMER' ? 'Pelanggan' : 'Salesman' },
    { key: 'invoiceCount', label: 'Jml Faktur', align: 'right' },
    { key: 'totalAmount', label: 'Total', align: 'right', format: v => rupiah(v as number, { bare: true }) }
  ]
})

// Klik baris (mode Detail) -> buka faktur sumbernya (DoD "angka bisa diklik
// sampai ke dokumen sumbernya"). Mode Rekap tidak menunjuk satu faktur --
// tidak diklikkan.
function onRowClick(row: SalesReportRow) {
  if (row.invoiceId) navigateTo(`/penjualan/faktur/${row.invoiceId}`)
}

function rowClass(row: SalesReportRow): string {
  return row.isGrandTotal ? 'font-bold border-t-2 border-default' : ''
}

const fileNamePrefix = computed(() => `laporan-penjualan-${groupBy.value.toLowerCase()}-${dateFrom.value}-${dateTo.value}`)
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader description="Penjualan per periode, dikelompokkan per pelanggan atau per salesman -- murni rekap kinerja, tanpa perhitungan komisi.">
      <ExportButton
        v-if="rows.length > 0"
        endpoint="/reports/sales"
        :file-name-prefix="fileNamePrefix"
        :filters="() => ({ dateFrom, dateTo, groupBy, ...(groupBy === 'INVOICE' && salesmanId ? { salesmanId } : {}) })"
      />
    </PageHeader>

    <div class="flex flex-wrap items-end gap-3">
      <UFormField label="Dasar Pengelompokan">
        <UFieldGroup size="sm">
          <UButton
            v-for="opt in GROUP_OPTIONS"
            :key="opt.value"
            :color="groupBy === opt.value ? 'primary' : 'neutral'"
            :variant="groupBy === opt.value ? 'solid' : 'subtle'"
            @click="groupBy = opt.value"
          >
            {{ opt.label }}
          </UButton>
        </UFieldGroup>
      </UFormField>
      <UFormField label="Dari">
        <UInput
          v-model="dateFrom"
          type="date"
          class="w-40"
        />
      </UFormField>
      <UFormField label="Sampai">
        <UInput
          v-model="dateTo"
          type="date"
          class="w-40"
        />
      </UFormField>
      <UFormField label="Salesman">
        <div class="flex items-center gap-1">
          <USelect
            :model-value="salesmanId"
            :items="salesmanOptions"
            :disabled="groupBy !== 'INVOICE'"
            placeholder="Semua Salesman"
            class="w-56"
            @update:model-value="(v: string) => (salesmanId = v)"
          />
          <UButton
            v-if="salesmanId"
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Hapus filter Salesman"
            @click="salesmanId = undefined"
          />
        </div>
      </UFormField>
    </div>

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
      search-placeholder="Cari..."
      empty-text="< Tidak Ada Data Untuk Ditampilkan >"
      :row-class="rowClass"
      :on-row-click="groupBy === 'INVOICE' ? onRowClick : undefined"
    />
  </div>
</template>
