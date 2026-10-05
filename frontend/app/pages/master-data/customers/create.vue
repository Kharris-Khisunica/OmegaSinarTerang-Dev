<script setup lang="ts">
definePageMeta({ title: 'Entri Pelanggan' })

const columns = useCustomerColumns()
const schema = useCustomerSchema()
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader title="Pelanggan" />

    <MasterDataCrudPage
      title="Pelanggan"
      endpoint="/customers"
      list-to="/master-data/customers"
      :columns="columns"
      :schema="schema"
      :transform-out="customerTransformOut"
      search-placeholder="Cari kode atau nama pelanggan..."
      :default-sort="{ key: 'code', dir: 'asc' }"
      entity-label-singular="pelanggan ini"
      initial-open="entri"
    />
  </div>
</template>
