<script setup lang="ts">
import type { CustomerLookup, ProductLookup } from '~/composables/useSalesInvoiceLookups'

definePageMeta({ title: 'Detail Retur Penjualan', roles: ['MASTER', 'OPERATOR'] })

type PostingStatus = 'POSTED' | 'VOIDED'
type PrintStatus = 'NOT_PRINTED' | 'PRINTED' | 'PRINT_CANCELLED'
type SettlementType = 'REDUCE_INVOICE' | 'CASH'

interface ReturnLine {
  id: string
  productId: string
  qtyInput: string
  unitCostFifo: string
  dppAmount: string
  costAmount: string
}

interface ReturnDetail {
  id: string
  returnNumber: string
  salesInvoiceId: string
  customerId: string
  returnDate: string
  settlementType: SettlementType
  dppAmount: string
  outputVatAmount: string
  totalAmount: string
  costBasisAmount: string
  postingStatus: PostingStatus
  printStatus: PrintStatus
  printCount: number
  revisionNumber: number
  notes: string | null
  lines: ReturnLine[]
}

const route = useRoute()
const api = useApi()
const { format: rupiah } = useRupiah()
const { format: qtyFmt } = useQty()
const { loadCustomerMap, loadProductMap } = useSalesInvoiceLookups()

const returnId = route.params.id as string

const salesReturn = ref<ReturnDetail | null>(null)
const loading = ref(true)
const loadError = ref('')
const customerMap = ref<Map<string, CustomerLookup>>(new Map())
const productMap = ref<Map<string, ProductLookup>>(new Map())

async function loadReturn() {
  salesReturn.value = await api.get<ReturnDetail>(`/sales-returns/${returnId}`)
}

onMounted(async () => {
  try {
    const [, customers, products] = await Promise.all([
      loadReturn(),
      loadCustomerMap(),
      loadProductMap()
    ])
    customerMap.value = customers
    productMap.value = products
  } catch (err) {
    loadError.value = getErrorMessage(err, 'Gagal memuat detail retur.')
  } finally {
    loading.value = false
  }
})

function customerLabel(id: string): string {
  const c = customerMap.value.get(id)
  return c ? `${c.code} - ${c.name}` : '-'
}
function productLabel(id: string): string {
  const p = productMap.value.get(id)
  return p ? `${p.displayName} (${p.code})` : id
}

const SETTLEMENT_LABEL: Record<string, string> = {
  REDUCE_INVOICE: 'Kurangi Piutang',
  CASH: 'Tunai'
}

// --- Cetak (bebas, tanpa izin -- CLAUDE.md §2.16) ---------------------------
const printLoading = ref(false)
const actionError = ref('')

async function handlePrint() {
  actionError.value = ''
  printLoading.value = true
  try {
    await api.post(`/sales-returns/${returnId}/print`)
    await loadReturn()
  } catch (err) {
    actionError.value = getErrorMessage(err, 'Gagal mencetak retur.')
  } finally {
    printLoading.value = false
  }
}

// --- Edit/VOID: belum ada endpoint backend untuk Retur Penjualan (sengaja
// ditunda, pola sama Retur Pembelian Hari 16) -- DocumentActions tetap
// menampilkan tombolnya karena postingStatus selalu POSTED, jadi diberi
// pesan eksplisit alih-alih dead click senyap.
const unsupportedNotice = ref(false)
function showUnsupportedNotice() {
  unsupportedNotice.value = true
}
</script>

<template>
  <div class="p-4 flex flex-col gap-4 max-w-4xl">
    <PageHeader>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-arrow-left"
        to="/penjualan/retur"
      >
        Keluar
      </UButton>
    </PageHeader>

    <div
      v-if="loading"
      class="flex flex-col gap-2"
    >
      <USkeleton
        v-for="i in 4"
        :key="i"
        class="h-6 w-full"
      />
    </div>

    <UEmpty
      v-else-if="loadError"
      icon="i-lucide-alert-triangle"
      title="Gagal memuat detail"
      :description="loadError"
    />

    <div
      v-else-if="salesReturn"
      class="flex flex-col gap-4"
    >
      <UAlert
        v-if="actionError"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-triangle"
        :title="actionError"
        :close-button="{ icon: 'i-lucide-x', color: 'neutral', variant: 'link' }"
        @update:open="actionError = ''"
      />
      <UAlert
        v-if="unsupportedNotice"
        color="neutral"
        variant="subtle"
        icon="i-lucide-info"
        title="Belum didukung"
        description="Ubah/VOID retur penjualan belum didukung."
        :close-button="{ icon: 'i-lucide-x', color: 'neutral', variant: 'link' }"
        @update:open="unsupportedNotice = false"
      />

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div class="flex flex-col gap-1">
            <span class="font-mono text-lg font-semibold">{{ salesReturn.returnNumber }}</span>
            <span
              v-if="salesReturn.revisionNumber > 0"
              class="text-xs text-muted"
            >Revisi {{ salesReturn.revisionNumber }}</span>
          </div>
          <DocumentActions
            :posting-status="salesReturn.postingStatus"
            :print-status="salesReturn.printStatus"
            :print-loading="printLoading"
            @print="handlePrint"
            @edit="showUnsupportedNotice"
            @void="showUnsupportedNotice"
            @unlock-print="showUnsupportedNotice"
          />
        </div>

        <DocumentStatusBadges
          :posting-status="salesReturn.postingStatus"
          :print-status="salesReturn.printStatus"
        />

        <div class="text-sm text-muted">
          {{ customerLabel(salesReturn.customerId) }} · {{ formatDate(salesReturn.returnDate) }}
        </div>
        <div class="text-sm text-muted">
          {{ SETTLEMENT_LABEL[salesReturn.settlementType] }}
          ·
          <NuxtLink
            :to="`/penjualan/faktur/${salesReturn.salesInvoiceId}`"
            class="underline"
          >
            Lihat faktur asal
          </NuxtLink>
        </div>
        <div
          v-if="salesReturn.notes"
          class="text-sm"
        >
          {{ salesReturn.notes }}
        </div>
      </div>

      <UAlert
        color="info"
        variant="subtle"
        icon="i-lucide-warehouse"
        title="Barang sudah masuk Gudang Barang Rusak (Bad Stock)"
        description="Bukan stok jual — tidak akan muncul di stok toko."
      />

      <DataTable
        :rows="salesReturn.lines as unknown as Record<string, unknown>[]"
        :columns="[
          { key: 'productId', label: 'Produk', format: (v: unknown) => productLabel(v as string) },
          { key: 'qtyInput', label: 'Qty', format: (v: unknown) => qtyFmt(Number(v)) },
          { key: 'unitCostFifo', label: 'Harga Pokok / Satuan', align: 'right', format: (v: unknown) => rupiah(Number(v), { bare: true }) },
          { key: 'dppAmount', label: 'DPP', align: 'right', format: (v: unknown) => rupiah(Number(v), { bare: true }) },
          { key: 'costAmount', label: 'Harga Pokok', align: 'right', format: (v: unknown) => rupiah(Number(v), { bare: true }) }
        ]"
        dense
        zebra
        :searchable="false"
      />

      <div class="flex flex-col gap-1 text-sm max-w-xs ml-auto">
        <div class="flex justify-between">
          <span class="text-muted">DPP</span>
          <span>{{ rupiah(Number(salesReturn.dppAmount)) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">PPN Keluaran</span>
          <span>{{ rupiah(Number(salesReturn.outputVatAmount)) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Harga Pokok</span>
          <span>{{ rupiah(Number(salesReturn.costBasisAmount)) }}</span>
        </div>
        <div class="flex justify-between font-semibold text-base border-t border-default pt-1">
          <span>TOTAL</span>
          <span>{{ rupiah(Number(salesReturn.totalAmount)) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
