<script setup lang="ts">
import type { Column } from '~/types/data-table'

/**
 * Panel "RIWAYAT HARGA" (PANDUAN_UI.md §7.1 poin 2, §8.6) — satu-satunya
 * sumber kebenaran harga operator (CLAUDE.md §3/§8). REFERENSI MURNI: baris
 * TIDAK bisa diklik untuk mengisi harga — itu instruksi eksplisit klien,
 * jangan tambah selectable/on-row-click di sini.
 *
 * Konsumsi GET /price-suggestion (Hari 20 BE) — fallback 2 tingkat
 * (pelanggan+produk+satuan -> produk+satuan). Tingkat 3 (harga master)
 * TIDAK ADA — keputusan final klien 20 Agustus 2026 (PR #3 tertutup,
 * KONTEKS_REVISI_2026-07-28.md §4.2). source: 'NONE' -> panel kosong,
 * bukan bug.
 */
interface PriceSuggestionRow extends Record<string, unknown> {
  date: string
  qty: number
  unitName: string
  unitPrice: number
}
interface PriceSuggestionResponse {
  source: 'CUSTOMER_PRODUCT_UNIT' | 'PRODUCT_UNIT' | 'NONE'
  suggestions: PriceSuggestionRow[]
}

const props = defineProps<{
  customerId?: string
  customerName?: string
  productId?: string
  unitId?: string
}>()

const api = useApi()
const { format: rupiah } = useRupiah()
const { format: qtyFmt } = useQty()

function ddmmyyyy(value: string | null | undefined): string {
  return formatDate(value).split('/').join('-')
}

const rows = ref<PriceSuggestionRow[]>([])
const loaded = ref(false)

const columns: Column<PriceSuggestionRow>[] = [
  { key: 'date', label: 'Tanggal', format: v => ddmmyyyy(v as string) },
  { key: 'qty', label: 'Qty', align: 'right', format: v => qtyFmt(v as number) },
  { key: 'unitName', label: 'Satuan' },
  { key: 'unitPrice', label: '@Harga', align: 'right', format: v => rupiah(v as number, { bare: true }) }
]

const panelTitle = computed(() => `RIWAYAT HARGA${props.customerName ? ` — ${props.customerName}` : ''}`)

let debounceTimer: ReturnType<typeof setTimeout> | undefined
watch(
  () => [props.customerId, props.productId, props.unitId] as const,
  ([customerId, productId, unitId]) => {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (!customerId || !productId || !unitId) {
      rows.value = []
      loaded.value = false
      return
    }
    debounceTimer = setTimeout(async () => {
      try {
        const res = await api.get<PriceSuggestionResponse>('/price-suggestion', { customerId, productId, unitId })
        rows.value = res.suggestions
      } catch {
        rows.value = []
      } finally {
        loaded.value = true
      }
    }, 150)
  },
  { immediate: true }
)
</script>

<template>
  <div class="flex flex-col gap-1">
    <span class="text-xs font-medium text-muted">{{ panelTitle }}</span>
    <DataTable
      v-if="rows.length > 0"
      :rows="rows"
      :columns="columns"
      dense
      zebra
      :searchable="false"
    />
    <p
      v-else-if="loaded"
      class="text-xs text-muted italic"
    >
      Belum ada riwayat harga.
    </p>
    <p
      v-else
      class="text-xs text-muted italic"
    >
      Pilih pelanggan, produk, dan satuan untuk melihat riwayat harga.
    </p>
  </div>
</template>
