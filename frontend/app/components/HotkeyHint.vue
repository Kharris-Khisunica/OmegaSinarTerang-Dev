<script setup lang="ts">
/**
 * Baris hint hotkey kaki modal baris (PANDUAN_UI.md §7.1, §8.6). Belum dipakai
 * halaman apa pun hari ini — dibangun untuk Hari 17+. Ikon gembok yang bisa
 * diklik untuk Harga/Diskon BUKAN bagian komponen ini — itu hidup di field
 * Harga/Diskon sendiri di dalam <LineModal>'s #form.
 */
withDefaults(defineProps<{
  hints?: { keys: string, action: string }[]
}>(), {
  hints: () => [
    { keys: 'Ctrl + H', action: 'Ubah Harga' },
    { keys: 'Ctrl + D', action: 'Ubah Diskon' }
  ]
})
</script>

<template>
  <p class="text-xs text-muted">
    <template
      v-for="(hint, i) in hints"
      :key="hint.keys"
    >
      <span v-if="i > 0"> &nbsp;·&nbsp; </span>{{ hint.action }}: {{ hint.keys }}
    </template>
  </p>
</template>
