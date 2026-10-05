<script setup lang="ts">
definePageMeta({ title: 'Supplier' })

const columns = useSupplierColumns()
const schema = useSupplierSchema()
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader />

    <MasterDataCrudPage
      title="Supplier"
      endpoint="/suppliers"
      list-to="/master-data/suppliers"
      :columns="columns"
      :schema="schema"
      :transform-out="supplierTransformOut"
      search-placeholder="Cari kode, nama, atau telepon..."
      :default-sort="{ key: 'displayCode', dir: 'asc' }"
      entity-label-singular="supplier ini"
    />
  </div>
</template>
