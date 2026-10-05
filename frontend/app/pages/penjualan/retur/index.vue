<script setup lang="ts">
import type { Column, FilterDef } from '~/types/data-table'
import type { SelectOption } from '~/types/crud-form'
import type { CustomerLookup, ProductLookup, UnitLookup } from '~/composables/useSalesInvoiceLookups'
import type { ReturnableInvoice } from '~/composables/useSalesReturnLookups'

// Dipakai baik sebagai rute /penjualan/retur (daftar) MAUPUN diimpor oleh
// create.vue (initial-open="entri") -- pola sama pembelian/retur/index.vue.
//
// GET/POST /sales-returns sejak Hari 23 (BE 26 Agu). BEDA dari Retur
// Pembelian: baris tidak berasal dari daftar Bad Stock tersaring per
// supplier, tapi dari BARIS FAKTUR PENJUALAN ASAL yang dicari dulu (CLAUDE.md
// §3 "Lain-lain": "Retur penjualan wajib menunjuk faktur asal").
definePageMeta({ title: 'Retur Penjualan', roles: ['MASTER', 'OPERATOR'] })

const props = defineProps<{
  initialOpen?: 'entri'
}>()

type SettlementType = 'REDUCE_INVOICE' | 'CASH'
const QTY_EPSILON = 1e-6

interface ReturnRow extends Record<string, unknown> {
  id: string
  returnNumber: string
  customerId: string
  returnDate: string
  settlementType: SettlementType
  totalAmount: string
  postingStatus: 'POSTED' | 'VOIDED'
  printStatus: 'NOT_PRINTED' | 'PRINTED' | 'PRINT_CANCELLED'
  createdAt: string
}
interface InvoicePickRow extends Record<string, unknown> {
  id: string
  invoiceNumber: string
  customerId: string
  invoiceDate: string
  totalAmount: string
  postingStatus: 'POSTED' | 'VOIDED'
}
interface CandidateRow extends Record<string, unknown> {
  lineId: string
  productId: string
  unitId: string
  qtyInputOriginal: number
  alreadyReturnedQtyInput: number
  remainingQtyInput: number
  unitCostFifo: number
  netAmount: number
  checked: boolean
  qtyReturn: number | undefined
}
interface SavedLine {
  id: string
  productId: string
  qtyInput: string
  dppAmount: string
  costAmount: string
}
interface CreateResult {
  salesReturn: {
    id: string
    returnNumber: string
    dppAmount: string
    outputVatAmount: string
    totalAmount: string
    costBasisAmount: string
  }
  lines: SavedLine[]
}

const api = useApi()
const router = useRouter()
const route = useRoute()
const { user } = useAuth()
const { format: rupiah } = useRupiah()
const { format: qtyFmt } = useQty()
const { loadCustomerMap, loadProductMap, loadUnitMap } = useSalesInvoiceLookups()
const { loadCashAccountOptions, loadReturnableInvoice } = useSalesReturnLookups()

const operatorName = computed(() => user.value?.fullName ?? '')

// dd-MM-yyyy (PANDUAN_UI.md §10) -- pola sama modul retur lain.
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

const customerMap = ref<Map<string, CustomerLookup>>(new Map())
const productMap = ref<Map<string, ProductLookup>>(new Map())
const unitMap = ref<Map<string, UnitLookup>>(new Map())
const cashAccountOptions = ref<SelectOption[]>([])
const loadingOptions = ref(true)

async function loadAllOptions() {
  loadingOptions.value = true
  try {
    const [customers, products, units, cashAccounts] = await Promise.all([
      loadCustomerMap(), loadProductMap(), loadUnitMap(), loadCashAccountOptions()
    ])
    customerMap.value = customers
    productMap.value = products
    unitMap.value = units
    cashAccountOptions.value = cashAccounts.map(a => ({ label: `${a.code} - ${a.name}`, value: a.id }))
  } finally {
    loadingOptions.value = false
  }
}

function customerLabel(id: string): string {
  const c = customerMap.value.get(id)
  return c ? `${c.code} - ${c.name}` : '-'
}
function productLabel(id: string): string {
  const p = productMap.value.get(id)
  return p ? `${p.displayName} (${p.code})` : id
}
function unitLabel(id: string): string {
  return unitMap.value.get(id)?.name ?? '-'
}

// ---- Bagian A: daftar (PANDUAN_UI.md §5) -----------------------------------
const table = ref()
const selectedRow = ref<ReturnRow | null>(null)

const SETTLEMENT_LABEL: Record<string, string> = {
  REDUCE_INVOICE: 'Kurangi Piutang',
  CASH: 'Tunai'
}

const columns: Column<ReturnRow>[] = [
  { key: 'returnNumber', label: 'No. Retur', mono: true },
  { key: 'customerId', label: 'Pelanggan', format: v => customerLabel(v as string) },
  { key: 'returnDate', label: 'Tanggal', format: v => ddmmyyyy(v as string) },
  { key: 'settlementType', label: 'Penyelesaian', slot: 'settlementType' },
  { key: 'totalAmount', label: 'Nilai Retur', align: 'right', format: v => rupiah(Number(v), { bare: true }) },
  { key: 'postingStatus', label: 'Status', align: 'center', slot: 'postingStatus' },
  { key: 'printStatus', label: 'P', align: 'center', slot: 'printCheck' },
  { key: 'createdAt', label: 'Waktu', format: v => ddmmyyyyHm(v as string) }
]

const filters: FilterDef[] = [
  {
    key: 'settlementType',
    label: 'Penyelesaian',
    type: 'select',
    options: [
      { label: 'Kurangi Piutang', value: 'REDUCE_INVOICE' },
      { label: 'Tunai', value: 'CASH' }
    ]
  }
]

function onRowClick(row: ReturnRow) {
  selectedRow.value = row
}
function goToDetailSelected() {
  if (selectedRow.value) navigateTo(`/penjualan/retur/${selectedRow.value.id}`)
}

// ---- Bagian B: entri via DocumentModal (PANDUAN_UI.md §6) ------------------
// Baris TIDAK lewat <LineModal> generik -- ini daftar BARIS FAKTUR ASAL
// tersaring per faktur yang dicari dulu (LookupField, §8.3), dengan
// checkbox+qty per baris. Pola gerbang sama N1 Retur Pembelian, hanya
// sumbernya faktur, bukan supplier.
const entriOpen = ref(false)

const lookupFieldRef = ref<{ setDisplay: (code: string, name: string) => void } | null>(null)
const invoiceId = ref<string | null>(null)
const invoiceDetail = ref<ReturnableInvoice | null>(null)
const loadingInvoice = ref(false)
const invoiceError = ref('')
const returnDate = ref(todayIso())
const settlementType = ref<SettlementType | null>(null)
const cashAccountId = ref<string | undefined>(undefined)
const notes = ref('')
const candidates = ref<CandidateRow[]>([])

const draftKey = 'md-draft:sales-return:create'
const draftData = computed(() => ({
  invoiceId: invoiceId.value,
  returnDate: returnDate.value,
  settlementType: settlementType.value,
  cashAccountId: cashAccountId.value,
  notes: notes.value
}))
let entriSnapshot = JSON.stringify(draftData.value)
const entriDirty = computed(() => JSON.stringify(draftData.value) !== entriSnapshot)

function resetEntriForm() {
  invoiceId.value = null
  invoiceDetail.value = null
  invoiceError.value = ''
  returnDate.value = todayIso()
  settlementType.value = null
  cashAccountId.value = undefined
  notes.value = ''
  candidates.value = []
  entriSnapshot = JSON.stringify(draftData.value)
}

const documentModalRef = ref<{ clearDraft: () => void, forceClose: () => void } | null>(null)

function openEntri() {
  resetEntriForm()
  entriOpen.value = true
}
function restoreDraft(d: unknown) {
  const draft = d as typeof draftData.value
  invoiceId.value = draft.invoiceId
  returnDate.value = draft.returnDate
  settlementType.value = draft.settlementType
  cashAccountId.value = draft.cashAccountId
  notes.value = draft.notes
}
function closeEntri() {
  entriOpen.value = false
  if (route.path !== '/penjualan/retur') router.replace('/penjualan/retur')
}

function setSettlementType(type: SettlementType) {
  settlementType.value = type
  if (type !== 'CASH') cashAccountId.value = undefined
}

// N1: baris KOSONG sampai faktur asal dipilih -- fetch di-gate lewat
// watch(invoiceId), TIDAK PERNAH dari daftar lengkap yang difilter
// client-side (pola sama gerbang supplier di Retur Pembelian).
watch(invoiceId, async (id) => {
  invoiceDetail.value = null
  invoiceError.value = ''
  candidates.value = []
  if (!id) return
  loadingInvoice.value = true
  try {
    const detail = await loadReturnableInvoice(id)
    if (detail.postingStatus === 'VOIDED') {
      invoiceError.value = 'Faktur ini sudah dibatalkan (VOID), tidak bisa diretur.'
      return
    }
    invoiceDetail.value = detail
    // Draft yang dipulihkan dari sessionStorage cuma tahu ID (bukan nomor
    // faktur) -- sinkronkan tampilan LookupField sekarang datanya sudah ada.
    // Aman dipanggil juga di alur pick normal (nilai yang ditulis sama).
    lookupFieldRef.value?.setDisplay(detail.invoiceNumber, detail.invoiceNumber)
    candidates.value = detail.lines.map(l => ({
      lineId: l.id,
      productId: l.productId,
      unitId: l.unitId,
      qtyInputOriginal: l.qtyInput,
      alreadyReturnedQtyInput: l.alreadyReturnedQtyInput,
      remainingQtyInput: l.remainingQtyInput,
      unitCostFifo: l.unitCostFifo,
      netAmount: l.netAmount,
      checked: false,
      qtyReturn: undefined
    }))
  } catch (err) {
    invoiceError.value = getErrorMessage(err, 'Gagal memuat faktur penjualan.')
  } finally {
    loadingInvoice.value = false
  }
})

const invoiceColumns: Column<InvoicePickRow>[] = [
  { key: 'invoiceNumber', label: 'No. Faktur', mono: true },
  { key: 'customerId', label: 'Pelanggan', format: v => customerLabel(v as string) },
  { key: 'invoiceDate', label: 'Tanggal', format: v => ddmmyyyy(v as string) },
  { key: 'totalAmount', label: 'Total', align: 'right', format: v => rupiah(Number(v), { bare: true }) },
  { key: 'postingStatus', label: 'Status', align: 'center', format: v => (v === 'VOIDED' ? 'Dibatalkan' : 'Terposting') }
]

// N2: kalkulasi live ESTIMASI -- port apa adanya dari rumus prorata backend
// (SalesReturnsService.create(), CLAUDE.md §4 "Retur Penjualan") supaya
// operator melihat angka yang mendekati hasil sungguhan SEBELUM submit.
// Rounding presisi sen tetap wewenang backend (angka final selalu dari
// response POST /sales-returns, bukan dari sini).
const checkedRows = computed(() => candidates.value.filter(r => r.checked))
const calc = computed(() => {
  const invoice = invoiceDetail.value
  if (!invoice) return { totalDpp: 0, outputVat: 0, totalAmount: 0, totalCostBasis: 0 }
  const invoiceDiscountRatio = invoice.subtotal > 0 ? invoice.invoiceDiscountAmount / invoice.subtotal : 0
  const totalDppRaw = checkedRows.value.reduce((sum, r) => {
    const ratio = r.qtyInputOriginal > 0 ? (r.qtyReturn ?? 0) / r.qtyInputOriginal : 0
    return sum + ratio * r.netAmount
  }, 0)
  const totalDpp = totalDppRaw * (1 - invoiceDiscountRatio)
  const taxableBase = invoice.subtotal - invoice.invoiceDiscountAmount
  const effectiveVatRate = taxableBase > 0 ? invoice.outputVatAmount / taxableBase : 0
  const outputVat = totalDpp * effectiveVatRate
  const totalCostBasis = checkedRows.value.reduce((sum, r) => sum + (r.qtyReturn ?? 0) * r.unitCostFifo, 0)
  return { totalDpp, outputVat, totalAmount: totalDpp + outputVat, totalCostBasis }
})

function qtyExceedsRemaining(row: CandidateRow): boolean {
  return (row.qtyReturn ?? 0) > row.remainingQtyInput + QTY_EPSILON
}

const candidateColumns: Column<CandidateRow>[] = [
  { key: 'checked', label: '', slot: 'checkedCell', width: '2.5rem' },
  { key: 'productId', label: 'Produk', format: v => productLabel(v as string) },
  { key: 'unitId', label: 'Satuan', format: v => unitLabel(v as string) },
  { key: 'qtyInputOriginal', label: 'Qty Faktur', align: 'right', format: v => qtyFmt(v as number) },
  { key: 'alreadyReturnedQtyInput', label: 'Sudah Diretur', align: 'right', format: v => qtyFmt(v as number) },
  { key: 'remainingQtyInput', label: 'Sisa', align: 'right', format: v => qtyFmt(v as number) },
  { key: 'qtyReturn', label: 'Qty Retur', slot: 'qtyCell' }
]

// ---- Validasi & submit ------------------------------------------------------
function validate(): string | null {
  if (!invoiceId.value || !invoiceDetail.value) return 'Cari dan pilih faktur penjualan asal dulu.'
  if (!returnDate.value) return 'Tanggal retur wajib diisi.'
  if (!settlementType.value) return 'Pilih cara penyelesaian.'
  if (settlementType.value === 'CASH' && !cashAccountId.value) return 'Pilih akun kas/bank.'
  if (checkedRows.value.length === 0) return 'Centang minimal satu baris untuk diretur.'
  for (const [i, row] of checkedRows.value.entries()) {
    if (!((row.qtyReturn ?? 0) > 0)) return `Baris ${i + 1}: qty retur wajib diisi lebih dari 0.`
    if (qtyExceedsRemaining(row)) {
      return `Baris ${i + 1} (${productLabel(row.productId)}): qty retur ${qtyFmt(row.qtyReturn ?? 0)} melebihi sisa qty faktur (${qtyFmt(row.remainingQtyInput)}).`
    }
  }
  return null
}

function buildPayload(): Record<string, unknown> {
  return {
    salesInvoiceId: invoiceId.value,
    returnDate: returnDate.value,
    settlementType: settlementType.value,
    cashAccountId: settlementType.value === 'CASH' ? cashAccountId.value : undefined,
    notes: notes.value || undefined,
    lines: checkedRows.value.map(r => ({
      salesInvoiceLineId: r.lineId,
      qtyInput: r.qtyReturn
    }))
  }
}

const submitting = ref(false)
const bannerError = ref('')
const result = ref<CreateResult | null>(null)
const resultOpen = ref(false)

async function submit() {
  const err = validate()
  if (err) {
    bannerError.value = err
    return
  }
  bannerError.value = ''
  submitting.value = true
  try {
    result.value = await api.post<CreateResult>('/sales-returns', buildPayload())
    documentModalRef.value?.clearDraft()
    entriOpen.value = false
    resultOpen.value = true
    table.value?.reload()
    if (route.path !== '/penjualan/retur') router.replace('/penjualan/retur')
  } catch (err2) {
    bannerError.value = getErrorMessage(err2, 'Gagal membuat retur penjualan.')
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
      endpoint="/sales-returns"
      :columns="columns"
      :filters="filters"
      :on-row-click="onRowClick"
      selectable
      dense
      zebra
      search-placeholder="Cari nomor retur..."
      :default-sort="{ key: 'returnDate', dir: 'desc' }"
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
      <template #settlementType="{ value }">
        <UBadge
          :color="value === 'CASH' ? 'info' : 'neutral'"
          variant="subtle"
        >
          {{ SETTLEMENT_LABEL[value as string] ?? value }}
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

    <!-- Bagian B: entri (satu lapis modal -- baris via baris faktur asal
         tercentang, bukan LineModal, pola sama N1 Retur Pembelian) -->
    <DocumentModal
      ref="documentModalRef"
      :open="entriOpen"
      title="Retur Penjualan"
      mode="entri"
      :operator="operatorName"
      :dirty="entriDirty"
      :saving="submitting"
      :draft-key="draftKey"
      :draft-data="draftData"
      width="min(1300px, 95vw)"
      @update:open="(v: boolean) => !v && closeEntri()"
      @restore-draft="restoreDraft"
      @save="submit"
    >
      <template #header>
        <UAlert
          v-if="bannerError"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          :title="bannerError"
          :close-button="{ icon: 'i-lucide-x', color: 'neutral', variant: 'link' }"
          @update:open="bannerError = ''"
        />
        <UAlert
          v-if="invoiceError"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          :description="invoiceError"
        />

        <div class="grid grid-cols-2 gap-y-1.5 gap-x-4">
          <UFormField
            label="Faktur Asal"
            required
            class="col-span-2"
            hint="Ketik nomor faktur lalu Tab, atau klik … untuk mencari."
          >
            <LookupField
              ref="lookupFieldRef"
              v-model="invoiceId"
              endpoint="/sales-invoices"
              :columns="invoiceColumns"
              display-field="invoiceNumber"
              code-field="invoiceNumber"
              placeholder="Cari No. Faktur..."
              search-placeholder="Cari nomor faktur..."
            >
              <template #detail>
                <div
                  v-if="loadingInvoice"
                  class="text-xs text-muted mt-1"
                >
                  Memuat faktur...
                </div>
                <div
                  v-else-if="invoiceDetail"
                  class="text-xs text-muted mt-1"
                >
                  {{ customerLabel(invoiceDetail.customerId) }} · {{ ddmmyyyy(invoiceDetail.invoiceDate) }} · Total {{ rupiah(invoiceDetail.totalAmount, { bare: true }) }}
                </div>
              </template>
            </LookupField>
          </UFormField>

          <UFormField label="Tanggal Retur">
            <UInput
              v-model="returnDate"
              type="date"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Cara Penyelesaian"
            required
          >
            <UFieldGroup>
              <UButton
                :color="settlementType === 'REDUCE_INVOICE' ? 'primary' : 'neutral'"
                :variant="settlementType === 'REDUCE_INVOICE' ? 'solid' : 'subtle'"
                @click="setSettlementType('REDUCE_INVOICE')"
              >
                Kurangi Piutang
              </UButton>
              <UButton
                :color="settlementType === 'CASH' ? 'primary' : 'neutral'"
                :variant="settlementType === 'CASH' ? 'solid' : 'subtle'"
                @click="setSettlementType('CASH')"
              >
                Tunai
              </UButton>
            </UFieldGroup>
          </UFormField>

          <UFormField
            v-if="settlementType === 'CASH'"
            label="Akun Kas/Bank"
            required
          >
            <USelect
              v-model="cashAccountId"
              :items="cashAccountOptions"
              placeholder="Pilih akun kas/bank..."
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

        <UAlert
          color="info"
          variant="subtle"
          icon="i-lucide-warehouse"
          title="Barang masuk Gudang Barang Rusak (Bad Stock)"
          description="Bukan stok jual — jangan dicari di stok toko. Barang otomatis pindah ke Bad Stock dan baru bisa dijual lagi setelah otorisasi supervisor."
        />
      </template>

      <template #lines>
        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium">Baris Faktur Asal</span>

          <UEmpty
            v-if="!invoiceId"
            icon="i-lucide-search"
            title="Cari faktur asal dulu"
            description="Baris produk yang bisa diretur muncul setelah faktur asal dipilih."
          />
          <div
            v-else-if="loadingInvoice"
            class="flex flex-col gap-2"
          >
            <USkeleton
              v-for="i in 3"
              :key="i"
              class="h-10 w-full"
            />
          </div>
          <UEmpty
            v-else-if="invoiceDetail && candidates.every(c => c.remainingQtyInput <= 0)"
            icon="i-lucide-check-circle-2"
            title="Sudah diretur penuh"
            description="Seluruh baris faktur ini sudah diretur sepenuhnya."
          />

          <DataTable
            v-else-if="invoiceDetail"
            :rows="candidates as unknown as Record<string, unknown>[]"
            :columns="candidateColumns as Column<Record<string, unknown>>[]"
            dense
            zebra
            :searchable="false"
            :empty-text="'< Tidak Ada Baris Untuk Ditampilkan >'"
          >
            <template #checkedCell="{ row }">
              <UCheckbox
                v-model="(row as unknown as CandidateRow).checked"
                :disabled="(row as unknown as CandidateRow).remainingQtyInput <= 0"
              />
            </template>
            <template #qtyCell="{ row }">
              <template v-if="(row as unknown as CandidateRow).checked">
                <QtyInput
                  v-model="(row as unknown as CandidateRow).qtyReturn"
                  placeholder="0"
                  :min="0"
                  class="w-28"
                />
                <p
                  v-if="qtyExceedsRemaining(row as unknown as CandidateRow)"
                  class="text-xs text-error mt-1"
                >
                  Melebihi sisa qty faktur
                </p>
              </template>
              <span
                v-else-if="(row as unknown as CandidateRow).remainingQtyInput <= 0"
                class="text-xs text-muted"
              >Sudah diretur penuh</span>
              <span
                v-else
                class="text-muted"
              >-</span>
            </template>
          </DataTable>
        </div>
      </template>

      <template #totals>
        <TotalsBar
          :items="[
            { label: 'Item', value: String(checkedRows.length) },
            { label: 'Qty', value: qtyFmt(checkedRows.reduce((s, r) => s + (r.qtyReturn ?? 0), 0)) },
            { label: 'DPP (Estimasi)', value: rupiah(calc.totalDpp, { bare: true }) },
            { label: 'PPN Keluaran (Estimasi)', value: rupiah(calc.outputVat, { bare: true }) },
            { label: 'Harga Pokok (Estimasi)', value: rupiah(calc.totalCostBasis, { bare: true }) },
            { label: 'Total (Estimasi)', value: rupiah(calc.totalAmount, { bare: true }), emphasize: true }
          ]"
        />
      </template>
    </DocumentModal>

    <!-- Ringkasan hasil setelah submit sukses -->
    <UModal
      v-model:open="resultOpen"
      title="Retur Tersimpan"
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
            :title="`Retur ${result.salesReturn.returnNumber} tersimpan`"
            :description="`Total ${rupiah(Number(result.salesReturn.totalAmount))} · Harga pokok ${rupiah(Number(result.salesReturn.costBasisAmount))} · Barang sudah masuk Gudang Barang Rusak (Bad Stock)`"
          />
          <DataTable
            :rows="result.lines as unknown as Record<string, unknown>[]"
            :columns="[
              { key: 'productId', label: 'Produk', format: (v: unknown) => productLabel(v as string) },
              { key: 'qtyInput', label: 'Qty', format: (v: unknown) => qtyFmt(Number(v)) },
              { key: 'dppAmount', label: 'DPP', align: 'right', format: (v: unknown) => rupiah(Number(v), { bare: true }) },
              { key: 'costAmount', label: 'Harga Pokok', align: 'right', format: (v: unknown) => rupiah(Number(v), { bare: true }) }
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
            :to="`/penjualan/retur/${result.salesReturn.id}/cetak`"
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
