<script setup lang="ts">
import type { Column } from '~/types/data-table'

// Laporan Kontinuitas Nomor Dokumen (Hari 28, CLAUDE.md §2.4) — BE
// GET /reports/document-continuity?type=&year=&month= (module baru
// backend/src/modules/reports/). Tanpa `roles`: laporan terbuka semua role
// login (CLAUDE.md §5 "Laporan ✅ semua role kecuali COA", dan ini bukan COA).
//
// Bukan mode `endpoint` DataTable (itu untuk PagedResponse<T> — laporan ini
// SELALU mengembalikan seluruh baris satu periode sekaligus, bukan
// terpaginasi, karena maksud laporan justru menampilkan urutan penuh
// 0001..terakhir dalam satu pandangan). Dipakai mode data lokal (`:rows`),
// pola sama PriceHistoryPanel.vue — fetch manual lewat useApi(), search/sort
// tetap jalan client-side dari DataTable sendiri.
definePageMeta({ title: 'Laporan Kontinuitas Nomor Dokumen' })

type ContinuityStatus = 'POSTED' | 'VOIDED' | 'MISSING'

interface ContinuityRow extends Record<string, unknown> {
  seq: number
  documentNumber: string
  documentDate: string | null
  status: ContinuityStatus
  party: string | null
  amount: string | null
  voidReasonCode: string | null
  voidReasonNote: string | null
  isGap: boolean
}

interface ContinuitySummary {
  type: string
  period: string
  year: number
  month: number
  lastNumber: number
  gapCount: number
}

interface ContinuityResponse {
  rows: ContinuityRow[]
  meta?: { title?: string, subtitle?: string }
  summary: ContinuitySummary
}

// Sama persis 8 kunci + label DOCUMENT_CONTINUITY_TYPES
// (backend/src/modules/reports/document-continuity-registry.ts) — SALES_ORDER
// dan OPERATIONAL_EXPENSE sengaja tidak ada di sini (keputusan 29 Juli,
// CLAUDE.md §2.16/§3), backend menolaknya kalau tetap dikirim.
const DOC_TYPE_OPTIONS = [
  { label: 'Faktur Penjualan (JL)', value: 'SALES_INVOICE' },
  { label: 'Faktur Pembelian (B1)', value: 'PURCHASE_INVOICE' },
  { label: 'Mutasi Gudang (GD)', value: 'WAREHOUSE_MUTATION' },
  { label: 'Surat Jalan (SJ)', value: 'DELIVERY_ORDER' },
  { label: 'Retur Penjualan (RJ)', value: 'SALES_RETURN' },
  { label: 'Retur Pembelian (RB)', value: 'PURCHASE_RETURN' },
  { label: 'Pembayaran (PAY)', value: 'PAYMENT' },
  { label: 'Jurnal (JE)', value: 'JOURNAL_ENTRY' }
]

const STATUS_LABEL: Record<ContinuityStatus, string> = {
  POSTED: 'Terposting',
  VOIDED: 'Dibatalkan',
  MISSING: 'HILANG'
}
const STATUS_ICON: Record<ContinuityStatus, string> = {
  POSTED: 'i-lucide-file-check-2',
  VOIDED: 'i-lucide-ban',
  MISSING: 'i-lucide-alert-triangle'
}
// MISSING = merah (DoD "baris hilang berwarna merah") — warna paling kuat
// karena secara desain TIDAK BOLEH pernah terjadi (CLAUDE.md §2.4). VOIDED
// dapat warna berbeda (amber) supaya jelas beda kelas dari MISSING: VOID itu
// wajar/terduga, lubang tidak.
const STATUS_COLOR: Record<ContinuityStatus, 'success' | 'warning' | 'error'> = {
  POSTED: 'success',
  VOIDED: 'warning',
  MISSING: 'error'
}

const api = useApi()
const { format: rupiah } = useRupiah()

const documentType = ref('SALES_INVOICE')
// input type="month" -> "YYYY-MM". Default bulan berjalan.
const period = ref(new Date().toISOString().slice(0, 7))
const year = computed(() => Number(period.value.split('-')[0]))
const month = computed(() => Number(period.value.split('-')[1]))

const rows = ref<ContinuityRow[]>([])
const summary = ref<ContinuitySummary | null>(null)
const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function load() {
  if (!year.value || !month.value) return
  status.value = 'pending'
  errorMessage.value = ''
  try {
    const res = await api.get<ContinuityResponse>('/reports/document-continuity', {
      type: documentType.value,
      year: year.value,
      month: month.value
    })
    rows.value = res.rows
    summary.value = res.summary
    status.value = 'success'
  } catch (err) {
    rows.value = []
    summary.value = null
    status.value = 'error'
    errorMessage.value = getErrorMessage(err, 'Gagal memuat laporan.')
  }
}

watch([documentType, period], load, { immediate: true })

function ddmmyyyy(value: string | null): string {
  return value ? formatDate(value) : '-'
}

// Satu kolom "Keterangan" melayani DUA arti tergantung status (BE mengisi
// void_reason_note yang sama untuk keduanya, lihat document-continuity.service.ts):
// alasan VOID kalau status VOIDED, atau penjelasan "hilang tanpa penjelasan"
// kalau status MISSING. DoD: "Baris VOID menampilkan alasan tanpa perlu
// diklik" -- makanya ini kolom tabel biasa, bukan di balik tombol/tooltip.
function reasonText(row: ContinuityRow): string {
  if (!row.voidReasonCode && !row.voidReasonNote) return '-'
  if (row.voidReasonCode) return `${row.voidReasonCode} — ${row.voidReasonNote ?? ''}`
  return row.voidReasonNote ?? '-'
}

const columns: Column<ContinuityRow>[] = [
  { key: 'seq', label: 'No. Urut', align: 'right', width: '80px' },
  { key: 'documentNumber', label: 'Nomor Dokumen', mono: true },
  { key: 'documentDate', label: 'Tanggal', format: v => ddmmyyyy(v as string | null) },
  { key: 'status', label: 'Status', align: 'center', slot: 'statusBadge' },
  { key: 'party', label: 'Pihak', format: v => (v as string | null) ?? '-' },
  { key: 'amount', label: 'Nominal', align: 'right', format: v => rupiah(v === null ? null : Number(v), { bare: true }) },
  { key: 'voidReasonNote', label: 'Keterangan', format: (_v, row) => reasonText(row) }
]

// Row background TAMBAHAN di atas badge status (pola sama pengecekan-invoice
// menyorot baris BERMASALAH) -- supaya baris VOID/MISSING kelihatan sekilas
// tanpa perlu membaca kolom Status satu-satu (DoD "tabel menampilkan seluruh
// nomor berurutan" -- lubang & VOID harus langsung menonjol di antara yang lain).
function rowClass(row: ContinuityRow): string {
  if (row.status === 'MISSING') return 'bg-error/10'
  if (row.status === 'VOIDED') return 'bg-warning/10'
  return ''
}

const fileNamePrefix = computed(() => {
  const slug = documentType.value.toLowerCase().replace(/_/g, '-')
  return `laporan-kontinuitas-${slug}-${period.value}`
})
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader description="Setiap nomor dari 0001 sampai terakhir terbit untuk satu jenis dokumen + periode — VOID tetap tercatat dengan alasannya, nomor yang hilang ditandai merah.">
      <ExportButton
        v-if="rows.length > 0"
        endpoint="/reports/document-continuity"
        :file-name-prefix="fileNamePrefix"
        :filters="() => ({ type: documentType, year, month })"
      />
    </PageHeader>

    <div class="flex flex-wrap items-end gap-3">
      <UFormField label="Jenis Dokumen">
        <USelect
          v-model="documentType"
          :items="DOC_TYPE_OPTIONS"
          class="w-64"
        />
      </UFormField>
      <UFormField label="Periode">
        <UInput
          v-model="period"
          type="month"
          class="w-40"
        />
      </UFormField>
    </div>

    <div
      v-if="summary"
      class="flex flex-wrap items-center gap-4 text-sm text-muted"
    >
      <span>Nomor terakhir: <b class="text-default">{{ summary.lastNumber || '-' }}</b></span>
      <span :class="summary.gapCount > 0 ? 'text-error font-semibold' : ''">
        <UIcon
          v-if="summary.gapCount > 0"
          name="i-lucide-alert-triangle"
          class="size-4 align-text-bottom"
        />
        Lubang: {{ summary.gapCount }}
      </span>
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
      search-placeholder="Cari nomor dokumen atau pihak..."
      empty-text="Belum ada dokumen terbit pada periode ini."
      :row-class="rowClass"
    >
      <template #statusBadge="{ value }">
        <UBadge
          :color="STATUS_COLOR[value as ContinuityStatus]"
          :icon="STATUS_ICON[value as ContinuityStatus]"
          variant="subtle"
        >
          {{ STATUS_LABEL[value as ContinuityStatus] }}
        </UBadge>
      </template>
    </DataTable>
  </div>
</template>
