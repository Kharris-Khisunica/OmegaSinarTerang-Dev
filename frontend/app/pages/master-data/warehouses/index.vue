<script setup lang="ts">
import type { Column, FilterDef, RowAction } from '~/types/data-table'
import { WAREHOUSE_TYPE_OPTIONS } from '~/composables/useWarehouseSchema'

definePageMeta({ title: 'Gudang' })

interface WarehouseRow extends Record<string, unknown> {
  id: string
  name: string
  warehouseType: 'STORE' | 'CUSTOMER_CONSIGNMENT' | 'BAD_STOCK'
  isDefault: boolean
  isActive: boolean
}

const TYPE_LABEL: Record<string, string> = {
  STORE: 'Gudang Toko',
  CUSTOMER_CONSIGNMENT: 'Titipan Customer',
  BAD_STOCK: 'Barang Rusak'
}

const api = useApi()
const toast = useToast()
const table = ref()

const columns: Column<WarehouseRow>[] = [
  { key: 'name', label: 'Nama Gudang' },
  { key: 'warehouseType', label: 'Tipe', format: v => TYPE_LABEL[String(v)] ?? String(v) },
  { key: 'isDefault', label: 'Default', align: 'center', format: v => (v ? 'Ya' : '-') },
  { key: 'isActive', label: 'Status', align: 'center', format: v => (v ? 'Aktif' : 'Nonaktif') }
]

const filters: FilterDef[] = [
  { key: 'warehouseType', label: 'Tipe Gudang', type: 'select', options: WAREHOUSE_TYPE_OPTIONS }
]

async function toggleActive(row: WarehouseRow) {
  await api.patch(`/warehouses/${row.id}`, { isActive: !row.isActive })
  toast.add({ title: row.isActive ? 'Gudang dinonaktifkan' : 'Gudang diaktifkan', color: 'success' })
  table.value?.reload()
}

const rowActions: RowAction<WarehouseRow>[] = [
  { label: 'Edit', icon: 'i-lucide-pencil', roles: ['MASTER', 'OPERATOR'], to: row => `/master-data/warehouses/${row.id}/edit` },
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
      Gudang
    </h1>

    <DataTable
      ref="table"
      endpoint="/warehouses"
      :columns="columns"
      :filters="filters"
      :row-actions="rowActions"
      create-to="/master-data/warehouses/create"
      search-placeholder="Cari nama gudang..."
      :default-sort="{ key: 'name', dir: 'asc' }"
    />
  </div>
</template>
