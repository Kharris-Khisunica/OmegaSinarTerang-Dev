<script setup lang="ts">
/**
 * Baris konteks read-only (PANDUAN_UI.md §8.5), mis. "Tanggal : 30-07-2026 |
 * Sisa Faktur : 1.968.000,00". Dipakai gudang/mutasi, kas-bank/biaya-operasional
 * (varian default `text`/`items` satu baris) dan pembelian/faktur
 * (varian `stacked` — Preview Kalkulasi Baris, paket R7 FB4, font lebih
 * besar & satu komponen per baris, bukan fork komponen — CLAUDE.md §6).
 */
defineProps<{
  text?: string
  items?: { label: string, value: string }[]
  variant?: 'inline' | 'stacked'
}>()
</script>

<template>
  <div
    v-if="variant === 'stacked'"
    class="border border-default rounded-md px-3 py-2 bg-elevated/30 flex flex-col gap-1"
  >
    <div
      v-for="item in items"
      :key="item.label"
      class="flex items-center justify-between text-base"
    >
      <span class="text-muted">{{ item.label }}</span>
      <span class="font-medium">{{ item.value }}</span>
    </div>
  </div>
  <div
    v-else
    class="border border-default rounded-md px-3 py-2 bg-elevated/30 text-sm"
  >
    <span v-if="text">{{ text }}</span>
    <template v-else-if="items">
      <span
        v-for="(item, i) in items"
        :key="item.label"
      >
        <span v-if="i > 0"> | </span>{{ item.label }} : {{ item.value }}
      </span>
    </template>
  </div>
</template>
