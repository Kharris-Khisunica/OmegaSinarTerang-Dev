<script setup lang="ts">
import type { Column } from '~/types/data-table'
import type { SelectOption } from '~/types/crud-form'

// Hari 17 (CLAUDE.md §5 "Pengeluaran kas besar") + paket R10 (docs/
// RENCANA_REVISI_TESTING_KLIEN.md §3 "R10") + Hari 32A FE (kolom Kendaraan/
// Pekerja, tombol Edit sebelum disetujui, tab Kasbon).
//
// PILIHAN POLA — DocumentModal+LineModal+DataTable lokal (PANDUAN_UI.md §6-
// §8), BUKAN CrudFormPage repeaterColumns:
// `RepeaterColumnDef` (app/types/crud-form.ts) TIDAK punya visibilitas
// PER-BARIS — setiap baris repeater menampilkan kolom yang SAMA. Kebutuhan
// hari ini justru sebaliknya: baris ber-akun BBM/Servis/Pajak Kendaraan
// menunjukkan dropdown Kendaraan, baris Gaji Tukang Angkut/Kasbon menunjukkan
// dropdown Pekerja, baris biasa tidak menunjukkan keduanya. Itu perbedaan
// PER BARIS berdasar akun yang dipilih baris itu sendiri, sesuatu yang cuma
// bisa ditangkap kalau tiap baris punya modalnya sendiri (LineModal) untuk
// mengevaluasi kondisi itu saat diisi -- pola PERSIS Faktur Pembelian
// (toggle "Bonus" pada `unitPrice`) yang sudah dibangun untuk kebutuhan yang
// sama bentuknya. CrudFormPage tetap dipakai modul lain (mis. Produk) yang
// memang kolom repeater-nya uniform.
definePageMeta({ title: 'Biaya Operasional', roles: ['MASTER', 'OPERATOR'] })

interface NamedOption { id: string, code: string, name: string, isActive?: boolean }
type ReviewStatus = 'BELUM_DICEK' | 'DISETUJUI' | 'BERMASALAH'

interface ExpenseDocumentRow extends Record<string, unknown> {
  id: string
  documentNumber: string
  expenseDate: string
  cashAccountId: string
  totalAmount: number
  reviewStatus: ReviewStatus
  createdAt: string
}
interface ExpenseLine extends Record<string, unknown> {
  id: string
  documentId: string
  lineOrder: number
  expenseAccountId: string
  amount: string
  description: string | null
  referenceNumber: string | null
  workerId: string | null
  vehicleId: string | null
  postingStatus: 'POSTED' | 'VOIDED'
  voidReasonCode: string | null
  voidReasonNote: string | null
  createdAt: string
}
interface ExpenseDocumentDetail extends ExpenseDocumentRow {
  lines: ExpenseLine[]
  reviewNote: string | null
}

// Kode akun literal (CLAUDE.md §3 "Biaya Operasional") -- tidak ada endpoint
// yang mengembalikan "daftar akun kendaraan"/"daftar akun pekerja", jadi
// dicocokkan dari code akun biaya yang sudah dimuat lewat
// /operational-expenses/expense-accounts.
const VEHICLE_ACCOUNT_CODES = new Set(['06.110.00006', '06.110.00007', '06.110.00008'])
const WORKER_EXPENSE_ACCOUNT_CODE = '06.110.00002' // B. Upah Tukang Angkut
const KAS_KECIL_CODE = '01.110.00001'

const REVIEW_LABEL: Record<ReviewStatus, string> = {
  BELUM_DICEK: 'Belum Dicek',
  DISETUJUI: 'Disetujui',
  BERMASALAH: 'Bermasalah'
}
const REVIEW_COLOR: Record<ReviewStatus, 'neutral' | 'success' | 'error'> = {
  BELUM_DICEK: 'neutral',
  DISETUJUI: 'success',
  BERMASALAH: 'error'
}

const api = useApi()
const { format: rupiah } = useRupiah()
const { withStepUp } = useStepUp()
const { user } = useAuth()
const operatorName = computed(() => user.value?.fullName ?? '')

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

// ---- Akun kas, akun biaya, Kasbon, Kendaraan, Pekerja -----------------------
// GET /chart-of-accounts penuh MASTER+SUPERVISOR saja (CLAUDE.md §5) -- lima
// endpoint sempit ini yang OPERATOR boleh baca (cash-accounts/expense-accounts
// sejak Hari 5/17, employee-receivable-account ditambahkan paket R10 khusus
// tab Kasbon, pola identik).
const cashAccounts = ref<NamedOption[]>([])
const expenseAccounts = ref<NamedOption[]>([])
const kasbonAccount = ref<NamedOption | null>(null)
const vehicles = ref<NamedOption[]>([])
const workers = ref<NamedOption[]>([])
const loadingOptions = ref(true)

async function loadOptions() {
  loadingOptions.value = true
  try {
    const [cash, expense, kasbon, vehiclesRes, workersRes] = await Promise.all([
      api.get<NamedOption[]>('/chart-of-accounts/cash-accounts'),
      api.get<NamedOption[]>('/operational-expenses/expense-accounts'),
      api.get<NamedOption | null>('/operational-expenses/employee-receivable-account'),
      api.get<{ data: NamedOption[] }>('/vehicles', { limit: 200 }),
      api.get<{ data: NamedOption[] }>('/workers', { limit: 200 })
    ])
    cashAccounts.value = cash
    expenseAccounts.value = expense
    kasbonAccount.value = kasbon
    vehicles.value = vehiclesRes.data.filter(v => v.isActive)
    workers.value = workersRes.data.filter(w => w.isActive)
  } finally {
    loadingOptions.value = false
  }
}

const cashAccountMap = computed(() => new Map(cashAccounts.value.map(a => [a.id, a])))
const expenseAccountMap = computed(() => new Map(expenseAccounts.value.map(a => [a.id, a])))
const vehicleMap = computed(() => new Map(vehicles.value.map(v => [v.id, v])))
const workerMap = computed(() => new Map(workers.value.map(w => [w.id, w])))

function cashAccountName(id: string): string {
  return cashAccountMap.value.get(id)?.name ?? '-'
}
// Kasbon TIDAK ada di expenseAccountMap (accountType-nya ASSET, bukan
// EXPENSE, sengaja disaring keluar dari /expense-accounts) -- gabung di sini.
function accountName(id: string | null | undefined): string {
  if (!id) return '-'
  if (id === kasbonAccount.value?.id) return `${kasbonAccount.value.name} (Kasbon)`
  return expenseAccountMap.value.get(id)?.name ?? '-'
}
function accountCode(id: string | undefined): string | undefined {
  if (!id) return undefined
  if (id === kasbonAccount.value?.id) return kasbonAccount.value.code
  return expenseAccountMap.value.get(id)?.code
}
function showsVehicleField(accountId: string | undefined): boolean {
  const code = accountCode(accountId)
  return !!code && VEHICLE_ACCOUNT_CODES.has(code)
}
function showsWorkerField(kind: 'BIAYA' | 'KASBON', accountId: string | undefined): boolean {
  if (kind === 'KASBON') return true
  return accountCode(accountId) === WORKER_EXPENSE_ACCOUNT_CODE
}
function extraInfoText(line: { workerId?: string | null, vehicleId?: string | null }): string {
  if (line.workerId) return `Pekerja: ${workerMap.value.get(line.workerId)?.name ?? '-'}`
  if (line.vehicleId) return `Kendaraan: ${vehicleMap.value.get(line.vehicleId)?.name ?? '-'}`
  return '-'
}

const cashAccountOptions = computed<SelectOption[]>(() =>
  cashAccounts.value.map(a => ({ label: `${a.code} - ${a.name}`, value: a.id })))
const expenseAccountOptions = computed<SelectOption[]>(() =>
  expenseAccounts.value.map(a => ({ label: `${a.code} - ${a.name}`, value: a.id })))
const vehicleOptions = computed<SelectOption[]>(() =>
  vehicles.value.map(v => ({ label: `${v.code} - ${v.name}`, value: v.id })))
const workerOptions = computed<SelectOption[]>(() =>
  workers.value.map(w => ({ label: `${w.code} - ${w.name}`, value: w.id })))

// ---- Bagian A: daftar (PANDUAN_UI.md §5) -----------------------------------
const table = ref()
const selectedRow = ref<ExpenseDocumentRow | null>(null)
const saveNotice = ref('')

const columns: Column<ExpenseDocumentRow>[] = [
  { key: 'documentNumber', label: 'No. Bukti', mono: true },
  { key: 'expenseDate', label: 'Tgl. Bukti', format: v => ddmmyyyy(v as string) },
  { key: 'cashAccountId', label: 'Akun Kas', format: v => cashAccountName(v as string) },
  { key: 'totalAmount', label: 'Jumlah', align: 'right', format: v => rupiah(v as number, { bare: true }) },
  { key: 'reviewStatus', label: 'Pengecekan', align: 'center', slot: 'statusBadge' },
  { key: 'createdAt', label: 'Waktu', format: v => ddmmyyyyHm(v as string) }
]

function onRowClick(row: ExpenseDocumentRow) {
  selectedRow.value = row
  openDetail(row)
}
function openDetailSelected() {
  if (selectedRow.value) openDetail(selectedRow.value)
}

// ---- Detail (slideover) -----------------------------------------------------
const detailOpen = ref(false)
const detail = ref<ExpenseDocumentDetail | null>(null)
const detailStatus = ref<'pending' | 'success' | 'error'>('pending')
const detailError = ref('')

async function openDetail(row: ExpenseDocumentRow) {
  detailOpen.value = true
  detail.value = null
  detailStatus.value = 'pending'
  try {
    detail.value = await api.get<ExpenseDocumentDetail>(`/operational-expenses/${row.id}`)
    detailStatus.value = 'success'
  } catch (err) {
    detailStatus.value = 'error'
    detailError.value = getErrorMessage(err, 'Gagal memuat detail Bukti Kas Keluar.')
  }
}

const lineColumns: Column<ExpenseLine>[] = [
  { key: 'expenseAccountId', label: 'Akun Biaya', format: v => accountName(v as string) },
  { key: 'amount', label: 'Jumlah', align: 'right', format: v => rupiah(Number(v), { bare: true }) },
  { key: 'description', label: 'Keterangan', format: v => (v as string) || '-' },
  { key: 'referenceNumber', label: 'No. Referensi', format: v => (v as string) || '-' },
  { key: 'workerId', label: 'Kendaraan/Pekerja', format: (_v, row) => extraInfoText(row) },
  { key: 'postingStatus', label: 'Status', align: 'center', slot: 'postingStatus' }
]

// ---- VOID per baris -- OPERATOR wajib step-up VOID_DOCUMENT (§2.13, sejak
// need_fixing.md #14). Satu gerbang saja (tidak ikut kunci cetak), header
// x-void-authorization-request-id, pola sama Pindah Buku Kas ---------------
const voidOpen = ref(false)
const voidLineId = ref<string | null>(null)
const voidReasonCode = ref('')
const voidReasonNote = ref('')
const voidSubmitting = ref(false)
const voidError = ref('')

function openVoidModal(line: ExpenseLine) {
  voidLineId.value = line.id
  voidReasonCode.value = ''
  voidReasonNote.value = ''
  voidError.value = ''
  voidOpen.value = true
}

async function submitVoid() {
  if (!voidLineId.value) return
  if (!voidReasonCode.value.trim() || !voidReasonNote.value.trim()) {
    voidError.value = 'Kode alasan dan catatan alasan wajib diisi.'
    return
  }
  voidError.value = ''
  voidSubmitting.value = true
  try {
    const lineId = voidLineId.value
    await withStepUp(headers =>
      api.post(`/operational-expenses/lines/${lineId}/void`, {
        reasonCode: voidReasonCode.value,
        reasonNote: voidReasonNote.value
      }, headers ? { 'x-void-authorization-request-id': headers['x-authorization-request-id'] as string } : undefined)
    )
    voidOpen.value = false
    if (detail.value) await openDetail(detail.value)
    table.value?.reload()
  } catch (err) {
    if (err instanceof StepUpCancelledError) {
      voidError.value = 'Persetujuan dibatalkan — baris belum dibatalkan.'
      return
    }
    voidError.value = getErrorMessage(err, 'Gagal membatalkan baris biaya operasional.')
  } finally {
    voidSubmitting.value = false
  }
}

// ---- Ubah baris TERSIMPAN, sebelum review disetujui (Hari 32A FE) ---------
// PATCH /operational-expenses/lines/:lineId -- BEDA dari komposer batch di
// bawah (yang menyusun baris BARU di memori sebelum satu kali POST /batch).
// Ini menulis LANGSUNG ke baris yang sudah ada di server, satu panggilan per
// Simpan, pola sama modal VOID di atas.
const editLineOpen = ref(false)
const editLineDirty = ref(false)
const editLineId = ref<string | null>(null)
const editLineSubmitting = ref(false)
const editLineError = ref('')
const editLineKind = ref<'BIAYA' | 'KASBON'>('BIAYA')
const editLineDraft = ref<{
  expenseAccountId: string | undefined
  amount: number | undefined
  description: string
  referenceNumber: string
  workerId: string | undefined
  vehicleId: string | undefined
}>({ expenseAccountId: undefined, amount: undefined, description: '', referenceNumber: '', workerId: undefined, vehicleId: undefined })

function canEditLine(): boolean {
  return detail.value?.reviewStatus !== 'DISETUJUI'
}
function openEditLine(line: ExpenseLine) {
  editLineId.value = line.id
  editLineKind.value = line.expenseAccountId === kasbonAccount.value?.id ? 'KASBON' : 'BIAYA'
  editLineDraft.value = {
    expenseAccountId: line.expenseAccountId,
    amount: Number(line.amount),
    description: line.description ?? '',
    referenceNumber: line.referenceNumber ?? '',
    workerId: line.workerId ?? undefined,
    vehicleId: line.vehicleId ?? undefined
  }
  editLineError.value = ''
  editLineDirty.value = false
  editLineOpen.value = true
}
function markEditLineDirty() {
  editLineDirty.value = true
}
function setEditLineKind(kind: 'BIAYA' | 'KASBON') {
  editLineKind.value = kind
  if (kind === 'KASBON') {
    editLineDraft.value.expenseAccountId = kasbonAccount.value?.id
    editLineDraft.value.vehicleId = undefined
  } else {
    editLineDraft.value.expenseAccountId = undefined
    editLineDraft.value.workerId = undefined
  }
  markEditLineDirty()
}
function validateLineDraft(kind: 'BIAYA' | 'KASBON', d: { expenseAccountId?: string, amount?: number, workerId?: string }): string | null {
  if (!d.expenseAccountId) return 'Pilih akun biaya.'
  if (!d.amount || d.amount <= 0) return 'Nominal wajib lebih dari 0.'
  if (kind === 'KASBON' && !d.workerId) return 'Pilih pekerja untuk Kasbon (wajib, beda dari baris biaya biasa).'
  return null
}
async function submitEditLine() {
  const err = validateLineDraft(editLineKind.value, editLineDraft.value)
  if (err) {
    editLineError.value = err
    return
  }
  editLineError.value = ''
  editLineSubmitting.value = true
  try {
    await api.patch(`/operational-expenses/lines/${editLineId.value}`, {
      expenseAccountId: editLineDraft.value.expenseAccountId,
      amount: editLineDraft.value.amount,
      description: editLineDraft.value.description.trim() || undefined,
      referenceNumber: editLineDraft.value.referenceNumber.trim() || undefined,
      workerId: editLineDraft.value.workerId || undefined,
      vehicleId: editLineDraft.value.vehicleId || undefined
    })
    editLineOpen.value = false
    if (detail.value) await openDetail(detail.value)
    table.value?.reload()
  } catch (err2) {
    editLineError.value = getErrorMessage(err2, 'Gagal mengubah baris biaya operasional.')
  } finally {
    editLineSubmitting.value = false
  }
}

// ---- Bagian B: entri REPEATER BARIS (paket R10) ----------------------------
// Header (tanggal + akun kas) GLOBAL untuk seluruh baris -- disusun di
// memori dulu (`lines`), satu kali POST /operational-expenses/batch saat
// Simpan (pola sama Faktur Pembelian: `lines` cuma di client sampai submit).
interface LineDraft {
  expenseAccountId: string | undefined
  amount: number | undefined
  description: string
  referenceNumber: string
  workerId: string | undefined
  vehicleId: string | undefined
  kind: 'BIAYA' | 'KASBON'
}
function blankLineDraft(): LineDraft {
  return { expenseAccountId: undefined, amount: undefined, description: '', referenceNumber: '', workerId: undefined, vehicleId: undefined, kind: 'BIAYA' }
}

const entriOpen = ref(false)
const entriDirty = ref(false)
const expenseDate = ref(new Date().toISOString().slice(0, 10))
const cashAccountId = ref<string | undefined>(undefined)
const lines = ref<LineDraft[]>([])

const draftKey = 'md-draft:operational-expense-batch:create'
const draftData = computed(() => ({ expenseDate: expenseDate.value, cashAccountId: cashAccountId.value, lines: lines.value }))
const documentModalRef = ref<{ clearDraft: () => void, forceClose: () => void } | null>(null)

function resetEntriForm() {
  expenseDate.value = new Date().toISOString().slice(0, 10)
  cashAccountId.value = cashAccounts.value.find(a => a.code === KAS_KECIL_CODE)?.id
  lines.value = []
  entriDirty.value = false
}
function openEntri() {
  resetEntriForm()
  bannerError.value = ''
  cancelledNotice.value = false
  entriOpen.value = true
}
function restoreDraft(d: unknown) {
  const draft = d as typeof draftData.value
  expenseDate.value = draft.expenseDate
  cashAccountId.value = draft.cashAccountId
  lines.value = draft.lines
}
function markDirty() {
  entriDirty.value = true
}

const selectedLine = ref<(LineDraft & Record<string, unknown>) | null>(null)
function onLineRowClick(row: Record<string, unknown>) {
  selectedLine.value = row as LineDraft & Record<string, unknown>
}

const lineOpen = ref(false)
const lineEditIndex = ref<number | null>(null)
const lineDraft = ref<LineDraft>(blankLineDraft())
const lineDirty = ref(false)

function openLineEntri() {
  lineDraft.value = blankLineDraft()
  lineEditIndex.value = null
  lineDirty.value = false
  lineOpen.value = true
}
function openLineEditSelected() {
  if (!selectedLine.value) return
  const index = lines.value.indexOf(selectedLine.value as LineDraft)
  if (index === -1) return
  lineDraft.value = { ...(lines.value[index] as LineDraft) }
  lineEditIndex.value = index
  lineDirty.value = false
  lineOpen.value = true
}
function removeSelectedLine() {
  if (!selectedLine.value) return
  const index = lines.value.indexOf(selectedLine.value as LineDraft)
  if (index === -1) return
  lines.value.splice(index, 1)
  selectedLine.value = null
  markDirty()
}
function setLineKind(kind: 'BIAYA' | 'KASBON') {
  lineDraft.value.kind = kind
  if (kind === 'KASBON') {
    lineDraft.value.expenseAccountId = kasbonAccount.value?.id
    lineDraft.value.vehicleId = undefined
  } else {
    lineDraft.value.expenseAccountId = undefined
    lineDraft.value.workerId = undefined
  }
  lineDirty.value = true
}
const lineFormError = ref('')
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
  const err = validateLineDraft(lineDraft.value.kind, lineDraft.value)
  if (err) {
    lineFormError.value = err
    return
  }
  lineFormError.value = ''
  if (lineEditIndex.value === null) lines.value.push({ ...lineDraft.value })
  else lines.value[lineEditIndex.value] = { ...lineDraft.value }
  markDirty()
  lineOpen.value = false
}

const draftLineColumns: Column<LineDraft & Record<string, unknown>>[] = [
  { key: 'expenseAccountId', label: 'Akun Biaya', format: v => accountName(v as string) },
  { key: 'amount', label: 'Nominal', align: 'right', format: v => rupiah(v as number, { bare: true }) },
  { key: 'description', label: 'Keterangan', format: v => (v as string) || '-' },
  { key: 'referenceNumber', label: 'No. Referensi', format: v => (v as string) || '-' },
  { key: 'workerId', label: 'Kendaraan/Pekerja', format: (_v, row) => extraInfoText(row) }
]

// ---- Validasi & submit batch ------------------------------------------------
function validateBatch(): string | null {
  if (!cashAccountId.value) return 'Pilih akun kas sumber.'
  if (!expenseDate.value) return 'Tanggal wajib diisi.'
  if (lines.value.length === 0) return 'Isi minimal satu baris biaya.'
  return null
}
function buildBatchPayload(): Record<string, unknown> {
  return {
    expenseDate: expenseDate.value || undefined,
    cashAccountId: cashAccountId.value,
    lines: lines.value.map(l => ({
      expenseAccountId: l.expenseAccountId,
      amount: l.amount,
      description: l.description.trim() || undefined,
      referenceNumber: l.referenceNumber.trim() || undefined,
      workerId: l.workerId || undefined,
      vehicleId: l.vehicleId || undefined
    }))
  }
}

const submitting = ref(false)
const bannerError = ref('')
const cancelledNotice = ref(false)

interface BatchResult { document: ExpenseDocumentRow, lines: ExpenseLine[] }

async function submit() {
  const err = validateBatch()
  if (err) {
    bannerError.value = err
    return
  }
  bannerError.value = ''
  cancelledNotice.value = false
  submitting.value = true
  try {
    const created = await withStepUp(headers =>
      api.post<BatchResult>('/operational-expenses/batch', buildBatchPayload(), headers))
    documentModalRef.value?.clearDraft()
    entriOpen.value = false
    saveNotice.value = `${created.document.documentNumber} tersimpan — ${created.lines.length} baris, total ${rupiah(created.lines.reduce((s, l) => s + Number(l.amount), 0))}.`
    table.value?.reload()
  } catch (err2) {
    if (err2 instanceof StepUpCancelledError) {
      cancelledNotice.value = true
      return
    }
    // Pesan backend menyebut "Baris ke-N: ..." kalau kegagalan berasal dari
    // baris tertentu (paket R10) -- diteruskan apa adanya, jangan ditulis
    // ulang, supaya operator tahu baris mana yang harus diperbaiki.
    bannerError.value = getErrorMessage(err2, 'Gagal menyimpan biaya operasional.')
  } finally {
    submitting.value = false
  }
}

const totalNominal = computed(() => lines.value.reduce((s, l) => s + (l.amount ?? 0), 0))

onMounted(loadOptions)
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader />

    <UAlert
      v-if="saveNotice"
      color="success"
      variant="subtle"
      icon="i-lucide-check-circle-2"
      :title="saveNotice"
      :close="{ icon: 'i-lucide-x', color: 'neutral', variant: 'link' }"
      @update:open="saveNotice = ''"
    />

    <DataTable
      ref="table"
      endpoint="/operational-expenses"
      :columns="columns"
      :on-row-click="onRowClick"
      selectable
      dense
      zebra
      search-placeholder="Cari nomor bukti..."
      :default-sort="{ key: 'expenseDate', dir: 'desc' }"
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
      <template #statusBadge="{ value }">
        <UBadge
          :color="REVIEW_COLOR[value as ReviewStatus]"
          variant="subtle"
        >
          {{ REVIEW_LABEL[value as ReviewStatus] }}
        </UBadge>
      </template>
    </DataTable>

    <!-- Detail (slideover) -->
    <USlideover
      v-model:open="detailOpen"
      title="Detail Bukti Kas Keluar"
      :description="detail?.documentNumber"
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
              <span class="font-mono font-medium">{{ detail.documentNumber }}</span>
              <UBadge
                color="neutral"
                variant="subtle"
              >
                {{ cashAccountName(detail.cashAccountId) }}
              </UBadge>
              <UBadge
                :color="REVIEW_COLOR[detail.reviewStatus]"
                variant="subtle"
              >
                {{ REVIEW_LABEL[detail.reviewStatus] }}
              </UBadge>
            </div>
            <div class="text-sm text-muted">
              {{ ddmmyyyy(detail.expenseDate) }} · Total {{ rupiah(detail.totalAmount) }}
            </div>
            <div
              v-if="detail.reviewStatus === 'BERMASALAH'"
              class="text-sm text-error"
            >
              Catatan supervisor: {{ detail.reviewNote || '-' }}
            </div>
            <UAlert
              v-if="detail.reviewStatus === 'DISETUJUI'"
              color="neutral"
              variant="subtle"
              icon="i-lucide-lock"
              title="Bukti sudah disetujui supervisor"
              description="Koreksi baris wajib lewat VOID + baris baru, tombol Ubah tidak tersedia lagi."
            />
          </div>

          <DataTable
            :rows="detail.lines"
            :columns="lineColumns as Column<Record<string, unknown>>[]"
            :row-actions="[
              {
                label: 'Ubah',
                icon: 'i-lucide-pencil',
                color: 'neutral',
                show: (row: Record<string, unknown>) => row.postingStatus === 'POSTED' && canEditLine(),
                onClick: (row: Record<string, unknown>) => openEditLine(row as ExpenseLine)
              },
              {
                label: 'VOID',
                icon: 'i-lucide-ban',
                color: 'error',
                show: (row: Record<string, unknown>) => row.postingStatus === 'POSTED',
                onClick: (row: Record<string, unknown>) => openVoidModal(row as ExpenseLine)
              }
            ]"
            dense
            zebra
            :searchable="false"
          >
            <template #postingStatus="{ value }">
              <UBadge
                :color="value === 'VOIDED' ? 'error' : 'success'"
                variant="subtle"
              >
                {{ value === 'VOIDED' ? 'Dibatalkan' : 'Terposting' }}
              </UBadge>
            </template>
          </DataTable>
        </div>
      </template>
    </USlideover>

    <!-- Bagian B: entri, DocumentModal (header global) + LineModal (per baris) -->
    <DocumentModal
      ref="documentModalRef"
      :open="entriOpen"
      title="Biaya Operasional"
      mode="entri"
      :operator="operatorName"
      :dirty="entriDirty"
      :saving="submitting"
      :draft-key="draftKey"
      :draft-data="draftData"
      @update:open="(v: boolean) => (entriOpen = v)"
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
          description="Persetujuan dibatalkan sebelum selesai — belum tersimpan."
        />

        <div class="grid grid-cols-2 gap-y-1.5 gap-x-4">
          <UFormField label="Tanggal">
            <UInput
              v-model="expenseDate"
              type="date"
              class="w-full"
              @update:model-value="markDirty"
            />
          </UFormField>
          <UFormField
            label="Akun Kas Sumber"
            required
            hint="Selalu Kas Kecil (CLAUDE.md §3) — tetap ditampilkan, bisa diganti kalau perlu."
          >
            <USelect
              v-model="cashAccountId"
              :items="cashAccountOptions"
              :loading="loadingOptions"
              placeholder="Pilih akun kas..."
              class="w-full"
              @update:model-value="markDirty"
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
            :columns="draftLineColumns as Column<Record<string, unknown>>[]"
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
            { label: 'Total', value: rupiah(totalNominal, { bare: true }), emphasize: true }
          ]"
        />
      </template>
    </DocumentModal>

    <!-- Baris (komposer batch) -->
    <LineModal
      :open="lineOpen"
      title="Baris Biaya Operasional"
      :mode="lineEditIndex === null ? 'entri' : 'ubah'"
      :dirty="lineDirty"
      width="720px"
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
        />
        <!-- Tab Kasbon (Hari 32A FE): dropdown akun otomatis terbatas ke
             Piutang Karyawan saat tab ini aktif, Pekerja jadi wajib. Pola
             toggle tombol manual (bukan <UTabs>, komponen itu tidak dipakai
             di manapun di codebase ini -- konsisten dengan toggle activeTab
             di pengecekan-invoice/index.vue). -->
        <div class="flex items-center gap-1 border-b border-default pb-2">
          <UButton
            size="xs"
            :color="lineDraft.kind === 'BIAYA' ? 'primary' : 'neutral'"
            :variant="lineDraft.kind === 'BIAYA' ? 'solid' : 'ghost'"
            @click="setLineKind('BIAYA')"
          >
            Biaya
          </UButton>
          <UButton
            size="xs"
            :color="lineDraft.kind === 'KASBON' ? 'primary' : 'neutral'"
            :variant="lineDraft.kind === 'KASBON' ? 'solid' : 'ghost'"
            @click="setLineKind('KASBON')"
          >
            Kasbon
          </UButton>
        </div>

        <UFormField
          v-if="lineDraft.kind === 'BIAYA'"
          label="Akun Biaya"
          required
        >
          <USelect
            v-model="lineDraft.expenseAccountId"
            :items="expenseAccountOptions"
            :loading="loadingOptions"
            placeholder="Pilih akun biaya..."
            class="w-full"
            @update:model-value="lineDirty = true"
          />
        </UFormField>
        <UFormField
          v-else
          label="Akun Biaya"
        >
          <div class="px-3 py-1.5 rounded-md border border-default bg-elevated/50">
            {{ kasbonAccount ? `${kasbonAccount.code} - ${kasbonAccount.name}` : 'Memuat...' }}
          </div>
        </UFormField>

        <UFormField
          v-if="showsVehicleField(lineDraft.expenseAccountId)"
          label="Kendaraan"
        >
          <USelect
            v-model="lineDraft.vehicleId"
            :items="vehicleOptions"
            placeholder="Pilih kendaraan..."
            class="w-full"
            @update:model-value="lineDirty = true"
          />
        </UFormField>
        <UFormField
          v-if="showsWorkerField(lineDraft.kind, lineDraft.expenseAccountId)"
          label="Pekerja"
          :required="lineDraft.kind === 'KASBON'"
        >
          <USelect
            v-model="lineDraft.workerId"
            :items="workerOptions"
            placeholder="Pilih pekerja..."
            class="w-full"
            @update:model-value="lineDirty = true"
          />
        </UFormField>

        <UFormField
          label="Nominal"
          required
        >
          <MoneyInput
            v-model="lineDraft.amount"
            placeholder="0"
            :min="0"
            class="w-full"
            @update:model-value="lineDirty = true"
          />
        </UFormField>

        <UFormField label="Keterangan">
          <UTextarea
            v-model="lineDraft.description"
            placeholder="mis. nama tukang angkut, catatan ongkir, dsb."
            class="w-full"
            @update:model-value="lineDirty = true"
          />
        </UFormField>

        <UFormField label="No. Referensi / Kwitansi">
          <UInput
            v-model="lineDraft.referenceNumber"
            placeholder="opsional"
            class="w-full"
            @update:model-value="lineDirty = true"
          />
        </UFormField>
      </template>

      <template #context>
        <InfoStrip text="Backdate maksimum 7 hari khusus modul ini (beda dari modul lain yang 2 hari)." />
        <InfoStrip text="Sebagian akun kas memerlukan persetujuan Supervisor/Master untuk nominal tertentu — kalau perlu, konfirmasi akan muncul otomatis setelah Simpan seluruh bukti." />
      </template>
    </LineModal>

    <!-- Ubah baris TERSIMPAN (sebelum review disetujui) -->
    <LineModal
      :open="editLineOpen"
      title="Ubah Baris Biaya Operasional"
      mode="ubah"
      :dirty="editLineDirty"
      :saving="editLineSubmitting"
      width="720px"
      @update:open="(v: boolean) => (editLineOpen = v)"
      @save="submitEditLine"
    >
      <template #form>
        <UAlert
          v-if="editLineError"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          :title="editLineError"
        />
        <div class="flex items-center gap-1 border-b border-default pb-2">
          <UButton
            size="xs"
            :color="editLineKind === 'BIAYA' ? 'primary' : 'neutral'"
            :variant="editLineKind === 'BIAYA' ? 'solid' : 'ghost'"
            @click="setEditLineKind('BIAYA')"
          >
            Biaya
          </UButton>
          <UButton
            size="xs"
            :color="editLineKind === 'KASBON' ? 'primary' : 'neutral'"
            :variant="editLineKind === 'KASBON' ? 'solid' : 'ghost'"
            @click="setEditLineKind('KASBON')"
          >
            Kasbon
          </UButton>
        </div>

        <UFormField
          v-if="editLineKind === 'BIAYA'"
          label="Akun Biaya"
          required
        >
          <USelect
            v-model="editLineDraft.expenseAccountId"
            :items="expenseAccountOptions"
            placeholder="Pilih akun biaya..."
            class="w-full"
            @update:model-value="markEditLineDirty"
          />
        </UFormField>
        <UFormField
          v-else
          label="Akun Biaya"
        >
          <div class="px-3 py-1.5 rounded-md border border-default bg-elevated/50">
            {{ kasbonAccount ? `${kasbonAccount.code} - ${kasbonAccount.name}` : 'Memuat...' }}
          </div>
        </UFormField>

        <UFormField
          v-if="showsVehicleField(editLineDraft.expenseAccountId)"
          label="Kendaraan"
        >
          <USelect
            v-model="editLineDraft.vehicleId"
            :items="vehicleOptions"
            placeholder="Pilih kendaraan..."
            class="w-full"
            @update:model-value="markEditLineDirty"
          />
        </UFormField>
        <UFormField
          v-if="showsWorkerField(editLineKind, editLineDraft.expenseAccountId)"
          label="Pekerja"
          :required="editLineKind === 'KASBON'"
        >
          <USelect
            v-model="editLineDraft.workerId"
            :items="workerOptions"
            placeholder="Pilih pekerja..."
            class="w-full"
            @update:model-value="markEditLineDirty"
          />
        </UFormField>

        <UFormField
          label="Nominal"
          required
        >
          <MoneyInput
            v-model="editLineDraft.amount"
            placeholder="0"
            :min="0"
            class="w-full"
            @update:model-value="markEditLineDirty"
          />
        </UFormField>

        <UFormField label="Keterangan">
          <UTextarea
            v-model="editLineDraft.description"
            class="w-full"
            @update:model-value="markEditLineDirty"
          />
        </UFormField>

        <UFormField label="No. Referensi / Kwitansi">
          <UInput
            v-model="editLineDraft.referenceNumber"
            placeholder="opsional"
            class="w-full"
            @update:model-value="markEditLineDirty"
          />
        </UFormField>
      </template>

      <template #context>
        <InfoStrip text="Koreksi ini membalik jurnal lama (bertanggal hari ini) lalu memposting ulang bertanggal tanggal bukti — bukan VOID." />
      </template>
    </LineModal>

    <!-- VOID baris -->
    <UModal
      v-model:open="voidOpen"
      title="VOID Baris Biaya Operasional"
      description="Baris tidak dihapus — dibatalkan dengan jurnal pembalik bertanggal hari ini."
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <UAlert
            v-if="voidError"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-triangle"
            :description="voidError"
          />
          <UFormField
            label="Kode Alasan"
            required
          >
            <UInput
              v-model="voidReasonCode"
              class="w-full"
              placeholder="mis. SALAH_INPUT"
            />
          </UFormField>
          <UFormField
            label="Catatan Alasan"
            required
          >
            <UTextarea
              v-model="voidReasonNote"
              class="w-full"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            color="neutral"
            variant="ghost"
            @click="voidOpen = false"
          >
            Batal
          </UButton>
          <UButton
            color="error"
            :loading="voidSubmitting"
            :disabled="voidSubmitting"
            @click="submitVoid"
          >
            VOID Baris
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
