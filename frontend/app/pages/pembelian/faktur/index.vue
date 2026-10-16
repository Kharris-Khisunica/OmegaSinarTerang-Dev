<script setup lang="ts">
import type { Column, FilterDef } from '~/types/data-table'
import type { SelectOption } from '~/types/crud-form'
import type { ProductLookup, SupplierLookup, UnitLookup } from '~/composables/usePurchaseInvoiceLookups'

// Dipakai baik sebagai rute /pembelian/faktur (daftar) MAUPUN diimpor oleh
// create.vue (initial-open="entri") -- pola sama gudang/mutasi/index.vue.
definePageMeta({ title: 'Faktur Pembelian', roles: ['MASTER', 'OPERATOR'] })

const props = defineProps<{
  initialOpen?: 'entri'
  /** Paket R6 -- diisi oleh pembelian/faktur/[id]/edit.vue (pembungkus tipis,
   * pola sama create.vue). Mode 'ubah': layar entri SAMA ini dipakai ulang,
   * ter-prefill dari faktur, submit ke PATCH .../revise (CLAUDE.md §6, JANGAN
   * fork form kedua). */
  editInvoiceId?: string
  editReason?: string
}>()

type PrintStatus = 'NOT_PRINTED' | 'PRINTED' | 'PRINT_CANCELLED'
interface EditInvoiceLine {
  productId: string
  unitId: string
  qtyInput: string
  unitPrice: string
  isBonus: boolean
}
interface EditInvoiceDetail {
  id: string
  invoiceNumber: string
  supplierId: string
  supplierInvoiceNo: string | null
  receiptDate: string
  supplierInvoiceDate: string
  termDays: number
  invoiceDiscountAmount: string
  printStatus: PrintStatus
  revisionNumber: number
  lines: EditInvoiceLine[]
}

interface InvoiceRow extends Record<string, unknown> {
  id: string
  invoiceNumber: string
  supplierId: string
  supplierInvoiceNo: string
  receiptDate: string
  dueDate: string
  totalAmount: string
  postingStatus: 'POSTED' | 'VOIDED'
  printStatus: 'NOT_PRINTED' | 'PRINTED' | 'PRINT_CANCELLED'
  reviewStatus: 'BELUM_DICEK' | 'DISETUJUI' | 'BERMASALAH'
  reviewNote: string | null
  createdAt: string
}
interface LineRow {
  productId: string | undefined
  unitId: string | undefined
  qtyInput: number | undefined
  unitPrice: number | undefined
  isBonus: boolean
}
interface SavedLine {
  id: string
  productId: string
  qtyInput: string
  unitCostResult: string
  isBonus: boolean
}
interface CreateResult {
  purchaseInvoice: { id: string, invoiceNumber: string, totalAmount: string }
  lines: SavedLine[]
}

function newLine(): LineRow {
  return {
    productId: undefined,
    unitId: undefined,
    qtyInput: undefined,
    unitPrice: undefined,
    isBonus: false
  }
}

const api = useApi()
const router = useRouter()
const route = useRoute()
const { user } = useAuth()
const { format: rupiah } = useRupiah()
const { format: qtyFmt } = useQty()
const { loadSupplierMap, loadProductMap, loadUnitMap } = usePurchaseInvoiceLookups()
const { withStepUp } = useStepUp()

const operatorName = computed(() => user.value?.fullName ?? '')

// dd-MM-yyyy (PANDUAN_UI.md §10) -- lihat catatan sama di gudang/mutasi/index.vue.
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

const supplierMap = ref<Map<string, SupplierLookup>>(new Map())
const productMap = ref<Map<string, ProductLookup>>(new Map())
const unitMap = ref<Map<string, UnitLookup>>(new Map())
const loadingOptions = ref(true)

async function loadAllOptions() {
  loadingOptions.value = true
  try {
    const [suppliers, products, units] = await Promise.all([loadSupplierMap(), loadProductMap(), loadUnitMap()])
    supplierMap.value = suppliers
    productMap.value = products
    unitMap.value = units
  } finally {
    loadingOptions.value = false
  }
}

function supplierLabel(id: string): string {
  const s = supplierMap.value.get(id)
  return s ? `${s.displayCode} - ${s.name}` : '-'
}

// ---- Bagian A: daftar (PANDUAN_UI.md §5) -----------------------------------
const table = ref()
const selectedRow = ref<InvoiceRow | null>(null)

const columns: Column<InvoiceRow>[] = [
  { key: 'invoiceNumber', label: 'No. Faktur', mono: true },
  { key: 'supplierId', label: 'Supplier', format: v => supplierLabel(v as string) },
  { key: 'receiptDate', label: 'Tgl Terima', format: v => ddmmyyyy(v as string) },
  { key: 'dueDate', label: 'Jatuh Tempo', format: v => ddmmyyyy(v as string) },
  { key: 'totalAmount', label: 'Total', align: 'right', format: v => rupiah(Number(v), { bare: true }) },
  { key: 'postingStatus', label: 'Status', align: 'center', slot: 'postingStatus' },
  { key: 'printStatus', label: 'P', align: 'center', slot: 'printCheck' },
  { key: 'reviewStatus', label: 'Pengecekan', align: 'center', slot: 'reviewCheck' },
  { key: 'createdAt', label: 'Waktu', format: v => ddmmyyyyHm(v as string) }
]

const filters: FilterDef[] = [
  {
    key: 'reviewStatus',
    label: 'Pengecekan',
    type: 'select',
    options: [
      { label: 'Belum Dicek', value: 'BELUM_DICEK' },
      { label: 'Disetujui', value: 'DISETUJUI' },
      { label: 'Bermasalah', value: 'BERMASALAH' }
    ]
  }
]

function onRowClick(row: InvoiceRow) {
  selectedRow.value = row
}
function goToDetailSelected() {
  if (selectedRow.value) navigateTo(`/pembelian/faktur/${selectedRow.value.id}`)
}

// ---- Bagian B: entri via DocumentModal + LineModal (PANDUAN_UI.md §6, §7.2) -
// Paket R6: 'ubah' memakai KOMPONEN YANG SAMA (CLAUDE.md §6, jangan fork).
const entriOpen = ref(false)
const formMode = ref<'entri' | 'ubah'>('entri')
const editingInvoiceId = ref<string | undefined>(undefined)
const editingInvoiceNumber = ref('')
const editingRevisionNumber = ref(0)
const editReasonValue = ref('')
const editLoading = ref(false)
const editLoadError = ref('')

const supplierId = ref<string | undefined>(undefined)
const supplierInvoiceNo = ref('')
const receiptDate = ref(todayIso())
const supplierInvoiceDate = ref(todayIso())
const termDays = ref<number>(0)
const invoiceDiscountAmount = ref<number | undefined>(undefined)
const lines = ref<LineRow[]>([])

const draftKey = computed(() =>
  formMode.value === 'ubah' && editingInvoiceId.value
    ? `md-draft:purchase-invoice:edit:${editingInvoiceId.value}`
    : 'md-draft:purchase-invoice:create')
const draftData = computed(() => ({
  supplierId: supplierId.value,
  supplierInvoiceNo: supplierInvoiceNo.value,
  receiptDate: receiptDate.value,
  supplierInvoiceDate: supplierInvoiceDate.value,
  termDays: termDays.value,
  invoiceDiscountAmount: invoiceDiscountAmount.value,
  lines: lines.value
}))
let entriSnapshot = JSON.stringify(draftData.value)
const entriDirty = computed(() => JSON.stringify(draftData.value) !== entriSnapshot)

function resetEntriForm() {
  supplierId.value = undefined
  supplierInvoiceNo.value = ''
  receiptDate.value = todayIso()
  supplierInvoiceDate.value = todayIso()
  termDays.value = 0
  invoiceDiscountAmount.value = undefined
  lines.value = []
  entriSnapshot = JSON.stringify(draftData.value)
}

const documentModalRef = ref<{ clearDraft: () => void, forceClose: () => void } | null>(null)

function openEntri() {
  formMode.value = 'entri'
  editingInvoiceId.value = undefined
  resetEntriForm()
  entriOpen.value = true
}

// Ter-prefill dari faktur, TERMASUK SELURUH BARIS (tugas R6).
async function openEdit(id: string) {
  editLoadError.value = ''
  editLoading.value = true
  try {
    const detail = await api.get<EditInvoiceDetail>(`/purchase-invoices/${id}`)
    formMode.value = 'ubah'
    editingInvoiceId.value = detail.id
    editingInvoiceNumber.value = detail.invoiceNumber
    editingRevisionNumber.value = detail.revisionNumber
    editReasonValue.value = props.editReason ?? ''

    supplierId.value = detail.supplierId
    supplierInvoiceNo.value = detail.supplierInvoiceNo ?? ''
    receiptDate.value = detail.receiptDate
    supplierInvoiceDate.value = detail.supplierInvoiceDate
    termDays.value = detail.termDays
    invoiceDiscountAmount.value = Number(detail.invoiceDiscountAmount) || undefined
    lines.value = detail.lines.map(l => ({
      productId: l.productId,
      unitId: l.unitId,
      qtyInput: Number(l.qtyInput),
      unitPrice: l.isBonus ? undefined : Number(l.unitPrice),
      isBonus: l.isBonus
    }))
    entriSnapshot = JSON.stringify(draftData.value)
    entriOpen.value = true
    await fetchTaxRate()
  } catch (err) {
    editLoadError.value = getErrorMessage(err, 'Gagal memuat faktur untuk direvisi.')
  } finally {
    editLoading.value = false
  }
}

function restoreDraft(d: unknown) {
  const draft = d as typeof draftData.value
  supplierId.value = draft.supplierId
  supplierInvoiceNo.value = draft.supplierInvoiceNo
  receiptDate.value = draft.receiptDate
  supplierInvoiceDate.value = draft.supplierInvoiceDate
  termDays.value = draft.termDays
  invoiceDiscountAmount.value = draft.invoiceDiscountAmount
  lines.value = draft.lines
}
function closeEntri() {
  entriOpen.value = false
  if (formMode.value === 'ubah' && editingInvoiceId.value) {
    navigateTo(`/pembelian/faktur/${editingInvoiceId.value}`)
    return
  }
  if (route.path !== '/pembelian/faktur') router.replace('/pembelian/faktur')
}

const supplierOptions = computed<SelectOption[]>(() =>
  [...supplierMap.value.values()].map(s => ({ label: `${s.displayCode} - ${s.name}${s.isPkp ? ' (PKP)' : ''}`, value: s.id })))
const selectedSupplier = computed(() => (supplierId.value ? supplierMap.value.get(supplierId.value) : undefined))
const productOptions = computed<SelectOption[]>(() =>
  [...productMap.value.values()].filter(p => p.isActive).map(p => ({ label: `${p.displayName} (${p.code})`, value: p.id })))

const dueDate = computed(() => addDaysIso(supplierInvoiceDate.value, termDays.value || 0))

interface AllowedUnit { id: string, name: string, factor: number }
function normalizeUnitName(value: string): string {
  return value.trim().toLowerCase()
}
function allowedUnitsForProduct(productId: string | undefined): AllowedUnit[] {
  if (!productId) return []
  const product = productMap.value.get(productId)
  if (!product) return []
  const normalizedBase = normalizeUnitName(product.baseUnit)
  const result: AllowedUnit[] = []
  for (const unit of unitMap.value.values()) {
    if (!unit.isActive) continue
    const normalized = normalizeUnitName(unit.name)
    if (normalized === normalizedBase) {
      result.push({ id: unit.id, name: unit.name, factor: 1 })
      continue
    }
    const match = product.unitConversions.find(c => normalizeUnitName(c.unitName) === normalized)
    if (match) result.push({ id: unit.id, name: unit.name, factor: Number(match.qtyInBaseUnit) })
  }
  return result.sort((a, b) => b.factor - a.factor)
}
function unitOptionsForLine(line: LineRow): SelectOption[] {
  return allowedUnitsForProduct(line.productId).map(u => ({ label: u.name, value: u.id }))
}
function isiFactor(line: LineRow): number | undefined {
  if (!line.productId || !line.unitId) return undefined
  return allowedUnitsForProduct(line.productId).find(u => u.id === line.unitId)?.factor
}

// ---- Tarif PPN masukan (preview) -------------------------------------------
const taxRatePercent = ref<number | null>(null)
const taxRateNotice = ref('')
watch(supplierInvoiceDate, fetchTaxRate, { immediate: false })
async function fetchTaxRate() {
  taxRateNotice.value = ''
  try {
    const res = await api.get<{ rate: number }>('/tax-rates/effective', { date: supplierInvoiceDate.value })
    taxRatePercent.value = Number(res.rate)
  } catch (err) {
    taxRatePercent.value = null
    taxRateNotice.value = getErrorMessage(err, 'Tarif PPN belum diset untuk tanggal ini.')
  }
}

// ---- Kalkulasi live (port murni rumus backend, purchaseInvoiceCalc.ts -- N8,
// TIDAK disentuh) -------------------------------------------------------------
const calc = computed(() => calculatePurchaseInvoice({
  lines: lines.value.map(l => ({
    qtyInput: l.qtyInput ?? 0,
    unitPrice: l.unitPrice,
    discountPercent: undefined,
    discountAmount: undefined,
    isBonus: l.isBonus,
    productIsBkp: l.productId ? (productMap.value.get(l.productId)?.isBkp ?? false) : false
  })),
  invoiceDiscountPercent: undefined,
  invoiceDiscountAmount: invoiceDiscountAmount.value,
  supplierIsPkp: selectedSupplier.value?.isPkp ?? false,
  taxRatePercent: taxRatePercent.value
}))

// ---- Baris: LineModal varian pendek §7.2 (kanan: sisa stok + Isi + preview
// kalkulasi baris -- TANPA panel riwayat harga, itu cuma untuk Penjualan/SO §7.1p2) --
const lineOpen = ref(false)
const lineEditIndex = ref<number | null>(null)
const lineDraft = ref<LineRow>(newLine())
const lineDirty = ref(false)
const selectedLine = ref<(LineRow & Record<string, unknown>) | null>(null)

// SISA STOK -- GET /products/:id/stock-balance lewat useStockBalance() (R3),
// pola sama Faktur Penjualan/Order Penjualan (CLAUDE.md §6).
const { qtyBaseUnit: stockQtyBaseUnit, loading: stockLoading, fetch: fetchStockBalance } = useStockBalance()

function openLineEntri(bonus = false) {
  lineDraft.value = newLine()
  if (bonus) {
    lineDraft.value.isBonus = true
    lineDraft.value.unitPrice = 0
  }
  lineEditIndex.value = null
  lineDirty.value = false
  stockQtyBaseUnit.value = null
  lineOpen.value = true
}
function openLineEditSelected() {
  if (!selectedLine.value) return
  const index = lines.value.indexOf(selectedLine.value as LineRow)
  if (index === -1) return
  lineDraft.value = { ...(lines.value[index] as LineRow) }
  lineEditIndex.value = index
  lineDirty.value = false
  lineOpen.value = true
  fetchStockBalance(lineDraft.value.productId)
}
function removeSelectedLine() {
  if (!selectedLine.value) return
  const index = lines.value.indexOf(selectedLine.value as LineRow)
  if (index === -1) return
  lines.value.splice(index, 1)
  selectedLine.value = null
}
function onLineRowClick(row: Record<string, unknown>) {
  selectedLine.value = row as LineRow & Record<string, unknown>
}
function onBonusToggle() {
  if (lineDraft.value.isBonus) {
    lineDraft.value.unitPrice = 0
  }
}
function onLineProductChange(rawProductId: string | number | boolean | undefined) {
  const productId = rawProductId as string | undefined
  lineDraft.value.productId = productId
  const allowed = allowedUnitsForProduct(productId)
  const dus = allowed.find(u => normalizeUnitName(u.name) === 'dus')
  lineDraft.value.unitId = dus?.id ?? allowed[0]?.id ?? undefined
  fetchStockBalance(productId)
}
// need_fixing.md #8 — hotkey grid baris (PANDUAN_UI.md §12): Delete minta
// konfirmasi; Enter di field terakhir modal baris = simpan lalu buka baris
// kosong berikutnya (hanya saat entri baris baru, bukan saat mengubah).
function confirmRemoveSelectedLine() {
  if (selectedLine.value && window.confirm('Hapus baris terpilih?')) removeSelectedLine()
}
function saveLineAndNew() {
  const wasNewLine = lineEditIndex.value === null
  saveLine()
  if (wasNewLine && !lineOpen.value) openLineEntri()
}
function saveLine() {
  if (!lineDraft.value.productId || !lineDraft.value.unitId || !((lineDraft.value.qtyInput ?? 0) > 0)) return
  if (lineEditIndex.value === null) lines.value.push({ ...lineDraft.value })
  else lines.value[lineEditIndex.value] = { ...lineDraft.value }
  lineOpen.value = false
}

// Preview kalkulasi baris sedang diedit -- hitung ulang seluruh faktur dengan
// draft baris ini di posisinya (baru/pengganti), lalu ambil hasil indeksnya.
// Tetap N8: memanggil calculatePurchaseInvoice() apa adanya, tidak menulis
// ulang rumusnya di sini.
const lineDraftPreview = computed(() => {
  const combined = lineEditIndex.value === null
    ? [...lines.value, lineDraft.value]
    : lines.value.map((l, i) => (i === lineEditIndex.value ? lineDraft.value : l))
  const previewIndex = lineEditIndex.value ?? combined.length - 1
  const result = calculatePurchaseInvoice({
    lines: combined.map(l => ({
      qtyInput: l.qtyInput ?? 0,
      unitPrice: l.unitPrice,
      discountPercent: undefined,
      discountAmount: undefined,
      isBonus: l.isBonus,
      productIsBkp: l.productId ? (productMap.value.get(l.productId)?.isBkp ?? false) : false
    })),
    invoiceDiscountPercent: undefined,
    invoiceDiscountAmount: invoiceDiscountAmount.value,
    supplierIsPkp: selectedSupplier.value?.isPkp ?? false,
    taxRatePercent: taxRatePercent.value
  })
  return result.lines[previewIndex]
})

const lineColumns: Column<LineRow & Record<string, unknown>>[] = [
  {
    key: 'productId',
    label: 'Produk',
    format: v => productOptions.value.find(p => p.value === v)?.label ?? '-'
  },
  { key: 'qtyInput', label: 'Qty', align: 'right', format: v => qtyFmt(v as number) },
  {
    key: 'unitId',
    label: 'Satuan',
    format: (v, row) => unitOptionsForLine(row).find(u => u.value === v)?.label ?? '-'
  },
  { key: 'unitPrice', label: 'Harga', align: 'right', format: v => rupiah(v as number, { bare: true }) },
  { key: 'isBonus', label: 'Bonus', align: 'center', slot: 'bonusCheck' }
]

// ---- Validasi & submit ------------------------------------------------------
function validate(): string | null {
  if (!supplierId.value) return 'Pilih supplier.'
  if (!receiptDate.value) return 'Tanggal terima barang wajib diisi.'
  if (!supplierInvoiceDate.value) return 'Tanggal faktur supplier wajib diisi.'
  if (lines.value.length === 0) return 'Isi minimal satu baris produk dengan qty lebih dari 0.'
  if (calc.value.invoiceDiscountAmount > calc.value.subtotal) {
    return 'Diskon faktur tidak boleh melebihi subtotal.'
  }
  return null
}

function buildPayload(): Record<string, unknown> {
  return {
    supplierId: supplierId.value,
    supplierInvoiceNo: supplierInvoiceNo.value.trim() || undefined,
    receiptDate: receiptDate.value,
    supplierInvoiceDate: supplierInvoiceDate.value,
    termDays: termDays.value || 0,
    invoiceDiscountAmount: invoiceDiscountAmount.value,
    lines: lines.value.map(l => ({
      productId: l.productId,
      unitId: l.unitId,
      qtyInput: l.qtyInput,
      unitPrice: l.isBonus ? undefined : l.unitPrice,
      isBonus: l.isBonus
    })),
    // Wajib diisi HANYA kalau faktur sudah PRINTED (divalidasi
    // PrintLockService.preflight/consume di backend) -- kosong untuk faktur
    // yang belum dicetak.
    ...(formMode.value === 'ubah' ? { reason: editReasonValue.value || undefined } : {})
  }
}

const submitting = ref(false)
const bannerError = ref('')
const result = ref<CreateResult | null>(null)
const resultOpen = ref(false)

// R6 §3: pesan gagal yang bisa ditindaklanjuti -- backend sudah menulis
// pesan yang MENYEBUT jalan keluarnya secara eksplisit
// (DocumentReviseService/PurchaseInvoicesService); di sini cukup dideteksi
// lalu ditawarkan sebagai tombol, supaya operator yang buntu tidak mencari
// jalan pintas sendiri.
const banner_showVoidAction = computed(() => formMode.value === 'ubah' && /VOID/i.test(bannerError.value))
const banner_showReturAction = computed(() => formMode.value === 'ubah' && /Retur Pembelian/i.test(bannerError.value))
function goToVoidFromError() {
  if (!editingInvoiceId.value) return
  navigateTo(`/pembelian/faktur/${editingInvoiceId.value}?openVoid=1`)
}

// Faktur pembelian TIDAK punya gerbang SELL_BELOW_COST (§2.17 hanya berlaku
// penjualan) -- revisi cukup SATU gerbang (UNLOCK_PRINT), pola sama
// submitVoid() di pembelian/faktur/[id]/index.vue, beda dari revisi
// penjualan yang perlu dua ronde.
async function submit() {
  const err = validate()
  if (err) {
    bannerError.value = err
    return
  }
  bannerError.value = ''
  submitting.value = true
  try {
    if (formMode.value === 'ubah' && editingInvoiceId.value) {
      await withStepUp(headers => api.patch(`/purchase-invoices/${editingInvoiceId.value}/revise`, buildPayload(), headers))
      documentModalRef.value?.clearDraft()
      entriOpen.value = false
      await navigateTo(`/pembelian/faktur/${editingInvoiceId.value}`)
      return
    }
    result.value = await api.post<CreateResult>('/purchase-invoices', buildPayload())
    documentModalRef.value?.clearDraft()
    entriOpen.value = false
    resultOpen.value = true
    table.value?.reload()
    if (route.path !== '/pembelian/faktur') router.replace('/pembelian/faktur')
  } catch (err2) {
    if (err2 instanceof StepUpCancelledError) return
    bannerError.value = getErrorMessage(
      err2,
      formMode.value === 'ubah' ? 'Gagal merevisi faktur pembelian.' : 'Gagal membuat faktur pembelian.'
    )
  } finally {
    submitting.value = false
  }
}

function productLabel(id: string | undefined): string {
  if (!id) return ''
  const p = productMap.value.get(id)
  return p ? `${p.displayName} (${p.code})` : id
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
// Murni Date.UTC (sama seperti backend addDays) -- sengaja TIDAK memakai
// `new Date(str)` untuk aritmetika lokal supaya tidak ada pergeseran akibat
// timezone browser.
function addDaysIso(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return ''
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

onMounted(async () => {
  await loadAllOptions()
  await fetchTaxRate()
  if (props.editInvoiceId) {
    await openEdit(props.editInvoiceId)
  } else if (props.initialOpen === 'entri') {
    openEntri()
  }
})
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader />

    <DataTable
      ref="table"
      endpoint="/purchase-invoices"
      :columns="columns"
      :filters="filters"
      :on-row-click="onRowClick"
      selectable
      dense
      zebra
      search-placeholder="Cari nomor faktur..."
      :default-sort="{ key: 'receiptDate', dir: 'desc' }"
      :row-class="(row) => row.reviewStatus === 'BERMASALAH' ? 'bg-error/10' : ''"
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
            icon="i-lucide-clipboard-check"
            color="neutral"
            variant="subtle"
            :disabled="!selectedRow"
            @click="goToDetailSelected"
          >
            Pengecekan
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
      <template #printCheck="{ value }">
        <UCheckbox
          :model-value="value === 'PRINTED' || value === 'PRINT_CANCELLED'"
          disabled
        />
      </template>
      <template #reviewCheck="{ value, row }">
        <UTooltip
          v-if="value === 'BERMASALAH'"
          :text="`Catatan supervisor: ${(row as InvoiceRow).reviewNote || '-'}`"
        >
          <div class="flex items-center gap-1 justify-center">
            <UIcon
              name="i-lucide-alert-triangle"
              class="text-error size-4"
            />
            <UCheckbox
              :model-value="false"
              indeterminate
              color="error"
              disabled
            />
          </div>
        </UTooltip>
        <UCheckbox
          v-else
          :model-value="value === 'DISETUJUI'"
          color="primary"
          disabled
        />
      </template>
    </DataTable>

    <!-- Bagian B: entri dua lapis modal -- 'ubah' memakai LAYAR YANG SAMA
         (paket R6, CLAUDE.md §6: satu form, jangan fork) -->
    <DocumentModal
      ref="documentModalRef"
      :open="entriOpen"
      title="Faktur Pembelian"
      :mode="formMode"
      :operator="operatorName"
      :dirty="entriDirty"
      :saving="submitting"
      :draft-key="draftKey"
      :draft-data="draftData"
      @update:open="(v: boolean) => !v && closeEntri()"
      @restore-draft="restoreDraft"
      @new-line="openLineEntri"
      @edit-line="openLineEditSelected"
      @delete-line="confirmRemoveSelectedLine"
      @save="submit"
    >
      <template #header>
        <UAlert
          v-if="formMode === 'ubah'"
          color="neutral"
          variant="subtle"
          icon="i-lucide-file-pen-line"
          :title="`No. Faktur : ${editingInvoiceNumber}`"
          :description="editingRevisionNumber > 0 ? `Sudah direvisi ${editingRevisionNumber}x sebelumnya.` : undefined"
        />
        <!-- Alasan revisi -- lihat catatan sama di penjualan/faktur/index.vue:
             field terlihat & bisa diisi langsung di sini, bukan cuma prefill
             dari query ?reason= dialog "Batal Cetak" -- supaya faktur PRINTED
             yang reason-nya kosong tidak membuat operator buntu. -->
        <UFormField
          v-if="formMode === 'ubah'"
          label="Alasan Revisi"
          hint="Wajib diisi kalau faktur sudah dicetak."
        >
          <UTextarea
            v-model="editReasonValue"
            class="w-full"
            placeholder="Kenapa faktur ini perlu direvisi?"
          />
        </UFormField>
        <UAlert
          v-if="bannerError"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          :title="bannerError"
          :close="{ icon: 'i-lucide-x', color: 'neutral', variant: 'link' }"
          @update:open="bannerError = ''"
        />
        <!-- Tombol jalan keluar SEBAGAI ELEMEN TERPISAH, bukan slot #actions
             UAlert -- lihat catatan sama di penjualan/faktur/index.vue
             (diverifikasi manual di browser, slot itu tidak tampil). -->
        <div
          v-if="banner_showVoidAction || banner_showReturAction"
          class="flex justify-end gap-2 -mt-2"
        >
          <UButton
            v-if="banner_showVoidAction"
            color="error"
            variant="solid"
            size="xs"
            icon="i-lucide-ban"
            @click="goToVoidFromError"
          >
            Batalkan (VOID)
          </UButton>
          <UButton
            v-if="banner_showReturAction"
            color="warning"
            variant="solid"
            size="xs"
            icon="i-lucide-undo-2"
            to="/pembelian/retur"
          >
            Buat Retur Pembelian
          </UButton>
        </div>

        <div class="grid grid-cols-2 gap-y-1.5 gap-x-4">
          <UFormField
            label="Supplier"
            required
          >
            <UInputMenu
              v-model="supplierId"
              value-key="value"
              :items="supplierOptions"
              placeholder="Pilih supplier..."
              class="w-full"
            />
            <p
              v-if="selectedSupplier"
              class="text-xs text-muted mt-1"
            >
              {{ selectedSupplier.isPkp ? 'PKP — PPN masukan dihitung untuk produk BKP.' : 'Non-PKP — tidak ada PPN masukan.' }}
            </p>
          </UFormField>
          <UFormField
            label="No. Faktur Supplier"
            hint="Boleh dikosongkan kalau supplier tidak menerbitkan nota."
          >
            <UInput
              v-model="supplierInvoiceNo"
              class="w-full"
              placeholder="mis. INV-00123"
            />
          </UFormField>

          <UFormField
            label="Tgl Terima Barang"
            required
            hint="Dasar urutan FIFO — bukan tanggal faktur."
          >
            <UInput
              v-model="receiptDate"
              type="date"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Tgl Faktur Supplier"
            required
            hint="Dasar hitung jatuh tempo & tarif PPN."
          >
            <UInput
              v-model="supplierInvoiceDate"
              type="date"
              class="w-full"
              @change="fetchTaxRate"
            />
          </UFormField>

          <UFormField label="Termin (hari)">
            <QtyInput
              v-model="termDays"
              :min="0"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Jatuh Tempo"
            hint="Otomatis: Tgl Faktur Supplier + termin."
          >
            <UInput
              :model-value="ddmmyyyy(dueDate)"
              disabled
              class="w-full"
            />
          </UFormField>
        </div>

        <UAlert
          v-if="taxRateNotice && selectedSupplier?.isPkp"
          color="warning"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          :title="taxRateNotice"
        />
      </template>

      <template #lines>
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-1">
            <UButton
              icon="i-lucide-plus"
              size="xs"
              variant="subtle"
              @click="openLineEntri(false)"
            >
              Entri
            </UButton>
            <UButton
              icon="i-lucide-pencil"
              size="xs"
              color="neutral"
              variant="subtle"
              :disabled="!selectedLine"
              @click="openLineEditSelected"
            >
              Ubah
            </UButton>
            <UButton
              icon="i-lucide-trash-2"
              size="xs"
              color="error"
              variant="ghost"
              :disabled="!selectedLine"
              @click="removeSelectedLine"
            >
              Hapus
            </UButton>
            <UButton
              icon="i-lucide-gift"
              size="xs"
              color="warning"
              variant="subtle"
              @click="openLineEntri(true)"
            >
              Bonus
            </UButton>
          </div>
          <DataTable
            :rows="lines as unknown as Record<string, unknown>[]"
            :columns="lineColumns as Column<Record<string, unknown>>[]"
            :on-row-click="onLineRowClick"
            selectable
            dense
            zebra
            :searchable="false"
          >
            <template #bonusCheck="{ value }">
              <UCheckbox
                :model-value="!!value"
                disabled
              />
            </template>
          </DataTable>
        </div>
      </template>

      <template #totals>
        <TotalsBar
          :items="[
            { label: 'Item', value: String(lines.length) },
            { label: 'Qty', value: qtyFmt(lines.reduce((s, l) => s + (l.qtyInput ?? 0), 0)) },
            { label: 'Total Sblm Disc', value: rupiah(calc.subtotal, { bare: true }) },
            { label: 'Diskon Faktur', value: rupiah(calc.invoiceDiscountAmount, { bare: true }) },
            { label: 'Total', value: rupiah(calc.subtotal - calc.invoiceDiscountAmount + calc.inputVatTotal), emphasize: true }
          ]"
        />
        <div class="mt-2">
          <UFormField
            label="Diskon Faktur"
            hint="Rupiah saja — tidak menyentuh harga pokok, diakui sebagai Diskon Pembelian."
          >
            <MoneyInput
              v-model="invoiceDiscountAmount"
              placeholder="0"
              :min="0"
              class="w-40"
            />
          </UFormField>
        </div>
      </template>
    </DocumentModal>

    <LineModal
      :open="lineOpen"
      title="Baris Faktur Pembelian"
      :mode="lineEditIndex === null ? 'entri' : 'ubah'"
      :dirty="lineDirty"
      @update:open="(v: boolean) => (lineOpen = v)"
      @save="saveLine"
      @enter-last="saveLineAndNew"
    >
      <template #form>
        <UFormField
          label="Produk"
          required
        >
          <UInputMenu
            :model-value="lineDraft.productId"
            value-key="value"
            :items="productOptions"
            placeholder="Pilih produk..."
            class="w-full"
            @update:model-value="(v: string | number | boolean) => { onLineProductChange(v); lineDirty = true }"
          />
        </UFormField>
        <div class="grid grid-cols-2 gap-2">
          <UFormField
            label="Satuan"
            required
          >
            <USelect
              v-model="lineDraft.unitId"
              :items="unitOptionsForLine(lineDraft)"
              :disabled="!lineDraft.productId"
              placeholder="Satuan..."
              class="w-full"
              @update:model-value="lineDirty = true"
            />
          </UFormField>
          <UFormField label="Isi">
            <div class="px-3 py-1.5 rounded-md border border-default bg-elevated/50 text-muted text-right">
              {{ isiFactor(lineDraft) !== undefined ? qtyFmt(isiFactor(lineDraft)) : '-' }}
            </div>
          </UFormField>
        </div>
        <UFormField
          label="Qty"
          required
        >
          <QtyInput
            v-model="lineDraft.qtyInput"
            placeholder="0"
            :min="0"
            class="w-full"
            @update:model-value="lineDirty = true"
          />
        </UFormField>
        <UFormField label="Harga @">
          <MoneyInput
            v-model="lineDraft.unitPrice"
            placeholder="0"
            :min="0"
            :disabled="lineDraft.isBonus"
            class="w-full"
            @update:model-value="lineDirty = true"
          />
        </UFormField>
        <UFormField label="Bonus">
          <UCheckbox
            v-model="lineDraft.isBonus"
            label="Barang bonus (harga terkunci 0)"
            @update:model-value="() => { onBonusToggle(); lineDirty = true }"
          />
        </UFormField>
      </template>
      <template #context>
        <span class="text-xs font-medium text-muted">SISA STOK</span>
        <StockBadge
          :qty-base-unit="stockQtyBaseUnit"
          :loading="stockLoading"
          :base-unit-name="lineDraft.productId ? (productMap.get(lineDraft.productId)?.baseUnit ?? '') : ''"
          :conversions="lineDraft.productId ? (productMap.get(lineDraft.productId)?.unitConversions ?? []).map(c => ({ unitName: c.unitName, qtyInBaseUnit: Number(c.qtyInBaseUnit) })) : []"
        />
        <span class="text-xs font-medium text-muted mt-2">PREVIEW KALKULASI BARIS</span>
        <InfoStrip
          variant="stacked"
          :items="[
            { label: 'Subtotal Baris', value: rupiah(lineDraftPreview?.netAmount ?? 0, { bare: true }) },
            { label: 'PPN Baris', value: rupiah(lineDraftPreview?.inputVat ?? 0, { bare: true }) }
          ]"
        />
      </template>
    </LineModal>

    <!-- Ringkasan hasil setelah submit sukses -->
    <UModal
      v-model:open="resultOpen"
      title="Faktur Tersimpan"
    >
      <template #body>
        <div
          v-if="result"
          class="flex flex-col gap-4"
        >
          <UAlert
            color="success"
            variant="subtle"
            icon="i-lucide-check-circle-2"
            :title="`Faktur ${result.purchaseInvoice.invoiceNumber} tersimpan`"
            :description="`Total ${rupiah(Number(result.purchaseInvoice.totalAmount))}`"
          />
          <DataTable
            :rows="result.lines as unknown as Record<string, unknown>[]"
            :columns="[
              { key: 'productId', label: 'Produk', format: (v: unknown) => productLabel(v as string) },
              { key: 'qtyInput', label: 'Qty', format: (v: unknown) => qtyFmt(Number(v)) },
              { key: 'unitCostResult', label: 'Harga Pokok / Satuan Dasar', align: 'right', format: (v: unknown) => rupiah(Number(v), { bare: true }) }
            ]"
            dense
            zebra
            :searchable="false"
          />
        </div>
      </template>
      <template #footer>
        <div class="flex items-center gap-2 w-full justify-end">
          <UButton
            v-if="result"
            :to="`/pembelian/faktur/${result.purchaseInvoice.id}`"
            icon="i-lucide-eye"
            color="neutral"
            variant="subtle"
          >
            Lihat Detail
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            @click="resultOpen = false"
          >
            Keluar
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
