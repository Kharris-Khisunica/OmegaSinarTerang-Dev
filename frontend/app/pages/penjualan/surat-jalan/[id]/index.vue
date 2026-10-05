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
  notes: string | null
  lines: DeliveryOrderLine[]
}
interface InvoiceRef { invoiceNumber: string }

const route = useRoute()
const api = useApi()
const { withStepUp } = useStepUp()
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

// --- VOID: belum dibangun untuk Surat Jalan (sengaja ditunda, pola sama
// Retur Penjualan/Pembelian) -- DocumentActions tetap menampilkan tombolnya
// karena postingStatus selalu POSTED, jadi diberi pesan eksplisit alih-alih
// dead click senyap.
const unsupportedNotice = ref(false)
function showUnsupportedNotice() {
  unsupportedNotice.value = true
}

// --- Ubah Status Pengiriman (satu-satunya "edit" SJ, Hari 25) ---------------
// Digerbangi kunci cetak: kalau sudah PRINTED, backend menolak 412 tanpa
// alasan+approval (sopir sudah membawa lembar ke jalan) -- withStepUp()
// menangani dialog approval-nya secara transparan.
const statusOpen = ref(false)
const statusValue = ref<DeliveryStatus | null>(null)
const statusReason = ref('')
const statusSubmitting = ref(false)
const statusError = ref('')
const statusCancelledNotice = ref(false)

function openStatusModal(prefillReason = '') {
  if (!deliveryOrder.value) return
  statusValue.value = deliveryOrder.value.deliveryStatus
  statusReason.value = prefillReason
  statusError.value = ''
  statusCancelledNotice.value = false
  statusOpen.value = true
}

function handleUnlockPrint(payload: { intent: 'EDIT' | 'VOID', reason: string }) {
  if (payload.intent === 'EDIT') {
    openStatusModal(payload.reason)
  } else {
    showUnsupportedNotice()
  }
}

async function submitStatus() {
  if (!statusValue.value) {
    statusError.value = 'Pilih status pengiriman.'
    return
  }
  statusError.value = ''
  statusCancelledNotice.value = false
  statusSubmitting.value = true
  // Tutup dulu SEBELUM withStepUp -- <StepUpDialog> global dan modal ini
  // sama-sama UModal, pola sama PurchaseInvoicesController submitEdit().
  statusOpen.value = false
  try {
    await withStepUp(headers =>
      api.patch(
        `/delivery-orders/${deliveryId}/status`,
        { deliveryStatus: statusValue.value, reason: statusReason.value || undefined },
        headers
      )
    )
    await loadDeliveryOrder()
  } catch (err) {
    if (err instanceof StepUpCancelledError) {
      statusCancelledNotice.value = true
      return
    }
    statusOpen.value = true
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
        v-if="unsupportedNotice"
        color="neutral"
        variant="subtle"
        icon="i-lucide-info"
        title="Belum didukung"
        description="VOID surat jalan belum didukung."
        :close-button="{ icon: 'i-lucide-x', color: 'neutral', variant: 'link' }"
        @update:open="unsupportedNotice = false"
      />
      <UAlert
        v-if="statusCancelledNotice"
        color="neutral"
        variant="subtle"
        icon="i-lucide-x"
        title="Dibatalkan"
        description="Persetujuan dibatalkan sebelum selesai — status belum diubah."
        :close-button="{ icon: 'i-lucide-x', color: 'neutral', variant: 'link' }"
        @update:open="statusCancelledNotice = false"
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
          <DocumentActions
            :posting-status="deliveryOrder.postingStatus"
            :print-status="deliveryOrder.printStatus"
            @print="handlePrint"
            @edit="openStatusModal()"
            @void="showUnsupportedNotice"
            @unlock-print="handleUnlockPrint"
          />
          <!-- "Ubah" pada DocumentActions memicu modal ini (satu-satunya
               "edit" SJ, Hari 25: status pengiriman). Label tombolnya generik
               ("Ubah") karena komponennya dipakai 7 dokumen -- isinya baru
               diketahui di sini lewat modal yang terbuka. -->
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
            label="Alasan"
            hint="Wajib diisi kalau surat jalan sudah dicetak — sopir sudah membawa lembar ke jalan."
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
  </div>
</template>
