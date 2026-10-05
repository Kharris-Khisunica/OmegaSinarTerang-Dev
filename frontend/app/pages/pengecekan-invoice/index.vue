<script setup lang="ts">
import type { Column, FilterDef } from '~/types/data-table'
import type { CustomerLookup, ProductLookup as SalesProductLookup } from '~/composables/useSalesInvoiceLookups'
import type { SupplierLookup, ProductLookup as PurchaseProductLookup } from '~/composables/usePurchaseInvoiceLookups'

// Pengecekan Invoice Harian (Hari 22A, CLAUDE.md §5) -- salah satu dari 3
// menu Supervisor. TIDAK ADA endpoint /supervisor/* baru (KONTEKS_REVISI
// §2.2) -- daftar & review sama-sama lewat GET/PATCH /sales-invoices &
// /purchase-invoices yang sudah dipakai halaman operator, sengaja dipakai
// ulang di sini.
definePageMeta({ title: 'Pengecekan Invoice Harian', roles: ['MASTER', 'SUPERVISOR'] })

type ReviewStatus = 'BELUM_DICEK' | 'DISETUJUI' | 'BERMASALAH'
// CASH_TRANSFER (paket R9, KB1 -> Pindah Buku Kas) -- approval SETELAH-FAKTA
// lewat reviewStatus, pola SAMA SALES/PURCHASE (PATCH .../:id/review, dua
// kolom saja), tapi dokumennya TIDAK punya printStatus/baris produk sama
// sekali (bukan salah satu dari 7 dokumen kunci cetak §2.16) -- lihat
// cabang khusus di computed detail* dan template di bawah.
// OPERATIONAL_EXPENSE (Hari 32A FE, paket R10) -- approval SETELAH-FAKTA
// lewat reviewStatus, pola SAMA CASH_TRANSFER, tapi baris-nya BUKAN produk
// (akun biaya + nominal + keterangan) dan dokumennya TIDAK punya
// postingStatus di level header sama sekali (VOID cuma per baris, lihat
// operational-expense-line.entity.ts) -- cabang detail sendiri di bawah,
// tidak dipaksa masuk bentuk CASH_TRANSFER/SALES/PURCHASE.
type DocType = 'SALES' | 'PURCHASE' | 'CASH_TRANSFER' | 'OPERATIONAL_EXPENSE'

interface SalesRow extends Record<string, unknown> {
  id: string
  invoiceNumber: string
  customerId: string
  invoiceDate: string
  totalAmount: string
  reviewStatus: ReviewStatus
  paymentDiscrepancyFlagged: boolean
}
interface PurchaseRow extends Record<string, unknown> {
  id: string
  invoiceNumber: string
  supplierId: string
  receiptDate: string
  totalAmount: string
  reviewStatus: ReviewStatus
  paymentDiscrepancyFlagged: boolean
}
interface CashTransferRow extends Record<string, unknown> {
  id: string
  documentNumber: string
  transferDate: string
  amount: number
  fromCashAccountName: string
  toCashAccountName: string
  reviewStatus: ReviewStatus
}
interface OperationalExpenseRow extends Record<string, unknown> {
  id: string
  documentNumber: string
  expenseDate: string
  cashAccountId: string
  totalAmount: number
  reviewStatus: ReviewStatus
}

interface SalesInvoiceLineDetail {
  productId: string
  qtyInput: string
  unitPrice: string
  netAmount: string
}
interface PurchaseInvoiceLineDetail {
  productId: string
  qtyInput: string
  unitPrice: string
  lineFinalAmount: string
}
interface SalesInvoiceDetail {
  id: string
  invoiceNumber: string
  customerId: string
  invoiceDate: string
  totalAmount: string
  postingStatus: 'POSTED' | 'VOIDED'
  printStatus: 'NOT_PRINTED' | 'PRINTED' | 'PRINT_CANCELLED'
  reviewStatus: ReviewStatus
  reviewNote: string | null
  paymentDiscrepancyFlagged: boolean
  lines: SalesInvoiceLineDetail[]
}
interface PurchaseInvoiceDetail {
  id: string
  invoiceNumber: string
  supplierId: string
  receiptDate: string
  totalAmount: string
  postingStatus: 'POSTED' | 'VOIDED'
  printStatus: 'NOT_PRINTED' | 'PRINTED' | 'PRINT_CANCELLED'
  reviewStatus: ReviewStatus
  reviewNote: string | null
  paymentDiscrepancyFlagged: boolean
  lines: PurchaseInvoiceLineDetail[]
}
interface CashTransferDetail {
  id: string
  documentNumber: string
  transferDate: string
  amount: number
  fromCashAccountName: string
  toCashAccountName: string
  note: string | null
  postingStatus: 'POSTED' | 'VOIDED'
  reviewStatus: ReviewStatus
  reviewNote: string | null
}
interface OperationalExpenseLineDetail {
  id: string
  expenseAccountId: string
  amount: string
  description: string | null
  postingStatus: 'POSTED' | 'VOIDED'
}
interface OperationalExpenseDetail {
  id: string
  documentNumber: string
  expenseDate: string
  cashAccountId: string
  totalAmount: number
  reviewStatus: ReviewStatus
  reviewNote: string | null
  lines: OperationalExpenseLineDetail[]
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
const toast = useToast()
const { format: rupiah } = useRupiah()
const { format: qtyFmt } = useQty()
const { loadCustomerMap, loadProductMap: loadSalesProductMap } = useSalesInvoiceLookups()
const { loadSupplierMap, loadProductMap: loadPurchaseProductMap } = usePurchaseInvoiceLookups()

function ddmmyyyy(value: string | null | undefined): string {
  return formatDate(value).split('/').join('-')
}
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

// ---- Lookup nama pelanggan/supplier/produk -- daftar ini murni id, sama
// seperti GET /sales-invoices & /purchase-invoices yang dipakai halaman
// operator (tidak ada join nama di response). ------------------------------
const customerMap = ref<Map<string, CustomerLookup>>(new Map())
const supplierMap = ref<Map<string, SupplierLookup>>(new Map())
const salesProductMap = ref<Map<string, SalesProductLookup>>(new Map())
const purchaseProductMap = ref<Map<string, PurchaseProductLookup>>(new Map())

function customerLabel(id: string): string {
  const c = customerMap.value.get(id)
  return c ? `${c.code} - ${c.name}` : '-'
}
function supplierLabel(id: string): string {
  const s = supplierMap.value.get(id)
  return s ? `${s.displayCode} - ${s.name}` : '-'
}
function salesProductLabel(id: string): string {
  const p = salesProductMap.value.get(id)
  return p ? `${p.displayName} (${p.code})` : id
}
function purchaseProductLabel(id: string): string {
  const p = purchaseProductMap.value.get(id)
  return p ? `${p.displayName} (${p.code})` : id
}

// Tab Biaya Operasional (Hari 32A FE) -- GET /operational-expenses tidak
// join nama akun (pola sama sales/purchase di atas), jadi butuh lookup
// sendiri. Kedua endpoint sudah terbuka semua role login (pola sama
// findCashAccounts()/findExpenseAccounts() -- bukan GET /chart-of-accounts
// penuh yang MASTER+SUPERVISOR saja, meski halaman ini toh sudah MASTER+
// SUPERVISOR, dipakai ulang endpoint yang sama supaya tidak ada jalur ketiga).
interface NamedAccount { id: string, code: string, name: string }
const cashAccountMap = ref<Map<string, NamedAccount>>(new Map())
const expenseAccountMap = ref<Map<string, NamedAccount>>(new Map())
// Kasbon (akun `is_employee_receivable_account`, ASSET) SENGAJA tidak ikut
// /operational-expenses/expense-accounts (itu cuma EXPENSE) -- tanpa ini,
// baris Kasbon di detail tampil sebagai UUID mentah, bukan "Piutang Karyawan".
const kasbonAccount = ref<NamedAccount | null>(null)
function cashAccountLabel(id: string): string {
  const a = cashAccountMap.value.get(id)
  return a ? `${a.code} - ${a.name}` : '-'
}
function expenseAccountLabel(id: string): string {
  if (id === kasbonAccount.value?.id) return `${kasbonAccount.value.code} - ${kasbonAccount.value.name} (Kasbon)`
  const a = expenseAccountMap.value.get(id)
  return a ? `${a.code} - ${a.name}` : id
}

onMounted(async () => {
  const [customers, suppliers, salesProducts, purchaseProducts, cashAccounts, expenseAccounts, kasbon] = await Promise.all([
    loadCustomerMap(), loadSupplierMap(), loadSalesProductMap(), loadPurchaseProductMap(),
    api.get<NamedAccount[]>('/chart-of-accounts/cash-accounts'),
    api.get<NamedAccount[]>('/operational-expenses/expense-accounts'),
    api.get<NamedAccount | null>('/operational-expenses/employee-receivable-account')
  ])
  customerMap.value = customers
  supplierMap.value = suppliers
  salesProductMap.value = salesProducts
  purchaseProductMap.value = purchaseProducts
  cashAccountMap.value = new Map(cashAccounts.map(a => [a.id, a]))
  expenseAccountMap.value = new Map(expenseAccounts.map(a => [a.id, a]))
  kasbonAccount.value = kasbon
})

// ---- Dua tab dokumen -- GET /sales-invoices & /purchase-invoices TETAP
// endpoint yang sama dipakai operator, cuma disaring lewat filter di sini
// (KONTEKS_REVISI §2.2: dilarang endpoint /supervisor/* terpisah). ----------
const activeTab = ref<DocType>('SALES')

// Default "hari ini" + BELUM_DICEK (CLAUDE.md §5 -- pengecekan harian) --
// dipakai lewat FilterDef.default (DataTable.vue) supaya tetap terlihat &
// bisa diubah manual oleh supervisor (bukan dipaksa selamanya).
const filters: FilterDef[] = [
  { key: 'date', label: 'Tanggal', type: 'date', default: todayIso() },
  {
    key: 'reviewStatus',
    label: 'Pengecekan',
    type: 'select',
    default: 'BELUM_DICEK',
    options: [
      { label: 'Belum Dicek', value: 'BELUM_DICEK' },
      { label: 'Disetujui', value: 'DISETUJUI' },
      { label: 'Bermasalah', value: 'BERMASALAH' }
    ]
  }
]

const salesColumns: Column<SalesRow>[] = [
  { key: 'invoiceNumber', label: 'No. Faktur', mono: true },
  { key: 'customerId', label: 'Pelanggan', format: v => customerLabel(v as string) },
  { key: 'invoiceDate', label: 'Tanggal', format: v => ddmmyyyy(v as string) },
  { key: 'totalAmount', label: 'Nominal', align: 'right', format: v => rupiah(Number(v), { bare: true }) },
  { key: 'reviewStatus', label: 'Status', align: 'center', slot: 'statusBadge' },
  { key: 'id', label: '', align: 'center', slot: 'detailBtn' }
]
const purchaseColumns: Column<PurchaseRow>[] = [
  { key: 'invoiceNumber', label: 'No. Faktur', mono: true },
  { key: 'supplierId', label: 'Supplier', format: v => supplierLabel(v as string) },
  { key: 'receiptDate', label: 'Tanggal', format: v => ddmmyyyy(v as string) },
  { key: 'totalAmount', label: 'Nominal', align: 'right', format: v => rupiah(Number(v), { bare: true }) },
  { key: 'reviewStatus', label: 'Status', align: 'center', slot: 'statusBadge' },
  { key: 'id', label: '', align: 'center', slot: 'detailBtn' }
]
// Pindah Buku Kas (paket R9) -- endpoint & filter keys (`date`/`reviewStatus`)
// SAMA dengan sales/purchase invoices (CashTransferQueryDto, paket R9 BE),
// jadi `filters` di atas dipakai ULANG apa adanya, tidak ada filter baru.
const cashTransferColumns: Column<CashTransferRow>[] = [
  { key: 'documentNumber', label: 'No. Bukti', mono: true },
  { key: 'fromCashAccountName', label: 'Dari' },
  { key: 'toCashAccountName', label: 'Ke' },
  { key: 'transferDate', label: 'Tanggal', format: v => ddmmyyyy(v as string) },
  { key: 'amount', label: 'Nominal', align: 'right', format: v => rupiah(Number(v), { bare: true }) },
  { key: 'reviewStatus', label: 'Status', align: 'center', slot: 'statusBadge' },
  { key: 'id', label: '', align: 'center', slot: 'detailBtn' }
]
// Biaya Operasional (Hari 32A FE) -- endpoint & filter keys (`date`/
// `reviewStatus`) SAMA (OperationalExpenseQueryDto, paket R10 BE).
const operationalExpenseColumns: Column<OperationalExpenseRow>[] = [
  { key: 'documentNumber', label: 'No. Bukti', mono: true },
  { key: 'cashAccountId', label: 'Akun Kas', format: v => cashAccountLabel(v as string) },
  { key: 'expenseDate', label: 'Tanggal', format: v => ddmmyyyy(v as string) },
  { key: 'totalAmount', label: 'Nominal', align: 'right', format: v => rupiah(Number(v), { bare: true }) },
  { key: 'reviewStatus', label: 'Status', align: 'center', slot: 'statusBadge' },
  { key: 'id', label: '', align: 'center', slot: 'detailBtn' }
]

const salesTable = ref()
const purchaseTable = ref()
const cashTransferTable = ref()
const operationalExpenseTable = ref()

// ---- Detail (slideover, READ-ONLY -- tidak ada Ubah/VOID di sini sama
// sekali, CLAUDE.md §5 "Supervisor tidak pernah menulis ke faktur" selain
// lewat review()). --------------------------------------------------------
const detailOpen = ref(false)
const detailType = ref<DocType>('SALES')
const detailId = ref('')
const salesDetail = ref<SalesInvoiceDetail | null>(null)
const purchaseDetail = ref<PurchaseInvoiceDetail | null>(null)
const cashTransferDetail = ref<CashTransferDetail | null>(null)
const operationalExpenseDetail = ref<OperationalExpenseDetail | null>(null)
const detailStatus = ref<'pending' | 'success' | 'error'>('pending')
const detailError = ref('')

async function openDetail(row: SalesRow | PurchaseRow | CashTransferRow | OperationalExpenseRow, type: DocType) {
  detailType.value = type
  detailId.value = row.id
  detailOpen.value = true
  salesDetail.value = null
  purchaseDetail.value = null
  cashTransferDetail.value = null
  operationalExpenseDetail.value = null
  detailStatus.value = 'pending'
  try {
    if (type === 'SALES') {
      salesDetail.value = await api.get<SalesInvoiceDetail>(`/sales-invoices/${row.id}`)
    } else if (type === 'PURCHASE') {
      purchaseDetail.value = await api.get<PurchaseInvoiceDetail>(`/purchase-invoices/${row.id}`)
    } else if (type === 'CASH_TRANSFER') {
      cashTransferDetail.value = await api.get<CashTransferDetail>(`/cash-transfers/${row.id}`)
    } else {
      operationalExpenseDetail.value = await api.get<OperationalExpenseDetail>(`/operational-expenses/${row.id}`)
    }
    detailStatus.value = 'success'
  } catch (err) {
    detailStatus.value = 'error'
    detailError.value = getErrorMessage(err, 'Gagal memuat detail dokumen.')
  }
}

const detailNumber = computed(() => {
  if (detailType.value === 'SALES') return salesDetail.value?.invoiceNumber
  if (detailType.value === 'PURCHASE') return purchaseDetail.value?.invoiceNumber
  if (detailType.value === 'OPERATIONAL_EXPENSE') return operationalExpenseDetail.value?.documentNumber
  return cashTransferDetail.value?.documentNumber
})
const detailPartyLabel = computed(() => {
  if (detailType.value === 'SALES') return salesDetail.value ? customerLabel(salesDetail.value.customerId) : '-'
  if (detailType.value === 'PURCHASE') return purchaseDetail.value ? supplierLabel(purchaseDetail.value.supplierId) : '-'
  if (detailType.value === 'OPERATIONAL_EXPENSE') return operationalExpenseDetail.value ? cashAccountLabel(operationalExpenseDetail.value.cashAccountId) : '-'
  return cashTransferDetail.value ? `${cashTransferDetail.value.fromCashAccountName} -> ${cashTransferDetail.value.toCashAccountName}` : '-'
})
const detailDate = computed(() => {
  if (detailType.value === 'SALES') return salesDetail.value?.invoiceDate
  if (detailType.value === 'PURCHASE') return purchaseDetail.value?.receiptDate
  if (detailType.value === 'OPERATIONAL_EXPENSE') return operationalExpenseDetail.value?.expenseDate
  return cashTransferDetail.value?.transferDate
})
const detailTotal = computed(() => {
  if (detailType.value === 'SALES') return Number(salesDetail.value?.totalAmount ?? 0)
  if (detailType.value === 'PURCHASE') return Number(purchaseDetail.value?.totalAmount ?? 0)
  if (detailType.value === 'OPERATIONAL_EXPENSE') return Number(operationalExpenseDetail.value?.totalAmount ?? 0)
  return Number(cashTransferDetail.value?.amount ?? 0)
})
const detailPostingStatus = computed(() => {
  if (detailType.value === 'SALES') return salesDetail.value?.postingStatus
  if (detailType.value === 'PURCHASE') return purchaseDetail.value?.postingStatus
  // operational_expense_documents TIDAK punya postingStatus di level header
  // (VOID cuma per baris) -- tetap undefined di sini, cabang badge sendiri
  // di template (lihat v-else-if="detailType === 'OPERATIONAL_EXPENSE'").
  if (detailType.value === 'OPERATIONAL_EXPENSE') return undefined
  return cashTransferDetail.value?.postingStatus
})
// cash_transfers/operational_expenses TIDAK punya printStatus (bukan salah
// satu dari 7 dokumen kunci cetak §2.16) -- <DocumentStatusBadges> tidak
// dipakai untuk kedua tab ini di template.
const detailPrintStatus = computed(() => (detailType.value === 'SALES' ? salesDetail.value?.printStatus : detailType.value === 'PURCHASE' ? purchaseDetail.value?.printStatus : undefined))
const detailReviewStatus = computed(() => {
  if (detailType.value === 'SALES') return salesDetail.value?.reviewStatus
  if (detailType.value === 'PURCHASE') return purchaseDetail.value?.reviewStatus
  if (detailType.value === 'OPERATIONAL_EXPENSE') return operationalExpenseDetail.value?.reviewStatus
  return cashTransferDetail.value?.reviewStatus
})
const detailReviewNote = computed(() => {
  if (detailType.value === 'SALES') return salesDetail.value?.reviewNote
  if (detailType.value === 'PURCHASE') return purchaseDetail.value?.reviewNote
  if (detailType.value === 'OPERATIONAL_EXPENSE') return operationalExpenseDetail.value?.reviewNote
  return cashTransferDetail.value?.reviewNote
})
const detailPaymentDiscrepancy = computed(() => (detailType.value === 'SALES' ? salesDetail.value?.paymentDiscrepancyFlagged : detailType.value === 'PURCHASE' ? purchaseDetail.value?.paymentDiscrepancyFlagged : false) ?? false)

interface DetailLineView { productId: string, qty: number, unitPrice: number, amount: number, label: string }
const detailLines = computed<DetailLineView[]>(() => {
  if (detailType.value === 'SALES' && salesDetail.value) {
    return salesDetail.value.lines.map(l => ({
      productId: l.productId,
      qty: Number(l.qtyInput),
      unitPrice: Number(l.unitPrice),
      amount: Number(l.netAmount),
      label: salesProductLabel(l.productId)
    }))
  }
  if (detailType.value === 'PURCHASE' && purchaseDetail.value) {
    return purchaseDetail.value.lines.map(l => ({
      productId: l.productId,
      qty: Number(l.qtyInput),
      unitPrice: Number(l.unitPrice),
      amount: Number(l.lineFinalAmount),
      label: purchaseProductLabel(l.productId)
    }))
  }
  return []
})

// ---- Aksi: Setujui / Tandai Bermasalah -- HANYA menulis 2 kolom review
// lewat PATCH .../:id/review (SalesInvoicesService.review() /
// PurchaseInvoicesService.review(), Hari 22A BE) -- tidak pernah menyentuh
// isi faktur. -------------------------------------------------------------
const reviewBusy = ref(false)
const bermasalahOpen = ref(false)
const bermasalahNote = ref('')

function reloadActiveTable() {
  if (detailType.value === 'SALES') salesTable.value?.reload()
  else if (detailType.value === 'PURCHASE') purchaseTable.value?.reload()
  else if (detailType.value === 'OPERATIONAL_EXPENSE') operationalExpenseTable.value?.reload()
  else cashTransferTable.value?.reload()
}

const REVIEW_ENDPOINT: Record<DocType, string> = {
  SALES: 'sales-invoices',
  PURCHASE: 'purchase-invoices',
  CASH_TRANSFER: 'cash-transfers',
  OPERATIONAL_EXPENSE: 'operational-expenses'
}

async function submitReview(status: 'DISETUJUI' | 'BERMASALAH', note?: string) {
  reviewBusy.value = true
  try {
    const endpoint = `/${REVIEW_ENDPOINT[detailType.value]}/${detailId.value}/review`
    await api.patch(endpoint, { reviewStatus: status, reviewNote: note })
    const kind = detailType.value === 'CASH_TRANSFER'
      ? 'Pindah Buku Kas'
      : detailType.value === 'OPERATIONAL_EXPENSE'
        ? 'Bukti Kas Keluar'
        : 'Faktur'
    toast.add({
      title: status === 'DISETUJUI' ? `${kind} disetujui` : `${kind} ditandai bermasalah`,
      description: detailNumber.value,
      color: status === 'DISETUJUI' ? 'success' : 'error'
    })
    detailOpen.value = false
    reloadActiveTable()
  } catch (err) {
    toast.add({ title: 'Gagal menyimpan pengecekan', description: getErrorMessage(err, 'Terjadi kesalahan.'), color: 'error' })
  } finally {
    reviewBusy.value = false
  }
}

function approve() {
  submitReview('DISETUJUI')
}
function openBermasalahForm() {
  bermasalahNote.value = ''
  bermasalahOpen.value = true
}
function confirmBermasalah() {
  if (!bermasalahNote.value.trim()) return
  bermasalahOpen.value = false
  submitReview('BERMASALAH', bermasalahNote.value.trim())
}
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader />

    <div class="flex flex-wrap gap-1 border-b border-default pb-2">
      <UButton
        size="sm"
        :color="activeTab === 'SALES' ? 'primary' : 'neutral'"
        :variant="activeTab === 'SALES' ? 'solid' : 'ghost'"
        @click="activeTab = 'SALES'"
      >
        Faktur Penjualan
      </UButton>
      <UButton
        size="sm"
        :color="activeTab === 'PURCHASE' ? 'primary' : 'neutral'"
        :variant="activeTab === 'PURCHASE' ? 'solid' : 'ghost'"
        @click="activeTab = 'PURCHASE'"
      >
        Faktur Pembelian
      </UButton>
      <UButton
        size="sm"
        :color="activeTab === 'CASH_TRANSFER' ? 'primary' : 'neutral'"
        :variant="activeTab === 'CASH_TRANSFER' ? 'solid' : 'ghost'"
        @click="activeTab = 'CASH_TRANSFER'"
      >
        Pindah Buku Kas
      </UButton>
      <UButton
        size="sm"
        :color="activeTab === 'OPERATIONAL_EXPENSE' ? 'primary' : 'neutral'"
        :variant="activeTab === 'OPERATIONAL_EXPENSE' ? 'solid' : 'ghost'"
        @click="activeTab = 'OPERATIONAL_EXPENSE'"
      >
        Biaya Operasional
      </UButton>
    </div>

    <DataTable
      v-if="activeTab === 'SALES'"
      ref="salesTable"
      endpoint="/sales-invoices"
      :columns="salesColumns"
      :filters="filters"
      dense
      zebra
      search-placeholder="Cari nomor faktur..."
      :default-sort="{ key: 'invoiceDate', dir: 'desc' }"
      :row-class="(row) => row.reviewStatus === 'BERMASALAH' ? 'bg-error/10' : ''"
    >
      <template #statusBadge="{ value, row }">
        <div class="flex items-center justify-center gap-1">
          <UBadge
            :color="REVIEW_COLOR[value as ReviewStatus]"
            variant="subtle"
          >
            {{ REVIEW_LABEL[value as ReviewStatus] }}
          </UBadge>
          <UTooltip
            v-if="(row as SalesRow).paymentDiscrepancyFlagged"
            text="Selisih pembayaran > Rp 10.000"
          >
            <UIcon
              name="i-lucide-badge-alert"
              class="text-warning size-4"
            />
          </UTooltip>
        </div>
      </template>
      <template #detailBtn="{ row }">
        <UButton
          icon="i-lucide-eye"
          size="xs"
          color="neutral"
          variant="subtle"
          @click="openDetail(row as SalesRow, 'SALES')"
        >
          Detail
        </UButton>
      </template>
    </DataTable>

    <DataTable
      v-else-if="activeTab === 'PURCHASE'"
      ref="purchaseTable"
      endpoint="/purchase-invoices"
      :columns="purchaseColumns"
      :filters="filters"
      dense
      zebra
      search-placeholder="Cari nomor faktur..."
      :default-sort="{ key: 'receiptDate', dir: 'desc' }"
      :row-class="(row) => row.reviewStatus === 'BERMASALAH' ? 'bg-error/10' : ''"
    >
      <template #statusBadge="{ value, row }">
        <div class="flex items-center justify-center gap-1">
          <UBadge
            :color="REVIEW_COLOR[value as ReviewStatus]"
            variant="subtle"
          >
            {{ REVIEW_LABEL[value as ReviewStatus] }}
          </UBadge>
          <UTooltip
            v-if="(row as PurchaseRow).paymentDiscrepancyFlagged"
            text="Selisih pembayaran > Rp 10.000"
          >
            <UIcon
              name="i-lucide-badge-alert"
              class="text-warning size-4"
            />
          </UTooltip>
        </div>
      </template>
      <template #detailBtn="{ row }">
        <UButton
          icon="i-lucide-eye"
          size="xs"
          color="neutral"
          variant="subtle"
          @click="openDetail(row as PurchaseRow, 'PURCHASE')"
        >
          Detail
        </UButton>
      </template>
    </DataTable>

    <!-- Pindah Buku Kas (paket R9) -- endpoint & kolom filter (date/reviewStatus)
         SAMA dengan dua tab di atas, tidak ada paymentDiscrepancyFlagged di
         sini (konsep itu murni faktur, CLAUDE.md §2.18). -->
    <DataTable
      v-else-if="activeTab === 'CASH_TRANSFER'"
      ref="cashTransferTable"
      endpoint="/cash-transfers"
      :columns="cashTransferColumns"
      :filters="filters"
      dense
      zebra
      search-placeholder="Cari nomor bukti..."
      :default-sort="{ key: 'transferDate', dir: 'desc' }"
      :row-class="(row) => row.reviewStatus === 'BERMASALAH' ? 'bg-error/10' : ''"
    >
      <template #statusBadge="{ value }">
        <UBadge
          :color="REVIEW_COLOR[value as ReviewStatus]"
          variant="subtle"
        >
          {{ REVIEW_LABEL[value as ReviewStatus] }}
        </UBadge>
      </template>
      <template #detailBtn="{ row }">
        <UButton
          icon="i-lucide-eye"
          size="xs"
          color="neutral"
          variant="subtle"
          @click="openDetail(row as CashTransferRow, 'CASH_TRANSFER')"
        >
          Detail
        </UButton>
      </template>
    </DataTable>

    <!-- Biaya Operasional (Hari 32A FE) -- endpoint & kolom filter SAMA
         (OperationalExpenseQueryDto, paket R10 BE). -->
    <DataTable
      v-else
      ref="operationalExpenseTable"
      endpoint="/operational-expenses"
      :columns="operationalExpenseColumns"
      :filters="filters"
      dense
      zebra
      search-placeholder="Cari nomor bukti..."
      :default-sort="{ key: 'expenseDate', dir: 'desc' }"
      :row-class="(row) => row.reviewStatus === 'BERMASALAH' ? 'bg-error/10' : ''"
    >
      <template #statusBadge="{ value }">
        <UBadge
          :color="REVIEW_COLOR[value as ReviewStatus]"
          variant="subtle"
        >
          {{ REVIEW_LABEL[value as ReviewStatus] }}
        </UBadge>
      </template>
      <template #detailBtn="{ row }">
        <UButton
          icon="i-lucide-eye"
          size="xs"
          color="neutral"
          variant="subtle"
          @click="openDetail(row as OperationalExpenseRow, 'OPERATIONAL_EXPENSE')"
        >
          Detail
        </UButton>
      </template>
    </DataTable>

    <!-- Detail READ-ONLY -- TIDAK ADA tombol Ubah/VOID sama sekali, hanya
         Setujui/Tandai Bermasalah (CLAUDE.md §5). -->
    <USlideover
      v-model:open="detailOpen"
      :title="detailType === 'CASH_TRANSFER' ? 'Detail Pindah Buku Kas' : detailType === 'OPERATIONAL_EXPENSE' ? 'Detail Bukti Kas Keluar' : 'Detail Faktur'"
      :description="detailNumber"
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
          v-else
          class="flex flex-col gap-4"
        >
          <div class="flex flex-col gap-1">
            <span class="font-mono text-lg font-semibold">{{ detailNumber }}</span>
            <DocumentStatusBadges
              v-if="detailPostingStatus && detailPrintStatus"
              :posting-status="detailPostingStatus"
              :print-status="detailPrintStatus"
              :review-status="detailReviewStatus"
            />
            <!-- Pindah Buku Kas tidak punya printStatus (bukan salah satu
                 dari 7 dokumen kunci cetak §2.16) -- badge posting+review
                 polos, pola sama kas-bank/pindah-buku/index.vue. -->
            <div
              v-else-if="detailType === 'CASH_TRANSFER' && detailPostingStatus"
              class="flex items-center gap-2"
            >
              <UBadge
                :color="detailPostingStatus === 'VOIDED' ? 'error' : 'success'"
                variant="subtle"
              >
                {{ detailPostingStatus === 'VOIDED' ? 'Dibatalkan' : 'Terposting' }}
              </UBadge>
              <UBadge
                v-if="detailReviewStatus"
                :color="REVIEW_COLOR[detailReviewStatus]"
                variant="subtle"
              >
                {{ REVIEW_LABEL[detailReviewStatus] }}
              </UBadge>
            </div>
            <!-- Biaya Operasional TIDAK punya postingStatus di level header
                 sama sekali (VOID cuma per baris, lihat DataTable baris di
                 bawah) -- badge review saja. -->
            <UBadge
              v-else-if="detailType === 'OPERATIONAL_EXPENSE' && detailReviewStatus"
              :color="REVIEW_COLOR[detailReviewStatus]"
              variant="subtle"
              class="w-fit"
            >
              {{ REVIEW_LABEL[detailReviewStatus] }}
            </UBadge>
            <UBadge
              v-if="detailPaymentDiscrepancy"
              color="warning"
              variant="subtle"
              icon="i-lucide-badge-alert"
            >
              Selisih pembayaran &gt; Rp 10.000
            </UBadge>
            <div class="text-sm text-muted">
              {{ detailPartyLabel }} · {{ ddmmyyyy(detailDate) }}
            </div>
          </div>

          <DataTable
            v-if="detailType === 'SALES' || detailType === 'PURCHASE'"
            :rows="detailLines as unknown as Record<string, unknown>[]"
            :columns="[
              { key: 'label', label: 'Produk' },
              { key: 'qty', label: 'Qty', align: 'right', format: (v: unknown) => qtyFmt(v as number) },
              { key: 'unitPrice', label: 'Harga', align: 'right', format: (v: unknown) => rupiah(v as number, { bare: true }) },
              { key: 'amount', label: 'Jumlah', align: 'right', format: (v: unknown) => rupiah(v as number, { bare: true }) }
            ]"
            dense
            zebra
            :searchable="false"
          />
          <!-- Biaya Operasional -- baris akun biaya + nominal, BUKAN produk
               (qty/harga tidak relevan sama sekali di sini). -->
          <DataTable
            v-else-if="detailType === 'OPERATIONAL_EXPENSE' && operationalExpenseDetail"
            :rows="operationalExpenseDetail.lines as unknown as Record<string, unknown>[]"
            :columns="[
              { key: 'expenseAccountId', label: 'Akun Biaya', format: (v: unknown) => expenseAccountLabel(v as string) },
              { key: 'amount', label: 'Jumlah', align: 'right', format: (v: unknown) => rupiah(Number(v), { bare: true }) },
              { key: 'description', label: 'Keterangan', format: (v: unknown) => (v as string) || '-' },
              { key: 'postingStatus', label: 'Status', align: 'center', slot: 'lineStatus' }
            ]"
            dense
            zebra
            :searchable="false"
          >
            <template #lineStatus="{ value }">
              <UBadge
                :color="value === 'VOIDED' ? 'error' : 'success'"
                variant="subtle"
              >
                {{ value === 'VOIDED' ? 'Dibatalkan' : 'Terposting' }}
              </UBadge>
            </template>
          </DataTable>
          <div
            v-else-if="cashTransferDetail?.note"
            class="text-sm text-muted border border-default rounded-md p-2"
          >
            Keterangan: {{ cashTransferDetail.note }}
          </div>

          <div class="flex justify-between font-semibold text-base border-t border-default pt-2">
            <span>{{ detailType === 'CASH_TRANSFER' ? 'NOMINAL' : 'TOTAL' }}</span>
            <span>{{ rupiah(detailTotal) }}</span>
          </div>

          <div
            v-if="detailReviewStatus === 'BERMASALAH'"
            class="text-sm text-error"
          >
            Catatan sebelumnya: {{ detailReviewNote || '-' }}
          </div>

          <div class="flex items-center gap-2 border-t border-default pt-3">
            <UButton
              icon="i-lucide-check"
              color="success"
              :loading="reviewBusy"
              :disabled="reviewBusy"
              @click="approve"
            >
              Setujui
            </UButton>
            <UButton
              icon="i-lucide-flag"
              color="error"
              variant="subtle"
              :disabled="reviewBusy"
              @click="openBermasalahForm"
            >
              Tandai Bermasalah
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>

    <!-- Tandai Bermasalah -- catatan WAJIB (CLAUDE.md §5, dibaca operator
         untuk memperbaiki). Divalidasi ulang di backend (SalesInvoicesService
         .review() / PurchaseInvoicesService.review()), form ini cuma
         mencegah submit kosong lebih awal. -->
    <UModal
      v-model:open="bermasalahOpen"
      title="Tandai Bermasalah"
      description="Catatan ini akan dibaca operator untuk memperbaiki faktur."
    >
      <template #body>
        <UFormField
          label="Catatan"
          required
        >
          <UTextarea
            v-model="bermasalahNote"
            class="w-full"
            :rows="3"
            placeholder="Apa yang salah pada faktur ini?"
          />
        </UFormField>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            color="neutral"
            variant="ghost"
            @click="bermasalahOpen = false"
          >
            Batal
          </UButton>
          <UButton
            color="error"
            :disabled="!bermasalahNote.trim()"
            @click="confirmBermasalah"
          >
            Tandai Bermasalah
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
