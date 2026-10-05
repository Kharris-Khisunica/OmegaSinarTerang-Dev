<script setup lang="ts">
// Nota Retur Penjualan -- BELUM ADA foto referensi (PANDUAN_UI.md §13.3:
// "Retur (RJ/RB) ... tidak ada di referensi. Turunkan dari §13.1"). Struktur
// & kata-kata diturunkan dari §13.1 (Faktur Penjualan JL, SATU-SATUNYA nota
// bersumber foto sungguhan): kepala kiri/kanan sama (judul+telepon toko |
// kota+tanggal+"Kepada Yth"+pelanggan), kaki sama (GRAND TOTAL bergaris
// ganda -> Hal. n/m -> CETAK : user - timestamp), kolom disesuaikan isi
// retur (DPP/Harga Pokok, bukan Harga@/Disc seperti faktur -- retur tidak
// dinegosiasikan, CLAUDE.md §3 "Lain-lain": harga pokok WAJIB dari
// unit_cost_fifo faktur asal). "Faktur Asal" ditambahkan sebagai baris baru
// (tidak ada di JL) supaya nota bisa dicocokkan balik ke faktur yang diretur.
definePageMeta({ layout: 'print', roles: ['MASTER', 'OPERATOR'] })

const PAGE_SIZE = 14

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
  returnDate: string
  salesInvoiceId: string
  customerId: string
  settlementType: 'REDUCE_INVOICE' | 'CASH'
  dppAmount: string
  outputVatAmount: string
  totalAmount: string
  costBasisAmount: string
  revisionNumber: number
  postingStatus: 'POSTED' | 'VOIDED'
  notes: string | null
  lines: ReturnLine[]
}
interface InvoiceRef { invoiceNumber: string }
interface Setting { key: string, value: string }

const route = useRoute()
const router = useRouter()
const api = useApi()
const { user } = useAuth()
const { format: rupiah } = useRupiah()
const { format: qtyFmt } = useQty()
const { loadCustomerMap, loadProductMap } = useSalesInvoiceLookups()

const salesReturn = ref<ReturnDetail | null>(null)
const customerMap = ref(new Map<string, { name: string, address: string | null, city: string | null, phone: string | null }>())
const productMap = ref(new Map<string, { displayName: string, code: string }>())
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

const SETTLEMENT_LABEL: Record<string, string> = {
  REDUCE_INVOICE: 'Kurangi Piutang',
  CASH: 'Tunai'
}

async function loadAll() {
  const [detail, customers, products] = await Promise.all([
    api.get<ReturnDetail>(`/sales-returns/${route.params.id}`),
    loadCustomerMap(),
    loadProductMap()
  ])
  salesReturn.value = detail
  customerMap.value = customers
  productMap.value = products
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
    loadError.value = getErrorMessage(err, 'Gagal memuat data retur.')
  } finally {
    loading.value = false
  }
})

const customer = computed(() => (salesReturn.value ? customerMap.value.get(salesReturn.value.customerId) : undefined))

function productName(id: string): string {
  return productMap.value.get(id)?.displayName ?? id
}
function productBarcode(id: string): string {
  return productMap.value.get(id)?.code ?? '-'
}

// Pagination §6/§13 -- muat 14 baris per halaman, lanjut "Hal. n/m" di atas itu.
const pages = computed<ReturnLine[][]>(() => {
  const lines = salesReturn.value?.lines ?? []
  if (lines.length === 0) return [[]]
  const result: ReturnLine[][] = []
  for (let i = 0; i < lines.length; i += PAGE_SIZE) {
    result.push(lines.slice(i, i + PAGE_SIZE))
  }
  return result
})

// Cetak ulang identik bebas tanpa izin (CLAUDE.md §2.16) -- setiap klik
// mendaftarkan print_count/printed_at (audit) BARU lalu window.print(),
// pola sama nota Faktur Penjualan/Retur Pembelian.
async function triggerPrint() {
  printError.value = ''
  printing.value = true
  try {
    await api.post(`/sales-returns/${route.params.id}/print`)
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
      v-else-if="salesReturn"
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
            v-if="salesReturn.postingStatus === 'VOIDED'"
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
                RETUR PENJUALAN
              </div>
              <div v-if="store.store_name">
                {{ store.store_name }}
              </div>
              <div v-if="store.store_phone">
                ( {{ store.store_phone }} )
              </div>
            </div>
            <div class="text-right">
              <div>{{ store.store_city ? `${store.store_city}, ` : '' }}{{ ddMonShortyyyy(salesReturn.returnDate) }}</div>
              <div>Kepada Yth :</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-x-4">
            <div>
              <div>
                NO. NOTA&nbsp;&nbsp;&nbsp;&nbsp;: {{ salesReturn.returnNumber }}
                <span v-if="salesReturn.revisionNumber > 0">( Revisi ke-{{ salesReturn.revisionNumber }} )</span>
              </div>
              <div>FAKTUR ASAL&nbsp;: {{ invoiceNumber }}</div>
              <div>PENYELESAIAN&nbsp;: {{ SETTLEMENT_LABEL[salesReturn.settlementType] }}</div>
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
                  DPP
                </th>
                <th class="text-right py-1">
                  HARGA POKOK
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
                  {{ rupiah(Number(line.dppAmount), { bare: true }) }}
                </td>
                <td class="py-1 text-right">
                  {{ rupiah(Number(line.costAmount), { bare: true }) }}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="mt-auto flex items-end justify-between">
            <div class="flex gap-12">
              <div>
                <div>Diserahkan Oleh,</div>
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
              <div v-if="Number(salesReturn.outputVatAmount) > 0">
                PPN Keluaran : {{ rupiah(Number(salesReturn.outputVatAmount), { bare: true }) }}
              </div>
              <div>
                GRAND TOTAL :
                <span class="font-bold underline decoration-double ml-2">{{ rupiah(Number(salesReturn.totalAmount), { bare: true }) }}</span>
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
