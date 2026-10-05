<script setup lang="ts">
import type { Column, FilterDef } from '~/types/data-table'
import type { SelectOption } from '~/types/crud-form'
import type { SupplierLookup, ProductLookup } from '~/composables/usePurchaseReturnLookups'

// Dipakai baik sebagai rute /pembelian/retur (daftar) MAUPUN diimpor oleh
// create.vue (initial-open="entri") -- pola sama 2 modul lain Hari 16B.
definePageMeta({ title: 'Retur Pembelian', roles: ['MASTER', 'OPERATOR'] })

const props = defineProps<{
  initialOpen?: 'entri'
}>()

type UnitMode = 'BESAR' | 'KECIL'
type SettlementType = 'REDUCE_INVOICE' | 'CASH'

interface ReturnRow extends Record<string, unknown> {
  id: string
  returnNumber: string
  supplierId: string
  returnDate: string
  settlementType: SettlementType
  subtotalAgreedAmount: string
  differenceAmount: string
  postingStatus: 'POSTED' | 'VOIDED'
  printStatus: 'NOT_PRINTED' | 'PRINTED' | 'PRINT_CANCELLED'
  createdAt: string
}
interface CandidateRow extends Record<string, unknown> {
  productId: string
  displayName: string
  qtyAvailable: number
  fifoNextUnitCost: number
  checked: boolean
  qtyInput: number | undefined
  agreedUnitPrice: number | undefined
}
interface SavedLine {
  id: string
  productId: string
  qtyInput: string
  agreedAmount: string
  costBasisAmount: string
}
interface CreateResult {
  purchaseReturn: {
    id: string
    returnNumber: string
    subtotalAgreedAmount: string
    totalCostBasis: string
    differenceAmount: string
  }
  lines: SavedLine[]
}

const api = useApi()
const router = useRouter()
const route = useRoute()
const { user } = useAuth()
const { format: rupiah } = useRupiah()
const { format: qtyFmt } = useQty()
const { loadSupplierMap, loadProductMap, findBadStockLots, loadCashAccountOptions } = usePurchaseReturnLookups()

const operatorName = computed(() => user.value?.fullName ?? '')

// dd-MM-yyyy (PANDUAN_UI.md §10) -- lihat catatan sama di 2 modul lain.
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
const cashAccountOptions = ref<SelectOption[]>([])
const loadingOptions = ref(true)

async function loadAllOptions() {
  loadingOptions.value = true
  try {
    const [suppliers, products, cashAccounts] = await Promise.all([
      loadSupplierMap(), loadProductMap(), loadCashAccountOptions()
    ])
    supplierMap.value = suppliers
    productMap.value = products
    cashAccountOptions.value = cashAccounts.map(a => ({ label: `${a.code} - ${a.name}`, value: a.id }))
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
const selectedRow = ref<ReturnRow | null>(null)

const SETTLEMENT_LABEL: Record<string, string> = {
  REDUCE_INVOICE: 'Kurangi Hutang',
  CASH: 'Tunai'
}

const columns: Column<ReturnRow>[] = [
  { key: 'returnNumber', label: 'No. Retur', mono: true },
  { key: 'supplierId', label: 'Supplier', format: v => supplierLabel(v as string) },
  { key: 'returnDate', label: 'Tanggal', format: v => ddmmyyyy(v as string) },
  { key: 'settlementType', label: 'Penyelesaian', slot: 'settlementType' },
  { key: 'subtotalAgreedAmount', label: 'Nilai Retur', align: 'right', format: v => rupiah(Number(v), { bare: true }) },
  { key: 'differenceAmount', label: 'Selisih', align: 'right', slot: 'differenceAmount' },
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
      { label: 'Kurangi Hutang', value: 'REDUCE_INVOICE' },
      { label: 'Tunai', value: 'CASH' }
    ]
  }
]

function onRowClick(row: ReturnRow) {
  selectedRow.value = row
}
function goToDetailSelected() {
  if (selectedRow.value) navigateTo(`/pembelian/retur/${selectedRow.value.id}`)
}

// ---- Bagian B: entri via DocumentModal (PANDUAN_UI.md §6) ------------------
// Baris TIDAK lewat <LineModal> generik -- ini daftar Bad Stock tersaring per
// supplier dengan checkbox (bukan "tambah baris baru"). Memaksakan pola
// LineModal akan merusak N1 (gerbang supplier). Grid checkbox-list ini
// sendiri sudah <DataTable> mode lokal (bukan <table> manual).
const entriOpen = ref(false)

const supplierId = ref<string | undefined>(undefined)
const returnDate = ref(todayIso())
const unitMode = ref<UnitMode | null>(null)
const settlementType = ref<SettlementType | null>(null)
const cashAccountId = ref<string | undefined>(undefined)
const notes = ref('')
const candidates = ref<CandidateRow[]>([])
const loadingCandidates = ref(false)
const candidatesError = ref('')

const draftKey = 'md-draft:purchase-return:create'
const draftData = computed(() => ({
  supplierId: supplierId.value,
  returnDate: returnDate.value,
  unitMode: unitMode.value,
  settlementType: settlementType.value,
  cashAccountId: cashAccountId.value,
  notes: notes.value
}))
let entriSnapshot = JSON.stringify(draftData.value)
const entriDirty = computed(() => JSON.stringify(draftData.value) !== entriSnapshot)

function resetEntriForm() {
  supplierId.value = undefined
  returnDate.value = todayIso()
  unitMode.value = null
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
  supplierId.value = draft.supplierId
  returnDate.value = draft.returnDate
  unitMode.value = draft.unitMode
  settlementType.value = draft.settlementType
  cashAccountId.value = draft.cashAccountId
  notes.value = draft.notes
}
function closeEntri() {
  entriOpen.value = false
  if (route.path !== '/pembelian/retur') router.replace('/pembelian/retur')
}

const supplierOptions = computed<SelectOption[]>(() =>
  [...supplierMap.value.values()].map(s => ({ label: `${s.displayCode} - ${s.name}${s.isPkp ? ' (PKP)' : ''}`, value: s.id })))

// N1: daftar BS KOSONG sampai supplier dipilih -- fetch di-gate lewat
// watch(supplierId), TIDAK PERNAH dari daftar lengkap yang difilter
// client-side.
watch(supplierId, async (id) => {
  candidates.value = []
  candidatesError.value = ''
  if (!id) return
  loadingCandidates.value = true
  try {
    const rows = await findBadStockLots(id)
    candidates.value = rows.map(r => ({ ...r, checked: false, qtyInput: undefined, agreedUnitPrice: undefined }))
  } catch (err) {
    candidatesError.value = getErrorMessage(err, 'Gagal memuat daftar barang rusak.')
  } finally {
    loadingCandidates.value = false
  }
})

function setSettlementType(type: SettlementType) {
  settlementType.value = type
  if (type !== 'CASH') cashAccountId.value = undefined
}

// N2/N3: kalkulasi live (ESTIMASI, fifoNextUnitCost = lot TERTUA apa adanya
// dari GET /purchase-returns/bad-stock) -- calculatePurchaseReturn (N8) tidak
// disentuh, dipanggil apa adanya.
const checkedRows = computed(() => candidates.value.filter(r => r.checked))
const calc = computed(() => calculatePurchaseReturn(
  checkedRows.value.map(r => ({
    qtyInput: r.qtyInput ?? 0,
    agreedUnitPrice: r.agreedUnitPrice,
    fifoNextUnitCost: r.fifoNextUnitCost
  }))
))
const calcByProductId = computed(() => {
  const map = new Map<string, { agreedAmount: number, estimatedCostBasis: number, estimatedDifference: number }>()
  checkedRows.value.forEach((row, i) => {
    const line = calc.value.lines[i]
    if (line) map.set(row.productId, line)
  })
  return map
})
function calcForRow(row: CandidateRow) {
  return calcByProductId.value.get(row.productId)
}
function qtyExceedsAvailable(row: CandidateRow): boolean {
  return (row.qtyInput ?? 0) > row.qtyAvailable
}

const candidateColumns: Column<CandidateRow>[] = [
  { key: 'checked', label: '', slot: 'checkedCell', width: '2.5rem' },
  { key: 'displayName', label: 'Produk' },
  { key: 'qtyAvailable', label: 'Tersedia', align: 'right', format: v => qtyFmt(v as number) },
  { key: 'fifoNextUnitCost', label: 'Harga Pokok (Ref.)', align: 'right', format: v => rupiah(v as number, { bare: true }) },
  { key: 'qtyInput', label: 'Qty Retur', slot: 'qtyCell' },
  { key: 'agreedUnitPrice', label: 'Nilai Retur / Satuan', slot: 'priceCell' },
  { key: 'estimatedDifference', label: 'Selisih (Estimasi)', align: 'right', slot: 'diffCell' }
]

// ---- Validasi & submit ------------------------------------------------------
function validate(): string | null {
  if (!supplierId.value) return 'Pilih supplier.'
  if (!unitMode.value) return 'Pilih satuan retur (Besar/Kecil).'
  if (!settlementType.value) return 'Pilih cara penyelesaian.'
  if (settlementType.value === 'CASH' && !cashAccountId.value) return 'Pilih akun kas/bank.'
  if (checkedRows.value.length === 0) return 'Centang minimal satu barang untuk diretur.'
  for (const [i, row] of checkedRows.value.entries()) {
    if (!((row.qtyInput ?? 0) > 0)) return `Baris ${i + 1}: qty wajib diisi lebih dari 0.`
    if (!((row.agreedUnitPrice ?? 0) > 0)) return `Baris ${i + 1}: nilai retur wajib diisi lebih dari 0.`
  }
  return null
}

function buildPayload(): Record<string, unknown> {
  return {
    supplierId: supplierId.value,
    returnDate: returnDate.value,
    unitMode: unitMode.value,
    settlementType: settlementType.value,
    cashAccountId: settlementType.value === 'CASH' ? cashAccountId.value : undefined,
    notes: notes.value || undefined,
    lines: checkedRows.value.map(r => ({
      productId: r.productId,
      qtyInput: r.qtyInput,
      agreedUnitPrice: r.agreedUnitPrice
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
    result.value = await api.post<CreateResult>('/purchase-returns', buildPayload())
    documentModalRef.value?.clearDraft()
    entriOpen.value = false
    resultOpen.value = true
    table.value?.reload()
    if (route.path !== '/pembelian/retur') router.replace('/pembelian/retur')
  } catch (err2) {
    bannerError.value = getErrorMessage(err2, 'Gagal membuat retur pembelian.')
  } finally {
    submitting.value = false
  }
}

function productLabel(id: string): string {
  return candidates.value.find(c => c.productId === id)?.displayName ?? id
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
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
      endpoint="/purchase-returns"
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
      <template #differenceAmount="{ value }">
        <span :class="Number(value) >= 0 ? 'text-success' : 'text-error'">
          {{ rupiah(Number(value), { bare: true }) }}
        </span>
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

    <!-- Bagian B: entri (satu lapis modal -- baris via daftar BS tercentang,
         bukan LineModal, lihat catatan N1 di atas) -->
    <DocumentModal
      ref="documentModalRef"
      :open="entriOpen"
      title="Retur Pembelian"
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

        <div class="grid grid-cols-2 gap-y-1.5 gap-x-4">
          <UFormField
            label="Supplier"
            required
            hint="Daftar barang rusak di bawah baru muncul setelah supplier dipilih."
          >
            <UInputMenu
              v-model="supplierId"
              value-key="value"
              :items="supplierOptions"
              placeholder="Pilih supplier..."
              class="w-full"
            />
          </UFormField>
          <UFormField label="Tanggal Retur">
            <UInput
              v-model="returnDate"
              type="date"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Satuan Retur"
            required
          >
            <UFieldGroup>
              <UButton
                :color="unitMode === 'BESAR' ? 'primary' : 'neutral'"
                :variant="unitMode === 'BESAR' ? 'solid' : 'subtle'"
                @click="unitMode = 'BESAR'"
              >
                Satuan Besar
              </UButton>
              <UButton
                :color="unitMode === 'KECIL' ? 'primary' : 'neutral'"
                :variant="unitMode === 'KECIL' ? 'solid' : 'subtle'"
                @click="unitMode = 'KECIL'"
              >
                Satuan Kecil
              </UButton>
            </UFieldGroup>
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
                Kurangi Hutang
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
      </template>

      <template #lines>
        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium">Barang Rusak Milik Supplier Ini</span>

          <UEmpty
            v-if="!supplierId"
            icon="i-lucide-truck"
            title="Pilih supplier dulu"
            description="Daftar barang rusak yang bisa diretur muncul setelah supplier dipilih."
          />
          <div
            v-else-if="loadingCandidates"
            class="flex flex-col gap-2"
          >
            <USkeleton
              v-for="i in 3"
              :key="i"
              class="h-10 w-full"
            />
          </div>
          <UAlert
            v-else-if="candidatesError"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-triangle"
            :description="candidatesError"
          />

          <DataTable
            v-else
            :rows="candidates as unknown as Record<string, unknown>[]"
            :columns="candidateColumns as Column<Record<string, unknown>>[]"
            dense
            zebra
            :searchable="false"
            :empty-text="'< Tidak Ada Barang Rusak Untuk Ditampilkan >'"
          >
            <template #checkedCell="{ row }">
              <UCheckbox v-model="(row as unknown as CandidateRow).checked" />
            </template>
            <template #qtyCell="{ row }">
              <template v-if="(row as unknown as CandidateRow).checked">
                <QtyInput
                  v-model="(row as unknown as CandidateRow).qtyInput"
                  placeholder="0"
                  :min="0"
                  class="w-28"
                />
                <p
                  v-if="qtyExceedsAvailable(row as unknown as CandidateRow)"
                  class="text-xs text-warning mt-1"
                >
                  Melebihi stok tersedia
                </p>
              </template>
              <span
                v-else
                class="text-muted"
              >-</span>
            </template>
            <template #priceCell="{ row }">
              <MoneyInput
                v-if="(row as unknown as CandidateRow).checked"
                v-model="(row as unknown as CandidateRow).agreedUnitPrice"
                placeholder="0"
                :min="0"
                class="w-32"
              />
              <span
                v-else
                class="text-muted"
              >-</span>
            </template>
            <template #diffCell="{ row }">
              <span
                v-if="(row as unknown as CandidateRow).checked && calcForRow(row as unknown as CandidateRow)"
                :class="calcForRow(row as unknown as CandidateRow)!.estimatedDifference >= 0 ? 'text-success' : 'text-error'"
              >
                {{ calcForRow(row as unknown as CandidateRow)!.estimatedDifference >= 0 ? '+' : '' }}{{ rupiah(calcForRow(row as unknown as CandidateRow)!.estimatedDifference, { bare: true }) }}
              </span>
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
            { label: 'Qty', value: qtyFmt(checkedRows.reduce((s, r) => s + (r.qtyInput ?? 0), 0)) },
            { label: 'Harga Pokok (Estimasi)', value: rupiah(calc.estimatedTotalCostBasis, { bare: true }) },
            { label: 'Selisih (Estimasi)', value: rupiah(calc.estimatedTotalDifference, { bare: true }) },
            { label: 'Total', value: rupiah(calc.subtotalAgreedAmount, { bare: true }), emphasize: true }
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
            :title="`Retur ${result.purchaseReturn.returnNumber} tersimpan`"
            :description="`Nilai retur ${rupiah(Number(result.purchaseReturn.subtotalAgreedAmount))} · Harga pokok ${rupiah(Number(result.purchaseReturn.totalCostBasis))} · Selisih ${rupiah(Number(result.purchaseReturn.differenceAmount))}`"
          />
          <DataTable
            :rows="result.lines as unknown as Record<string, unknown>[]"
            :columns="[
              { key: 'productId', label: 'Produk', format: (v: unknown) => productLabel(v as string) },
              { key: 'qtyInput', label: 'Qty', format: (v: unknown) => qtyFmt(Number(v)) },
              { key: 'agreedAmount', label: 'Nilai Retur', align: 'right', format: (v: unknown) => rupiah(Number(v), { bare: true }) },
              { key: 'costBasisAmount', label: 'Harga Pokok', align: 'right', format: (v: unknown) => rupiah(Number(v), { bare: true }) }
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
            :to="`/pembelian/retur/${result.purchaseReturn.id}/cetak`"
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
