<script setup lang="ts">
import type { Column, RowAction } from '~/types/data-table'

definePageMeta({ title: 'Merek' })

interface BrandRow extends Record<string, unknown> {
  id: string
  code: string
  name: string
  isActive: boolean
}

const api = useApi()
const toast = useToast()
const table = ref()

const columns: Column<BrandRow>[] = [
  { key: 'name', label: 'Nama Merek' },
  { key: 'code', label: 'Kode', width: '140px' },
  { key: 'isActive', label: 'Status', align: 'center', format: v => (v ? 'Aktif' : 'Nonaktif') }
]

async function toggleActive(row: BrandRow) {
  await api.patch(`/brands/${row.id}`, { isActive: !row.isActive })
  toast.add({ title: row.isActive ? 'Merek dinonaktifkan' : 'Merek diaktifkan', color: 'success' })
  table.value?.reload()
}

const rowActions: RowAction<BrandRow>[] = [
  { label: 'Edit', icon: 'i-lucide-pencil', roles: ['MASTER', 'OPERATOR'], to: row => `/master-data/brands/${row.id}/edit` },
  {
    label: 'Nonaktifkan',
    icon: 'i-lucide-power-off',
    roles: ['MASTER', 'OPERATOR'],
    show: row => row.isActive,
    onClick: toggleActive
  },
  {
    label: 'Aktifkan',
    icon: 'i-lucide-power',
    roles: ['MASTER', 'OPERATOR'],
    show: row => !row.isActive,
    onClick: toggleActive
  }
]
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <h1 class="text-lg font-semibold">
      Merek
    </h1>

    <DataTable
      ref="table"
      endpoint="/brands"
      :columns="columns"
      :row-actions="rowActions"
      create-to="/master-data/brands/create"
      search-placeholder="Cari kode atau nama merek..."
      :default-sort="{ key: 'name', dir: 'asc' }"
    />
  </div>
</template>
