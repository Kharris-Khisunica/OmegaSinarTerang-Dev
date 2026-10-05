<script setup lang="ts">
definePageMeta({ title: 'Entri Produk' })

const columns = useProductColumns()
const schema = useProductSchema()
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader title="Produk" />

    <MasterDataCrudPage
      title="Produk"
      endpoint="/products"
      list-to="/master-data/products"
      :columns="columns"
      :schema="schema"
      :transform-in="productTransformIn"
      :transform-out="productTransformOut"
      search-placeholder="Cari kode atau nama produk..."
      :default-sort="{ key: 'code', dir: 'asc' }"
      entity-label-singular="produk ini"
      initial-open="entri"
    />
  </div>
</template>
