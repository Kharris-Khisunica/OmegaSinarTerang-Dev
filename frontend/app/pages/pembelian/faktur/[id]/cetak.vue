<script setup lang="ts">
// Nota Faktur Pembelian -- BELUM ADA foto referensi (PANDUAN_UI.md §13.3:
// "Faktur Pembelian (B1) ... Turunkan dari §13.1"). Kepala kiri/kanan & kaki
// sama dengan Faktur Penjualan JL (GRAND TOTAL bergaris ganda -> Hal. n/m ->
// CETAK : user - timestamp). Bedanya yang sudah diketahui (§13.3, CLAUDE.md
// §6): TIGA tanda tangan Dibuat / Diterima / Diketahui. Kolom tanpa DISC %/
// DISC RP -- diskon baris pembelian di-drop sejak paket R7/K5 (CLAUDE.md §3);
// diskon faktur (rupiah) tampil sebagai baris rincian di atas GRAND TOTAL.
// Nama supplier untuk OPERATOR sudah ter-mask oleh backend (CLAUDE.md §3) --
// dicetak apa adanya, display_code tetap tampil.
import type { ProductLookup, SupplierLookup, UnitLookup } from '~/composables/usePurchaseInvoiceLookups'

definePageMeta({ layout: 'print', roles: ['MASTER', 'OPERATOR'] })

const PAGE_SIZE = 14

interface InvoiceLine {
  id: string
  lineOrder: number
  productId: string
  unitId: string
  qtyInput: string
  unitPrice: string
  lineFinalAmount: string
  isBonus: boolean
}
interface InvoiceDetail {
  id: string
  invoiceNumber: string
  supplierId: string
  supplierInvoiceNo: string | null
  receiptDate: string
  dueDate: string
  termDays: number
  subtotal: string
  invoiceDiscountAmount: string
  inputVatAmount: string
  totalAmount: string
  postingStatus: 'POSTED' | 'VOIDED'
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
const { loadSupplierMap, loadProductMap, loadUnitMap } = usePurchaseInvoiceLookups()

const invoice = ref<InvoiceDetail | null>(null)
const supplierMap = ref(new Map<string, SupplierLookup>())
const productMap = ref(new Map<string, ProductLookup>())
const unitMap = ref(new Map<string, UnitLookup>())
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
  const [detail, suppliers, products, units] = await Promise.all([
    api.get<InvoiceDetail>(`/purchase-invoices/${route.params.id}`),
    loadSupplierMap(),
    loadProductMap(),
    loadUnitMap()
  ])
  invoice.value = detail
  supplierMap.value = suppliers
  productMap.value = products
  unitMap.value = units
  // GET /settings adalah MASTER-only (CLAUDE.md §5) -- Operator akan 403 di
  // sini. Gagal senyap (header toko kosong) daripada mematikan seluruh nota,
  // pola sama nota lain.
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

const supplier = computed(() => (invoice.value ? supplierMap.value.get(invoice.value.supplierId) : undefined))

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
const pages = computed<InvoiceLine[][]>(() => {
  // GET /purchase-invoices/:id memuat relasi lines tanpa ORDER BY -- urutkan
  // sendiri supaya nota mengikuti urutan input.
  const lines = [...(invoice.value?.lines ?? [])].sort((a, b) => a.lineOrder - b.lineOrder)
  if (lines.length === 0) return [[]]
  const result: InvoiceLine[][] = []
  for (let i = 0; i < lines.length; i += PAGE_SIZE) {
    result.push(lines.slice(i, i + PAGE_SIZE))
  }
  return result
})

// Cetak ulang identik bebas tanpa izin (CLAUDE.md §2.16) -- setiap klik
// mendaftarkan print_count/printed_at (audit) BARU lalu window.print(),
// pola sama nota Faktur Penjualan/Retur.
async function triggerPrint() {
  printError.value = ''
  printing.value = true
  try {
    await api.post(`/purchase-invoices/${route.params.id}/print`)
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
                FAKTUR PEMBELIAN
              </div>
              <div v-if="store.store_name">
                {{ store.store_name }}
              </div>
              <div v-if="store.store_phone">
                ( {{ store.store_phone }} )
              </div>
            </div>
            <div class="text-right">
              <div>{{ store.store_city ? `${store.store_city}, ` : '' }}{{ ddMonShortyyyy(invoice.receiptDate) }}</div>
              <div>Dari Supplier :</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-x-4">
            <div>
              <div>
                NO. NOTA&nbsp;&nbsp;&nbsp;&nbsp;: {{ invoice.invoiceNumber }}
                <span v-if="invoice.revisionNumber > 0">( Revisi ke-{{ invoice.revisionNumber }} )</span>
              </div>
              <div>NO. FAKTUR&nbsp;&nbsp;: {{ invoice.supplierInvoiceNo || '-' }}</div>
              <div>
                JTH. TEMPO&nbsp;&nbsp;: {{ invoice.termDays > 0 ? invoice.termDays : '-' }} Hari
                <span v-if="invoice.termDays > 0">( {{ ddmmyyyy(invoice.dueDate) }} )</span>
              </div>
            </div>
            <div>
              <div class="font-bold">
                {{ supplier?.name ?? '-' }}
              </div>
              <div>{{ supplier?.displayCode ?? '' }}</div>
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
                <th class="text-left py-1 pl-2">
                  SATUAN
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
                  <span v-if="line.isBonus">(BONUS)</span>
                </td>
                <td class="py-1 text-right">
                  {{ qtyFmt(Number(line.qtyInput)) }}
                </td>
                <td class="py-1 pl-2">
                  {{ unitName(line.unitId) }}
                </td>
                <td class="py-1 text-right">
                  {{ line.isBonus ? '-' : rupiah(Number(line.unitPrice), { bare: true }) }}
                </td>
                <td class="py-1 text-right">
                  {{ line.isBonus ? '-' : rupiah(Number(line.lineFinalAmount), { bare: true }) }}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="mt-auto flex items-end justify-between">
            <div class="flex gap-10">
              <div>
                <div>Dibuat Oleh,</div>
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
              <div>
                <div>Diketahui Oleh,</div>
                <div class="mt-8">
                  ____________
                </div>
              </div>
            </div>
            <div class="text-right">
              <div v-if="Number(invoice.inputVatAmount) > 0 || Number(invoice.invoiceDiscountAmount) > 0">
                Subtotal : {{ rupiah(Number(invoice.subtotal), { bare: true }) }}
              </div>
              <div v-if="Number(invoice.inputVatAmount) > 0">
                PPN Masukan : {{ rupiah(Number(invoice.inputVatAmount), { bare: true }) }}
              </div>
              <div v-if="Number(invoice.invoiceDiscountAmount) > 0">
                Diskon Faktur : -{{ rupiah(Number(invoice.invoiceDiscountAmount), { bare: true }) }}
              </div>
              <div>
                GRAND TOTAL :
                <span class="font-bold underline decoration-double ml-2">{{ rupiah(Number(invoice.totalAmount), { bare: true }) }}</span>
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
