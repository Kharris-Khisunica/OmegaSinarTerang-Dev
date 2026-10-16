<script setup lang="ts">
import type { Column, FilterDef } from '~/types/data-table'
import type { SelectOption } from '~/types/crud-form'
import type { ProductLookup } from '~/composables/useWarehouseMutationLookups'

// Dipakai baik sebagai rute /gudang/mutasi (daftar) MAUPUN diimpor sebagai
// komponen oleh create.vue (initial-open="entri") — pola sama
// MasterDataCrudPage.vue (PANDUAN_UI.md §16.1), disesuaikan manual karena
// modul transaksi tidak schema-driven generik seperti master data.
definePageMeta({ title: 'Mutasi Gudang', roles: ['MASTER', 'OPERATOR'] })

const props = defineProps<{
  initialOpen?: 'entri'
}>()

interface MutationRow extends Record<string, unknown> {
  id: string
  mutationNumber: string
  mutationDate: string
  mutationType: 'TITIPAN_PELANGGAN' | 'TRANSFER'
  fromWarehouseId: string
  toWarehouseId: string
  postingStatus: 'POSTED' | 'VOIDED'
  printStatus: 'NOT_PRINTED' | 'PRINTED' | 'PRINT_CANCELLED'
  createdAt: string
}
interface MutationLine {
  id: string
  productId: string
  qtyBaseUnit: string
  unitCost: string | null
}
interface MutationDetail extends MutationRow {
  notes: string | null
  lines: MutationLine[]
}
interface WarehouseOption {
  id: string
  name: string
  warehouseType: 'STORE' | 'TITIPAN_PELANGGAN' | 'BAD_STOCK'
  customerId: string | null
  isActive: boolean
}
interface CustomerOption {
  id: string
  code: string
  name: string
}
interface LineRow {
  productId: string | undefined
  // Yang DIKETIK operator: angka + satuan (need_fixing.md #28, default satuan
  // terbesar). qtyBaseUnit = qtyInput × isi, dihitung di saveLine() -- itulah
  // satu-satunya angka yang dikirim ke backend.
  qtyInput?: number
  unitName?: string
  qtyBaseUnit: number | undefined
  // WAJIB untuk mode TITIPAN (paket R8 keputusan K7) -- baris dipilih DARI
  // BARIS FAKTUR, bukan dari master produk. undefined untuk mode TRANSFER.
  salesInvoiceLineId?: string
}
interface CreateResult {
  mutation: { id: string, mutationNumber: string, mutationType: 'TITIPAN_PELANGGAN' | 'TRANSFER' }
  lines: MutationLine[]
  stockWarnings: string[]
}
// Paket R8 (docs/RENCANA_REVISI_TESTING_KLIEN.md §2A K7) -- GET
// /warehouse-mutations/titipan-faktur{,/:id/lines}.
interface FakturOption {
  id: string
  invoiceNumber: string
  invoiceDate: string
}
interface FakturLineOption {
  id: string
  productId: string
  qtyBaseUnit: number
  alreadyTitipanQtyBaseUnit: number
  remainingQtyBaseUnit: number
}

const api = useApi()
const router = useRouter()
const route = useRoute()
const { format: rupiah } = useRupiah()
const { format: qtyFmt } = useQty()
const { withStepUp } = useStepUp()
const { loadProductMap, loadCustomerMap } = useWarehouseMutationLookups()

// dd-MM-yyyy (PANDUAN_UI.md §10) -- formatDate() bersama dipakai seluruh app
// dengan pemisah "/" (konvensi lama, di luar lingkup 10 berkas Hari 16B untuk
// diubah global) -- helper lokal ini cuma mengganti pemisahnya, tanpa
// menyentuh util bersama.
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

const productMap = ref<Map<string, ProductLookup>>(new Map())
const warehouses = ref<WarehouseOption[]>([])
const warehouseNameById = ref<Map<string, { name: string, customerId: string | null }>>(new Map())
const customerMap = ref<Map<string, CustomerOption>>(new Map())
const loadingOptions = ref(true)

async function loadAllOptions() {
  loadingOptions.value = true
  try {
    const [products, wh, customers] = await Promise.all([
      loadProductMap(),
      api.get<{ data: WarehouseOption[] }>('/warehouses', { limit: 200 }),
      loadCustomerMap()
    ])
    productMap.value = products
    warehouses.value = wh.data
    warehouseNameById.value = new Map(wh.data.map(w => [w.id, { name: w.name, customerId: w.customerId }]))
    customerMap.value = customers
  } finally {
    loadingOptions.value = false
  }
}

function warehouseName(id: string): string {
  return warehouseNameById.value.get(id)?.name ?? '-'
}

const TYPE_LABEL: Record<string, string> = {
  TITIPAN_PELANGGAN: 'Titipan Pelanggan',
  TRANSFER: 'Transfer'
}

// ---- Bagian A: daftar (PANDUAN_UI.md §5) -----------------------------------
const table = ref()
const selectedRow = ref<MutationRow | null>(null)

const columns: Column<MutationRow>[] = [
  { key: 'mutationNumber', label: 'No. Mutasi', mono: true },
  { key: 'mutationDate', label: 'Tanggal', format: v => ddmmyyyy(v as string) },
  { key: 'mutationType', label: 'Tipe', slot: 'mutationType' },
  {
    key: 'fromWarehouseId',
    label: 'Dari -> Ke',
    format: (_v, row) => `${warehouseName(row.fromWarehouseId)} -> ${warehouseName(row.toWarehouseId)}`
  },
  { key: 'postingStatus', label: 'Status', align: 'center', slot: 'postingStatus' },
  { key: 'printStatus', label: 'P', align: 'center', slot: 'printCheck' },
  { key: 'createdAt', label: 'Waktu', format: v => ddmmyyyyHm(v as string) }
]

const filters: FilterDef[] = [
  {
    key: 'mutationType',
    label: 'Tipe',
    type: 'select',
    options: [
      { label: 'Titipan Pelanggan', value: 'TITIPAN_PELANGGAN' },
      { label: 'Transfer', value: 'TRANSFER' }
    ]
  }
]

function onRowClick(row: MutationRow) {
  selectedRow.value = row
}

// ---- Detail (slideover -- tidak ada halaman /gudang/mutasi/[id] di lingkup
// 10 berkas Hari 16B, jadi TETAP slideover, dipicu toolbar "View Detail" atau
// dobel-klik, bukan navigasi rute). Cetak/Batal Cetak/Pengecekan tidak
// berlaku untuk GD -- backend warehouse-mutations tidak punya endpoint print/
// edit/void/unlock-print sama sekali dan tidak punya reviewStatus (dikonfirmasi
// langsung dari warehouse-mutations.controller.ts) -- tombolnya DIHILANGKAN,
// bukan ditampilkan lalu diberi alert "belum didukung".
const detailOpen = ref(false)
const detail = ref<MutationDetail | null>(null)
const detailStatus = ref<'pending' | 'success' | 'error'>('pending')
const detailError = ref('')

async function openDetail(row: MutationRow) {
  detailOpen.value = true
  detail.value = null
  detailStatus.value = 'pending'
  try {
    detail.value = await api.get<MutationDetail>(`/warehouse-mutations/${row.id}`)
    detailStatus.value = 'success'
  } catch (err) {
    detailStatus.value = 'error'
    detailError.value = getErrorMessage(err, 'Gagal memuat detail mutasi.')
  }
}
function openDetailSelected() {
  if (selectedRow.value) openDetail(selectedRow.value)
}
function openCetakSelected() {
  if (selectedRow.value) window.open(`/gudang/mutasi/${selectedRow.value.id}/cetak`, '_blank')
}

function productName(id: string): string {
  const p = productMap.value.get(id)
  return p ? `${p.displayName} (${p.code})` : id
}
function qtyLabel(line: { productId: string, qtyBaseUnit: string }): string {
  const product = productMap.value.get(line.productId)
  if (!product) return line.qtyBaseUnit
  return computeQtyBreakdown(
    Number(line.qtyBaseUnit),
    product.baseUnit,
    product.unitConversions.map(c => ({ unitName: c.unitName, qtyInBaseUnit: Number(c.qtyInBaseUnit) }))
  )
}
// Sama seperti qtyLabel() tapi menerima angka mentah -- dipakai kolom
// Qty Faktur/Sudah Dititip/Sisa di pemilih baris faktur (nol tampil "-",
// PANDUAN_UI.md §14.2).
function qtyBreakdownFor(productId: string, qtyBaseUnit: number): string {
  if (qtyBaseUnit === 0) return '-'
  const product = productMap.value.get(productId)
  if (!product) return qtyFmt(qtyBaseUnit)
  return computeQtyBreakdown(
    qtyBaseUnit,
    product.baseUnit,
    product.unitConversions.map(c => ({ unitName: c.unitName, qtyInBaseUnit: Number(c.qtyInBaseUnit) }))
  )
}

// ---- Bagian B: entri via DocumentModal + LineModal (PANDUAN_UI.md §6, §7.2) -
// Absorbsi penuh logika yang sebelumnya di create.vue -- create.vue sekarang
// cuma <ModuleIndexPage initial-open="entri" /> (lihat berkas itu).
const entriOpen = ref(false)
const { user: authUser } = useAuth()
const operatorName = computed(() => authUser.value?.fullName ?? '')

const mode = ref<'TITIPAN' | 'TRANSFER' | null>(null)
const mutationDate = ref<string>(new Date().toISOString().slice(0, 10))
const customerId = ref<string | undefined>(undefined)
// Paket R8 K7 -- satu dokumen mutasi titipan merujuk tepat satu faktur.
const salesInvoiceId = ref<string | undefined>(undefined)
const fakturOptions = ref<FakturOption[]>([])
const fakturLines = ref<FakturLineOption[]>([])
const loadingFaktur = ref(false)
const loadingFakturLines = ref(false)
const selectedFakturLineId = ref<string | undefined>(undefined)
const fromWarehouseId = ref<string | undefined>(undefined)
const toWarehouseId = ref<string | undefined>(undefined)
const notes = ref('')
const lines = ref<LineRow[]>([])

const draftKey = 'md-draft:warehouse-mutation:create'
const draftData = computed(() => ({
  mode: mode.value, mutationDate: mutationDate.value, customerId: customerId.value,
  salesInvoiceId: salesInvoiceId.value,
  fromWarehouseId: fromWarehouseId.value, toWarehouseId: toWarehouseId.value,
  notes: notes.value, lines: lines.value
}))
let entriSnapshot = JSON.stringify(draftData.value)
const entriDirty = computed(() => JSON.stringify(draftData.value) !== entriSnapshot)

function resetEntriForm() {
  mode.value = null
  mutationDate.value = new Date().toISOString().slice(0, 10)
  customerId.value = undefined
  salesInvoiceId.value = undefined
  fakturOptions.value = []
  fakturLines.value = []
  selectedFakturLineId.value = undefined
  fromWarehouseId.value = undefined
  toWarehouseId.value = undefined
  notes.value = ''
  lines.value = []
  entriSnapshot = JSON.stringify(draftData.value)
}

// Jenis mutasi hanya boleh salah satu -- ganti jenis membuang isian jenis
// lain dan baris yang sudah dientri, supaya tidak ada state tersembunyi dari
// mode sebelumnya yang ikut terkirim (mis. salesInvoiceId TITIPAN lama masih
// nempel saat operator berpindah ke TRANSFER).
function selectMode(next: 'TITIPAN' | 'TRANSFER') {
  if (mode.value === next) return
  mode.value = next
  lines.value = []
  selectedLine.value = null
  if (next === 'TITIPAN') {
    fromWarehouseId.value = undefined
    toWarehouseId.value = undefined
  } else {
    customerId.value = undefined
    salesInvoiceId.value = undefined
    fakturOptions.value = []
    fakturLines.value = []
    selectedFakturLineId.value = undefined
  }
}

async function loadFakturOptions(forCustomerId: string) {
  loadingFaktur.value = true
  try {
    fakturOptions.value = await api.get<FakturOption[]>('/warehouse-mutations/titipan-faktur', { customerId: forCustomerId })
  } finally {
    loadingFaktur.value = false
  }
}
async function loadFakturLines(invoiceId: string) {
  loadingFakturLines.value = true
  try {
    fakturLines.value = await api.get<FakturLineOption[]>(`/warehouse-mutations/titipan-faktur/${invoiceId}/lines`)
  } finally {
    loadingFakturLines.value = false
  }
}
async function onCustomerChange() {
  salesInvoiceId.value = undefined
  fakturLines.value = []
  fakturOptions.value = []
  lines.value = []
  selectedLine.value = null
  if (customerId.value) await loadFakturOptions(customerId.value)
}
async function onFakturChange() {
  fakturLines.value = []
  lines.value = []
  selectedLine.value = null
  if (salesInvoiceId.value) await loadFakturLines(salesInvoiceId.value)
}

const documentModalRef = ref<{ clearDraft: () => void, forceClose: () => void } | null>(null)

function openEntri() {
  resetEntriForm()
  entriOpen.value = true
}
function restoreDraft(d: unknown) {
  const draft = d as typeof draftData.value
  mode.value = draft.mode
  mutationDate.value = draft.mutationDate
  customerId.value = draft.customerId
  salesInvoiceId.value = draft.salesInvoiceId
  fromWarehouseId.value = draft.fromWarehouseId
  toWarehouseId.value = draft.toWarehouseId
  notes.value = draft.notes
  lines.value = draft.lines
  // fakturOptions/fakturLines TIDAK ikut tersimpan di draft (ephemeral,
  // sumbernya DB) -- dimuat ulang di sini supaya tabel pemilih baris & label
  // faktur kembali terisi setelah draft dipulihkan.
  if (draft.mode === 'TITIPAN' && draft.customerId) {
    loadFakturOptions(draft.customerId)
    if (draft.salesInvoiceId) loadFakturLines(draft.salesInvoiceId)
  }
}
function closeEntri() {
  entriOpen.value = false
  if (route.path !== '/gudang/mutasi') router.replace('/gudang/mutasi')
}

const activeWarehouses = computed(() => warehouses.value.filter(w => w.isActive && w.warehouseType !== 'TITIPAN_PELANGGAN'))
const warehouseOptions = computed<SelectOption[]>(() => activeWarehouses.value.map(w => ({ label: w.name, value: w.id })))
const customerOptions = computed<SelectOption[]>(() =>
  [...customerMap.value.values()].map(c => ({ label: `${c.code} - ${c.name}`, value: c.id })))
const fakturSelectOptions = computed<SelectOption[]>(() =>
  fakturOptions.value.map(f => ({ label: `${f.invoiceNumber} (${ddmmyyyy(f.invoiceDate)})`, value: f.id })))
const fromWh = computed(() => activeWarehouses.value.find(w => w.id === fromWarehouseId.value))
const toWh = computed(() => activeWarehouses.value.find(w => w.id === toWarehouseId.value))

const direction = computed<'STORE_TO_BS' | 'BS_TO_STORE' | 'INVALID' | null>(() => {
  if (!fromWh.value || !toWh.value) return null
  if (fromWarehouseId.value === toWarehouseId.value) return 'INVALID'
  if (fromWh.value.warehouseType === 'STORE' && toWh.value.warehouseType === 'BAD_STOCK') return 'STORE_TO_BS'
  if (fromWh.value.warehouseType === 'BAD_STOCK' && toWh.value.warehouseType === 'STORE') return 'BS_TO_STORE'
  return 'INVALID'
})

const productOptions = computed<SelectOption[]>(() =>
  [...productMap.value.values()].map(p => ({ label: `${p.displayName} (${p.code})`, value: p.id })))

// ---- Baris: LineModal varian pendek §7.2 -- TANPA panel riwayat harga,
// Harga Pokok TIDAK PERNAH ada di sini sama sekali (baris baru belum
// tersimpan, belum punya lot/unit_cost -- itu baru muncul di HASIL submit,
// N5 murni informasi read-only di bawah, bukan field yang bisa diketik).
const lineOpen = ref(false)
const lineEditIndex = ref<number | null>(null)
const lineDraft = ref<LineRow>({ productId: undefined, qtyInput: undefined, unitName: undefined, qtyBaseUnit: undefined, salesInvoiceLineId: undefined })
const lineDirty = ref(false)
const lineUnitChoices = computed(() => unitChoicesForProduct(lineDraft.value.productId ? productMap.value.get(lineDraft.value.productId) : undefined))
const lineUnitOptions = computed(() => lineUnitChoices.value.map(u => ({
  label: u.factor === 1 ? u.name : `${u.name} (isi ${qtyFmt(u.factor)})`,
  value: u.name
})))
function draftQtyBaseUnit(): number {
  const qty = lineDraft.value.qtyInput ?? 0
  return Math.round(qty * unitFactor(lineUnitChoices.value, lineDraft.value.unitName) * 10000) / 10000
}
// Isi ulang angka + satuan dari qty satuan dasar (sisa titipan, baris lama/
// draf sebelum #28) -- satuan terbesar yang membaginya habis.
function fillDraftFromBase(productId: string | undefined, qtyBaseUnit: number | undefined) {
  const choices = unitChoicesForProduct(productId ? productMap.value.get(productId) : undefined)
  if (qtyBaseUnit === undefined) {
    lineDraft.value.qtyInput = undefined
    lineDraft.value.unitName = choices[0]?.name
    return
  }
  const { qty, unitName } = largestExactUnit(choices, qtyBaseUnit)
  lineDraft.value.qtyInput = qty
  lineDraft.value.unitName = unitName
}
function onLineProductChange() {
  lineDraft.value.unitName = lineUnitChoices.value[0]?.name
  lineDirty.value = true
}
function lineQtyText(line: LineRow): string {
  if (line.qtyInput !== undefined && line.unitName) return `${qtyFmt(line.qtyInput)} ${line.unitName}`
  return qtyBreakdownFor(line.productId ?? '', line.qtyBaseUnit ?? 0)
}
const lineFormError = ref('')

const selectedLine = ref<(LineRow & Record<string, unknown>) | null>(null)

function onLineRowClick(row: Record<string, unknown>) {
  selectedLine.value = row as LineRow & Record<string, unknown>
}
function openLineEntri() {
  lineDraft.value = { productId: undefined, qtyInput: undefined, unitName: undefined, qtyBaseUnit: undefined, salesInvoiceLineId: undefined }
  lineEditIndex.value = null
  lineDirty.value = false
  lineFormError.value = ''
  selectedFakturLineId.value = undefined
  lineOpen.value = true
}
function openLineEditSelected() {
  if (!selectedLine.value) return
  const index = lines.value.indexOf(selectedLine.value as LineRow)
  if (index === -1) return
  lineDraft.value = {
    productId: selectedLine.value.productId,
    qtyInput: selectedLine.value.qtyInput,
    unitName: selectedLine.value.unitName,
    qtyBaseUnit: selectedLine.value.qtyBaseUnit,
    salesInvoiceLineId: selectedLine.value.salesInvoiceLineId
  }
  if (lineDraft.value.qtyInput === undefined || !lineDraft.value.unitName) {
    fillDraftFromBase(lineDraft.value.productId, lineDraft.value.qtyBaseUnit)
  }
  lineEditIndex.value = index
  lineDirty.value = false
  lineFormError.value = ''
  selectedFakturLineId.value = selectedLine.value.salesInvoiceLineId as string | undefined
  lineOpen.value = true
}
function removeSelectedLine() {
  if (!selectedLine.value) return
  const index = lines.value.indexOf(selectedLine.value as LineRow)
  if (index === -1) return
  lines.value.splice(index, 1)
  selectedLine.value = null
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
  lineFormError.value = ''
  lineDraft.value.qtyBaseUnit = draftQtyBaseUnit()
  if (mode.value === 'TITIPAN') {
    if (!lineDraft.value.salesInvoiceLineId) {
      lineFormError.value = 'Pilih baris faktur terlebih dahulu.'
      return
    }
    if (!((lineDraft.value.qtyBaseUnit ?? 0) > 0)) {
      lineFormError.value = 'Qty harus lebih dari 0.'
      return
    }
    // Batas dari BARIS FAKTUR (paket R8 K7), bukan perkiraan stok (beda dari
    // peringatan R3) -- lebih dari sisa DITOLAK di sini, bukan sekadar
    // diperingatkan, karena sisanya sudah punya dasar dokumen yang pasti.
    const remaining = remainingForFakturLine(lineDraft.value.salesInvoiceLineId, lineEditIndex.value)
    if ((lineDraft.value.qtyBaseUnit ?? 0) > remaining) {
      lineFormError.value = `Qty melebihi sisa yang boleh dititip pada baris faktur ini (sisa: ${qtyBreakdownFor(lineDraft.value.productId ?? '', remaining)}).`
      return
    }
  } else if (!lineDraft.value.productId || !((lineDraft.value.qtyBaseUnit ?? 0) > 0)) {
    return
  }
  if (lineEditIndex.value === null) lines.value.push({ ...lineDraft.value })
  else lines.value[lineEditIndex.value] = { ...lineDraft.value }
  lineOpen.value = false
}

const lineColumns: Column<LineRow & Record<string, unknown>>[] = [
  { key: 'productId', label: 'Produk', format: v => productOptions.value.find(p => p.value === v)?.label ?? '-' },
  { key: 'qtyBaseUnit', label: 'Qty', align: 'right', format: (_v, row) => lineQtyText(row) }
]

// ---- Pemilih baris faktur (mode TITIPAN, paket R8 K7) ----------------------
// "Sisa" dihitung ulang di sini (bukan cuma dibaca dari fakturLines apa
// adanya) supaya ikut memperhitungkan baris lain yang SUDAH ditambahkan ke
// draft dokumen ini tapi BELUM disimpan -- tanpa ini, dua baris draft yang
// menunjuk baris faktur yang sama akan sama-sama menampilkan sisa penuh dan
// operator bisa mengetik qty yang totalnya melebihi baris faktur padahal FE
// belum sempat menolaknya.
function remainingForFakturLine(fakturLineId: string, excludeDraftIndex: number | null): number {
  const base = fakturLines.value.find(l => l.id === fakturLineId)?.remainingQtyBaseUnit ?? 0
  const consumedInDraft = lines.value.reduce((sum, l, idx) => {
    if (idx === excludeDraftIndex) return sum
    if (l.salesInvoiceLineId === fakturLineId) return sum + (l.qtyBaseUnit ?? 0)
    return sum
  }, 0)
  return base - consumedInDraft
}

function onFakturLineRowClick(row: Record<string, unknown>) {
  const fakturLineId = row.id as string
  const remaining = remainingForFakturLine(fakturLineId, lineEditIndex.value)
  if (remaining <= 0) {
    lineFormError.value = 'Baris faktur ini sudah habis dititip (sisa 0).'
    return
  }
  lineFormError.value = ''
  selectedFakturLineId.value = fakturLineId
  lineDraft.value = {
    productId: row.productId as string,
    qtyBaseUnit: remaining,
    salesInvoiceLineId: fakturLineId
  }
  fillDraftFromBase(row.productId as string, remaining)
  lineDirty.value = true
}

function fakturLineRowClass(row: Record<string, unknown>): string {
  const remaining = remainingForFakturLine(row.id as string, lineEditIndex.value)
  const classes: string[] = []
  if (remaining <= 0) classes.push('opacity-40')
  if (row.id === selectedFakturLineId.value) classes.push('bg-primary/10')
  return classes.join(' ')
}

const fakturLineColumns = computed<Column<Record<string, unknown>>[]>(() => [
  { key: 'productId', label: 'Produk', format: v => productName(v as string) },
  {
    key: 'qtyBaseUnit',
    label: 'Qty Faktur',
    align: 'right',
    format: (v, row) => qtyBreakdownFor(row.productId as string, v as number)
  },
  {
    key: 'alreadyTitipanQtyBaseUnit',
    label: 'Sudah Dititip',
    align: 'right',
    format: (v, row) => qtyBreakdownFor(row.productId as string, v as number)
  },
  {
    key: 'remainingQtyBaseUnit',
    label: 'Sisa Boleh Dititip',
    align: 'right',
    format: (_v, row) => qtyBreakdownFor(row.productId as string, remainingForFakturLine(row.id as string, lineEditIndex.value))
  }
])

// ---- Validasi & submit (dipindah apa adanya dari create.vue) ---------------
function validate(): string | null {
  if (!mode.value) return 'Pilih jenis mutasi terlebih dahulu.'
  if (mode.value === 'TITIPAN') {
    if (!customerId.value) return 'Pilih pelanggan.'
    if (!salesInvoiceId.value) return 'Pilih faktur penjualan.'
  }
  if (mode.value === 'TRANSFER') {
    if (!fromWarehouseId.value || !toWarehouseId.value) return 'Pilih gudang asal dan tujuan.'
    if (direction.value === 'INVALID') {
      return 'Kombinasi gudang asal/tujuan tidak valid. Hanya STORE<->BAD_STOCK yang didukung untuk mutasi transfer.'
    }
  }
  if (lines.value.length === 0) return 'Isi minimal satu baris produk dengan qty lebih dari 0.'
  return null
}

function buildPayload(): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    mutationDate: mutationDate.value || undefined,
    notes: notes.value || undefined,
    lines: lines.value.map(l => mode.value === 'TITIPAN'
      ? { productId: l.productId, qtyBaseUnit: l.qtyBaseUnit, salesInvoiceLineId: l.salesInvoiceLineId }
      : { productId: l.productId, qtyBaseUnit: l.qtyBaseUnit })
  }
  if (mode.value === 'TITIPAN') {
    payload.customerId = customerId.value
    payload.salesInvoiceId = salesInvoiceId.value
  } else {
    payload.fromWarehouseId = fromWarehouseId.value
    payload.toWarehouseId = toWarehouseId.value
  }
  return payload
}

const submitting = ref(false)
const bannerError = ref('')
const cancelledNotice = ref(false)
const result = ref<CreateResult | null>(null)
const resultOpen = ref(false)

async function submit() {
  const err = validate()
  if (err) {
    bannerError.value = err
    return
  }
  bannerError.value = ''
  cancelledNotice.value = false
  submitting.value = true
  try {
    result.value = await withStepUp(headers =>
      api.post<CreateResult>('/warehouse-mutations', buildPayload(), headers)
    )
    documentModalRef.value?.clearDraft()
    entriOpen.value = false
    resultOpen.value = true
    table.value?.reload()
    if (route.path !== '/gudang/mutasi') router.replace('/gudang/mutasi')
  } catch (err2) {
    if (err2 instanceof StepUpCancelledError) {
      cancelledNotice.value = true
      return
    }
    bannerError.value = getErrorMessage(err2, 'Gagal membuat mutasi gudang.')
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
      endpoint="/warehouse-mutations"
      :columns="columns"
      :filters="filters"
      :on-row-click="onRowClick"
      selectable
      dense
      zebra
      search-placeholder="Cari nomor mutasi..."
      :default-sort="{ key: 'mutationDate', dir: 'desc' }"
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
            @click="openCetakSelected"
          >
            Cetak
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
      <template #mutationType="{ value }">
        <UBadge
          :color="value === 'TITIPAN_PELANGGAN' ? 'info' : 'neutral'"
          variant="subtle"
        >
          {{ TYPE_LABEL[value as string] ?? value }}
        </UBadge>
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
    </DataTable>

    <!-- Detail (slideover -- lihat catatan di atas kenapa bukan halaman) -->
    <USlideover
      v-model:open="detailOpen"
      title="Detail Mutasi Gudang"
      :description="detail?.mutationNumber"
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
              <span class="font-mono font-medium">{{ detail.mutationNumber }}</span>
              <UBadge
                :color="detail.mutationType === 'TITIPAN_PELANGGAN' ? 'info' : 'neutral'"
                variant="subtle"
              >
                {{ TYPE_LABEL[detail.mutationType] }}
              </UBadge>
            </div>
            <div class="text-sm text-muted">
              {{ ddmmyyyy(detail.mutationDate) }} · {{ warehouseName(detail.fromWarehouseId) }}
              -> {{ warehouseName(detail.toWarehouseId) }}
            </div>
            <div
              v-if="detail.notes"
              class="text-sm"
            >
              {{ detail.notes }}
            </div>
          </div>

          <DataTable
            :rows="detail.lines as unknown as Record<string, unknown>[]"
            :columns="[
              { key: 'productId', label: 'Produk', format: (v: unknown) => productName(v as string) },
              { key: 'qtyBaseUnit', label: 'Qty', format: (_v: unknown, row: Record<string, unknown>) => qtyLabel(row as { productId: string, qtyBaseUnit: string }) },
              { key: 'unitCost', label: 'Harga Pokok / Satuan', align: 'right', slot: 'unitCost' }
            ]"
            dense
            zebra
            :searchable="false"
          >
            <template #unitCost="{ value }">
              <!-- Info saja, bukan input -- unit_cost tidak pernah bisa
                   diketik dari layar mana pun (CLAUDE.md §3). -->
              <span
                v-if="value !== null"
                class="inline-block px-2 py-1 rounded border border-default bg-elevated/50"
              >
                {{ rupiah(Number(value)) }}
              </span>
              <span
                v-else
                class="text-muted"
              >-</span>
            </template>
          </DataTable>

          <UButton
            :to="`/gudang/mutasi/${detail.id}/cetak`"
            target="_blank"
            icon="i-lucide-printer"
            color="neutral"
            variant="subtle"
          >
            Cetak Nota
          </UButton>
        </div>
      </template>
    </USlideover>

    <!-- Bagian B: entri dua lapis modal -->
    <DocumentModal
      ref="documentModalRef"
      :open="entriOpen"
      title="Mutasi Gudang"
      mode="entri"
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
        <UAlert
          v-if="cancelledNotice"
          color="neutral"
          variant="subtle"
          icon="i-lucide-x"
          title="Dibatalkan"
          description="Persetujuan dibatalkan sebelum selesai — mutasi belum tersimpan."
        />

        <div class="grid grid-cols-2 gap-y-1.5 gap-x-4">
          <UFormField
            label="Jenis Mutasi"
            required
            class="col-span-2"
          >
            <UFieldGroup>
              <UButton
                :color="mode === 'TITIPAN' ? 'primary' : 'neutral'"
                :variant="mode === 'TITIPAN' ? 'solid' : 'subtle'"
                @click="selectMode('TITIPAN')"
              >
                Titipan Pelanggan
              </UButton>
              <UButton
                :color="mode === 'TRANSFER' ? 'primary' : 'neutral'"
                :variant="mode === 'TRANSFER' ? 'solid' : 'subtle'"
                @click="selectMode('TRANSFER')"
              >
                Transfer Gudang (STORE &lt;-&gt; BAD_STOCK)
              </UButton>
            </UFieldGroup>
          </UFormField>

          <UFormField label="Tanggal Mutasi">
            <UInput
              v-model="mutationDate"
              type="date"
              class="w-full"
            />
          </UFormField>

          <UFormField
            v-if="mode === 'TITIPAN'"
            label="Pelanggan"
            required
            hint="Barang dianggap sudah dibeli & dibayar pelanggan ini. Gudang asal otomatis STORE."
          >
            <UInputMenu
              v-model="customerId"
              value-key="value"
              :items="customerOptions"
              placeholder="Pilih pelanggan..."
              class="w-full"
              @update:model-value="onCustomerChange"
            />
          </UFormField>

          <UFormField
            v-if="mode === 'TITIPAN'"
            label="Faktur Penjualan"
            required
            hint="Hanya faktur milik pelanggan ini yang masih punya sisa qty belum dititip."
          >
            <UInputMenu
              v-model="salesInvoiceId"
              value-key="value"
              :items="fakturSelectOptions"
              :loading="loadingFaktur"
              :disabled="!customerId"
              placeholder="Pilih faktur..."
              class="w-full"
              @update:model-value="onFakturChange"
            />
          </UFormField>

          <template v-else-if="mode === 'TRANSFER'">
            <UFormField
              label="Gudang Asal"
              required
            >
              <USelect
                v-model="fromWarehouseId"
                :items="warehouseOptions"
                placeholder="Pilih gudang asal..."
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="Gudang Tujuan"
              required
            >
              <USelect
                v-model="toWarehouseId"
                :items="warehouseOptions"
                placeholder="Pilih gudang tujuan..."
                class="w-full"
              />
            </UFormField>
          </template>

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

        <UAlert
          v-if="direction === 'BS_TO_STORE'"
          color="warning"
          variant="subtle"
          icon="i-lucide-shield-alert"
          title="Butuh persetujuan Supervisor"
          description="Mutasi dari Barang Rusak ke Toko membuat barang bisa dijual lagi — wajib disetujui Supervisor/Master sebelum diproses. Isi baris produk lalu Simpan; persetujuan akan diminta otomatis."
        />
        <UAlert
          v-else-if="direction === 'INVALID'"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          title="Kombinasi gudang tidak valid"
          description="Hanya mutasi STORE <-> BAD_STOCK yang didukung di sini. Pilih dua gudang yang berbeda tipe."
        />
      </template>

      <template #lines>
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-1">
            <UButton
              icon="i-lucide-plus"
              size="xs"
              variant="subtle"
              :disabled="mode === 'TITIPAN' && !salesInvoiceId"
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
            { label: 'Qty', value: qtyFmt(lines.reduce((s, l) => s + (l.qtyBaseUnit ?? 0), 0)) }
          ]"
        />
      </template>
    </DocumentModal>

    <LineModal
      :open="lineOpen"
      title="Baris Mutasi"
      :mode="lineEditIndex === null ? 'entri' : 'ubah'"
      :dirty="lineDirty"
      width="640px"
      @update:open="(v: boolean) => (lineOpen = v)"
      @save="saveLine"
      @enter-last="saveLineAndNew"
    >
      <template #form>
        <UAlert
          v-if="lineFormError"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          :title="lineFormError"
          :close="{ icon: 'i-lucide-x', color: 'neutral', variant: 'link' }"
          @update:open="lineFormError = ''"
        />

        <template v-if="mode === 'TITIPAN'">
          <!-- Baris dipilih DARI BARIS FAKTUR, bukan dari master produk
               (paket R8 K7) -- klik baris untuk memilih, qty diisi otomatis
               dengan sisa lalu boleh dikurangi. -->
          <p class="text-sm font-medium">
            Pilih Baris Faktur
          </p>
          <DataTable
            :rows="fakturLines as unknown as Record<string, unknown>[]"
            :columns="fakturLineColumns"
            :on-row-click="onFakturLineRowClick"
            :row-class="fakturLineRowClass"
            dense
            zebra
            :searchable="false"
            :empty-text="loadingFakturLines ? 'Memuat...' : '< Tidak Ada Baris Faktur >'"
          />
          <UFormField
            label="Qty Titipan"
            required
            :hint="selectedFakturLineId ? `Sisa: ${qtyBreakdownFor(lineDraft.productId ?? '', remainingForFakturLine(selectedFakturLineId, lineEditIndex))}` : undefined"
          >
            <div class="grid grid-cols-2 gap-2">
              <QtyInput
                v-model="lineDraft.qtyInput"
                placeholder="0"
                :min="0"
                :disabled="!selectedFakturLineId"
                class="w-full"
                @update:model-value="lineDirty = true"
              />
              <USelect
                v-model="lineDraft.unitName"
                :items="lineUnitOptions"
                :disabled="!selectedFakturLineId"
                placeholder="Satuan..."
                class="w-full"
                @update:model-value="lineDirty = true"
              />
            </div>
          </UFormField>
        </template>

        <template v-else>
          <UFormField
            label="Produk"
            required
          >
            <UInputMenu
              v-model="lineDraft.productId"
              value-key="value"
              :items="productOptions"
              placeholder="Pilih produk..."
              class="w-full"
              @update:model-value="onLineProductChange"
            />
          </UFormField>
          <div class="grid grid-cols-2 gap-2">
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
            <UFormField
              label="Satuan"
              required
            >
              <USelect
                v-model="lineDraft.unitName"
                :items="lineUnitOptions"
                :disabled="!lineDraft.productId"
                placeholder="Satuan..."
                class="w-full"
                @update:model-value="lineDirty = true"
              />
            </UFormField>
          </div>
        </template>
      </template>
      <template #context>
        <InfoStrip
          v-if="mode === 'TITIPAN'"
          :items="selectedFakturLineId ? [
            { label: 'Produk', value: productName(lineDraft.productId ?? '') },
            { label: 'Sisa Boleh Dititip', value: qtyBreakdownFor(lineDraft.productId ?? '', remainingForFakturLine(selectedFakturLineId, lineEditIndex)) }
          ] : []"
          :text="selectedFakturLineId ? undefined : 'Pilih baris faktur di kiri untuk melihat sisa yang boleh dititip.'"
        />
        <InfoStrip
          v-else
          text="Harga Pokok baris ini baru diketahui setelah mutasi tersimpan (lihat hasil di bawah, read-only — tidak pernah bisa diketik di layar manapun)."
        />
      </template>
    </LineModal>

    <!-- Ringkasan hasil setelah submit sukses -->
    <UModal
      v-model:open="resultOpen"
      title="Mutasi Tersimpan"
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
            :title="`Mutasi ${result.mutation.mutationNumber} tersimpan`"
          />
          <UAlert
            v-for="(warning, i) in result.stockWarnings"
            :key="i"
            color="warning"
            variant="subtle"
            icon="i-lucide-alert-triangle"
            :description="warning"
          />
          <DataTable
            :rows="result.lines as unknown as Record<string, unknown>[]"
            :columns="[
              { key: 'productId', label: 'Produk', format: (v: unknown) => productName(v as string) },
              { key: 'qtyBaseUnit', label: 'Qty', format: (v: unknown) => qtyFmt(Number(v)) },
              { key: 'unitCost', label: 'Harga Pokok / Satuan', align: 'right', slot: 'unitCost' }
            ]"
            dense
            zebra
            :searchable="false"
          >
            <template #unitCost="{ value }">
              <span
                v-if="value !== null"
                class="inline-block px-2 py-1 rounded border border-default bg-elevated/50"
              >
                {{ rupiah(Number(value)) }}
              </span>
              <span
                v-else
                class="text-muted"
              >Barang sudah bukan milik toko, tidak ada nilai</span>
            </template>
          </DataTable>
        </div>
      </template>
      <template #footer>
        <div class="flex items-center gap-2 w-full justify-end">
          <UButton
            v-if="result"
            :to="`/gudang/mutasi/${result.mutation.id}/cetak`"
            target="_blank"
            icon="i-lucide-printer"
            color="neutral"
            variant="subtle"
          >
            Cetak Nota
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
