<script setup lang="ts">
// Halaman Settings sungguhan (Hari 4) — menggantikan placeholder Hari 3.
// Bukan <CrudFormPage>: bentuk datanya key-value list (GET /settings ->
// TypedSetting[]), disimpan lewat PATCH /settings/:key satu-satu, bukan satu
// entity ber-id seperti form CRUD lain. Tetap MASTER-only lewat role guard.
definePageMeta({ title: 'Pengaturan', roles: ['MASTER'] })

type SettingInputType = 'boolean' | 'number' | 'text' | 'select'

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

// Identitas toko (CLAUDE.md §2.3, §1) — dipakai generator nomor dokumen
// (store_code, jadi segmen "JL/RM01-26070001") dan kepala nota
// (nama/kota/telepon, yang kosong tidak dicetak). Kelompok terpisah dari
// SETTING_META di bawah karena maknanya beda: bukan parameter perilaku
// sistem, tapi data identitas yang tercetak/terpakai apa adanya.
const STORE_IDENTITY_META: Record<string, SettingMeta> = {
  store_code: {
    label: 'Kode Toko',
    description: 'Segmen kedua nomor dokumen (contoh: JL/RM01-26070001) dan bagian kepala nota.',
    type: 'text'
  },
  store_name: {
    label: 'Nama Toko',
    description: 'Tercetak di kepala nota. Kosongkan kalau tidak perlu dicetak.',
    type: 'text'
  },
  store_city: {
    label: 'Kota',
    description: 'Tercetak di kepala nota. Kosongkan kalau tidak perlu dicetak.',
    type: 'text'
  },
  store_phone: {
    label: 'Telepon',
    description: 'Tercetak di kepala nota. Kosongkan kalau tidak perlu dicetak.',
    type: 'text'
  }
}
const STORE_IDENTITY_ORDER = ['store_code', 'store_name', 'store_city', 'store_phone']

const SETTING_META: Record<string, SettingMeta> = {
  company_is_pkp: {
    label: 'Perusahaan Berstatus PKP',
    description: 'Kalau diaktifkan, PPN dihitung otomatis di nota penjualan untuk customer yang juga PKP. Kalau dimatikan, PPN selalu Rp0 di semua nota — berapa pun tarif pajaknya.',
    type: 'boolean'
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
  },
  aging_bucket_days: {
    label: 'Lebar Bucket Umur Piutang/Hutang',
    description: 'Jumlah hari per kelompok umur di Laporan Piutang dan Laporan Hutang (mis. 30 -> kolom "1-30", "31-60", "61-90", ">90"). Berlaku langsung ke laporan berikutnya, tanpa restart.',
    type: 'number'
  }
}
const SETTING_ORDER = ['company_is_pkp', 'tax_calculation_mode', 'backdate_max_days', 'aging_bucket_days']

const api = useApi()
const toast = useToast()

const original = ref<Record<string, string | number | boolean>>({})
const form = reactive<Record<string, string | number | boolean>>({})
const extraKeys = ref<string[]>([])
const loading = ref(true)
const saving = ref(false)
const bannerError = ref('')
const storeCodeLocked = ref(false)

const allKeys = computed(() => STORE_IDENTITY_ORDER.concat(SETTING_ORDER, extraKeys.value))
const isDirty = computed(() => allKeys.value.some(key => form[key] !== original.value[key]))

async function load() {
  loading.value = true
  bannerError.value = ''
  try {
    const [settings, lockStatus] = await Promise.all([
      api.get<TypedSetting[]>('/settings'),
      api.get<{ locked: boolean }>('/settings/store-code-lock-status')
    ])
    const map: Record<string, string | number | boolean> = {}
    for (const s of settings) map[s.key] = s.value
    original.value = { ...map }
    Object.assign(form, map)
    extraKeys.value = settings
      .map(s => s.key)
      .filter(key => !STORE_IDENTITY_ORDER.includes(key) && !SETTING_ORDER.includes(key))
    storeCodeLocked.value = lockStatus.locked
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
    const changedKeys = allKeys.value.filter(key => form[key] !== original.value[key])
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
    <PageHeader />

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
      class="flex flex-col gap-4"
    >
      <div class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold text-muted uppercase tracking-wide">
          Identitas Toko
        </h2>

        <UAlert
          v-if="storeCodeLocked"
          color="warning"
          variant="subtle"
          icon="i-lucide-lock"
          title="Kode toko terkunci"
          description="Sudah ada dokumen terbit memakai kode ini — Kode Toko tidak bisa diubah lagi."
        />

        <UPageCard
          v-for="key in STORE_IDENTITY_ORDER.filter(k => k in form)"
          :key="key"
          :title="STORE_IDENTITY_META[key]!.label"
          :description="STORE_IDENTITY_META[key]!.description"
        >
          <template #footer>
            <div class="flex flex-col items-end gap-1">
              <UInput
                :model-value="String(form[key])"
                :disabled="key === 'store_code' && storeCodeLocked"
                class="w-full sm:w-64"
                @update:model-value="(v) => (form[key] = v)"
              />
              <span
                v-if="key === 'store_code' && !storeCodeLocked"
                class="text-xs text-muted"
              >Tidak bisa diubah setelah dokumen pertama terbit.</span>
            </div>
          </template>
        </UPageCard>
      </div>

      <div class="flex flex-col gap-3 pt-2 border-t border-default">
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
            <QtyInput
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
