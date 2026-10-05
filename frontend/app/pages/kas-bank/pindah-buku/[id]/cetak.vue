<script setup lang="ts">
// Bukti Pindah Buku Kas -- A5 landscape, DUA salinan identik per lembar A4
// portrait (CLAUDE.md §6, `layouts/print.vue`, PANDUAN_UI.md §13 "pakai
// itu, jangan buat layout cetak baru"). Tidak ada foto referensi untuk PB
// (belum ada di sistem lama) -- diturunkan dari §13.1/§13.3 seperti PAY
// (kas-bank/penerimaan/[id]/cetak.vue): kepala kiri/kanan yang sama, kolom
// disesuaikan (dari/ke akun, bukan baris faktur/produk), kaki yang sama.
// TIDAK ADA registrasi cetak (`POST /:id/print`) -- cash_transfers TIDAK
// ikut kunci cetak §2.16 (tidak ada print_status/print_count di entity),
// jadi cetak ulang bebas tanpa efek samping apa pun, pola sama Biaya
// Operasional. Hanya SATU halaman (tidak ada baris berulang untuk dipecah
// PAGE_SIZE) -- dokumen ini selalu satu dari/satu ke/satu nominal.
definePageMeta({ layout: 'print', roles: ['MASTER', 'OPERATOR'] })

interface CashTransferDetail {
  id: string
  documentNumber: string
  transferDate: string
  amount: number
  fromCashAccountName: string
  toCashAccountName: string
  note: string | null
  postingStatus: 'POSTED' | 'VOIDED'
}
interface Setting { key: string, value: string }

const route = useRoute()
const router = useRouter()
const api = useApi()
const { user } = useAuth()
const { format: rupiah } = useRupiah()

const detail = ref<CashTransferDetail | null>(null)
const store = ref<Record<string, string>>({})
const loading = ref(true)
const loadError = ref('')

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
function ddMonShortyyyy(value: string | null | undefined): string {
  if (!value) return ''
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return ''
  return `${String(d).padStart(2, '0')}-${MONTHS_SHORT[m - 1]}-${y}`
}

onMounted(async () => {
  try {
    const [d, settings] = await Promise.all([
      api.get<CashTransferDetail>(`/cash-transfers/${route.params.id}`),
      // GET /settings adalah MASTER-only (CLAUDE.md §5) -- gagal senyap
      // (pola sama payments/faktur cetak) supaya OPERATOR tetap bisa cetak.
      api.get<Setting[]>('/settings').catch(() => [] as Setting[])
    ])
    detail.value = d
    store.value = Object.fromEntries(settings.map(s => [s.key, s.value]))
  } catch (err) {
    loadError.value = getErrorMessage(err, 'Gagal memuat data Pindah Buku Kas.')
  } finally {
    loading.value = false
  }
})

function triggerPrint() {
  window.print()
}
</script>

<template>
  <div class="p-4">
    <div class="print:hidden flex items-center gap-2 mb-4">
      <UButton
        icon="i-lucide-printer"
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
        v-for="copy in 2"
        :key="copy"
        class="relative p-6 flex flex-col gap-1 text-sm overflow-hidden"
        style="height: 148.5mm"
        :class="{ 'border-t border-dashed border-neutral-400': copy === 2 }"
      >
        <div
          v-if="detail.postingStatus === 'VOIDED'"
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
              BUKTI PINDAH BUKU KAS
            </div>
            <div v-if="store.store_name">
              {{ store.store_name }}
            </div>
            <div v-if="store.store_phone">
              ( {{ store.store_phone }} )
            </div>
          </div>
          <div class="text-right">
            <div>{{ store.store_city ? `${store.store_city}, ` : '' }}{{ ddMonShortyyyy(detail.transferDate) }}</div>
          </div>
        </div>

        <div>
          NO. BUKTI : {{ detail.documentNumber }}
        </div>

        <hr class="border-t border-neutral-400 my-1">

        <div class="grid grid-cols-2 gap-y-1 mt-2">
          <div class="text-muted">
            Dari Kas
          </div>
          <div class="font-medium">
            {{ detail.fromCashAccountName }}
          </div>
          <div class="text-muted">
            Ke Kas
          </div>
          <div class="font-medium">
            {{ detail.toCashAccountName }}
          </div>
          <div class="text-muted">
            Keterangan
          </div>
          <div>{{ detail.note || '-' }}</div>
        </div>

        <hr class="border-t border-neutral-400 my-1">

        <div class="flex items-end justify-between mt-auto">
          <div class="flex gap-8">
            <div class="text-center">
              <div>Diserahkan Oleh,</div>
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
          <div class="text-right">
            <div>
              JUMLAH :
              <span class="underline decoration-double">{{ rupiah(detail.amount, { bare: true }) }}</span>
            </div>
            <div>CETAK : {{ user?.username ?? '-' }} - {{ new Date().toLocaleString('id-ID') }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
