<script setup lang="ts">
// Nota Mutasi Gudang -- HANYA qty, TIDAK PERNAH rupiah (CLAUDE.md §3 "Mutasi
// gudang": "Nota mutasi hanya mencetak qty, tanpa nilai"). Jangan pernah
// panggil useRupiah() atau baca line.unitCost di file ini.
//
// Bentuk PANDUAN_UI.md §13.2 (sumber: docs/referensi/mutasi-gudang/
// "Mutasi Gudang - Nota.jpg") -- menggantikan bentuk tebakan sebelumnya
// (blok identitas toko rata tengah + band "MUTASI GUDANG"), koreksi
// terjadwal Hari 16B.
//
// "Dicetak oleh/pada" di footer HANYA timestamp sisi klien saat halaman ini
// dibuka -- BUKAN audit cetak sungguhan (print_count/printed_at di server
// tidak pernah ditulis untuk GD -- warehouse-mutations.controller.ts tidak
// punya endpoint print sama sekali).
definePageMeta({ layout: 'print', roles: ['MASTER', 'OPERATOR'] })

const PAGE_SIZE = 14

interface MutationDetail {
  id: string
  mutationNumber: string
  mutationDate: string
  mutationType: 'TITIPAN_PELANGGAN' | 'TRANSFER'
  fromWarehouseId: string
  toWarehouseId: string
  notes: string | null
  lines: { id: string, productId: string, qtyBaseUnit: string }[]
}
interface Setting { key: string, value: string }

const route = useRoute()
const router = useRouter()
const api = useApi()
const { user } = useAuth()
const { format: qtyFmt } = useQty()
const { loadProductMap, loadWarehouseMap, loadCustomerMap } = useWarehouseMutationLookups()

const mutation = ref<MutationDetail | null>(null)
const productMap = ref(new Map<string, { displayName: string, code: string, baseUnit: string }>())
const warehouseMap = ref(new Map<string, { name: string, customerId: string | null }>())
const customerMap = ref(new Map<string, { name: string }>())
const store = ref<Record<string, string>>({})
const printedAt = ref('')
const loading = ref(true)
const loadError = ref('')

// dd-MM-yyyy (PANDUAN_UI.md §10) -- lihat catatan sama di index.vue.
function ddmmyyyy(value: string | null | undefined): string {
  return formatDate(value).split('/').join('-')
}

onMounted(async () => {
  try {
    const [detail, products, warehouses, customers] = await Promise.all([
      api.get<MutationDetail>(`/warehouse-mutations/${route.params.id}`),
      loadProductMap(),
      loadWarehouseMap(),
      loadCustomerMap()
    ])
    mutation.value = detail
    productMap.value = products
    warehouseMap.value = warehouses
    customerMap.value = customers
    // GET /settings adalah MASTER-only (CLAUDE.md §5) -- Operator (yang justru
    // paling sering mencetak nota) akan dapat 403 di sini. Gagal senyap
    // (header toko kosong, "yang kosong tidak dicetak") daripada mematikan
    // seluruh nota untuk satu baris identitas toko.
    try {
      const settings = await api.get<Setting[]>('/settings')
      store.value = Object.fromEntries(settings.map(s => [s.key, s.value]))
    } catch {
      store.value = {}
    }
    printedAt.value = new Date().toLocaleString('id-ID')
  } catch (err) {
    loadError.value = getErrorMessage(err, 'Gagal memuat data mutasi.')
  } finally {
    loading.value = false
  }
})

const fromName = computed(() => (mutation.value ? warehouseMap.value.get(mutation.value.fromWarehouseId)?.name ?? '-' : '-'))

// Titipan: nama pelanggan bersih, bukan nama gudang sintetis mentah
// ("Titipan Pelanggan - <nama>").
const toName = computed(() => {
  if (!mutation.value) return '-'
  const wh = warehouseMap.value.get(mutation.value.toWarehouseId)
  if (mutation.value.mutationType === 'TITIPAN_PELANGGAN' && wh?.customerId) {
    return customerMap.value.get(wh.customerId)?.name ?? wh.name ?? '-'
  }
  return wh?.name ?? '-'
})

function productName(id: string): string {
  return productMap.value.get(id)?.displayName ?? id
}
function productBarcode(id: string): string {
  return productMap.value.get(id)?.code ?? '-'
}
function productBaseUnit(id: string): string {
  return productMap.value.get(id)?.baseUnit ?? '-'
}

// Pagination §6/§13 -- muat 14 baris per halaman, lanjut "Hal. n/m" di atas itu.
const pages = computed<MutationDetail['lines'][]>(() => {
  const lines = mutation.value?.lines ?? []
  if (lines.length === 0) return [[]]
  const result: MutationDetail['lines'][] = []
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

    <div
      v-else-if="mutation"
      class="mx-auto"
      style="width: 210mm"
    >
      <div
        v-for="(pageLines, pageIndex) in pages"
        :key="pageIndex"
        :style="pageIndex > 0 ? { pageBreakBefore: 'always' } : {}"
      >
        <div
          v-for="copy in 2"
          :key="copy"
          class="p-6 flex flex-col gap-2 text-sm"
          style="height: 148.5mm"
          :class="{ 'border-t border-dashed border-neutral-400': copy === 2 }"
        >
          <div class="flex items-start justify-between">
            <span class="font-bold">NOTA MUTASI GD</span>
            <span class="font-mono">{{ store.store_code ?? '' }}</span>
          </div>

          <div class="grid grid-cols-2 gap-x-4">
            <span>NO. NOTA&nbsp;&nbsp;: {{ mutation.mutationNumber }}</span>
            <span>TGL. NOTA&nbsp;: {{ ddmmyyyy(mutation.mutationDate) }}</span>
          </div>
          <div>
            <span>KET.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {{ mutation.notes ?? '' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span>DARI&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {{ fromName }}&nbsp;&nbsp;&nbsp;&nbsp;KEPADA {{ toName }}</span>
            <span
              v-if="pages.length > 1"
              class="text-xs"
            >Hal. {{ pageIndex + 1 }} / {{ pages.length }}</span>
          </div>

          <table class="w-full border-collapse mt-1">
            <thead>
              <tr class="border-y border-neutral-400">
                <th class="text-left py-1 w-8">
                  NO.
                </th>
                <th class="text-left py-1">
                  BARCODE
                </th>
                <th class="text-left py-1">
                  NAMA BARANG
                </th>
                <th class="text-right py-1">
                  QTY
                </th>
                <th class="text-left py-1 pl-4">
                  SATUAN
                </th>
                <th class="text-right py-1">
                  Q.MUTASI
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
                  {{ pageIndex * PAGE_SIZE + i + 1 }}.
                </td>
                <td class="py-1 font-mono">
                  {{ productBarcode(line.productId) }}
                </td>
                <td class="py-1">
                  {{ productName(line.productId) }}
                </td>
                <td class="py-1 text-right">
                  {{ qtyFmt(Number(line.qtyBaseUnit)) }}
                </td>
                <td class="py-1 pl-4">
                  {{ productBaseUnit(line.productId) }}
                </td>
                <td class="py-1 text-right">
                  {{ qtyFmt(Number(line.qtyBaseUnit)) }}
                </td>
              </tr>
            </tbody>
          </table>

          <p class="mt-auto text-xs text-neutral-500">
            Dicetak oleh {{ user?.fullName ?? '-' }} pada {{ printedAt }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
