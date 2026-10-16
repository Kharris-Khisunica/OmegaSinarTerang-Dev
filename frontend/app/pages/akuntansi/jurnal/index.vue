<script setup lang="ts">
import type { Column, FilterDef, FilterOption } from '~/types/data-table'

// OPERATOR ditutup (need_fixing.md #17); SUPERVISOR lewat URL langsung, pola
// sama Bagan Akun (navigasi Supervisor hanya 3 item, CLAUDE.md §5).
definePageMeta({ title: 'Jurnal', roles: ['MASTER', 'SUPERVISOR'] })

interface JournalRow extends Record<string, unknown> {
  id: string
  entryNumber: string
  entryDate: string
  description: string | null
  sourceType: string
  isReversal: boolean
}

interface AccountRef {
  id: string
  code: string
  name: string
}

interface JournalLine {
  id: string
  accountId: string
  account: AccountRef
  debitAmount: string
  creditAmount: string
  description: string | null
  lineOrder: number
}

interface JournalDetail extends JournalRow {
  reversedEntryId: string | null
  lines: JournalLine[]
}

const api = useApi()
const { format: rupiah } = useRupiah()

function humanizeSourceType(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const columns: Column<JournalRow>[] = [
  { key: 'entryNumber', label: 'No. Jurnal' },
  { key: 'entryDate', label: 'Tanggal', format: v => formatDate(v as string) },
  { key: 'description', label: 'Keterangan' },
  { key: 'sourceType', label: 'Sumber', format: v => humanizeSourceType(v as string) },
  { key: 'isReversal', label: 'Pembalik', align: 'center', slot: 'isReversal' }
]

// Opsi filter akun dari /chart-of-accounts. Operator tidak punya akses ke
// endpoint itu (403 sesuai matrix) — dibungkus try/catch supaya filter ini
// gagal senyap (kosong) tanpa mematikan seluruh halaman Jurnal untuk Operator.
const accountOptions = ref<FilterOption[]>([])
async function loadAccountOptions() {
  try {
    const accounts = await api.get<AccountRef[]>('/chart-of-accounts')
    accountOptions.value = accounts.map(a => ({ label: `${a.code} - ${a.name}`, value: a.id }))
  } catch {
    accountOptions.value = []
  }
}
onMounted(loadAccountOptions)

// key "date" sengaja (bukan "entryDate") - DataTable date-range mengirim
// "${key}From"/"${key}To", harus persis cocok dengan JournalEntryQueryDto
// (dateFrom/dateTo) di backend.
const filters = computed<FilterDef[]>(() => [
  { key: 'date', label: 'Tanggal', type: 'date-range' },
  { key: 'accountId', label: 'Akun', type: 'select', options: accountOptions.value }
])

const selectedOpen = ref(false)
const selected = ref<JournalDetail | null>(null)
const detailStatus = ref<'pending' | 'success' | 'error'>('pending')
const detailError = ref('')
const reversedEntryNumber = ref<string | null>(null)

async function openDetail(row: JournalRow) {
  selectedOpen.value = true
  selected.value = null
  reversedEntryNumber.value = null
  detailStatus.value = 'pending'
  try {
    selected.value = await api.get<JournalDetail>(`/journal-entries/${row.id}`)
    detailStatus.value = 'success'
    if (selected.value.reversedEntryId) {
      try {
        const original = await api.get<JournalDetail>(`/journal-entries/${selected.value.reversedEntryId}`)
        reversedEntryNumber.value = original.entryNumber
      } catch {
        reversedEntryNumber.value = null
      }
    }
  } catch (err) {
    detailStatus.value = 'error'
    detailError.value = getErrorMessage(err, 'Gagal memuat detail jurnal.')
  }
}

const totalDebit = computed(() =>
  selected.value ? selected.value.lines.reduce((sum, line) => sum + Number(line.debitAmount), 0) : 0
)
const totalCredit = computed(() =>
  selected.value ? selected.value.lines.reduce((sum, line) => sum + Number(line.creditAmount), 0) : 0
)
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader />

    <DataTable
      endpoint="/journal-entries"
      :columns="columns"
      :filters="filters"
      :on-row-click="openDetail"
      search-placeholder="Cari nomor/keterangan jurnal..."
      :default-sort="{ key: 'entryDate', dir: 'desc' }"
    >
      <template #isReversal="{ value }">
        <UBadge
          v-if="value"
          color="warning"
          variant="subtle"
        >
          Pembalik
        </UBadge>
        <span
          v-else
          class="text-muted"
        >—</span>
      </template>
    </DataTable>

    <USlideover
      v-model:open="selectedOpen"
      title="Detail Jurnal"
      :description="selected?.entryNumber"
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
          v-else-if="selected"
          class="flex flex-col gap-4"
        >
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <span class="font-mono font-medium">{{ selected.entryNumber }}</span>
              <UBadge
                v-if="selected.isReversal"
                color="warning"
                variant="subtle"
              >
                Jurnal Pembalik
              </UBadge>
            </div>
            <div class="text-sm text-muted">
              {{ formatDate(selected.entryDate) }} · {{ humanizeSourceType(selected.sourceType) }}
            </div>
            <div
              v-if="selected.description"
              class="text-sm"
            >
              {{ selected.description }}
            </div>
            <div
              v-if="selected.isReversal"
              class="text-sm text-warning"
            >
              Membalik jurnal {{ reversedEntryNumber ?? selected.reversedEntryId }}
            </div>
          </div>

          <div class="overflow-x-auto border border-default rounded-lg">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-default bg-elevated/50">
                  <th class="px-3 py-2 text-left font-medium">
                    Akun
                  </th>
                  <th class="px-3 py-2 text-left font-medium">
                    Keterangan
                  </th>
                  <th class="px-3 py-2 text-right font-medium">
                    Debit
                  </th>
                  <th class="px-3 py-2 text-right font-medium">
                    Kredit
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="line in selected.lines"
                  :key="line.id"
                  class="border-b border-default last:border-0"
                >
                  <td class="px-3 py-2">
                    {{ line.account.code }} - {{ line.account.name }}
                  </td>
                  <td class="px-3 py-2">
                    {{ line.description ?? '-' }}
                  </td>
                  <td class="px-3 py-2 text-right">
                    {{ Number(line.debitAmount) > 0 ? rupiah(Number(line.debitAmount)) : '-' }}
                  </td>
                  <td class="px-3 py-2 text-right">
                    {{ Number(line.creditAmount) > 0 ? rupiah(Number(line.creditAmount)) : '-' }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t-2 border-default font-medium">
                  <td
                    class="px-3 py-2"
                    colspan="2"
                  >
                    Total
                  </td>
                  <td class="px-3 py-2 text-right">
                    {{ rupiah(totalDebit) }}
                  </td>
                  <td class="px-3 py-2 text-right">
                    {{ rupiah(totalCredit) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
