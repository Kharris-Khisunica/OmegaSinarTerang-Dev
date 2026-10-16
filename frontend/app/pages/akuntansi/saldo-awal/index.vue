<script setup lang="ts">
// Halaman Saldo Awal (Hari 12) — tabel input manual lewat repeater
// <CrudFormPage> (stok, + piutang & hutang sejak need_fixing.md #21), plus
// IMPOR EXCEL (#21, opsi 4b): template usulan developer (belum keputusan
// klien), unggah -> backend mengurai jadi PRATINJAU (POST
// /opening-balance/import, tidak memposting) -> tombol Posting mengirim ke
// POST /opening-balance yang SAMA dengan form manual (satu alur, CLAUDE.md §3).
// Halaman Jurnal Manual tetap ditunda ke pasca-MVP (CLAUDE.md §0).
import type { Column } from '~/types/data-table'

definePageMeta({ title: 'Saldo Awal', roles: ['MASTER'] })

const api = useApi()
const toast = useToast()
const { schema, transformOut } = useOpeningBalanceSchema()
const { format: formatRupiah } = useRupiah()
const { format: qtyFmt } = useQty()

interface VerifyResult {
  lotValue: number
  ledgerValue: number
  difference: number
}

const verifyResult = ref<VerifyResult | null>(null)
const verifyError = ref('')

async function refreshVerify() {
  try {
    verifyResult.value = await api.get<VerifyResult>('/opening-balance/verify')
    verifyError.value = ''
  } catch (err) {
    verifyError.value = getErrorMessage(err, 'Gagal memuat verifikasi saldo awal.')
  }
}

onMounted(refreshVerify)

// ---- Impor Excel -----------------------------------------------------------
interface ImportedStockLine extends Record<string, unknown> {
  row: number
  productId: string
  productLabel: string
  qty: number
  unitName: string
  qtyBaseUnit: number
  unitCostInput: number
  unitCost: number
}
interface ImportedPartyLine extends Record<string, unknown> {
  row: number
  partyId: string
  partyLabel: string
  amount: number
  description?: string
}
interface ImportError extends Record<string, unknown> {
  sheet: string
  row: number
  message: string
}
interface ImportResult {
  stockLines: ImportedStockLine[]
  receivableLines: ImportedPartyLine[]
  payableLines: ImportedPartyLine[]
  errors: ImportError[]
}
interface WarehouseOption { id: string, warehouseType: string, isDefault: boolean }

const fileInput = ref<HTMLInputElement | null>(null)
const importing = ref(false)
const posting = ref(false)
const importError = ref('')
const preview = ref<ImportResult | null>(null)

async function downloadTemplate() {
  try {
    const blob = await api.getBlob('/opening-balance/template')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template-saldo-awal.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    importError.value = getErrorMessage(err, 'Gagal mengunduh template.')
  }
}

async function onFileChosen(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  importError.value = ''
  preview.value = null
  importing.value = true
  try {
    const body = new FormData()
    body.append('file', file)
    preview.value = await api.post<ImportResult>('/opening-balance/import', body)
  } catch (err) {
    importError.value = getErrorMessage(err, 'Gagal membaca file Excel.')
  } finally {
    importing.value = false
  }
}

const previewTotals = computed(() => {
  const p = preview.value
  if (!p) return null
  return {
    stock: p.stockLines.reduce((s, l) => s + l.qtyBaseUnit * l.unitCost, 0),
    receivable: p.receivableLines.reduce((s, l) => s + l.amount, 0),
    payable: p.payableLines.reduce((s, l) => s + l.amount, 0)
  }
})

async function postImport() {
  const p = preview.value
  if (!p || p.errors.length > 0) return
  if (!window.confirm('Posting saldo awal dari file ini? Jurnal & lot pembuka akan dibuat.')) return
  posting.value = true
  importError.value = ''
  try {
    let warehouseId: string | null = null
    if (p.stockLines.length > 0) {
      const res = await api.get<{ data: WarehouseOption[] }>('/warehouses', { limit: 100 })
      warehouseId = (res.data.find(w => w.warehouseType === 'STORE' && w.isDefault)
        ?? res.data.find(w => w.warehouseType === 'STORE'))?.id ?? null
      if (!warehouseId) throw new Error('Gudang STORE default belum ditemukan.')
    }
    await api.post('/opening-balance', {
      stockLines: p.stockLines.map(l => ({ productId: l.productId, warehouseId, qtyBaseUnit: l.qtyBaseUnit, unitCost: l.unitCost })),
      receivableLines: p.receivableLines.map(l => ({ customerId: l.partyId, amount: l.amount, description: l.description })),
      payableLines: p.payableLines.map(l => ({ supplierId: l.partyId, amount: l.amount, description: l.description }))
    })
    toast.add({ title: 'Saldo awal dari Excel terposting', color: 'success' })
    preview.value = null
    await refreshVerify()
  } catch (err) {
    importError.value = getErrorMessage(err, 'Gagal memposting saldo awal.')
  } finally {
    posting.value = false
  }
}

const stockColumns: Column<ImportedStockLine>[] = [
  { key: 'row', label: 'Baris', width: '60px' },
  { key: 'productLabel', label: 'Produk' },
  { key: 'qty', label: 'Qty', align: 'right', format: (_v, r) => `${qtyFmt(r.qty)} ${r.unitName}` },
  { key: 'unitCostInput', label: 'Harga Pokok / Satuan', align: 'right', format: v => formatRupiah(v as number, { bare: true }) },
  { key: 'qtyBaseUnit', label: 'Nilai', align: 'right', format: (_v, r) => formatRupiah(r.qtyBaseUnit * r.unitCost, { bare: true }) }
]
const partyColumns: Column<ImportedPartyLine>[] = [
  { key: 'row', label: 'Baris', width: '60px' },
  { key: 'partyLabel', label: 'Pihak' },
  { key: 'amount', label: 'Nominal', align: 'right', format: v => formatRupiah(v as number, { bare: true }) },
  { key: 'description', label: 'Keterangan', format: v => (v as string | undefined) ?? '' }
]
const errorColumns: Column<ImportError>[] = [
  { key: 'sheet', label: 'Sheet', width: '100px' },
  { key: 'row', label: 'Baris', width: '60px' },
  { key: 'message', label: 'Masalah' }
]
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <UAlert
      v-if="verifyError"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-triangle"
      title="Verifikasi gagal dimuat"
      :description="verifyError"
    />
    <UAlert
      v-else-if="verifyResult"
      :color="verifyResult.difference === 0 ? 'success' : 'warning'"
      variant="subtle"
      :icon="verifyResult.difference === 0 ? 'i-lucide-check-circle-2' : 'i-lucide-alert-triangle'"
      :title="verifyResult.difference === 0
        ? 'Saldo awal seimbang'
        : `Selisih saldo awal: ${formatRupiah(verifyResult.difference)}`"
      :description="`Nilai lot pembuka ${formatRupiah(verifyResult.lotValue)} vs saldo akun Persediaan ${formatRupiah(verifyResult.ledgerValue)} (sumber: source_type = OPENING_BALANCE).`"
    />

    <UPageCard
      title="Impor dari Excel"
      description="Unduh template, isi sheet Stok / Piutang / Hutang, lalu unggah. File hanya dibaca sebagai pratinjau — posting terjadi setelah tombol Posting ditekan."
    >
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2 flex-wrap">
          <UButton
            icon="i-lucide-download"
            color="neutral"
            variant="subtle"
            @click="downloadTemplate"
          >
            Unduh Template
          </UButton>
          <UButton
            icon="i-lucide-upload"
            :loading="importing"
            @click="fileInput?.click()"
          >
            Unggah File Excel
          </UButton>
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            class="hidden"
            @change="onFileChosen"
          >
        </div>

        <UAlert
          v-if="importError"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          :title="importError"
        />

        <template v-if="preview">
          <UAlert
            v-if="preview.errors.length > 0"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-triangle"
            :title="`${preview.errors.length} baris bermasalah — perbaiki file lalu unggah ulang. Posting dinonaktifkan.`"
          />
          <DataTable
            v-if="preview.errors.length > 0"
            :rows="preview.errors"
            :columns="errorColumns as Column<Record<string, unknown>>[]"
            dense
            zebra
            :searchable="false"
          />

          <h3 class="text-sm font-semibold">
            Stok ({{ preview.stockLines.length }} baris · {{ formatRupiah(previewTotals!.stock) }})
          </h3>
          <DataTable
            :rows="preview.stockLines"
            :columns="stockColumns as Column<Record<string, unknown>>[]"
            dense
            zebra
            :searchable="false"
            empty-text="< Tidak ada baris stok >"
          />
          <h3 class="text-sm font-semibold">
            Piutang ({{ preview.receivableLines.length }} baris · {{ formatRupiah(previewTotals!.receivable) }})
          </h3>
          <DataTable
            :rows="preview.receivableLines"
            :columns="partyColumns as Column<Record<string, unknown>>[]"
            dense
            zebra
            :searchable="false"
            empty-text="< Tidak ada baris piutang >"
          />
          <h3 class="text-sm font-semibold">
            Hutang ({{ preview.payableLines.length }} baris · {{ formatRupiah(previewTotals!.payable) }})
          </h3>
          <DataTable
            :rows="preview.payableLines"
            :columns="partyColumns as Column<Record<string, unknown>>[]"
            dense
            zebra
            :searchable="false"
            empty-text="< Tidak ada baris hutang >"
          />

          <div class="flex items-center gap-2">
            <UButton
              icon="i-lucide-check"
              :loading="posting"
              :disabled="posting || preview.errors.length > 0"
              @click="postImport"
            >
              Posting Saldo Awal dari File
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              @click="preview = null"
            >
              Batalkan Pratinjau
            </UButton>
          </div>
        </template>
      </div>
    </UPageCard>

    <CrudFormPage
      title="Saldo Awal"
      endpoint="/opening-balance"
      :schema="schema"
      back-to="/"
      :transform-out="transformOut"
      hide-save-and-new
      :on-success="refreshVerify"
    />
  </div>
</template>
