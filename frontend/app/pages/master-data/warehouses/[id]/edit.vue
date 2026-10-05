<script setup lang="ts">
import type { FilterDef } from '~/types/data-table'
import { WAREHOUSE_TYPE_OPTIONS } from '~/composables/useWarehouseSchema'

definePageMeta({ title: 'Ubah Gudang' })

const route = useRoute()
const columns = useWarehouseColumns()
const schema = useWarehouseSchema()
const filters: FilterDef[] = [
  { key: 'warehouseType', label: 'Tipe Gudang', type: 'select', options: WAREHOUSE_TYPE_OPTIONS }
]
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader title="Gudang" />

    <MasterDataCrudPage
      title="Gudang"
      endpoint="/warehouses"
      list-to="/master-data/warehouses"
      :columns="columns"
      :schema="schema"
      :filters="filters"
      :transform-out="warehouseTransformOut"
      search-placeholder="Cari nama gudang..."
      :default-sort="{ key: 'name', dir: 'asc' }"
      entity-label-singular="gudang ini"
      initial-open="ubah"
      :initial-edit-id="route.params.id as string"
    />
  </div>
</template>
