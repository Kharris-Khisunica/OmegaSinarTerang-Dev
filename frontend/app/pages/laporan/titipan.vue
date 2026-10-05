<script setup lang="ts">
import type { Column } from '~/types/data-table'

// Laporan Barang Titipan — BE GET /reports/titipan.
// Paket R8 (docs/RENCANA_REVISI_TESTING_KLIEN.md §2A K7): bentuknya BUKAN
// lagi pivot Nama Barang x Pelanggan (Hari 29) -- sekarang baris FLAT
// dikelompokkan per pelanggan PER FAKTUR: satu baris = satu (pelanggan,
// faktur, produk). Kolom TETAP 5 (Pelanggan, No. Faktur, Tanggal Faktur,
// Nama Barang, Qty Titipan), tapi tetap dibangun dari `res.columns`
// (termasuk `align`) alih-alih di-hardcode -- backend tetap satu-satunya
// sumber bentuk kolom, pola sama Hari 29, hanya heuristik align lama
// ("kolom pertama kiri, sisanya kanan", benar untuk pivot lama yang semua
// kolom sisanya numerik) sudah tidak berlaku untuk campuran teks+angka ini,
// jadi dipakai `c.align` yang dikirim backend, bukan ditebak dari index.
// Sumber datanya warehouse_mutations/warehouse_mutation_lines, BUKAN
// stock_movements (mutasi titipan sengaja tidak membuat movement).
definePageMeta({ title: 'Laporan Barang Titipan' })

interface TitipanRow extends Record<string, unknown> {
  productId: string
  displayName: string
  customerId: string
  customerName: string
  salesInvoiceId: string | null
  invoiceNumber: string | null
  invoiceDate: string | null
  qtyText: string
}

interface TitipanColumnDef {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
}

interface TitipanResponse {
  rows: TitipanRow[]
  columns: TitipanColumnDef[]
  meta?: { title?: string }
}

const api = useApi()

const rows = ref<TitipanRow[]>([])
const columns = ref<Column<TitipanRow>[]>([])
const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function load() {
  status.value = 'pending'
  errorMessage.value = ''
  try {
    const res = await api.get<TitipanResponse>('/reports/titipan')
    rows.value = res.rows
    columns.value = res.columns.map(c => ({
      key: c.key,
      label: c.label,
      align: c.align ?? 'left',
      // Nol/kosong tampil "-" (PANDUAN_UI.md §14.2) -- baris pra-R8 tanpa
      // faktur (seharusnya tidak ada lagi, lihat migration
      // AddSalesInvoiceRefToWarehouseMutations) tetap tampil rapi kalau ada.
      format: (v: unknown) => (v === null || v === undefined || v === '' ? '-' : String(v))
    } satisfies Column<TitipanRow>))
    status.value = 'success'
  } catch (err) {
    rows.value = []
    columns.value = []
    status.value = 'error'
    errorMessage.value = getErrorMessage(err, 'Gagal memuat laporan.')
  }
}

onMounted(load)

const fileNamePrefix = computed(() => `laporan-titipan-${new Date().toISOString().slice(0, 10)}`)
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader description="Barang yang sudah dibeli & dibayar pelanggan tapi belum diambil -- dikelompokkan per pelanggan per faktur (paket R8), bukan lagi per produk.">
      <ExportButton
        v-if="rows.length > 0"
        endpoint="/reports/titipan"
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
    <UEmpty
      v-else-if="rows.length === 0"
      icon="i-lucide-package-open"
      title="Tidak ada barang titipan"
      description="Belum ada pelanggan yang menitipkan barang saat ini."
    />
    <DataTable
      v-else
      :rows="rows"
      :columns="columns"
      dense
      zebra
      search-placeholder="Cari pelanggan, faktur, atau nama barang..."
      empty-text="< Tidak Ada Data Untuk Ditampilkan >"
    />
  </div>
</template>
