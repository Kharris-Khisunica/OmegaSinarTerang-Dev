<script setup lang="ts">
import type { FieldDef, SelectOption } from '~/types/crud-form'

const props = defineProps<{
  title: string
  endpoint: string
  id?: string | number
  schema: FieldDef[]
  backTo: string
  transformIn?: (data: Record<string, unknown>) => Record<string, unknown>
  transformOut?: (form: Record<string, unknown>) => unknown
}>()

const api = useApi()
const router = useRouter()
const toast = useToast()

const isEdit = computed(() => props.id !== undefined && props.id !== null && props.id !== '')

function blankForm(): Record<string, unknown> {
  const form: Record<string, unknown> = {}
  for (const field of props.schema) {
    form[field.key] = field.type === 'switch' ? false : null
  }
  return form
}

const form = reactive(blankForm())
const fieldErrors = ref<Record<string, string>>({})
const bannerError = ref('')
const submitting = ref(false)
const loading = ref(isEdit.value)
let initialSnapshot = JSON.stringify(form)

const resolvedOptions = reactive<Record<string, SelectOption[]>>({})
async function loadOptions() {
  for (const field of props.schema) {
    if ((field.type === 'select' || field.type === 'autocomplete') && field.options) {
      resolvedOptions[field.key] = typeof field.options === 'function' ? await field.options() : field.options
    }
  }
}

const colSpanClasses: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  7: 'col-span-7',
  8: 'col-span-8',
  9: 'col-span-9',
  10: 'col-span-10',
  11: 'col-span-11',
  12: 'col-span-12'
}
function colSpan(field: FieldDef) {
  return colSpanClasses[field.cols ?? 12] ?? 'col-span-12'
}

function isDisabled(field: FieldDef) {
  return typeof field.disabled === 'function' ? field.disabled(form) : !!field.disabled
}

function asString(key: string): string | undefined {
  const v = form[key]
  return v === null || v === undefined ? undefined : String(v)
}
function asNumber(key: string): number | undefined {
  const v = form[key]
  return typeof v === 'number' ? v : undefined
}
function asBoolean(key: string): boolean {
  return form[key] === true
}
function asSelectValue(key: string): string | number | boolean | undefined {
  const v = form[key]
  return (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') ? v : undefined
}
function setField(key: string, value: unknown) {
  form[key] = value
}

const firstFieldContainer = ref<HTMLElement | null>(null)
function focusFirstField() {
  nextTick(() => {
    const el = firstFieldContainer.value?.querySelector<HTMLElement>('input, select, textarea, button')
    el?.focus()
  })
}

function validateClient() {
  const errors: Record<string, string> = {}
  for (const field of props.schema) {
    if (field.required && (form[field.key] === null || form[field.key] === undefined || form[field.key] === '')) {
      errors[field.key] = `${field.label} wajib diisi.`
    }
  }
  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

function mapServerErrors(data: Record<string, unknown> | undefined) {
  const errors: Record<string, string> = {}
  const fieldErrorsData = data?.fieldErrors
  if (fieldErrorsData && typeof fieldErrorsData === 'object') {
    Object.assign(errors, fieldErrorsData as Record<string, string>)
    return errors
  }
  const rawMessage = data?.message
  const messages: string[] = Array.isArray(rawMessage) ? rawMessage : (typeof rawMessage === 'string' ? [rawMessage] : [])
  const unmatched: string[] = []
  for (const msg of messages) {
    const field = props.schema.find(f => msg.toLowerCase().startsWith(f.key.toLowerCase()))
    if (field) errors[field.key] = msg
    else unmatched.push(msg)
  }
  if (unmatched.length) bannerError.value = unmatched.join(' ')
  return errors
}

async function fetchExisting() {
  if (!isEdit.value) return
  loading.value = true
  try {
    const data = await api.get<Record<string, unknown>>(`${props.endpoint}/${props.id}`)
    const mapped = props.transformIn ? props.transformIn(data) : data
    for (const field of props.schema) {
      if (field.key in mapped) form[field.key] = mapped[field.key]
    }
    initialSnapshot = JSON.stringify(form)
  } catch (err) {
    bannerError.value = getErrorMessage(err, 'Gagal memuat data.')
  } finally {
    loading.value = false
  }
}

function isDirty() {
  return JSON.stringify(form) !== initialSnapshot
}

async function submit(again: boolean) {
  if (submitting.value) return
  bannerError.value = ''
  if (!validateClient()) return

  submitting.value = true
  try {
    const payload = props.transformOut ? props.transformOut(form) : { ...form }
    if (isEdit.value) {
      await api.patch(`${props.endpoint}/${props.id}`, payload)
    } else {
      await api.post(props.endpoint, payload)
    }
    toast.add({ title: 'Tersimpan', color: 'success' })

    if (again && !isEdit.value) {
      Object.assign(form, blankForm())
      fieldErrors.value = {}
      initialSnapshot = JSON.stringify(form)
      focusFirstField()
    } else {
      router.push(props.backTo)
    }
  } catch (err) {
    if (getErrorStatus(err) === 400) {
      fieldErrors.value = mapServerErrors(getErrorData(err))
      if (!Object.keys(fieldErrors.value).length && !bannerError.value) {
        bannerError.value = 'Data tidak valid.'
      }
    } else {
      bannerError.value = getErrorMessage(err, 'Gagal menyimpan data.')
    }
  } finally {
    submitting.value = false
  }
}

function goBack() {
  if (isDirty() && !window.confirm('Ada perubahan belum disimpan. Keluar tanpa menyimpan?')) return
  router.push(props.backTo)
}

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    submit(false)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  await loadOptions()
  await fetchExisting()
  focusFirstField()
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="p-4 flex flex-col gap-4 max-w-4xl">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-semibold">
        {{ title }}
      </h1>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-x"
        @click="goBack"
      >
        Kembali
      </UButton>
    </div>

    <UAlert
      v-if="bannerError"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-triangle"
      :title="bannerError"
      :close-button="{ icon: 'i-lucide-x', color: 'neutral', variant: 'link' }"
      @update:open="bannerError = ''"
    />

    <div
      v-if="loading"
      class="grid grid-cols-12 gap-4"
    >
      <USkeleton
        v-for="i in 4"
        :key="i"
        class="h-9 col-span-12"
      />
    </div>

    <form
      v-else
      class="grid grid-cols-12 gap-4"
      @submit.prevent="submit(false)"
    >
      <div
        v-for="(field, index) in schema"
        :key="field.key"
        :ref="index === 0 ? (el: Element | null) => (firstFieldContainer = el as HTMLElement | null) : undefined"
        :class="colSpan(field)"
      >
        <UFormField
          :label="field.label"
          :required="field.required"
          :error="fieldErrors[field.key]"
          :hint="field.hint"
        >
          <UInput
            v-if="field.type === 'text'"
            :model-value="asString(field.key)"
            :placeholder="field.placeholder"
            :disabled="isDisabled(field)"
            class="w-full"
            @update:model-value="(v) => setField(field.key, v)"
          />
          <UTextarea
            v-else-if="field.type === 'textarea'"
            :model-value="asString(field.key)"
            :placeholder="field.placeholder"
            :disabled="isDisabled(field)"
            class="w-full"
            @update:model-value="(v) => setField(field.key, v)"
          />
          <UInputNumber
            v-else-if="field.type === 'number'"
            :model-value="asNumber(field.key)"
            :disabled="isDisabled(field)"
            class="w-full"
            @update:model-value="(v) => setField(field.key, v)"
          />
          <UInputNumber
            v-else-if="field.type === 'currency'"
            :model-value="asNumber(field.key)"
            :disabled="isDisabled(field)"
            locale="id-ID"
            :format-options="{ style: 'currency', currency: 'IDR', currencyDisplay: 'symbol', maximumFractionDigits: 0 }"
            class="w-full"
            @update:model-value="(v) => setField(field.key, v)"
          />
          <USelect
            v-else-if="field.type === 'select'"
            :model-value="asSelectValue(field.key)"
            :items="resolvedOptions[field.key] ?? []"
            :placeholder="field.placeholder"
            :disabled="isDisabled(field)"
            class="w-full"
            @update:model-value="(v) => setField(field.key, v)"
          />
          <UInputMenu
            v-else-if="field.type === 'autocomplete'"
            :model-value="asSelectValue(field.key)"
            value-key="value"
            :items="resolvedOptions[field.key] ?? []"
            :placeholder="field.placeholder"
            :disabled="isDisabled(field)"
            class="w-full"
            @update:model-value="(v) => setField(field.key, v)"
          />
          <UInput
            v-else-if="field.type === 'date'"
            :model-value="asString(field.key)"
            type="date"
            :disabled="isDisabled(field)"
            class="w-full"
            @update:model-value="(v) => setField(field.key, v)"
          />
          <USwitch
            v-else-if="field.type === 'switch'"
            :model-value="asBoolean(field.key)"
            :disabled="isDisabled(field)"
            @update:model-value="(v) => setField(field.key, v)"
          />
        </UFormField>
      </div>
    </form>

    <div class="flex items-center gap-2 pt-2 border-t border-default">
      <UButton
        :loading="submitting"
        :disabled="submitting"
        icon="i-lucide-save"
        @click="submit(false)"
      >
        Simpan
      </UButton>
      <UButton
        v-if="!isEdit"
        :loading="submitting"
        :disabled="submitting"
        color="neutral"
        variant="subtle"
        icon="i-lucide-save-all"
        @click="submit(true)"
      >
        Simpan & Tambah Lagi
      </UButton>
      <span class="text-xs text-muted ml-auto">Ctrl+S simpan · Esc kembali</span>
    </div>
  </div>
</template>
