<script setup lang="ts">
import type { Column } from '~/types/data-table'

// Rekap Kas Harian (Hari 31, CLAUDE.md §0 -- eksplisit TIDAK ditunda ke
// pasca-MVP, beda dari Laporan Biaya Operasional). BE GET /reports/cash-daily
// ?date=&accountId=. Pengganti cash opname yang dipotong: saldo awal, masuk,
// keluar, saldo akhir per akun kas untuk SATU tanggal.
//
// Filter Akun TIDAK memanggil GET /chart-of-accounts (endpoint itu
// MASTER/SUPERVISOR-only, CLAUDE.md §5 -- OPERATOR akan 403 padahal laporan
// ini wajib bisa dilihat semua role). Daftar akun untuk dropdown diambil dari
// baris hasil query TANPA filter akun (yang sudah mencakup semua akun kas
// aktif) -- bukan lookup terpisah.
definePageMeta({ title: 'Rekap Kas Harian' })

interface CashDailyRow extends Record<string, unknown> {
  accountId: string | null
  accountCode: string | null
  accountName: string
  openingBalance: number
  cashIn: number
  cashOut: number
  closingBalance: number
  isGrandTotal?: boolean
}

interface CashDailyResponse {
  rows: CashDailyRow[]
  meta?: { title?: string, subtitle?: string }
}

// Getter LOKAL (bukan toISOString(), yang membaca UTC) -- "hari ini" wajib
// mengikuti kalender lokal operator, bukan mundur satu hari kalau dibuka
// dini hari (mis. jam 02:00 WIB = masih 19:00 UTC hari sebelumnya). Pola
// sama toIsoDate()/todayIso() backend (aging-bucket.util.ts, Hari 30).
function todayIsoLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const api = useApi()
const { format: rupiah } = useRupiah()

const date = ref(todayIsoLocal())
const accountId = ref<string | undefined>(undefined)

const rows = ref<CashDailyRow[]>([])
const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const errorMessage = ref('')

// Opsi dropdown akun dibangun dari hasil query TANPA filter akun (dimuat
// sekali, dipertahankan lintas perubahan tanggal/filter) -- lihat komentar
// di atas. Kosong sampai load pertama selesai.
const accountOptions = ref<{ label: string, value: string }[]>([])

async function load() {
  if (!date.value) return
  status.value = 'pending'
  errorMessage.value = ''
  try {
    const res = await api.get<CashDailyResponse>('/reports/cash-daily', {
      date: date.value,
      ...(accountId.value ? { accountId: accountId.value } : {})
    })
    rows.value = res.rows
    if (!accountId.value) {
      accountOptions.value = res.rows
        .filter(r => !r.isGrandTotal && r.accountId)
        .map(r => ({ label: `${r.accountCode} - ${r.accountName}`, value: r.accountId as string }))
    }
    status.value = 'success'
  } catch (err) {
    rows.value = []
    status.value = 'error'
    errorMessage.value = getErrorMessage(err, 'Gagal memuat laporan.')
  }
}

watch([date, accountId], load, { immediate: true })

const columns: Column<CashDailyRow>[] = [
  { key: 'accountCode', label: 'Kode', mono: true, format: v => (v as string | null) ?? '' },
  { key: 'accountName', label: 'Akun Kas/Bank' },
  { key: 'openingBalance', label: 'Saldo Awal', align: 'right', format: v => rupiah(v as number, { bare: true }) },
  { key: 'cashIn', label: 'Masuk', align: 'right', format: v => rupiah(v as number, { bare: true }) },
  { key: 'cashOut', label: 'Keluar', align: 'right', format: v => rupiah(v as number, { bare: true }) },
  { key: 'closingBalance', label: 'Saldo Akhir', align: 'right', format: v => rupiah(v as number, { bare: true }) }
]

function rowClass(row: CashDailyRow): string {
  return row.isGrandTotal ? 'font-bold border-t-2 border-default' : ''
}

const fileNamePrefix = computed(() => `rekap-kas-harian-${date.value}`)
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader description="Saldo awal, masuk, keluar, dan saldo akhir per akun kas/bank untuk satu tanggal -- pengganti cash opname, dibaca langsung dari buku besar.">
      <ExportButton
        v-if="rows.length > 0"
        endpoint="/reports/cash-daily"
        :file-name-prefix="fileNamePrefix"
        :filters="() => ({ date, accountId })"
      />
    </PageHeader>

    <div class="flex flex-wrap items-end gap-3">
      <UFormField label="Tanggal">
        <UInput
          v-model="date"
          type="date"
          class="w-40"
        />
      </UFormField>
      <UFormField label="Akun">
        <div class="flex items-center gap-1">
          <USelect
            :model-value="accountId"
            :items="accountOptions"
            placeholder="Semua Akun Kas"
            class="w-64"
            @update:model-value="(v: string) => (accountId = v)"
          />
          <UButton
            v-if="accountId"
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Hapus filter Akun"
            @click="accountId = undefined"
          />
        </div>
      </UFormField>
    </div>

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
      title="Gagal memuat laporan"
      :description="errorMessage"
      :actions="[{ label: 'Coba lagi', onClick: load }]"
    />
    <DataTable
      v-else
      :rows="rows"
      :columns="columns"
      dense
      zebra
      :searchable="false"
      empty-text="< Tidak Ada Data Untuk Ditampilkan >"
      :row-class="rowClass"
    />
  </div>
</template>
