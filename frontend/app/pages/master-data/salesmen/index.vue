<script setup lang="ts">
import type { Column, RowAction } from '~/types/data-table'

definePageMeta({ title: 'Salesman' })

interface SalesmanRow extends Record<string, unknown> {
  id: string
  code: string
  name: string
  isActive: boolean
}

const api = useApi()
const toast = useToast()
const table = ref()

const columns: Column<SalesmanRow>[] = [
  { key: 'name', label: 'Nama Salesman' },
  { key: 'code', label: 'Kode', width: '140px' },
  { key: 'isActive', label: 'Status', align: 'center', format: v => (v ? 'Aktif' : 'Nonaktif') }
]

async function toggleActive(row: SalesmanRow) {
  await api.patch(`/salesmen/${row.id}`, { isActive: !row.isActive })
  toast.add({ title: row.isActive ? 'Salesman dinonaktifkan' : 'Salesman diaktifkan', color: 'success' })
  table.value?.reload()
}

const rowActions: RowAction<SalesmanRow>[] = [
  { label: 'Edit', icon: 'i-lucide-pencil', roles: ['MASTER', 'OPERATOR'], to: row => `/master-data/salesmen/${row.id}/edit` },
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
      Salesman
    </h1>

    <DataTable
      ref="table"
      endpoint="/salesmen"
      :columns="columns"
      :row-actions="rowActions"
      create-to="/master-data/salesmen/create"
      search-placeholder="Cari kode atau nama salesman..."
      :default-sort="{ key: 'name', dir: 'asc' }"
    />
  </div>
</template>
