<script setup lang="ts">
import type { Column } from '~/types/data-table'

/**
 * Konteks "SISA STOK" di LineModal (PANDUAN_UI.md §7.1 poin 3, §8.6) — tabel
 * Gudang/Satuan/Qty persis mockup screenshot, BUKAN <StockBadge> (badge
 * tunggal yang sudah dipakai Sales Order/Purchase Invoice hari-hari
 * sebelumnya, sengaja tidak disentuh/diganti di sini). Selalu mode data
 * lokal (CLAUDE.md §6 — dilarang <table> manual).
 */
interface StockPanelRow extends Record<string, unknown> {
  gudang: string
  satuan: string
  /**
   * String siap-tampil (bukan angka mentah) -- A4 (RENCANA_REVISI_TESTING_KLIEN.md
   * §2B): satuan terbesar saja, dibulatkan ke bawah, tanda "+" kalau ada sisa.
   * Dihasilkan pemanggil lewat `computeQtyBreakdown(..., { largestOnly: true })`,
   * BUKAN dihitung ulang di komponen ini.
   */
  qty: string | null
}

withDefaults(defineProps<{
  rows: StockPanelRow[]
  loading?: boolean
}>(), {
  loading: false
})

const columns: Column<StockPanelRow>[] = [
  { key: 'gudang', label: 'Gudang' },
  { key: 'satuan', label: 'Satuan' },
  {
    key: 'qty',
    label: 'Qty',
    align: 'right',
    format: v => (v === null || v === undefined ? '-' : String(v))
  }
]
</script>

<template>
  <div>
    <p
      v-if="loading"
      class="text-xs text-muted mb-1"
    >
      Memuat sisa stok...
    </p>
    <DataTable
      :rows="rows"
      :columns="columns"
      dense
      zebra
      :searchable="false"
    />
  </div>
</template>
