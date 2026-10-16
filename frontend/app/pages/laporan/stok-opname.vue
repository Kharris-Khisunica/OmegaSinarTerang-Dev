<script setup lang="ts">
import type { Column } from '~/types/data-table'

// Stok Opname -- worksheet (Hari 29) + DOKUMEN TERSIMPAN (need_fixing.md #25,
// opsi 2b, 6 Okt 2026 -- belum dikonfirmasi ulang ke klien). BE GET
// /reports/stock-opname mengembalikan qty sistem gudang STORE + rincian
// titipan per pelanggan (penjelas selisih fisik, CLAUDE.md §3 "Gudang").
//
// Alur: isi kolom Fisik -> "Simpan Hitungan" = dokumen OP berstatus DRAFT
// (snapshot stok sistem diambil backend saat disimpan) -> MASTER memeriksa
// lalu "Posting" = PERSETUJUAN koreksi: selisih jadi movement stok + jurnal
// Persediaan <-> Selisih Persediaan. DRAFT bisa dimuat ulang ke worksheet
// untuk dikoreksi; dokumen bisa di-VOID (MASTER).
//
// roles: R11/L1 (20 Sep 2026) -- MASTER+SUPERVISOR saja, supaya operator
// tidak melihat angka sistem sebelum stok fisik dicek.
definePageMeta({ title: 'Stok Opname', roles: ['MASTER', 'SUPERVISOR'] })

interface TitipanDetailItem {
  customerName: string
  qtyText: string
}
interface OpnameApiRow extends Record<string, unknown> {
  productId: string
  code: string
  displayName: string
  baseUnit: string
  systemQtyBase: number
  systemQtyText: string
  titipanQtyBase: number
  titipanQtyText: string
  titipanDetail: TitipanDetailItem[]
}
interface OpnameRow extends OpnameApiRow {
  fisik: number | null
}
interface OpnameResponse {
  rows: OpnameApiRow[]
}
type OpnameStatus = 'DRAFT' | 'POSTED' | 'VOIDED'
interface OpnameDocLine {
  id: string
  productId: string
  systemQtyBase: string
  physicalQtyBase: string
  diffQtyBase: string
  unitCost: string | null
  diffValue: string | null
}
interface OpnameDoc extends Record<string, unknown> {
  id: string
  documentNumber: string
  countDate: string
  status: OpnameStatus
  notes: string | null
  shortageValue: string
  surplusValue: string
  voidReasonCode: string | null
  voidReasonNote: string | null
  lines?: OpnameDocLine[]
}

const api = useApi()
const toast = useToast()
const { user } = useAuth()
const { format: formatQty, parse: parseQty } = useQty()
const { format: rupiah } = useRupiah()
const isMaster = computed(() => user.value?.role === 'MASTER')

const STATUS_LABEL: Record<OpnameStatus, string> = { DRAFT: 'Draft', POSTED: 'Terposting', VOIDED: 'Dibatalkan' }
const STATUS_COLOR: Record<OpnameStatus, 'warning' | 'success' | 'error'> = { DRAFT: 'warning', POSTED: 'success', VOIDED: 'error' }

// ---- Worksheet ---------------------------------------------------------------
const rows = ref<OpnameRow[]>([])
const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function load() {
  status.value = 'pending'
  errorMessage.value = ''
  try {
    const res = await api.get<OpnameResponse>('/reports/stock-opname')
    rows.value = res.rows.map(r => ({ ...r, fisik: null }))
    status.value = 'success'
  } catch (err) {
    rows.value = []
    status.value = 'error'
    errorMessage.value = getErrorMessage(err, 'Gagal memuat worksheet.')
  }
}
onMounted(load)

const rowByProduct = computed(() => new Map(rows.value.map(r => [r.productId, r])))
function productText(productId: string): string {
  const r = rowByProduct.value.get(productId)
  return r ? `${r.displayName} (${r.code})` : productId
}
function baseUnitOf(productId: string): string {
  return rowByProduct.value.get(productId)?.baseUnit ?? ''
}

function selisihBase(row: OpnameRow): number | null {
  if (row.fisik === null) return null
  return row.fisik - row.systemQtyBase
}
function signedQty(value: number, unit: string): string {
  const text = `${formatQty(Math.abs(value))} ${unit}`
  if (value > 0) return `+${text}`
  if (value < 0) return `-${text}`
  return text
}
function selisihText(row: OpnameRow): string {
  const s = selisihBase(row)
  return s === null ? '-' : signedQty(s, row.baseUnit)
}
function selisihClass(row: OpnameRow): string {
  const s = selisihBase(row)
  if (s === null || s === 0) return ''
  return s > 0 ? 'text-success font-semibold' : 'text-error font-semibold'
}

const columns: Column<OpnameRow>[] = [
  { key: 'code', label: 'Kode', mono: true },
  { key: 'displayName', label: 'Nama Barang' },
  { key: 'systemQtyText', label: 'Stok Sistem (Toko)', align: 'right' },
  { key: 'titipanQtyText', label: 'Titipan (penjelas)', align: 'right', slot: 'titipan' },
  { key: 'fisik', label: 'Fisik', align: 'right', slot: 'fisik' },
  { key: 'selisih', label: 'Selisih', align: 'right', slot: 'selisih' }
]

// ---- Simpan hitungan (DRAFT) -------------------------------------------------
// editingDraftId terisi = worksheet sedang memuat DRAFT lama -> Simpan = PATCH.
const editingDraft = ref<{ id: string, documentNumber: string } | null>(null)
const countDate = ref(new Date().toISOString().slice(0, 10))
const saveNotes = ref('')
const saving = ref(false)
const saveError = ref('')
const countedRows = computed(() => rows.value.filter(r => r.fisik !== null))

async function saveCount() {
  saveError.value = ''
  if (countedRows.value.length === 0) {
    saveError.value = 'Isi kolom Fisik minimal satu barang sebelum menyimpan.'
    return
  }
  saving.value = true
  const body = {
    countDate: countDate.value,
    notes: saveNotes.value || undefined,
    lines: countedRows.value.map(r => ({ productId: r.productId, physicalQtyBase: r.fisik as number }))
  }
  try {
    const doc = editingDraft.value
      ? await api.patch<OpnameDoc>(`/stock-opnames/${editingDraft.value.id}`, body)
      : await api.post<OpnameDoc>('/stock-opnames', body)
    toast.add({ title: `${doc.documentNumber} tersimpan sebagai Draft`, description: 'Stok belum dikoreksi — MASTER memposting setelah memeriksa.', color: 'success' })
    editingDraft.value = null
    saveNotes.value = ''
    await load()
    history.value?.reload()
  } catch (err) {
    saveError.value = getErrorMessage(err, 'Gagal menyimpan hitungan stok opname.')
  } finally {
    saving.value = false
  }
}

function cancelEditingDraft() {
  editingDraft.value = null
  for (const r of rows.value) r.fisik = null
}

// ---- Riwayat dokumen ---------------------------------------------------------
const history = ref()
const historyColumns: Column<OpnameDoc>[] = [
  { key: 'documentNumber', label: 'No. Dokumen', mono: true },
  { key: 'countDate', label: 'Tgl Hitung', format: v => formatDate(v as string) },
  { key: 'status', label: 'Status', align: 'center', slot: 'statusBadge' },
  { key: 'shortageValue', label: 'Nilai Kurang', align: 'right', format: v => rupiah(Number(v), { bare: true }) },
  { key: 'surplusValue', label: 'Nilai Lebih', align: 'right', format: v => rupiah(Number(v), { bare: true }) }
]

const detailOpen = ref(false)
const detail = ref<OpnameDoc | null>(null)
const detailError = ref('')
const acting = ref(false)

async function openDetail(row: OpnameDoc) {
  detailOpen.value = true
  detail.value = null
  detailError.value = ''
  try {
    detail.value = await api.get<OpnameDoc>(`/stock-opnames/${row.id}`)
  } catch (err) {
    detailError.value = getErrorMessage(err, 'Gagal memuat dokumen stok opname.')
  }
}

function loadDraftToWorksheet() {
  const doc = detail.value
  if (!doc || doc.status !== 'DRAFT') return
  for (const r of rows.value) r.fisik = null
  for (const line of doc.lines ?? []) {
    const row = rowByProduct.value.get(line.productId)
    if (row) row.fisik = Number(line.physicalQtyBase)
  }
  countDate.value = doc.countDate.slice(0, 10)
  saveNotes.value = doc.notes ?? ''
  editingDraft.value = { id: doc.id, documentNumber: doc.documentNumber }
  detailOpen.value = false
}

async function postDraft() {
  const doc = detail.value
  if (!doc) return
  if (!window.confirm(`Posting ${doc.documentNumber}? Stok dikoreksi sesuai selisih & jurnal Selisih Persediaan dibuat.`)) return
  acting.value = true
  detailError.value = ''
  try {
    detail.value = await api.post<OpnameDoc>(`/stock-opnames/${doc.id}/post`)
    toast.add({ title: `${doc.documentNumber} terposting`, color: 'success' })
    history.value?.reload()
    await load()
  } catch (err) {
    detailError.value = getErrorMessage(err, 'Gagal memposting stok opname.')
  } finally {
    acting.value = false
  }
}

const voidOpen = ref(false)
const voidReasonCode = ref('')
const voidReasonNote = ref('')
const voidError = ref('')
function openVoid() {
  voidReasonCode.value = ''
  voidReasonNote.value = ''
  voidError.value = ''
  voidOpen.value = true
}
async function submitVoid() {
  const doc = detail.value
  if (!doc) return
  if (!voidReasonCode.value.trim() || !voidReasonNote.value.trim()) {
    voidError.value = 'Kode alasan dan catatan alasan wajib diisi.'
    return
  }
  acting.value = true
  try {
    detail.value = await api.post<OpnameDoc>(`/stock-opnames/${doc.id}/void`, {
      reasonCode: voidReasonCode.value,
      reasonNote: voidReasonNote.value
    })
    voidOpen.value = false
    history.value?.reload()
    await load()
  } catch (err) {
    voidError.value = getErrorMessage(err, 'Gagal membatalkan stok opname.')
  } finally {
    acting.value = false
  }
}
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader description="Isi kolom Fisik hasil hitung gudang Toko, lalu Simpan Hitungan (Draft). Stok baru dikoreksi setelah MASTER memposting dokumennya. Kolom Titipan menjelaskan selisih karena barang dititip pelanggan.">
      <ExportButton
        v-if="rows.length > 0"
        endpoint="/reports/stock-opname"
        file-name-prefix="worksheet-stok-opname"
      />
    </PageHeader>

    <UAlert
      v-if="editingDraft"
      color="warning"
      variant="subtle"
      icon="i-lucide-pencil"
      :title="`Mengubah Draft ${editingDraft.documentNumber}`"
      description="Simpan Hitungan akan MENGGANTI isi draft ini (snapshot stok sistem diambil ulang)."
      :actions="[{ label: 'Batal ubah', color: 'neutral', variant: 'subtle', onClick: cancelEditingDraft }]"
    />

    <div class="flex items-end gap-2 flex-wrap">
      <UFormField label="Tanggal Hitung">
        <UInput
          v-model="countDate"
          type="date"
        />
      </UFormField>
      <UFormField
        label="Catatan"
        class="min-w-64 flex-1"
      >
        <UInput
          v-model="saveNotes"
          placeholder="opsional"
          class="w-full"
        />
      </UFormField>
      <UButton
        icon="i-lucide-save"
        :loading="saving"
        :disabled="saving || countedRows.length === 0"
        @click="saveCount"
      >
        Simpan Hitungan ({{ countedRows.length }} barang)
      </UButton>
    </div>
    <UAlert
      v-if="saveError"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-triangle"
      :title="saveError"
    />

    <div
      v-if="status === 'pending'"
      class="flex flex-col gap-2"
    >
      <USkeleton
        v-for="i in 6"
        :key="i"
        class="h-8 w-full"
      />
    </div>
    <UEmpty
      v-else-if="status === 'error'"
      icon="i-lucide-alert-triangle"
      title="Gagal memuat worksheet"
      :description="errorMessage"
      :actions="[{ label: 'Coba lagi', onClick: load }]"
    />
    <DataTable
      v-else
      :rows="rows"
      :columns="columns"
      dense
      zebra
      search-placeholder="Cari kode atau nama barang..."
      empty-text="< Tidak Ada Data Untuk Ditampilkan >"
    >
      <template #titipan="{ row }">
        <div class="flex flex-col items-end gap-0.5">
          <span>{{ (row as OpnameRow).titipanQtyText }}</span>
          <span
            v-if="(row as OpnameRow).titipanDetail.length > 0"
            class="text-xs text-muted"
          >
            {{ (row as OpnameRow).titipanDetail.map(d => `${d.customerName}: ${d.qtyText}`).join(' · ') }}
          </span>
        </div>
      </template>
      <template #fisik="{ row }">
        <UInput
          :model-value="(row as OpnameRow).fisik === null ? '' : formatQty((row as OpnameRow).fisik)"
          placeholder="0"
          class="w-28"
          @update:model-value="(v: string) => { (row as OpnameRow).fisik = v === '' ? null : parseQty(v) }"
        >
          <template #trailing>
            <span class="text-xs text-muted">{{ (row as OpnameRow).baseUnit }}</span>
          </template>
        </UInput>
      </template>
      <template #selisih="{ row }">
        <span :class="selisihClass(row as OpnameRow)">{{ selisihText(row as OpnameRow) }}</span>
      </template>
    </DataTable>

    <div class="flex flex-col gap-2 pt-2 border-t border-default">
      <h2 class="text-sm font-semibold text-muted uppercase tracking-wide">
        Dokumen Stok Opname
      </h2>
      <DataTable
        ref="history"
        endpoint="/stock-opnames"
        :columns="historyColumns"
        :on-row-click="openDetail"
        dense
        zebra
        search-placeholder="Cari nomor dokumen..."
        :default-sort="{ key: 'countDate', dir: 'desc' }"
      >
        <template #statusBadge="{ value }">
          <UBadge
            :color="STATUS_COLOR[value as OpnameStatus]"
            variant="subtle"
          >
            {{ STATUS_LABEL[value as OpnameStatus] }}
          </UBadge>
        </template>
      </DataTable>
    </div>

    <USlideover
      v-model:open="detailOpen"
      title="Dokumen Stok Opname"
      :description="detail?.documentNumber"
    >
      <template #body>
        <UAlert
          v-if="detailError"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          :title="detailError"
          class="mb-3"
        />
        <div
          v-if="detail"
          class="flex flex-col gap-4"
        >
          <div class="flex items-center gap-2">
            <span class="font-mono font-medium">{{ detail.documentNumber }}</span>
            <UBadge
              :color="STATUS_COLOR[detail.status]"
              variant="subtle"
            >
              {{ STATUS_LABEL[detail.status] }}
            </UBadge>
          </div>
          <div class="text-sm text-muted">
            Tgl hitung {{ formatDate(detail.countDate) }}<span v-if="detail.notes"> · {{ detail.notes }}</span>
          </div>
          <div
            v-if="detail.status === 'VOIDED'"
            class="text-sm text-error"
          >
            Dibatalkan: {{ detail.voidReasonCode }} — {{ detail.voidReasonNote }}
          </div>

          <DataTable
            :rows="(detail.lines ?? []) as unknown as Record<string, unknown>[]"
            :columns="[
              { key: 'productId', label: 'Barang', format: (v: unknown) => productText(v as string) },
              { key: 'systemQtyBase', label: 'Sistem', align: 'right', format: (v: unknown) => formatQty(Number(v)) },
              { key: 'physicalQtyBase', label: 'Fisik', align: 'right', format: (v: unknown) => formatQty(Number(v)) },
              { key: 'diffQtyBase', label: 'Selisih', align: 'right', format: (v: unknown, r: Record<string, unknown>) => signedQty(Number(v), baseUnitOf(r.productId as string)) },
              { key: 'diffValue', label: 'Nilai', align: 'right', format: (v: unknown) => (v == null ? '-' : rupiah(Number(v), { bare: true })) }
            ]"
            dense
            zebra
            :searchable="false"
          />

          <div
            v-if="detail.status === 'POSTED'"
            class="text-sm"
          >
            Nilai kurang {{ rupiah(Number(detail.shortageValue)) }} · Nilai lebih {{ rupiah(Number(detail.surplusValue)) }}
          </div>

          <div class="flex items-center gap-2 border-t border-default pt-3 flex-wrap">
            <UButton
              v-if="detail.status === 'DRAFT'"
              icon="i-lucide-pencil"
              color="neutral"
              variant="subtle"
              @click="loadDraftToWorksheet"
            >
              Muat ke Worksheet
            </UButton>
            <UButton
              v-if="detail.status === 'DRAFT' && isMaster"
              icon="i-lucide-check"
              :loading="acting"
              @click="postDraft"
            >
              Posting (Koreksi Stok)
            </UButton>
            <UButton
              v-if="detail.status !== 'VOIDED' && isMaster"
              icon="i-lucide-ban"
              color="error"
              variant="subtle"
              @click="openVoid"
            >
              VOID
            </UButton>
            <span
              v-if="detail.status === 'DRAFT' && !isMaster"
              class="text-xs text-muted"
            >Posting & VOID hanya oleh MASTER.</span>
          </div>
        </div>
      </template>
    </USlideover>

    <UModal
      v-model:open="voidOpen"
      title="VOID Stok Opname"
      description="Draft cukup dibatalkan; dokumen terposting dibalik (stok & jurnal) bertanggal hari ini."
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
              placeholder="mis. SALAH_HITUNG"
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
            :loading="acting"
            :disabled="acting"
            @click="submitVoid"
          >
            VOID
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
