<script setup lang="ts">
import type { Column } from '~/types/data-table'

// Pelunasan Kasbon (need_fixing.md #26, opsi 3a). Kasbon dicatat di Biaya
// Operasional (tab Kasbon, akun Piutang Karyawan) dan dilunasi SETOR TUNAI
// lewat layar ini: dokumen `PK`, jurnal Kas Kecil (D) / Piutang Karyawan (K).
// Kas penerima SELALU Kas Kecil (dikunci, tidak dipilih operator). Pola
// layar sama Pindah Buku Kas: <LineModal> sebagai modal entri, VOID satu
// gerbang VOID_DOCUMENT (OPERATOR) tanpa kunci cetak.
definePageMeta({ title: 'Pelunasan Kasbon', roles: ['MASTER', 'OPERATOR'] })

// Kode akun Kas Kecil di COA (docs/COA_USULAN.md) — sama dengan
// kas-bank/biaya-operasional/index.vue.
const KAS_KECIL_CODE = '01.110.00001'

interface AccountOption { id: string, code: string, name: string }
interface KasbonBalance {
  workerId: string
  workerCode: string
  workerName: string
  totalKasbon: number
  totalRepaid: number
  outstanding: number
}
interface RepaymentRow extends Record<string, unknown> {
  id: string
  documentNumber: string
  repaymentDate: string
  workerId: string
  workerName: string
  cashAccountName: string
  amount: number
  note: string | null
  postingStatus: 'POSTED' | 'VOIDED'
  voidReasonCode: string | null
  voidReasonNote: string | null
}

const api = useApi()
const { format: rupiah } = useRupiah()
const { withStepUp } = useStepUp()

function ddmmyyyy(value: string | null | undefined): string {
  return formatDate(value).split('/').join('-')
}

// ---- Data pendukung ---------------------------------------------------------
const kasKecil = ref<AccountOption | null>(null)
const balances = ref<KasbonBalance[]>([])
const balancesLoading = ref(true)
const loadError = ref('')

async function loadBalances() {
  balancesLoading.value = true
  try {
    balances.value = await api.get<KasbonBalance[]>('/kasbon-repayments/balances')
  } finally {
    balancesLoading.value = false
  }
}

async function loadAll() {
  try {
    const cash = await api.get<AccountOption[]>('/chart-of-accounts/cash-accounts')
    kasKecil.value = cash.find(a => a.code === KAS_KECIL_CODE) ?? null
    await loadBalances()
  } catch (err) {
    loadError.value = getErrorMessage(err, 'Gagal memuat data kasbon.')
  }
}
onMounted(loadAll)

const balanceMap = computed(() => new Map(balances.value.map(b => [b.workerId, b])))
const outstandingBalances = computed(() => balances.value.filter(b => b.outstanding > 0))
const workerOptions = computed(() => outstandingBalances.value.map(b => ({
  label: `${b.workerName} — sisa ${rupiah(b.outstanding)}`,
  value: b.workerId
})))

// ---- Daftar -----------------------------------------------------------------
const table = ref()
const selectedRow = ref<RepaymentRow | null>(null)
const saveNotice = ref<string | null>(null)

const columns: Column<RepaymentRow>[] = [
  { key: 'documentNumber', label: 'No. Bukti', mono: true },
  { key: 'repaymentDate', label: 'Tanggal', format: v => ddmmyyyy(v as string) },
  { key: 'workerName', label: 'Pekerja' },
  { key: 'amount', label: 'Nominal', align: 'right', format: v => rupiah(v as number, { bare: true }) },
  { key: 'postingStatus', label: 'Status', align: 'center', slot: 'statusBadge' }
]

const balanceColumns: Column<KasbonBalance & Record<string, unknown>>[] = [
  { key: 'workerName', label: 'Pekerja' },
  { key: 'totalKasbon', label: 'Total Kasbon', align: 'right', format: v => rupiah(v as number, { bare: true }) },
  { key: 'totalRepaid', label: 'Sudah Disetor', align: 'right', format: v => rupiah(v as number, { bare: true }) },
  { key: 'outstanding', label: 'Sisa', align: 'right', format: v => rupiah(v as number, { bare: true }) }
]

function onRowClick(row: RepaymentRow) {
  selectedRow.value = row
}

// ---- VOID (satu gerbang VOID_DOCUMENT untuk OPERATOR, §2.13) ----------------
const voidOpen = ref(false)
const voidReasonCode = ref('')
const voidReasonNote = ref('')
const voidSubmitting = ref(false)
const voidError = ref('')

function openVoidModal() {
  if (!selectedRow.value || selectedRow.value.postingStatus !== 'POSTED') return
  voidReasonCode.value = ''
  voidReasonNote.value = ''
  voidError.value = ''
  voidOpen.value = true
}
async function submitVoid() {
  if (!selectedRow.value) return
  if (!voidReasonCode.value.trim() || !voidReasonNote.value.trim()) {
    voidError.value = 'Kode alasan dan catatan alasan wajib diisi.'
    return
  }
  voidError.value = ''
  voidSubmitting.value = true
  const id = selectedRow.value.id
  try {
    await withStepUp(headers =>
      api.post(`/kasbon-repayments/${id}/void`, {
        reasonCode: voidReasonCode.value,
        reasonNote: voidReasonNote.value
      }, headers ? { 'x-void-authorization-request-id': headers['x-authorization-request-id'] as string } : undefined)
    )
    voidOpen.value = false
    selectedRow.value = null
    table.value?.reload()
    await loadBalances()
  } catch (err) {
    if (err instanceof StepUpCancelledError) {
      voidError.value = 'Persetujuan dibatalkan — pelunasan belum dibatalkan.'
      return
    }
    voidError.value = getErrorMessage(err, 'Gagal membatalkan pelunasan kasbon.')
  } finally {
    voidSubmitting.value = false
  }
}

// ---- Entri --------------------------------------------------------------------
const entriOpen = ref(false)
const entriDirty = ref(false)
const form = ref<{ repaymentDate: string, workerId: string | undefined, amount: number | undefined, note: string }>({
  repaymentDate: new Date().toISOString().slice(0, 10),
  workerId: undefined,
  amount: undefined,
  note: ''
})
const submitting = ref(false)
const bannerError = ref('')

const selectedBalance = computed(() => (form.value.workerId ? balanceMap.value.get(form.value.workerId) : undefined))

function openEntri(workerId?: string) {
  form.value = {
    repaymentDate: new Date().toISOString().slice(0, 10),
    workerId,
    amount: workerId ? balanceMap.value.get(workerId)?.outstanding : undefined,
    note: ''
  }
  entriDirty.value = false
  bannerError.value = ''
  entriOpen.value = true
}
function onWorkerChange() {
  entriDirty.value = true
  // Default nominal = sisa penuh (lunas); boleh dikurangi untuk setor sebagian.
  form.value.amount = selectedBalance.value?.outstanding
}

function validate(): string | null {
  if (!kasKecil.value) return 'Akun Kas Kecil tidak ditemukan di COA — hubungi MASTER.'
  if (!form.value.workerId) return 'Pilih pekerja.'
  if (!form.value.amount || form.value.amount <= 0) return 'Nominal wajib lebih dari 0.'
  const sisa = selectedBalance.value?.outstanding ?? 0
  if (form.value.amount > sisa) return `Nominal melebihi sisa kasbon (${rupiah(sisa)}).`
  return null
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
    const result = await api.post<{ repayment: { documentNumber: string } }>('/kasbon-repayments', {
      repaymentDate: form.value.repaymentDate,
      workerId: form.value.workerId,
      cashAccountId: kasKecil.value!.id,
      amount: form.value.amount,
      note: form.value.note || undefined
    })
    entriOpen.value = false
    saveNotice.value = `${result.repayment.documentNumber} tersimpan.`
    table.value?.reload()
    await loadBalances()
  } catch (err2) {
    bannerError.value = getErrorMessage(err2, 'Gagal menyimpan pelunasan kasbon.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader />

    <UAlert
      v-if="loadError"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-triangle"
      :title="loadError"
    />
    <UAlert
      v-if="saveNotice"
      color="success"
      variant="subtle"
      icon="i-lucide-check-circle-2"
      :title="saveNotice"
      :close="{ icon: 'i-lucide-x', color: 'neutral', variant: 'link' }"
      @update:open="saveNotice = null"
    />

    <div class="flex flex-col gap-2">
      <h2 class="text-sm font-semibold text-muted uppercase tracking-wide">
        Sisa Kasbon per Pekerja
      </h2>
      <DataTable
        :rows="outstandingBalances as unknown as Record<string, unknown>[]"
        :columns="balanceColumns as Column<Record<string, unknown>>[]"
        :on-row-click="(row: Record<string, unknown>) => openEntri(row.workerId as string)"
        dense
        zebra
        :searchable="false"
        :empty-text="balancesLoading ? 'Memuat...' : '< Tidak ada kasbon yang belum lunas >'"
      />
      <p class="text-xs text-muted">
        Klik baris pekerja untuk mencatat setoran pelunasannya.
      </p>
    </div>

    <DataTable
      ref="table"
      endpoint="/kasbon-repayments"
      :columns="columns"
      :on-row-click="onRowClick"
      selectable
      dense
      zebra
      search-placeholder="Cari nomor bukti atau nama pekerja..."
      :default-sort="{ key: 'repaymentDate', dir: 'desc' }"
    >
      <template #toolbar>
        <div class="flex items-center gap-1">
          <UButton
            icon="i-lucide-plus"
            @click="openEntri()"
          >
            Entri
          </UButton>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            @click="() => { table?.reload(); loadBalances() }"
          >
            Refresh
          </UButton>
          <UButton
            icon="i-lucide-ban"
            color="error"
            variant="ghost"
            :disabled="!selectedRow || selectedRow.postingStatus !== 'POSTED'"
            @click="openVoidModal"
          >
            VOID
          </UButton>
        </div>
      </template>
      <template #statusBadge="{ value }">
        <UBadge
          :color="value === 'VOIDED' ? 'error' : 'success'"
          variant="subtle"
        >
          {{ value === 'VOIDED' ? 'Dibatalkan' : 'Terposting' }}
        </UBadge>
      </template>
    </DataTable>

    <!-- Entri -->
    <LineModal
      title="Pelunasan Kasbon"
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
          :close="{ icon: 'i-lucide-x', color: 'neutral', variant: 'link' }"
          @update:open="bannerError = ''"
        />

        <UFormField label="Tanggal">
          <UInput
            v-model="form.repaymentDate"
            type="date"
            class="w-full"
            @update:model-value="entriDirty = true"
          />
        </UFormField>

        <UFormField
          label="Pekerja"
          required
        >
          <USelect
            v-model="form.workerId"
            :items="workerOptions"
            :loading="balancesLoading"
            placeholder="Pilih pekerja yang punya sisa kasbon..."
            class="w-full"
            @update:model-value="onWorkerChange"
          />
        </UFormField>

        <UFormField
          label="Disetor ke"
          hint="Selalu Kas Kecil."
        >
          <div class="px-3 py-1.5 rounded-md border border-default bg-elevated/50 text-muted">
            {{ kasKecil ? `${kasKecil.code} - ${kasKecil.name}` : 'Kas Kecil tidak ditemukan' }}
          </div>
        </UFormField>

        <UFormField
          label="Nominal Setoran"
          required
        >
          <MoneyInput
            v-model="form.amount"
            placeholder="0"
            :min="0"
            class="w-full"
            @update:model-value="entriDirty = true"
          />
        </UFormField>

        <UFormField label="Keterangan">
          <UTextarea
            v-model="form.note"
            placeholder="opsional"
            class="w-full"
            @update:model-value="entriDirty = true"
          />
        </UFormField>
      </template>

      <template #context>
        <InfoStrip
          v-if="selectedBalance"
          :items="[
            { label: 'Total Kasbon', value: rupiah(selectedBalance.totalKasbon) },
            { label: 'Sudah Disetor', value: rupiah(selectedBalance.totalRepaid) },
            { label: 'Sisa', value: rupiah(selectedBalance.outstanding) }
          ]"
        />
        <InfoStrip text="Kasbon dicatat di Biaya Operasional (tab Kasbon). Setoran sebagian boleh; melebihi sisa ditolak." />
      </template>
    </LineModal>

    <!-- VOID -->
    <UModal
      v-model:open="voidOpen"
      title="VOID Pelunasan Kasbon"
      description="Dokumen tidak dihapus -- dibatalkan dengan jurnal pembalik bertanggal hari ini; sisa kasbon pekerja kembali bertambah."
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
