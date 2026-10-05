<script setup lang="ts">
definePageMeta({ title: 'Satuan' })

const columns = useUnitColumns()
const schema = useSimpleMasterSchema('Nama Satuan', 'DUS, SACHET, RENCENG, dsb.')
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader />

    <MasterDataCrudPage
      title="Satuan"
      endpoint="/units"
      list-to="/master-data/units"
      :columns="columns"
      :schema="schema"
      :transform-out="simpleMasterTransformOut"
      search-placeholder="Cari kode atau nama satuan..."
      :default-sort="{ key: 'name', dir: 'asc' }"
      entity-label-singular="satuan ini"
    />
  </div>
</template>
