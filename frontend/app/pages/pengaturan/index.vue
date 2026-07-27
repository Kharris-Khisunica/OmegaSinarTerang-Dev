<script setup lang="ts">
// Halaman Settings sungguhan (Hari 4) — menggantikan placeholder Hari 3.
// Bukan <CrudFormPage>: bentuk datanya key-value list (GET /settings ->
// TypedSetting[]), disimpan lewat PATCH /settings/:key satu-satu, bukan satu
// entity ber-id seperti form CRUD lain. Tetap MASTER-only lewat role guard.
definePageMeta({ roles: ['MASTER'] })

type SettingInputType = 'boolean' | 'number' | 'select'

interface SettingMeta {
  label: string
  description: string
  type: SettingInputType
  options?: { label: string, value: string }[]
}

interface TypedSetting {
  key: string
  value: string | number | boolean
  valueType: 'BOOLEAN' | 'NUMBER' | 'STRING'
}

const SETTING_META: Record<string, SettingMeta> = {
  company_is_pkp: {
    label: 'Perusahaan Berstatus PKP',
    description: 'Kalau diaktifkan, PPN dihitung otomatis di nota penjualan untuk customer yang juga PKP. Kalau dimatikan, PPN selalu Rp0 di semua nota — berapa pun tarif pajaknya.',
    type: 'boolean'
  },
  rounding_multiple: {
    label: 'Pembulatan Nota',
    description: 'Total nota penjualan dibulatkan ke atas ke kelipatan angka ini. Contoh: diisi 100, nota Rp125.430 dibulatkan jadi Rp125.500. Hanya berlaku di nota penjualan, tidak pernah di pembelian.',
    type: 'number'
  },
  tax_calculation_mode: {
    label: 'Mode Perhitungan Pajak',
    description: 'Menentukan cara PPN dihitung dari harga yang diinput. "Belum termasuk pajak" berarti PPN ditambahkan di atas harga; "Sudah termasuk pajak" berarti PPN sudah menyatu di harga.',
    type: 'select',
    options: [
      { label: 'Harga belum termasuk pajak (PPN ditambahkan)', value: 'EXCLUDE' },
      { label: 'Harga sudah termasuk pajak', value: 'INCLUDE' }
    ]
  },
  backdate_max_days: {
    label: 'Maksimum Mundur Tanggal Transaksi',
    description: 'Berapa hari ke belakang tanggal transaksi masih boleh diinput mundur (backdate). Lebih dari ini akan ditolak sistem.',
    type: 'number'
  }
}
const SETTING_ORDER = ['company_is_pkp', 'rounding_multiple', 'tax_calculation_mode', 'backdate_max_days']

const api = useApi()
const toast = useToast()

const original = ref<Record<string, string | number | boolean>>({})
const form = reactive<Record<string, string | number | boolean>>({})
const extraKeys = ref<string[]>([])
const loading = ref(true)
const saving = ref(false)
const bannerError = ref('')

const isDirty = computed(() => SETTING_ORDER.concat(extraKeys.value).some(key => form[key] !== original.value[key]))

async function load() {
  loading.value = true
  bannerError.value = ''
  try {
    const settings = await api.get<TypedSetting[]>('/settings')
    const map: Record<string, string | number | boolean> = {}
    for (const s of settings) map[s.key] = s.value
    original.value = { ...map }
    Object.assign(form, map)
    extraKeys.value = settings.map(s => s.key).filter(key => !SETTING_ORDER.includes(key))
  } catch (err) {
    bannerError.value = getErrorMessage(err, 'Gagal memuat pengaturan.')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (saving.value || !isDirty.value) return
  saving.value = true
  bannerError.value = ''
  try {
    const changedKeys = SETTING_ORDER.concat(extraKeys.value).filter(key => form[key] !== original.value[key])
    for (const key of changedKeys) {
      await api.patch(`/settings/${key}`, { value: form[key] })
      original.value[key] = form[key]!
    }
    toast.add({ title: 'Pengaturan tersimpan', color: 'success' })
  } catch (err) {
    bannerError.value = getErrorMessage(err, 'Gagal menyimpan pengaturan.')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="p-4 flex flex-col gap-4 max-w-2xl">
    <h1 class="text-lg font-semibold">
      Pengaturan
    </h1>

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
      class="flex flex-col gap-3"
    >
      <USkeleton
        v-for="i in 4"
        :key="i"
        class="h-20 w-full"
      />
    </div>

    <div
      v-else
      class="flex flex-col gap-3"
    >
      <UPageCard
        v-for="key in SETTING_ORDER.filter(k => k in form)"
        :key="key"
        :title="SETTING_META[key]!.label"
        :description="SETTING_META[key]!.description"
      >
        <template #footer>
          <USwitch
            v-if="SETTING_META[key]!.type === 'boolean'"
            :model-value="form[key] === true"
            @update:model-value="(v) => (form[key] = v)"
          />
          <UInputNumber
            v-else-if="SETTING_META[key]!.type === 'number'"
            :model-value="Number(form[key])"
            class="w-40"
            @update:model-value="(v) => (form[key] = v ?? 0)"
          />
          <USelect
            v-else-if="SETTING_META[key]!.type === 'select'"
            :model-value="String(form[key])"
            :items="SETTING_META[key]!.options"
            class="w-full sm:w-80"
            @update:model-value="(v) => (form[key] = v as string)"
          />
        </template>
      </UPageCard>
    </div>

    <div class="flex items-center gap-2 pt-2 border-t border-default">
      <UButton
        :loading="saving"
        :disabled="saving || !isDirty"
        icon="i-lucide-save"
        @click="save"
      >
        Simpan Perubahan
      </UButton>
      <span
        v-if="isDirty"
        class="text-xs text-muted"
      >Ada perubahan belum disimpan</span>
    </div>
  </div>
</template>
