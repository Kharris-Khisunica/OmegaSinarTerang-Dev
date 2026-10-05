<script setup lang="ts">
import type { ProductLookup, SupplierLookup } from '~/composables/usePurchaseInvoiceLookups'

definePageMeta({ title: 'Detail Faktur Pembelian', roles: ['MASTER', 'OPERATOR'] })

type PostingStatus = 'POSTED' | 'VOIDED'
type PrintStatus = 'NOT_PRINTED' | 'PRINTED' | 'PRINT_CANCELLED'
type ReviewStatus = 'BELUM_DICEK' | 'DISETUJUI' | 'BERMASALAH'

interface InvoiceLine {
  id: string
  productId: string
  qtyInput: string
  unitPrice: string
  discountPercent: string | null
  discountAmount: string
  lineFinalAmount: string
  inputVat: string
  unitCostResult: string
  isBonus: boolean
}

interface InvoiceDetail {
  id: string
  invoiceNumber: string
  supplierId: string
  supplierInvoiceNo: string
  receiptDate: string
  supplierInvoiceDate: string
  dueDate: string
  termDays: number
  subtotal: string
  invoiceDiscountAmount: string
  inputVatAmount: string
  totalAmount: string
  postingStatus: PostingStatus
  printStatus: PrintStatus
  printCount: number
  revisionNumber: number
  reviewStatus: ReviewStatus
  reviewNote: string | null
  voidReasonCode: string | null
  voidReasonNote: string | null
  lines: InvoiceLine[]
}

const route = useRoute()
const api = useApi()
const { withStepUp } = useStepUp()
const { format: rupiah } = useRupiah()
const { format: qtyFmt } = useQty()
const { loadSupplierMap, loadProductMap } = usePurchaseInvoiceLookups()

const invoiceId = route.params.id as string

const invoice = ref<InvoiceDetail | null>(null)
const loading = ref(true)
const loadError = ref('')
const supplierMap = ref<Map<string, SupplierLookup>>(new Map())
const productMap = ref<Map<string, ProductLookup>>(new Map())

async function loadInvoice() {
  invoice.value = await api.get<InvoiceDetail>(`/purchase-invoices/${invoiceId}`)
}

onMounted(async () => {
  try {
    const [, suppliers, products] = await Promise.all([
      loadInvoice(),
      loadSupplierMap(),
      loadProductMap()
    ])
    supplierMap.value = suppliers
    productMap.value = products
  } catch (err) {
    loadError.value = getErrorMessage(err, 'Gagal memuat detail faktur.')
  } finally {
    loading.value = false
  }
  // R6: dibuka dari pesan gagal revisi ("faktur > 2 hari") yang menawarkan
  // VOID sebagai jalan keluar -- pembelian/faktur/index.vue navigasi ke sini
  // dengan ?openVoid=1, pola sama ?openSj=1 di penjualan/faktur/[id]/index.vue.
  if (route.query.openVoid !== undefined) {
    openVoidModal()
  }
})

function supplierLabel(id: string): string {
  const s = supplierMap.value.get(id)
  return s ? `${s.displayCode} - ${s.name}` : '-'
}
function productLabel(id: string): string {
  const p = productMap.value.get(id)
  return p ? `${p.displayName} (${p.code})` : id
}

// --- Cetak -----------------------------------------------------------------
const printLoading = ref(false)
const actionError = ref('')

async function handlePrint() {
  actionError.value = ''
  printLoading.value = true
  try {
    await api.post(`/purchase-invoices/${invoiceId}/print`)
    await loadInvoice()
  } catch (err) {
    actionError.value = getErrorMessage(err, 'Gagal mencetak faktur.')
  } finally {
    printLoading.value = false
  }
}

// --- Batal Cetak (niat dideklarasikan di depan) -----------------------------
// Prefill untuk layar edit/VOID di bawah kalau dipicu lewat dialog "Batal
// Cetak" — reason yang sama dipakai sebagai alasan buka-kunci cetak (server)
// DAN alasan edit/VOID (satu alasan, dua tujuan, sesuai CLAUDE.md §2.16).
function handleUnlockPrint(payload: { intent: 'EDIT' | 'VOID', reason: string }) {
  if (payload.intent === 'EDIT') {
    goToEdit(payload.reason)
  } else {
    openVoidModal(payload.reason)
  }
}

// --- Edit = navigasi ke layar entri PENUH mode 'ubah' (paket R6) -----------
// Sebelum R6: modal header-only (No. Faktur Supplier/Tgl Faktur/Termin) di
// sini. CLAUDE.md §6 melarang form kedua yang mirip -- diganti navigasi ke
// pembelian/faktur/[id]/edit.vue, pembungkus tipis atas index.vue yang SAMA
// dipakai untuk entri baru (mode 'ubah', ter-prefill SELURUH baris).
function goToEdit(prefillReason = '') {
  const query = prefillReason ? `?reason=${encodeURIComponent(prefillReason)}` : ''
  navigateTo(`/pembelian/faktur/${invoiceId}/edit${query}`)
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

async function submitVoid() {
  if (!voidReasonCode.value.trim() || !voidReasonNote.value.trim()) {
    voidError.value = 'Kode alasan dan catatan alasan wajib diisi.'
    return
  }
  voidError.value = ''
  voidSubmitting.value = true
  // Sama seperti submitEdit() -- tutup dulu supaya <StepUpDialog> global
  // tidak tertutup modal VOID ini.
  voidOpen.value = false
  try {
    await withStepUp(headers =>
      api.post(
        `/purchase-invoices/${invoiceId}/void`,
        {
          reasonCode: voidReasonCode.value,
          reasonNote: voidReasonNote.value
        },
        headers
      )
    )
    await loadInvoice()
  } catch (err) {
    voidOpen.value = true
    if (err instanceof StepUpCancelledError) {
      voidError.value = 'Persetujuan dibatalkan — faktur belum dibatalkan.'
      return
    }
    voidError.value = getErrorMessage(err, 'Gagal membatalkan faktur.')
  } finally {
    voidSubmitting.value = false
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
        to="/pembelian/faktur"
      >
        Keluar
      </UButton>
    </PageHeader>

    <div
      v-if="loading"
      class="flex flex-col gap-2"
    >
      <USkeleton
        v-for="i in 4"
        :key="i"
        class="h-6 w-full"
      />
    </div>

    <UEmpty
      v-else-if="loadError"
      icon="i-lucide-alert-triangle"
      title="Gagal memuat detail"
      :description="loadError"
    />

    <div
      v-else-if="invoice"
      class="flex flex-col gap-4"
    >
      <UAlert
        v-if="actionError"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-triangle"
        :title="actionError"
        :close-button="{ icon: 'i-lucide-x', color: 'neutral', variant: 'link' }"
        @update:open="actionError = ''"
      />

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div class="flex flex-col gap-1">
            <span class="font-mono text-lg font-semibold">{{ invoice.invoiceNumber }}</span>
            <span
              v-if="invoice.revisionNumber > 0"
              class="text-xs text-muted"
            >Revisi {{ invoice.revisionNumber }}</span>
          </div>
          <DocumentActions
            :posting-status="invoice.postingStatus"
            :print-status="invoice.printStatus"
            :print-loading="printLoading"
            @print="handlePrint"
            @edit="goToEdit()"
            @void="openVoidModal()"
            @unlock-print="handleUnlockPrint"
          />
        </div>

        <DocumentStatusBadges
          :posting-status="invoice.postingStatus"
          :print-status="invoice.printStatus"
          :review-status="invoice.reviewStatus"
        />

        <UAlert
          v-if="invoice.reviewStatus === 'BERMASALAH'"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          title="Ditandai bermasalah oleh supervisor"
          :description="invoice.reviewNote || '-'"
        />

        <div class="text-sm text-muted">
          {{ supplierLabel(invoice.supplierId) }} · No. {{ invoice.supplierInvoiceNo }}
        </div>
        <div class="text-sm text-muted">
          Terima {{ formatDate(invoice.receiptDate) }} · Faktur {{ formatDate(invoice.supplierInvoiceDate) }}
          · Jth. Tempo {{ formatDate(invoice.dueDate) }} ({{ invoice.termDays }} hari)
        </div>
        <div
          v-if="invoice.postingStatus === 'VOIDED'"
          class="text-sm text-error"
        >
          VOID: {{ invoice.voidReasonCode }} — {{ invoice.voidReasonNote }}
        </div>
      </div>

      <DataTable
        :rows="invoice.lines as unknown as Record<string, unknown>[]"
        :columns="[
          { key: 'productId', label: 'Produk', slot: 'productCell' },
          { key: 'qtyInput', label: 'Qty', format: (v: unknown) => qtyFmt(Number(v)) },
          { key: 'unitPrice', label: 'Harga', align: 'right', format: (v: unknown) => rupiah(Number(v), { bare: true }) },
          { key: 'lineFinalAmount', label: 'Final Baris', align: 'right', format: (v: unknown) => rupiah(Number(v), { bare: true }) },
          { key: 'inputVat', label: 'PPN', align: 'right', format: (v: unknown) => rupiah(Number(v), { bare: true }) }
        ]"
        dense
        zebra
        :searchable="false"
      >
        <template #productCell="{ row }">
          {{ productLabel((row as unknown as InvoiceLine).productId) }}
          <UBadge
            v-if="(row as unknown as InvoiceLine).isBonus"
            color="warning"
            variant="subtle"
            size="xs"
            class="ml-1"
          >
            Bonus
          </UBadge>
        </template>
      </DataTable>

      <div class="flex flex-col gap-1 text-sm max-w-xs ml-auto">
        <div class="flex justify-between">
          <span class="text-muted">Subtotal</span>
          <span>{{ rupiah(Number(invoice.subtotal)) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Diskon Faktur</span>
          <span>-{{ rupiah(Number(invoice.invoiceDiscountAmount)) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">PPN Masukan</span>
          <span>{{ rupiah(Number(invoice.inputVatAmount)) }}</span>
        </div>
        <div class="flex justify-between font-semibold text-base border-t border-default pt-1">
          <span>TOTAL</span>
          <span>{{ rupiah(Number(invoice.totalAmount)) }}</span>
        </div>
      </div>
    </div>

    <!-- VOID -->
    <UModal
      v-model:open="voidOpen"
      title="VOID Faktur Pembelian"
      description="Faktur tidak dihapus — dibatalkan dengan jurnal pembalik bertanggal hari ini."
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
            VOID Faktur
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
