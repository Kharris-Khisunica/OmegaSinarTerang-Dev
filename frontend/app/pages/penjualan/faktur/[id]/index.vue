<script setup lang="ts">
import type { CustomerLookup, ProductLookup, SalesmanLookup, UnitLookup, VehicleLookup } from '~/composables/useSalesInvoiceLookups'
import type { SelectOption } from '~/types/crud-form'

definePageMeta({ title: 'Detail Faktur Penjualan', roles: ['MASTER', 'OPERATOR'] })

type PostingStatus = 'POSTED' | 'VOIDED'
type PrintStatus = 'NOT_PRINTED' | 'PRINTED' | 'PRINT_CANCELLED'
type ReviewStatus = 'BELUM_DICEK' | 'DISETUJUI' | 'BERMASALAH'
type SalesChannel = 'PENGIRIMAN' | 'TOKO'

interface InvoiceLine {
  id: string
  productId: string
  unitId: string
  qtyInput: string
  unitPrice: string
  discountPercent: string | null
  discountAmount: string
  netAmount: string
}

interface InvoiceDetail {
  id: string
  invoiceNumber: string
  invoiceDate: string
  customerId: string
  salesChannel: SalesChannel
  salesmanId: string
  termDays: number
  dueDate: string
  subtotal: string
  lineDiscountTotal: string
  invoiceDiscountAmount: string
  outputVatAmount: string
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

const CHANNEL_LABEL: Record<SalesChannel, string> = {
  PENGIRIMAN: 'Pengiriman',
  TOKO: 'Toko'
}

const route = useRoute()
const api = useApi()
const toast = useToast()
const { withStepUp } = useStepUp()
const { format: rupiah } = useRupiah()
const { format: qtyFmt } = useQty()
const { loadCustomerMap, loadProductMap, loadUnitMap, loadSalesmanMap, loadVehicleMap } = useSalesInvoiceLookups()

const invoiceId = route.params.id as string

const invoice = ref<InvoiceDetail | null>(null)
const loading = ref(true)
const loadError = ref('')
const customerMap = ref<Map<string, CustomerLookup>>(new Map())
const productMap = ref<Map<string, ProductLookup>>(new Map())
const unitMap = ref<Map<string, UnitLookup>>(new Map())
const salesmanMap = ref<Map<string, SalesmanLookup>>(new Map())
const vehicleMap = ref<Map<string, VehicleLookup>>(new Map())

async function loadInvoice() {
  invoice.value = await api.get<InvoiceDetail>(`/sales-invoices/${invoiceId}`)
}

onMounted(async () => {
  try {
    const [, customers, products, units, salesmen, vehicles] = await Promise.all([
      loadInvoice(),
      loadCustomerMap(),
      loadProductMap(),
      loadUnitMap(),
      loadSalesmanMap(),
      loadVehicleMap()
    ])
    customerMap.value = customers
    productMap.value = products
    unitMap.value = units
    salesmanMap.value = salesmen
    vehicleMap.value = vehicles
  } catch (err) {
    loadError.value = getErrorMessage(err, 'Gagal memuat detail faktur.')
  } finally {
    loading.value = false
  }
  // R4/SJ1 (RENCANA_REVISI_TESTING_KLIEN.md): dibuka lewat aksi "Buat Surat
  // Jalan" di DAFTAR faktur (penjualan/faktur/index.vue) -- guard
  // canCreateDeliveryOrder yang sama tetap berlaku, jadi query param ini
  // tidak bisa memaksa modal terbuka untuk faktur TOKO/VOIDED.
  if (route.query.openSj !== undefined && canCreateDeliveryOrder.value) {
    openDeliveryOrderModal()
  }
  // R6: dibuka dari pesan gagal revisi ("faktur > 2 hari") yang menawarkan
  // VOID sebagai jalan keluar -- penjualan/faktur/index.vue navigasi ke sini
  // dengan ?openVoid=1, pola sama ?openSj=1 di atas.
  if (route.query.openVoid !== undefined) {
    openVoidModal()
  }
})

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
function salesmanLabel(id: string): string {
  const s = salesmanMap.value.get(id)
  return s ? `${s.code} - ${s.name}` : '-'
}

// --- Cetak -- navigasi ke halaman cetak (§13.1 PANDUAN_UI.md), BUKAN
// panggil POST .../print langsung di sini -- registrasi cetak (print_count/
// printed_at, CLAUDE.md §2.16) terjadi di halaman cetak itu sendiri, satu
// klik bareng window.print() supaya operator selalu melihat NOTA sungguhan
// yang tercetak, bukan sekadar menaikkan angka tanpa output visual.
function handlePrint() {
  navigateTo(`/penjualan/faktur/${invoiceId}/cetak`)
}

// --- Batal Cetak (niat dideklarasikan di depan) -----------------------------
function handleUnlockPrint(payload: { intent: 'EDIT' | 'VOID', reason: string }) {
  if (payload.intent === 'EDIT') {
    goToEdit(payload.reason)
  } else {
    openVoidModal(payload.reason)
  }
}

// --- Edit = navigasi ke layar entri PENUH mode 'ubah' (paket R6) -----------
// Sebelum R6: modal dua field (salesman+termin) di sini. CLAUDE.md §6
// melarang form kedua yang mirip -- diganti navigasi ke penjualan/faktur/
// [id]/edit.vue, pembungkus tipis atas index.vue yang SAMA dipakai untuk
// entri baru (mode 'ubah', ter-prefill SELURUH baris). Kalau faktur sudah
// PRINTED, `reason` yang baru dikumpulkan DocumentActions dibawa lewat query
// string -- dikonsumsi index.vue sebagai UnlockPrintDto.reason saat submit
// (StepUpDialog untuk UNLOCK_PRINT sungguhan baru muncul di titik itu, bukan
// di sini -- lihat performRevise() di index.vue).
function goToEdit(prefillReason = '') {
  const query = prefillReason ? `?reason=${encodeURIComponent(prefillReason)}` : ''
  navigateTo(`/penjualan/faktur/${invoiceId}/edit${query}`)
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
  return api.post(`/sales-invoices/${invoiceId}/void`, voidPayload(), headers)
}

/**
 * VOID Sales Invoice bisa memicu DUA gerbang step-up INDEPENDEN sekaligus
 * (SalesInvoicesController.voidInvoice(), lihat komentar panjang di sana):
 *   - UNLOCK_PRINT (header x-authorization-request-id) -- semua role, HANYA
 *     kalau faktur sudah PRINTED. preflight() di backend selalu dicek LEBIH
 *     DULU daripada gerbang VOID_DOCUMENT.
 *   - VOID_DOCUMENT (header x-void-authorization-request-id) -- HANYA role
 *     OPERATOR, tidak peduli status cetak.
 *
 * useStepUp().withStepUp() generik cuma dirancang untuk SATU gerbang aktif
 * per panggilan (satu authorizationRequestId, satu header hardcoded
 * `x-authorization-request-id`, lihat useStepUp.ts). Operator+faktur PRINTED
 * butuh KEDUANYA. Kalau dipakai polos berantai, retry OTOMATIS withStepUp()
 * setelah gerbang pertama disetujui akan memanggil endpoint sungguhan yang
 * (untuk OPERATOR) langsung memicu 412 KEDUA -- dan pollOnce() di
 * useStepUp.ts salah menafsirkan 412 di tengah "retrying" sebagai "isi
 * permintaan berubah sejak disetujui" (kontrak CLAUDE.md §19), padahal itu
 * gerbang lain yang sah. Makanya alur di sini SENGAJA tidak membiarkan
 * retry-otomatis withStepUp() memanggil endpoint sungguhan selama masih
 * mungkin ada gerbang kedua menyusul -- lihat komentar di titik SKIP.
 *
 * Print status faktur sudah diketahui dari state `invoice` (dimuat sebelum
 * modal VOID bisa dibuka) -- dipakai untuk menentukan gerbang mana yang
 * SUNGGUH dipicu ronde pertama, jadi tidak perlu menebak dari isi 412.
 */
async function performVoid(): Promise<unknown> {
  const isPrinted = invoice.value?.printStatus === 'PRINTED'
  const firstHeaderKey = isPrinted ? 'x-authorization-request-id' : 'x-void-authorization-request-id'
  let firstHeaders: Record<string, string> = {}
  const SKIP = Symbol('void-round-one-skip')

  const roundOne = await withStepUp(async (headers) => {
    if (headers) {
      // Gerbang ronde pertama sudah disetujui -- SIMPAN headernya di slot
      // yang benar, tapi JANGAN panggil endpoint sungguhan di sini kalau
      // faktur PRINTED (gerbang VOID_DOCUMENT untuk OPERATOR masih mungkin
      // menyusul, lihat komentar fungsi di atas). Ronde kedua di bawah yang
      // memanggilnya.
      firstHeaders = { [firstHeaderKey]: headers['x-authorization-request-id'] as string }
      return SKIP
    }
    return callVoid()
  })
  if (roundOne !== SKIP) return roundOne // MASTER + faktur belum dicetak: tidak ada gerbang sama sekali, sudah selesai.

  if (!isPrinted) {
    // Ronde pertama SUDAH menyelesaikan satu-satunya gerbang (VOID_DOCUMENT
    // untuk OPERATOR) -- faktur yang belum pernah dicetak tidak punya
    // gerbang UNLOCK_PRINT sama sekali.
    return callVoid(firstHeaders)
  }

  // Sampai sini: faktur PRINTED dan ronde pertama baru menyelesaikan
  // UNLOCK_PRINT. Kalau role bukan OPERATOR, panggilan pertama di dalam
  // withStepUp() ini akan langsung sukses (tidak ada gerbang VOID_DOCUMENT
  // untuk MASTER) -- withStepUp() menangani itu transparan (action() sukses
  // tanpa throw, dialog tidak pernah tampil untuk ronde ini).
  return withStepUp(headers => callVoid({
    ...firstHeaders,
    ...(headers ? { 'x-void-authorization-request-id': headers['x-authorization-request-id'] as string } : {})
  }))
}

async function submitVoid() {
  if (!voidReasonCode.value.trim() || !voidReasonNote.value.trim()) {
    voidError.value = 'Kode alasan dan catatan alasan wajib diisi.'
    return
  }
  voidError.value = ''
  voidSubmitting.value = true
  // Tutup dulu -- StepUpDialog global sekarang punya z-index sendiri (Hari
  // 22, lihat StepUpDialog.vue) jadi ini tidak lagi wajib untuk visibilitas,
  // tapi tetap ditutup supaya operator tidak bisa mengubah alasan sementara
  // approval sedang berjalan.
  voidOpen.value = false
  try {
    await performVoid()
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

// --- Buat Surat Jalan (Hari 24, CLAUDE.md §1) --------------------------------
// Hanya untuk faktur bersaluran PENGIRIMAN -- faktur TOKO diserahkan di
// tempat, tidak pernah butuh SJ (DoD literal hari ini). Backend
// (DeliveryOrdersService.create()) yang jadi penjaga sesungguhnya (menolak
// TOKO/VOID/duplikat) -- guard `v-if` di sini murni supaya operator tidak
// disodori tombol yang pasti ditolak.
const deliveryOrderOpen = ref(false)
// Salesman yang mengantar & menagih (CLAUDE.md §1) -- "Agen" dan "Salesman"
// adalah orang yang sama (koreksi 26 Sep 2026), jadi dropdown ini memakai
// salesmanMap yang sudah dimuat di atas, bukan master terpisah lagi.
const deliverySalesmanId = ref<string | undefined>(undefined)
const deliveryVehicleId = ref<string | undefined>(undefined)
const deliveryDate = ref(new Date().toISOString().slice(0, 10))
const deliveryNotes = ref('')
const deliverySubmitting = ref(false)
const deliveryError = ref('')

const canCreateDeliveryOrder = computed(() =>
  invoice.value?.salesChannel === 'PENGIRIMAN' && invoice.value?.postingStatus !== 'VOIDED')

const deliverySalesmanOptions = computed<SelectOption[]>(() =>
  [...salesmanMap.value.values()].filter(s => s.isActive).map(s => ({ label: `${s.code} - ${s.name}`, value: s.id })))
const vehicleOptions = computed<SelectOption[]>(() =>
  [...vehicleMap.value.values()].filter(v => v.isActive).map(v => ({ label: `${v.code} - ${v.name}`, value: v.id })))

function openDeliveryOrderModal() {
  deliverySalesmanId.value = undefined
  deliveryVehicleId.value = undefined
  deliveryDate.value = new Date().toISOString().slice(0, 10)
  deliveryNotes.value = ''
  deliveryError.value = ''
  deliveryOrderOpen.value = true
}

async function submitDeliveryOrder() {
  if (!deliverySalesmanId.value || !deliveryVehicleId.value) {
    deliveryError.value = 'Salesman dan kendaraan wajib dipilih.'
    return
  }
  deliveryError.value = ''
  deliverySubmitting.value = true
  try {
    const created = await api.post<{ deliveryNumber: string }>('/delivery-orders', {
      salesInvoiceId: invoiceId,
      deliveryDate: deliveryDate.value,
      salesmanId: deliverySalesmanId.value,
      vehicleId: deliveryVehicleId.value,
      notes: deliveryNotes.value || undefined
    })
    deliveryOrderOpen.value = false
    toast.add({
      title: 'Surat jalan terbentuk',
      description: created.deliveryNumber,
      color: 'success'
    })
  } catch (err) {
    deliveryError.value = getErrorMessage(err, 'Gagal membuat surat jalan.')
  } finally {
    deliverySubmitting.value = false
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
        to="/penjualan/faktur"
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
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div class="flex flex-col gap-1">
            <span class="font-mono text-lg font-semibold">{{ invoice.invoiceNumber }}</span>
            <span
              v-if="invoice.revisionNumber > 0"
              class="text-xs text-muted"
            >Revisi {{ invoice.revisionNumber }}</span>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              v-if="canCreateDeliveryOrder"
              color="primary"
              variant="subtle"
              icon="i-lucide-truck"
              @click="openDeliveryOrderModal"
            >
              Buat Surat Jalan
            </UButton>
            <DocumentActions
              :posting-status="invoice.postingStatus"
              :print-status="invoice.printStatus"
              @print="handlePrint"
              @edit="goToEdit()"
              @void="openVoidModal()"
              @unlock-print="handleUnlockPrint"
            />
          </div>
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
          {{ customerLabel(invoice.customerId) }} · {{ CHANNEL_LABEL[invoice.salesChannel] }} · {{ salesmanLabel(invoice.salesmanId) }}
        </div>
        <div class="text-sm text-muted">
          Faktur {{ formatDate(invoice.invoiceDate) }} · Jth. Tempo {{ formatDate(invoice.dueDate) }} ({{ invoice.termDays }} hari)
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
          { key: 'productId', label: 'Produk', format: (v: unknown) => productLabel(v as string) },
          { key: 'qtyInput', label: 'Qty', align: 'right', format: (v: unknown) => qtyFmt(Number(v)) },
          { key: 'unitId', label: 'Satuan', format: (v: unknown) => unitLabel(v as string) },
          { key: 'unitPrice', label: 'Harga', align: 'right', format: (v: unknown) => rupiah(Number(v), { bare: true }) },
          { key: 'netAmount', label: 'Jumlah', align: 'right', format: (v: unknown) => rupiah(Number(v), { bare: true }) }
        ]"
        dense
        zebra
        :searchable="false"
      />

      <div class="flex flex-col gap-1 text-sm max-w-xs ml-auto">
        <div class="flex justify-between">
          <span class="text-muted">Subtotal</span>
          <span>{{ rupiah(Number(invoice.subtotal)) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">PPN Keluaran</span>
          <span>{{ rupiah(Number(invoice.outputVatAmount)) }}</span>
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
      title="VOID Faktur Penjualan"
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

    <!-- Buat Surat Jalan (Hari 24) -- hanya untuk faktur PENGIRIMAN -->
    <UModal
      v-model:open="deliveryOrderOpen"
      title="Buat Surat Jalan"
      description="Seluruh baris faktur ini disalin ke surat jalan. Tidak ada nilai rupiah -- surat jalan bukan dokumen uang."
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <UAlert
            v-if="deliveryError"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-triangle"
            :description="deliveryError"
          />
          <UFormField
            label="Tanggal Kirim"
            required
          >
            <UInput
              v-model="deliveryDate"
              type="date"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Salesman"
            required
          >
            <USelect
              v-model="deliverySalesmanId"
              :items="deliverySalesmanOptions"
              placeholder="Pilih salesman..."
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Kendaraan"
            required
          >
            <USelect
              v-model="deliveryVehicleId"
              :items="vehicleOptions"
              placeholder="Pilih kendaraan..."
              class="w-full"
            />
          </UFormField>
          <UFormField label="Catatan">
            <UTextarea
              v-model="deliveryNotes"
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
            @click="deliveryOrderOpen = false"
          >
            Batal
          </UButton>
          <UButton
            :loading="deliverySubmitting"
            :disabled="deliverySubmitting"
            @click="submitDeliveryOrder"
          >
            Buat Surat Jalan
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
