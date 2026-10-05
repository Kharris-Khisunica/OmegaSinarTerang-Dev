<script setup lang="ts">
import type { SelectOption } from '~/types/crud-form'
import type { Column, RowAction } from '~/types/data-table'

/**
 * Payment step 1+2+3 (Hari 26-27, CLAUDE.md §2.12 lewat KONTEKS_REVISI_2026-07-28.md
 * §2.12) — SATU template dipakai Penerimaan Kas (SALES/pelanggan) DAN
 * Pengeluaran Kas (PURCHASE/supplier), "Kepada:"/"Dari:" cuma label berbeda
 * arah (keputusan §2.12 poin 4). Dua halaman tipis (`kas-bank/penerimaan`,
 * `kas-bank/pengeluaran`) membungkus komponen ini dengan `invoiceType` beda.
 *
 * Paket R9 (KB1, `docs/RENCANA_REVISI_TESTING_KLIEN.md` §3) — DITULIS ULANG
 * dari "satu pihak -> daftar fakturnya" (Hari 27) jadi GRID BARIS: pihak +
 * faktur + nominal + tandai lunas PER BARIS, boleh lintas pihak dalam SATU
 * entri.
 *
 * Koreksi 26 Sep 2026 — metode pembayaran (akun kas/bank + nominal) PINDAH
 * dari header (satu pool untuk seluruh entri) ke PER BARIS FAKTUR. Setiap
 * baris di grid sekarang punya sub-tabel metodenya sendiri (awalnya satu
 * baris, defaultnya = Sisa Faktur, bisa ditambah untuk membagi pelunasan
 * satu faktur ke lebih dari satu akun kas/bank). "Nominal" di grid = Σ
 * metode baris itu. Tidak ada lagi header "Metode Pembayaran" maupun
 * cross-check total metode vs total baris — tiap baris sudah lengkap dengan
 * dirinya sendiri.
 *
 * "Isi Otomatis (FIFO)" (Hari 27) SUDAH DIHAPUS sejak paket R9 (backend
 * `POST /payments/preview-allocation` sendiri ikut dihapus 26 Sep 2026 —
 * tidak ada lagi "satu nominal total" untuk di-FIFO-kan begitu metode
 * pindah ke per baris).
 *
 * Dialog Konfirmasi Selisih Pembayaran (CLAUDE.md §2.18) TETAP seperti
 * sekarang -- HANYA menambahkan label pihak di tiap baris (sekarang bisa
 * lintas pihak, operator perlu tahu selisih itu punya siapa).
 */
const props = defineProps<{
  invoiceType: 'SALES' | 'PURCHASE'
}>()

const emit = defineEmits<{
  confirmed: [batchId: string]
}>()

interface CashAccountOption { id: string, code: string, name: string }
interface MethodRow { cashAccountId: string | undefined, amount: number | undefined, authorizationRequestId?: string }

interface OpenInvoiceApiRow extends Record<string, unknown> {
  invoiceId: string
  invoiceNumber: string
  invoiceDate: string
  totalAmount: number
  outstanding: number
  partyId: string
  partyName: string
}

interface AllocationRow extends Record<string, unknown> {
  partyId: string
  partyName: string
  invoiceId: string
  invoiceNumber: string
  invoiceDate: string
  outstanding: number
  methods: MethodRow[]
  settleInFull: boolean
}

interface DraftRow {
  partyId: string
  partyName: string
  invoiceId: string
  invoiceNumber: string
  invoiceDate: string
  outstanding: number
  methods: MethodRow[]
  settleInFull: boolean
}

const api = useApi()
const { withStepUp } = useStepUp()
const { format: rupiah } = useRupiah()
const { loadCustomerMap } = useSalesInvoiceLookups()
const { loadSupplierMap } = usePurchaseInvoiceLookups()

const partyLabel = computed(() => (props.invoiceType === 'SALES' ? 'Pelanggan' : 'Supplier'))
const directionLabel = computed(() => (props.invoiceType === 'SALES' ? 'Diterima Dari' : 'Dibayarkan Kepada'))

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function methodsTotal(methods: MethodRow[]): number {
  return methods.reduce((sum, m) => sum + (m.amount ?? 0), 0)
}

// ---- Pihak (dipakai sebagai PENYARING opsional di picker faktur, bukan
// syarat header lagi -- grid sekarang boleh lintas pihak). ------------------
const partyOptions = ref<SelectOption[]>([])
const loadingParties = ref(true)
async function loadParties() {
  loadingParties.value = true
  try {
    if (props.invoiceType === 'SALES') {
      const map = await loadCustomerMap()
      partyOptions.value = [...map.values()]
        .filter(c => c.isActive)
        .map(c => ({ label: `${c.code} - ${c.name}`, value: c.id }))
    } else {
      const map = await loadSupplierMap()
      // name/displayCode sudah ter-mask untuk OPERATOR oleh backend
      // (SupplierMaskingInterceptor, CLAUDE.md §3) -- ditampilkan apa adanya,
      // pola sama pembelian/faktur/index.vue.
      partyOptions.value = [...map.values()]
        .map(s => ({ label: `${s.displayCode} - ${s.name}`, value: s.id }))
    }
  } finally {
    loadingParties.value = false
  }
}

const cashAccountOptions = ref<SelectOption[]>([])
async function loadCashAccounts() {
  const accounts = await api.get<CashAccountOption[]>('/chart-of-accounts/cash-accounts')
  cashAccountOptions.value = accounts.map(a => ({ label: `${a.code} - ${a.name}`, value: a.id }))
}

onMounted(() => {
  loadParties()
  loadCashAccounts()
})

// ---- Header: tanggal + catatan saja -- metode sudah pindah ke per baris ---
const paymentDate = ref(todayIso())
const notes = ref('')

// ---- Grid baris: pihak + faktur + metode(per baris) + lunas, lintas pihak -
const rows = ref<AllocationRow[]>([])
const editingIndex = ref<number | null>(null)

function rowDiscrepancy(row: AllocationRow): number | null {
  const total = methodsTotal(row.methods)
  if (!row.settleInFull || !total) return null
  const diff = row.outstanding - total
  return diff === 0 ? null : diff
}

const totalAllocated = computed(() =>
  rows.value.reduce((sum, r) => sum + methodsTotal(r.methods), 0))

const rowColumns: Column<AllocationRow>[] = [
  { key: 'partyName', label: 'Pihak' },
  { key: 'invoiceNumber', label: 'No. Faktur', mono: true },
  { key: 'invoiceDate', label: 'Tanggal', format: v => formatDate(v as string) },
  { key: 'outstanding', label: 'Sisa Faktur', align: 'right', format: v => rupiah(v as number, { bare: true }) },
  { key: 'methods', label: 'Metode', slot: 'methodsCell' },
  { key: 'nominal', label: 'Nominal', align: 'right', slot: 'nominalCell' },
  { key: 'settleInFull', label: 'Lunas', align: 'center', slot: 'lunasCell' }
]

function removeRow(row: AllocationRow) {
  rows.value = rows.value.filter(r => r.invoiceId !== row.invoiceId)
}
const gridRowActions: RowAction<AllocationRow>[] = [
  {
    label: 'Ubah',
    icon: 'i-lucide-pencil',
    color: 'neutral',
    onClick: row => openEditRow(row)
  },
  {
    label: 'Hapus',
    icon: 'i-lucide-trash-2',
    color: 'error',
    onClick: row => removeRow(row)
  }
]

// ---- LineModal "Baris Faktur" -- dua tahap: (1) pilih faktur dari daftar
// faktur terbuka (DataTable mode data lokal diisi manual dari
// `GET /payments/open-invoices`, BUKAN <LookupModal>/mode remote <DataTable>
// karena endpoint itu membalas daftar polos `{invoices:[]}`, bukan amplop
// `{data,meta}` yang dibutuhkan mode remote -- PANDUAN_UI.md §8.7 tetap
// terpenuhi karena grid baris di dalam modal ini TETAP <DataTable>, cuma
// dalam mode lokal), (2) isi metode pembayaran (bisa lebih dari satu akun) +
// tandai lunas. ---------------------------------------------------------
const lineOpen = ref(false)
const lineDirty = ref(false)
const lineError = ref('')
const lineMode = computed<'entri' | 'ubah'>(() => (editingIndex.value === null ? 'entri' : 'ubah'))

const pickerPartyId = ref<string | undefined>(undefined)
const pickerSearch = ref('')
const pickerRows = ref<OpenInvoiceApiRow[]>([])
const pickerLoading = ref(false)
const pickerError = ref('')

const draft = ref<DraftRow | null>(null)

function newMethod(amount?: number): MethodRow {
  return { cashAccountId: undefined, amount }
}
function addDraftMethod() {
  draft.value?.methods.push(newMethod())
}
function removeDraftMethod(index: number) {
  if (!draft.value) return
  draft.value.methods.splice(index, 1)
  if (draft.value.methods.length === 0) draft.value.methods.push(newMethod())
  markLineDirty()
}

const pickerColumns: Column<OpenInvoiceApiRow>[] = [
  { key: 'partyName', label: partyLabel.value },
  { key: 'invoiceNumber', label: 'No. Faktur', mono: true },
  { key: 'invoiceDate', label: 'Tanggal', format: v => formatDate(v as string) },
  { key: 'outstanding', label: 'Sisa Faktur', align: 'right', format: v => rupiah(v as number, { bare: true }) }
]

async function loadPicker() {
  pickerLoading.value = true
  pickerError.value = ''
  try {
    const result = await api.get<{ invoices: OpenInvoiceApiRow[] }>('/payments/open-invoices', {
      invoiceType: props.invoiceType,
      ...(pickerPartyId.value ? { partyId: pickerPartyId.value } : {}),
      ...(pickerSearch.value.trim() ? { search: pickerSearch.value.trim() } : {})
    })
    // Faktur yang sudah dipakai baris lain di grid ini tidak ditawarkan lagi
    // -- kecuali baris yang SEDANG diedit sekarang (biar faktur asalnya
    // sendiri tetap terlihat kalau operator buka "Ganti Faktur" lalu batal).
    const usedIds = new Set(
      rows.value
        .filter((_, idx) => idx !== editingIndex.value)
        .map(r => r.invoiceId)
    )
    pickerRows.value = result.invoices.filter(inv => !usedIds.has(inv.invoiceId))
  } catch (err) {
    pickerError.value = getErrorMessage(err, 'Gagal memuat daftar faktur terbuka.')
  } finally {
    pickerLoading.value = false
  }
}
watch(pickerPartyId, () => {
  if (lineOpen.value && !draft.value) void loadPicker()
})

function openAddRow() {
  editingIndex.value = null
  draft.value = null
  pickerPartyId.value = undefined
  pickerSearch.value = ''
  lineError.value = ''
  lineDirty.value = false
  lineOpen.value = true
  void loadPicker()
}
function openEditRow(row: AllocationRow) {
  const idx = rows.value.findIndex(r => r.invoiceId === row.invoiceId)
  editingIndex.value = idx >= 0 ? idx : null
  draft.value = { ...row, methods: row.methods.map(m => ({ ...m })) }
  pickerPartyId.value = undefined
  pickerSearch.value = ''
  lineError.value = ''
  lineDirty.value = false
  lineOpen.value = true
}
function pickInvoice(inv: OpenInvoiceApiRow) {
  draft.value = {
    partyId: inv.partyId,
    partyName: inv.partyName,
    invoiceId: inv.invoiceId,
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate,
    outstanding: inv.outstanding,
    methods: [newMethod(inv.outstanding)],
    settleInFull: false
  }
  lineError.value = ''
  lineDirty.value = true
}
function backToPicker() {
  draft.value = null
  void loadPicker()
}
function markLineDirty() {
  lineDirty.value = true
}

function draftTotal(): number {
  return draft.value ? methodsTotal(draft.value.methods) : 0
}
function draftDiscrepancy(): number | null {
  if (!draft.value || !draft.value.settleInFull) return null
  const total = draftTotal()
  if (!total) return null
  const diff = draft.value.outstanding - total
  return diff === 0 ? null : diff
}

function saveLine() {
  if (!draft.value) {
    lineError.value = 'Pilih faktur dulu.'
    return
  }
  if (draft.value.methods.length === 0 || !draft.value.methods.every(m => !!m.cashAccountId && (m.amount ?? 0) > 0)) {
    lineError.value = 'Lengkapi akun kas dan nominal setiap metode pembayaran.'
    return
  }
  const finalRow: AllocationRow = { ...draft.value }
  const duplicate = rows.value.some(
    (r, idx) => r.invoiceId === finalRow.invoiceId && idx !== editingIndex.value
  )
  if (duplicate) {
    lineError.value = 'Faktur ini sudah ada di baris lain.'
    return
  }
  if (editingIndex.value !== null) {
    rows.value.splice(editingIndex.value, 1, finalRow)
  } else {
    rows.value.push(finalRow)
  }
  lineOpen.value = false
}

// ---- Konfirmasi ---------------------------------------------------------
const confirmBlockedReason = computed(() => {
  if (rows.value.length === 0) return 'Tambah minimal satu baris faktur.'
  return ''
})
const canConfirm = computed(() => confirmBlockedReason.value === '')

const confirmError = ref('')
const confirmSubmitting = ref(false)
const discrepancyConfirmOpen = ref(false)

function linesToSubmit() {
  return rows.value.map(r => ({
    invoiceId: r.invoiceId,
    settleInFull: r.settleInFull,
    methods: r.methods.map(m => ({ cashAccountId: m.cashAccountId, amount: m.amount, authorizationRequestId: m.authorizationRequestId }))
  }))
}

function discrepancyLinesForConfirm() {
  return rows.value
    .filter(r => r.settleInFull && rowDiscrepancy(r) !== null)
    .map(r => ({ invoiceNumber: r.invoiceNumber, partyName: r.partyName, diff: rowDiscrepancy(r) as number }))
}

function requestConfirm() {
  if (!canConfirm.value) return
  confirmError.value = ''
  if (discrepancyLinesForConfirm().length > 0) {
    discrepancyConfirmOpen.value = true
    return
  }
  void submitConfirm()
}

async function submitConfirm() {
  discrepancyConfirmOpen.value = false
  confirmSubmitting.value = true
  confirmError.value = ''
  try {
    const result = await withStepUp(headers =>
      api.post<{ paymentBatch: { id: string } }>('/payments/confirm', {
        invoiceType: props.invoiceType,
        paymentDate: paymentDate.value,
        lines: linesToSubmit(),
        notes: notes.value.trim() || undefined
      }, headers)
    )
    resetForm()
    emit('confirmed', result.paymentBatch.id)
  } catch (err) {
    if (err instanceof StepUpCancelledError) return
    confirmError.value = getErrorMessage(err, 'Gagal mengonfirmasi pembayaran.')
  } finally {
    confirmSubmitting.value = false
  }
}

function resetForm() {
  paymentDate.value = todayIso()
  notes.value = ''
  rows.value = []
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-2 gap-y-1.5 gap-x-4">
      <UFormField
        label="Tanggal"
        required
      >
        <UInput
          v-model="paymentDate"
          type="date"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Catatan">
        <UInput
          v-model="notes"
          placeholder="opsional"
          class="w-full"
        />
      </UFormField>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <p class="text-sm font-medium">
          Baris Faktur -- boleh lintas {{ partyLabel.toLowerCase() }}
        </p>
        <UButton
          icon="i-lucide-plus"
          size="xs"
          @click="openAddRow"
        >
          Entri
        </UButton>
      </div>

      <DataTable
        :rows="rows"
        :columns="rowColumns"
        :row-actions="gridRowActions"
        dense
        zebra
        :searchable="false"
        empty-text="Belum ada baris faktur. Klik Entri untuk menambah."
      >
        <template #methodsCell="{ row }">
          <div class="text-xs text-muted">
            <div
              v-for="(m, idx) in (row as AllocationRow).methods"
              :key="idx"
            >
              {{ cashAccountOptions.find(o => o.value === m.cashAccountId)?.label ?? '-' }}
            </div>
          </div>
        </template>
        <template #nominalCell="{ row }">
          <div class="text-right">
            <div>{{ rupiah(methodsTotal((row as AllocationRow).methods), { bare: true }) }}</div>
            <div
              v-if="rowDiscrepancy(row as AllocationRow) !== null"
              class="text-xs"
              :class="(rowDiscrepancy(row as AllocationRow) as number) > 0 ? 'text-warning' : 'text-info'"
            >
              Selisih {{ rupiah(Math.abs(rowDiscrepancy(row as AllocationRow) as number), { bare: true }) }}
            </div>
          </div>
        </template>
        <template #lunasCell="{ row }">
          <UBadge
            v-if="(row as AllocationRow).settleInFull"
            color="success"
            variant="subtle"
          >
            Lunas
          </UBadge>
          <span
            v-else
            class="text-muted text-xs"
          >-</span>
        </template>
      </DataTable>

      <TotalsBar
        v-if="rows.length > 0"
        :items="[
          { label: 'Total Dialokasikan', value: rupiah(totalAllocated, { bare: true }), emphasize: true }
        ]"
      />
    </div>

    <UAlert
      v-if="confirmError"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-triangle"
      :title="confirmError"
      :close-button="{ icon: 'i-lucide-x', color: 'neutral', variant: 'link' }"
      @update:open="confirmError = ''"
    />
    <p
      v-if="!canConfirm && confirmBlockedReason"
      class="text-xs text-warning"
    >
      {{ confirmBlockedReason }}
    </p>

    <UButton
      icon="i-lucide-check"
      :loading="confirmSubmitting"
      :disabled="!canConfirm"
      class="self-start"
      @click="requestConfirm"
    >
      Konfirmasi Pembayaran
    </UButton>

    <UModal
      v-model:open="discrepancyConfirmOpen"
      title="Konfirmasi Selisih Pembayaran"
      description="Nominal tidak persis sama dengan sisa faktur pada baris yang ditandai lunas. Selisih akan dicatat, BUKAN dibulatkan."
    >
      <template #body>
        <div class="flex flex-col gap-2">
          <div
            v-for="line in discrepancyLinesForConfirm()"
            :key="line.invoiceNumber"
            class="flex items-center justify-between text-sm border-b border-default pb-1.5 last:border-0"
          >
            <span>
              <span class="font-mono">{{ line.invoiceNumber }}</span>
              <span class="text-muted"> -- {{ line.partyName }}</span>
            </span>
            <span :class="line.diff > 0 ? 'text-warning' : 'text-info'">
              Selisih {{ rupiah(Math.abs(line.diff), { bare: true }) }}
              ({{ line.diff > 0 ? 'kurang bayar' : 'lebih bayar' }})
            </span>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            color="neutral"
            variant="ghost"
            @click="discrepancyConfirmOpen = false"
          >
            Batal
          </UButton>
          <UButton @click="submitConfirm">
            Ya, Lanjutkan
          </UButton>
        </div>
      </template>
    </UModal>

    <LineModal
      title="Baris Faktur"
      :mode="lineMode"
      :open="lineOpen"
      :dirty="lineDirty"
      width="1000px"
      @update:open="(v: boolean) => (lineOpen = v)"
      @save="saveLine"
    >
      <template #form>
        <UAlert
          v-if="lineError"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          :title="lineError"
          :close-button="{ icon: 'i-lucide-x', color: 'neutral', variant: 'link' }"
          @update:open="lineError = ''"
        />

        <template v-if="!draft">
          <UFormField :label="`${partyLabel} (opsional, penyaring)`">
            <UInputMenu
              v-model="pickerPartyId"
              value-key="value"
              :items="partyOptions"
              :loading="loadingParties"
              :placeholder="`Semua ${partyLabel.toLowerCase()}...`"
              class="w-full"
            />
          </UFormField>
          <div class="flex items-center gap-2">
            <UInput
              v-model="pickerSearch"
              placeholder="Cari nomor faktur..."
              class="flex-1"
              @keyup.enter="loadPicker"
            />
            <UButton
              icon="i-lucide-search"
              color="neutral"
              variant="subtle"
              :loading="pickerLoading"
              @click="loadPicker"
            >
              Cari
            </UButton>
          </div>
          <UAlert
            v-if="pickerError"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-triangle"
            :title="pickerError"
          />
          <div class="max-h-72 overflow-y-auto">
            <DataTable
              :rows="pickerRows"
              :columns="pickerColumns"
              dense
              zebra
              :searchable="false"
              :on-row-click="pickInvoice"
              empty-text="Tidak ada faktur terbuka."
            />
          </div>
        </template>

        <template v-else>
          <InfoStrip
            variant="stacked"
            :items="[
              { label: partyLabel, value: draft.partyName },
              { label: 'No. Faktur', value: draft.invoiceNumber },
              { label: 'Tanggal', value: formatDate(draft.invoiceDate) },
              { label: 'Sisa Faktur', value: rupiah(draft.outstanding, { bare: true }) }
            ]"
          />
          <UButton
            icon="i-lucide-arrow-left"
            size="xs"
            variant="subtle"
            color="neutral"
            class="self-start"
            @click="backToPicker"
          >
            Ganti Faktur
          </UButton>

          <div class="flex flex-col gap-2">
            <p class="text-sm font-medium">
              Metode Pembayaran ({{ directionLabel }})
            </p>
            <div
              v-for="(method, idx) in draft.methods"
              :key="idx"
              class="flex items-center gap-2"
            >
              <USelect
                v-model="method.cashAccountId"
                :items="cashAccountOptions"
                placeholder="Pilih akun kas/bank..."
                class="flex-1"
                @update:model-value="markLineDirty"
              />
              <MoneyInput
                v-model="method.amount"
                placeholder="0"
                :min="0"
                class="w-56"
                @update:model-value="markLineDirty"
              />
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="sm"
                :disabled="draft.methods.length === 1"
                @click="removeDraftMethod(idx)"
              />
            </div>
            <UButton
              icon="i-lucide-plus"
              size="xs"
              variant="subtle"
              class="self-start"
              @click="addDraftMethod"
            >
              Tambah Metode
            </UButton>
          </div>

          <TotalsBar :items="[{ label: 'Total Baris Ini', value: rupiah(draftTotal(), { bare: true }), emphasize: true }]" />

          <p
            v-if="draftDiscrepancy() !== null"
            class="text-xs"
            :class="(draftDiscrepancy() as number) > 0 ? 'text-warning' : 'text-info'"
          >
            Selisih {{ rupiah(Math.abs(draftDiscrepancy() as number), { bare: true }) }}
            ({{ (draftDiscrepancy() as number) > 0 ? 'kurang bayar' : 'lebih bayar' }})
          </p>

          <UCheckbox
            v-model="draft.settleInFull"
            label="Tandai Lunas"
            @update:model-value="markLineDirty"
          />
        </template>
      </template>

      <template #context>
        <InfoStrip
          v-if="!draft"
          text="Pilih faktur dari daftar di kiri. Boleh lintas pihak dalam satu entri (paket R9)."
        />
        <InfoStrip
          v-else
          text="Boleh dibagi ke lebih dari satu akun kas/bank untuk faktur ini. Selisih pembayaran di sini hanya pratinjau -- angka otoritatif dihitung ulang backend saat Konfirmasi Pembayaran."
        />
      </template>
    </LineModal>
  </div>
</template>
