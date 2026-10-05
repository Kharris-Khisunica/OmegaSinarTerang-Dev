<script setup lang="ts">
// Nota Surat Jalan -- BELUM ADA foto referensi (PANDUAN_UI.md §13.3: "SJ ...
// tidak ada di referensi. Turunkan dari §13.1"). Kepala kiri/kanan sama
// dengan Faktur Penjualan (judul+telepon toko | kota+tanggal+"Kepada Yth"+
// pelanggan), kaki sama (Hal. n/m -> CETAK : user - timestamp), TANPA rupiah
// sama sekali (CLAUDE.md §1 "nota dibawa sopir untuk menagih", bukan surat
// jalan -- larangan sama seperti §13.2 Mutasi Gudang: dilarang panggil
// useRupiah()/baca harga di berkas ini). Kolom kiri header diganti
// FAKTUR ASAL/SALESMAN/KENDARAAN (tidak ada di JL). "Agen" dan "Salesman"
// adalah orang yang sama (koreksi 26 Sep 2026) -- kolom ini dulu berlabel
// "AGEN (SOPIR)", sekarang memakai master salesmen langsung. Tanda tangan
// "Dikirim Oleh," / "Diterima Oleh," dipertahankan dari §13.1 -- pas dengan
// makna aslinya di sini (sopir mengirim, pelanggan menerima).
definePageMeta({ layout: 'print', roles: ['MASTER', 'OPERATOR'] })

const PAGE_SIZE = 14

type DeliveryStatus = 'PENDING' | 'DELIVERED' | 'POSTPONED' | 'RETURNED'
interface DeliveryOrderLine {
  id: string
  productId: string
  unitId: string
  qtyInput: string
}
interface DeliveryOrderDetail {
  id: string
  deliveryNumber: string
  deliveryDate: string
  salesInvoiceId: string
  customerId: string
  salesmanId: string
  vehicleId: string
  deliveryStatus: DeliveryStatus
  revisionNumber: number
  postingStatus: 'POSTED' | 'VOIDED'
  notes: string | null
  lines: DeliveryOrderLine[]
}
interface InvoiceRef { invoiceNumber: string }
interface Setting { key: string, value: string }

const route = useRoute()
const router = useRouter()
const api = useApi()
const { user } = useAuth()
const { format: qtyFmt } = useQty()
const { loadCustomerMap, loadProductMap, loadUnitMap, loadSalesmanMap, loadVehicleMap } = useSalesInvoiceLookups()

const deliveryOrder = ref<DeliveryOrderDetail | null>(null)
const customerMap = ref(new Map<string, { name: string, address: string | null, city: string | null, phone: string | null }>())
const productMap = ref(new Map<string, { displayName: string, code: string }>())
const unitMap = ref(new Map<string, { name: string }>())
const salesmanMap = ref(new Map<string, { name: string }>())
const vehicleMap = ref(new Map<string, { name: string }>())
const invoiceNumber = ref('-')
const store = ref<Record<string, string>>({})
const printedAt = ref('')
const loading = ref(true)
const loadError = ref('')
const printError = ref('')
const printing = ref(false)

// "06-Agu-2026" (PANDUAN_UI §13.1: "bulan disingkat").
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
function ddMonShortyyyy(value: string | null | undefined): string {
  if (!value) return ''
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return ''
  return `${String(d).padStart(2, '0')}-${MONTHS_SHORT[m - 1]}-${y}`
}

async function loadAll() {
  const [detail, customers, products, units, salesmen, vehicles] = await Promise.all([
    api.get<DeliveryOrderDetail>(`/delivery-orders/${route.params.id}`),
    loadCustomerMap(),
    loadProductMap(),
    loadUnitMap(),
    loadSalesmanMap(),
    loadVehicleMap()
  ])
  deliveryOrder.value = detail
  customerMap.value = customers
  productMap.value = products
  unitMap.value = units
  salesmanMap.value = salesmen
  vehicleMap.value = vehicles
  try {
    const invoice = await api.get<InvoiceRef>(`/sales-invoices/${detail.salesInvoiceId}`)
    invoiceNumber.value = invoice.invoiceNumber
  } catch {
    invoiceNumber.value = '-'
  }
  // GET /settings adalah MASTER-only (CLAUDE.md §5) -- Operator (paling
  // sering mencetak nota) akan 403 di sini. Gagal senyap (header toko
  // kosong) daripada mematikan seluruh nota, pola sama nota lain.
  try {
    const settings = await api.get<Setting[]>('/settings')
    store.value = Object.fromEntries(settings.map(s => [s.key, s.value]))
  } catch {
    store.value = {}
  }
}

onMounted(async () => {
  try {
    await loadAll()
  } catch (err) {
    loadError.value = getErrorMessage(err, 'Gagal memuat data surat jalan.')
  } finally {
    loading.value = false
  }
})

const customer = computed(() => (deliveryOrder.value ? customerMap.value.get(deliveryOrder.value.customerId) : undefined))
const salesmanName = computed(() => (deliveryOrder.value ? salesmanMap.value.get(deliveryOrder.value.salesmanId)?.name ?? '-' : '-'))
const vehicleName = computed(() => (deliveryOrder.value ? vehicleMap.value.get(deliveryOrder.value.vehicleId)?.name ?? '-' : '-'))

function productName(id: string): string {
  return productMap.value.get(id)?.displayName ?? id
}
function productBarcode(id: string): string {
  return productMap.value.get(id)?.code ?? '-'
}
function unitName(id: string): string {
  return unitMap.value.get(id)?.name ?? '-'
}

// Pagination §6/§13 -- muat 14 baris per halaman, lanjut "Hal. n/m" di atas itu.
const pages = computed<DeliveryOrderLine[][]>(() => {
  const lines = deliveryOrder.value?.lines ?? []
  if (lines.length === 0) return [[]]
  const result: DeliveryOrderLine[][] = []
  for (let i = 0; i < lines.length; i += PAGE_SIZE) {
    result.push(lines.slice(i, i + PAGE_SIZE))
  }
  return result
})

// Cetak ulang identik bebas tanpa izin (CLAUDE.md §2.16) -- setiap klik
// mendaftarkan print_count/printed_at (audit) BARU lalu window.print(),
// pola sama nota Faktur Penjualan/Retur Penjualan.
async function triggerPrint() {
  printError.value = ''
  printing.value = true
  try {
    await api.post(`/delivery-orders/${route.params.id}/print`)
    await loadAll()
    printedAt.value = new Date().toLocaleString('id-ID')
    window.print()
  } catch (err) {
    printError.value = getErrorMessage(err, 'Gagal mendaftarkan cetak.')
  } finally {
    printing.value = false
  }
}
</script>

<template>
  <div class="p-4">
    <div class="print:hidden flex items-center gap-2 mb-4">
      <UButton
        icon="i-lucide-printer"
        :loading="printing"
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
      <span
        v-if="printError"
        class="text-sm text-red-600"
      >{{ printError }}</span>
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
      v-else-if="deliveryOrder"
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
          class="relative p-6 flex flex-col gap-1 text-sm overflow-hidden"
          style="height: 148.5mm"
          :class="{ 'border-t border-dashed border-neutral-400': copy === 2 }"
        >
          <div
            v-if="deliveryOrder.postingStatus === 'VOIDED'"
            class="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <span
              class="text-red-600 font-black opacity-30"
              style="font-size: 90px; transform: rotate(-25deg); border: 6px solid currentColor; padding: 0 24px; letter-spacing: 8px"
            >VOID</span>
          </div>

          <div class="flex items-start justify-between">
            <div>
              <div class="font-bold text-base">
                SURAT JALAN
              </div>
              <div v-if="store.store_name">
                {{ store.store_name }}
              </div>
              <div v-if="store.store_phone">
                ( {{ store.store_phone }} )
              </div>
            </div>
            <div class="text-right">
              <div>{{ store.store_city ? `${store.store_city}, ` : '' }}{{ ddMonShortyyyy(deliveryOrder.deliveryDate) }}</div>
              <div>Kepada Yth :</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-x-4">
            <div>
              <div>
                NO. NOTA&nbsp;&nbsp;&nbsp;&nbsp;: {{ deliveryOrder.deliveryNumber }}
                <span v-if="deliveryOrder.revisionNumber > 0">( Revisi ke-{{ deliveryOrder.revisionNumber }} )</span>
              </div>
              <div>FAKTUR ASAL&nbsp;: {{ invoiceNumber }}</div>
              <div>SALESMAN&nbsp;&nbsp;&nbsp;&nbsp;: {{ salesmanName }}</div>
              <div>KENDARAAN&nbsp;&nbsp;: {{ vehicleName }}</div>
            </div>
            <div>
              <div class="font-bold">
                {{ customer?.name ?? '-' }}
              </div>
              <div v-if="customer?.address || customer?.city">
                {{ [customer?.address, customer?.city].filter(Boolean).join(', ') }}
              </div>
              <div>TEL : {{ customer?.phone ?? '' }}</div>
            </div>
          </div>

          <table class="w-full border-collapse mt-1">
            <thead>
              <tr class="border-y border-neutral-400">
                <th class="text-left py-1 w-8">
                  NO
                </th>
                <th class="text-left py-1">
                  BARCODE
                </th>
                <th class="text-left py-1">
                  NAMA PRODUK
                </th>
                <th class="text-right py-1">
                  QTY
                </th>
                <th class="text-left py-1 pl-4">
                  SATUAN
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
                <td class="py-1 font-mono">
                  {{ productBarcode(line.productId) }}
                </td>
                <td class="py-1">
                  {{ productName(line.productId) }}
                </td>
                <td class="py-1 text-right">
                  {{ qtyFmt(Number(line.qtyInput)) }}
                </td>
                <td class="py-1 pl-4">
                  {{ unitName(line.unitId) }}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="mt-auto flex items-end justify-between">
            <div class="flex gap-12">
              <div>
                <div>Dikirim Oleh,</div>
                <div class="mt-8">
                  ____________
                </div>
              </div>
              <div>
                <div>Diterima Oleh,</div>
                <div class="mt-8">
                  ____________
                </div>
              </div>
            </div>
            <div class="text-right">
              <div v-if="pages.length > 1">
                Hal. {{ pageIndex + 1 }} / {{ pages.length }}
              </div>
              <div class="text-xs text-neutral-500">
                CETAK : {{ user?.fullName ?? '-' }} - {{ printedAt || new Date().toLocaleString('id-ID') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
