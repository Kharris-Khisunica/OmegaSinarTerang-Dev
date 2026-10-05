<script setup lang="ts">
import type { Column } from '~/types/data-table'

// Penerimaan Kas (Hari 26-27) -- uang MASUK dari pelanggan, invoiceType SALES.
// Riwayat (Hari 27) + Entri (step 1+2, <PaymentAllocationForm>) di satu
// halaman, pola sama pembelian/retur/index.vue -- bedanya "Entri" di sini
// membuka UModal polos (bukan <DocumentModal>) karena isinya bukan
// dokumen+baris qty/harga, cukup pilih pihak + alokasi + metode.
definePageMeta({ title: 'Penerimaan Kas', roles: ['MASTER', 'OPERATOR'] })

interface PaymentRow extends Record<string, unknown> {
  id: string
  batchNumber: string
  paymentDate: string
  totalAmount: number
  postingStatus: 'POSTED' | 'VOIDED'
  printStatus: 'NOT_PRINTED' | 'PRINTED' | 'PRINT_CANCELLED'
  partyNames: string | null
  createdAt: string
}

const { format: rupiah } = useRupiah()

const table = ref()
const selectedRow = ref<PaymentRow | null>(null)
const entriOpen = ref(false)

const columns: Column<PaymentRow>[] = [
  { key: 'batchNumber', label: 'No. Batch', mono: true },
  { key: 'paymentDate', label: 'Tanggal', format: v => formatDate(v as string) },
  { key: 'partyNames', label: 'Diterima Dari', format: v => (v as string) || '-' },
  { key: 'totalAmount', label: 'Total', align: 'right', format: v => rupiah(v as number, { bare: true }) },
  { key: 'postingStatus', label: 'Status', align: 'center', slot: 'postingStatus' },
  { key: 'printStatus', label: 'Cetak', align: 'center', slot: 'printStatus' },
  { key: 'createdAt', label: 'Waktu', format: v => formatDate(v as string) }
]

function onRowClick(row: PaymentRow) {
  selectedRow.value = row
}
function goToDetailSelected() {
  if (selectedRow.value) navigateTo(`/kas-bank/penerimaan/${selectedRow.value.id}`)
}

function openEntri() {
  entriOpen.value = true
}
function onConfirmed(batchId: string) {
  entriOpen.value = false
  table.value?.reload()
  navigateTo(`/kas-bank/penerimaan/${batchId}`)
}
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader />

    <DataTable
      ref="table"
      endpoint="/payments"
      :static-query="{ invoiceType: 'SALES' }"
      :columns="columns"
      :on-row-click="onRowClick"
      selectable
      dense
      zebra
      search-placeholder="Cari nomor batch..."
      :default-sort="{ key: 'paymentDate', dir: 'desc' }"
    >
      <template #toolbar>
        <div class="flex items-center gap-1">
          <UButton
            icon="i-lucide-plus"
            @click="openEntri"
          >
            Entri
          </UButton>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            @click="table?.reload()"
          >
            Refresh
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
      <template #postingStatus="{ value }">
        <UBadge
          :color="value === 'VOIDED' ? 'error' : 'success'"
          variant="subtle"
        >
          {{ value === 'VOIDED' ? 'Dibatalkan' : 'Terposting' }}
        </UBadge>
      </template>
      <template #printStatus="{ value }">
        <UBadge
          :color="value === 'PRINTED' ? 'info' : value === 'PRINT_CANCELLED' ? 'warning' : 'neutral'"
          variant="subtle"
        >
          {{ value === 'PRINTED' ? 'Sudah Dicetak' : value === 'PRINT_CANCELLED' ? 'Cetak Dibatalkan' : 'Belum Dicetak' }}
        </UBadge>
      </template>
    </DataTable>

    <UModal
      v-model:open="entriOpen"
      title="Entri Penerimaan Kas"
      :ui="{ content: 'sm:max-w-4xl' }"
    >
      <template #body>
        <PaymentAllocationForm
          invoice-type="SALES"
          @confirmed="onConfirmed"
        />
      </template>
    </UModal>
  </div>
</template>
