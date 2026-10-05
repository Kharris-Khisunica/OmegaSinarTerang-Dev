<script setup lang="ts">
import type { Column } from '~/types/data-table'

// Stok Opname -- worksheet (Hari 29 poin 3, ditarik maju dari Hari 32,
// CLAUDE.md §3 "Gudang": "daftar titipan wajib muncul di proses stok opname
// sebagai penjelasan selisih fisik"). BE GET /reports/stock-opname
// mengembalikan qty sistem gudang STORE + rincian titipan per pelanggan;
// angka FISIK dan SELISIH murni dihitung di sini, TIDAK dikirim ke backend
// dan TIDAK disimpan -- versi tersimpan/beraudit (dengan penyesuaian jurnal)
// tetap milik Hari 32 yang belum dibahas. Refresh halaman = worksheet
// kosong lagi, ini yang diharapkan.
//
// roles: R11/L1 (20 Sep 2026, keputusan kerja BELUM dikonfirmasi klien) --
// satu-satunya laporan yang dibatasi MASTER+SUPERVISOR, supaya operator
// tidak melihat angka sistem sebelum stok fisik dicek. Laporan lain di
// /laporan TETAP terbuka semua role (CLAUDE.md §5), jangan disamakan.
definePageMeta({ title: 'Stok Opname', roles: ['MASTER', 'SUPERVISOR'] })

interface TitipanDetailItem {
  customerName: string
  qtyText: string
}

interface OpnameApiRow extends Record<string, unknown> {
  productId: string
  code: string
  displayName: string
  baseUnit: string
  systemQtyBase: number
  systemQtyText: string
  titipanQtyBase: number
  titipanQtyText: string
  titipanDetail: TitipanDetailItem[]
}

interface OpnameRow extends OpnameApiRow {
  fisik: number | null
}

interface OpnameResponse {
  rows: OpnameApiRow[]
  meta?: { title?: string, subtitle?: string }
}

const api = useApi()
const { format: formatQty, parse: parseQty } = useQty()

const rows = ref<OpnameRow[]>([])
const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function load() {
  status.value = 'pending'
  errorMessage.value = ''
  try {
    const res = await api.get<OpnameResponse>('/reports/stock-opname')
    rows.value = res.rows.map(r => ({ ...r, fisik: null }))
    status.value = 'success'
  } catch (err) {
    rows.value = []
    status.value = 'error'
    errorMessage.value = getErrorMessage(err, 'Gagal memuat worksheet.')
  }
}

onMounted(load)

function selisihBase(row: OpnameRow): number | null {
  if (row.fisik === null) return null
  return row.fisik - row.systemQtyBase
}

function selisihText(row: OpnameRow): string {
  const s = selisihBase(row)
  if (s === null) return '-'
  const text = `${formatQty(Math.abs(s))} ${row.baseUnit}`
  if (s > 0) return `+${text}`
  if (s < 0) return `-${text}`
  return text
}

function selisihClass(row: OpnameRow): string {
  const s = selisihBase(row)
  if (s === null || s === 0) return ''
  return s > 0 ? 'text-success font-semibold' : 'text-error font-semibold'
}

const columns: Column<OpnameRow>[] = [
  { key: 'code', label: 'Kode', mono: true },
  { key: 'displayName', label: 'Nama Barang' },
  { key: 'systemQtyText', label: 'Stok Sistem (Toko)', align: 'right' },
  { key: 'titipanQtyText', label: 'Titipan (penjelas)', align: 'right', slot: 'titipan' },
  { key: 'fisik', label: 'Fisik', align: 'right', slot: 'fisik' },
  { key: 'selisih', label: 'Selisih', align: 'right', slot: 'selisih' }
]
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader description="Bandingkan hasil hitung fisik dengan stok sistem gudang Toko. Kolom Titipan menjelaskan selisih yang muncul karena barang sudah dititip pelanggan -- angka fisik & selisih di sini TIDAK disimpan, hanya untuk sesi hitung saat ini.">
      <UBadge
        color="warning"
        variant="subtle"
        icon="i-lucide-info"
      >
        Worksheet — tidak tersimpan
      </UBadge>
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
      title="Gagal memuat worksheet"
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
    >
      <template #titipan="{ row }">
        <div class="flex flex-col items-end gap-0.5">
          <span>{{ (row as OpnameRow).titipanQtyText }}</span>
          <span
            v-if="(row as OpnameRow).titipanDetail.length > 0"
            class="text-xs text-muted"
          >
            {{ (row as OpnameRow).titipanDetail.map(d => `${d.customerName}: ${d.qtyText}`).join(' · ') }}
          </span>
        </div>
      </template>
      <template #fisik="{ row }">
        <UInput
          :model-value="(row as OpnameRow).fisik === null ? '' : formatQty((row as OpnameRow).fisik)"
          placeholder="0"
          class="w-28"
          @update:model-value="(v: string) => { (row as OpnameRow).fisik = v === '' ? null : parseQty(v) }"
        >
          <template #trailing>
            <span class="text-xs text-muted">{{ (row as OpnameRow).baseUnit }}</span>
          </template>
        </UInput>
      </template>
      <template #selisih="{ row }">
        <span :class="selisihClass(row as OpnameRow)">{{ selisihText(row as OpnameRow) }}</span>
      </template>
    </DataTable>
  </div>
</template>
