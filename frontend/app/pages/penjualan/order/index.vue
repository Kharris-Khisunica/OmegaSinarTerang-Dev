<script setup lang="ts">
import type { Column, FilterDef } from '~/types/data-table'
import type { SelectOption } from '~/types/crud-form'
import type { CustomerLookup, ProductLookup, SalesmanLookup, UnitLookup } from '~/composables/useSalesOrderLookups'

// Dipakai baik sebagai rute /penjualan/order (daftar) MAUPUN diimpor oleh
// create.vue (initial-open="entri") -- pola sama gudang/mutasi/index.vue.
// SO lebih ringan dari Faktur Pembelian (tanpa print/VOID/review/PPN/diskon)
// tapi PUNYA update sungguhan (replace-lines) -- satu DocumentModal dipakai
// dua mode (Entri/Ubah), pola isEdit ala CrudFormPage.vue.
definePageMeta({ title: 'Order Penjualan', roles: ['MASTER', 'OPERATOR'] })

const props = defineProps<{
  initialOpen?: 'entri'
}>()

interface SalesOrderRow extends Record<string, unknown> {
  id: string
  orderNumber: string
  orderDate: string
  customerId: string
  // PJ (penanggung jawab) atas SO ini (koreksi 02 Okt 2026) -- diteruskan ke
  // Faktur Penjualan saat "Jadikan Faktur", terkunci di sana (lihat
  // penjualan/faktur/index.vue).
  salesmanId: string
  status: 'OPEN' | 'CONVERTED' | 'CANCELLED'
  notes: string | null
  cancelReason?: string | null
  createdAt: string
}
interface SalesOrderLine {
  id: string
  productId: string
  unitId: string
  qtyInput: string
  qtyBaseUnit: string
  unitPrice: string | null
}
interface SalesOrderDetail extends SalesOrderRow {
  lines: SalesOrderLine[]
}
interface LineRow {
  productId: string | undefined
  unitId: string | undefined
  qtyInput: number | undefined
  unitPrice: number | undefined
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Terbuka',
  CONVERTED: 'Sudah Dikonversi',
  CANCELLED: 'Dibatalkan'
}
const STATUS_COLOR: Record<string, 'success' | 'neutral' | 'error'> = {
  OPEN: 'success',
  CONVERTED: 'neutral',
  CANCELLED: 'error'
}

function newLine(): LineRow {
  return { productId: undefined, unitId: undefined, qtyInput: undefined, unitPrice: undefined }
}

const api = useApi()
const router = useRouter()
const route = useRoute()
const { user: authUser } = useAuth()
const { format: rupiah } = useRupiah()
const { format: qtyFmt } = useQty()
const { loadCustomerMap, loadProductMap, loadUnitMap, loadSalesmanMap } = useSalesOrderLookups()

const operatorName = computed(() => authUser.value?.fullName ?? '')

// dd-MM-yyyy (PANDUAN_UI.md §10) -- pola sama pembelian/faktur & gudang/mutasi.
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

const customerMap = ref<Map<string, CustomerLookup>>(new Map())
const productMap = ref<Map<string, ProductLookup>>(new Map())
const unitMap = ref<Map<string, UnitLookup>>(new Map())
const salesmanMap = ref<Map<string, SalesmanLookup>>(new Map())
const loadingOptions = ref(true)

async function loadAllOptions() {
  loadingOptions.value = true
  try {
    const [customers, products, units, salesmen] = await Promise.all([
      loadCustomerMap(), loadProductMap(), loadUnitMap(), loadSalesmanMap()
    ])
    customerMap.value = customers
    productMap.value = products
    unitMap.value = units
    salesmanMap.value = salesmen
  } finally {
    loadingOptions.value = false
  }
}

function customerLabel(id: string): string {
  const c = customerMap.value.get(id)
  return c ? `${c.code} - ${c.name}` : '-'
}
function salesmanLabel(id: string | undefined): string {
  if (!id) return '-'
  const s = salesmanMap.value.get(id)
  return s ? `${s.code} - ${s.name}` : '-'
}
function unitName(id: string | undefined): string {
  if (!id) return ''
  return unitMap.value.get(id)?.name ?? '-'
}

// ---- Bagian A: daftar (PANDUAN_UI.md §5) -----------------------------------
const table = ref()
const selectedRow = ref<SalesOrderRow | null>(null)

const columns: Column<SalesOrderRow>[] = [
  { key: 'orderNumber', label: 'No. Order', mono: true },
  { key: 'customerId', label: 'Pelanggan', format: v => customerLabel(v as string) },
  { key: 'salesmanId', label: 'PJ', format: v => salesmanLabel(v as string) },
  { key: 'orderDate', label: 'Tanggal', format: v => ddmmyyyy(v as string) },
  { key: 'status', label: 'Status', align: 'center', slot: 'status' },
  { key: 'createdAt', label: 'Waktu', format: v => ddmmyyyyHm(v as string) }
]

const filters: FilterDef[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'Terbuka', value: 'OPEN' },
      { label: 'Sudah Dikonversi', value: 'CONVERTED' },
      { label: 'Dibatalkan', value: 'CANCELLED' }
    ]
  }
]

function onRowClick(row: SalesOrderRow) {
  selectedRow.value = row
  openDetail(row)
}
function openDetailSelected() {
  if (selectedRow.value) openDetail(selectedRow.value)
}

// ---- Detail (slideover -- SO nihil print/VOID/review/`/cetak`, satu-satunya
// alasan Faktur Pembelian butuh route [id] penuh (DocumentActions, link
// cetak) tidak berlaku di sini; SO lebih dekat ke pola Mutasi Gudang) --------
const detailOpen = ref(false)
const detail = ref<SalesOrderDetail | null>(null)
const detailStatus = ref<'pending' | 'success' | 'error'>('pending')
const detailError = ref('')

async function openDetail(row: SalesOrderRow) {
  detailOpen.value = true
  detail.value = null
  detailStatus.value = 'pending'
  try {
    detail.value = await api.get<SalesOrderDetail>(`/sales-orders/${row.id}`)
    detailStatus.value = 'success'
  } catch (err) {
    detailStatus.value = 'error'
    detailError.value = getErrorMessage(err, 'Gagal memuat detail Sales Order.')
  }
}

// ---- Batalkan SO yang tidak jadi (need_fixing.md #20) -- bukan VOID: SO
// tidak mengikat uang/stok (CLAUDE.md §2.16), tanpa persetujuan. Alasan wajib.
const cancelOpen = ref(false)
const cancelReason = ref('')
const cancelSubmitting = ref(false)
const cancelError = ref('')
function openCancel() {
  cancelReason.value = ''
  cancelError.value = ''
  cancelOpen.value = true
}
async function submitCancel() {
  if (!detail.value) return
  if (!cancelReason.value.trim()) {
    cancelError.value = 'Alasan pembatalan wajib diisi.'
    return
  }
  cancelSubmitting.value = true
  cancelError.value = ''
  try {
    detail.value = await api.post<SalesOrderDetail>(`/sales-orders/${detail.value.id}/cancel`, { reason: cancelReason.value.trim() })
    cancelOpen.value = false
    table.value?.reload()
  } catch (err) {
    cancelError.value = getErrorMessage(err, 'Gagal membatalkan Sales Order.')
  } finally {
    cancelSubmitting.value = false
  }
}

function lineQtyLabel(line: SalesOrderLine): string {
  return `${qtyFmt(Number(line.qtyInput))} ${unitName(line.unitId)}`
}
function lineAmount(line: SalesOrderLine): number {
  return Number(line.qtyInput) * (line.unitPrice !== null ? Number(line.unitPrice) : 0)
}

// ---- Bagian B: entri via DocumentModal + LineModal (PANDUAN_UI.md §6, §7.2) -
// Satu DocumentModal dipakai dua mode -- editingId null = Entri, terisi = Ubah.
const entriOpen = ref(false)
const editingId = ref<string | null>(null)
const mode = computed<'entri' | 'ubah'>(() => (editingId.value ? 'ubah' : 'entri'))

const customerId = ref<string | undefined>(undefined)
const salesmanId = ref<string | undefined>(undefined)
const orderDate = ref<string>(new Date().toISOString().slice(0, 10))
const notes = ref('')
const lines = ref<LineRow[]>([])

// Draft crash-recovery hanya untuk Entri -- Ubah mengedit record yang sudah
// tersimpan, tidak butuh cerita "lanjutkan dari draft" per-id hari ini
// (simplifikasi sadar, lihat rencana Hari 19 FE).
const draftKey = computed(() => (editingId.value ? undefined : 'md-draft:sales-order:create'))
const draftData = computed(() => ({
  customerId: customerId.value, salesmanId: salesmanId.value, orderDate: orderDate.value, notes: notes.value, lines: lines.value
}))
let entriSnapshot = JSON.stringify(draftData.value)
const entriDirty = computed(() => JSON.stringify(draftData.value) !== entriSnapshot)

function resetEntriForm() {
  customerId.value = undefined
  salesmanId.value = undefined
  orderDate.value = new Date().toISOString().slice(0, 10)
  notes.value = ''
  lines.value = []
  entriSnapshot = JSON.stringify(draftData.value)
}

const documentModalRef = ref<{ clearDraft: () => void, forceClose: () => void } | null>(null)

function openEntri() {
  editingId.value = null
  resetEntriForm()
  entriOpen.value = true
}
function openEditFromDetail(d: SalesOrderDetail) {
  editingId.value = d.id
  customerId.value = d.customerId
  salesmanId.value = d.salesmanId
  orderDate.value = d.orderDate
  notes.value = d.notes ?? ''
  lines.value = d.lines.map(l => ({
    productId: l.productId,
    unitId: l.unitId,
    qtyInput: Number(l.qtyInput),
    unitPrice: l.unitPrice !== null ? Number(l.unitPrice) : undefined
  }))
  entriSnapshot = JSON.stringify(draftData.value)
  detailOpen.value = false
  entriOpen.value = true
}
// "Jadikan Faktur" (RENCANA_REVISI_TESTING_KLIEN.md R4/SO4) -- konversi SO ->
// Faktur adalah primitif internal (SalesOrdersService.markConverted(), Hari
// 19/21), bukan endpoint publik. FE cukup membawa id SO lewat QUERY PARAM ke
// halaman entri Faktur Penjualan (tahan reload, jauh lebih ringan daripada
// menitipkan objek SO utuh lewat state navigasi) -- halaman faktur yang
// fetch ulang detail SO dan mengisi form (lihat prefillFromSalesOrder() di
// penjualan/faktur/index.vue). Operator tetap bebas mengubah apa pun sebelum
// simpan -- SO tidak mengikat stok maupun harga (CLAUDE.md §3).
function jadikanFaktur(d: SalesOrderDetail) {
  detailOpen.value = false
  navigateTo(`/penjualan/faktur/create?fromSalesOrderId=${d.id}`)
}
function restoreDraft(d: unknown) {
  const draft = d as typeof draftData.value
  customerId.value = draft.customerId
  salesmanId.value = draft.salesmanId
  orderDate.value = draft.orderDate
  notes.value = draft.notes
  lines.value = draft.lines
}
function closeEntri() {
  entriOpen.value = false
  editingId.value = null
  if (route.path !== '/penjualan/order') router.replace('/penjualan/order')
}

const customerOptions = computed<SelectOption[]>(() =>
  [...customerMap.value.values()].filter(c => c.isActive).map(c => ({ label: `${c.code} - ${c.name}`, value: c.id })))
const salesmanOptions = computed<SelectOption[]>(() =>
  [...salesmanMap.value.values()].filter(s => s.isActive).map(s => ({ label: `${s.code} - ${s.name}`, value: s.id })))
const productOptions = computed<SelectOption[]>(() =>
  [...productMap.value.values()].filter(p => p.isActive).map(p => ({ label: `${p.displayName} (${p.code})`, value: p.id })))

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

// ---- Baris: LineModal varian pendek §7.2 (kanan: SISA STOK + TERIKAT SO,
// dua angka terpisah -- TIDAK PERNAH dikombinasi/dikurangi. TIDAK ada panel
// riwayat harga meski PANDUAN_UI.md §7.1 poin 2 mewajibkannya untuk Order
// Penjualan -- tidak ada sumber data hari ini, sales_invoice_lines baru ada
// Hari 21. Lihat catatan di rencana Hari 19 FE.) ----------------------------
const lineOpen = ref(false)
const lineEditIndex = ref<number | null>(null)
const lineDraft = ref<LineRow>(newLine())
const lineDirty = ref(false)
const selectedLine = ref<(LineRow & Record<string, unknown>) | null>(null)

// SISA STOK -- GET /products/:id/stock-balance lewat useStockBalance() (R3),
// pola sama Faktur Penjualan/Faktur Pembelian (CLAUDE.md §6, jangan copy-paste
// logika fetch-nya sendiri-sendiri).
const { qtyBaseUnit: stockQtyBaseUnit, loading: stockLoading, fetch: fetchStockBalance } = useStockBalance()

// "TERIKAT SO" -- live dari GET /products/:id/committed-qty, murni informatif
// (CLAUDE.md §2.16/§3), TIDAK PERNAH mengurangi/menggabung dengan sisa stok.
const lineCommittedQty = ref<number | null>(null)
const lineCommittedQtyLoading = ref(false)

async function fetchLineCommittedQty(productId: string | undefined) {
  if (!productId) {
    lineCommittedQty.value = null
    return
  }
  lineCommittedQtyLoading.value = true
  try {
    const res = await api.get<{ productId: string, committedQtyBaseUnit: number }>(`/products/${productId}/committed-qty`)
    lineCommittedQty.value = res.committedQtyBaseUnit
  } catch {
    // Gagal fetch tidak boleh menghalangi entri baris -- info sekunder, tampil "-".
    lineCommittedQty.value = null
  } finally {
    lineCommittedQtyLoading.value = false
  }
}

function openLineEntri() {
  lineDraft.value = newLine()
  lineEditIndex.value = null
  lineDirty.value = false
  lineCommittedQty.value = null
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
  fetchLineCommittedQty(lineDraft.value.productId)
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
function onLineProductChange(rawProductId: string | number | boolean | undefined) {
  const productId = rawProductId as string | undefined
  lineDraft.value.productId = productId
  const allowed = allowedUnitsForProduct(productId)
  const dus = allowed.find(u => normalizeUnitName(u.name) === 'dus')
  lineDraft.value.unitId = dus?.id ?? allowed[0]?.id ?? undefined
  fetchLineCommittedQty(productId)
  fetchStockBalance(productId)
}

// SO3 (RENCANA_REVISI_TESTING_KLIEN.md §3): PERINGATAN qty > sisa stok, BUKAN
// penolakan -- CLAUDE.md §2.8 mengizinkan stok minus secara sengaja, backend
// mengembalikan stockWarning, bukan error. Tombol Simpan TIDAK pernah didisable
// oleh ini.
const lineStockWarningText = computed(() => {
  if (stockQtyBaseUnit.value === null || !lineDraft.value.productId || !lineDraft.value.unitId) return null
  const factor = isiFactor(lineDraft.value)
  if (!factor) return null
  const qtyBaseUnitInput = (lineDraft.value.qtyInput ?? 0) * factor
  if (qtyBaseUnitInput <= stockQtyBaseUnit.value) return null
  const product = productMap.value.get(lineDraft.value.productId)
  const baseUnitName = product?.baseUnit ?? ''
  const conversions = (product?.unitConversions ?? []).map(c => ({ unitName: c.unitName, qtyInBaseUnit: Number(c.qtyInBaseUnit) }))
  const sisa = computeQtyBreakdown(stockQtyBaseUnit.value, baseUnitName, conversions, { largestOnly: true })
  return `Qty melebihi sisa stok (sisa ${sisa}). Boleh dilanjutkan.`
})
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

const lineColumns: Column<LineRow & Record<string, unknown>>[] = [
  { key: 'productId', label: 'Produk', format: v => productOptions.value.find(p => p.value === v)?.label ?? '-' },
  { key: 'qtyInput', label: 'Qty', align: 'right', format: v => qtyFmt(v as number) },
  { key: 'unitId', label: 'Satuan', format: (v, row) => unitOptionsForLine(row).find(u => u.value === v)?.label ?? '-' },
  { key: 'unitPrice', label: 'Harga', align: 'right', format: v => (v != null ? rupiah(v as number, { bare: true }) : '-') }
]

// ---- Validasi & submit ------------------------------------------------------
function validate(): string | null {
  if (!editingId.value && !customerId.value) return 'Pilih pelanggan.'
  if (!salesmanId.value) return 'Pilih salesman (PJ).'
  if (!orderDate.value) return 'Tanggal order wajib diisi.'
  if (lines.value.length === 0) return 'Isi minimal satu baris produk dengan qty lebih dari 0.'
  return null
}

function buildPayload(): Record<string, unknown> {
  const linesPayload = lines.value.map(l => ({
    productId: l.productId,
    unitId: l.unitId,
    qtyInput: l.qtyInput,
    unitPrice: l.unitPrice
  }))
  // customerId SENGAJA tidak pernah dikirim saat Ubah -- UpdateSalesOrderDto
  // backend tidak punya field itu sama sekali (customer terkunci setelah SO
  // dibuat), bukan pilihan FE. salesmanId (PJ) BOLEH dikoreksi selama OPEN
  // (koreksi 02 Okt 2026) -- beda dari customerId, jadi dikirim di DUA mode.
  if (editingId.value) {
    return { orderDate: orderDate.value, salesmanId: salesmanId.value, notes: notes.value || undefined, lines: linesPayload }
  }
  return { customerId: customerId.value, salesmanId: salesmanId.value, orderDate: orderDate.value, notes: notes.value || undefined, lines: linesPayload }
}

const submitting = ref(false)
const bannerError = ref('')

async function submit() {
  const err = validate()
  if (err) {
    bannerError.value = err
    return
  }
  bannerError.value = ''
  submitting.value = true
  try {
    if (editingId.value) {
      await api.patch(`/sales-orders/${editingId.value}`, buildPayload())
    } else {
      await api.post('/sales-orders', buildPayload())
    }
    documentModalRef.value?.clearDraft()
    entriOpen.value = false
    editingId.value = null
    table.value?.reload()
    if (route.path !== '/penjualan/order') router.replace('/penjualan/order')
  } catch (err2) {
    bannerError.value = getErrorMessage(err2, 'Gagal menyimpan Sales Order.')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await loadAllOptions()
  if (props.initialOpen === 'entri') openEntri()
})
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader />

    <DataTable
      ref="table"
      endpoint="/sales-orders"
      :columns="columns"
      :filters="filters"
      :on-row-click="onRowClick"
      selectable
      dense
      zebra
      search-placeholder="Cari nomor order..."
      :default-sort="{ key: 'orderDate', dir: 'desc' }"
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
            @click="openDetailSelected"
          >
            View Detail
          </UButton>
        </div>
      </template>
      <template #status="{ value }">
        <UBadge
          :color="STATUS_COLOR[value as string] ?? 'neutral'"
          variant="subtle"
        >
          {{ STATUS_LABEL[value as string] ?? value }}
        </UBadge>
      </template>
    </DataTable>

    <!-- Detail (slideover -- lihat catatan di atas kenapa bukan halaman/route) -->
    <USlideover
      v-model:open="detailOpen"
      title="Detail Sales Order"
      :description="detail?.orderNumber"
    >
      <template #body>
        <div
          v-if="detailStatus === 'pending'"
          class="flex flex-col gap-2"
        >
          <USkeleton
            v-for="i in 4"
            :key="i"
            class="h-6 w-full"
          />
        </div>
        <UEmpty
          v-else-if="detailStatus === 'error'"
          icon="i-lucide-alert-triangle"
          title="Gagal memuat detail"
          :description="detailError"
        />
        <div
          v-else-if="detail"
          class="flex flex-col gap-4"
        >
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <span class="font-mono font-medium">{{ detail.orderNumber }}</span>
              <UBadge
                :color="STATUS_COLOR[detail.status] ?? 'neutral'"
                variant="subtle"
              >
                {{ STATUS_LABEL[detail.status] }}
              </UBadge>
            </div>
            <div class="text-sm text-muted">
              {{ ddmmyyyy(detail.orderDate) }} · {{ customerLabel(detail.customerId) }} · PJ: {{ salesmanLabel(detail.salesmanId) }}
            </div>
            <div
              v-if="detail.notes"
              class="text-sm"
            >
              {{ detail.notes }}
            </div>
            <div
              v-if="detail.status === 'CANCELLED'"
              class="text-sm text-error"
            >
              Alasan batal: {{ detail.cancelReason ?? '-' }}
            </div>
          </div>

          <DataTable
            :rows="detail.lines as unknown as Record<string, unknown>[]"
            :columns="[
              { key: 'productId', label: 'Produk', format: (v: unknown) => productOptions.find(p => p.value === v)?.label ?? '-' },
              { key: 'qtyInput', label: 'Qty', slot: 'qty' },
              { key: 'unitPrice', label: 'Harga', align: 'right', format: (v: unknown) => (v != null ? rupiah(Number(v), { bare: true }) : '-') },
              { key: 'id', label: 'Jumlah', align: 'right', slot: 'amount' }
            ]"
            dense
            zebra
            :searchable="false"
          >
            <template #qty="{ row }">
              {{ lineQtyLabel(row as unknown as SalesOrderLine) }}
            </template>
            <template #amount="{ row }">
              {{ rupiah(lineAmount(row as unknown as SalesOrderLine), { bare: true }) }}
            </template>
          </DataTable>

          <TotalsBar
            :items="[
              { label: 'Item', value: String(detail.lines.length) },
              { label: 'Qty', value: qtyFmt(detail.lines.reduce((s, l) => s + Number(l.qtyInput), 0)) },
              { label: 'Total', value: rupiah(detail.lines.reduce((s, l) => s + lineAmount(l), 0), { bare: true }), emphasize: true }
            ]"
          />

          <div class="flex items-center gap-2">
            <UButton
              v-if="detail.status === 'OPEN'"
              icon="i-lucide-pencil"
              color="neutral"
              variant="subtle"
              @click="openEditFromDetail(detail)"
            >
              Ubah
            </UButton>
            <UButton
              v-if="detail.status === 'OPEN'"
              icon="i-lucide-file-text"
              color="primary"
              variant="subtle"
              @click="jadikanFaktur(detail)"
            >
              Jadikan Faktur
            </UButton>
            <UButton
              v-if="detail.status === 'OPEN'"
              icon="i-lucide-x-circle"
              color="error"
              variant="subtle"
              @click="openCancel()"
            >
              Batalkan SO
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>

    <UModal
      v-model:open="cancelOpen"
      title="Batalkan Sales Order"
      description="SO yang dibatalkan tidak bisa diubah atau dijadikan faktur lagi."
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <UAlert
            v-if="cancelError"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-triangle"
            :description="cancelError"
          />
          <UFormField
            label="Alasan"
            required
          >
            <UTextarea
              v-model="cancelReason"
              class="w-full"
              placeholder="mis. Pelanggan batal pesan"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            color="neutral"
            variant="ghost"
            @click="cancelOpen = false"
          >
            Kembali
          </UButton>
          <UButton
            color="error"
            :loading="cancelSubmitting"
            :disabled="cancelSubmitting"
            @click="submitCancel"
          >
            Batalkan SO
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Bagian B: entri/ubah dua lapis modal -->
    <DocumentModal
      ref="documentModalRef"
      :open="entriOpen"
      title="Sales Order"
      :mode="mode"
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
          v-if="bannerError"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          :title="bannerError"
          :close="{ icon: 'i-lucide-x', color: 'neutral', variant: 'link' }"
          @update:open="bannerError = ''"
        />

        <div class="grid grid-cols-2 gap-y-1.5 gap-x-4">
          <UFormField
            label="Pelanggan"
            required
            :hint="editingId ? 'Pelanggan tidak bisa diubah setelah Sales Order dibuat.' : undefined"
          >
            <UInputMenu
              v-model="customerId"
              value-key="value"
              :items="customerOptions"
              :disabled="!!editingId"
              placeholder="Pilih pelanggan..."
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Salesman (PJ)"
            required
            hint="Penanggung jawab order ini -- diteruskan ke Faktur Penjualan saat 'Jadikan Faktur'."
          >
            <UInputMenu
              v-model="salesmanId"
              value-key="value"
              :items="salesmanOptions"
              placeholder="Pilih salesman..."
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Tanggal Order"
            required
          >
            <UInput
              v-model="orderDate"
              type="date"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Catatan"
            class="col-span-2"
          >
            <UTextarea
              v-model="notes"
              class="w-full"
            />
          </UFormField>
        </div>
      </template>

      <template #lines>
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-1">
            <UButton
              icon="i-lucide-plus"
              size="xs"
              variant="subtle"
              @click="openLineEntri"
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
          </div>
          <DataTable
            :rows="lines as unknown as Record<string, unknown>[]"
            :columns="lineColumns as Column<Record<string, unknown>>[]"
            :on-row-click="onLineRowClick"
            selectable
            dense
            zebra
            :searchable="false"
          />
        </div>
      </template>

      <template #totals>
        <TotalsBar
          :items="[
            { label: 'Item', value: String(lines.length) },
            { label: 'Qty', value: qtyFmt(lines.reduce((s, l) => s + (l.qtyInput ?? 0), 0)) },
            { label: 'Total', value: rupiah(lines.reduce((s, l) => s + (l.qtyInput ?? 0) * (l.unitPrice ?? 0), 0), { bare: true }), emphasize: true }
          ]"
        />
      </template>
    </DocumentModal>

    <LineModal
      :open="lineOpen"
      title="Baris Sales Order"
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
          <p
            v-if="lineStockWarningText"
            class="text-xs text-warning mt-1"
          >
            {{ lineStockWarningText }}
          </p>
        </UFormField>
        <UFormField
          label="Harga @"
          hint="Opsional, murni informasi -- Sales Order tidak mengikat uang."
        >
          <MoneyInput
            v-model="lineDraft.unitPrice"
            placeholder="0"
            :min="0"
            class="w-full"
            @update:model-value="lineDirty = true"
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
        <span class="text-xs font-medium text-muted mt-2">TERIKAT SO</span>
        <USkeleton
          v-if="lineCommittedQtyLoading"
          class="h-6 w-24"
        />
        <UBadge
          v-else
          color="info"
          variant="subtle"
        >
          {{ lineCommittedQty !== null ? `${qtyFmt(lineCommittedQty)} ${lineDraft.productId ? (productMap.get(lineDraft.productId)?.baseUnit ?? '') : ''}` : '-' }}
        </UBadge>
      </template>
    </LineModal>
  </div>
</template>
