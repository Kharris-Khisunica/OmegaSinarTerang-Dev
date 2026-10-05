<script setup lang="ts">
// Kwitansi Penerimaan Kas -- A5 landscape, DUA salinan identik per lembar A4
// portrait (CLAUDE.md §6, pola sama penjualan/faktur/[id]/cetak.vue). Tidak
// ada foto referensi untuk PAY (PANDUAN_UI.md §13.3) -- diturunkan dari §13.1:
// kepala kiri/kanan yang sama, kolom disesuaikan (faktur yang dilunasi, bukan
// baris produk), kaki yang sama (GRAND TOTAL/Hal/CETAK).
definePageMeta({ layout: 'print', roles: ['MASTER', 'OPERATOR'] })

const PAGE_SIZE = 14

interface PaymentBatchDetail {
  id: string
  batchNumber: string
  paymentDate: string
  totalAmount: string
  postingStatus: 'POSTED' | 'VOIDED'
  printStatus: 'NOT_PRINTED' | 'PRINTED' | 'PRINT_CANCELLED'
  revisionNumber: number
  notes: string | null
}
interface MethodDetail { id: string, cashAccountCode: string, cashAccountName: string, amount: number }
interface LineDetail { id: string, invoiceNumber: string, partyName: string, allocatedAmount: number }
interface PaymentDetail { paymentBatch: PaymentBatchDetail, methodsSummary: MethodDetail[], lines: LineDetail[] }
interface Setting { key: string, value: string }

const route = useRoute()
const router = useRouter()
const api = useApi()
const { user } = useAuth()
const { format: rupiah } = useRupiah()

const detail = ref<PaymentDetail | null>(null)
const store = ref<Record<string, string>>({})
const printedAt = ref('')
const loading = ref(true)
const loadError = ref('')
const printError = ref('')
const printing = ref(false)

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
function ddMonShortyyyy(value: string | null | undefined): string {
  if (!value) return ''
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return ''
  return `${String(d).padStart(2, '0')}-${MONTHS_SHORT[m - 1]}-${y}`
}

async function loadAll() {
  const [d, settings] = await Promise.all([
    api.get<PaymentDetail>(`/payments/${route.params.id}`),
    // GET /settings adalah MASTER-only (CLAUDE.md §5) -- gagal senyap (pola
    // sama penjualan/faktur/[id]/cetak.vue) supaya OPERATOR tetap bisa cetak.
    api.get<Setting[]>('/settings').catch(() => [] as Setting[])
  ])
  detail.value = d
  store.value = Object.fromEntries(settings.map(s => [s.key, s.value]))
}

onMounted(async () => {
  try {
    await loadAll()
  } catch (err) {
    loadError.value = getErrorMessage(err, 'Gagal memuat data kwitansi.')
  } finally {
    loading.value = false
  }
})

const partyNames = computed(() => {
  if (!detail.value) return '-'
  return [...new Set(detail.value.lines.map(l => l.partyName))].join(', ')
})

const pages = computed<LineDetail[][]>(() => {
  const lines = detail.value?.lines ?? []
  if (lines.length === 0) return [[]]
  const result: LineDetail[][] = []
  for (let i = 0; i < lines.length; i += PAGE_SIZE) {
    result.push(lines.slice(i, i + PAGE_SIZE))
  }
  return result
})

async function triggerPrint() {
  printError.value = ''
  printing.value = true
  try {
    await api.post(`/payments/${route.params.id}/print`)
    await loadAll()
    printedAt.value = new Date().toLocaleString('id-ID')
    window.print()
  } catch (err) {
    printError.value = getErrorMessage(err, 'Gagal mendaftarkan cetak.')
  } finally {
    printing.value = false
  }
}
</script>

<template>
  <div class="p-4">
    <div class="print:hidden flex items-center gap-2 mb-4">
      <UButton
        icon="i-lucide-printer"
        :loading="printing"
        :disabled="loading || !!loadError"
        @click="triggerPrint"
      >
        Cetak
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-arrow-left"
        @click="router.back()"
      >
        Keluar
      </UButton>
      <span
        v-if="printError"
        class="text-sm text-red-600"
      >{{ printError }}</span>
    </div>

    <p
      v-if="loading"
      class="print:hidden text-sm text-muted"
    >
      Memuat...
    </p>
    <p
      v-else-if="loadError"
      class="print:hidden text-sm text-error"
    >
      {{ loadError }}
    </p>

    <div
      v-else-if="detail"
      class="mx-auto"
      style="width: 210mm"
    >
      <div
        v-for="(pageLines, pageIndex) in pages"
        :key="pageIndex"
        :style="pageIndex > 0 ? { pageBreakBefore: 'always' } : {}"
      >
        <div
          v-for="copy in 2"
          :key="copy"
          class="relative p-6 flex flex-col gap-1 text-sm overflow-hidden"
          style="height: 148.5mm"
          :class="{ 'border-t border-dashed border-neutral-400': copy === 2 }"
        >
          <div
            v-if="detail.paymentBatch.postingStatus === 'VOIDED'"
            class="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <span
              class="text-red-600 font-black opacity-30"
              style="font-size: 90px; transform: rotate(-25deg); border: 6px solid currentColor; padding: 0 24px; letter-spacing: 8px"
            >VOID</span>
          </div>

          <div class="flex items-start justify-between">
            <div>
              <div class="font-bold text-base">
                KWITANSI PENERIMAAN KAS
              </div>
              <div v-if="store.store_name">
                {{ store.store_name }}
              </div>
              <div v-if="store.store_phone">
                ( {{ store.store_phone }} )
              </div>
            </div>
            <div class="text-right">
              <div>{{ store.store_city ? `${store.store_city}, ` : '' }}{{ ddMonShortyyyy(detail.paymentBatch.paymentDate) }}</div>
              <div>Diterima Dari :</div>
              <div class="font-bold">
                {{ partyNames }}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-x-4">
            <div>
              <div>
                NO. KWITANSI : {{ detail.paymentBatch.batchNumber }}
                <span v-if="detail.paymentBatch.revisionNumber > 0">( Revisi ke-{{ detail.paymentBatch.revisionNumber }} )</span>
              </div>
              <div>MEMO&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {{ detail.paymentBatch.notes ?? '' }}</div>
            </div>
          </div>

          <hr class="border-t border-neutral-400 my-1">

          <div class="grid grid-cols-[2rem_1fr_1fr_8rem] font-semibold">
            <div>NO</div>
            <div>NO. FAKTUR</div>
            <div>KETERANGAN</div>
            <div class="text-right">
              JUMLAH
            </div>
          </div>
          <hr class="border-t border-neutral-400 my-1">

          <div
            v-for="(line, idx) in pageLines"
            :key="line.id"
            class="grid grid-cols-[2rem_1fr_1fr_8rem]"
          >
            <div>{{ idx + 1 }}</div>
            <div class="font-mono">
              {{ line.invoiceNumber }}
            </div>
            <div>{{ line.partyName }}</div>
            <div class="text-right">
              {{ rupiah(line.allocatedAmount, { bare: true }) }}
            </div>
          </div>

          <hr class="border-t border-neutral-400 my-1">

          <div class="flex items-end justify-between mt-auto">
            <div>
              <div
                v-for="m in detail.methodsSummary"
                :key="m.id"
              >
                {{ m.cashAccountName }} : {{ rupiah(m.amount, { bare: true }) }}
              </div>
              <div class="mt-4 flex gap-8">
                <div class="text-center">
                  <div>Dibayar Oleh,</div>
                  <div class="mt-8">
                    ____________
                  </div>
                </div>
                <div class="text-center">
                  <div>Diterima Oleh,</div>
                  <div class="mt-8">
                    ____________
                  </div>
                </div>
              </div>
            </div>
            <div class="text-right">
              <div>
                GRAND TOTAL :
                <span class="underline decoration-double">{{ rupiah(Number(detail.paymentBatch.totalAmount), { bare: true }) }}</span>
              </div>
              <div>Hal. {{ pageIndex + 1 }} / {{ pages.length }}</div>
              <div>CETAK : {{ user?.username ?? '-' }} - {{ printedAt || '-' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
