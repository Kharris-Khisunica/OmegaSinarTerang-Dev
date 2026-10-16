<script setup lang="ts">
// Logo sidebar — menggantikan placeholder "Nuxt UI". Nama aplikasi sama dengan
// <title> di app.vue. Identitas TOKO untuk nota tetap dari settings (CLAUDE.md
// §1); GET /settings MASTER-only, jadi tidak dipakai di sini.
defineProps<{ collapsed?: boolean }>()
</script>

<template>
  <span class="flex items-center gap-2 font-semibold text-highlighted">
    <UIcon
      name="i-lucide-store"
      class="size-5 shrink-0 text-primary"
    />
    <span
      v-if="!collapsed"
      class="truncate"
    >Omega Sinar Terang</span>
  </span>
</template>
