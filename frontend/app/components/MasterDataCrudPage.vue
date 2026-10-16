<script setup lang="ts" generic="T extends { id: string, isActive: boolean } & Record<string, unknown>">
import type { Column, FilterDef, RowAction } from '~/types/data-table'
import type { FieldDef } from '~/types/crud-form'

/**
 * Satu komponen generik dipakai identik oleh index.vue, create.vue, dan
 * [id]/edit.vue setiap modul master data (PANDUAN_UI.md §16.1) — ketiga rute
 * me-render pohon DOM yang sama (daftar + kedua modal), jadi "daftar terlihat
 * di belakang, modal di atas" otomatis benar tanpa trik redirect. Rute
 * create/edit melakukan satu fetch daftar tambahan yang sebenarnya tidak
 * dibutuhkan navigasi itu — diterima (daftar master data kecil & murah).
 */
const props = defineProps<{
  /** Kata benda polos, mis. "Merek" — CrudFormPage mode modal yang menambahkan prefiks Entri/Ubah. */
  title: string
  endpoint: string
  /** URL daftar bersih — dituju lewat router.replace() setelah modal ditutup dari rute create/edit. */
  listTo: string
  columns: Column<T>[]
  schema: FieldDef[]
  filters?: FilterDef[]
  searchPlaceholder?: string
  defaultSort?: { key: string, dir: 'asc' | 'desc' }
  transformIn?: (data: Record<string, unknown>) => Record<string, unknown>
  transformOut?: (form: Record<string, unknown>) => unknown
  initialOpen?: 'entri' | 'ubah' | null
  initialEditId?: string | number
  /** Dipakai di teks konfirmasi tombol Hapus, mis. "merek ini". */
  entityLabelSingular: string
  /** Aksi baris tambahan khusus entity (mis. "Reset Password" di layar Pengguna). */
  extraRowActions?: RowAction<T>[]
}>()

const api = useApi()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const table = ref()
const localSelectedRow = ref<T | null>(null)

const entriOpen = ref(false)
const ubahOpen = ref(false)
const editId = ref<string | number | undefined>()

onMounted(() => {
  if (props.initialOpen === 'entri') {
    entriOpen.value = true
  } else if (props.initialOpen === 'ubah' && props.initialEditId !== undefined) {
    editId.value = props.initialEditId
    ubahOpen.value = true
  }
})

function onRowClick(row: T) {
  localSelectedRow.value = row
}

function closeAndReturn(which: 'entri' | 'ubah') {
  if (which === 'entri') entriOpen.value = false
  else ubahOpen.value = false
  localSelectedRow.value = null
  table.value?.clearSelection()
  table.value?.reload()
  if (route.path !== props.listTo) router.replace(props.listTo)
}

function openEntri() {
  entriOpen.value = true
}

function openUbahFor(row: T) {
  editId.value = row.id
  ubahOpen.value = true
}

function openUbahSelected() {
  if (localSelectedRow.value) openUbahFor(localSelectedRow.value)
}

async function toggleActive(row: T, next: boolean) {
  try {
    await api.patch(`${props.endpoint}/${row.id}`, { isActive: next })
  } catch (err) {
    // Penolakan backend (mis. menonaktifkan akun sendiri di layar Pengguna)
    // dulu tidak tampil sama sekali.
    toast.add({ title: getErrorMessage(err, 'Gagal mengubah status.'), color: 'error' })
    return
  }
  toast.add({ title: next ? `${props.title} diaktifkan` : `${props.title} dinonaktifkan`, color: 'success' })
  table.value?.reload()
}

// "Hapus" (§11.2) — tidak ada endpoint hard-delete (CLAUDE.md §2 melarangnya);
// secara internal ini toggleActive(false), sama seperti aksi "Nonaktifkan" di
// menu titik-tiga. Operator tidak diberi tahu ini bukan penghapusan permanen —
// teks konfirmasi/toast memakai bahasa "Hapus" apa adanya (keputusan user).
async function onHapusClick() {
  const row = localSelectedRow.value
  if (!row || !row.isActive) return
  if (!window.confirm(`Hapus ${props.entityLabelSingular}?`)) return
  try {
    await api.patch(`${props.endpoint}/${row.id}`, { isActive: false })
  } catch (err) {
    toast.add({ title: getErrorMessage(err, 'Gagal menghapus.'), color: 'error' })
    return
  }
  toast.add({ title: `${props.title} dihapus`, color: 'success' })
  localSelectedRow.value = null
  table.value?.clearSelection()
  table.value?.reload()
}

const rowActions = computed<RowAction<T>[]>(() => [
  { label: 'Ubah', icon: 'i-lucide-pencil', roles: ['MASTER', 'OPERATOR'], onClick: row => openUbahFor(row) },
  {
    label: 'Nonaktifkan',
    icon: 'i-lucide-power-off',
    roles: ['MASTER', 'OPERATOR'],
    show: row => row.isActive,
    onClick: row => toggleActive(row, false)
  },
  {
    label: 'Aktifkan',
    icon: 'i-lucide-power',
    roles: ['MASTER', 'OPERATOR'],
    show: row => !row.isActive,
    onClick: row => toggleActive(row, true)
  },
  ...(props.extraRowActions ?? [])
])
</script>

<template>
  <DataTable
    ref="table"
    :endpoint="endpoint"
    :columns="columns"
    :filters="filters"
    :row-actions="rowActions"
    :search-placeholder="searchPlaceholder"
    :default-sort="defaultSort"
    :on-row-click="onRowClick"
    selectable
    dense
    zebra
  >
    <template #toolbar>
      <div class="flex items-center gap-1">
        <UButton
          icon="i-lucide-plus"
          @click="openEntri"
        >
          Entri
        </UButton>
        <UButton
          icon="i-lucide-pencil"
          color="neutral"
          variant="subtle"
          :disabled="!localSelectedRow"
          @click="openUbahSelected"
        >
          Ubah
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
          icon="i-lucide-power-off"
          color="error"
          variant="ghost"
          :disabled="!localSelectedRow || !localSelectedRow.isActive"
          @click="onHapusClick"
        >
          Hapus
        </UButton>
      </div>
    </template>
  </DataTable>

  <CrudFormPage
    modal
    :open="entriOpen"
    :title="title"
    :endpoint="endpoint"
    :schema="schema"
    back-to=""
    :transform-out="transformOut"
    @update:open="(v: boolean) => !v && closeAndReturn('entri')"
    @saved="() => {}"
  />

  <CrudFormPage
    :id="editId"
    modal
    :open="ubahOpen"
    :title="title"
    :endpoint="endpoint"
    :schema="schema"
    back-to=""
    :transform-in="transformIn"
    :transform-out="transformOut"
    @update:open="(v: boolean) => !v && closeAndReturn('ubah')"
    @saved="() => {}"
  />
</template>
