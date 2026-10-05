<script setup lang="ts">
/**
 * Modal dokumen lapis 1 (PANDUAN_UI.md §6, §8.1). Memasang KEEMPAT pengaman
 * §1.1 di dalam komponen ini (bukan di halaman pemanggil) — kalau di pemanggil,
 * satu halaman bisa lupa memasang dan tidak ada error apa pun yang memberi tahu:
 *   1. :dismissible="false" — klik overlay tidak menutup.
 *   2. Esc menutup satu lapis, konfirmasi kalau dirty.
 *   3. Guard beforeunload aktif selama open && dirty.
 *   4. Draf otomatis ke sessionStorage per draftKey, dipulihkan saat dibuka lagi,
 *      dihapus lewat clearDraft() setelah Simpan berhasil.
 *
 * `dirty` sengaja BUKAN v-model — hanya pemanggil (yang memegang data form) yang
 * tahu isDirty(). `width` default cocok dengan literal default PANDUAN_UI.md §9
 * ("min(1100px, 92vw)"); nilai lain hanya dipakai lewat gaya inline, kelas
 * Tailwind statis di bawah tidak ikut berubah (tidak ada pemanggil hari ini yang
 * mengganti width, lihat CrudFormPage/MasterDataCrudPage — dicatat sebagai
 * keterbatasan yang diketahui, bukan bug diam-diam).
 */
const props = withDefaults(defineProps<{
  title: string
  mode: 'entri' | 'ubah'
  operator: string
  hint?: string
  open: boolean
  dirty: boolean
  saving?: boolean
  width?: string
  draftKey?: string
  draftData?: unknown
  confirmCloseMessage?: string
}>(), {
  hint: 'Tekan Ctrl+S untuk simpan',
  saving: false,
  width: 'min(1100px, 92vw)',
  confirmCloseMessage: 'Ada perubahan yang belum disimpan. Tutup dan buang perubahan?'
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': []
  'close': []
  'restore-draft': [data: unknown]
}>()

const slots = useSlots()

const modalTitle = computed(() => (props.mode === 'entri' ? `Entri ${props.title}` : `Ubah ${props.title}`))

function requestClose() {
  if (props.dirty && !window.confirm(props.confirmCloseMessage)) return
  emit('update:open', false)
  emit('close')
}

function forceClose() {
  emit('update:open', false)
  emit('close')
}

function clearDraft() {
  if (props.draftKey) sessionStorage.removeItem(props.draftKey)
}

useDocumentHotkeys('document', {
  onSave: () => emit('save'),
  onEsc: requestClose
}, { active: computed(() => props.open) })

// Pengaman #4 — restore: dipulihkan setiap modal (jenis dokumen yang sama) dibuka.
watch(() => [props.open, props.draftKey] as const, ([isOpen, key]) => {
  if (!isOpen || !key) return
  const stored = sessionStorage.getItem(key)
  if (!stored) return
  try {
    emit('restore-draft', JSON.parse(stored))
  } catch {
    // Draf korup — abaikan, jangan sampai menggagalkan pembukaan modal.
  }
})

// Pengaman #4 — simpan: debounce manual (bukan @vueuse/core, belum jadi dependency).
let draftDebounce: ReturnType<typeof setTimeout> | undefined
watch(() => props.draftData, () => {
  if (!props.open || !props.dirty || !props.draftKey) return
  const key = props.draftKey
  const data = props.draftData
  if (draftDebounce) clearTimeout(draftDebounce)
  draftDebounce = setTimeout(() => {
    sessionStorage.setItem(key, JSON.stringify(data))
  }, 400)
}, { deep: true })

// Pengaman #3.
function onBeforeUnload(e: BeforeUnloadEvent) {
  if (!props.open || !props.dirty) return
  e.preventDefault()
  e.returnValue = ''
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onUnmounted(() => window.removeEventListener('beforeunload', onBeforeUnload))

defineExpose({ clearDraft, forceClose })
</script>

<template>
  <UModal
    :open="open"
    :title="modalTitle"
    :dismissible="false"
    :ui="{ content: 'max-w-[min(1100px,92vw)]' }"
    @update:open="(v: boolean) => !v && requestClose()"
  >
    <template #content>
      <div class="bg-elevated border-b border-default px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-bold">
            {{ modalTitle }}
          </h2>
          <p class="text-xs text-muted">
            Operator : {{ operator }}
          </p>
        </div>
        <p
          v-if="hint"
          class="text-xs text-muted whitespace-nowrap"
        >
          {{ hint }}
        </p>
      </div>

      <div class="p-4 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
        <slot name="header" />
        <div v-if="slots.lines">
          <slot name="lines" />
        </div>
      </div>

      <div class="border-t border-default px-4 py-2 flex items-center justify-between gap-4">
        <div
          v-if="slots.totals"
          class="text-sm"
        >
          <slot name="totals" />
        </div>
        <div class="flex gap-2 ml-auto">
          <UButton
            icon="i-lucide-save"
            :loading="saving"
            :disabled="saving"
            @click="emit('save')"
          >
            Simpan
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            @click="requestClose"
          >
            Keluar
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
