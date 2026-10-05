<script setup lang="ts">
// Nota Retur Pembelian -- BEDA dari nota Mutasi Gudang: dokumen sisi
// pembelian (seperti Faktur Pembelian), jadi MEMUAT rupiah + 3 baris tanda
// tangan (CLAUDE.md §6 "Nota pembelian memuat tiga baris tanda tangan") dan
// pagination "Hal. X/Y" di atas 14 baris (§6) -- keduanya TIDAK ADA di nota
// Mutasi Gudang (qty-only, tanpa rupiah/tanda tangan).
//
// "Dicetak oleh/pada" di footer HANYA timestamp sisi klien -- audit cetak
// sungguhan (print_count/printed_at) ditulis lewat POST .../print di halaman
// detail, bukan di sini (mencetak ulang di sini TIDAK memanggil endpoint itu,
// pola sama nota Mutasi Gudang/Faktur Pembelian).
definePageMeta({ layout: 'print', roles: ['MASTER', 'OPERATOR'] })

const PAGE_SIZE = 14

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
  returnDate: string
  supplierId: string
  unitMode: 'BESAR' | 'KECIL'
  settlementType: 'REDUCE_INVOICE' | 'CASH'
  subtotalAgreedAmount: string
  totalCostBasis: string
  differenceAmount: string
  revisionNumber: number
  postingStatus: 'POSTED' | 'VOIDED'
  notes: string | null
  lines: ReturnLine[]
}
interface Setting { key: string, value: string }

const route = useRoute()
const router = useRouter()
const api = useApi()
const { user } = useAuth()
const { format: rupiah } = useRupiah()
const { format: qtyFmt } = useQty()
const { loadSupplierMap, loadProductMap } = usePurchaseReturnLookups()

const purchaseReturn = ref<ReturnDetail | null>(null)
const supplierMap = ref(new Map<string, { displayCode: string, name: string }>())
const productMap = ref(new Map<string, { displayName: string, code: string }>())
const store = ref<Record<string, string>>({})
const printedAt = ref('')
const loading = ref(true)
const loadError = ref('')

onMounted(async () => {
  try {
    const [detail, suppliers, products] = await Promise.all([
      api.get<ReturnDetail>(`/purchase-returns/${route.params.id}`),
      loadSupplierMap(),
      loadProductMap()
    ])
    purchaseReturn.value = detail
    supplierMap.value = suppliers
    productMap.value = products
    // GET /settings adalah MASTER-only (CLAUDE.md §5) -- Operator (paling
    // sering mencetak nota) akan 403 di sini. Gagal senyap (header toko
    // kosong) daripada mematikan seluruh nota, pola sama gudang/mutasi/cetak.vue.
    try {
      const settings = await api.get<Setting[]>('/settings')
      store.value = Object.fromEntries(settings.map(s => [s.key, s.value]))
    } catch {
      store.value = {}
    }
    printedAt.value = new Date().toLocaleString('id-ID')
  } catch (err) {
    loadError.value = getErrorMessage(err, 'Gagal memuat data retur.')
  } finally {
    loading.value = false
  }
})

const SETTLEMENT_LABEL: Record<string, string> = {
  REDUCE_INVOICE: 'Kurangi Hutang',
  CASH: 'Tunai'
}
const UNIT_MODE_LABEL: Record<string, string> = {
  BESAR: 'Satuan Besar',
  KECIL: 'Satuan Kecil'
}

const supplierLabel = computed(() => {
  if (!purchaseReturn.value) return '-'
  const s = supplierMap.value.get(purchaseReturn.value.supplierId)
  return s ? `${s.displayCode} - ${s.name}` : '-'
})

function productName(id: string): string {
  return productMap.value.get(id)?.displayName ?? id
}

// Pagination -- avg 2-7 SKU di lapangan, praktis selalu 1 halaman, tapi
// aturan §6 berlaku untuk semua dokumen cetak tanpa terkecuali.
const pages = computed<ReturnLine[][]>(() => {
  const lines = purchaseReturn.value?.lines ?? []
  if (lines.length === 0) return [[]]
  const result: ReturnLine[][] = []
  for (let i = 0; i < lines.length; i += PAGE_SIZE) {
    result.push(lines.slice(i, i + PAGE_SIZE))
  }
  return result
})

function triggerPrint() {
  window.print()
}
</script>

<template>
  <div class="p-4">
    <div class="print:hidden flex items-center gap-2 mb-4">
      <UButton
        icon="i-lucide-printer"
        :disabled="loading || !!loadError"
        @click="triggerPrint"
      >
        Cetak
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-arrow-left"
        @click="router.back()"
      >
        Keluar
      </UButton>
    </div>

    <p
      v-if="loading"
      class="print:hidden text-sm text-muted"
    >
      Memuat...
    </p>
    <p
      v-else-if="loadError"
      class="print:hidden text-sm text-error"
    >
      {{ loadError }}
    </p>

    <template v-else-if="purchaseReturn">
      <div
        v-for="(pageLines, pageIndex) in pages"
        :key="pageIndex"
        class="mx-auto"
        style="width: 210mm"
        :style="pageIndex > 0 ? { pageBreakBefore: 'always' } : {}"
      >
        <div
          v-for="copy in 2"
          :key="copy"
          class="p-6 flex flex-col gap-3"
          style="height: 148.5mm"
          :class="{ 'border-t border-dashed border-neutral-400': copy === 2 }"
        >
          <div class="text-center">
            <p
              v-if="store.store_name"
              class="font-bold text-lg"
            >
              {{ store.store_name }}
            </p>
            <p
              v-if="store.store_city"
              class="text-sm"
            >
              {{ store.store_city }}
            </p>
            <p
              v-if="store.store_phone"
              class="text-sm"
            >
              {{ store.store_phone }}
            </p>
          </div>

          <div class="flex items-center justify-between text-sm border-y border-neutral-400 py-1">
            <span class="font-semibold">
              RETUR PEMBELIAN
              <span
                v-if="purchaseReturn.postingStatus === 'VOIDED'"
                class="text-error"
              >(VOID)</span>
            </span>
            <span class="font-mono">
              {{ purchaseReturn.returnNumber }}
              <span v-if="purchaseReturn.revisionNumber > 0"> (Revisi {{ purchaseReturn.revisionNumber }})</span>
            </span>
          </div>

          <div class="grid grid-cols-2 text-sm gap-x-4">
            <span>Tanggal: {{ formatDate(purchaseReturn.returnDate) }}</span>
            <span>Supplier: {{ supplierLabel }}</span>
            <span>Satuan: {{ UNIT_MODE_LABEL[purchaseReturn.unitMode] }}</span>
            <span>Penyelesaian: {{ SETTLEMENT_LABEL[purchaseReturn.settlementType] }}</span>
          </div>
          <div
            v-if="pages.length > 1"
            class="text-xs text-right text-neutral-500"
          >
            Hal. {{ pageIndex + 1 }}/{{ pages.length }}
          </div>

          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-y border-neutral-400">
                <th class="text-left py-1 w-8">
                  No
                </th>
                <th class="text-left py-1">
                  Produk
                </th>
                <th class="text-right py-1">
                  Qty
                </th>
                <th class="text-right py-1">
                  Harga Retur
                </th>
                <th class="text-right py-1">
                  Nilai Retur
                </th>
                <th class="text-right py-1">
                  Harga Pokok
                </th>
                <th class="text-right py-1">
                  Selisih
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(line, i) in pageLines"
                :key="line.id"
                class="border-b border-neutral-200"
              >
                <td class="py-1">
                  {{ pageIndex * PAGE_SIZE + i + 1 }}
                </td>
                <td class="py-1">
                  {{ productName(line.productId) }}
                </td>
                <td class="py-1 text-right">
                  {{ qtyFmt(Number(line.qtyInput)) }}
                </td>
                <td class="py-1 text-right">
                  {{ rupiah(Number(line.agreedUnitPrice)) }}
                </td>
                <td class="py-1 text-right">
                  {{ rupiah(Number(line.agreedAmount)) }}
                </td>
                <td class="py-1 text-right">
                  {{ rupiah(Number(line.costBasisAmount)) }}
                </td>
                <td class="py-1 text-right">
                  {{ rupiah(Number(line.agreedAmount) - Number(line.costBasisAmount)) }}
                </td>
              </tr>
            </tbody>
          </table>

          <template v-if="pageIndex === pages.length - 1">
            <div class="flex flex-col items-end text-sm gap-0.5">
              <span>Subtotal Nilai Retur: {{ rupiah(Number(purchaseReturn.subtotalAgreedAmount)) }}</span>
              <span>Harga Pokok: {{ rupiah(Number(purchaseReturn.totalCostBasis)) }}</span>
              <span class="font-semibold">
                {{ Number(purchaseReturn.differenceAmount) >= 0 ? 'Selisih (Untung)' : 'Selisih (Rugi)' }}:
                {{ rupiah(Number(purchaseReturn.differenceAmount)) }}
              </span>
            </div>

            <p
              v-if="purchaseReturn.notes"
              class="text-sm"
            >
              Catatan: {{ purchaseReturn.notes }}
            </p>

            <div class="grid grid-cols-3 gap-4 text-sm text-center mt-2">
              <div class="flex flex-col gap-8">
                <span>Dibuat</span>
                <span class="border-t border-neutral-400 pt-1">( &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; )</span>
              </div>
              <div class="flex flex-col gap-8">
                <span>Diterima</span>
                <span class="border-t border-neutral-400 pt-1">( &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; )</span>
              </div>
              <div class="flex flex-col gap-8">
                <span>Diketahui</span>
                <span class="border-t border-neutral-400 pt-1">( &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; )</span>
              </div>
            </div>
          </template>

          <p class="mt-auto text-xs text-neutral-500 text-right">
            CETAK : {{ user?.fullName ?? '-' }} - {{ printedAt }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
