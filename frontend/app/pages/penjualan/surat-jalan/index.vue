<script setup lang="ts">
import type { Column, FilterDef } from '~/types/data-table'
import type { CustomerLookup, SalesmanLookup, VehicleLookup } from '~/composables/useSalesInvoiceLookups'

// Daftar Surat Jalan (Hari 25 FE, BE Hari 24/25). TIDAK ADA tombol "Entri" —
// SJ hanya terbentuk DARI faktur penjualan bersaluran PENGIRIMAN (tombol
// "Buat Surat Jalan" di detail faktur, Hari 24), bukan dari halaman ini.
// Daftar "belum terkirim" (CLAUDE.md §0.1) DIPAKAI ULANG lewat filter
// deliveryStatus=POSTPONED di bawah -- tidak ada endpoint/halaman terpisah.
definePageMeta({ title: 'Surat Jalan', roles: ['MASTER', 'OPERATOR'] })

type DeliveryStatus = 'PENDING' | 'DELIVERED' | 'POSTPONED' | 'RETURNED'

interface DeliveryOrderRow extends Record<string, unknown> {
  id: string
  deliveryNumber: string
  deliveryDate: string
  customerId: string
  salesmanId: string
  vehicleId: string
  deliveryStatus: DeliveryStatus
  postingStatus: 'POSTED' | 'VOIDED'
  printStatus: 'NOT_PRINTED' | 'PRINTED' | 'PRINT_CANCELLED'
  createdAt: string
}

const { loadCustomerMap, loadSalesmanMap, loadVehicleMap } = useSalesInvoiceLookups()

const customerMap = ref<Map<string, CustomerLookup>>(new Map())
const salesmanMap = ref<Map<string, SalesmanLookup>>(new Map())
const vehicleMap = ref<Map<string, VehicleLookup>>(new Map())

async function loadAllOptions() {
  const [customers, salesmen, vehicles] = await Promise.all([
    loadCustomerMap(), loadSalesmanMap(), loadVehicleMap()
  ])
  customerMap.value = customers
  salesmanMap.value = salesmen
  vehicleMap.value = vehicles
}

function customerLabel(id: string): string {
  const c = customerMap.value.get(id)
  return c ? `${c.code} - ${c.name}` : '-'
}
function salesmanLabel(id: string): string {
  return salesmanMap.value.get(id)?.name ?? '-'
}
function vehicleLabel(id: string): string {
  return vehicleMap.value.get(id)?.name ?? '-'
}

// dd-MM-yyyy (PANDUAN_UI.md §10) -- pola sama modul transaksi lain.
function ddmmyyyy(value: string | null | undefined): string {
  return formatDate(value).split('/').join('-')
}
function ddmmyyyyHm(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${ddmmyyyy(value.slice(0, 10))} ( ${hh}:${mm} )`
}

const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  PENDING: 'Menunggu Kirim',
  DELIVERED: 'Terkirim',
  POSTPONED: 'Belum Terkirim',
  RETURNED: 'Dibawa Balik'
}
const DELIVERY_STATUS_COLOR: Record<DeliveryStatus, 'neutral' | 'success' | 'warning' | 'error'> = {
  PENDING: 'neutral',
  DELIVERED: 'success',
  POSTPONED: 'warning',
  RETURNED: 'error'
}

const table = ref()
const selectedRow = ref<DeliveryOrderRow | null>(null)

const columns: Column<DeliveryOrderRow>[] = [
  { key: 'deliveryNumber', label: 'No. SJ', mono: true },
  { key: 'deliveryDate', label: 'Tgl Kirim', format: v => ddmmyyyy(v as string) },
  { key: 'customerId', label: 'Pelanggan', format: v => customerLabel(v as string) },
  { key: 'salesmanId', label: 'Salesman', format: v => salesmanLabel(v as string) },
  { key: 'vehicleId', label: 'Kendaraan', format: v => vehicleLabel(v as string) },
  { key: 'deliveryStatus', label: 'Status Kirim', align: 'center', slot: 'deliveryStatus' },
  { key: 'printStatus', label: 'P', align: 'center', slot: 'printCheck' },
  { key: 'createdAt', label: 'Waktu', format: v => ddmmyyyyHm(v as string) }
]

// Daftar "belum terkirim" (CLAUDE.md §0.1: "inilah yang dilihat orang toko
// keesokan harinya") -- pilih "Belum Terkirim" di filter ini, DIPAKAI ULANG
// dari GET /delivery-orders?deliveryStatus=POSTPONED, bukan halaman terpisah.
const filters: FilterDef[] = [
  {
    key: 'deliveryStatus',
    label: 'Status Kirim',
    type: 'select',
    options: (Object.keys(DELIVERY_STATUS_LABEL) as DeliveryStatus[]).map(v => ({
      label: DELIVERY_STATUS_LABEL[v],
      value: v
    }))
  }
]

function onRowClick(row: DeliveryOrderRow) {
  selectedRow.value = row
}
function goToDetailSelected() {
  if (selectedRow.value) navigateTo(`/penjualan/surat-jalan/${selectedRow.value.id}`)
}

onMounted(loadAllOptions)
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader />

    <UAlert
      icon="i-lucide-info"
      color="neutral"
      variant="subtle"
      title="Surat Jalan dibuat dari Faktur Penjualan bersaluran Pengiriman."
      :description="'Tidak ada entri langsung di sini -- pilih faktur bersaluran Pengiriman lalu pakai aksi “Buat Surat Jalan”.'"
    >
      <template #actions>
        <UButton
          to="/penjualan/faktur"
          color="neutral"
          variant="subtle"
          icon="i-lucide-arrow-right"
          size="xs"
        >
          Ke Faktur Penjualan
        </UButton>
      </template>
    </UAlert>

    <DataTable
      ref="table"
      endpoint="/delivery-orders"
      :columns="columns"
      :filters="filters"
      :on-row-click="onRowClick"
      selectable
      dense
      zebra
      search-placeholder="Cari nomor surat jalan..."
      :default-sort="{ key: 'deliveryDate', dir: 'desc' }"
    >
      <template #toolbar>
        <div class="flex items-center gap-1">
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            @click="table?.reload()"
          >
            Refresh
          </UButton>
          <UButton
            icon="i-lucide-printer"
            color="neutral"
            variant="subtle"
            :disabled="!selectedRow"
            @click="goToDetailSelected"
          >
            Cetak
          </UButton>
          <UButton
            icon="i-lucide-lock-open"
            color="neutral"
            variant="subtle"
            :disabled="!selectedRow"
            @click="goToDetailSelected"
          >
            Batal Cetak
          </UButton>
          <UButton
            icon="i-lucide-eye"
            color="neutral"
            variant="ghost"
            :disabled="!selectedRow"
            @click="goToDetailSelected"
          >
            View Detail
          </UButton>
        </div>
      </template>
      <template #deliveryStatus="{ value }">
        <UBadge
          :color="DELIVERY_STATUS_COLOR[value as DeliveryStatus]"
          variant="subtle"
        >
          {{ DELIVERY_STATUS_LABEL[value as DeliveryStatus] }}
        </UBadge>
      </template>
      <template #printCheck="{ value }">
        <UCheckbox
          :model-value="value === 'PRINTED' || value === 'PRINT_CANCELLED'"
          disabled
        />
      </template>
    </DataTable>
  </div>
</template>
