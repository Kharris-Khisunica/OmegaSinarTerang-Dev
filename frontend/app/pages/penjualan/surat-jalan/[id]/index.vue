<script setup lang="ts">
import type { CustomerLookup, ProductLookup, SalesmanLookup, UnitLookup, VehicleLookup } from '~/composables/useSalesInvoiceLookups'

definePageMeta({ title: 'Detail Surat Jalan', roles: ['MASTER', 'OPERATOR'] })

type PostingStatus = 'POSTED' | 'VOIDED'
type PrintStatus = 'NOT_PRINTED' | 'PRINTED' | 'PRINT_CANCELLED'
type DeliveryStatus = 'PENDING' | 'DELIVERED' | 'POSTPONED' | 'RETURNED'

interface DeliveryOrderLine {
  id: string
  productId: string
  unitId: string
  qtyInput: string
  qtyBaseUnit: string
}

interface DeliveryOrderDetail {
  id: string
  deliveryNumber: string
  deliveryDate: string
  salesInvoiceId: string
  customerId: string
  salesmanId: string
  vehicleId: string
  postingStatus: PostingStatus
  printStatus: PrintStatus
  deliveryStatus: DeliveryStatus
  printCount: number
  revisionNumber: number
  voidReasonCode: string | null
  voidReasonNote: string | null
  notes: string | null
  lines: DeliveryOrderLine[]
}
interface InvoiceRef { invoiceNumber: string }

const route = useRoute()
const api = useApi()
const { performDualGateVoid } = useDualGateVoid()
const { format: qtyFmt } = useQty()
const { loadCustomerMap, loadProductMap, loadUnitMap, loadSalesmanMap, loadVehicleMap } = useSalesInvoiceLookups()

const deliveryId = route.params.id as string

const deliveryOrder = ref<DeliveryOrderDetail | null>(null)
const invoiceNumber = ref('-')
const loading = ref(true)
const loadError = ref('')
const customerMap = ref<Map<string, CustomerLookup>>(new Map())
const productMap = ref<Map<string, ProductLookup>>(new Map())
const unitMap = ref<Map<string, UnitLookup>>(new Map())
const salesmanMap = ref<Map<string, SalesmanLookup>>(new Map())
const vehicleMap = ref<Map<string, VehicleLookup>>(new Map())

async function loadDeliveryOrder() {
  const detail = await api.get<DeliveryOrderDetail>(`/delivery-orders/${deliveryId}`)
  deliveryOrder.value = detail
  try {
    const invoice = await api.get<InvoiceRef>(`/sales-invoices/${detail.salesInvoiceId}`)
    invoiceNumber.value = invoice.invoiceNumber
  } catch {
    invoiceNumber.value = '-'
  }
}

onMounted(async () => {
  try {
    const [, customers, products, units, salesmen, vehicles] = await Promise.all([
      loadDeliveryOrder(),
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
    loadError.value = getErrorMessage(err, 'Gagal memuat detail surat jalan.')
  } finally {
    loading.value = false
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
  return salesmanMap.value.get(id)?.name ?? '-'
}
function vehicleLabel(id: string): string {
  return vehicleMap.value.get(id)?.name ?? '-'
}

const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  PENDING: 'Menunggu Kirim',
  DELIVERED: 'Terkirim',
  POSTPONED: 'Belum Terkirim',
  RETURNED: 'Dibawa Balik'
}
const DELIVERY_STATUS_COLOR: Record<DeliveryStatus, 'neutral' | 'success' | 'warning' | 'error'> = {
  PENDING: 'neutral',
  DELIVERED: 'success',
  POSTPONED: 'warning',
  RETURNED: 'error'
}

// --- Cetak -- navigasi ke halaman cetak (§13.1/§13.3 PANDUAN_UI.md), BUKAN
// panggil POST .../print langsung di sini -- registrasi cetak (print_count/
// printed_at, CLAUDE.md §2.16) terjadi di halaman cetak itu sendiri, satu
// klik bareng window.print() supaya operator selalu melihat NOTA sungguhan
// yang tercetak, bukan sekadar menaikkan angka tanpa output visual (pola
// sama Faktur Penjualan Hari 22).
function handlePrint() {
  navigateTo(`/penjualan/surat-jalan/${deliveryId}/cetak`)
}

// --- VOID (need_fixing.md #18) ------------------------------------------------
// Dua gerbang INDEPENDEN, persis Faktur Penjualan: UNLOCK_PRINT
// (x-authorization-request-id, semua role, hanya kalau PRINTED, dicek lebih
// dulu) dan VOID_DOCUMENT (x-void-authorization-request-id, hanya OPERATOR).
// Alur performVoid() sama dengan penjualan/faktur/[id]/index.vue -- baca
// komentar panjang di sana.
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

function callVoid(headers?: Record<string, string>) {
  return api.post(
    `/delivery-orders/${deliveryId}/void`,
    { reasonCode: voidReasonCode.value, reasonNote: voidReasonNote.value },
    headers
  )
}

// Dua gerbang VOID (UNLOCK_PRINT + VOID_DOCUMENT) — penjelasan lengkap di
// composables/useDualGateVoid.ts.
function performVoid(): Promise<unknown> {
  return performDualGateVoid(deliveryOrder.value?.printStatus === 'PRINTED', callVoid)
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
    await loadDeliveryOrder()
  } catch (err) {
    voidOpen.value = true
    if (err instanceof StepUpCancelledError) {
      voidError.value = 'Persetujuan dibatalkan — surat jalan belum dibatalkan.'
      return
    }
    voidError.value = getErrorMessage(err, 'Gagal membatalkan surat jalan.')
  } finally {
    voidSubmitting.value = false
  }
}

// --- Ubah Status Pengiriman (satu-satunya "edit" SJ, Hari 25) ---------------
// BEBAS kunci cetak sejak need_fixing.md #18 -- SJ selalu dicetak sebelum
// sopir berangkat; status kirim bukan isi lembar. Tanpa withStepUp().
const statusOpen = ref(false)
const statusValue = ref<DeliveryStatus | null>(null)
const statusReason = ref('')
const statusSubmitting = ref(false)
const statusError = ref('')

function openStatusModal() {
  if (!deliveryOrder.value) return
  statusValue.value = deliveryOrder.value.deliveryStatus
  statusReason.value = ''
  statusError.value = ''
  statusOpen.value = true
}

// DocumentActions dipasang `no-edit` -- Batal Cetak hanya bisa ber-niat VOID.
function handleUnlockPrint(payload: { intent: 'EDIT' | 'VOID', reason: string }) {
  if (payload.intent === 'VOID') openVoidModal(payload.reason)
}

async function submitStatus() {
  if (!statusValue.value) {
    statusError.value = 'Pilih status pengiriman.'
    return
  }
  statusError.value = ''
  statusSubmitting.value = true
  try {
    await api.patch(
      `/delivery-orders/${deliveryId}/status`,
      { deliveryStatus: statusValue.value, reason: statusReason.value || undefined }
    )
    statusOpen.value = false
    await loadDeliveryOrder()
  } catch (err) {
    statusError.value = getErrorMessage(err, 'Gagal mengubah status pengiriman.')
  } finally {
    statusSubmitting.value = false
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
        to="/penjualan/surat-jalan"
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
      v-else-if="deliveryOrder"
      class="flex flex-col gap-4"
    >
      <UAlert
        v-if="deliveryOrder.postingStatus === 'VOIDED'"
        color="error"
        variant="subtle"
        icon="i-lucide-ban"
        title="Surat jalan ini sudah VOID"
        :description="`${deliveryOrder.voidReasonCode ?? ''} — ${deliveryOrder.voidReasonNote ?? ''}`"
      />

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div class="flex flex-col gap-1">
            <span class="font-mono text-lg font-semibold">{{ deliveryOrder.deliveryNumber }}</span>
            <span
              v-if="deliveryOrder.revisionNumber > 0"
              class="text-xs text-muted"
            >Revisi {{ deliveryOrder.revisionNumber }}</span>
          </div>
          <div class="flex items-center gap-2">
            <!-- Status kirim bebas kunci cetak (#18) -- tombol sendiri, tetap
                 tampil walau SJ sudah dicetak. -->
            <UButton
              v-if="deliveryOrder.postingStatus === 'POSTED'"
              icon="i-lucide-truck"
              color="neutral"
              variant="subtle"
              @click="openStatusModal()"
            >
              Ubah Status Kirim
            </UButton>
            <DocumentActions
              :posting-status="deliveryOrder.postingStatus"
              :print-status="deliveryOrder.printStatus"
              no-edit
              @print="handlePrint"
              @void="openVoidModal()"
              @unlock-print="handleUnlockPrint"
            />
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <DocumentStatusBadges
            :posting-status="deliveryOrder.postingStatus"
            :print-status="deliveryOrder.printStatus"
          />
          <UBadge
            :color="DELIVERY_STATUS_COLOR[deliveryOrder.deliveryStatus]"
            variant="subtle"
            icon="i-lucide-truck"
          >
            {{ DELIVERY_STATUS_LABEL[deliveryOrder.deliveryStatus] }}
          </UBadge>
        </div>

        <div class="text-sm text-muted">
          {{ customerLabel(deliveryOrder.customerId) }} · {{ formatDate(deliveryOrder.deliveryDate) }}
        </div>
        <div class="text-sm text-muted">
          Salesman: {{ salesmanLabel(deliveryOrder.salesmanId) }} · Kendaraan: {{ vehicleLabel(deliveryOrder.vehicleId) }}
          ·
          <NuxtLink
            :to="`/penjualan/faktur/${deliveryOrder.salesInvoiceId}`"
            class="underline"
          >
            Lihat faktur asal ({{ invoiceNumber }})
          </NuxtLink>
        </div>
        <div
          v-if="deliveryOrder.notes"
          class="text-sm"
        >
          {{ deliveryOrder.notes }}
        </div>
      </div>

      <!-- Tanpa nilai rupiah sama sekali -- surat jalan bukan dokumen uang
           (CLAUDE.md §1 "nota dibawa sopir untuk menagih", bukan surat
           jalan). Dilarang panggil useRupiah()/baca harga di sini. -->
      <DataTable
        :rows="deliveryOrder.lines as unknown as Record<string, unknown>[]"
        :columns="[
          { key: 'productId', label: 'Produk', format: (v: unknown) => productLabel(v as string) },
          { key: 'unitId', label: 'Satuan', format: (v: unknown) => unitLabel(v as string) },
          { key: 'qtyInput', label: 'Qty', align: 'right', format: (v: unknown) => qtyFmt(Number(v)) }
        ]"
        dense
        zebra
        :searchable="false"
      />
    </div>

    <!-- Ubah Status Pengiriman -->
    <UModal
      v-model:open="statusOpen"
      title="Ubah Status Pengiriman"
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <UAlert
            v-if="statusError"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-triangle"
            :description="statusError"
          />
          <UFormField
            label="Status"
            required
          >
            <UFieldGroup>
              <UButton
                v-for="key in (['PENDING', 'DELIVERED', 'POSTPONED', 'RETURNED'] as DeliveryStatus[])"
                :key="key"
                :color="statusValue === key ? 'primary' : 'neutral'"
                :variant="statusValue === key ? 'solid' : 'subtle'"
                @click="statusValue = key"
              >
                {{ DELIVERY_STATUS_LABEL[key] }}
              </UButton>
            </UFieldGroup>
          </UFormField>
          <UFormField
            label="Keterangan"
            hint="Opsional — tercatat di jejak audit."
          >
            <UTextarea
              v-model="statusReason"
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
            @click="statusOpen = false"
          >
            Batal
          </UButton>
          <UButton
            :loading="statusSubmitting"
            :disabled="statusSubmitting"
            @click="submitStatus"
          >
            Simpan
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- VOID Surat Jalan -->
    <UModal
      v-model:open="voidOpen"
      title="VOID Surat Jalan"
      description="Surat jalan dibatalkan; faktur asalnya boleh dibuatkan surat jalan baru."
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
              placeholder="mis. SALAH_INPUT"
              class="w-full"
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
