<script setup lang="ts">
import type { Column, RowAction } from '~/types/data-table'

definePageMeta({ title: 'Customer' })

interface CustomerRow extends Record<string, unknown> {
  id: string
  code: string
  name: string
  phone: string | null
  isPkp: boolean
  isActive: boolean
}

const api = useApi()
const toast = useToast()
const table = ref()

const columns: Column<CustomerRow>[] = [
  { key: 'code', label: 'Kode', width: '120px' },
  { key: 'name', label: 'Nama Customer' },
  { key: 'phone', label: 'No. Telepon', format: v => (v ? String(v) : '-') },
  { key: 'isPkp', label: 'PKP', align: 'center', format: v => (v ? 'Ya' : 'Tidak') },
  { key: 'isActive', label: 'Status', align: 'center', format: v => (v ? 'Aktif' : 'Nonaktif') }
]

async function toggleActive(row: CustomerRow) {
  await api.patch(`/customers/${row.id}`, { isActive: !row.isActive })
  toast.add({ title: row.isActive ? 'Customer dinonaktifkan' : 'Customer diaktifkan', color: 'success' })
  table.value?.reload()
}

const rowActions: RowAction<CustomerRow>[] = [
  { label: 'Edit', icon: 'i-lucide-pencil', roles: ['MASTER', 'OPERATOR'], to: row => `/master-data/customers/${row.id}/edit` },
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
      Customer
    </h1>

    <DataTable
      ref="table"
      endpoint="/customers"
      :columns="columns"
      :row-actions="rowActions"
      create-to="/master-data/customers/create"
      search-placeholder="Cari kode atau nama customer..."
      :default-sort="{ key: 'code', dir: 'asc' }"
    />
  </div>
</template>
