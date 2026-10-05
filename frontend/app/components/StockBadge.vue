<script setup lang="ts">
import type { QtyConversionLevel } from '~/utils/computeQtyBreakdown'

// Presentational murni — TIDAK memanggil endpoint sendiri. Belum ada
// endpoint backend yang mengembalikan saldo stok (StockRecorderService
// Hari 10 baru mesin tulis + formatQtyBreakdown() internal, tanpa
// controller GET); dibuat sekarang ("selagi longgar") supaya Hari 20
// (form Faktur Penjualan) tinggal memasang props dari hasil fetch-nya
// sendiri begitu endpoint saldo stok ada. Lihat catatan PROGRESS.md §3.
const props = withDefaults(defineProps<{
  /** null/undefined sebelum data stok selesai dimuat — tampil "-", bukan 0. */
  qtyBaseUnit?: number | null
  baseUnitName: string
  conversions?: QtyConversionLevel[]
  loading?: boolean
}>(), {
  qtyBaseUnit: null,
  conversions: () => [],
  loading: false
})

// A4 (RENCANA_REVISI_TESTING_KLIEN.md §2B): satuan terbesar saja, dibulatkan
// ke bawah, tanda "+" kalau ada sisa -- badge ini SELALU dipakai untuk
// "SISA STOK", tidak ada pemakaian lain yang butuh breakdown penuh.
const breakdown = computed(() => {
  if (props.qtyBaseUnit === null || props.qtyBaseUnit === undefined) return '-'
  return computeQtyBreakdown(props.qtyBaseUnit, props.baseUnitName, props.conversions, { largestOnly: true })
})

// Stok minus diizinkan, bukan ditolak (CLAUDE.md §2.8) — badge tetap
// menampilkan angkanya, cuma ditandai warna beda, bukan disembunyikan.
const isNegative = computed(() => (props.qtyBaseUnit ?? 0) < 0)
</script>

<template>
  <USkeleton
    v-if="loading"
    class="h-5 w-24 inline-block"
  />
  <UBadge
    v-else
    :color="isNegative ? 'error' : 'neutral'"
    variant="subtle"
    :icon="isNegative ? 'i-lucide-triangle-alert' : undefined"
  >
    {{ breakdown }}
  </UBadge>
</template>
