<script setup lang="ts">
/**
 * Halaman QA sementara (Hari 5) — bukti manual bahwa <ExportButton>/useExport() bisa
 * mengunduh file lewat endpoint dummy (server/api/export-demo.get.ts). Tidak ditaruh di
 * navigation.ts (diakses lewat URL langsung). HAPUS halaman ini begitu ada halaman
 * laporan sungguhan (Hari 26+) yang memakai <ExportButton> untuk verifikasi nyata.
 */
definePageMeta({ title: 'QA — Export Demo', roles: ['MASTER'] })
</script>

<template>
  <div class="p-4 flex flex-col gap-4 max-w-md">
    <PageHeader />
    <p class="text-sm text-muted">
      Uji manual <code>&lt;ExportButton&gt;</code> terhadap endpoint dummy
      <code>/api/export-demo</code>. Klik tombol di bawah, pastikan file terunduh dengan
      nama <code>demo-export-&lt;tanggal&gt;.xlsx</code> / <code>.pdf</code>.
    </p>
    <ExportButton
      endpoint="/api/export-demo"
      file-name-prefix="demo-export"
    />
  </div>
</template>
