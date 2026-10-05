<script setup lang="ts" generic="T extends { id: string } & Record<string, unknown>">
import type { Column } from '~/types/data-table'

/**
 * Triplet [kode] […] [nama] (PANDUAN_UI.md §8.3) — pola di hampir setiap
 * dokumen transaksi. Belum dipakai halaman apa pun hari ini (master data
 * tidak punya field lookup ke dokumen lain) — dibangun untuk Hari 17+.
 *
 * Ketik kode + Tab bekerja tanpa membuka modal: resolve lewat
 * GET {endpoint}?search={kode}&limit=5, cocokkan exact ke codeField.
 */
const props = withDefaults(defineProps<{
  modelValue: string | number | null
  endpoint: string
  columns: Column<T>[]
  displayField: string
  codeField?: string
  placeholder?: string
  disabled?: boolean
}>(), {
  codeField: 'code'
})

const emit = defineEmits<{
  'update:modelValue': [code: string | number | null]
  'change': [row: T | null]
}>()

const api = useApi()
const buffer = ref(String(props.modelValue ?? ''))
const displayName = ref('')
const notFound = ref(false)
const modalOpen = ref(false)

watch(() => props.modelValue, (v) => {
  buffer.value = String(v ?? '')
})

async function resolveByCode() {
  notFound.value = false
  const typed = buffer.value.trim()
  if (!typed) {
    displayName.value = ''
    emit('update:modelValue', null)
    emit('change', null)
    return
  }
  try {
    const res = await api.get<{ data: T[] }>(props.endpoint, { search: typed, limit: 5 })
    const match = res.data.find(row => String(row[props.codeField]).toLowerCase() === typed.toLowerCase())
    if (match) {
      displayName.value = String(match[props.displayField] ?? '')
      emit('update:modelValue', match.id)
      emit('change', match)
    } else {
      notFound.value = true
      displayName.value = ''
      emit('update:modelValue', null)
      emit('change', null)
    }
  } catch {
    notFound.value = true
  }
}

function onPick(row: T) {
  buffer.value = String(row[props.codeField] ?? '')
  displayName.value = String(row[props.displayField] ?? '')
  notFound.value = false
  emit('update:modelValue', row.id)
  emit('change', row)
}

// Escape hatch untuk pemanggil yang memulihkan modelValue dari LUAR (draft
// sessionStorage, DocumentModal §pengaman 4) -- watcher modelValue di atas
// hanya tahu ID, bukan kode/nama untuk ditampilkan. Pemanggil yang sudah
// tahu baris aslinya (dari fetch ulang setelah restore) memanggil ini secara
// eksplisit. Tidak dipakai untuk alur pick normal (onPick sudah cukup).
function setDisplay(code: string, name: string) {
  buffer.value = code
  displayName.value = name
  notFound.value = false
}

defineExpose({ setDisplay })
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-center gap-2">
      <UInput
        v-model="buffer"
        :placeholder="placeholder"
        :disabled="disabled"
        class="w-28"
        :class="notFound ? 'ring-1 ring-error' : ''"
        @keydown.tab="resolveByCode"
        @blur="resolveByCode"
      />
      <UButton
        icon="i-lucide-ellipsis"
        color="neutral"
        variant="subtle"
        :disabled="disabled"
        @click="modalOpen = true"
      >
        …
      </UButton>
      <span class="flex-1 px-3 py-1.5 rounded-md text-muted truncate">{{ displayName }}</span>
    </div>
    <div v-if="$slots.detail">
      <slot name="detail" />
    </div>
    <LookupModal
      v-model:open="modalOpen"
      :title="placeholder ?? 'Pilih'"
      :endpoint="endpoint"
      :columns="columns"
      @pick="onPick"
    />
  </div>
</template>
