<script setup lang="ts">
// Nota Faktur Penjualan -- A5 landscape, DUA salinan identik per lembar A4
// portrait (CLAUDE.md §6, pola sama gudang/mutasi/[id]/cetak.vue). Bentuk
// PANDUAN_UI.md §13.1 (sumber: docs/referensi/penjualan/"Faktur Penjualan.jpg")
// -- struktur & kata-kata ditiru dari foto, TAPI angka pakai useRupiah()/
// useQty() apa adanya (format id-ID baku, §10) -- foto sistem lama memakai
// pemisah ribuan koma yang MEMANG salah, bukan yang ditiru (catatan eksplisit
// PANDUAN_UI §13.1: "Angka memakai pemisah ribuan titik, bukan koma").
definePageMeta({ layout: 'print', roles: ['MASTER', 'OPERATOR'] })

const PAGE_SIZE = 14

interface InvoiceLine {
  id: string
  productId: string
  qtyInput: string
  unitPrice: string
  discountPercent: string | null
  discountAmount: string
  netAmount: string
}
interface InvoiceDetail {
  id: string
  invoiceNumber: string
  invoiceDate: string
  customerId: string
  salesmanId: string
  termDays: number
  dueDate: string
  totalAmount: string
  postingStatus: 'POSTED' | 'VOIDED'
  printStatus: 'NOT_PRINTED' | 'PRINTED' | 'PRINT_CANCELLED'
  revisionNumber: number
  lines: InvoiceLine[]
}
interface Setting { key: string, value: string }

const route = useRoute()
const router = useRouter()
const api = useApi()
const { user } = useAuth()
const { format: rupiah } = useRupiah()
const { format: qtyFmt } = useQty()
const { loadCustomerMap, loadProductMap, loadSalesmanMap } = useSalesInvoiceLookups()

const invoice = ref<InvoiceDetail | null>(null)
const customerMap = ref(new Map<string, { name: string, address: string | null, city: string | null, phone: string | null }>())
const productMap = ref(new Map<string, { displayName: string, code: string }>())
const salesmanMap = ref(new Map<string, { code: string }>())
const store = ref<Record<string, string>>({})
const printedAt = ref('')
const loading = ref(true)
const loadError = ref('')
const printError = ref('')
const printing = ref(false)

// dd-MM-yyyy (PANDUAN_UI.md §10) -- pola sama semua halaman cetak lain.
function ddmmyyyy(value: string | null | undefined): string {
  return formatDate(value).split('/').join('-')
}
// "06-Agu-2026" (PANDUAN_UI §13.1: "bulan disingkat").
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
function ddMonShortyyyy(value: string | null | undefined): string {
  if (!value) return ''
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return ''
  return `${String(d).padStart(2, '0')}-${MONTHS_SHORT[m - 1]}-${y}`
}

async function loadAll() {
  const [detail, customers, products, salesmen] = await Promise.all([
    api.get<InvoiceDetail>(`/sales-invoices/${route.params.id}`),
    loadCustomerMap(),
    loadProductMap(),
    loadSalesmanMap()
  ])
  invoice.value = detail
  customerMap.value = customers
  productMap.value = products
  salesmanMap.value = salesmen
  // GET /settings adalah MASTER-only (CLAUDE.md §5) -- Operator (yang justru
  // paling sering mencetak nota) akan dapat 403 di sini. Gagal senyap
  // (header toko kosong, "yang kosong tidak dicetak") daripada mematikan
  // seluruh nota untuk satu baris identitas toko -- pola sama gudang/mutasi.
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
    loadError.value = getErrorMessage(err, 'Gagal memuat data faktur.')
  } finally {
    loading.value = false
  }
})

const customer = computed(() => (invoice.value ? customerMap.value.get(invoice.value.customerId) : undefined))
const salesmanCode = computed(() => (invoice.value ? salesmanMap.value.get(invoice.value.salesmanId)?.code ?? '-' : '-'))

function productName(id: string): string {
  return productMap.value.get(id)?.displayName ?? id
}
function productBarcode(id: string): string {
  return productMap.value.get(id)?.code ?? '-'
}

// Pagination §6/§13 -- muat 14 baris per halaman, lanjut "Hal. n/m" di atas itu.
const pages = computed<InvoiceLine[][]>(() => {
  const lines = invoice.value?.lines ?? []
  if (lines.length === 0) return [[]]
  const result: InvoiceLine[][] = []
  for (let i = 0; i < lines.length; i += PAGE_SIZE) {
    result.push(lines.slice(i, i + PAGE_SIZE))
  }
  return result
})

// Cetak ulang identik bebas tanpa izin (CLAUDE.md §2.16) -- setiap klik
// mendaftarkan print_count/printed_at (audit) BARU lalu window.print(),
// supaya operator selalu melihat nota SUNGGUHAN yang tercetak, bukan
// sekadar menaikkan angka tanpa hasil visual (beda dari Nota Mutasi Gudang
// yang memang tidak punya endpoint print sama sekali).
async function triggerPrint() {
  printError.value = ''
  printing.value = true
  try {
    await api.post(`/sales-invoices/${route.params.id}/print`)
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
      v-else-if="invoice"
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
            v-if="invoice.postingStatus === 'VOIDED'"
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
                FAKTUR PENJUALAN
              </div>
              <div v-if="store.store_name">
                {{ store.store_name }}
              </div>
              <div v-if="store.store_phone">
                ( {{ store.store_phone }} )
              </div>
            </div>
            <div class="text-right">
              <div>{{ store.store_city ? `${store.store_city}, ` : '' }}{{ ddMonShortyyyy(invoice.invoiceDate) }}</div>
              <div>Kepada Yth :</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-x-4">
            <div>
              <div>
                NO. NOTA&nbsp;&nbsp;&nbsp;&nbsp;: {{ invoice.invoiceNumber }}
                <span v-if="invoice.revisionNumber > 0">( Revisi ke-{{ invoice.revisionNumber }} )</span>
              </div>
              <div>JTH. TEMPO&nbsp;: {{ invoice.termDays > 0 ? invoice.termDays : '-' }} Hari ( {{ ddmmyyyy(invoice.dueDate) }} )</div>
              <div>MEMO&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</div>
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
                <th class="text-right py-1">
                  HARGA @
                </th>
                <th class="text-right py-1">
                  JUMLAH
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
                <td class="py-1 text-right">
                  {{ rupiah(Number(line.unitPrice), { bare: true }) }}
                </td>
                <td class="py-1 text-right">
                  {{ rupiah(Number(line.netAmount), { bare: true }) }}
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
              <div>
                GRAND TOTAL :
                <span class="font-bold underline decoration-double ml-2">{{ rupiah(Number(invoice.totalAmount), { bare: true }) }}</span>
              </div>
              <div class="mt-1">
                SALES : {{ salesmanCode }}
              </div>
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
