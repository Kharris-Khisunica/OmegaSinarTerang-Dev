<script setup lang="ts">
// Placeholder untuk membuktikan role guard (roles: ['MASTER']) berfungsi di halaman
// nyata — GANTI dengan halaman Settings sungguhan begitu modul itu dikerjakan
// (permission matrix CLAUDE.md §5: Settings hanya MASTER).
definePageMeta({ roles: ['MASTER'] })
</script>

<template>
  <div class="p-4">
    <UPageCard
      title="Pengaturan"
      description="Placeholder — modul Settings sungguhan menyusul. Halaman ini hanya membuktikan role guard MASTER-only."
    />
  </div>
</template>
