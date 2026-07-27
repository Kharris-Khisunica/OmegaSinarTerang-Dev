<script setup lang="ts">
import type { Column, RowAction } from '~/types/data-table'

definePageMeta({ title: 'Produk' })

interface ProductRow extends Record<string, unknown> {
  id: string
  code: string
  name: string
  baseUnit: string
  isActive: boolean
  unitConversions: { unitName: string, level: number }[]
}

const api = useApi()
const toast = useToast()
const table = ref()

const columns: Column<ProductRow>[] = [
  { key: 'code', label: 'Kode', width: '120px' },
  { key: 'name', label: 'Nama Produk' },
  { key: 'baseUnit', label: 'Satuan Dasar', width: '140px' },
  {
    key: 'unitConversions',
    label: 'Konversi',
    format: (v) => {
      const rows = v as { unitName: string, level: number }[] | undefined
      if (!rows || !rows.length) return '-'
      // Terbesar ke terkecil (level tinggi = besar), konsisten dengan urutan input di form.
      return [...rows].sort((a, b) => b.level - a.level).map(r => r.unitName).join(', ')
    }
  },
  { key: 'isActive', label: 'Status', align: 'center', format: v => (v ? 'Aktif' : 'Nonaktif') }
]

async function toggleActive(row: ProductRow) {
  await api.patch(`/products/${row.id}`, { isActive: !row.isActive })
  toast.add({ title: row.isActive ? 'Produk dinonaktifkan' : 'Produk diaktifkan', color: 'success' })
  table.value?.reload()
}

const rowActions: RowAction<ProductRow>[] = [
  { label: 'Edit', icon: 'i-lucide-pencil', roles: ['MASTER', 'OPERATOR'], to: row => `/master-data/products/${row.id}/edit` },
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
      Produk
    </h1>

    <DataTable
      ref="table"
      endpoint="/products"
      :columns="columns"
      :row-actions="rowActions"
      create-to="/master-data/products/create"
      search-placeholder="Cari kode atau nama produk..."
      :default-sort="{ key: 'code', dir: 'asc' }"
    />
  </div>
</template>
