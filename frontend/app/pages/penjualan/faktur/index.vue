<script setup lang="ts">
import type { Column, FilterDef } from '~/types/data-table'
import type { SelectOption } from '~/types/crud-form'
import type { CustomerLookup, ProductLookup, SalesmanLookup, UnitLookup } from '~/composables/useSalesInvoiceLookups'

// Dipakai baik sebagai rute /penjualan/faktur (daftar) MAUPUN diimpor oleh
// create.vue (initial-open="entri") -- pola sama pembelian/faktur/index.vue.
//
// GET/POST /sales-invoices sejak Hari 21 (BE 23 Agu). Submit lewat
// withStepUp() -- SELL_BELOW_COST membalas 412 sekali per faktur, ditangani
// otomatis lewat <StepUpDialog> global (lihat submit()).
definePageMeta({ title: 'Faktur Penjualan', roles: ['MASTER', 'OPERATOR'] })

const props = defineProps<{
  initialOpen?: 'entri'
  /** Paket R6 -- diisi oleh penjualan/faktur/[id]/edit.vue (pembungkus tipis,
   * pola sama create.vue). Mode 'ubah': layar entri SAMA ini dipakai ulang,
   * ter-prefill dari faktur, submit ke PATCH .../revise (CLAUDE.md §6, JANGAN
   * fork form kedua). */
  editInvoiceId?: string
  /** Alasan yang sudah dikumpulkan DocumentActions saat faktur PRINTED
   * (dialog "Batal Cetak") -- dibawa lewat query string, dikirim apa adanya
   * sebagai UnlockPrintDto.reason saat submit revisi. */
  editReason?: string
}>()

type SalesChannel = 'PENGIRIMAN' | 'TOKO'
type PrintStatus = 'NOT_PRINTED' | 'PRINTED' | 'PRINT_CANCELLED'

interface EditInvoiceLine {
  productId: string
  unitId: string
  qtyInput: string
  unitPrice: string
}
interface EditInvoiceDetail {
  id: string
  invoiceNumber: string
  invoiceDate: string
  customerId: string
  salesChannel: SalesChannel
  salesOrderId: string | null
  salesmanId: string
  termDays: number
  printStatus: PrintStatus
  revisionNumber: number
  lines: EditInvoiceLine[]
}

interface InvoiceRow extends Record<string, unknown> {
  id: string
  invoiceNumber: string
  customerId: string
  salesChannel: SalesChannel
  invoiceDate: string
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
}
interface SalesOrderOption {
  id: string
  orderNumber: string
  customerId: string
}
interface SalesOrderLineDetail {
  productId: string
  unitId: string
  qtyInput: string
  unitPrice: string | null
}
interface SalesOrderDetailResponse {
  id: string
  orderNumber: string
  customerId: string
  // PJ (penanggung jawab) atas SO ini (koreksi 02 Okt 2026) -- faktur
  // PENGIRIMAN mengambil salesman dari sini, terkunci (lihat
  // onSalesOrderSelected()/prefillFromSalesOrder() di bawah).
  salesmanId: string
  status: 'OPEN' | 'CONVERTED'
  lines: SalesOrderLineDetail[]
}

const CHANNEL_LABEL: Record<SalesChannel, string> = {
  PENGIRIMAN: 'Pengiriman',
  TOKO: 'Toko'
}

function newLine(): LineRow {
  return {
    productId: undefined,
    unitId: undefined,
    qtyInput: undefined,
    unitPrice: undefined
  }
}

const api = useApi()
const toast = useToast()
const router = useRouter()
const route = useRoute()
// SO4: dibaca SEKARANG (setup, sinkron), BUKAN di dalam onMounted -- <DataTable>
// anak memanggil syncQuery() di onMounted-nya SENDIRI dan itu jalan LEBIH DULU
// (anak mounted sebelum induk, urutan lifecycle Vue), lalu mengganti seluruh
// query string dengan hanya page/sortBy/sortDir/filter miliknya -- fromSalesOrderId
// sudah hilang dari URL kalau baru dibaca lewat route.query di onMounted induk.
const fromSalesOrderIdParam = typeof route.query.fromSalesOrderId === 'string' ? route.query.fromSalesOrderId : undefined
const { user } = useAuth()
const { format: rupiah } = useRupiah()
const { format: qtyFmt } = useQty()
const { withStepUp } = useStepUp()
const { loadCustomerMap, loadProductMap, loadUnitMap, loadSalesmanMap } = useSalesInvoiceLookups()

const operatorName = computed(() => user.value?.fullName ?? '')

// dd-MM-yyyy (PANDUAN_UI.md §10) -- pola sama pembelian/faktur & penjualan/order.
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

// ---- Bagian A: daftar (PANDUAN_UI.md §5) -----------------------------------
const table = ref()
const selectedRow = ref<InvoiceRow | null>(null)

const columns: Column<InvoiceRow>[] = [
  { key: 'invoiceNumber', label: 'No. Faktur', mono: true },
  { key: 'customerId', label: 'Pelanggan', format: v => customerLabel(v as string) },
  { key: 'salesChannel', label: 'Saluran', format: v => CHANNEL_LABEL[v as SalesChannel] ?? String(v) },
  { key: 'invoiceDate', label: 'Tanggal', format: v => ddmmyyyy(v as string) },
  { key: 'totalAmount', label: 'Total', align: 'right', format: v => rupiah(Number(v), { bare: true }) },
  { key: 'postingStatus', label: 'Status', align: 'center', slot: 'postingStatus' },
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
  if (selectedRow.value) navigateTo(`/penjualan/faktur/${selectedRow.value.id}`)
}

// R4/SJ1 (RENCANA_REVISI_TESTING_KLIEN.md): Surat Jalan modulnya sudah ada
// sejak Hari 24-25 -- yang kurang cuma jalan masuk dari DAFTAR faktur. Cek
// keberadaan SJ hanya untuk baris yang SEDANG dipilih (bukan tiap baris
// tampil, CLAUDE.md §1 volume ±11-12 faktur/hari jadi ini murah), lalu
// navigasi ke detail faktur dengan ?openSj=1 supaya modal SJ yang SUDAH ADA
// di sana (openDeliveryOrderModal()) langsung terbuka -- tidak ada modul
// baru, hanya jalan masuk baru.
const selectedRowHasDeliveryOrder = ref<boolean | null>(null)
watch(selectedRow, async (row) => {
  selectedRowHasDeliveryOrder.value = null
  if (!row || row.salesChannel !== 'PENGIRIMAN' || row.postingStatus === 'VOIDED') return
  try {
    const res = await api.get<{ data: unknown[] }>('/delivery-orders', { salesInvoiceId: row.id, limit: 1 })
    selectedRowHasDeliveryOrder.value = res.data.length > 0
  } catch {
    // Tidak tahu -- jangan blokir operator, biarkan backend yang menolak
    // kalau memang sudah ada SJ (DeliveryOrdersService.create() menegakkan ini).
    selectedRowHasDeliveryOrder.value = null
  }
})
const canCreateDeliveryOrderForSelected = computed(() =>
  !!selectedRow.value
  && selectedRow.value.salesChannel === 'PENGIRIMAN'
  && selectedRow.value.postingStatus !== 'VOIDED'
  && selectedRowHasDeliveryOrder.value !== true)
function createDeliveryOrderForSelected() {
  if (!selectedRow.value) return
  navigateTo(`/penjualan/faktur/${selectedRow.value.id}?openSj=1`)
}

// ---- Bagian B: entri via DocumentModal + LineModal (PANDUAN_UI.md §6, §7) --
// Paket R6: 'ubah' memakai KOMPONEN YANG SAMA -- satu-satunya beda adalah
// dari mana data awal datang (fetch faktur, bukan form kosong) dan endpoint
// submit (.../revise, bukan POST baru). CLAUDE.md §6 melarang fork form.
const entriOpen = ref(false)
const formMode = ref<'entri' | 'ubah'>('entri')
const editingInvoiceId = ref<string | undefined>(undefined)
const editingInvoiceNumber = ref('')
const editingPrintStatus = ref<PrintStatus>('NOT_PRINTED')
const editingRevisionNumber = ref(0)
const editReasonValue = ref('')
const editLoading = ref(false)
const editLoadError = ref('')

const customerId = ref<string | undefined>(undefined)
const salesChannel = ref<SalesChannel>('TOKO')
const salesOrderId = ref<string | undefined>(undefined)
const salesmanId = ref<string | undefined>(undefined)
const invoiceDate = ref(todayIso())
const termDays = ref<number>(0)
const lines = ref<LineRow[]>([])

const draftKey = computed(() =>
  formMode.value === 'ubah' && editingInvoiceId.value
    ? `md-draft:sales-invoice:edit:${editingInvoiceId.value}`
    : 'md-draft:sales-invoice:create')
const draftData = computed(() => ({
  customerId: customerId.value,
  salesChannel: salesChannel.value,
  salesOrderId: salesOrderId.value,
  salesmanId: salesmanId.value,
  invoiceDate: invoiceDate.value,
  termDays: termDays.value,
  lines: lines.value
}))
let entriSnapshot = JSON.stringify(draftData.value)
const entriDirty = computed(() => JSON.stringify(draftData.value) !== entriSnapshot)

function resetEntriForm() {
  customerId.value = undefined
  salesChannel.value = 'TOKO'
  salesOrderId.value = undefined
  salesmanId.value = undefined
  invoiceDate.value = todayIso()
  termDays.value = 0
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

// Ter-prefill dari faktur, TERMASUK SELURUH BARIS (tugas R6) -- SO watcher
// (di bawah) akan mereset salesOrderId begitu customerId/salesChannel
// diisi, jadi dijaga suppressSalesOrderWatch persis pola
// prefillFromSalesOrder() (SO4).
async function openEdit(id: string) {
  editLoadError.value = ''
  editLoading.value = true
  suppressSalesOrderWatch.value = true
  try {
    const detail = await api.get<EditInvoiceDetail>(`/sales-invoices/${id}`)
    formMode.value = 'ubah'
    editingInvoiceId.value = detail.id
    editingInvoiceNumber.value = detail.invoiceNumber
    editingPrintStatus.value = detail.printStatus
    editingRevisionNumber.value = detail.revisionNumber
    editReasonValue.value = props.editReason ?? ''

    customerId.value = detail.customerId
    salesChannel.value = detail.salesChannel
    if (detail.salesChannel === 'PENGIRIMAN') {
      await loadSalesOrderOptions(detail.customerId, detail.salesChannel)
    }
    salesOrderId.value = detail.salesOrderId ?? undefined
    salesmanId.value = detail.salesmanId
    invoiceDate.value = detail.invoiceDate
    termDays.value = detail.termDays
    lines.value = detail.lines.map(l => ({
      productId: l.productId,
      unitId: l.unitId,
      qtyInput: Number(l.qtyInput),
      unitPrice: Number(l.unitPrice)
    }))
    entriSnapshot = JSON.stringify(draftData.value)
    entriOpen.value = true
  } catch (err) {
    editLoadError.value = getErrorMessage(err, 'Gagal memuat faktur untuk direvisi.')
  } finally {
    await nextTick()
    suppressSalesOrderWatch.value = false
    editLoading.value = false
  }
}

function restoreDraft(d: unknown) {
  const draft = d as typeof draftData.value
  customerId.value = draft.customerId
  salesChannel.value = draft.salesChannel
  salesOrderId.value = draft.salesOrderId
  salesmanId.value = draft.salesmanId
  invoiceDate.value = draft.invoiceDate
  termDays.value = draft.termDays
  lines.value = draft.lines
}
function closeEntri() {
  // Titik ini hanya tercapai SETELAH DocumentModal.requestClose() menampilkan
  // & mengonfirmasi peringatan "buang perubahan?" (atau tidak dirty sama
  // sekali) -- jadi draf sessionStorage (Pengaman #4 DocumentModal.vue) wajib
  // ikut dihapus di sini juga, bukan hanya di jalur submit() sukses. Tanpa
  // ini, membuka modal lagi memicu watch open/draftKey di DocumentModal yang
  // memulihkan draf lama itu dan MENIMPA resetEntriForm() yang baru saja
  // dijalankan openEntri()/openEdit() -- persis bug yang dilaporkan: sudah
  // konfirmasi "buang perubahan", tapi modal kembali terisi saat dibuka lagi.
  documentModalRef.value?.clearDraft()
  entriOpen.value = false
  if (formMode.value === 'ubah' && editingInvoiceId.value) {
    navigateTo(`/penjualan/faktur/${editingInvoiceId.value}`)
    return
  }
  if (route.path !== '/penjualan/faktur') router.replace('/penjualan/faktur')
}

const customerOptions = computed<SelectOption[]>(() =>
  [...customerMap.value.values()].filter(c => c.isActive).map(c => ({ label: `${c.code} - ${c.name}`, value: c.id })))
const selectedCustomer = computed(() => (customerId.value ? customerMap.value.get(customerId.value) : undefined))
const salesmanOptions = computed<SelectOption[]>(() =>
  [...salesmanMap.value.values()].filter(s => s.isActive).map(s => ({ label: `${s.code} - ${s.name}`, value: s.id })))
const productOptions = computed<SelectOption[]>(() =>
  [...productMap.value.values()].filter(p => p.isActive).map(p => ({ label: `${p.displayName} (${p.code})`, value: p.id })))

const dueDate = computed(() => addDaysIso(invoiceDate.value, termDays.value || 0))

// ---- "+ Pelanggan Baru" -- CrudFormPage mode modal bertumpuk di atas
// DocumentModal (Nuxt UI stacking otomatis, lihat komentar LineModal.vue).
// arAccountId TIDAK ADA di DOM untuk OPERATOR -- digerbangi di
// useCustomerSchema() sendiri, tidak perlu kerja tambahan di sini
// (CLAUDE.md §3: "Modal tambah pelanggan dari form penjualan menyimpan NULL").
const addCustomerOpen = ref(false)
const customerSchema = useCustomerSchema()

function onCustomerSaved(response: unknown) {
  const c = response as CustomerLookup
  customerMap.value.set(c.id, c)
  customerId.value = c.id
  addCustomerOpen.value = false
}

// ---- Sales Order (opsional -- wajib untuk PENGIRIMAN, tapi VALIDASI itu
// baru Hari 21 di backend, assertChannelSalesOrderRequirement(). Dropdown ini
// murni membantu operator memilih, belum ditegakkan.) -----------------------
// R4/FP2 (RENCANA_REVISI_TESTING_KLIEN.md): dropdown TIDAK LAGI menunggu
// pelanggan diisi lebih dulu -- kalau pelanggan sudah dipilih, daftar
// tersaring ke SO miliknya (perilaku lama); kalau belum, daftar menampilkan
// SEMUA SO terbuka (label memuat nama pelanggan) supaya operator bisa
// memilih SO lebih dulu lalu pelanggan terisi otomatis (onSalesOrderSelected).
const salesOrderOptions = ref<SelectOption[]>([])
const salesOrderCustomerMap = ref<Map<string, string>>(new Map())
const salesOrderLoading = ref(false)
const salesOrderFetchError = ref('')
// Dipakai supaya set customerId dari onSalesOrderSelected() tidak memicu
// watcher di bawah mereset salesOrderId yang baru saja dipilih operator.
const suppressSalesOrderWatch = ref(false)

async function loadSalesOrderOptions(cId: string | undefined, channel: SalesChannel) {
  salesOrderOptions.value = []
  salesOrderCustomerMap.value = new Map()
  salesOrderFetchError.value = ''
  if (channel !== 'PENGIRIMAN') return
  salesOrderLoading.value = true
  try {
    const query: Record<string, unknown> = { status: 'OPEN', limit: 100 }
    if (cId) query.customerId = cId
    const res = await api.get<{ data: SalesOrderOption[] }>('/sales-orders', query)
    const map = new Map<string, string>()
    salesOrderOptions.value = res.data.map((so) => {
      map.set(so.id, so.customerId)
      return { label: cId ? so.orderNumber : `${so.orderNumber} — ${customerLabel(so.customerId)}`, value: so.id }
    })
    salesOrderCustomerMap.value = map
  } catch (err) {
    // FP2: JANGAN menelan error diam-diam -- dropdown kosong karena "request
    // gagal" harus terlihat beda dari "memang tidak ada SO terbuka", kalau
    // tidak operator tidak bisa membedakan (ini akar kebingungan tester).
    salesOrderFetchError.value = getErrorMessage(err, 'Gagal memuat daftar Sales Order.')
  } finally {
    salesOrderLoading.value = false
  }
}

watch([customerId, salesChannel], ([cId, channel]) => {
  if (suppressSalesOrderWatch.value) return
  salesOrderId.value = undefined
  // Salesman terkunci ikut SO untuk PENGIRIMAN (koreksi 02 Okt 2026) --
  // SO-nya baru direset ke kosong di atas, jadi salesman yang mengikutinya
  // ikut dikosongkan sampai operator memilih SO lagi. TOKO tidak tersentuh
  // -- salesman-nya tetap manual, tidak boleh ikut dikosongkan oleh watcher
  // yang sama.
  if (channel === 'PENGIRIMAN') salesmanId.value = undefined
  loadSalesOrderOptions(cId, channel)
})

const salesOrderEmptyMessage = computed(() => {
  if (salesChannel.value !== 'PENGIRIMAN' || salesOrderLoading.value || salesOrderFetchError.value) return ''
  if (salesOrderOptions.value.length > 0) return ''
  return customerId.value ? 'Tidak ada Sales Order terbuka untuk pelanggan ini.' : 'Tidak ada Sales Order terbuka.'
})

// FP2b: pilih SO LEBIH DULU -> pelanggan (+ daftar SO) otomatis tersaring ke
// pelanggan itu. Kalau pelanggan sudah dipilih duluan, blok ini tidak pernah
// terpanggil dengan cId kosong (dropdown sudah tersaring), jadi perilaku
// lama tetap utuh.
//
// Bug dilaporkan 26 Sep 2026: fungsi ini SEBELUMNYA cuma mengisi customerId
// lalu berhenti -- baris produk SO tidak pernah ikut terisi, baik saat SO
// dipilih lebih dulu MAUPUN saat pelanggan sudah dipilih duluan. Operator
// harus mengetik ulang manual semua baris dari SO. Sekarang fungsi ini juga
// mengambil detail SO dan mengisi `lines`, pola sama prefillFromSalesOrder()
// (SO4) di bawah -- TAPI tidak menimpa kalau operator sudah mulai mengisi
// baris sendiri sebelum memilih SO (dicek lewat productId terisi).
async function onSalesOrderSelected(v: string | number | boolean | undefined) {
  const soId = v as string | undefined
  salesOrderId.value = soId
  if (!soId) {
    salesmanId.value = undefined
    return
  }

  let so: SalesOrderDetailResponse
  try {
    so = await api.get<SalesOrderDetailResponse>(`/sales-orders/${soId}`)
  } catch (err) {
    bannerError.value = getErrorMessage(err, 'Gagal memuat Sales Order.')
    return
  }

  // Salesman terkunci ikut SO (koreksi 02 Okt 2026) -- SELALU diambil dari
  // SO yang baru dipilih, beda dari baris produk di bawah yang dilindungi
  // "jangan timpa kalau operator sudah mulai mengisi sendiri". Salesman
  // tidak pernah diketik manual untuk PENGIRIMAN, jadi tidak ada isian
  // operator yang bisa ditimpa di sini.
  salesmanId.value = so.salesmanId

  if (!customerId.value) {
    const cId = salesOrderCustomerMap.value.get(soId) ?? so.customerId
    suppressSalesOrderWatch.value = true
    customerId.value = cId
    await nextTick()
    suppressSalesOrderWatch.value = false
    await loadSalesOrderOptions(cId, salesChannel.value)
  }

  if (lines.value.some(l => l.productId)) return
  lines.value = so.lines.map(l => ({
    productId: l.productId,
    unitId: l.unitId,
    qtyInput: Number(l.qtyInput),
    unitPrice: l.unitPrice !== null ? Number(l.unitPrice) : undefined
  }))
}

// SO4 (RENCANA_REVISI_TESTING_KLIEN.md): prefill dari Sales Order lewat query
// param ?fromSalesOrderId= (dibawa oleh tombol "Jadikan Faktur" di
// penjualan/order/index.vue) -- query param dipilih ketimbang state navigasi
// karena tahan reload/refresh. Operator tetap bebas mengubah apa pun sebelum
// simpan; SO belum CONVERTED sampai faktur benar-benar tersimpan (backend).
async function prefillFromSalesOrder(soId: string) {
  suppressSalesOrderWatch.value = true
  try {
    const so = await api.get<SalesOrderDetailResponse>(`/sales-orders/${soId}`)
    if (so.status !== 'OPEN') {
      bannerError.value = 'Sales Order ini sudah tidak berstatus terbuka.'
      return
    }
    customerId.value = so.customerId
    salesChannel.value = 'PENGIRIMAN'
    salesOrderOptions.value = [{ label: so.orderNumber, value: so.id }]
    salesOrderCustomerMap.value = new Map([[so.id, so.customerId]])
    salesOrderId.value = so.id
    // Salesman terkunci ikut SO (koreksi 02 Okt 2026) -- sales_orders
    // sekarang menyimpan PJ-nya sendiri, diteruskan apa adanya ke faktur.
    salesmanId.value = so.salesmanId
    lines.value = so.lines.map(l => ({
      productId: l.productId,
      unitId: l.unitId,
      qtyInput: Number(l.qtyInput),
      unitPrice: l.unitPrice !== null ? Number(l.unitPrice) : undefined
    }))
    entriSnapshot = JSON.stringify(draftData.value)
  } catch (err) {
    bannerError.value = getErrorMessage(err, 'Gagal memuat Sales Order untuk dijadikan faktur.')
  } finally {
    await nextTick()
    suppressSalesOrderWatch.value = false
  }
}

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

// ---- Tarif PPN keluaran (preview) -- SELALU 0 hari ini karena
// company_is_pkp = false (CLAUDE.md §2.11, "PPN Keluaran dormant"). GET
// /settings ada nilainya tapi MASTER-only (403 untuk OPERATOR yang justru
// paling sering di layar ini) -- daripada tambah endpoint publik baru di
// luar rencana yang sudah disetujui, preview memakai `false` apa adanya,
// mencerminkan keadaan bisnis sungguhan sekarang. Tarif tetap diambil supaya
// kalkulasi tidak perlu diubah kalau company_is_pkp kelak `true`.
const companyIsPkp = false
const taxRatePercent = ref<number | null>(null)
watch(invoiceDate, fetchTaxRate, { immediate: false })
async function fetchTaxRate() {
  try {
    const res = await api.get<{ rate: number }>('/tax-rates/effective', { date: invoiceDate.value })
    taxRatePercent.value = Number(res.rate)
  } catch {
    taxRatePercent.value = null
  }
}

// ---- Kalkulasi live (port murni rumus backend, salesInvoiceCalc.ts -- CLAUDE.md
// §4 "Faktur Penjualan", TIDAK disentuh) -------------------------------------
const calc = computed(() => calculateSalesInvoice({
  lines: lines.value.map(l => ({
    qtyInput: l.qtyInput ?? 0,
    unitPrice: l.unitPrice,
    discountPercent: undefined,
    discountAmount: undefined
  })),
  invoiceDiscountPercent: undefined,
  invoiceDiscountAmount: undefined,
  companyIsPkp,
  taxRatePercent: taxRatePercent.value
}))

// ---- Baris: LineModal §7.1 penuh (kanan: sisa stok + panel riwayat harga --
// WAJIB untuk Penjualan, PANDUAN_UI.md §7.1 poin 2) --------------------------
const lineOpen = ref(false)
const lineEditIndex = ref<number | null>(null)
const lineDraft = ref<LineRow>(newLine())
const lineDirty = ref(false)
const selectedLine = ref<(LineRow & Record<string, unknown>) | null>(null)

// Sisa stok gudang STORE -- GET /products/:id/stock-balance (Hari 20),
// diangkat ke useStockBalance() (R3) supaya Order Penjualan & Faktur
// Pembelian tidak menyalin logika fetch yang sama (CLAUDE.md §6).
const { qtyBaseUnit: stockQtyBaseUnit, loading: stockLoading, fetch: fetchStockBalance } = useStockBalance()
const stockPanelRows = computed(() => {
  if (!lineDraft.value.productId) return []
  const product = productMap.value.get(lineDraft.value.productId)
  const baseUnitName = product?.baseUnit ?? ''
  const conversions = (product?.unitConversions ?? []).map(c => ({ unitName: c.unitName, qtyInBaseUnit: Number(c.qtyInBaseUnit) }))
  // A4: satuan terbesar saja, dibulatkan ke bawah, tanda "+" kalau ada sisa --
  // lewat computeQtyBreakdown(), bukan pembagian manual per satuan yang dipilih baris.
  const qty = stockQtyBaseUnit.value !== null
    ? computeQtyBreakdown(stockQtyBaseUnit.value, baseUnitName, conversions, { largestOnly: true })
    : null
  return [{ gudang: 'Toko', satuan: '', qty }]
})

// need_fixing.md #29: PERINGATAN qty > sisa stok, pola sama Order Penjualan
// (SO3) -- BUKAN penolakan. CLAUDE.md §2.8 mengizinkan stok minus; Simpan
// tidak pernah didisable oleh ini.
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
  return `Qty melebihi sisa stok (sisa ${sisa}). Boleh dilanjutkan — stok akan minus.`
})

function openLineEntri() {
  lineDraft.value = newLine()
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

// H.Netto (per satuan) & Jumlah (baris) -- lewat calculateSalesInvoice() apa
// adanya (bukan rumus terpisah, satu sumber kebenaran) dengan draft baris ini
// sebagai satu-satunya baris. Diskon faktur TIDAK dialokasikan per baris di
// Penjualan (beda dari Pembelian, §4 CLAUDE.md) -- jadi cukup baris ini
// sendirian, tidak perlu konteks baris lain seperti purchaseInvoiceCalc.
const lineDraftCalc = computed(() => calculateSalesInvoice({
  lines: [{
    qtyInput: lineDraft.value.qtyInput ?? 0,
    unitPrice: lineDraft.value.unitPrice,
    discountPercent: undefined,
    discountAmount: undefined
  }],
  invoiceDiscountPercent: undefined,
  invoiceDiscountAmount: undefined,
  companyIsPkp: false,
  taxRatePercent: null
}).lines[0])
const lineNetUnitPrice = computed(() => {
  const qty = lineDraft.value.qtyInput ?? 0
  if (qty <= 0) return lineDraft.value.unitPrice ?? 0
  return lineDraftCalc.value.netAmount / qty
})

const lineColumns: Column<LineRow & Record<string, unknown>>[] = [
  { key: 'productId', label: 'Produk', format: v => productOptions.value.find(p => p.value === v)?.label ?? '-' },
  { key: 'qtyInput', label: 'Qty', align: 'right', format: v => qtyFmt(v as number) },
  { key: 'unitId', label: 'Satuan', format: (v, row) => unitOptionsForLine(row).find(u => u.value === v)?.label ?? '-' },
  { key: 'unitPrice', label: 'Harga', align: 'right', format: v => rupiah(v as number, { bare: true }) }
]

// ---- Validasi & submit ------------------------------------------------------
function validate(): string | null {
  if (!customerId.value) return 'Pilih pelanggan.'
  if (!salesmanId.value) {
    return salesChannel.value === 'PENGIRIMAN' ? 'Pilih Sales Order (salesman mengikuti PJ-nya).' : 'Pilih salesman.'
  }
  if (!invoiceDate.value) return 'Tanggal faktur wajib diisi.'
  if (lines.value.length === 0) return 'Isi minimal satu baris produk dengan qty lebih dari 0.'
  return null
}

// Diskon penjualan DI-DROP (paket R5, FP3) -- tidak ada lagi field diskon di
// form, jadi payload TIDAK PERNAH mengirim invoiceDiscountPercent/Amount atau
// discountPercent/Amount per baris sama sekali (bukan mengirim 0 eksplisit).
// Backend (CreateSalesInvoiceDto) menerima ini sebagai "tidak dikirim", sama
// artinya dengan 0.
function buildPayload(): Record<string, unknown> {
  return {
    customerId: customerId.value,
    salesChannel: salesChannel.value,
    salesOrderId: salesChannel.value === 'PENGIRIMAN' ? salesOrderId.value : undefined,
    salesmanId: salesmanId.value,
    invoiceDate: invoiceDate.value,
    termDays: termDays.value || 0,
    lines: lines.value.map(l => ({
      productId: l.productId,
      unitId: l.unitId,
      qtyInput: l.qtyInput,
      unitPrice: l.unitPrice
    })),
    // Wajib diisi HANYA kalau faktur sudah PRINTED (PrintLockService.preflight/
    // consume di backend yang memvalidasi, bukan di sini) -- kosong untuk
    // faktur yang belum dicetak, apa pun mode-nya.
    ...(formMode.value === 'ubah' ? { reason: editReasonValue.value || undefined } : {})
  }
}

const submitting = ref(false)
const bannerError = ref('')

// R6 §3: pesan gagal yang bisa ditindaklanjuti -- operator yang buntu akan
// mencari jalan pintas, jalan keluarnya wajib ada DI LAYAR (tombol), bukan
// cuma kalimat di dokumen. Backend sudah menulis pesan yang MENYEBUT jalan
// keluarnya secara eksplisit (DocumentReviseService/SalesInvoicesService) --
// di sini cukup dideteksi lalu ditawarkan sebagai tombol.
const banner_showVoidAction = computed(() => formMode.value === 'ubah' && /VOID/i.test(bannerError.value))
function goToVoidFromError() {
  if (!editingInvoiceId.value) return
  navigateTo(`/penjualan/faktur/${editingInvoiceId.value}?openVoid=1`)
}

/**
 * Revisi (paket R6) punya DUA gerbang step-up INDEPENDEN yang bisa
 * menyala sekaligus -- pola sama performVoid() di
 * penjualan/faktur/[id]/index.vue: SELL_BELOW_COST (§2.17, hanya kalau ADA
 * baris hasil revisi di bawah harga pokok) diperiksa LEBIH DULU di backend
 * (SalesInvoicesService.reviseInvoice()), UNLOCK_PRINT (§2.16, hanya kalau
 * faktur PRINTED) baru diperiksa sesudahnya.
 *
 * ⚠️ Tugas ini SENGAJA TIDAK mengasumsikan "412 pertama = SELL_BELOW_COST"
 * (kesalahan yang ketahuan lewat uji manual di browser, Hari R6 FE): ketika
 * faktur PRINTED tapi TIDAK ADA pelanggaran harga, 412 PERTAMA yang muncul
 * adalah UNLOCK_PRINT, bukan SELL_BELOW_COST -- mengira sebaliknya membuat
 * token yang sudah disetujui ditaruh di header yang SALAH
 * (x-sell-below-cost-authorization-request-id, padahal backend menunggu
 * x-authorization-request-id), ronde kedua gagal 403 karena header
 * UNLOCK_PRINT-nya kosong. Actionable request selalu diperiksa lewat GET
 * /authorization-requests/:id (bukan ditebak dari urutan) sebelum diputuskan
 * masuk slot header yang mana.
 *
 * withStepUp() generik cuma menangani SATU gerbang aktif per panggilan --
 * begitu satu disetujui, headernya diklasifikasi lalu SKIP (tidak memanggil
 * endpoint sungguhan dulu) supaya retry-otomatis withStepUp() tidak
 * menabrak 412 gerbang KEDUA yang masih mungkin menyusul (pola sama SKIP di
 * performVoid()). Diulang sampai 2 kali (jumlah gerbang yang mungkin ada).
 */
async function performRevise(id: string): Promise<unknown> {
  const SKIP = Symbol('revise-round-skip')
  const { getOne } = useAuthorizationRequests()
  const approvedHeaders: Record<string, string> = {}

  async function classifyAndStore(approvedId: string): Promise<void> {
    const row = await getOne(approvedId)
    const headerKey = row.actionType === 'SELL_BELOW_COST'
      ? 'x-sell-below-cost-authorization-request-id'
      : 'x-authorization-request-id'
    approvedHeaders[headerKey] = approvedId
  }

  async function attemptRound(): Promise<unknown> {
    return withStepUp(async (headers) => {
      if (headers) {
        await classifyAndStore(headers['x-authorization-request-id'] as string)
        return SKIP
      }
      return api.patch(`/sales-invoices/${id}/revise`, buildPayload(), approvedHeaders)
    })
  }

  for (let round = 0; round < 2; round++) {
    const result = await attemptRound()
    if (result !== SKIP) return result
  }
  // Kedua gerbang (kalau ada dua-duanya) sudah diklasifikasi & disetujui.
  return api.patch(`/sales-invoices/${id}/revise`, buildPayload(), approvedHeaders)
}

// need_fixing.md #29 — stockWarning backend (§2.8) ditampilkan, baik saat
// simpan baru maupun revisi. Dokumen TETAP tersimpan; ini pemberitahuan.
function notifyStockWarnings(warnings: string[] | undefined, title: string) {
  if (!warnings?.length) return
  toast.add({
    title,
    description: warnings.join(' • '),
    color: 'warning',
    icon: 'i-lucide-alert-triangle',
    duration: 10000
  })
}

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
      const revised = await performRevise(editingInvoiceId.value) as { stockWarnings?: string[] } | undefined
      notifyStockWarnings(revised?.stockWarnings, 'Faktur direvisi — stok minus')
      documentModalRef.value?.clearDraft()
      entriOpen.value = false
      await navigateTo(`/penjualan/faktur/${editingInvoiceId.value}`)
      return
    }
    // SELL_BELOW_COST (CLAUDE.md §2.17) -- backend membalas 412 sekali per
    // FAKTUR (bukan per baris) kalau ada baris di bawah harga pokok.
    // withStepUp() menangani seluruh alur: buka <StepUpDialog> (global,
    // layouts/default.vue), polling status tiap 5 detik, dan begitu
    // disetujui memanggil ulang callback ini SENDIRI dengan header
    // x-authorization-request-id -- pola identik gudang/mutasi/index.vue
    // untuk BS_TO_STORE, satu-satunya precedent lain di codebase.
    const created = await withStepUp(headers =>
      api.post<{ stockWarnings?: string[] }>('/sales-invoices', buildPayload(), headers)
    )
    // need_fixing.md #29: stockWarning backend (§2.8) dulu dibuang diam-diam.
    // Faktur TETAP tersimpan -- ini pemberitahuan, bukan error.
    notifyStockWarnings(created?.stockWarnings, 'Faktur tersimpan — stok minus')
    documentModalRef.value?.clearDraft()
    entriOpen.value = false
    table.value?.reload()
    if (route.path !== '/penjualan/faktur') router.replace('/penjualan/faktur')
  } catch (err2) {
    if (err2 instanceof StepUpCancelledError) return
    bannerError.value = getErrorMessage(
      err2,
      formMode.value === 'ubah' ? 'Gagal merevisi faktur penjualan.' : 'Gagal membuat faktur penjualan.'
    )
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await loadAllOptions()
  await fetchTaxRate()
  if (props.editInvoiceId) {
    await openEdit(props.editInvoiceId)
  } else if (props.initialOpen === 'entri') {
    openEntri()
  }
  // SO4: dibuka lewat tombol "Jadikan Faktur" (penjualan/order/index.vue) --
  // openEntri() di atas sudah mereset form, jadi prefill HARUS jalan sesudahnya.
  // Pakai fromSalesOrderIdParam yang ditangkap di setup (lihat komentar di
  // sana), BUKAN route.query.fromSalesOrderId -- di titik ini <DataTable>
  // sudah membuang param itu dari URL.
  if (fromSalesOrderIdParam) {
    await prefillFromSalesOrder(fromSalesOrderIdParam)
  }
})
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader />

    <DataTable
      ref="table"
      endpoint="/sales-invoices"
      :columns="columns"
      :filters="filters"
      :on-row-click="onRowClick"
      selectable
      dense
      zebra
      search-placeholder="Cari nomor faktur..."
      :default-sort="{ key: 'invoiceDate', dir: 'desc' }"
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
          <UTooltip
            :text="selectedRowHasDeliveryOrder === true ? 'Surat jalan sudah pernah dibuat untuk faktur ini.' : 'Faktur bersaluran Pengiriman saja.'"
          >
            <UButton
              icon="i-lucide-truck"
              color="neutral"
              variant="subtle"
              :disabled="!canCreateDeliveryOrderForSelected"
              @click="createDeliveryOrderForSelected"
            >
              Buat Surat Jalan
            </UButton>
          </UTooltip>
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
      title="Faktur Penjualan"
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
        <!-- Alasan revisi -- prefill dari dialog "Batal Cetak" (query
             ?reason=), tapi TETAP field yang bisa diisi/diubah langsung di
             sini. Tanpa field terlihat, faktur PRINTED yang reason-nya
             kosong (mis. operator masuk lewat tautan/refresh, bukan lewat
             dialog Batal Cetak) membuat operator BUNTU: 400 "Alasan wajib
             diisi" tanpa ada tempat mengisinya (CLAUDE.md §9, R6 §3 --
             jalan keluar wajib ada di layar). -->
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
             UAlert. Catatan 6 Okt 2026 (need_fixing.md #10): prop
             `close-button` memang TIDAK dikenal Nuxt UI v4 (yang benar
             `close`) — sudah diganti di semua halaman, tombol X kini tampil.
             Elemen terpisah ini dibiarkan, tidak bergantung pada slot. -->
        <div
          v-if="banner_showVoidAction"
          class="flex justify-end -mt-2"
        >
          <UButton
            color="error"
            variant="solid"
            size="xs"
            icon="i-lucide-ban"
            @click="goToVoidFromError"
          >
            Batalkan (VOID)
          </UButton>
        </div>

        <div class="grid grid-cols-2 gap-y-1.5 gap-x-4">
          <UFormField
            label="Pelanggan"
            required
          >
            <div class="flex items-center gap-1">
              <UInputMenu
                v-model="customerId"
                value-key="value"
                :items="customerOptions"
                placeholder="Pilih pelanggan..."
                class="w-full"
              />
              <UButton
                icon="i-lucide-user-plus"
                color="neutral"
                variant="subtle"
                size="sm"
                @click="addCustomerOpen = true"
              >
                Baru
              </UButton>
            </div>
            <p
              v-if="selectedCustomer"
              class="text-xs text-muted mt-1"
            >
              {{ selectedCustomer.isPkp ? 'PKP' : 'Non-PKP' }}
            </p>
          </UFormField>
          <UFormField
            label="Salesman"
            required
            :hint="salesChannel === 'PENGIRIMAN' ? 'Mengikuti PJ Sales Order, tidak bisa diubah di sini.' : undefined"
          >
            <UInputMenu
              v-model="salesmanId"
              value-key="value"
              :items="salesmanOptions"
              :disabled="salesChannel === 'PENGIRIMAN'"
              placeholder="Pilih salesman..."
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Saluran"
            required
          >
            <UFieldGroup size="sm">
              <UButton
                :color="salesChannel === 'TOKO' ? 'primary' : 'neutral'"
                :variant="salesChannel === 'TOKO' ? 'solid' : 'subtle'"
                @click="salesChannel = 'TOKO'"
              >
                Toko
              </UButton>
              <UButton
                :color="salesChannel === 'PENGIRIMAN' ? 'primary' : 'neutral'"
                :variant="salesChannel === 'PENGIRIMAN' ? 'solid' : 'subtle'"
                @click="salesChannel = 'PENGIRIMAN'"
              >
                Pengiriman
              </UButton>
            </UFieldGroup>
          </UFormField>
          <UFormField
            v-if="salesChannel === 'PENGIRIMAN'"
            label="Sales Order"
            required
            hint="Wajib untuk saluran Pengiriman (ditegakkan backend). Pilih SO dulu untuk mengisi pelanggan otomatis, atau pilih pelanggan dulu untuk menyaring SO miliknya."
          >
            <USelect
              :model-value="salesOrderId"
              :items="salesOrderOptions"
              :loading="salesOrderLoading"
              placeholder="Pilih Sales Order..."
              class="w-full"
              @update:model-value="onSalesOrderSelected"
            />
            <p
              v-if="salesOrderFetchError"
              class="text-xs text-error mt-1"
            >
              {{ salesOrderFetchError }}
            </p>
            <p
              v-else-if="salesOrderEmptyMessage"
              class="text-xs text-muted mt-1"
            >
              {{ salesOrderEmptyMessage }}
            </p>
          </UFormField>

          <UFormField
            label="Tgl Faktur"
            required
          >
            <UInput
              v-model="invoiceDate"
              type="date"
              class="w-full"
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
            hint="Otomatis: Tgl Faktur + termin."
          >
            <UInput
              :model-value="ddmmyyyy(dueDate)"
              disabled
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
            { label: 'Subtotal', value: rupiah(calc.subtotal, { bare: true }) },
            { label: 'PPN Keluaran', value: rupiah(calc.outputVatAmount, { bare: true }) },
            { label: 'Total', value: rupiah(calc.totalAmount, { bare: true }), emphasize: true }
          ]"
        />
      </template>
    </DocumentModal>

    <!-- "+ Pelanggan Baru" -- CrudFormPage mode modal, bertumpuk di atas
         DocumentModal lewat stacking UModal Nuxt UI otomatis. -->
    <CrudFormPage
      modal
      :open="addCustomerOpen"
      title="Pelanggan"
      endpoint="/customers"
      back-to=""
      :schema="customerSchema"
      :transform-out="customerTransformOut"
      @update:open="(v: boolean) => (addCustomerOpen = v)"
      @saved="onCustomerSaved"
    />

    <LineModal
      :open="lineOpen"
      title="Baris Faktur Penjualan"
      :mode="lineEditIndex === null ? 'entri' : 'ubah'"
      :dirty="lineDirty"
      @update:open="(v: boolean) => (lineOpen = v)"
      @save="saveLine"
      @enter-last="saveLineAndNew"
    >
      <template #form>
        <div class="flex flex-col gap-3">
          <UFormField
            label="Produk"
            required
          >
            <UInputMenu
              :model-value="lineDraft.productId"
              value-key="value"
              :items="productOptions"
              placeholder="Cari produk berdasarkan nama..."
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
                @update:model-value="() => { lineDirty = true; fetchStockBalance(lineDraft.productId) }"
              />
            </UFormField>
            <UFormField label="Isi">
              <div class="px-3 py-1.5 rounded-md border border-default bg-elevated/50 text-muted text-right">
                {{ isiFactor(lineDraft) !== undefined ? qtyFmt(isiFactor(lineDraft)) : '-' }}
              </div>
            </UFormField>
          </div>

          <UFormField label="Harga @">
            <MoneyInput
              v-model="lineDraft.unitPrice"
              placeholder="0"
              :min="0"
              class="w-full"
              @update:model-value="lineDirty = true"
            />
          </UFormField>

          <UFormField label="H.Netto">
            <div class="px-3 py-1.5 rounded-md border border-default bg-elevated/50 text-right font-medium">
              {{ rupiah(lineNetUnitPrice, { bare: true }) }}
            </div>
          </UFormField>

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

          <UFormField label="Jumlah">
            <div class="px-3 py-1.5 rounded-md border border-default bg-elevated/50 text-right font-bold text-base">
              {{ rupiah(lineDraftCalc.netAmount, { bare: true }) }}
            </div>
          </UFormField>
        </div>
      </template>
      <template #context>
        <span class="text-xs font-medium text-muted">SISA STOK</span>
        <StockPanel
          :rows="stockPanelRows"
          :loading="stockLoading"
        />
        <PriceHistoryPanel
          class="mt-2"
          :customer-id="customerId"
          :customer-name="selectedCustomer?.name"
          :product-id="lineDraft.productId"
          :unit-id="lineDraft.unitId"
        />
      </template>
    </LineModal>
  </div>
</template>
