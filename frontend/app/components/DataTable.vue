<script setup lang="ts" generic="T extends Record<string, unknown>">
import type { Column, FilterDef, RowAction, PagedResponse } from '~/types/data-table'

const props = withDefaults(defineProps<{
  endpoint: string
  columns: Column<T>[]
  searchable?: boolean
  searchPlaceholder?: string
  filters?: FilterDef[]
  rowActions?: RowAction<T>[]
  createTo?: string
  defaultSort?: { key: string, dir: 'asc' | 'desc' }
  /** Kalau diisi, seluruh baris jadi klikable (mis. buka drawer/halaman detail). */
  onRowClick?: (row: T) => void
}>(), {
  searchable: true,
  searchPlaceholder: 'Cari...',
  filters: () => [],
  rowActions: () => []
})

const api = useApi()
const route = useRoute()
const router = useRouter()
const { activeRole } = useAuthUser()

const rows = ref<T[]>([])
const meta = ref({ page: 1, limit: 20, total: 0, totalPages: 1 })
const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const errorMessage = ref('')

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
}

function syncQuery() {
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

let searchDebounce: ReturnType<typeof setTimeout> | undefined
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

async function load() {
  status.value = 'pending'
  errorMessage.value = ''
  syncQuery()
  try {
    const query: Record<string, string | number> = {
      page: page.value,
      limit: meta.value.limit
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
    rows.value = res.data
    meta.value = res.meta
    status.value = 'success'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = getErrorMessage(err, 'Gagal memuat data.')
  }
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
defineExpose({ reload: load })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-2 justify-between">
      <div class="flex flex-wrap items-center gap-2">
        <UInput
          v-if="searchable"
          :model-value="search"
          :placeholder="searchPlaceholder"
          icon="i-lucide-search"
          class="w-64"
          @update:model-value="onSearchInput"
        />
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
      </div>
      <UButton
        v-if="createTo"
        :to="createTo"
        icon="i-lucide-plus"
      >
        Tambah
      </UButton>
    </div>

    <div class="overflow-x-auto border border-default rounded-lg">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-default bg-elevated/50">
            <th
              v-for="column in columns"
              :key="column.key"
              class="px-3 py-2 font-medium select-none cursor-pointer whitespace-nowrap"
              :style="column.width ? { width: column.width } : undefined"
              :class="[
                column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'
              ]"
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
                v-for="column in columns"
                :key="column.key"
                class="px-3 py-3"
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
              :colspan="columns.length + (rowActions.length ? 1 : 0)"
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
          <tr v-else-if="!rows.length">
            <td
              :colspan="columns.length + (rowActions.length ? 1 : 0)"
              class="px-3 py-10"
            >
              <UEmpty
                icon="i-lucide-inbox"
                title="Belum ada data"
                description="Coba ubah pencarian atau filter, atau tambah data baru."
              />
            </td>
          </tr>
          <tr
            v-for="(row, i) in rows"
            v-else
            :key="row.id ?? i"
            class="border-b border-default last:border-0 hover:bg-elevated/30"
            :class="{ 'cursor-pointer': onRowClick }"
            @click="onRowClick?.(row as T)"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              class="px-3 py-2"
              :class="[
                column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'
              ]"
            >
              <slot
                v-if="column.slot"
                :name="column.slot"
                :row="row"
                :value="row[column.key]"
              />
              <template v-else>
                {{ cellValue(row, column) }}
              </template>
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
      v-if="meta.total > 0"
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
  </div>
</template>
