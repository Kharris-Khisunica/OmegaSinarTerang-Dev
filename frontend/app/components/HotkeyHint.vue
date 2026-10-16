<script setup lang="ts">
/**
 * Baris hint hotkey kaki modal (PANDUAN_UI.md §7.1, §8.6, §12) — dipakai
 * kaki <LineModal> & <DocumentModal> (need_fixing.md #8: hotkey wajib
 * TERLIHAT, CLAUDE.md §3). Default lama Ctrl+H/Ctrl+D dicabut bersama
 * fiturnya (paket R5 FP4); default sekarang = hotkey modal baris.
 */
withDefaults(defineProps<{
  hints?: { keys: string, action: string }[]
}>(), {
  hints: () => [
    { keys: 'Enter', action: 'Field berikutnya / Simpan' },
    { keys: 'Ctrl + S', action: 'Simpan' },
    { keys: 'Esc', action: 'Keluar' }
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
