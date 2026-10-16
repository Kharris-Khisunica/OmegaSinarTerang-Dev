<script setup lang="ts">
/**
 * Modal baris lapis 2 (PANDUAN_UI.md §7, §8.2). Dipakai Purchase Invoice,
 * Sales Order, dan Sales Invoice (Hari 20). Menumpuk visual di atas layer 1
 * otomatis lewat stacking dialog Nuxt UI (Teleport terpisah), tidak perlu
 * z-index manual.
 *
 * Emit `unlock-harga`/`unlock-diskon` (lock harga & diskon Ctrl+H/Ctrl+D,
 * §7.1.4) DICABUT (docs/RENCANA_REVISI_TESTING_KLIEN.md §3 paket R5 FP4) —
 * satu-satunya pemakainya (Faktur Penjualan) tidak lagi punya konsep field
 * terkunci.
 *
 * Sama seperti <DocumentModal>, TANPA pengaman beforeunload/sessionStorage —
 * §1.1 poin 3-4 hanya untuk modal DOKUMEN, bukan modal baris; baris yang
 * belum disimpan boleh hilang saat refresh, yang penting baris yang sudah
 * masuk grid dokumen induk aman (lewat draft dokumen induknya).
 */
const props = withDefaults(defineProps<{
  title: string
  mode: 'entri' | 'ubah'
  open: boolean
  dirty: boolean
  saving?: boolean
  width?: string
  confirmCloseMessage?: string
}>(), {
  saving: false,
  width: '900px',
  confirmCloseMessage: 'Ada perubahan yang belum disimpan. Tutup dan buang perubahan?'
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': []
  'close': []
  'enter-next': [e: KeyboardEvent]
  /**
   * Enter di field TERAKHIR (§12: "simpan baris lalu buka modal baris
   * kosong"). Pemanggil yang mendengarkan ini menyimpan + membuka baris baru;
   * kalau tidak didengarkan, LineModal jatuh ke `save` biasa.
   */
  'enter-last': []
}>()

const instance = getCurrentInstance()
const formEl = ref<HTMLElement | null>(null)
const { register } = useModalStack()
register('line', computed(() => props.open))

const FIELD_SELECTOR = [
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([disabled]):not([readonly])',
  'select:not([disabled])',
  'button[role="combobox"]:not([disabled])'
].join(', ')

// need_fixing.md #8 — Enter pindah ke field berikutnya di slot #form; di
// field terakhir = simpan. Tidak mengganggu: textarea (baris baru), tombol
// biasa, combobox yang sedang terbuka (Enter memilih opsi), dan event yang
// sudah ditangani komponen lain (defaultPrevented, mis. USelect membuka list).
function onEnterNext(e: KeyboardEvent) {
  emit('enter-next', e)
  if (e.defaultPrevented || e.isComposing) return
  const form = formEl.value
  const target = e.target as HTMLElement | null
  if (!form || !target || !form.contains(target)) return
  if (target.tagName === 'TEXTAREA') return
  if (target.tagName === 'BUTTON' && target.getAttribute('role') !== 'combobox') return
  if (target.getAttribute('aria-expanded') === 'true') return

  const fields = Array.from(form.querySelectorAll<HTMLElement>(FIELD_SELECTOR))
    .filter(el => el.offsetParent !== null)
  const index = fields.findIndex(el => el === target || el.contains(target))
  if (index === -1) return
  e.preventDefault()
  if (index < fields.length - 1) {
    fields[index + 1]!.focus()
    return
  }
  if (instance?.vnode.props?.onEnterLast) emit('enter-last')
  else emit('save')
}

const modalTitle = computed(() => (props.mode === 'entri' ? `Entri ${props.title}` : `Ubah ${props.title}`))

function requestClose() {
  if (props.dirty && !window.confirm(props.confirmCloseMessage)) return
  emit('update:open', false)
  emit('close')
}

useDocumentHotkeys('line', {
  onSave: () => emit('save'),
  onEsc: requestClose,
  onEnterNext
}, { active: computed(() => props.open) })
</script>

<template>
  <UModal
    :open="open"
    :title="modalTitle"
    :dismissible="false"
    :ui="{ content: 'max-w-[900px]' }"
    @update:open="(v: boolean) => !v && requestClose()"
  >
    <template #content>
      <div class="bg-elevated border-b border-default px-4 py-3">
        <h2 class="text-lg font-bold">
          {{ modalTitle }}
        </h2>
      </div>

      <div class="p-4 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
        <div
          ref="formEl"
          class="flex flex-col gap-3"
        >
          <slot name="form" />
        </div>
        <div class="flex flex-col gap-3">
          <slot name="context" />
        </div>
      </div>

      <div class="border-t border-default px-4 py-2 flex items-center justify-between gap-4">
        <div class="text-xs text-muted">
          <slot name="hotkeys">
            <HotkeyHint />
          </slot>
        </div>
        <div class="flex gap-2">
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
