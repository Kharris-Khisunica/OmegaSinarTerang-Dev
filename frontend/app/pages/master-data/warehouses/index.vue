<script setup lang="ts">
import type { Column, FilterDef, RowAction } from '~/types/data-table'

definePageMeta({ title: 'Gudang' })

interface WarehouseRow extends Record<string, unknown> {
  id: number
  code: string
  name: string
  type: 'STORE' | 'CUSTOMER_CONSIGNMENT' | 'BAD_STOCK'
  address: string
  is_active: boolean
  created_at: string
}

const TYPE_LABEL: Record<string, string> = {
  STORE: 'Toko / Gudang Utama',
  CUSTOMER_CONSIGNMENT: 'Titipan Customer',
  BAD_STOCK: 'Barang Rusak'
}

const api = useApi()
const toast = useToast()
const table = ref()

const columns: Column<WarehouseRow>[] = [
  { key: 'code', label: 'Kode', width: '100px' },
  { key: 'name', label: 'Nama Gudang' },
  { key: 'type', label: 'Tipe', format: v => TYPE_LABEL[String(v)] ?? String(v) },
  { key: 'address', label: 'Alamat' },
  { key: 'is_active', label: 'Status', align: 'center', format: v => (v ? 'Aktif' : 'Nonaktif') }
]

const filters: FilterDef[] = [
  {
    key: 'type',
    label: 'Tipe Gudang',
    type: 'select',
    options: [
      { label: 'Toko / Gudang Utama', value: 'STORE' },
      { label: 'Titipan Customer', value: 'CUSTOMER_CONSIGNMENT' },
      { label: 'Barang Rusak', value: 'BAD_STOCK' }
    ]
  }
]

async function toggleActive(row: WarehouseRow) {
  await api.patch(`/api/warehouses/${row.id}`, { is_active: !row.is_active })
  toast.add({ title: row.is_active ? 'Gudang dinonaktifkan' : 'Gudang diaktifkan', color: 'success' })
  table.value?.reload()
}

const rowActions: RowAction<WarehouseRow>[] = [
  { label: 'Edit', icon: 'i-lucide-pencil', to: row => `/master-data/warehouses/${row.id}/edit` },
  {
    label: 'Nonaktifkan',
    icon: 'i-lucide-power-off',
    roles: ['MASTER'],
    show: row => row.is_active,
    onClick: toggleActive
  },
  {
    label: 'Aktifkan',
    icon: 'i-lucide-power',
    roles: ['MASTER'],
    show: row => !row.is_active,
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
      endpoint="/api/warehouses"
      :columns="columns"
      :filters="filters"
      :row-actions="rowActions"
      create-to="/master-data/warehouses/create"
      search-placeholder="Cari kode, nama, atau alamat..."
      :default-sort="{ key: 'code', dir: 'asc' }"
    />
  </div>
</template>
