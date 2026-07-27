<script setup lang="ts">
import type { ExportFormat } from '~/composables/useExport'

const props = withDefaults(defineProps<{
  /** Path endpoint export, mis. "/reports/stock". Dipanggil dengan query ?format=xlsx|pdf. */
  endpoint: string
  /** Awalan nama file unduhan, mis. "laporan-stok" -> "laporan-stok-2026-08-05.xlsx". */
  fileNamePrefix: string
  /** Filter tambahan (tanggal, gudang, dsb) dikirim sebagai query string bareng format. */
  filters?: () => Record<string, unknown>
  /** Format yang ditampilkan. Default keduanya (Excel + PDF). */
  formats?: ExportFormat[]
}>(), {
  filters: undefined,
  formats: () => ['xlsx', 'pdf']
})

const toast = useToast()
const { exporting, exportFile } = useExport(props.endpoint, props.filters)

const FORMAT_META: Record<ExportFormat, { label: string, icon: string }> = {
  xlsx: { label: 'Excel', icon: 'i-lucide-file-spreadsheet' },
  pdf: { label: 'PDF', icon: 'i-lucide-file-text' }
}

async function handleExport(format: ExportFormat) {
  try {
    await exportFile(format, props.fileNamePrefix)
  } catch {
    toast.add({ title: 'Gagal mengunduh file', color: 'error' })
  }
}
</script>

<template>
  <div class="flex items-center gap-2">
    <UButton
      v-for="format in formats"
      :key="format"
      color="neutral"
      variant="subtle"
      :icon="FORMAT_META[format].icon"
      :loading="exporting"
      :disabled="exporting"
      @click="handleExport(format)"
    >
      {{ FORMAT_META[format].label }}
    </UButton>
  </div>
</template>
