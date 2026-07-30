<script setup lang="ts">
import type { Column, RowAction } from '~/types/data-table'

definePageMeta({ title: 'Satuan' })

interface UnitRow extends Record<string, unknown> {
  id: string
  code: string
  name: string
  isActive: boolean
}

const api = useApi()
const toast = useToast()
const table = ref()

const columns: Column<UnitRow>[] = [
  { key: 'name', label: 'Nama Satuan' },
  { key: 'code', label: 'Kode', width: '140px' },
  { key: 'isActive', label: 'Status', align: 'center', format: v => (v ? 'Aktif' : 'Nonaktif') }
]

async function toggleActive(row: UnitRow) {
  await api.patch(`/units/${row.id}`, { isActive: !row.isActive })
  toast.add({ title: row.isActive ? 'Satuan dinonaktifkan' : 'Satuan diaktifkan', color: 'success' })
  table.value?.reload()
}

const rowActions: RowAction<UnitRow>[] = [
  { label: 'Edit', icon: 'i-lucide-pencil', roles: ['MASTER', 'OPERATOR'], to: row => `/master-data/units/${row.id}/edit` },
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
      Satuan
    </h1>

    <DataTable
      ref="table"
      endpoint="/units"
      :columns="columns"
      :row-actions="rowActions"
      create-to="/master-data/units/create"
      search-placeholder="Cari kode atau nama satuan..."
      :default-sort="{ key: 'name', dir: 'asc' }"
    />
  </div>
</template>
