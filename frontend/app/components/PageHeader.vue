<script setup lang="ts">
// Satu heading dipakai ulang di semua halaman list (sebelumnya tiap halaman
// menulis `<h1>` sendiri, teksnya duplikat persis dengan `definePageMeta({
// title })` yang sudah ada di semua halaman tapi tidak pernah benar-benar
// dibaca — lihat PROGRESS.md §3 Hari 10). `title` di sini opsional: kalau
// tidak diisi, diambil dari `route.meta.title` (cukup untuk hampir semua
// halaman list). `CrudFormPage` mengisinya eksplisit karena propnya sendiri
// wajib (`title: string`) dan sudah divalidasi lebih dulu di sana.
const props = defineProps<{
  title?: string
  description?: string
}>()

const route = useRoute()
const heading = computed(() => props.title ?? route.meta.title ?? '')
const crumbs = useBreadcrumbs()
</script>

<template>
  <div class="flex flex-col gap-2">
    <PageBreadcrumb :items="crumbs" />
    <div class="flex items-start justify-between gap-4">
      <div class="flex flex-col gap-1 min-w-0">
        <h1 class="text-lg font-semibold truncate">
          {{ heading }}
        </h1>
        <p
          v-if="description"
          class="text-sm text-muted"
        >
          {{ description }}
        </p>
      </div>
      <div
        v-if="$slots.default"
        class="flex items-center gap-2 shrink-0"
      >
        <slot />
      </div>
    </div>
  </div>
</template>
