<script setup lang="ts">
definePageMeta({ title: 'Ubah Supplier' })

const route = useRoute()
const columns = useSupplierColumns()
const schema = useSupplierSchema()
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader title="Supplier" />

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
      initial-open="ubah"
      :initial-edit-id="route.params.id as string"
    />
  </div>
</template>
