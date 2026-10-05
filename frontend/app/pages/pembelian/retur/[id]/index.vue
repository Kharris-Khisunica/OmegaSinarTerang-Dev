<script setup lang="ts">
import type { ProductLookup, SupplierLookup } from '~/composables/usePurchaseReturnLookups'

definePageMeta({ title: 'Detail Retur Pembelian', roles: ['MASTER', 'OPERATOR'] })

type PostingStatus = 'POSTED' | 'VOIDED'
type PrintStatus = 'NOT_PRINTED' | 'PRINTED' | 'PRINT_CANCELLED'

interface ReturnLine {
  id: string
  productId: string
  qtyInput: string
  agreedUnitPrice: string
  agreedAmount: string
  costBasisUnitCost: string
  costBasisAmount: string
}

interface ReturnDetail {
  id: string
  returnNumber: string
  supplierId: string
  returnDate: string
  unitMode: 'BESAR' | 'KECIL'
  settlementType: 'REDUCE_INVOICE' | 'CASH'
  subtotalAgreedAmount: string
  totalCostBasis: string
  differenceAmount: string
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
const { loadSupplierMap, loadProductMap } = usePurchaseReturnLookups()

const returnId = route.params.id as string

const purchaseReturn = ref<ReturnDetail | null>(null)
const loading = ref(true)
const loadError = ref('')
const supplierMap = ref<Map<string, SupplierLookup>>(new Map())
const productMap = ref<Map<string, ProductLookup>>(new Map())

async function loadReturn() {
  purchaseReturn.value = await api.get<ReturnDetail>(`/purchase-returns/${returnId}`)
}

onMounted(async () => {
  try {
    const [, suppliers, products] = await Promise.all([
      loadReturn(),
      loadSupplierMap(),
      loadProductMap()
    ])
    supplierMap.value = suppliers
    productMap.value = products
  } catch (err) {
    loadError.value = getErrorMessage(err, 'Gagal memuat detail retur.')
  } finally {
    loading.value = false
  }
})

function supplierLabel(id: string): string {
  const s = supplierMap.value.get(id)
  return s ? `${s.displayCode} - ${s.name}` : '-'
}
function productLabel(id: string): string {
  const p = productMap.value.get(id)
  return p ? `${p.displayName} (${p.code})` : id
}

const SETTLEMENT_LABEL: Record<string, string> = {
  REDUCE_INVOICE: 'Kurangi Hutang',
  CASH: 'Tunai'
}
const UNIT_MODE_LABEL: Record<string, string> = {
  BESAR: 'Satuan Besar',
  KECIL: 'Satuan Kecil'
}

// --- Cetak (bebas, tanpa izin -- CLAUDE.md §2.16) ---------------------------
const printLoading = ref(false)
const actionError = ref('')

async function handlePrint() {
  actionError.value = ''
  printLoading.value = true
  try {
    await api.post(`/purchase-returns/${returnId}/print`)
    await loadReturn()
  } catch (err) {
    actionError.value = getErrorMessage(err, 'Gagal mencetak retur.')
  } finally {
    printLoading.value = false
  }
}

// --- Edit/VOID: belum ada endpoint backend untuk Retur Pembelian (sengaja
// ditunda, pola sama warehouse_mutations Hari 13) -- DocumentActions tetap
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
        to="/pembelian/retur"
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
      v-else-if="purchaseReturn"
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
        description="Ubah/VOID retur pembelian belum didukung."
        :close-button="{ icon: 'i-lucide-x', color: 'neutral', variant: 'link' }"
        @update:open="unsupportedNotice = false"
      />

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div class="flex flex-col gap-1">
            <span class="font-mono text-lg font-semibold">{{ purchaseReturn.returnNumber }}</span>
            <span
              v-if="purchaseReturn.revisionNumber > 0"
              class="text-xs text-muted"
            >Revisi {{ purchaseReturn.revisionNumber }}</span>
          </div>
          <DocumentActions
            :posting-status="purchaseReturn.postingStatus"
            :print-status="purchaseReturn.printStatus"
            :print-loading="printLoading"
            @print="handlePrint"
            @edit="showUnsupportedNotice"
            @void="showUnsupportedNotice"
            @unlock-print="showUnsupportedNotice"
          />
        </div>

        <DocumentStatusBadges
          :posting-status="purchaseReturn.postingStatus"
          :print-status="purchaseReturn.printStatus"
        />

        <div class="text-sm text-muted">
          {{ supplierLabel(purchaseReturn.supplierId) }} · {{ formatDate(purchaseReturn.returnDate) }}
        </div>
        <div class="text-sm text-muted">
          {{ UNIT_MODE_LABEL[purchaseReturn.unitMode] }} · {{ SETTLEMENT_LABEL[purchaseReturn.settlementType] }}
        </div>
        <div
          v-if="purchaseReturn.notes"
          class="text-sm"
        >
          {{ purchaseReturn.notes }}
        </div>
      </div>

      <DataTable
        :rows="purchaseReturn.lines as unknown as Record<string, unknown>[]"
        :columns="[
          { key: 'productId', label: 'Produk', format: (v: unknown) => productLabel(v as string) },
          { key: 'qtyInput', label: 'Qty', format: (v: unknown) => qtyFmt(Number(v)) },
          { key: 'agreedUnitPrice', label: 'Nilai Retur / Satuan', align: 'right', format: (v: unknown) => rupiah(Number(v), { bare: true }) },
          { key: 'agreedAmount', label: 'Nilai Retur', align: 'right', format: (v: unknown) => rupiah(Number(v), { bare: true }) },
          { key: 'costBasisUnitCost', label: 'Harga Pokok / Satuan', align: 'right', format: (v: unknown) => rupiah(Number(v), { bare: true }) },
          { key: 'costBasisAmount', label: 'Harga Pokok', align: 'right', format: (v: unknown) => rupiah(Number(v), { bare: true }) }
        ]"
        dense
        zebra
        :searchable="false"
      />

      <div class="flex flex-col gap-1 text-sm max-w-xs ml-auto">
        <div class="flex justify-between">
          <span class="text-muted">Subtotal Nilai Retur</span>
          <span>{{ rupiah(Number(purchaseReturn.subtotalAgreedAmount)) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Harga Pokok</span>
          <span>{{ rupiah(Number(purchaseReturn.totalCostBasis)) }}</span>
        </div>
        <div class="flex justify-between font-semibold text-base border-t border-default pt-1">
          <span>Selisih</span>
          <span :class="Number(purchaseReturn.differenceAmount) >= 0 ? 'text-success' : 'text-error'">
            {{ rupiah(Number(purchaseReturn.differenceAmount)) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
