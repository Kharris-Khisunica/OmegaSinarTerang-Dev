<script setup lang="ts" generic="T extends Record<string, unknown>">
import type { Column, FilterDef, RowAction, PagedResponse } from '~/types/data-table'

const props = withDefaults(defineProps<{
  /** Opsional — kosongkan untuk mode data lokal (mis. grid baris di dalam modal, PANDUAN_UI.md §8.7). */
  endpoint?: string
  columns: Column<T>[]
  searchable?: boolean
  searchPlaceholder?: string
  filters?: FilterDef[]
  rowActions?: RowAction<T>[]
  /** @deprecated (Hari 16A) Dipertahankan hanya untuk gudang/mutasi, pembelian/faktur,
   *  pembelian/retur (Hari 16B). Halaman baru pakai slot #toolbar dengan tombol "Entri"
   *  (PANDUAN_UI.md §5.1) — tombol "Tambah" ini bukan pola baku lagi. */
  createTo?: string
  defaultSort?: { key: string, dir: 'asc' | 'desc' }
  /** Kalau diisi, seluruh baris jadi klikable (mis. buka drawer/halaman detail). */
  onRowClick?: (row: T) => void
  /** Data lokal (mode tanpa endpoint) — search/sort jalan client-side, tanpa paginasi/URL sync. */
  rows?: T[]
  /** Kepadatan §5.2 — tinggi baris ~32px, padding sel px-2 py-1. */
  dense?: boolean
  /** Zebra ganjil/genap §5.2/§9. */
  zebra?: boolean
  /** Seleksi satu baris + penunjuk ▶ (§5.2) — expose lewat selectedRow. */
  selectable?: boolean
  emptyText?: string
  /** Kelas tambahan per baris (mis. menonjolkan baris BERMASALAH) -- digabung SETELAH kelas baku. */
  rowClass?: (row: T) => string
  /** Query tetap yang SELALU dikirim (mis. `{invoiceType:'PURCHASE'}` untuk memisah dua halaman
   *  riwayat yang berbagi satu endpoint) -- beda dari `filters`: tidak sinkron ke URL, tidak
   *  ditampilkan/diubah operator. */
  staticQuery?: Record<string, string | number | boolean>
}>(), {
  searchable: true,
  searchPlaceholder: 'Cari...',
  filters: () => [],
  rowActions: () => [],
  dense: false,
  zebra: false,
  selectable: false,
  emptyText: '< Tidak Ada Data Untuk Ditampilkan >'
})

const api = useApi()
const route = useRoute()
const router = useRouter()
const { activeRole } = useAuthUser()
const listPageStatus = useListPageStatus()

const isLocalMode = computed(() => !props.endpoint)

const tableRows = ref<T[]>([])
const meta = ref({ page: 1, limit: 20, total: 0, totalPages: 1 })
const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const errorMessage = ref('')
const selectedRow = ref<T | null>(null)

const page = ref(Number(route.query.page) || 1)
const search = ref(typeof route.query.search === 'string' ? route.query.search : '')
const sort = ref<{ key: string, dir: 'asc' | 'desc' } | null>(
  route.query.sortBy
    ? { key: String(route.query.sortBy), dir: route.query.sortDir === 'desc' ? 'desc' : 'asc' }
    : (props.defaultSort ?? null)
)
const filterValues = ref<Record<string, string | number | boolean | undefined>>({})
for (const f of props.filters) {
  const v = route.query[f.key]
  if (typeof v === 'string') filterValues.value[f.key] = v
  else if (f.default !== undefined) filterValues.value[f.key] = f.default
}

function syncQuery() {
  if (isLocalMode.value) return
  const query: Record<string, string> = { page: String(page.value) }
  if (search.value) query.search = search.value
  if (sort.value) {
    query.sortBy = sort.value.key
    query.sortDir = sort.value.dir
  }
  for (const f of props.filters) {
    const v = filterValues.value[f.key]
    if (v !== undefined && v !== null && v !== '') query[f.key] = String(v)
  }
  router.replace({ query })
}

function syncFromLocalRows() {
  let localRows = [...(props.rows ?? [])]
  if (search.value) {
    const q = search.value.toLowerCase()
    localRows = localRows.filter(row =>
      props.columns.some((col) => {
        const v = row[col.key]
        return v !== null && v !== undefined && String(v).toLowerCase().includes(q)
      })
    )
  }
  if (sort.value) {
    const { key, dir } = sort.value
    localRows = [...localRows].sort((a, b) => {
      const av = a[key] as unknown
      const bv = b[key] as unknown
      if (av === bv) return 0
      if (av === null || av === undefined) return dir === 'asc' ? -1 : 1
      if (bv === null || bv === undefined) return dir === 'asc' ? 1 : -1
      return (av < bv ? -1 : 1) * (dir === 'asc' ? 1 : -1)
    })
  }
  tableRows.value = localRows
  meta.value = { page: 1, limit: localRows.length || 1, total: localRows.length, totalPages: 1 }
  status.value = 'success'
}

async function loadRemote() {
  if (!props.endpoint) return
  status.value = 'pending'
  errorMessage.value = ''
  syncQuery()
  try {
    const query: Record<string, string | number | boolean> = {
      page: page.value,
      limit: meta.value.limit,
      ...(props.staticQuery ?? {})
    }
    if (search.value) query.search = search.value
    if (sort.value) {
      query.sortBy = sort.value.key
      query.sortDir = sort.value.dir
    }
    for (const f of props.filters) {
      const v = filterValues.value[f.key]
      if (v !== undefined && v !== null && v !== '') query[f.key] = typeof v === 'boolean' ? String(v) : v
    }
    const res = await api.get<PagedResponse<T>>(props.endpoint, query)
    tableRows.value = res.data
    meta.value = res.meta
    status.value = 'success'
    listPageStatus.setTotal(res.meta.total)
  } catch (err) {
    status.value = 'error'
    errorMessage.value = getErrorMessage(err, 'Gagal memuat data.')
  }
}

function load() {
  if (isLocalMode.value) syncFromLocalRows()
  else loadRemote()
}

let searchDebounce: ReturnType<typeof setTimeout> | undefined
// need_fixing.md #8 — "/" fokus ke kotak Cari (PANDUAN_UI.md §12, halaman
// daftar). Hanya tabel ber-endpoint (daftar utama, bukan grid lokal di dalam
// modal) dan diam selama ada modal dokumen/baris terbuka.
const searchWrap = ref<HTMLElement | null>(null)
const { anyModalOpen } = useModalStack()
useDocumentHotkeys('list', {
  onFocusSearch: () => searchWrap.value?.querySelector('input')?.focus()
}, { active: computed(() => !!props.endpoint && props.searchable && !anyModalOpen.value) })

function onSearchInput(value: string) {
  search.value = value
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
}

function onFilterChange(key: string, value: string | number | boolean) {
  filterValues.value[key] = value
  page.value = 1
  load()
}

function clearFilter(key: string) {
  filterValues.value[key] = undefined
  page.value = 1
  load()
}

function toggleSort(key: string) {
  if (sort.value?.key === key) {
    sort.value = sort.value.dir === 'asc' ? { key, dir: 'desc' } : null
  } else {
    sort.value = { key, dir: 'asc' }
  }
  load()
}

function goToPage(p: number) {
  page.value = p
  load()
}

function onRowInteract(row: T) {
  if (props.selectable) selectedRow.value = row
  props.onRowClick?.(row)
}

function clearSelection() {
  selectedRow.value = null
}

function rowClasses(row: T): string {
  const classes = ['border-b border-default last:border-0']
  if (props.onRowClick || props.selectable) classes.push('cursor-pointer')
  if (props.selectable && row === selectedRow.value) {
    classes.push('bg-primary/10')
  } else {
    classes.push('hover:bg-elevated/40')
    if (props.zebra) classes.push('odd:bg-elevated/30')
  }
  if (props.rowClass) classes.push(props.rowClass(row))
  return classes.join(' ')
}

function cellPadding(): string {
  return props.dense ? 'px-2 py-1' : 'px-3 py-2'
}

function cellValue(row: Record<string, unknown>, column: Column<T>) {
  const raw = row[column.key]
  return column.format ? column.format(raw, row as T) : raw
}

function visibleActions(row: Record<string, unknown>) {
  return props.rowActions.filter((action) => {
    if (action.roles && !action.roles.includes(activeRole.value)) return false
    if (action.show && !action.show(row as T)) return false
    return true
  })
}

function dropdownItems(row: Record<string, unknown>) {
  return visibleActions(row).map(action => ({
    label: action.label,
    icon: action.icon,
    to: action.to ? action.to(row as T) : undefined,
    onSelect: action.onClick ? () => action.onClick!(row as T) : undefined,
    color: action.color
  }))
}

onMounted(load)
watch(() => props.rows, () => {
  if (isLocalMode.value) syncFromLocalRows()
}, { deep: true })
onUnmounted(() => {
  if (props.endpoint) listPageStatus.clear()
})
defineExpose({ reload: load, selectedRow, clearSelection })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-2">
      <!-- Baris toolbar (§5.1) — "Entri" dkk. selalu paling kiri, sebelum Cari. -->
      <div
        v-if="$slots.toolbar || createTo"
        class="flex flex-wrap items-center gap-2"
      >
        <slot name="toolbar" />
        <UButton
          v-if="!$slots.toolbar && createTo"
          :to="createTo"
          icon="i-lucide-plus"
        >
          Tambah
        </UButton>
      </div>
      <!-- Baris Cari + filter (§5.1) -->
      <div class="flex flex-wrap items-center gap-2">
        <div
          v-if="searchable"
          ref="searchWrap"
        >
          <UInput
            :model-value="search"
            :placeholder="searchPlaceholder"
            icon="i-lucide-search"
            class="w-64"
            @update:model-value="onSearchInput"
          />
        </div>
        <div
          v-for="filter in filters.filter(f => f.type === 'select')"
          :key="filter.key"
          class="flex items-center gap-1"
        >
          <USelect
            :model-value="filterValues[filter.key]"
            :items="filter.options"
            :placeholder="filter.placeholder ?? filter.label"
            class="w-48"
            @update:model-value="(v: string | number | boolean) => onFilterChange(filter.key, v)"
          />
          <UButton
            v-if="filterValues[filter.key] !== undefined"
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="`Hapus filter ${filter.label}`"
            @click="clearFilter(filter.key)"
          />
        </div>
        <template
          v-for="filter in filters.filter(f => f.type === 'date-range')"
          :key="filter.key"
        >
          <UInput
            type="date"
            :model-value="filterValues[`${filter.key}From`]"
            class="w-40"
            @update:model-value="(v: string | number | boolean) => onFilterChange(`${filter.key}From`, v)"
          />
          <UInput
            type="date"
            :model-value="filterValues[`${filter.key}To`]"
            class="w-40"
            @update:model-value="(v: string | number | boolean) => onFilterChange(`${filter.key}To`, v)"
          />
        </template>
        <div
          v-for="filter in filters.filter(f => f.type === 'date')"
          :key="filter.key"
          class="flex items-center gap-1"
        >
          <UInput
            type="date"
            :model-value="filterValues[filter.key]"
            class="w-40"
            @update:model-value="(v: string | number | boolean) => onFilterChange(filter.key, v)"
          />
          <UButton
            v-if="filterValues[filter.key] !== undefined"
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="`Hapus filter ${filter.label}`"
            @click="clearFilter(filter.key)"
          />
        </div>
      </div>
    </div>

    <div class="overflow-x-auto border border-default rounded-lg">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-default bg-elevated/50">
            <th
              v-if="selectable"
              class="w-6"
            />
            <th
              v-for="column in columns"
              :key="column.key"
              :class="[cellPadding(), 'font-medium select-none cursor-pointer whitespace-nowrap']"
              :style="column.width ? { width: column.width } : undefined"
              @click="toggleSort(column.key)"
            >
              <span class="inline-flex items-center gap-1">
                {{ column.label }}
                <UIcon
                  v-if="sort?.key === column.key"
                  :name="sort.dir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
                  class="size-3.5"
                />
              </span>
            </th>
            <th
              v-if="rowActions.length"
              class="px-3 py-2 w-10"
            />
          </tr>
        </thead>
        <tbody>
          <template v-if="status === 'pending'">
            <tr
              v-for="i in 5"
              :key="i"
              class="border-b border-default last:border-0"
            >
              <td
                v-if="selectable"
                :class="cellPadding()"
              />
              <td
                v-for="column in columns"
                :key="column.key"
                :class="cellPadding()"
              >
                <USkeleton class="h-4 w-full" />
              </td>
              <td
                v-if="rowActions.length"
                class="px-3 py-3"
              >
                <USkeleton class="h-4 w-6" />
              </td>
            </tr>
          </template>
          <tr v-else-if="status === 'error'">
            <td
              :colspan="columns.length + (rowActions.length ? 1 : 0) + (selectable ? 1 : 0)"
              class="px-3 py-10"
            >
              <UEmpty
                icon="i-lucide-alert-triangle"
                title="Gagal memuat data"
                :description="errorMessage"
                :actions="[{ label: 'Coba lagi', onClick: load }]"
              />
            </td>
          </tr>
          <tr v-else-if="!tableRows.length">
            <td
              :colspan="columns.length + (rowActions.length ? 1 : 0) + (selectable ? 1 : 0)"
              class="px-3 py-10"
            >
              <UEmpty
                icon="i-lucide-inbox"
                :title="emptyText"
                description=""
              />
            </td>
          </tr>
          <tr
            v-for="(row, i) in tableRows"
            v-else
            :key="(row.id as string | number | undefined) ?? i"
            :class="rowClasses(row as T)"
            @click="onRowInteract(row as T)"
          >
            <td
              v-if="selectable"
              :class="[cellPadding(), 'text-center', row === selectedRow ? 'border-l-2 border-primary' : '']"
            >
              <span v-if="row === selectedRow">▶</span>
            </td>
            <td
              v-for="column in columns"
              :key="column.key"
              :class="[
                cellPadding(),
                column.align === 'right' ? 'text-right tabular-nums' : column.align === 'center' ? 'text-center' : 'text-left'
              ]"
            >
              <slot
                v-if="column.slot"
                :name="column.slot"
                :row="row"
                :value="row[column.key]"
              />
              <span
                v-else
                :class="column.mono ? 'font-mono' : ''"
              >{{ cellValue(row, column) }}</span>
            </td>
            <td
              v-if="rowActions.length"
              class="px-3 py-2 text-right"
              @click.stop
            >
              <UDropdownMenu
                v-if="dropdownItems(row).length"
                :items="dropdownItems(row)"
              >
                <UButton
                  icon="i-lucide-more-vertical"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                />
              </UDropdownMenu>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="!isLocalMode && meta.total > 0"
      class="flex items-center justify-between text-sm text-muted"
    >
      <span>{{ meta.total }} data · Halaman {{ meta.page }} dari {{ meta.totalPages }}</span>
      <UPagination
        :page="page"
        :total="meta.total"
        :items-per-page="meta.limit"
        @update:page="goToPage"
      />
    </div>
    <slot name="footerTotals" />
  </div>
</template>
