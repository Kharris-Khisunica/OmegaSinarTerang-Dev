<script setup lang="ts">
import type { Column, RowAction } from '~/types/data-table'

definePageMeta({ title: 'Supplier' })

interface SupplierRow extends Record<string, unknown> {
  id: string
  displayCode: string
  name: string
  contactPhone: string | null
  isActive: boolean
}

const api = useApi()
const toast = useToast()
const table = ref()

const columns: Column<SupplierRow>[] = [
  { key: 'displayCode', label: 'Kode', width: '110px' },
  { key: 'name', label: 'Nama Supplier' },
  { key: 'contactPhone', label: 'No. Telepon', format: v => (v ? String(v) : '-') },
  { key: 'isActive', label: 'Status', align: 'center', format: v => (v ? 'Aktif' : 'Nonaktif') }
]

async function toggleActive(row: SupplierRow) {
  await api.patch(`/suppliers/${row.id}`, { isActive: !row.isActive })
  toast.add({ title: row.isActive ? 'Supplier dinonaktifkan' : 'Supplier diaktifkan', color: 'success' })
  table.value?.reload()
}

const rowActions: RowAction<SupplierRow>[] = [
  { label: 'Edit', icon: 'i-lucide-pencil', roles: ['MASTER', 'OPERATOR'], to: row => `/master-data/suppliers/${row.id}/edit` },
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
      Supplier
    </h1>

    <DataTable
      ref="table"
      endpoint="/suppliers"
      :columns="columns"
      :row-actions="rowActions"
      create-to="/master-data/suppliers/create"
      search-placeholder="Cari kode, nama, atau telepon..."
      :default-sort="{ key: 'displayCode', dir: 'asc' }"
    />
  </div>
</template>
