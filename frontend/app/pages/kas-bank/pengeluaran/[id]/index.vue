<script setup lang="ts">
// Detail Pengeluaran Kas (Hari 27) -- header + metode + baris faktur yang
// dilunasi, plus DocumentActions (kunci cetak §2.16 + VOID §2.13). VOID bisa
// memicu DUA gerbang step-up independen (UNLOCK_PRINT + VOID_DOCUMENT) --
// performVoid() di sini adalah salinan pola PERSIS
// penjualan/faktur/[id]/index.vue (lihat komentar panjang di sana), hanya
// endpoint yang berbeda. Tidak ada "Ubah" -- pembayaran tidak pernah diedit,
// koreksi selalu lewat VOID + entri baru (konsisten prinsip append-only).
definePageMeta({ title: 'Detail Pengeluaran Kas', roles: ['MASTER', 'OPERATOR'] })

type PostingStatus = 'POSTED' | 'VOIDED'
type PrintStatus = 'NOT_PRINTED' | 'PRINTED' | 'PRINT_CANCELLED'

interface PaymentBatchDetail {
  id: string
  batchNumber: string
  paymentDate: string
  totalAmount: string
  postingStatus: PostingStatus
  printStatus: PrintStatus
  printCount: number
  revisionNumber: number
  voidReasonNote: string | null
}
interface MethodDetail { id: string, cashAccountCode: string, cashAccountName: string, amount: number }
interface LineDetail {
  id: string
  invoiceNumber: string
  partyName: string
  allocatedAmount: number
  settledInFull: boolean
  discrepancyAmount: number
  methods: MethodDetail[]
}
interface PaymentDetail {
  paymentBatch: PaymentBatchDetail
  methodsSummary: MethodDetail[]
  lines: LineDetail[]
}

const route = useRoute()
const api = useApi()
const { performDualGateVoid } = useDualGateVoid()
const { format: rupiah } = useRupiah()

const batchId = route.params.id as string
const detail = ref<PaymentDetail | null>(null)
const loading = ref(true)
const loadError = ref('')

async function loadDetail() {
  loading.value = true
  loadError.value = ''
  try {
    detail.value = await api.get<PaymentDetail>(`/payments/${batchId}`)
  } catch (err) {
    loadError.value = getErrorMessage(err, 'Gagal memuat detail pembayaran.')
  } finally {
    loading.value = false
  }
}
onMounted(loadDetail)

function handlePrint() {
  navigateTo(`/kas-bank/pengeluaran/${batchId}/cetak`)
}

const unsupportedNotice = ref(false)
function showUnsupportedNotice() {
  unsupportedNotice.value = true
}

// --- VOID --------------------------------------------------------------------
const voidOpen = ref(false)
const voidReasonCode = ref('')
const voidReasonNote = ref('')
const voidSubmitting = ref(false)
const voidError = ref('')

function openVoidModal(prefillReason = '') {
  voidReasonCode.value = ''
  voidReasonNote.value = prefillReason
  voidError.value = ''
  voidOpen.value = true
}

function voidPayload() {
  return { reasonCode: voidReasonCode.value, reasonNote: voidReasonNote.value }
}
function callVoid(headers?: Record<string, string>) {
  return api.post(`/payments/${batchId}/void`, voidPayload(), headers)
}
// Dua gerbang VOID (UNLOCK_PRINT + VOID_DOCUMENT) — penjelasan lengkap di
// composables/useDualGateVoid.ts.
function performVoid(): Promise<unknown> {
  return performDualGateVoid(detail.value?.paymentBatch.printStatus === 'PRINTED', callVoid)
}

async function submitVoid() {
  if (!voidReasonCode.value.trim() || !voidReasonNote.value.trim()) {
    voidError.value = 'Kode alasan dan catatan alasan wajib diisi.'
    return
  }
  voidError.value = ''
  voidSubmitting.value = true
  voidOpen.value = false
  try {
    await performVoid()
    await loadDetail()
  } catch (err) {
    voidOpen.value = true
    if (err instanceof StepUpCancelledError) {
      voidError.value = 'Persetujuan dibatalkan — batch belum dibatalkan.'
      return
    }
    voidError.value = getErrorMessage(err, 'Gagal membatalkan batch pembayaran.')
  } finally {
    voidSubmitting.value = false
  }
}

function handleUnlockPrint(payload: { intent: 'EDIT' | 'VOID', reason: string }) {
  if (payload.intent === 'VOID') {
    openVoidModal(payload.reason)
  } else {
    showUnsupportedNotice()
  }
}
</script>

<template>
  <div class="p-4 flex flex-col gap-4 max-w-4xl">
    <PageHeader>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-arrow-left"
        to="/kas-bank/pengeluaran"
      >
        Keluar
      </UButton>
    </PageHeader>

    <p
      v-if="loading"
      class="text-sm text-muted"
    >
      Memuat...
    </p>
    <UAlert
      v-else-if="loadError"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-triangle"
      :title="loadError"
    />

    <template v-else-if="detail">
      <div class="flex items-center justify-between">
        <div>
          <p class="font-mono text-lg font-semibold">
            {{ detail.paymentBatch.batchNumber }}
          </p>
          <p class="text-sm text-muted">
            {{ formatDate(detail.paymentBatch.paymentDate) }}
            <span v-if="detail.paymentBatch.revisionNumber > 0"> · Revisi ke-{{ detail.paymentBatch.revisionNumber }}</span>
          </p>
        </div>
        <DocumentStatusBadges
          :posting-status="detail.paymentBatch.postingStatus"
          :print-status="detail.paymentBatch.printStatus"
        />
      </div>

      <UAlert
        v-if="detail.paymentBatch.postingStatus === 'VOIDED' && detail.paymentBatch.voidReasonNote"
        color="error"
        variant="subtle"
        icon="i-lucide-ban"
        title="Dibatalkan (VOID)"
        :description="detail.paymentBatch.voidReasonNote"
      />

      <div class="flex flex-col gap-2">
        <p class="text-sm font-medium">
          Metode Pembayaran
        </p>
        <div class="border border-default rounded-md divide-y divide-default">
          <div
            v-for="m in detail.methodsSummary"
            :key="m.id"
            class="flex items-center justify-between px-3 py-2 text-sm"
          >
            <span>{{ m.cashAccountCode }} - {{ m.cashAccountName }}</span>
            <span>{{ rupiah(m.amount, { bare: true }) }}</span>
          </div>
        </div>
        <TotalsBar :items="[{ label: 'Total', value: rupiah(Number(detail.paymentBatch.totalAmount), { bare: true }), emphasize: true }]" />
      </div>

      <div class="flex flex-col gap-2">
        <p class="text-sm font-medium">
          Faktur Dilunasi
        </p>
        <div class="overflow-x-auto border border-default rounded-md">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-default text-left text-muted">
                <th class="px-2 py-1.5 font-medium">
                  No. Faktur
                </th>
                <th class="px-2 py-1.5 font-medium">
                  Pihak
                </th>
                <th class="px-2 py-1.5 font-medium">
                  Metode
                </th>
                <th class="px-2 py-1.5 font-medium text-right">
                  Dialokasikan
                </th>
                <th class="px-2 py-1.5 font-medium text-right">
                  Selisih
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="line in detail.lines"
                :key="line.id"
                class="border-b border-default last:border-0"
              >
                <td class="px-2 py-1.5 font-mono">
                  {{ line.invoiceNumber }}
                </td>
                <td class="px-2 py-1.5">
                  {{ line.partyName }}
                </td>
                <td class="px-2 py-1.5 text-xs text-muted">
                  <div
                    v-for="m in line.methods"
                    :key="m.id"
                  >
                    {{ m.cashAccountName }}: {{ rupiah(m.amount, { bare: true }) }}
                  </div>
                </td>
                <td class="px-2 py-1.5 text-right">
                  {{ rupiah(line.allocatedAmount, { bare: true }) }}
                </td>
                <td class="px-2 py-1.5 text-right">
                  <span
                    v-if="line.discrepancyAmount !== 0"
                    :class="line.discrepancyAmount > 0 ? 'text-warning' : 'text-info'"
                  >
                    {{ rupiah(Math.abs(line.discrepancyAmount), { bare: true }) }}
                    ({{ line.discrepancyAmount > 0 ? 'kurang bayar' : 'lebih bayar' }})
                  </span>
                  <span
                    v-else
                    class="text-muted"
                  >-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <DocumentActions
        :posting-status="detail.paymentBatch.postingStatus"
        :print-status="detail.paymentBatch.printStatus"
        @print="handlePrint"
        @edit="showUnsupportedNotice"
        @void="openVoidModal()"
        @unlock-print="handleUnlockPrint"
      />
    </template>

    <UModal
      v-model:open="unsupportedNotice"
      title="Belum Didukung"
      description="Pembayaran tidak bisa diedit — VOID batch ini lalu buat entri baru."
    >
      <template #footer>
        <UButton @click="unsupportedNotice = false">
          Mengerti
        </UButton>
      </template>
    </UModal>

    <UModal
      v-model:open="voidOpen"
      title="VOID Batch Pembayaran"
      description="Batch tidak dihapus — dibatalkan dengan jurnal pembalik bertanggal hari ini."
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
            VOID Batch
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
