<script setup lang="ts">
import type { Column } from '~/types/data-table'

// Pindah Buku Kas (paket R9, `docs/RENCANA_REVISI_TESTING_KLIEN.md` §3 "R9",
// menyerap Hari 32A tugas 7; CLAUDE.md §3 "Biaya Operasional" -> "Pindah
// Buku Kas"). Dokumen `PB`, SATU form datar (dari kas -> ke kas -> nominal
// -> keterangan), pola sama kas-bank/biaya-operasional/index.vue: <LineModal>
// dipakai LANGSUNG sebagai modal entri (bukan <DocumentModal>+<LineModal>),
// karena backend (CashTransfersService.create()) sudah satu panggilan =
// satu dokumen, tidak ada baris berulang. TIDAK ikut kunci cetak §2.16 (tidak
// ada print_status/revision_number di cash_transfers) -- tombol Cetak
// SELALU ada (bukan lewat <DocumentActions>, yang kontraknya butuh
// printStatus) dan langsung menuju halaman cetak, tanpa gerbang apa pun.
// Approval-nya SETELAH-FAKTA lewat reviewStatus (tab baru di
// pengecekan-invoice/index.vue, bukan di sini -- Supervisor tidak menulis
// dari halaman operator, CLAUDE.md §5).
definePageMeta({ title: 'Pindah Buku Kas', roles: ['MASTER', 'OPERATOR'] })

interface AccountOption { id: string, code: string, name: string }
type ReviewStatus = 'BELUM_DICEK' | 'DISETUJUI' | 'BERMASALAH'

interface CashTransferRow extends Record<string, unknown> {
  id: string
  documentNumber: string
  transferDate: string
  amount: number
  fromCashAccountId: string
  fromCashAccountName: string
  toCashAccountId: string
  toCashAccountName: string
  note: string | null
  postingStatus: 'POSTED' | 'VOIDED'
  reviewStatus: ReviewStatus
  createdAt: string
}

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

function ddmmyyyy(value: string | null | undefined): string {
  return formatDate(value).split('/').join('-')
}

// ---- Akun kas untuk dropdown dari/ke -- endpoint sempit yang sudah dipakai
// Payment & Biaya Operasional (CLAUDE.md §5 "GET /chart-of-accounts penuh
// MASTER+SUPERVISOR saja", dua endpoint ini yang OPERATOR boleh baca). ------
const cashAccounts = ref<AccountOption[]>([])
const loadingAccounts = ref(true)
async function loadAccounts() {
  loadingAccounts.value = true
  try {
    cashAccounts.value = await api.get<AccountOption[]>('/chart-of-accounts/cash-accounts')
  } finally {
    loadingAccounts.value = false
  }
}
const cashAccountMap = computed(() => new Map(cashAccounts.value.map(a => [a.id, a])))
function cashAccountName(id: string): string {
  return cashAccountMap.value.get(id)?.name ?? '-'
}
const cashAccountOptions = computed(() =>
  cashAccounts.value.map(a => ({ label: `${a.code} - ${a.name}`, value: a.id })))

// ---- Daftar -----------------------------------------------------------
const table = ref()
const selectedRow = ref<CashTransferRow | null>(null)
const saveNotice = ref<{ documentNumber: string, id: string } | null>(null)

const columns: Column<CashTransferRow>[] = [
  { key: 'documentNumber', label: 'No. Bukti', mono: true },
  { key: 'transferDate', label: 'Tanggal', format: v => ddmmyyyy(v as string) },
  { key: 'fromCashAccountId', label: 'Dari', format: v => cashAccountName(v as string) },
  { key: 'toCashAccountId', label: 'Ke', format: v => cashAccountName(v as string) },
  { key: 'amount', label: 'Nominal', align: 'right', format: v => rupiah(v as number, { bare: true }) },
  { key: 'reviewStatus', label: 'Pengecekan', align: 'center', slot: 'reviewBadge' },
  { key: 'createdAt', label: 'Waktu', format: v => formatDate(v as string) }
]

function onRowClick(row: CashTransferRow) {
  selectedRow.value = row
  openDetail(row)
}
function openDetailSelected() {
  if (selectedRow.value) openDetail(selectedRow.value)
}

// ---- Detail (slideover) -- tidak ada Ubah (backdate 7 hari cukup lewat
// VOID + entri baru kalau salah, pola sama Biaya Operasional). -------------
const detailOpen = ref(false)
const detail = ref<CashTransferRow | null>(null)
const detailStatus = ref<'pending' | 'success' | 'error'>('pending')
const detailError = ref('')

async function openDetail(row: CashTransferRow) {
  detailOpen.value = true
  detail.value = null
  detailStatus.value = 'pending'
  try {
    detail.value = await api.get<CashTransferRow>(`/cash-transfers/${row.id}`)
    detailStatus.value = 'success'
  } catch (err) {
    detailStatus.value = 'error'
    detailError.value = getErrorMessage(err, 'Gagal memuat detail Pindah Buku Kas.')
  }
}
function goToCetak(id: string) {
  navigateTo(`/kas-bank/pindah-buku/${id}/cetak`)
}

// ---- VOID -- satu gerbang (VOID_DOCUMENT, CLAUDE.md §2.13), TIDAK ada
// UNLOCK_PRINT (cash_transfers tidak ikut kunci cetak §2.16) -- withStepUp()
// generik memakai header x-authorization-request-id, dipetakan ulang ke
// x-void-authorization-request-id yang diharapkan endpoint ini (satu-satunya
// gerbang, beda dari Payment/Faktur yang punya dua gerbang berurutan). ------
const voidOpen = ref(false)
const voidReasonCode = ref('')
const voidReasonNote = ref('')
const voidSubmitting = ref(false)
const voidError = ref('')

function openVoidModal() {
  voidReasonCode.value = ''
  voidReasonNote.value = ''
  voidError.value = ''
  voidOpen.value = true
}
async function submitVoid() {
  if (!detail.value) return
  if (!voidReasonCode.value.trim() || !voidReasonNote.value.trim()) {
    voidError.value = 'Kode alasan dan catatan alasan wajib diisi.'
    return
  }
  voidError.value = ''
  voidSubmitting.value = true
  try {
    await withStepUp(headers =>
      api.post(`/cash-transfers/${detail.value!.id}/void`, {
        reasonCode: voidReasonCode.value,
        reasonNote: voidReasonNote.value
      }, headers ? { 'x-void-authorization-request-id': headers['x-authorization-request-id'] as string } : undefined)
    )
    voidOpen.value = false
    await openDetail(detail.value)
    table.value?.reload()
  } catch (err) {
    if (err instanceof StepUpCancelledError) return
    voidError.value = getErrorMessage(err, 'Gagal membatalkan Pindah Buku Kas.')
  } finally {
    voidSubmitting.value = false
  }
}

// ---- Entri --------------------------------------------------------------
const entriOpen = ref(false)
const entriDirty = ref(false)

const form = ref<{
  transferDate: string
  fromCashAccountId: string | undefined
  toCashAccountId: string | undefined
  amount: number | undefined
  note: string
}>({
  transferDate: new Date().toISOString().slice(0, 10),
  fromCashAccountId: undefined,
  toCashAccountId: undefined,
  amount: undefined,
  note: ''
})

function resetForm() {
  form.value = {
    transferDate: new Date().toISOString().slice(0, 10),
    fromCashAccountId: undefined,
    toCashAccountId: undefined,
    amount: undefined,
    note: ''
  }
  entriDirty.value = false
}
function openEntri() {
  resetForm()
  bannerError.value = ''
  cancelledNotice.value = false
  entriOpen.value = true
}
function markDirty() {
  entriDirty.value = true
}

function validate(): string | null {
  if (!form.value.fromCashAccountId) return 'Pilih akun kas asal.'
  if (!form.value.toCashAccountId) return 'Pilih akun kas tujuan.'
  if (form.value.fromCashAccountId === form.value.toCashAccountId) return 'Akun kas asal dan tujuan tidak boleh sama.'
  if (!form.value.amount || form.value.amount <= 0) return 'Nominal wajib lebih dari 0.'
  return null
}

const submitting = ref(false)
const bannerError = ref('')
const cancelledNotice = ref(false)

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
    const result = await api.post<{ cashTransfer: CashTransferRow }>('/cash-transfers', {
      transferDate: form.value.transferDate || undefined,
      fromCashAccountId: form.value.fromCashAccountId,
      toCashAccountId: form.value.toCashAccountId,
      amount: form.value.amount,
      note: form.value.note || undefined
    })
    entriOpen.value = false
    saveNotice.value = { documentNumber: result.cashTransfer.documentNumber, id: result.cashTransfer.id }
    table.value?.reload()
  } catch (err2) {
    bannerError.value = getErrorMessage(err2, 'Gagal menyimpan Pindah Buku Kas.')
  } finally {
    submitting.value = false
  }
}

onMounted(loadAccounts)
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader />

    <UAlert
      v-if="saveNotice"
      color="success"
      variant="subtle"
      icon="i-lucide-check-circle-2"
      :title="`${saveNotice.documentNumber} tersimpan.`"
      :close-button="{ icon: 'i-lucide-x', color: 'neutral', variant: 'link' }"
      @update:open="saveNotice = null"
    >
      <template #actions>
        <UButton
          size="xs"
          icon="i-lucide-printer"
          variant="subtle"
          @click="goToCetak(saveNotice!.id)"
        >
          Cetak
        </UButton>
      </template>
    </UAlert>

    <DataTable
      ref="table"
      endpoint="/cash-transfers"
      :columns="columns"
      :on-row-click="onRowClick"
      selectable
      dense
      zebra
      search-placeholder="Cari nomor bukti..."
      :default-sort="{ key: 'transferDate', dir: 'desc' }"
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
      <template #reviewBadge="{ value }">
        <UBadge
          :color="REVIEW_COLOR[value as ReviewStatus]"
          variant="subtle"
        >
          {{ REVIEW_LABEL[value as ReviewStatus] }}
        </UBadge>
      </template>
    </DataTable>

    <!-- Detail -->
    <USlideover
      v-model:open="detailOpen"
      title="Detail Pindah Buku Kas"
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
                :color="detail.postingStatus === 'VOIDED' ? 'error' : 'success'"
                variant="subtle"
              >
                {{ detail.postingStatus === 'VOIDED' ? 'Dibatalkan' : 'Terposting' }}
              </UBadge>
              <UBadge
                :color="REVIEW_COLOR[detail.reviewStatus]"
                variant="subtle"
              >
                {{ REVIEW_LABEL[detail.reviewStatus] }}
              </UBadge>
            </div>
            <div class="text-sm text-muted">
              {{ ddmmyyyy(detail.transferDate) }}
            </div>
          </div>

          <div class="flex flex-col gap-2 text-sm border border-default rounded-md p-3">
            <div class="flex justify-between">
              <span class="text-muted">Dari</span>
              <span>{{ cashAccountName(detail.fromCashAccountId) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Ke</span>
              <span>{{ cashAccountName(detail.toCashAccountId) }}</span>
            </div>
            <div class="flex justify-between font-semibold">
              <span>Nominal</span>
              <span>{{ rupiah(detail.amount) }}</span>
            </div>
            <div
              v-if="detail.note"
              class="flex justify-between"
            >
              <span class="text-muted">Keterangan</span>
              <span>{{ detail.note }}</span>
            </div>
          </div>

          <div class="flex items-center gap-2 border-t border-default pt-3">
            <UButton
              icon="i-lucide-printer"
              color="neutral"
              variant="subtle"
              @click="goToCetak(detail.id)"
            >
              Cetak
            </UButton>
            <UButton
              v-if="detail.postingStatus === 'POSTED'"
              icon="i-lucide-ban"
              color="error"
              variant="subtle"
              @click="openVoidModal"
            >
              VOID
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>

    <!-- Entri, satu form datar -->
    <LineModal
      title="Pindah Buku Kas"
      mode="entri"
      :open="entriOpen"
      :dirty="entriDirty"
      :saving="submitting"
      width="720px"
      @update:open="(v: boolean) => (entriOpen = v)"
      @save="submit"
    >
      <template #form>
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
          v-if="cancelledNotice"
          color="neutral"
          variant="subtle"
          icon="i-lucide-x"
          title="Dibatalkan"
          description="Persetujuan dibatalkan sebelum selesai -- belum tersimpan."
        />

        <UFormField label="Tanggal">
          <UInput
            v-model="form.transferDate"
            type="date"
            class="w-full"
            @update:model-value="markDirty"
          />
        </UFormField>

        <UFormField
          label="Dari Kas"
          required
        >
          <USelect
            v-model="form.fromCashAccountId"
            :items="cashAccountOptions"
            :loading="loadingAccounts"
            placeholder="Pilih akun kas asal..."
            class="w-full"
            @update:model-value="markDirty"
          />
        </UFormField>

        <UFormField
          label="Ke Kas"
          required
        >
          <USelect
            v-model="form.toCashAccountId"
            :items="cashAccountOptions"
            :loading="loadingAccounts"
            placeholder="Pilih akun kas tujuan..."
            class="w-full"
            @update:model-value="markDirty"
          />
        </UFormField>

        <UFormField
          label="Nominal"
          required
        >
          <MoneyInput
            v-model="form.amount"
            placeholder="0"
            :min="0"
            class="w-full"
            @update:model-value="markDirty"
          />
        </UFormField>

        <UFormField label="Keterangan">
          <UTextarea
            v-model="form.note"
            placeholder="opsional"
            class="w-full"
            @update:model-value="markDirty"
          />
        </UFormField>
      </template>

      <template #context>
        <InfoStrip text="Backdate maksimum 7 hari khusus modul ini (sama seperti Biaya Operasional, beda dari modul lain yang 2 hari)." />
        <InfoStrip text="Isi ulang Kas Kecil selalu Rp 1.000.000. Setoran Kas Toko -> Kas Besar akhir hari dipindahkan seluruhnya, tanpa disisakan modal kembalian." />
        <InfoStrip text="Persetujuan Supervisor/Master untuk Pindah Buku Kas dilakukan SETELAH transaksi ini tersimpan, lewat Pengecekan Invoice Harian -- bukan sebelum Simpan." />
      </template>
    </LineModal>

    <!-- VOID -->
    <UModal
      v-model:open="voidOpen"
      title="VOID Pindah Buku Kas"
      description="Dokumen tidak dihapus -- dibatalkan dengan jurnal pembalik bertanggal hari ini."
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
            VOID
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
