<script setup lang="ts" generic="T extends { id: string } & Record<string, unknown>">
import type { Column } from '~/types/data-table'

/**
 * Pemilih baris (PANDUAN_UI.md §8.4). Referensi:
 * docs/referensi/penerimaan-kas/Penerimaan Kas - Entri baris - Daftar Nota.jpg.
 * Belum dipakai halaman apa pun hari ini — dibangun untuk <LookupField> dan
 * Hari 17+ (modal baris yang butuh pemilihan dari daftar besar, mis. supplier,
 * produk, nota tertunggak).
 */
defineProps<{
  open: boolean
  title: string
  endpoint: string
  columns: Column<T>[]
  searchPlaceholder?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'pick': [row: T]
}>()

const table = ref()
const selected = ref<T | null>(null)

function pick(row: T) {
  emit('pick', row)
  emit('update:open', false)
}

function confirmPick() {
  if (selected.value) pick(selected.value)
}

function onRowClick(row: T) {
  selected.value = row
}
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    :dismissible="false"
    :ui="{ content: 'max-w-[900px]' }"
    @update:open="(v: boolean) => emit('update:open', v)"
  >
    <template #content>
      <div class="bg-elevated border-b border-default px-4 py-3 flex items-center justify-between">
        <h2 class="text-lg font-bold">
          {{ title }}
        </h2>
        <div class="flex gap-2">
          <UButton
            icon="i-lucide-check"
            :disabled="!selected"
            @click="confirmPick"
          >
            Pilih
          </UButton>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            @click="table?.reload()"
          >
            Refresh
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            @click="emit('update:open', false)"
          >
            Keluar
          </UButton>
        </div>
      </div>
      <div class="p-4 max-h-[70vh] overflow-y-auto">
        <DataTable
          ref="table"
          :endpoint="endpoint"
          :columns="columns"
          :search-placeholder="searchPlaceholder"
          :on-row-click="onRowClick"
          selectable
          dense
          zebra
          @dblclick="confirmPick"
        />
      </div>
    </template>
  </UModal>
</template>
