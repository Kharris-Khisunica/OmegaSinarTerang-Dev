<script setup lang="ts">
/**
 * Pengganti komponen angka bawaan Nuxt UI untuk uang (docs/RENCANA_REVISI_TESTING_KLIEN.md
 * §3 R1, item T1). Komponen lama baru memformat SETELAH blur — penyebab
 * langsung kesalahan satu-nol saat testing karena operator tidak dapat umpan
 * balik saat mengetik. <MoneyInput> membungkus <UInput> polos dan memformat
 * pemisah ribuan pada SETIAP input event, caret dijaga lewat
 * useLiveFormattedInput(). Format/parse-nya sendiri dari useRupiah()
 * (CLAUDE.md §6 — tidak ada formatter kedua).
 */
const props = withDefaults(defineProps<{
  modelValue?: number
  placeholder?: string
  min?: number
  max?: number
  disabled?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}>(), {})

const emit = defineEmits<{
  'update:modelValue': [value: number | undefined]
}>()

const { formatTyping, parseTyping } = useRupiah()
const { handleRawInput } = useLiveFormattedInput({
  toDisplay: raw => formatTyping(parseTyping(raw)),
  toValue: raw => parseTyping(raw)
})

// UInput men-defineExpose({ inputRef }) sebagai ShallowRef<HTMLInputElement> —
// tapi diakses dari SINI (parent), Vue meng-auto-unwrap satu level, jadi
// `inputComp.value.inputRef` SUDAH elemen DOM asli (bukan `.inputRef.value`
// lagi — itu sempat dicoba dan melempar "setSelectionRange is not a
// function" karena kena `.value` milik <input> itu sendiri, yaitu STRING
// isinya, bukan elemen). Dibuktikan lewat uji manual, bukan dugaan.
const inputComp = ref<{ inputRef?: HTMLInputElement | null } | null>(null)
function getInputEl(): HTMLInputElement | null {
  return inputComp.value?.inputRef ?? null
}

const currentValue = ref<number | undefined>(props.modelValue)
const display = ref(currentValue.value === undefined ? '' : formatTyping(currentValue.value))

// Sinkron dari luar (reset form, restore draft) — hanya kalau nilainya benar-benar
// beda dari yang lagi ditampilkan, supaya tidak mengganggu caret saat user mengetik.
watch(() => props.modelValue, (v) => {
  if (v !== currentValue.value) {
    currentValue.value = v
    display.value = v === undefined ? '' : formatTyping(v)
  }
})

function clamp(value: number | undefined): number | undefined {
  if (value === undefined) return undefined
  let v = value
  if (props.min !== undefined && v < props.min) v = props.min
  if (props.max !== undefined && v > props.max) v = props.max
  return v
}

function onInput(raw: string) {
  const el = getInputEl()
  const result = handleRawInput(raw, el)
  display.value = result.display
  currentValue.value = result.value
  // nextTick WAJIB dijadwalkan SESUDAH `display.value` ditulis (bukan di
  // dalam handleRawInput) — Vue mem-patch ulang <input> setiap `display`
  // berubah, dan menulis `el.value` native selalu memindahkan caret ke
  // ujung. Dijadwalkan di sini, nextTick ini resolve SESUDAH patch Vue itu.
  if (el && result.newCaret !== null) {
    const caret = result.newCaret
    nextTick(() => {
      el.setSelectionRange(caret, caret)
    })
  }
  emit('update:modelValue', result.value)
}

function onBlur() {
  const clamped = clamp(currentValue.value)
  if (clamped !== currentValue.value) {
    currentValue.value = clamped
    emit('update:modelValue', clamped)
  }
  display.value = clamped === undefined ? '' : formatTyping(clamped)
}
</script>

<template>
  <UInput
    ref="inputComp"
    :model-value="display"
    type="text"
    inputmode="numeric"
    autocomplete="off"
    :placeholder="placeholder"
    :disabled="disabled"
    :size="size"
    @update:model-value="(v) => onInput(String(v ?? ''))"
    @blur="onBlur"
  />
</template>
