<script setup lang="ts">
/**
 * Strip total kaki modal dokumen (PANDUAN_UI.md §6.4, §8.6). Belum dipakai
 * halaman apa pun hari ini (master data tidak punya total) — dibangun untuk
 * Hari 17+. Host yang memformat `value` lewat useRupiah()/useQty() — komponen
 * ini nol formatting sendiri (CLAUDE.md §6: satu composable format angka).
 */
defineProps<{
  items: { label: string, value: string, emphasize?: boolean }[]
}>()
</script>

<template>
  <div class="flex items-center gap-4 text-sm">
    <span
      v-for="item in items"
      :key="item.label"
      :class="item.emphasize ? 'font-semibold text-primary' : ''"
    >
      {{ item.label }} : {{ item.value }}
    </span>
  </div>
</template>
